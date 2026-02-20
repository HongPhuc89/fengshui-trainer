from django.db import models
from django.conf import settings

from users.models import BaseModel


class EmailLog(BaseModel):
    """Full audit trail for all outgoing emails."""
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    template_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=10,
        choices=[('PENDING', 'Pending'), ('SENT', 'Sent'), ('FAILED', 'Failed')],
    )
    error_message = models.TextField(blank=True)

    class Meta:
        verbose_name = "Email Log"
        verbose_name_plural = "Email Logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient} - {self.subject} [{self.status}]"


class EmailQuota(models.Model):
    """Daily email count for limit enforcement (e.g. 300/day)."""
    date = models.DateField(unique=True)
    count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Email Quota"
        verbose_name_plural = "Email Quotas"
        ordering = ['-date']

    def __str__(self):
        return f"{self.date}: {self.count}"


class Notification(BaseModel):
    """In-app notification for user."""
    TYPE_CHOICES = [
        ('RECHARGE', 'Recharge'),
        ('PURCHASE', 'Purchase'),
        ('VIP_EXPIRY', 'VIP Expiry'),
        ('SYSTEM', 'System'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    is_read = models.BooleanField(default=False)
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.title}"
