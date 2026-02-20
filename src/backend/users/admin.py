from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from django.utils.html import format_html
from .models import User, UserDevice, AdminAuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'phone_number', 'email', 'first_name', 'last_name', 'user_type', 'is_device_locked', 'is_staff')
    list_filter = ('user_type', 'is_device_locked', 'is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone_number', 'public_id')
    ordering = ('-created_at',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Profile Flags', {'fields': ('phone_number', 'user_type', 'subscription_end_date')}),
        ('Device Security', {'fields': ('is_device_locked', 'last_device_reset')}),
    )


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ('device_name', 'user', 'device_type', 'is_primary_bound', 'status', 'last_active')
    list_filter = ('device_type', 'is_primary_bound', 'status')
    search_fields = ('device_id', 'device_name', 'user__username', 'user__phone_number')
    readonly_fields = ('device_id', 'last_ip', 'user_agent', 'last_active')
    actions = ['revoke_devices']

    @admin.action(description='Revoke selected device(s)')
    def revoke_devices(self, request, queryset):
        for device in queryset.filter(status='ACTIVE'):
            was_primary = device.is_primary_bound
            device.status = 'REVOKED'
            device.is_primary_bound = False
            device.save()
            if was_primary:
                user = device.user
                user.is_device_locked = False
                user.last_device_reset = timezone.now()
                user.save()
                AdminAuditLog.objects.create(
                    staff=request.user,
                    target_user=user,
                    action_category='DEVICE_RESET',
                    action_detail=f'Admin un-linked device: {device.device_name or device.device_id}',
                    change_log={
                        'before': {'device_id': device.device_id, 'is_primary_bound': True},
                        'after': {'status': 'REVOKED'},
                    },
                    ip_address=self._get_client_ip(request),
                )
        self.message_user(request, 'Selected device(s) revoked.')

    @staticmethod
    def _get_client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ('action_category', 'staff', 'target_user', 'action_detail_short', 'created_at')
    list_filter = ('action_category', 'created_at')
    search_fields = ('staff__username', 'target_user__username', 'action_detail')
    readonly_fields = ('staff', 'target_user', 'action_category', 'action_detail', 'change_log', 'ip_address', 'created_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    def action_detail_short(self, obj):
        return (obj.action_detail[:50] + '...') if obj.action_detail and len(obj.action_detail) > 50 else (obj.action_detail or '-')

    action_detail_short.short_description = 'Detail'
