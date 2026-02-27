import os

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .base import BaseModel


def avatar_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1] or '.jpg'
    return f'avatars/{instance.pk}{ext}'

class User(AbstractUser, BaseModel):
    """
    Custom User model: identified by email, optional phone; device locking supported.
    """
    USER_TYPE_CHOICES = [
        ('FREE', 'Free User'),
        ('VIP', 'VIP Subscriber'),
        ('USER', 'Paid/Return User'),
    ]

    email = models.EmailField(unique=True, blank=True)  # main identifier for login/register
    phone_number = models.CharField(max_length=15, null=True, blank=True)  # optional, no unique
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='FREE')
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    
    # Avatar
    avatar = models.ImageField(upload_to=avatar_upload_to, blank=True, null=True)

    # Device Locking Logic
    is_device_locked = models.BooleanField(default=False)
    last_device_reset = models.DateTimeField(default=timezone.now)

    # Use public_id as the primary identifier for external relations
    # but keep standard Django id (BaseModel.id) for internal performance
    
    def __str__(self):
        return self.username or self.email or self.phone_number or f"User {self.public_id}"

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ['-created_at']
