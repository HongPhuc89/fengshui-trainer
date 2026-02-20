from django.db import models
from django.conf import settings

from users.models import BaseModel


class VideoCourse(BaseModel):
    """Video course - purchasable with Linh Thạch."""
    title = models.CharField(max_length=255)
    price_lt = models.PositiveIntegerField(
        default=0,
        help_text="Price in Linh Thạch (LT)",
    )

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Video Course"
        verbose_name_plural = "Video Courses"
        ordering = ['-created_at']


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
