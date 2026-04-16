import os

from django.conf import settings
from django.db import models
from django.db.models import F
from PyPDF2 import PdfReader

from users.models import BaseModel


def book_cover_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1]
    return f'book_covers/{instance.pk}{ext}'


def book_chapter_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1]
    return f'book_chapters/{instance.pk}{ext}'


class BookCategory(BaseModel):
    """Category for books (e.g. Qi Men, Ze Ri)."""
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)

    class Meta:
        verbose_name = "Book Category"
        verbose_name_plural = "Book Categories"
        ordering = ['title']

    def __str__(self):
        return self.title


class Book(BaseModel):
    """Book - purchasable with LT (in-app currency)."""
    category = models.ForeignKey(
        BookCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='books',
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    author = models.CharField(max_length=255, blank=True)
    cover_image = models.ImageField(upload_to=book_cover_upload_to, blank=True, null=True)
    description = models.TextField(blank=True)
    is_free = models.BooleanField(default=False)
    is_new_release = models.BooleanField(default=False)
    price_lt = models.PositiveIntegerField(
        default=500,
        help_text="Price in LT (in-app currency)",
    )
    demo_content = models.TextField(blank=True)
    table_of_contents = models.JSONField(blank=True, null=True)
    published_date = models.DateField(null=True, blank=True)
    final_exam_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Public ID of linked Exam (exams.Exam). No FK to avoid migration dependency.",
    )
    small_cover = models.CharField(
        max_length=500,
        blank=True,
        help_text="Public Bunny CDN URL for resized WebP cover (auto-generated). Do not edit manually.",
    )

    class Meta:
        verbose_name = "Book"
        verbose_name_plural = "Books"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Detect whether cover_image changed so we can regenerate small_cover.
        old_cover_name = None
        if self.pk:
            try:
                old_cover_name = Book.objects.get(pk=self.pk).cover_image.name
            except Book.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        cover_changed = (self.cover_image.name if self.cover_image else None) != old_cover_name

        if cover_changed:
            if not self.cover_image:
                # Cover was cleared — wipe the small version too.
                Book.objects.filter(pk=self.pk).update(small_cover='')
                self.small_cover = ''
                return
            # Cover was set or replaced — generate small version.
            try:
                from books.utils import generate_and_upload_small_cover  # noqa: PLC0415
                small_url = generate_and_upload_small_cover(self.pk, self.cover_image)
                Book.objects.filter(pk=self.pk).update(small_cover=small_url)
                self.small_cover = small_url
            except Exception:
                pass  # Non-fatal; management command can backfill later.

    def __str__(self):
        return self.title


class BookChapter(BaseModel):
    """Chapter of a book (PDF file)."""
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255)
    slug = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    file_path = models.FileField(upload_to=book_chapter_upload_to, blank=True, null=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)
    is_demo = models.BooleanField(default=False)
    encrypted_cdn_url = models.URLField(
        blank=True, null=True,
        help_text="Public URL of the AES-256-GCM encrypted PDF on Supabase CDN. Null if not yet encrypted.",
    )
    encryption_version = models.PositiveIntegerField(
        default=1,
        help_text="Incremented on every re-upload. Included in IV derivation to prevent GCM nonce reuse.",
    )

    class Meta:
        verbose_name = "Book Chapter"
        verbose_name_plural = "Book Chapters"
        ordering = ['book', 'order']
        unique_together = [['book', 'order'], ['book', 'slug']]

    def save(self, *args, **kwargs):
        # Track old file to detect changes
        old_file_name = None
        if self.pk:
            try:
                old_file_name = BookChapter.objects.get(pk=self.pk).file_path.name
            except BookChapter.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        if not self.file_path:
            return

        file_changed = self.file_path.name != old_file_name
        if not file_changed and self.file_size and self.page_count:
            return

        updates = {}
        if file_changed or not self.file_size:
            try:
                self.file_size = self.file_path.size
                updates['file_size'] = self.file_size
            except Exception:
                pass

        if file_changed or not self.page_count:
            try:
                with self.file_path.open('rb') as f:
                    reader = PdfReader(f)
                    self.page_count = len(reader.pages)
                updates['page_count'] = self.page_count
            except Exception:
                pass

        if updates:
            BookChapter.objects.filter(pk=self.pk).update(**updates)

        if file_changed:
            # Reset encrypted_cdn_url and bump version so the Celery task derives a fresh IV.
            # Use UPDATE (not save) to avoid recursively triggering save().
            BookChapter.objects.filter(pk=self.pk).update(
                encrypted_cdn_url=None,
                encryption_version=F('encryption_version') + 1,
            )
            from books.tasks import encrypt_and_upload_chapter_pdf  # noqa: PLC0415 (avoid circular import)
            encrypt_and_upload_chapter_pdf.delay(self.pk)

    def __str__(self):
        return f"{self.book.title} - {self.title}"


class UserBookPurchase(BaseModel):
    """Records when a user purchased a book with LT."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='book_purchases',
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name='purchases',
    )
    pdf_ready = models.BooleanField(default=False)
    pdf_generated_at = models.DateTimeField(null=True, blank=True)
    pdf_folder_path = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = "User Book Purchase"
        verbose_name_plural = "User Book Purchases"
        unique_together = [['user', 'book']]
        ordering = ['-created_at']


class UserChapterProgress(BaseModel):
    """Reading progress per chapter (optional)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chapter_progresses',
    )
    chapter = models.ForeignKey(
        BookChapter,
        on_delete=models.CASCADE,
        related_name='user_progresses',
    )
    current_page = models.PositiveIntegerField(default=1)
    completed = models.BooleanField(default=False)
    last_read = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Chapter Progress"
        verbose_name_plural = "User Chapter Progresses"
        unique_together = [['user', 'chapter']]
        indexes = [
            models.Index(fields=['user', 'last_read'], name='idx_ucp_user_last_read'),
        ]
