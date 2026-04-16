# Technical Solution: Change Password (User Profile)

## Tóm tắt

Cho phép user đã đăng nhập đổi mật khẩu ngay trong màn hình Profile, bằng cách cung cấp mật khẩu hiện tại và mật khẩu mới. Backend thêm endpoint `POST /api/users/me/change-password/` (IsAuthenticated), tái sử dụng `validate_password()` từ `ConfirmResetSerializer` hiện có. Frontend thêm section "Đổi mật khẩu" trong `ProfileView.vue`.

---

## Phân tích

- **Yêu cầu:** User đã đăng nhập muốn đổi password từ màn profile, không cần OTP (đã chứng minh danh tính qua JWT + mật khẩu hiện tại).
- **Khác với Forgot Password flow:** Flow quên mật khẩu (`/api/auth/password-reset/*`) dành cho user chưa đăng nhập, cần OTP. Tính năng này dành cho user đã đăng nhập, chứng minh quyền sở hữu qua `current_password`.
- **Các tầng liên quan:** Backend (Django) + Frontend (Vue). Không cần DB migration.

---

## Đề xuất giải pháp

### Database (PostgreSQL)

Không cần thay đổi schema. `User` model có sẵn `password` field từ Django `AbstractUser`.

---

### Backend (Django)

#### Serializer — `src/backend/users/serializers/user.py`

Thêm `ChangePasswordSerializer`:

```python
from rest_framework import serializers

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {"confirm_password": "Mật khẩu xác nhận không khớp."}
            )
        # validate_password() is intentionally NOT called here — it requires the user
        # object for UserAttributeSimilarityValidator (checks against email/name).
        # Validation is done in the view after the user object is resolved.
        return data
```

#### View — `src/backend/users/views/profile.py`

Thêm `ChangePasswordView`:

```python
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class ChangePasswordView(views.APIView):
    """POST /api/users/me/change-password/ — Change password for authenticated user."""
    permission_classes = (IsAuthenticated,)
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.check_password(serializer.validated_data['current_password']):
            return Response(
                {'current_password': 'Mật khẩu hiện tại không đúng.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_password = serializer.validated_data['new_password']

        # validate_password() is called here (not in serializer) so user object is
        # available for UserAttributeSimilarityValidator (checks against email/name).
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response({'new_password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])

        logger.info("change_password_success: user_id=%s email=%s", user.pk, user.email)
        return Response({'message': 'Đổi mật khẩu thành công.'})
```

**Lưu ý về session sau khi đổi mật khẩu:** Django `set_password()` không tự invalidate JWT tokens. Sau khi đổi mật khẩu, các JWT cũ vẫn còn hiệu lực đến khi hết hạn. Đây là đánh đổi được chấp nhận cho MVP — user vẫn đang đăng nhập nên không cần re-login ngay. Nếu muốn bảo mật cao hơn (post-MVP), có thể thêm bước blacklist tất cả outstanding tokens.

**Throttle:** Dùng lại `LoginRateThrottle` đã có sẵn — ngăn brute-force `current_password` từ kẻ tấn công có JWT hợp lệ. Import từ `..throttles`.

#### URL — `src/backend/users/urls.py`

```python
path('me/change-password/', ChangePasswordView.as_view(), name='user_change_password'),
```

#### API Contract

```
POST /api/users/me/change-password/
Authorization: Bearer <access_token>

Request body:
{
  "current_password": "string",
  "new_password": "string",
  "confirm_password": "string"
}

Response 200:
{ "message": "Đổi mật khẩu thành công." }

Response 400 — current password wrong:
{ "current_password": "Mật khẩu hiện tại không đúng." }

Response 400 — confirm mismatch:
{ "confirm_password": "Mật khẩu xác nhận không khớp." }

Response 400 — Django password validators fail (too short, too common, similar to user attrs, etc.):
{ "new_password": ["This password is too short...", ...] }

Response 429 — throttle exceeded:
{ "detail": "Request was throttled." }
```

---

### Frontend (Vue.js)

#### `src/frontend/src/services/user.service.js`

Thêm method `changePassword`:

```js
changePassword(data) {
  return client.post('/users/me/change-password/', data)
},
```

#### `src/frontend/src/views/ProfileView.vue`

Thêm section "Đổi mật khẩu" bên dưới section chỉnh sửa tên. Dùng pattern tương tự name-edit hiện có (inline expand với `ref` toggle + `reactive` form).

**State:**
```js
const showPasswordForm = ref(false)
const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})
const passwordSaving = ref(false)
const passwordError = ref('')   // field-level or general error string
const passwordSuccess = ref(false)
```

**Logic:**
```js
function openPasswordForm() {
  Object.assign(passwordForm, { current_password: '', new_password: '', confirm_password: '' })
  passwordError.value = ''
  passwordSuccess.value = false
  showPasswordForm.value = true
}

function cancelPasswordForm() {
  showPasswordForm.value = false
}

async function savePassword() {
  passwordError.value = ''
  passwordSuccess.value = false

  // Client-side: confirm match guard (UX only — backend also validates)
  if (passwordForm.new_password !== passwordForm.confirm_password) {
    passwordError.value = 'Mật khẩu xác nhận không khớp.'
    return
  }

  passwordSaving.value = true
  try {
    await userService.changePassword({ ...passwordForm })
    showPasswordForm.value = false
    Object.assign(passwordForm, { current_password: '', new_password: '', confirm_password: '' })
    passwordSuccess.value = true
    setTimeout(() => { passwordSuccess.value = false }, 4000)
  } catch (err) {
    const data = err.response?.data
    if (data?.current_password) {
      passwordError.value = data.current_password
    } else if (data?.confirm_password) {
      passwordError.value = data.confirm_password
    } else if (data?.new_password) {
      passwordError.value = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password
    } else {
      passwordError.value = 'Đổi mật khẩu thất bại. Vui lòng thử lại.'
    }
  } finally {
    passwordSaving.value = false
  }
}
```

**Template (section thêm vào `<template>`):**
```html
<!-- ── Change Password ─────────────────────────── -->
<div class="profile-section">
  <div class="section-header">
    <span class="section-title">Bảo mật</span>
    <button v-if="!showPasswordForm" class="btn-text" @click="openPasswordForm">
      Đổi mật khẩu
    </button>
  </div>

  <div v-if="showPasswordForm" class="password-form">
    <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
    <div class="form-field">
      <label>Mật khẩu hiện tại</label>
      <input v-model="passwordForm.current_password" type="password" autocomplete="current-password" />
    </div>
    <div class="form-field">
      <label>Mật khẩu mới</label>
      <input v-model="passwordForm.new_password" type="password" autocomplete="new-password" />
    </div>
    <div class="form-field">
      <label>Xác nhận mật khẩu mới</label>
      <input v-model="passwordForm.confirm_password" type="password" autocomplete="new-password" />
    </div>
    <div class="form-actions">
      <button class="btn-secondary" @click="cancelPasswordForm">Hủy</button>
      <button class="btn-primary" :disabled="passwordSaving" @click="savePassword">
        {{ passwordSaving ? 'Đang lưu...' : 'Xác nhận' }}
      </button>
    </div>
  </div>

  <p v-if="passwordSuccess" class="form-success">Đổi mật khẩu thành công!</p>
</div>
```

> Dùng lại các class CSS `.profile-section`, `.section-header`, `.section-title`, `.form-field`, `.form-error`, `.btn-primary`, `.btn-secondary`, `.btn-text` đã có sẵn trong `ProfileView.vue`. Class `.form-success` **chưa tồn tại** — cần thêm CSS rule mới vào `ProfileView.vue` (màu xanh lá, tương tự `.form-error` nhưng success color).

---

## Trade-off & lưu ý

| Vấn đề | Quyết định |
|--------|------------|
| JWT tokens sau đổi mật khẩu | Giữ nguyên — user đang ở session hiện tại, không force logout. Post-MVP có thể blacklist nếu cần. |
| Password validation rules | `validate_password(new_password, user=user)` gọi trong **view** (không phải serializer) để `UserAttributeSimilarityValidator` có đủ context user object. |
| `current_password` check | Server-side `user.check_password()` — tránh user khác (nếu token bị lộ) đổi mật khẩu mà không biết mật khẩu hiện tại. |
| Brute-force protection | `LoginRateThrottle` tái sử dụng từ `users/throttles.py` — ngăn thử nhiều `current_password` liên tiếp. |
| Success UX | Flash message tự dismiss sau 4 giây — user vẫn ở profile sau khi đổi xong. |

**Edge cases:**
- User đổi sang cùng mật khẩu cũ: Django `validate_password()` không chặn, nhưng không gây hại.
- Network error: `passwordError` hiển thị fallback message.
- Concurrent requests: không có race condition vì `set_password()` là atomic write.

---

## Bước tiếp theo

### Backend
1. Thêm `ChangePasswordSerializer` vào `src/backend/users/serializers/user.py`
2. Thêm `ChangePasswordView` vào `src/backend/users/views/profile.py` (import `LoginRateThrottle` từ `..throttles`, import `validate_password` + `DjangoValidationError`)
3. Đăng ký URL `me/change-password/` trong `src/backend/users/urls.py`
4. Export `ChangePasswordView` từ `src/backend/users/views/__init__.py` (nếu cần)

### Frontend
5. Thêm `changePassword()` vào `src/frontend/src/services/user.service.js`
6. Thêm state + logic + template section vào `src/frontend/src/views/ProfileView.vue`
7. Thêm CSS rule `.form-success` vào `<style>` của `ProfileView.vue`
