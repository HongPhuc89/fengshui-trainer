import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class BaseModel(models.Model):
    """
    Abstract base model to provide common fields for all system entities.
    - Private ID (id): Auto-increment Integer for internal DB joins and performance.
    - Public ID (public_id): UUID for external API exposure and security.
    """
    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

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

    def __str__(self):
        return f"{self.device_name or self.device_id} ({self.user.username})"

    class Meta:
        unique_together = ['user', 'device_id']
        verbose_name = "User Device"
        verbose_name_plural = "User Devices"
        ordering = ['-last_active']

class AdminAuditLog(BaseModel):
    """
    Audit log for sensitive staff actions (Currency edits, VIP management, Device resets).
    """
    ACTION_CHOICES = [
        ('CURRENCY', 'Currency Edit'),
        ('VIP_MANAGEMENT', 'VIP Upgrade/Downgrade'),
        ('DEVICE_RESET', 'Device Un-link'),
        ('CONTENT_GRANT', 'Manual Content Grant'),
    ]

    staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='performed_audits')
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_audits')
    action_category = models.CharField(max_length=50, choices=ACTION_CHOICES)
    action_detail = models.CharField(max_length=255)
    change_log = models.JSONField(help_text="Records before/after state, e.g. {'before': {'balance': 100}, 'after': {'balance': 500}}")
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.staff} -> {self.action_category} -> {self.target_user}"

    class Meta:
        verbose_name = "Admin Audit Log"
        verbose_name_plural = "Admin Audit Logs"
        ordering = ['-created_at']
