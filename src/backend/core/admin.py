import hashlib

from django.conf import settings

from django.contrib import admin, messages
from django.shortcuts import redirect
from django.utils.html import format_html

from .models import AppRelease, DatabaseBackupProxy
from .services.release_pruning import prune_release_files
from .services.version_spread import version_spread
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


@admin.register(AppRelease)
class AppReleaseAdmin(admin.ModelAdmin):
    list_display = ('platform', 'version_code', 'version_name',
                    'min_supported_version_code', 'is_published', 'file_state',
                    'created_at')
    list_filter = ('platform', 'is_published')
    search_fields = ('version_name', 'release_notes')
    readonly_fields = ('sha256', 'file_size', 'version_spread_display')
    ordering = ('platform', '-version_code')

    fieldsets = (
        (None, {'fields': ('platform', 'version_code', 'version_name', 'file')}),
        ('Chính sách cập nhật', {
            'fields': ('min_supported_version_code', 'version_spread_display', 'is_published'),
            'description': (
                'Ngưỡng chặn: client có version_code thấp hơn sẽ bị chặn hẳn. '
                'Đặt bằng version_code để bản này thành bắt buộc. '
                '<strong>APK phải được ký bằng đúng keystore hiện tại</strong> — ký khác key '
                'thì máy user không cài đè được, và cài mới sẽ làm mất ghép cặp thiết bị.'
            ),
        }),
        ('Nội dung', {'fields': ('release_notes',)}),
        ('Tự tính', {'fields': ('sha256', 'file_size'), 'classes': ('collapse',)}),
    )

    @admin.display(description='File', boolean=True)
    def file_state(self, obj):
        """False means the binary was pruned; the row is kept for history."""
        return bool(obj.file)

    @admin.display(description='Thiết bị đang chạy bản nào')
    def version_spread_display(self, obj):
        """Without this the admin sets the threshold blind (feature-36 §6.4)."""
        if obj is None or not obj.pk:
            return 'Lưu bản phát hành để xem phân bố phiên bản.'
        rows = version_spread(obj.platform)
        if not rows:
            return 'Chưa có thiết bị nào hoạt động trên nền tảng này.'
        return format_html(
            '<ul style="margin:0;padding-left:18px">{}</ul>',
            format_html(''.join(
                '<li><code>{}</code> — {} máy</li>'.format(r['app_version'], r['handsets'])
                for r in rows
            )),
        )

    def save_model(self, request, obj, form, change):
        """
        Hash and size are derived, never typed: a hand-entered digest that does
        not match makes every client refuse an otherwise good build.
        """
        if obj.file and (not change or 'file' in form.changed_data):
            obj.sha256 = self._digest(obj.file)
            obj.file_size = obj.file.size
        super().save_model(request, obj, form, change)

        # Runs on every save so the bucket cannot drift: a 60MB binary per
        # release adds up fast, and nothing serves builds this old.
        pruned = prune_release_files(obj.platform)
        if pruned:
            self.message_user(
                request,
                f'Đã xoá file của {pruned} bản cũ (giữ '
                f'{settings.APP_RELEASE_KEEP_FILES} bản mới nhất mỗi nền tảng). '
                f'Bản ghi vẫn còn để tra lịch sử.',
            )

        if obj.is_published:
            self.message_user(
                request,
                f'Đã publish {obj.get_platform_display()} {obj.version_name} '
                f'(version_code {obj.version_code}). Nhớ: không bao giờ dùng lại '
                f'version_code này, kể cả khi cần lùi.',
                level=messages.WARNING,
            )

    @staticmethod
    def _digest(file_field):
        """Chunked so a 60MB build never lands in memory in one piece."""
        digest = hashlib.sha256()
        file_field.open('rb')
        try:
            for chunk in file_field.chunks():
                digest.update(chunk)
        finally:
            file_field.seek(0)
        return digest.hexdigest()
