from django.db import models
from django.utils import timezone

from .base import BaseModel


class AbstractDevice(BaseModel):
    """
    Fields and behaviour shared by every kind of bound device (feature-34 §3.4).

    Concrete subclasses declare their own `user` FK so each keeps a related_name
    that reads correctly (`user.devices` for web, `user.mobile_devices` for
    mobile) — that is the one thing which must NOT be shared.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('REVOKED', 'Revoked'),
    ]

    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    last_ip = models.GenericIPAddressField(null=True, blank=True)
    last_active = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    # Geo location derived from last_ip (feature-33). save_geo_to_device() is
    # written against exactly these four fields, so it works on any subclass.
    geo_city = models.CharField(max_length=100, null=True, blank=True)
    geo_region = models.CharField(max_length=100, null=True, blank=True)
    geo_country_code = models.CharField(max_length=2, null=True, blank=True)
    geo_fetched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.status == 'REVOKED' and self.revoked_at is None:
            self.revoked_at = timezone.now()
        return super().save(*args, **kwargs)
