from django.db import models
from django.conf import settings

from users.models import BaseModel


class Voucher(BaseModel):
    """
    Pre-generated codes sold externally. Users redeem these to get LT.
    """
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Alphanumeric redemption code (e.g., VIP-X59A-12BF)",
    )
    value = models.PositiveIntegerField(
        help_text="Amount of LT granted upon redemption",
    )
    is_used = models.BooleanField(default=False)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='redeemed_vouchers',
    )
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Voucher {self.code} ({self.value} LT)"

    class Meta:
        verbose_name = "Voucher"
        verbose_name_plural = "Vouchers"
        ordering = ['-created_at']
