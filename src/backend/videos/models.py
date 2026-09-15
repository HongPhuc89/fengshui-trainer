import logging
import os

from django.conf import settings
from django.db import models

from users.models import BaseModel

logger = logging.getLogger(__name__)


def lesson_thumbnail_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1]
    return f'thumbnails/{instance.pk}{ext}'


class VideoCategory(BaseModel):
    """Category for video courses."""
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)

    class Meta:
        verbose_name = "Video Category"
        verbose_name_plural = "Video Categories"
        ordering = ['title']

    def __str__(self):
        return self.title


class VideoCourse(BaseModel):
    """Video course - purchasable with LT (in-app currency)."""
    LEVEL_CHOICES = [
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('ADVANCED', 'Advanced'),
    ]

    category = models.ForeignKey(
        VideoCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses',
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    description = models.TextField(blank=True)
    instructor = models.CharField(max_length=255, blank=True)
    cover_image = models.CharField(max_length=255, blank=True)
    trailer_url = models.CharField(max_length=500, blank=True)
    is_free = models.BooleanField(default=False)
    price_lt = models.PositiveIntegerField(
        default=0,
        help_text="Price in LT (in-app currency)",
    )
    total_duration_seconds = models.PositiveIntegerField(default=0)
    total_lessons = models.PositiveIntegerField(default=0)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, blank=True)
    published_date = models.DateField(null=True, blank=True)
    final_exam_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Public ID of linked Exam (exams.Exam). No FK to avoid migration dependency.",
    )
    is_public = models.BooleanField(
        default=True,
        help_text="If False, only owners (purchased or VIP) can see this course in lists and detail.",
    )
    bunny_collection_id = models.CharField(
        max_length=64,
        blank=True,
        verbose_name='Bunny Collection ID',
        help_text=(
            "Bunny Stream collection GUID that this course's lessons belong to. "
            "Run `sync_bunny_collection` to apply it to the lessons on Bunny."
        ),
    )

    class Meta:
        verbose_name = "Video Course"
        verbose_name_plural = "Video Courses"
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def recalculate_totals(self):
        """Recalculate total_duration_seconds and total_lessons from current lessons."""
        from django.db.models import Sum, Count
        agg = self.lessons.aggregate(
            total_dur=Sum('duration_seconds'),
            total_cnt=Count('id'),
        )
        self.total_duration_seconds = agg['total_dur'] or 0
        self.total_lessons = agg['total_cnt'] or 0
        self.save(update_fields=['total_duration_seconds', 'total_lessons'])


class VideoLessonQuerySet(models.QuerySet):
    def ready(self):
        """Lessons whose Bunny metadata sync has completed.

        Uses `thumbnail` presence as a proxy for "sync_bunny_metadata has run
        successfully" — there is no dedicated status field yet.
        """
        return self.exclude(thumbnail='').filter(thumbnail__isnull=False)


class VideoLesson(BaseModel):
    """Lesson (clip) inside a course."""
    objects = VideoLessonQuerySet.as_manager()

    course = models.ForeignKey(
        VideoCourse,
        on_delete=models.CASCADE,
        related_name='lessons',
    )
    title = models.CharField(max_length=255)
    slug = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    description = models.TextField(blank=True)
    video_url = models.CharField(max_length=500, blank=True)
    video_id = models.CharField(max_length=255, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    transcript = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    thumbnail = models.ImageField(upload_to=lesson_thumbnail_upload_to, blank=True, null=True)
    is_free = models.BooleanField(default=False)
    infographic_pdf_key = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Lược đồ PDF (Bunny key)',
        help_text='Bunny Storage key. Auto-populated when uploading via admin. Max 50 MB.',
    )
    infographic_video_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Video tóm tắt URL',
        help_text='Summary video URL (Bunny embed URL or iframe src). Paste direct URL.',
    )
    small_thumbnail = models.CharField(
        max_length=500,
        blank=True,
        help_text="Public Bunny CDN URL for resized WebP thumbnail (auto-generated). Do not edit manually.",
    )

    class Meta:
        verbose_name = "Video Lesson"
        verbose_name_plural = "Video Lessons"
        ordering = ['course', 'order']
        unique_together = [['course', 'order'], ['course', 'slug']]

    def save(self, *args, **kwargs):
        # Detect whether thumbnail changed so we can regenerate small_thumbnail.
        old_thumbnail_name = None
        if self.pk:
            try:
                old_thumbnail_name = VideoLesson.objects.get(pk=self.pk).thumbnail.name
            except VideoLesson.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        thumbnail_changed = (self.thumbnail.name if self.thumbnail else None) != old_thumbnail_name

        if thumbnail_changed:
            if not self.thumbnail:
                # Thumbnail was cleared — wipe the small version too.
                VideoLesson.objects.filter(pk=self.pk).update(small_thumbnail='')
                self.small_thumbnail = ''
                return
            if not self.video_id:
                # No Bunny video linked yet — thumbnail isn't from a real sync, skip.
                return
            # Thumbnail was set or replaced — regenerate the small version, forcing
            # an overwrite (the source changed, so any existing Bunny object is stale)
            # and purging the CDN edge cache since it's served with a 1-year max-age.
            try:
                from videos.bunny_file_storage import purge_cdn_url  # noqa: PLC0415
                from videos.utils import generate_and_upload_small_thumbnail  # noqa: PLC0415
                small_url = generate_and_upload_small_thumbnail(self.pk, self.thumbnail, force=True)
                VideoLesson.objects.filter(pk=self.pk).update(small_thumbnail=small_url)
                self.small_thumbnail = small_url
                purge_cdn_url(small_url)
            except Exception:
                logger.exception("Failed to regenerate small_thumbnail for lesson %s", self.pk)

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class UserVideoPurchase(BaseModel):
    """Records when a user purchased a video course with LT."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_purchases',
    )
    video = models.ForeignKey(
        VideoCourse,
        on_delete=models.CASCADE,
        related_name='purchases',
    )

    class Meta:
        verbose_name = "User Video Purchase"
        verbose_name_plural = "User Video Purchases"
        unique_together = [['user', 'video']]
        ordering = ['-created_at']


class UserCourseProgress(BaseModel):
    """Tracks the last lesson the user navigated to in a course."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_progresses',
    )
    course = models.ForeignKey(
        VideoCourse,
        on_delete=models.CASCADE,
        related_name='user_progresses',
    )
    last_lesson = models.ForeignKey(
        'VideoLesson',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )

    class Meta:
        verbose_name = "User Course Progress"
        verbose_name_plural = "User Course Progresses"
        unique_together = [['user', 'course']]


class UserLessonProgress(BaseModel):
    """Watch progress per lesson."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lesson_progresses',
    )
    lesson = models.ForeignKey(
        VideoLesson,
        on_delete=models.CASCADE,
        related_name='user_progresses',
    )
    progress_seconds = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    last_watched = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Lesson Progress"
        verbose_name_plural = "User Lesson Progresses"
        unique_together = [['user', 'lesson']]
        indexes = [
            models.Index(fields=['user', 'last_watched'], name='idx_ulp_user_last_watched'),
        ]
