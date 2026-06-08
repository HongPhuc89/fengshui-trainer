import os

from django.core.exceptions import ValidationError
from django.db import models

VALID_DISPLAY_TYPES = {'accordion', 'featured'}
CHAPTER_REQUIRED_KEYS = {'chapter_label', 'title', 'display_type', 'items'}
ITEM_REQUIRED_KEYS = {'demo_url'}

QR_MAX_SIZE = 400  # px — QR codes are square; no need for separate width/height


class BookIntroPage(models.Model):
    tag_label = models.CharField(max_length=100)
    headline = models.TextField()
    is_active = models.BooleanField(default=True)
    sidebar_qr_image = models.URLField(
        blank=True,
        help_text="Public Bunny CDN URL for the QR image (auto-filled on upload). Do not edit manually.",
    )
    qr_image_upload = models.ImageField(
        upload_to='landing/qr_upload/',
        blank=True,
        null=True,
        help_text="Upload a QR image here. It will be converted to WebP and stored on Bunny CDN automatically.",
    )
    sidebar_zalo_url = models.URLField()
    chapters = models.JSONField(default=list)

    class Meta:
        verbose_name = 'Book Intro Page'
        verbose_name_plural = 'Book Intro Pages'

    def __str__(self):
        return self.headline[:60]

    def save(self, *args, **kwargs):
        old_qr_name = None
        if self.pk:
            try:
                old_qr_name = BookIntroPage.objects.get(pk=self.pk).qr_image_upload.name
            except BookIntroPage.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        qr_changed = (self.qr_image_upload.name if self.qr_image_upload else None) != old_qr_name

        if qr_changed and self.qr_image_upload:
            try:
                from videos.bunny_file_storage import upload_image_to_bunny
                storage_key = f'landing/qr/{self.pk}.webp'
                cdn_url = upload_image_to_bunny(
                    self.qr_image_upload,
                    storage_key,
                    max_width=QR_MAX_SIZE,
                    max_height=QR_MAX_SIZE,
                    skip_if_exists=False,
                )
                BookIntroPage.objects.filter(pk=self.pk).update(sidebar_qr_image=cdn_url)
                self.sidebar_qr_image = cdn_url

                # Remove the local upload file to avoid storing duplicates
                local_path = self.qr_image_upload.path
                BookIntroPage.objects.filter(pk=self.pk).update(qr_image_upload='')
                self.qr_image_upload = None
                try:
                    os.remove(local_path)
                except OSError:
                    pass
            except Exception:
                pass  # Non-fatal; sidebar_qr_image can be set manually as fallback

    def clean(self):
        if not isinstance(self.chapters, list):
            raise ValidationError({'chapters': 'chapters must be a JSON array.'})
        for i, chapter in enumerate(self.chapters):
            missing = CHAPTER_REQUIRED_KEYS - chapter.keys()
            if missing:
                raise ValidationError({'chapters': f'Chapter {i + 1} missing keys: {missing}'})
            if chapter.get('display_type') not in VALID_DISPLAY_TYPES:
                raise ValidationError(
                    {'chapters': f'Chapter {i + 1}: display_type must be "accordion" or "featured".'}
                )
            if not isinstance(chapter.get('items'), list):
                raise ValidationError({'chapters': f'Chapter {i + 1}: items must be an array.'})
            for j, item in enumerate(chapter['items']):
                missing_item = ITEM_REQUIRED_KEYS - item.keys()
                if missing_item:
                    raise ValidationError(
                        {'chapters': f'Chapter {i + 1}, item {j + 1} missing keys: {missing_item}'}
                    )
                if not item.get('demo_url'):
                    raise ValidationError(
                        {'chapters': f'Chapter {i + 1}, item {j + 1}: demo_url must not be empty.'}
                    )
