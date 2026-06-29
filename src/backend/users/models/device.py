from django.db import models
from .base import BaseModel
from .user import User

class UserDevice(BaseModel):
    """
    Tracks bound devices for the 1-user-1-device policy.
    """
    DEVICE_TYPE_CHOICES = [
        ('MOBILE_IOS', 'iOS'),
        ('MOBILE_ANDROID', 'Android'),
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
    is_primary_bound = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    last_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    last_active = models.DateTimeField(auto_now=True)

    # Geo location derived from last_ip (populated async after device creation)
    geo_city = models.CharField(max_length=100, null=True, blank=True)
    geo_region = models.CharField(max_length=100, null=True, blank=True)
    geo_country_code = models.CharField(max_length=2, null=True, blank=True)
    geo_fetched_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.device_name or self.device_id} ({self.user.username})"

    class Meta:
        unique_together = ['user', 'device_id']
        verbose_name = "User Device"
        verbose_name_plural = "User Devices"
        ordering = ['-last_active']
