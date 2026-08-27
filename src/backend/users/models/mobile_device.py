from django.db import models
from django.db.models import Q
from django.utils import timezone

from .device_base import AbstractDevice
from .user import User


class MobileDevice(AbstractDevice):
    """
    A user's bound mobile handset. One ACTIVE row per user, enforced in the database.

    Separate from UserDevice on purpose: the two share ten columns (declared in
    AbstractDevice) but no policy. Web devices are cheap and plentiful (quota 5,
    identified by a volatile browser fingerprint); a mobile device is a single
    long-lived binding that only staff can move to another handset.
    """
    DEVICE_TYPE_CHOICES = [
        ('IOS', 'iOS'),
        ('ANDROID', 'Android'),
    ]

    # Why the row was stood down. Not consulted by the login rule (see §4.1), but
    # it is what lets an admin tell "support cut the session" apart from
    # "another handset took over" when reading a user's device history.
    REVOKED_REASON_CHOICES = [
        ('ADMIN_UNBIND', 'Admin unbind'),
        ('REPLACED', 'Replaced by another handset'),
    ]

    # Declared here rather than on the base so the related_name reads correctly
    # and `user.devices` keeps meaning "web devices" for existing code.
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mobile_devices')

    # Short, speakable identifier for support. Generated once, never recomputed:
    # device_id changes in place when a client re-binds after a reinstall.
    client_code = models.CharField(max_length=16, unique=True)

    # SHA-256 of a hardware anchor (ANDROID_ID / identifierForVendor). Lets a
    # reinstalled app be recognised as the same handset instead of a new one.
    hardware_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES)
    device_model = models.CharField(max_length=128, null=True, blank=True)
    os_version = models.CharField(max_length=64, null=True, blank=True)
    app_version = models.CharField(max_length=32, null=True, blank=True)
    bound_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(
        max_length=20, choices=REVOKED_REASON_CHOICES, null=True, blank=True,
    )

    class Meta:
        verbose_name = 'Mobile Device'
        verbose_name_plural = 'Mobile Devices'
        ordering = ['-last_active']
        unique_together = ['user', 'device_id']
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(status='ACTIVE'),
                name='uniq_active_mobile_device_per_user',
            ),
            models.UniqueConstraint(
                fields=['user', 'hardware_hash'],
                condition=Q(hardware_hash__isnull=False),
                name='uniq_mobile_hardware_per_user',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_mobiledevice_user_status'),
        ]

    def __str__(self):
        return f'{self.client_code} - {self.device_name or self.device_id} ({self.user.email})'

    def save(self, *args, **kwargs):
        # Imported lazily: users.services imports users.models at module level,
        # so a top-level import here would close a circular import loop.
        from ..services.client_id import generate_client_code

        if not self.client_code:
            self.client_code = generate_client_code(self.device_id)
        if not self.bound_at:
            self.bound_at = timezone.now()
        # AbstractDevice.save() stamps revoked_at when the row turns REVOKED.
        return super().save(*args, **kwargs)
