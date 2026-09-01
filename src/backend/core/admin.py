from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect

from videos.bunny_file_storage import purge_cdn_url, upload_bytes_to_bunny

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
    # Declared explicitly, not a model field: the APK bytes go to Bunny
    # (see save_model), not a Django FileField/storage backend, so there is
    # nothing on AppRelease for ModelForm to map this to automatically.
    file = forms.FileField(required=False)

    class Meta:
        model = AppRelease
        fields = ['platform', 'release_notes']

    def clean_file(self):
        """
        Runs before anything is saved, so a bad or non-increasing APK never
        reaches storage or the database (feature-37 §3.2, §3.3). The detected
        values are stashed on the form, not written to self.instance directly
        here — save_model() applies them once the whole form is valid.
        """
        file = self.cleaned_data.get('file')
        if file:
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
        uploaded_file = form.cleaned_data.get('file')

        if detected:
            obj.version_code, obj.version_name, obj.sha256, obj.file_size = detected
            storage_key = AppRelease.apk_storage_key()

            # Upload BEFORE saving the row: if Bunny is unreachable, the DB
            # must not end up pointing at a key that was never written.
            uploaded_file.seek(0)
            upload_bytes_to_bunny(
                uploaded_file.read(), storage_key, 'application/vnd.android.package-archive',
            )
            obj.bunny_key = storage_key
            # Overwriting the same key in place (feature-37's one-release
            # model) means the CDN edge would otherwise keep serving the old
            # cached bytes under the new version_code the client just saw.
            purge_cdn_url(obj.download_url)

        super().save_model(request, obj, form, change)

        if detected:
            self.message_user(
                request,
                f'Đã publish version {obj.version_name} ({obj.version_code}) lên Bunny CDN.',
            )
