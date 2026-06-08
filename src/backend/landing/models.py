from django.core.exceptions import ValidationError
from django.db import models

VALID_DISPLAY_TYPES = {'accordion', 'featured'}
CHAPTER_REQUIRED_KEYS = {'chapter_label', 'title', 'display_type', 'items'}
ITEM_REQUIRED_KEYS = {'demo_url'}


class BookIntroPage(models.Model):
    tag_label = models.CharField(max_length=100)
    headline = models.TextField()
    is_active = models.BooleanField(default=True)
    sidebar_qr_image = models.URLField(blank=True)
    sidebar_zalo_url = models.URLField()
    chapters = models.JSONField(default=list)

    class Meta:
        verbose_name = 'Book Intro Page'
        verbose_name_plural = 'Book Intro Pages'

    def __str__(self):
        return self.headline[:60]

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
