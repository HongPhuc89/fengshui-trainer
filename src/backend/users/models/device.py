from django.db import models

from .base import BaseModel
from .user import User


class UserDevice(BaseModel):
    """
    A browser session bound to a user. WEB ONLY since feature-34.

    Mobile handsets live in MobileDevice, which carries a different policy: one
    active binding per user, changed only with a staff-issued activation key.
    Because of the split, `user.devices` means "web devices" and nothing else —
    the quota and revoke logic in CustomLoginSerializer rely on that.

    Not migrated onto AbstractDevice yet; that happens in the cleanup commit
    together with the rename to WebDevice (design §3.4, §3.5).
    """
    DEVICE_TYPE_CHOICES = [
        ('WEB', 'Web'),
    ]
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('REVOKED', 'Revoked'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    device_id = models.CharField(max_length=255)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPE_CHOICES)
    device_name = models.CharField(max_length=255, null=True, blank=True)
    # Dead field since feature-34: device-status now reports the mobile binding.
    # Dropped in the cleanup commit.
    is_primary_bound = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    last_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    last_active = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    # Geo location derived from last_ip (populated async after device creation)
    geo_city = models.CharField(max_length=100, null=True, blank=True)
    geo_region = models.CharField(max_length=100, null=True, blank=True)
    geo_country_code = models.CharField(max_length=2, null=True, blank=True)
    geo_fetched_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.device_name or self.device_id} ({self.user.username})"

    class Meta:
        unique_together = ['user', 'device_id']
        verbose_name = "Web Device"
        verbose_name_plural = "Web Devices"
        ordering = ['-last_active']
