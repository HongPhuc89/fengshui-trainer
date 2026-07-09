from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminUserCreationForm as DjangoAdminUserCreationForm, UserChangeForm as DjangoUserChangeForm
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
from .models import User, UserDevice, AdminAuditLog, PasswordResetOTP
from books.models import UserBookPurchase
from videos.models import UserVideoPurchase


class AdminUserCreationForm(DjangoAdminUserCreationForm):
    """User creation form for Django admin that requires email."""

    class Meta(DjangoAdminUserCreationForm.Meta):
        model = User
        fields = ('username', 'email')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].required = True
        self.fields['username'].label = 'Email đăng nhập'

    def clean_username(self):
        return self.cleaned_data.get('username', '').lower()

    def clean_email(self):
        return self.cleaned_data.get('email', '').lower()


class AdminUserChangeForm(DjangoUserChangeForm):
    """User change form for Django admin: labels username as login email and lowercases it."""

    class Meta(DjangoUserChangeForm.Meta):
        model = User

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].label = 'Email đăng nhập'

    def clean_username(self):
        return self.cleaned_data.get('username', '').lower()

    def clean_email(self):
        value = self.cleaned_data.get('email', '')
        return value.lower() if value else value


class PendingApprovalFilter(admin.SimpleListFilter):
    """Filter users by approval status (active vs pending admin approval)."""
    title = 'Trạng thái duyệt'
    parameter_name = 'approval_status'

    def lookups(self, request, model_admin):
        return [
            ('pending', 'Chờ duyệt'),
            ('active', 'Đã kích hoạt'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'pending':
            return queryset.filter(is_active=False)
        if self.value() == 'active':
            return queryset.filter(is_active=True)
        return queryset


class OwnedBookInline(admin.TabularInline):
    model = UserBookPurchase
    extra = 0
    fields = ('book', 'pdf_ready', 'created_at')
    readonly_fields = ('book', 'pdf_ready', 'created_at')
    can_delete = False
    verbose_name = 'Sách đã sở hữu'
    verbose_name_plural = 'Sách đã sở hữu'

    def has_add_permission(self, request, obj=None):
        return False


class OwnedVideoInline(admin.TabularInline):
    model = UserVideoPurchase
    extra = 0
    fields = ('video', 'created_at')
    readonly_fields = ('video', 'created_at')
    can_delete = False
    verbose_name = 'Khoá học đã sở hữu'
    verbose_name_plural = 'Khoá học đã sở hữu'

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = AdminUserChangeForm
    add_form = AdminUserCreationForm
    list_display = ('id', 'username', 'email', 'user_type', 'is_active', 'is_device_locked', 'last_login', 'created_at')
    list_filter = (PendingApprovalFilter, 'user_type', 'is_active', 'groups')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone_number', 'public_id')
    ordering = ('-created_at',)
    inlines = [OwnedBookInline, OwnedVideoInline]
    change_form_template = 'admin/users/user/change_form.html'
    actions = None

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'usable_password', 'password1', 'password2'),
        }),
    )

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Profile Flags', {'fields': ('phone_number', 'user_type', 'subscription_end_date')}),
        ('Device Security', {'fields': ('is_device_locked', 'last_device_reset')}),
    )

    def save_model(self, request, obj, form, change):
        # Track is_active changes made via the detail form (not just bulk actions).
        # obj already holds the new value from the submitted form.
        # `not obj.is_active` gives us the previous value since the new value is the opposite.
        is_active_changed = change and 'is_active' in form.changed_data
        super().save_model(request, obj, form, change)
        if is_active_changed:
            old_value = not obj.is_active
            AdminAuditLog.objects.create(
                staff=request.user,
                target_user=obj,
                action_category='USER_ACTIVATION',
                action_detail=f'Admin {"kích hoạt" if obj.is_active else "vô hiệu hóa"} tài khoản "{obj.email}" qua form',
                change_log={'before': {'is_active': old_value}, 'after': {'is_active': obj.is_active}},
                ip_address=self._get_client_ip(request),
            )

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/grant-book/',
                self.admin_site.admin_view(self.grant_book_view),
                name='users_user_grant_book',
            ),
            path(
                '<int:pk>/grant-video/',
                self.admin_site.admin_view(self.grant_video_view),
                name='users_user_grant_video',
            ),
        ]
        return custom + urls

    def grant_book_view(self, request, pk):
        from books.models import Book

        user = get_object_or_404(User, pk=pk)

        if request.method != 'POST':
            return redirect(reverse('admin:users_user_change', args=[pk]))

        book_id = request.POST.get('book_id')
        if not book_id:
            self.message_user(request, 'Vui lòng nhập ID sách.', level='error')
            return redirect(reverse('admin:users_user_change', args=[pk]))

        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            self.message_user(request, 'Không tìm thấy sách.', level='error')
            return redirect(reverse('admin:users_user_change', args=[pk]))

        if UserBookPurchase.objects.filter(user=user, book=book).exists():
            self.message_user(request, f'Người dùng "{user}" đã sở hữu sách "{book.title}".', level='error')
            return redirect(reverse('admin:users_user_change', args=[pk]))

        with transaction.atomic():
            UserBookPurchase.objects.create(user=user, book=book)
            AdminAuditLog.objects.create(
                staff=request.user,
                target_user=user,
                action_category='CONTENT_GRANT',
                action_detail=f'Admin kích hoạt sách "{book.title}" cho "{user}"',
                change_log={'book_id': str(book.public_id), 'book_title': book.title},
                ip_address=self._get_client_ip(request),
            )
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='Sách đã được kích hoạt',
                    body=f'Sách "{book.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 📖',
                    notification_type='PURCHASE',
                    related_object_type='book',
                    related_object_id=str(book.public_id),
                )
            except Exception:
                pass

        self.message_user(request, f'✅ Đã kích hoạt sách "{book.title}" cho {user}.')
        return redirect(reverse('admin:users_user_change', args=[pk]))

    def grant_video_view(self, request, pk):
        from videos.models import VideoCourse

        user = get_object_or_404(User, pk=pk)

        if request.method != 'POST':
            return redirect(reverse('admin:users_user_change', args=[pk]))

        video_id = request.POST.get('video_id')
        if not video_id:
            self.message_user(request, 'Vui lòng nhập ID khoá học.', level='error')
            return redirect(reverse('admin:users_user_change', args=[pk]))

        try:
            video = VideoCourse.objects.get(pk=video_id)
        except VideoCourse.DoesNotExist:
            self.message_user(request, 'Không tìm thấy khoá học.', level='error')
            return redirect(reverse('admin:users_user_change', args=[pk]))

        if UserVideoPurchase.objects.filter(user=user, video=video).exists():
            self.message_user(request, f'Người dùng "{user}" đã sở hữu khoá học "{video.title}".', level='error')
            return redirect(reverse('admin:users_user_change', args=[pk]))

        with transaction.atomic():
            UserVideoPurchase.objects.create(user=user, video=video)
            AdminAuditLog.objects.create(
                staff=request.user,
                target_user=user,
                action_category='CONTENT_GRANT',
                action_detail=f'Admin kích hoạt khoá học "{video.title}" cho "{user}"',
                change_log={'video_id': str(video.public_id), 'video_title': video.title},
                ip_address=self._get_client_ip(request),
            )
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='Khoá học đã được kích hoạt',
                    body=f'Khoá học "{video.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 🎬',
                    notification_type='PURCHASE',
                    related_object_type='videocourse',
                    related_object_id=str(video.public_id),
                )
            except Exception:
                pass

        self.message_user(request, f'✅ Đã kích hoạt khoá học "{video.title}" cho {user}.')
        return redirect(reverse('admin:users_user_change', args=[pk]))

    def has_delete_permission(self, request, obj=None):
        if obj is None:
            return super().has_delete_permission(request)
        if obj.book_purchases.exists():
            return False
        if obj.video_purchases.exists():
            return False
        try:
            if obj.wallet.balance > 0:
                return False
        except Exception:
            pass
        return super().has_delete_permission(request)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        pk = int(object_id)
        extra_context['grant_book_url'] = reverse('admin:users_user_grant_book', args=[pk])
        extra_context['grant_video_url'] = reverse('admin:users_user_grant_video', args=[pk])
        from users.admin_progress import get_user_video_summary, get_user_book_summary
        extra_context['video_progress'] = get_user_video_summary(pk)
        extra_context['book_progress'] = get_user_book_summary(pk)
        return super().change_view(request, object_id, form_url, extra_context)

    @staticmethod
    def _get_client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ('device_name', 'user', 'geo_city', 'is_primary_bound', 'status', 'last_active')
    list_filter = ('device_type', 'is_primary_bound', 'status')
    search_fields = ('device_id', 'device_name', 'user__username', 'user__phone_number')
    readonly_fields = ('device_id', 'last_ip', 'user_agent', 'last_active', 'geo_city', 'geo_region', 'geo_country_code', 'geo_fetched_at')
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


@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'expires_at', 'attempts', 'is_used', 'created_at')
    list_filter = ('is_used',)
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('user', 'otp_hash', 'expires_at', 'attempts', 'is_used', 'created_at', 'updated_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


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
