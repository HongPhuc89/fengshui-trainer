from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from .base import BaseModel

class User(AbstractUser, BaseModel):
    """
    Custom User model supporting phone-based authentication and device locking.
    """
    USER_TYPE_CHOICES = [
        ('FREE', 'Free User'),
        ('VIP', 'VIP Subscriber'),
        ('USER', 'Paid/Return User'),
    ]

    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='FREE')
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    
    # Device Locking Logic
    is_device_locked = models.BooleanField(default=False)
    last_device_reset = models.DateTimeField(default=timezone.now)

    # Use public_id as the primary identifier for external relations
    # but keep standard Django id (BaseModel.id) for internal performance
    
    def __str__(self):
        return self.username or self.phone_number or f"User {self.public_id}"

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ['-created_at']
