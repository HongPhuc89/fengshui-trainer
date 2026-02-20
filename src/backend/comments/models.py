from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from users.models import BaseModel


class Comment(BaseModel):
    """Comment on a content object (Book, VideoCourse, etc.) via GenericForeignKey."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=255)  # store public_id (UUID string)
    content_object = GenericForeignKey('content_type', 'object_id')
    body = models.TextField()
    is_pinned = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Comment"
        verbose_name_plural = "Comments"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return (self.body[:50] + '...') if len(self.body) > 50 else self.body


class CommentReply(BaseModel):
    """Reply to a comment."""
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='replies',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_replies',
    )
    body = models.TextField()

    class Meta:
        verbose_name = "Comment Reply"
        verbose_name_plural = "Comment Replies"
        ordering = ['created_at']

    def __str__(self):
        return (self.body[:40] + '...') if len(self.body) > 40 else self.body
