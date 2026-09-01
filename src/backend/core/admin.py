from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect

from .models import AppRelease, DatabaseBackupProxy
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


class AppReleaseForm(forms.ModelForm):
    class Meta:
        model = AppRelease
        fields = ['platform', 'file', 'release_notes']

    def clean_file(self):
        """
        Runs before anything is saved, so a bad or non-increasing APK never
        reaches storage or the database (feature-37 §3.2, §3.3). The detected
        values are stashed on the form, not written to self.instance directly
        here — save_model() applies them once the whole form is valid.
        """
        file = self.cleaned_data['file']
        if 'file' in self.changed_data:
            self._detected = self.instance.read_version_from_apk(file)
        return file


@admin.register(AppRelease)
class AppReleaseAdmin(admin.ModelAdmin):
    form = AppReleaseForm
    list_display = ('platform', 'version_name', 'version_code', 'updated_at')
    readonly_fields = ('version_code', 'version_name', 'sha256', 'file_size', 'updated_at')
    fields = ('platform', 'file', 'release_notes', 'version_name', 'version_code',
              'sha256', 'file_size', 'updated_at')

    def has_add_permission(self, request):
        # Singleton — the one row is seeded by migration, so there is normally
        # never an "add" to allow. Dynamic (not a hardcoded False) so that if
        # the row is ever deleted, add becomes available again on its own
        # (feature-37 §3.1, §9 — has_delete_permission is deliberately left
        # at its default: deleting it is a valid way to pull the release, and
        # this is what makes that recoverable).
        return not AppRelease.objects.exists()

    def save_model(self, request, obj, form, change):
        detected = getattr(form, '_detected', None)
        old_file = None
        if detected:
            obj.version_code, obj.version_name, obj.sha256, obj.file_size = detected
            old_file = AppRelease.objects.get(pk=obj.pk).file or None

        super().save_model(request, obj, form, change)

        # Only delete the previous binary AFTER the save above succeeded —
        # "xoá file cũ nếu upload thành công" (feature-37 §3.3). FieldFile.delete()
        # goes through LocalFirstSupabaseStorage, so this also removes the
        # object on Supabase (feature-36 §5.2), not just the local copy.
        if old_file and old_file.name != obj.file.name:
            old_file.delete(save=False)

        if detected:
            self.message_user(
                request,
                f'Đã publish version {obj.version_name} ({obj.version_code}). '
                f'File bản trước đã bị xoá.',
            )
