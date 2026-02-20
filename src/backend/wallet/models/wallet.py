from django.db import models
from django.conf import settings

from users.models import BaseModel


class Wallet(BaseModel):
    """
    Tracks the LT (in-app currency) balance for each user.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallet',
    )
    balance = models.PositiveIntegerField(
        default=0,
        help_text="Current LT balance",
    )
    total_recharged = models.PositiveIntegerField(
        default=0,
        help_text="Lifetime recharged amount",
    )

    def __str__(self):
        return f"{self.user.username}'s Wallet - Balance: {self.balance} LT"

    class Meta:
        verbose_name = "Wallet"
        verbose_name_plural = "Wallets"
        ordering = ['-created_at']
