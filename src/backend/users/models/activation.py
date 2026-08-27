from django.db import models
from django.db.models import Q
from django.utils import timezone

from .base import BaseModel
from .mobile_device import MobileDevice
from .user import User


class DeviceActivationKey(BaseModel):
    """
    A single-use code, issued by staff, that lets one user bind a new mobile device.

    This is the only path through which a user can move to a different handset —
    there is deliberately no self-service alternative (feature-34 R7).
    """
    STATUS_CHOICES = [
        ('ISSUED', 'Issued'),
        ('USED', 'Used'),
        ('REVOKED', 'Revoked'),
        ('EXPIRED', 'Expired'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activation_keys')
    key = models.CharField(max_length=20, unique=True, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ISSUED')

    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='issued_activation_keys',
    )
    issued_reason = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField()

    used_at = models.DateTimeField(null=True, blank=True)
    used_device = models.ForeignKey(
        MobileDevice, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    used_ip = models.GenericIPAddressField(null=True, blank=True)

    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='revoked_activation_keys',
    )

    # Wrong-code attempts. The key self-revokes past the limit so a leaked user
    # account cannot be used to grind through codes.
    attempts = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Device Activation Key'
        verbose_name_plural = 'Device Activation Keys'
        ordering = ['-created_at']
        constraints = [
            # One live code per user: issuing a new one revokes the old one, so
            # support is never looking at two live codes for the same person.
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(status='ISSUED'),
                name='uniq_issued_activation_key_per_user',
            ),
        ]
        permissions = [
            ('view_activation_key_secret', 'Can view the plaintext activation key'),
        ]

    def __str__(self):
        return f'{self.key} ({self.user.email}, {self.status})'

    @property
    def is_valid(self) -> bool:
        return self.status == 'ISSUED' and timezone.now() < self.expires_at
