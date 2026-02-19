from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserDevice, AdminAuditLog

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'phone_number', 'user_type', 'is_device_locked', 'created_at')
    list_filter = ('user_type', 'is_device_locked', 'is_staff', 'is_superuser')
    search_fields = ('username', 'phone_number', 'email', 'public_id')
    ordering = ('-created_at',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Thông tin Thiên Thư', {'fields': ('phone_number', 'user_type', 'subscription_end_date', 'public_id')}),
        ('Bảo mật & Thiết bị', {'fields': ('is_device_locked', 'last_device_reset')}),
    )
    readonly_fields = ('public_id', 'created_at', 'updated_at')

@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_name', 'device_type', 'is_primary_bound', 'status', 'last_active')
    list_filter = ('device_type', 'is_primary_bound', 'status')
    search_fields = ('user__username', 'user__phone_number', 'device_id', 'device_name')
    readonly_fields = ('public_id', 'created_at', 'updated_at', 'last_active')

@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ('staff', 'target_user', 'action_category', 'action_detail', 'created_at')
    list_filter = ('action_category', 'created_at')
    search_fields = ('staff__username', 'target_user__username', 'action_detail')
    readonly_fields = ('public_id', 'created_at', 'updated_at', 'change_log')
    
    def has_add_permission(self, request):
        return False # Audit logs should not be manually added

    def has_change_permission(self, request, obj=None):
        return False # Audit logs should not be manually edited
