from django.db import models

from users.models import BaseModel

from .wallet import Wallet


class WalletTransaction(BaseModel):
    """
    Audit log for every change in Wallet balance.
    """
    TRANSACTION_TYPE_CHOICES = [
        ('RECHARGE_VOUCHER', 'Recharge via Voucher'),
        ('PURCHASE_BOOK', 'Purchase Book'),
        ('PURCHASE_VIDEO', 'Purchase Video'),
        ('ADMIN_EDIT', 'Admin Edit'),
        ('VIP_SUBSCRIPTION', 'VIP Subscription'),
    ]

    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name='transactions',
    )
    amount = models.IntegerField(
        help_text="Positive for recharge/refund, Negative for purchase",
    )
    transaction_type = models.CharField(
        max_length=30,
        choices=TRANSACTION_TYPE_CHOICES,
    )
    reference_id = models.CharField(
        max_length=255,
        help_text="E.g., Voucher code, Book ID, or Admin Audit Log ID",
    )
    description = models.CharField(max_length=255)
    balance_after = models.PositiveIntegerField(
        help_text="Snapshot of the balance after this transaction",
    )

    def __str__(self):
        return f"{self.wallet.user} | {self.transaction_type} | {self.amount} LT"

    class Meta:
        verbose_name = "Wallet Transaction"
        verbose_name_plural = "Wallet Transactions"
        ordering = ['-created_at']
