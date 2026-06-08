from django.contrib import admin
from django.db import models

try:
    from jsoneditor.forms import JSONEditor
    _json_editor_available = True
except ImportError:
    _json_editor_available = False

from .models import BookIntroPage


@admin.register(BookIntroPage)
class BookIntroPageAdmin(admin.ModelAdmin):
    list_display = ['headline', 'is_active']

    if _json_editor_available:
        formfield_overrides = {
            models.JSONField: {'widget': JSONEditor},
        }

    def has_add_permission(self, request):
        return not BookIntroPage.objects.exists()
