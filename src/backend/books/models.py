import os

from django.conf import settings
from django.db import models
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
        default=0,
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

    class Meta:
        verbose_name = "Book"
        verbose_name_plural = "Books"
        ordering = ['-created_at']

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
