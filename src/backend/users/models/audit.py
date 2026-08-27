from django.db import models
from .base import BaseModel
from .user import User

class AdminAuditLog(BaseModel):
    """
    Audit log for sensitive staff actions (Currency edits, VIP management, Device resets).
    """
    ACTION_CHOICES = [
        ('CURRENCY', 'Currency Edit'),
        ('VIP_MANAGEMENT', 'VIP Upgrade/Downgrade'),
        ('DEVICE_RESET', 'Device Un-link'),
        ('CONTENT_GRANT', 'Manual Content Grant'),
        ('USER_ACTIVATION', 'User Account Activation'),
        ('DEVICE_ACTIVATION', 'Device Activation Key'),
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
