from django import forms
from django.contrib import admin, messages
from django.contrib.admin.widgets import AutocompleteSelect
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminUserCreationForm as DjangoAdminUserCreationForm, UserChangeForm as DjangoUserChangeForm
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
from .models import AdminAuditLog, MobileDevice, PasswordResetOTP, User, UserDevice
from .services.mobile_slot import (
    AUTO_ISSUED_REASON, SlotError, issue_slot, issued_reason_suggestions, refresh_slot,
)
from .services.tokens import blacklist_tokens_for_devices
from .utils import get_client_ip as _get_client_ip
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


class MobileDeviceInline(admin.TabularInline):
    """The user's device slots, visible without leaving the user page."""
    model = MobileDevice
    fk_name = 'user'
    extra = 0
    can_delete = False
    fields = ('client_code', 'status', 'device_name', 'device_type',
              'os_version', 'expires_at', 'last_active')
    readonly_fields = fields
    ordering = ('-last_active',)

    def has_add_permission(self, request, obj=None):
        # Slots are only created through the action, so the quota check always runs.
        return False


class IssueSlotMixin:
    """
    Shared admin action: allocate a device slot and show its pairing code.

    The code is delivered out of band (Zalo / phone), so the message has to carry
    it in a form the admin can copy in one go.
    """

    @admin.action(description='Cấp slot thiết bị mới')
    def issue_slot(self, request, queryset):
        for user in self._target_users(queryset):
            try:
                slot = issue_slot(
                    user,
                    staff=request.user,
                    reason=f'Issued from {self.model._meta.verbose_name} admin',
                )
            except SlotError as exc:
                self.message_user(request, f'{user.email}: {exc}', level=messages.ERROR)
                continue

            self._log_issue(request, slot)
            self.message_user(request, self._slot_message(slot))

    @staticmethod
    def _log_issue(request, slot):
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=slot.user,
            action_category='MOBILE_SLOT',
            action_detail=f'Issued slot {slot.client_code}',
            change_log={'before': {}, 'after': {'client_code': slot.client_code,
                                                'expires_at': slot.expires_at.isoformat()}},
            ip_address=_get_client_ip(request),
        )

    @staticmethod
    def _slot_message(slot):
        return format_html(
            '{} → slot <strong>{}</strong>, mã <code style="user-select:all">{}</code> '
            '(hết hạn {})',
            slot.user.email, slot.client_code, slot.pairing_code,
            slot.expires_at.strftime('%d/%m/%Y'),
        )

    @staticmethod
    def _target_users(queryset):
        raise NotImplementedError


class MobileDeviceIssueForm(forms.Form):
    """
    Add form for MobileDeviceAdmin.

    A plain Form, not a ModelForm: the row is created by issue_slot(), which
    fills client_code, pairing_code and expires_at itself. Nothing the admin
    types maps onto a column except issued_reason.
    """

    # Widget built here, not in __init__: ModelChoiceField wires widget.choices
    # to the field at construction time, and a widget swapped in afterwards keeps
    # a plain list that AutocompleteSelect.optgroups() cannot read.
    user = forms.ModelChoiceField(
        queryset=User.objects.order_by('email'),
        label='Người dùng',
        widget=AutocompleteSelect(MobileDevice._meta.get_field('user'), admin.site),
    )
    issued_reason = forms.CharField(
        label='Lý do cấp', max_length=255, required=False,
        help_text='Chọn một gợi ý hoặc tự gõ. Ghi rõ giúp tra lại lịch sử cấp slot sau này.',
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # A datalist, not a select: the field is an audit note, so an unforeseen
        # reason must still be typeable. The list only saves keystrokes and keeps
        # repeat wording identical.
        self.reason_suggestions = issued_reason_suggestions()
        self.fields['issued_reason'].widget.attrs.update({
            'list': self._REASON_LIST_ID,
            'autocomplete': 'off',
            'placeholder': 'Ví dụ: User đổi máy mới',
        })

    _REASON_LIST_ID = 'issued-reason-options'

    def clean_user(self):
        """
        Pre-check the quota so a full user gets a form error instead of a 500.

        NOT authoritative — issue_slot() re-counts under a row lock. This only
        buys a readable message in the common, uncontended case.
        """
        user = self.cleaned_data['user']
        taken = user.mobile_devices.filter(status__in=MobileDevice.OCCUPYING).count()
        if taken >= user.mobile_max_devices:
            raise forms.ValidationError(
                f'{user.email} đã dùng hết {user.mobile_max_devices} thiết bị cho phép. '
                f'Nếu user đổi máy: làm mới hoặc gỡ liên kết slot cũ. '
                f'Nếu user được phép dùng thêm máy: nâng "mobile_max_devices" ở trang User.'
            )
        return user


@admin.register(MobileDevice)
class MobileDeviceAdmin(IssueSlotMixin, admin.ModelAdmin):
    list_display = ('client_code', 'pairing_code_display', 'user_email', 'status',
                    'device_name', 'os_version', 'app_version', 'geo_city',
                    'expires_at', 'last_active')
    # app_version is filterable so staff can answer "who is still on the old
    # build" before raising the update threshold (feature-36 §6.4).
    list_filter = ('status', 'device_type', 'app_version', 'geo_country_code')
    search_fields = ('client_code', 'pairing_code', 'device_id', 'hardware_hash',
                     'device_model', 'user__email', 'user__username')
    readonly_fields = ('user', 'client_code', 'pairing_code', 'device_id', 'hardware_hash',
                       'device_type', 'device_name', 'device_model', 'os_version',
                       'app_version', 'last_ip', 'geo_city', 'geo_region',
                       'geo_country_code', 'geo_fetched_at', 'issued_by', 'issued_reason',
                       'expires_at', 'claimed_at', 'claim_ip', 'claim_attempts',
                       'bound_at', 'revoked_at', 'revoked_reason', 'last_active')
    ordering = ('-last_active',)
    autocomplete_fields = ['user']
    actions = ['issue_slot', 'refresh_slots', 'revoke_slots']
    change_form_template = 'admin/users/mobiledevice/change_form.html'

    def has_delete_permission(self, request, obj=None):
        # Revoking preserves the audit trail; deleting destroys it.
        return False

    def get_queryset(self, request):
        # ModelAdmin has no `request` attribute; pairing_code_display needs one to
        # check the permission, and this is the earliest per-request hook.
        self.request = request
        return super().get_queryset(request).select_related('user', 'issued_by')

    @admin.display(description='User', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description='Mã ghép cặp')
    def pairing_code_display(self, obj):
        # Only a live code is worth reading, and only to staff cleared for it.
        # A claimed slot's code is spent, so showing it would only leak.
        request = getattr(self, 'request', None)
        if (obj.status == 'UNCLAIMED' and request
                and request.user.has_perm('users.view_activation_key_secret')):
            return format_html('<code style="user-select:all">{}</code>', obj.pairing_code)
        # First group shown, second masked (feature-38 §4.1). A pre-existing
        # 12-char code still outstanding right after deploy slices oddly here
        # (mid-group) — cosmetic only, and gone once that slot expires.
        return f'{obj.pairing_code[:6]}-***'

    def get_urls(self):
        custom = [
            path(
                '<int:pk>/refresh-slot/',
                self.admin_site.admin_view(self.refresh_slot_view),
                name='users_mobiledevice_refresh_slot',
            ),
        ]
        return custom + super().get_urls()

    def refresh_slot_view(self, request, pk):
        """POST-only counterpart of the refresh_slots action, for a single slot."""
        if not self.has_change_permission(request):
            raise PermissionDenied

        change_url = reverse('admin:users_mobiledevice_change', args=[pk])
        if request.method != 'POST':
            return redirect(change_url)

        self._refresh_one(request, get_object_or_404(MobileDevice, pk=pk))
        return redirect(change_url)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        slot = self.get_object(request, object_id)
        # Only an occupying slot can be refreshed; offering the button on a dead
        # one would just bounce off the guard in refresh_slot().
        if slot is not None and slot.status in MobileDevice.OCCUPYING:
            extra_context['refresh_slot_url'] = reverse(
                'admin:users_mobiledevice_refresh_slot', args=[slot.pk],
            )
            extra_context['refresh_slot_is_active'] = slot.status == 'ACTIVE'
        return super().change_view(request, object_id, form_url, extra_context)

    def add_view(self, request, form_url='', extra_context=None):
        """
        Replace the ModelAdmin add form: allocating a slot is a service call, not
        a row edit (feature-35 §6.3).

        Routing add through issue_slot() is what lets has_add_permission stay at
        the Django default: the locked quota count and the code generation still
        run, so a slot is never created by a plain form save.
        """
        if not self.has_add_permission(request):
            raise PermissionDenied

        form = MobileDeviceIssueForm(request.POST or None)
        if request.method == 'POST' and form.is_valid():
            try:
                slot = issue_slot(
                    form.cleaned_data['user'],
                    staff=request.user,
                    reason=form.cleaned_data['issued_reason'] or AUTO_ISSUED_REASON,
                )
            except SlotError as exc:
                # Lost the race with a concurrent issue: clean_user() passed but
                # the locked re-count inside issue_slot() did not.
                form.add_error('user', str(exc))
            else:
                self._log_issue(request, slot)
                self.message_user(request, self._slot_message(slot))
                return redirect(reverse('admin:users_mobiledevice_changelist'))

        context = {
            **self.admin_site.each_context(request),
            'title': 'Cấp slot thiết bị mới',
            'form': form,
            'reason_list_id': MobileDeviceIssueForm._REASON_LIST_ID,
            'reason_suggestions': form.reason_suggestions,
            'opts': self.model._meta,
        }
        return TemplateResponse(request, 'admin/users/mobiledevice/issue_slot.html', context)

    @staticmethod
    def _target_users(queryset):
        seen = {}
        for slot in queryset.select_related('user'):
            seen.setdefault(slot.user.pk, slot.user)
        return seen.values()

    @admin.action(description='Làm mới thiết bị (giữ slot, cấp mã mới)')
    def refresh_slots(self, request, queryset):
        """
        Release the handset but keep the slot, so a device change costs neither a
        new row nor a new client_code.

        The new code goes out of band like issue_slot's, so the message has to
        carry it in a form the admin can copy in one go.
        """
        for slot in queryset.select_related('user'):
            self._refresh_one(request, slot)

    def _refresh_one(self, request, slot) -> bool:
        """Refresh one slot, then log it and report the new code. Shared by the
        bulk action and the button on the change form."""
        try:
            before = refresh_slot(slot)
        except SlotError as exc:
            self.message_user(request, f'{slot.client_code}: {exc}', level=messages.ERROR)
            return False

        slot.refresh_from_db()
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=slot.user,
            action_category='DEVICE_RESET',
            action_detail=f'Admin refreshed mobile slot {slot.client_code}',
            change_log={'before': before,
                        'after': {'status': slot.status,
                                  'pairing_code': slot.pairing_code,
                                  'expires_at': slot.expires_at.isoformat()}},
            ip_address=_get_client_ip(request),
        )
        self.message_user(
            request,
            format_html(
                '{} → slot <strong>{}</strong> đã làm mới, mã mới '
                '<code style="user-select:all">{}</code> (hết hạn {}). '
                'Máy cũ đã bị đăng xuất.',
                slot.user.email, slot.client_code, slot.pairing_code,
                slot.expires_at.strftime('%d/%m/%Y'),
            ),
        )
        return True

    @admin.action(description='Gỡ liên kết / huỷ slot')
    def revoke_slots(self, request, queryset):
        """
        Release a slot so a new one can be issued.

        ACTIVE slots are revoked and their tokens blacklisted so the app signs out
        immediately; UNCLAIMED slots simply expire, burning a code nobody used.
        """
        count = 0
        for slot in queryset.filter(status__in=MobileDevice.OCCUPYING).select_related('user'):
            with transaction.atomic():
                if slot.status == 'ACTIVE':
                    slot.status = 'REVOKED'
                    slot.revoked_at = timezone.now()
                    slot.revoked_reason = 'ADMIN_UNBIND'
                    blacklist_tokens_for_devices(slot.user, [slot.device_id])
                    action_detail = f'Admin un-linked mobile slot {slot.client_code}'
                else:
                    slot.status = 'EXPIRED'
                    action_detail = f'Admin cancelled unclaimed slot {slot.client_code}'
                slot.save(update_fields=['status', 'revoked_at', 'revoked_reason'])

                AdminAuditLog.objects.create(
                    staff=request.user,
                    target_user=slot.user,
                    action_category='DEVICE_RESET',
                    action_detail=action_detail,
                    change_log={'before': {'client_code': slot.client_code},
                                'after': {'status': slot.status}},
                    ip_address=_get_client_ip(request),
                )
            count += 1
        self.message_user(request, f'Đã giải phóng {count} slot. Có thể cấp slot mới ngay.')


@admin.register(User)
class UserAdmin(IssueSlotMixin, BaseUserAdmin):
    form = AdminUserChangeForm
    add_form = AdminUserCreationForm
    list_display = ('id', 'username', 'email', 'user_type', 'is_active', 'is_device_locked', 'last_login', 'created_at')
    list_filter = (PendingApprovalFilter, 'user_type', 'is_active', 'groups')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone_number', 'public_id')
    ordering = ('-created_at',)
    inlines = [OwnedBookInline, OwnedVideoInline, MobileDeviceInline]
    change_form_template = 'admin/users/user/change_form.html'
    actions = None

    actions = ['issue_slot']

    @staticmethod
    def _target_users(queryset):
        return queryset

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
    list_display = ('device_name', 'user', 'geo_city', 'status', 'last_active')
    list_filter = ('device_type', 'status')
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
