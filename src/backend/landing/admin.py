from django.contrib import admin
from django.db import models
from django.utils.html import format_html

try:
    from jsoneditor.forms import JSONEditor
    _json_editor_available = True
except ImportError:
    _json_editor_available = False

from .models import BookIntroPage


@admin.register(BookIntroPage)
class BookIntroPageAdmin(admin.ModelAdmin):
    list_display = ['headline', 'is_active']
    readonly_fields = ['qr_image_preview', 'sidebar_qr_image']
    fields = [
        'tag_label', 'headline', 'is_active',
        'qr_image_upload', 'qr_image_preview', 'sidebar_qr_image',
        'sidebar_zalo_url', 'chapters',
    ]

    if _json_editor_available:
        formfield_overrides = {
            models.JSONField: {'widget': JSONEditor},
        }

    def qr_image_preview(self, obj):
        if obj.sidebar_qr_image:
            return format_html(
                '<img src="{}" style="max-height:180px;border-radius:4px;border:1px solid #ddd;" />',
                obj.sidebar_qr_image,
            )
        return "—"
    qr_image_preview.short_description = "QR preview (current)"

    change_form_template = 'admin/landing/bookintropage/change_form.html'

    def has_add_permission(self, request):
        return not BookIntroPage.objects.exists()
