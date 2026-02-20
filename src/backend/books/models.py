from django.db import models
from django.conf import settings

from users.models import BaseModel


class Book(BaseModel):
    """Book (sách) - purchasable with Linh Thạch."""
    title = models.CharField(max_length=255)
    price_lt = models.PositiveIntegerField(
        default=0,
        help_text="Price in Linh Thạch (LT)",
    )

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Book"
        verbose_name_plural = "Books"
        ordering = ['-created_at']


class UserBookPurchase(BaseModel):
    """Records when a user purchased a book with LT."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='book_purchases',
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name='purchases',
    )

    class Meta:
        verbose_name = "User Book Purchase"
        verbose_name_plural = "User Book Purchases"
        unique_together = [['user', 'book']]
        ordering = ['-created_at']
