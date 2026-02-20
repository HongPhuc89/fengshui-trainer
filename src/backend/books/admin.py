from django.contrib import admin
from .models import Book, UserBookPurchase


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'price_lt', 'public_id', 'created_at')
    search_fields = ('title',)


@admin.register(UserBookPurchase)
class UserBookPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'book', 'created_at')
    list_filter = ('created_at',)
    raw_id_fields = ('user', 'book')
