from django.contrib import admin
from .models import VideoCourse, UserVideoPurchase


@admin.register(VideoCourse)
class VideoCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'price_lt', 'public_id', 'created_at')
    search_fields = ('title',)


@admin.register(UserVideoPurchase)
class UserVideoPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'created_at')
    list_filter = ('created_at',)
    raw_id_fields = ('user', 'video')
