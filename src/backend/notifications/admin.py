from django.contrib import admin
from django.utils import timezone
from .models import EmailLog, EmailQuota, Notification


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'subject', 'status', 'template_name', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('recipient', 'subject')
    readonly_fields = ('recipient', 'subject', 'template_name', 'status', 'error_message', 'created_at')
    date_hierarchy = 'created_at'


@admin.register(EmailQuota)
class EmailQuotaAdmin(admin.ModelAdmin):
    list_display = ('date', 'count')
    readonly_fields = ('date', 'count')
    date_hierarchy = 'date'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('title', 'user__username')
    raw_id_fields = ('user',)
