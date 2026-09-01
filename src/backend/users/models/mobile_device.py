from django.db import models
from django.db.models import Q
from django.utils import timezone

from .device_base import AbstractDevice
from .user import User

# Statuses that hold a place against user.mobile_max_devices, and the scope of
# the uniqueness constraints on MobileDevice: a released slot must not block the
# same handset from taking a new one.
# Module level because a nested Meta class cannot see the enclosing class body.
OCCUPYING_STATUSES = ('UNCLAIMED', 'ACTIVE')


class MobileDevice(AbstractDevice):
    """
    A device slot allocated by staff, then claimed by a handset (feature-34 §6.1).

    UNCLAIMED: staff created it, pairing_code issued, no handset yet.
    ACTIVE:    a handset redeemed the code and is bound.
    REVOKED:   was active, staff cut it off.
    EXPIRED:   never claimed — the code timed out or was burnt by wrong tries.
    """
    STATUS_CHOICES = [
        ('UNCLAIMED', 'Unclaimed'),
        ('ACTIVE', 'Active'),
        ('REVOKED', 'Revoked'),
        ('EXPIRED', 'Expired'),
    ]
    OCCUPYING = OCCUPYING_STATUSES

    DEVICE_TYPE_CHOICES = [
        ('IOS', 'iOS'),
        ('ANDROID', 'Android'),
    ]
    REVOKED_REASON_CHOICES = [
        ('ADMIN_UNBIND', 'Admin unbind'),
        ('MOBILE_DISABLED', 'Mobile access turned off'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mobile_devices')

    # Permanent public identity of the slot. Generated at creation from a random
    # seed (device_id does not exist yet) and never recomputed.
    client_code = models.CharField(max_length=16, unique=True)

    # One-time secret the user types to claim this slot. Kept after the claim for
    # audit; the admin UI masks it once status leaves UNCLAIMED.
    pairing_code = models.CharField(max_length=20, unique=True)

    # NULL until a handset claims the slot.
    device_id = models.CharField(max_length=255, null=True, blank=True)
    hardware_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    # Slot lifecycle
    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='issued_mobile_slots',
    )
    issued_reason = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField()
    claimed_at = models.DateTimeField(null=True, blank=True)
    claim_ip = models.GenericIPAddressField(null=True, blank=True)
    # Wrong-code attempts. The slot burns itself past the limit so a leaked
    # password cannot be used to grind through codes.
    claim_attempts = models.IntegerField(default=0)

    # Filled in at claim time from the handset
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES, blank=True)
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
        constraints = [
            # Scoped to the occupying statuses, not just "not null". A handset
            # keeps its device_id and hardware_hash on the row after the slot is
            # revoked, so a second slot claimed by that same phone would collide
            # with its own history if the condition were only isnull=False.
            models.UniqueConstraint(
                fields=['user', 'device_id'],
                condition=Q(device_id__isnull=False, status__in=OCCUPYING_STATUSES),
                name='uniq_mobile_device_id_per_user',
            ),
            models.UniqueConstraint(
                fields=['user', 'hardware_hash'],
                condition=Q(hardware_hash__isnull=False, status__in=OCCUPYING_STATUSES),
                name='uniq_mobile_hardware_per_user',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_mobiledevice_user_status'),
            models.Index(fields=['status', 'expires_at'], name='idx_mobiledevice_expiry'),
        ]

    def __str__(self):
        label = self.device_name or self.device_id or 'chưa ghép cặp'
        return f'{self.client_code} - {label} ({self.user.email})'

    @property
    def is_claimable(self) -> bool:
        return self.status == 'UNCLAIMED' and timezone.now() < self.expires_at
