# Feature 41 — Admin UX: Default Mobile Quota, In-tab Device Issue, Simplified User Creation

## Tổng quan

4 cải tiến UX cho luồng tạo user + cấp thiết bị mobile trên Django Admin, gộp thành 1 feature vì cùng chạm `users/admin.py` và cùng mục tiêu "giảm thao tác thủ công khi onboard user mới":

1. User mới có `mobile_max_devices = 3` (không đổi field `default=`, không migration — gán trong `User.save()` khi tạo mới).
2. Cho phép cấp (issue) mobile device slot trực tiếp từ tab "Mobile Devices" trên trang `User` detail (`admin/users/user/<pk>/change/`), không cần rời sang `MobileDeviceAdmin` add form riêng.
3. Ẩn field `username` khỏi UI form tạo user (add form) bằng `HiddenInput` — chỉ còn `email` hiển thị, backend tự đồng bộ `username = email` (JS đồng bộ khi gõ + `clean_username()` ép lại ở server).
4. Ẩn field "Password-based authentication" (Django's `usable_password` radio) khỏi UI bằng `HiddenInput` với giá trị cố định `'true'` — luôn force `Enabled` ngầm, không đổi code path validate của Django. Thêm 1 checkbox "Tạo mobile device luôn" trên add form — khi tick, sau khi tạo user xong sẽ tự `issue_slot()` cho user đó.

## Phạm vi

- Backend only — Django Admin UI + model (`src/backend/users/admin.py`, `src/backend/users/models/user.py`, template `admin/users/user/change_form.html`)
- **Không có migration** — quota 3 áp dụng qua `User.save()` override, field schema (`default=1`) giữ nguyên; user cũ không bị ảnh hưởng vì `save()` chỉ set giá trị khi tạo mới (`self.pk is None`)
- Không đổi API public, không đổi Vue/mobile app

## Hiện trạng

| Việc | Code liên quan | Hạn chế hiện tại |
|---|---|---|
| Default quota | `User.mobile_max_devices = PositiveSmallIntegerField(default=1)` (`users/models/user.py:41`) | Mỗi user mới chỉ được 1 slot, admin phải sửa tay nếu muốn nhiều hơn |
| Tạo device trong tab | `MobileDeviceInline` (`users/admin.py:106-119`) — `has_add_permission` luôn `False` | Phải rời sang `/admin/users/mobiledevice/add/` (dùng `MobileDeviceIssueForm` + `issue_slot()`, `users/admin.py:172-223, 308-345`) để cấp slot cho 1 user |
| Tạo user | `AdminUserCreationForm` (`users/admin.py:24-40`), `add_fieldsets` (`users/admin.py:452-457`: `username, email, usable_password, password1, password2`) | Admin phải gõ email 2 lần (username + email), phải để ý radio "Password-based authentication" (Django 5.2 built-in field, luôn cần Enabled, không bao giờ dùng Disabled trong hệ thống này) |
| Tạo device khi tạo user | Không có | Muốn cấp device ngay phải tạo user xong, qua lại `MobileDeviceAdmin` cấp riêng |

`issue_slot(user, staff, reason)` (`users/services/mobile_slot.py:149-173`) là service dùng chung, đã có sẵn quota check + pairing code generation — tái dùng nguyên vẹn cho cả 2 entry point mới.

## Thiết kế giải pháp

### 1. Default quota = 3 — không migration, set trong `save()`

Theo yêu cầu: **không đổi `default=` trên field** (giữ nguyên `default=1`, không có migration `AlterField`) — thay vào đó, override `Model.save()` để gán `mobile_max_devices = 3` khi tạo user mới (`self.pk is None`, tức record chưa từng ghi DB), trước khi gọi `super().save()`:

```python
# users/models/user.py

DEFAULT_MOBILE_MAX_DEVICES = 3

class User(AbstractUser, BaseModel):
    ...
    mobile_max_devices = models.PositiveSmallIntegerField(default=1)  # giữ nguyên — không đổi
    ...

    def save(self, *args, **kwargs):
        if self._state.adding:
            self.mobile_max_devices = DEFAULT_MOBILE_MAX_DEVICES
        super().save(*args, **kwargs)
```

Dùng `self._state.adding` (cờ Django dành riêng cho việc này, chỉ chuyển `False` bên trong `save_base()` — tức **sau** khi đoạn code trên chạy xong, đã verify qua Django source `django/db/models/base.py:1019`), gán **thẳng, không điều kiện `or`**.

Bản đầu (`self.mobile_max_devices or DEFAULT_MOBILE_MAX_DEVICES`) có bug: `mobile_max_devices` **không** nằm trong `add_fieldsets` (chỉ có trong `fieldsets` dùng cho change form — xem `users/admin.py:461`), nên khi tạo user mới qua admin, giá trị field luôn là `default=1` (không phải giá trị "chưa nhập"). Vì `1` là truthy trong Python, `1 or 3` luôn ra `1` — quota **không bao giờ** được set thành 3. Sửa bằng cách bỏ hẳn `or`, gán thẳng `DEFAULT_MOBILE_MAX_DEVICES` khi là record mới — an toàn vì admin không có cách nào nhập giá trị khác cho field này lúc tạo mới (không có trong add form).

Không cần điều kiện `mobile_max_devices == 1` để "tôn trọng giá trị admin đã nhập" như bản đầu lo ngại, vì không có form nào cho phép nhập giá trị đó lúc tạo mới.

**Áp dụng cho mọi đường tạo User** (đã verify chỉ có 2 nơi trong codebase, cả 2 đều cuối cùng gọi `Model.save()`):
- Admin add form → `ModelForm.save()` → `instance.save()`
- Mobile self-register (`users/serializers/auth.py:46`, `User.objects.create_user(...)`) → `create_user()` nội bộ gọi `user.save()`

Không cần migration nào — field schema (`default=1` trong DB/migration lịch sử) giữ nguyên, hành vi "3 cho user mới" hoàn toàn nằm ở tầng Python, không phải DB-level default.

### 2. Cấp device trong tab "Mobile Devices"

Thêm 1 view + form nhỏ ngay dưới `MobileDeviceInline` trên trang `User` detail, tái dùng nguyên `issue_slot()` + `ISSUED_REASON_PRESETS`/`issued_reason_suggestions()` đã có — không tạo lại logic quota/pairing code.

```python
# users/admin.py — UserAdmin

def get_urls(self):
    urls = super().get_urls()
    custom = [
        path('<int:pk>/issue-slot/',
             self.admin_site.admin_view(self.issue_slot_view),
             name='users_user_issue_slot'),
    ]
    return custom + urls

def issue_slot_view(self, request, pk):
    user = get_object_or_404(User, pk=pk)
    if request.method != 'POST':
        return redirect(reverse('admin:users_user_change', args=[pk]))

    reason = request.POST.get('issued_reason') or AUTO_ISSUED_REASON
    try:
        slot = issue_slot(user, staff=request.user, reason=reason)
    except SlotError as exc:
        self.message_user(request, str(exc), level='error')
    else:
        self._log_issue(request, slot)
        self.message_user(request, self._slot_message(slot))
    return redirect(reverse('admin:users_user_change', args=[pk]) + '#mobiledevice_set-group')
```

`change_view` truyền thêm context:
```python
extra_context['issue_slot_url'] = reverse('admin:users_user_issue_slot', args=[pk])
extra_context['issue_slot_reason_suggestions'] = issued_reason_suggestions()
```

Template `admin/users/user/change_form.html` — thêm panel ngay sau `mobiledevice_set-group` (theo đúng pattern `moveGrantPanel` đã dùng cho book/video grant panel):

```html
{% if issue_slot_url %}
<div id="issue-slot-panel" style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
  <h3 style="margin-top: 0">Cấp thiết bị mobile mới</h3>
  <form method="post" action="{{ issue_slot_url }}">
    {% csrf_token %}
    <label for="issue_slot_reason">Lý do cấp:</label>
    <input type="text" name="issued_reason" id="issue_slot_reason" list="issue-slot-reason-options"
           placeholder="Ví dụ: User đổi máy mới" autocomplete="off" style="margin: 0 8px; padding: 4px 8px; min-width:260px;">
    <datalist id="issue-slot-reason-options">
      {% for r in issue_slot_reason_suggestions %}<option value="{{ r }}">{% endfor %}
    </datalist>
    <button type="submit" class="button default">Cấp thiết bị</button>
  </form>
</div>
<script>/* move panel next to mobiledevice_set-group, same pattern as grant-access-panel */</script>
{% endif %}
```

**Quota vẫn do `issue_slot()` enforce** — nếu user đã đủ `mobile_max_devices`, `SlotError` hiện message lỗi rõ ràng, không tạo slot thừa.

### 3. Ẩn field `username` khỏi UI (giữ field, không xoá khỏi form)

Theo yêu cầu: field vẫn tồn tại trong `self.fields` (không `del`) để không đụng tới hành vi validate/save mặc định của `ModelForm`/base class — chỉ đổi `widget` thành `HiddenInput` và tự điền giá trị ngầm, giữ nguyên logic Django xử lý field này.

Đã verify: `username` khai báo qua `BaseUserCreationForm.Meta.fields = ("username",)`, dùng `UsernameField` (subclass `CharField`, required). Vì vẫn `required=True`, hidden input phải luôn có giá trị hợp lệ trước khi submit — cần JS đồng bộ từ ô `email` sang, do giá trị `username` chỉ xác định được sau khi admin gõ email (không có `initial` tĩnh nào đúng trước đó):

```python
# users/admin.py

class AdminUserCreationForm(DjangoAdminUserCreationForm):
    class Meta(DjangoAdminUserCreationForm.Meta):
        model = User
        fields = ('username', 'email')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].required = True
        self.fields['username'].widget = forms.HiddenInput()
        self.fields['username'].label = ''  # không còn hiển thị, label thừa

    def clean_username(self):
        # Hidden input được JS đồng bộ = email trước submit; fallback ở server
        # phòng khi JS bị chặn/không chạy, để username luôn khớp email.
        return self.cleaned_data.get('email', '').lower()

    def clean_email(self):
        return self.cleaned_data.get('email', '').lower()
```

JS đồng bộ giá trị khi gõ email — load qua `UserAdmin.Media` (chưa có sẵn, theo đúng tiền lệ `VideoCourseAdmin.Media.js = ('videos/js/auto_slug_course.js',)` đã dùng trong dự án, không đặt logic JS trực tiếp trong template):

```python
# users/admin.py — UserAdmin
class Media:
    js = ('users/js/sync_username_email.js',)
```

`src/backend/users/static/users/js/sync_username_email.js`:
```javascript
document.addEventListener('DOMContentLoaded', function () {
  var emailInput = document.getElementById('id_email');
  var usernameHidden = document.getElementById('id_username');
  if (emailInput && usernameHidden) {
    emailInput.addEventListener('input', function () {
      usernameHidden.value = emailInput.value;
    });
  }
});
```

File này chỉ tác dụng khi `id_email`/`id_username` tồn tại trên trang (add form) — vô hại trên change form vì `id_username` ở đó không phải hidden input (form khác: `AdminUserChangeForm`), `getElementById` không match nên `if` false, không chạy gì.

`clean_username()` ở server là **nguồn an toàn thật sự** (luôn ép `= email`, bất kể JS có chạy hay không) — JS chỉ giúp UI mượt hơn (nếu có hiển thị lỗi thì đỡ lệch), không phải cơ chế bảo vệ chính.

```python
add_fieldsets = (
    (None, {
        'classes': ('wide',),
        'fields': ('username', 'email', 'password1', 'password2', 'issue_slot_on_create'),
    }),
)
```
(`username` vẫn cần khai báo trong `add_fieldsets` để field render — dù `HiddenInput` nên trên UI không thấy gì.)

### 4. Ẩn "Password-based authentication" khỏi UI + thêm checkbox "Tạo mobile device luôn"

Tương tự — giữ field `usable_password` trong `self.fields` (không `del`), chỉ đổi `widget` thành `HiddenInput` với giá trị cố định `'true'`. Vì field vẫn tồn tại trong `cleaned_data` bình thường (không cần dựa vào cơ chế `pop(..., None)` ngầm của `validate_passwords()`), đây là cách **tường minh hơn**: giá trị `'true'` luôn có mặt, `validate_passwords()` đọc đúng y như khi field hiển thị bình thường và admin chọn "Enabled" — không thay đổi code path nào của Django, chỉ ẩn UI.

```python
def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.fields['email'].required = True
    self.fields['username'].widget = forms.HiddenInput()
    self.fields['username'].label = ''
    self.fields['usable_password'].widget = forms.HiddenInput()
    self.fields['usable_password'].initial = 'true'
    self.fields['issue_slot_on_create'] = forms.BooleanField(
        required=False, initial=False, label='Tạo mobile device luôn',
        help_text='Cấp ngay 1 slot thiết bị mobile cho user này sau khi tạo (dùng lý do cấp mặc định).',
    )
```

Vì `HiddenInput` không hiển thị control cho admin sửa, và `initial` được set ở form, giá trị POST lên luôn là `'true'` trong điều kiện vận hành bình thường — không cần JS cho field này (khác `username`, giá trị `usable_password` không phụ thuộc input nào khác, cố định ngay từ đầu).

`save_model` trong `UserAdmin` (không phải trong form — cần `request.user` làm `staff` cho audit log):

```python
def save_model(self, request, obj, form, change):
    super().save_model(request, obj, form, change)
    ...  # existing is_active / is_review_account logic giữ nguyên
    if not change and form.cleaned_data.get('issue_slot_on_create'):
        try:
            slot = issue_slot(obj, staff=request.user, reason=AUTO_ISSUED_REASON)
        except SlotError as exc:
            self.message_user(request, f'Không cấp được thiết bị: {exc}', level='warning')
        else:
            self._log_issue(request, slot)
            self.message_user(request, self._slot_message(slot))
```

`not change` đảm bảo chỉ chạy khi **tạo mới** (add form), không chạy lại mỗi lần sửa user hiện có.

**UX khi `SlotError` xảy ra:** đã verify Django's `message_user()` (`django/contrib/admin/options.py:1276`) chỉ gọi `messages.add_message()` — mỗi lời gọi thêm 1 message **riêng biệt** vào queue, không ghi đè/che nhau. Vậy khi tạo user thành công nhưng `issue_slot()` thất bại, admin sẽ thấy **2 message xếp chồng**: message mặc định "The user … was added successfully" (từ `ModelAdmin.response_add()`) + message "Không cấp được thiết bị: …" (`level='warning'`) từ `save_model()` — cả 2 đều hiển thị, không mất thông tin nào.

## Trade-off & lưu ý

- **Không migration, set qua `save()`**: field `mobile_max_devices` giữ nguyên `default=1` ở schema — quota 3 chỉ áp dụng qua code path Python khi tạo user mới (`self.pk is None`). User cũ không bị ảnh hưởng (không có `RunPython`/backfill nào chạy). Nếu cần nâng quota đồng loạt cho user hiện có, đó là thao tác riêng (bulk update), **không nằm trong scope** feature này.
- **`username`/`usable_password` chỉ ẩn UI (`HiddenInput`), không `del` khỏi `self.fields`** — theo yêu cầu, để giữ nguyên mọi hành vi validate/save mặc định của Django (`ModelForm.save()`, `validate_passwords()`) không đổi code path nào, giảm rủi ro so với xoá hẳn field. Đánh đổi: `username` cần thêm 1 đoạn JS nhỏ đồng bộ giá trị từ `email` (vì là field `required`, không có giá trị tĩnh hợp lệ trước khi admin gõ email) — `clean_username()` ở server luôn ép lại `= email` nên JS chỉ là trợ giúp UX, không phải cơ chế bảo vệ chính. `usable_password` không cần JS vì giá trị `'true'` cố định ngay từ `initial`, không phụ thuộc input nào khác.
- **Xác nhận force Enabled đúng yêu cầu nghiệp vụ**: hệ thống chỉ dùng password-based auth (không SSO/LDAP) — theo ảnh chụp field help text gốc: "may still be able to authenticate using other backends" không áp dụng cho hệ thống này.
- **Checkbox "Tạo mobile device luôn" dùng chung `AUTO_ISSUED_REASON`** (không hỏi lý do riêng) để giữ add-user form gọn — nếu cần lý do cụ thể, admin luôn có thể vào tab Mobile Devices cấp thêm slot với lý do tùy chỉnh sau.
- **`issue_slot()` khi tạo user là best-effort, không rollback user nếu thất bại**: `save_model()` gọi `super().save_model()` (user đã được ghi DB) trước khi thử `issue_slot()` — nếu `SlotError` xảy ra (về lý thuyết gần như không thể vì `mobile_max_devices` mặc định 3, user mới `taken=0`), user vẫn được tạo thành công, chỉ hiện `message_user(level='warning')` báo không cấp được device. Đây là hành vi có chủ đích: tạo user là hành động chính, cấp device chỉ là tiện ích phụ đi kèm.

## Files cần thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/users/models/user.py` | Thêm `User.save()` override: gán `mobile_max_devices = 3` khi `self.pk is None` (tạo mới); field `default=1` giữ nguyên, không migration |
| `src/backend/users/admin.py` | `AdminUserCreationForm`: ẩn `username`/`usable_password` bằng `HiddenInput` (không `del`), `clean_username()` ép `= email`, thêm field `issue_slot_on_create`; `add_fieldsets` cập nhật (giữ `username` trong list để field còn render, dù ẩn); `UserAdmin.save_model` gọi `issue_slot()` khi tick checkbox; thêm `issue_slot_view` + `get_urls` + `change_view` context cho tab Mobile Devices |
| `src/backend/users/static/users/js/sync_username_email.js` (mới) | JS đồng bộ `#id_username` (hidden) = giá trị `#id_email` khi gõ; load qua `UserAdmin.Media.js` |
| `src/backend/templates/admin/users/user/change_form.html` | Thêm panel "Cấp thiết bị mobile mới" dưới `mobiledevice_set-group`, theo đúng pattern `moveGrantPanel` đã dùng cho book/video |

## Không nằm trong scope

- Bulk update `mobile_max_devices` cho user hiện có
- Cho phép chọn `issued_reason` tùy chỉnh khi tick "Tạo mobile device luôn" trên add form (dùng cố định `AUTO_ISSUED_REASON`)
- Thay đổi hành vi `MobileDeviceAdmin` add form độc lập (`/admin/users/mobiledevice/add/`) — vẫn giữ nguyên, chỉ thêm entry point mới song song trong tab User
