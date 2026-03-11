import os

from django.conf import settings
from django.db import models

from users.models import BaseModel


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


class VideoLesson(BaseModel):
    """Lesson (clip) inside a course."""
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

    class Meta:
        verbose_name = "Video Lesson"
        verbose_name_plural = "Video Lessons"
        ordering = ['course', 'order']
        unique_together = [['course', 'order'], ['course', 'slug']]

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
