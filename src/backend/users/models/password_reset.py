from django.db import models
from django.utils import timezone

from .base import BaseModel


class PasswordResetOTP(BaseModel):
    """Stores one active OTP per user for the forgot-password flow.

    OneToOneField guarantees at most one record per user.
    update_or_create() overwrites the existing record on each new OTP request
    so there is no row accumulation.
    """

    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='password_reset_otp',
    )
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Password Reset OTP"
        verbose_name_plural = "Password Reset OTPs"

    def __str__(self):
        return f"PasswordResetOTP for {self.user.email}"

    @property
    def is_valid(self) -> bool:
        """Return True when the OTP has not been used and has not expired."""
        return not self.is_used and timezone.now() < self.expires_at
