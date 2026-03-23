from django.contrib import admin, messages
from django.shortcuts import redirect

from .models import DatabaseBackupProxy
from .tasks import backup_database


@admin.register(DatabaseBackupProxy)
class DatabaseBackupAdmin(admin.ModelAdmin):
    change_list_template = "admin/core/backup_list.html"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        # No DB table — return empty queryset to avoid any DB hit
        return DatabaseBackupProxy.objects.none()

    def changelist_view(self, request, extra_context=None):
        if request.method == "POST" and "trigger_backup" in request.POST:
            backup_database.delay()
            self.message_user(request, "Backup đã được đưa vào queue.", messages.SUCCESS)
            return redirect(".")
        return super().changelist_view(request, extra_context)
