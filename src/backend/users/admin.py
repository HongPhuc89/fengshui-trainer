from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
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

@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ('action_category', 'staff', 'target_user', 'created_at')
    list_filter = ('action_category', 'created_at')
    search_fields = ('staff__username', 'target_user__username', 'action_detail')
    readonly_fields = ('staff', 'target_user', 'action_category', 'action_detail', 'change_log', 'ip_address')
