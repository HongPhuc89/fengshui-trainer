import os

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .base import BaseModel


def avatar_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1] or '.jpg'
    return f'avatars/{instance.pk}{ext}'


# Applied in User.save() for new accounts only (feature-41 §1) — the field
# keeps default=1 in the schema so no migration is needed; existing rows are
# untouched.
DEFAULT_MOBILE_MAX_DEVICES = 3


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

    # Password change rate limiting — one change allowed per calendar day
    password_changed_at = models.DateField(null=True, blank=True)

    # How many mobile slots this user may hold at once (UNCLAIMED + ACTIVE).
    # Reaching it stops staff allocating another; it never silently replaces one.
    mobile_max_devices = models.PositiveSmallIntegerField(default=1)

    # Feature-39: accounts used only for Apple/Google store review or internal
    # demo. Mobile login skips the pairing-code/slot-quota flow entirely for
    # these — a reviewer has no admin in the loop to hand out a code. Set
    # manually via admin; never toggled by users themselves.
    is_review_account = models.BooleanField(default=False)

    # Use public_id as the primary identifier for external relations
    # but keep standard Django id (BaseModel.id) for internal performance
    
    def __str__(self):
        return self.username or self.email or self.phone_number or f"User {self.public_id}"

    def save(self, *args, **kwargs):
        # mobile_max_devices has no add-form field, so it is never assigned by
        # an admin before the first save — safe to force unconditionally here.
        if self._state.adding:
            self.mobile_max_devices = DEFAULT_MOBILE_MAX_DEVICES
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ['-created_at']
