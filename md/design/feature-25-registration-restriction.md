# Feature: Registration Restriction & Rate Limiting

**Date:** 2026-03-30
**Status:** Draft v2 (sau PO review)
**Scope:** Giới hạn đăng ký tài khoản mới cần admin phê duyệt, rate limiting chống brute-force, cải thiện UX màn hình chờ duyệt

---

## 1. Mục tiêu (Goals)

- **Giới hạn đăng ký:** Khi người dùng đăng ký tài khoản mới, tài khoản sẽ được tạo với trạng thái `is_active = False` — người dùng chưa thể đăng nhập ngay.
- **Admin kích hoạt thủ công:** Admin phải vào Django Admin và bật `is_active = True` để người dùng mới có thể đăng nhập.
- **Rate limiting:** Giới hạn số lần gọi API `register` và `login` theo IP để chống brute-force và spam đăng ký.

### Phạm vi ảnh hưởng với user hiện tại

> **Quan trọng:** Tất cả user đã tồn tại trong hệ thống **vẫn giữ nguyên `is_active=True`** — không cần data migration, không cần admin kích hoạt lại. Tính năng này **chỉ áp dụng cho user mới đăng ký sau khi feature được deploy.**

---

## 2. Phân tích hiện trạng (Current State Analysis)

### 2.1 Backend — Auth Flow

**File:** `src/backend/users/views/auth.py`

Hiện tại `RegisterView.create()` sau khi tạo user sẽ **lập tức** issue JWT token và trả về `access` + `refresh`:

```python
class RegisterView(generics.CreateAPIView):
    def create(self, request, *args, **kwargs):
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': ..., 'refresh': str(refresh), 'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
```

**Vấn đề:** User được coi là active ngay sau khi đăng ký — không có bước xét duyệt.

**File:** `src/backend/users/serializers/auth.py`

`RegisterSerializer.create()` gọi `User.objects.create_user(...)` — Django mặc định set `is_active=True` cho user mới.

`CustomLoginSerializer.validate()` đã có check `is_active`:
```python
if not user.is_active:
    raise serializers.ValidationError({"detail": "User account is disabled."})
```
→ Logic từ chối user inactive đã sẵn có, chỉ cần đảm bảo user mới được tạo với `is_active=False`.

### 2.2 User Model

**File:** `src/backend/users/models/user.py`

Model `User(AbstractUser, BaseModel)` kế thừa từ `AbstractUser` — đã có sẵn field `is_active` (bool, default=True từ Django). Không cần migration thêm field.

### 2.3 Admin Configuration

**File:** `src/backend/users/admin.py`

`UserAdmin(BaseUserAdmin)` đã dùng `BaseUserAdmin.fieldsets` làm base — bao gồm sẵn field `is_active` trong section "Permissions". Admin đã có thể toggle `is_active` qua form chi tiết, nhưng:

- **`list_display`** hiện tại không hiển thị `is_active` hay `created_at`.
- **`list_filter`** đã có `is_active` trong filter sidebar.
- Chưa có **list action** để kích hoạt hàng loạt.
- Chưa có **visual indicator** để admin dễ nhận diện user đang chờ duyệt.
- Chưa có audit log cho hành động activate/deactivate user.
- Chưa có override `save_model()` để log thay đổi `is_active` qua form chi tiết.

### 2.4 Rate Limiting

**File:** `src/backend/requirements.txt`

Các package hiện có:
- `djangorestframework` — có built-in throttling (`AnonRateThrottle`, `UserRateThrottle`, `ScopedRateThrottle`)
- Không có `django-ratelimit`, `django-axes`, hay bất kỳ package rate limiting nào khác.

**File:** `src/backend/config/settings.py`

`REST_FRAMEWORK` settings hiện tại:
```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("users.authentication.DeviceJWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}
```
→ Chưa cấu hình `DEFAULT_THROTTLE_CLASSES` hay `DEFAULT_THROTTLE_RATES`.

Redis đã có sẵn trong stack (dùng cho Celery và Django cache backend) — có thể dùng làm storage cho rate limiting.

### 2.5 Frontend — Register Flow

**File:** `src/frontend/src/views/RegisterView.vue`

Sau khi gọi `authService.register()` thành công, hiện tại code **ngay lập tức** lưu token và redirect về `/`:

```javascript
const { data } = await authService.register({ ... })
auth.setTokens({ access: data.access, refresh: data.refresh })
auth.setUser(data.user)
router.push('/')
```

→ Sẽ cần thay đổi để xử lý trường hợp server trả về "đăng ký thành công nhưng cần chờ duyệt" (không có token).

**File:** `src/frontend/src/services/auth.service.js`

`authService.register()` chỉ gọi POST và trả về raw response, không có xử lý gì đặc biệt.

### 2.6 Locale / i18n

**File:** `src/frontend/src/locales/vi.js`

Cần thêm key `auth.register.pendingApproval` (thông báo chờ duyệt) và key lỗi rate limit.

---

## 3. Giải pháp (Solution)

### 3.1 Backend Changes

#### A. Tạo user với `is_active=False` — KHÔNG tạo UserDevice khi đăng ký

**File:** `src/backend/users/serializers/auth.py` — `RegisterSerializer.create()`

**Quyết định thiết kế:** Không tạo `UserDevice` trong quá trình đăng ký. `UserDevice` chỉ được tạo tại lần đăng nhập thành công đầu tiên sau khi admin kích hoạt tài khoản.

**Lý do:** User chưa active → device record không có giá trị sử dụng, tạo orphaned data không cần thiết, và có thể gây nhầm lẫn trong DeviceJWTAuthentication logic.

```python
def create(self, validated_data):
    # Pop device fields from validated_data (not used during registration)
    validated_data.pop('device_id', None)
    validated_data.pop('device_type', None)
    validated_data.pop('device_name', None)
    email = validated_data['email']
    password = validated_data['password']

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        is_active=False,  # Wait for admin activation
    )
    # UserDevice is NOT created here.
    # It will be created on first successful login after admin activates the account.
    return user
```

#### B. Thay đổi response của RegisterView

**File:** `src/backend/users/views/auth.py` — `RegisterView.create()`

Không issue JWT token nữa. Trả về HTTP 201 với message thông báo chờ duyệt:

```python
@transaction.atomic
def create(self, request, *args, **kwargs):
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response({
        'message': 'Tài khoản đã được tạo thành công. Vui lòng chờ admin kích hoạt tài khoản.',
        'email': user.email,
    }, status=status.HTTP_201_CREATED)
```

**Breaking change:** Response không còn trả về `access`/`refresh` token.
→ Backend và frontend **phải deploy đồng thời**. Xem mục 8 (Deployment Plan).

#### C. Thêm message cho user inactive trong LoginSerializer

**File:** `src/backend/users/serializers/auth.py` — `CustomLoginSerializer.validate()`

Message hiện tại là "User account is disabled." — cần đổi thành message thân thiện hơn bằng tiếng Việt:

```python
if not user.is_active:
    raise serializers.ValidationError({
        "detail": "Tài khoản của bạn đang chờ admin kích hoạt. Vui lòng liên hệ admin để được hỗ trợ."
    })
```

#### D. Rate Limiting bằng DRF Built-in Throttling

Dùng **DRF Built-in Throttling** (không cần cài thêm package) với **Redis cache** đã có sẵn.

**Chiến lược throttle:**
- `RegisterThrottle`: giới hạn theo IP, rate thấp (chống spam đăng ký)
- `LoginThrottle`: giới hạn theo IP, rate cao hơn một chút (UX người dùng hợp lệ vẫn ok)

**File:** `src/backend/users/throttles.py` (file mới)

```python
from rest_framework.throttling import AnonRateThrottle

class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'
```

**File:** `src/backend/config/settings.py` — thêm vào `REST_FRAMEWORK` và thêm `NUM_PROXIES`:

```python
# Tell DRF to trust 1 proxy (nginx) when reading X-Forwarded-For
NUM_PROXIES = 1

REST_FRAMEWORK = {
    # ... existing config ...
    "DEFAULT_THROTTLE_CLASSES": [],  # Không áp dụng globally
    "DEFAULT_THROTTLE_RATES": {
        "register": "5/hour",   # Tối đa 5 lần đăng ký/IP/giờ
        "login": "30/hour",     # Tối đa 30 lần đăng nhập/IP/giờ (accommodate mobile token refresh)
    },
}
```

**Lý do chọn DRF Throttling thay vì django-ratelimit hay django-axes:**
- Không cần cài thêm package — stack đã đủ.
- Redis cache backend đã cấu hình — DRF throttle dùng Django cache tự động.
- `AnonRateThrottle` track theo IP từ `X-Forwarded-For` hoặc `REMOTE_ADDR` — phù hợp với setup nginx proxy của project.
- Dễ config và mở rộng (có thể thêm `UserRateThrottle` sau).
- `django-axes` có nhiều tính năng hơn nhưng cũng phức tạp hơn và yêu cầu migration DB — overkill với yêu cầu hiện tại.

**File:** `src/backend/users/views/auth.py` — thêm throttle_classes vào views:

```python
from ..throttles import RegisterRateThrottle, LoginRateThrottle

class RegisterView(generics.CreateAPIView):
    throttle_classes = [RegisterRateThrottle]
    # ...

class LoginView(generics.GenericAPIView):
    throttle_classes = [LoginRateThrottle]
    # ...
```

Khi bị throttle, DRF tự động trả về HTTP 429 với body:
```json
{"detail": "Request was throttled. Expected available in X seconds."}
```
Header `Retry-After: <seconds>` cũng được trả về tự động.

#### E. NUM_PROXIES và nginx X-Forwarded-For

**Vấn đề:** DRF `AnonRateThrottle.get_ident()` đọc `X-Forwarded-For` để xác định client IP. Nếu không cấu hình đúng, attacker có thể spoof header này để bypass rate limit.

**Giải pháp:**
1. Thêm `NUM_PROXIES = 1` vào Django settings — DRF sẽ chỉ tin tưởng 1 proxy trong chain, lấy IP thứ 2 từ cuối trong `X-Forwarded-For`.
2. Nginx cần có cấu hình `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` trong server block.

**Xác nhận nginx config:** Nginx của project đã có dòng này trong cấu hình upstream proxy. Nếu chưa có, cần thêm vào `nginx.conf`:
```nginx
location /api/ {
    proxy_pass http://web:8000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
}
```

### 3.2 Frontend Changes

#### A. Xử lý response đăng ký thành công (pending approval)

**File:** `src/frontend/src/views/RegisterView.vue`

Sau khi đăng ký, server không còn trả về token. Frontend cần hiển thị màn hình "chờ duyệt" thay vì redirect ngay:

```javascript
const registerSuccess = ref(false)
const registeredEmail = ref('')

async function submit() {
  // ...
  try {
    const { data } = await authService.register({ ... })
    // Server returns { message, email } — no access/refresh tokens
    registerSuccess.value = true
    registeredEmail.value = data.email
    // Do NOT call auth.setTokens() or router.push()
  } catch (e) {
    const res = e.response
    const d = res?.data
    if (res?.status === 429) {
      // Rate limit: show retry message with time if available
      const retryAfter = res.headers?.['retry-after']
      error.value = retryAfter
        ? t('auth.register.rateLimitExceededSeconds', { seconds: retryAfter })
        : t('auth.register.rateLimitExceeded')
    } else if (d?.email) {
      // Handle 400 "email already exists" — may be an inactive user waiting for approval
      // Replace generic "already exists" error with a friendly pending-approval hint
      fieldErrors.value.email = t('auth.register.emailAlreadyPendingHint')
    } else {
      error.value = d?.detail || (typeof d === 'string' ? d : t('auth.register.error'))
    }
  }
}
```

Trong template, thêm màn hình thành công:

```html
<div v-if="registerSuccess" class="register-view__success">
  <div class="register-view__success-icon">✓</div>
  <h2>{{ t('auth.register.successTitle') }}</h2>
  <p>{{ t('auth.register.pendingApproval', { email: registeredEmail }) }}</p>
  <p class="register-view__success-hint">{{ t('auth.register.pendingHint') }}</p>
  <AuthLink to="/auth/login">{{ t('auth.register.loginLink') }}</AuthLink>
</div>
<form v-else ...>
  <!-- existing form -->
</form>
```

#### B. Xử lý lỗi rate limit và inactive trong LoginView

**File:** `src/frontend/src/views/LoginView.vue`

```javascript
} catch (e) {
  const res = e.response
  if (res?.status === 429) {
    const retryAfter = res.headers?.['retry-after']
    error.value = retryAfter
      ? t('auth.login.rateLimitExceededSeconds', { seconds: retryAfter })
      : t('auth.login.rateLimitExceeded')
  } else {
    error.value = res?.data?.detail || res?.data?.email?.[0] || t('auth.login.errorInvalid')
  }
}
```

**Lưu ý:** Message inactive user ("Tài khoản của bạn đang chờ admin kích hoạt...") đã được backend trả về trong `detail` field — frontend hiển thị trực tiếp không cần map thêm.

#### C. Cập nhật locale strings

**File:** `src/frontend/src/locales/vi.js` — thêm vào section `auth`:

```javascript
register: {
  // ... existing keys ...
  successTitle: 'Đăng Ký Thành Công',
  pendingApproval: 'Tài khoản đã được tạo với email {email}. Vui lòng chờ admin phê duyệt trước khi đăng nhập.',
  pendingHint: 'Nếu email này đã đăng ký và đang chờ duyệt, vui lòng kiểm tra email hoặc liên hệ admin.',
  emailAlreadyPendingHint: 'Email này đã đăng ký và đang chờ duyệt, vui lòng liên hệ admin.',
  rateLimitExceeded: 'Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ.',
  rateLimitExceededSeconds: 'Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau {seconds} giây.',
},
login: {
  // ... existing keys ...
  rateLimitExceeded: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.',
  rateLimitExceededSeconds: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau {seconds} giây.',
},
```

**File:** `src/frontend/src/locales/en.js` — thêm tương tự bằng tiếng Anh.

### 3.3 Admin Changes

**File:** `src/backend/users/admin.py` — `UserAdmin`

#### A. Thêm `is_active` và `created_at` vào `list_display`

```python
list_display = ('id', 'username', 'phone_number', 'email', 'first_name', 'last_name',
                'user_type', 'is_active', 'created_at', 'is_device_locked', 'is_staff')
```

#### B. Thêm `PendingApprovalFilter` — SimpleListFilter

```python
class PendingApprovalFilter(admin.SimpleListFilter):
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
```

#### C. Thêm list actions kích hoạt / vô hiệu hóa hàng loạt với Audit Log

```python
actions = ['activate_users', 'deactivate_users']

@admin.action(description='Kích hoạt tài khoản đã chọn')
def activate_users(self, request, queryset):
    users_to_activate = queryset.filter(is_active=False)
    updated = users_to_activate.update(is_active=True)
    for user in users_to_activate:
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=user,
            action_category='USER_ACTIVATION',
            action_detail=f'Admin kích hoạt tài khoản: {user.email}',
            change_log={'before': {'is_active': False}, 'after': {'is_active': True}},
            ip_address=self._get_client_ip(request),
        )
    self.message_user(request, f'Đã kích hoạt {updated} tài khoản.')

@admin.action(description='Vô hiệu hóa tài khoản đã chọn')
def deactivate_users(self, request, queryset):
    users_to_deactivate = queryset.filter(is_active=True, is_superuser=False)
    updated = users_to_deactivate.update(is_active=False)
    for user in users_to_deactivate:
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=user,
            action_category='USER_ACTIVATION',
            action_detail=f'Admin vô hiệu hóa tài khoản: {user.email}',
            change_log={'before': {'is_active': True}, 'after': {'is_active': False}},
            ip_address=self._get_client_ip(request),
        )
    self.message_user(request, f'Đã vô hiệu hóa {updated} tài khoản.')
```

#### D. Override `save_model()` để log `is_active` changes qua form chi tiết

```python
def save_model(self, request, obj, form, change):
    if change and 'is_active' in form.changed_data:
        old_is_active = not obj.is_active  # before save
        super().save_model(request, obj, form, change)
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=obj,
            action_category='USER_ACTIVATION',
            action_detail=(
                f'Admin kích hoạt tài khoản: {obj.email}'
                if obj.is_active
                else f'Admin vô hiệu hóa tài khoản: {obj.email}'
            ),
            change_log={'before': {'is_active': old_is_active}, 'after': {'is_active': obj.is_active}},
            ip_address=self._get_client_ip(request),
        )
    else:
        super().save_model(request, obj, form, change)
```

#### E. Thêm default ordering để inactive users lên đầu

```python
def get_queryset(self, request):
    qs = super().get_queryset(request)
    from django.db.models import Case, When, IntegerField
    return qs.annotate(
        active_order=Case(
            When(is_active=False, then=0),
            default=1,
            output_field=IntegerField(),
        )
    ).order_by('active_order', '-created_at')
```

#### F. Admin notification (V1 — manual check)

Trong V1, không có email notification tự động khi có user mới đăng ký.

**Quy trình thủ công:**
- Admin định kỳ vào `/admin/users/user/?approval_status=pending` để xem user chờ duyệt.
- Hoặc sử dụng filter "Chờ duyệt" trong sidebar.

Tương lai (V2): Thêm email notification tự động qua Celery task khi `is_active=False` user mới được tạo.

### 3.4 AdminAuditLog — Thêm `USER_ACTIVATION`

**File:** `src/backend/users/models/audit.py`:

```python
ACTION_CHOICES = [
    ('CURRENCY', 'Currency Edit'),
    ('VIP_MANAGEMENT', 'VIP Upgrade/Downgrade'),
    ('DEVICE_RESET', 'Device Un-link'),
    ('CONTENT_GRANT', 'Manual Content Grant'),
    ('USER_ACTIVATION', 'User Account Activation'),  # NEW
]
```

---

## 4. Database Changes

### 4.1 `User` model — không cần migration mới

Field `is_active` đã tồn tại trong `AbstractUser` (Django built-in). Không cần tạo migration.

### 4.2 `AdminAuditLog` model — không cần migration

Thêm choice `USER_ACTIVATION` vào field `action_category`. Trong Django, thêm choice vào `CharField` với `choices` **không yêu cầu migration** (choices chỉ là validation ở Python layer, không ảnh hưởng DB schema).

→ **Không cần migration mới cho tính năng này.**

---

## 5. API Changes

### 5.1 Register API

**Endpoint:** `POST /api/auth/register/`

**Throttle:** `RegisterRateThrottle` — 5 requests/IP/hour

**Request body (không đổi):**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "device_id": "abc123",
  "device_type": "WEB"
}
```

**Response (thay đổi):**

Trước (hiện tại):
```json
HTTP 201
{
  "user": { ... },
  "refresh": "...",
  "access": "..."
}
```

Sau (mới):
```json
HTTP 201
{
  "message": "Tài khoản đã được tạo thành công. Vui lòng chờ admin kích hoạt tài khoản.",
  "email": "user@example.com"
}
```

**Error responses:**

| HTTP Status | Trường hợp |
|-------------|-----------|
| 400 | Validation errors (email đã tồn tại, thiếu field, ...) |
| 429 | Rate limit exceeded (5 lần/giờ), header `Retry-After` có giá trị tính bằng giây |

### 5.2 Login API

**Endpoint:** `POST /api/auth/login/`

**Throttle:** `LoginRateThrottle` — 30 requests/IP/hour

**Request body (không đổi):**
```json
{
  "email": "user@example.com",
  "password": "password",
  "device_id": "abc123",
  "device_type": "WEB"
}
```

**Response:** Không đổi khi đăng nhập thành công.

**Error responses (bổ sung):**

| HTTP Status | `detail` | Trường hợp |
|-------------|----------|-----------|
| 400 | "Tài khoản của bạn đang chờ admin kích hoạt..." | User `is_active=False` |
| 400 | "Invalid email or password." | Sai credentials |
| 429 | "Request was throttled. Expected available in X seconds." | Rate limit exceeded, header `Retry-After` |

---

## 6. Rate Limiting Strategy

### Cấu hình

| Endpoint | Throttle Class | Rate | Scope |
|----------|---------------|------|-------|
| `POST /api/auth/register/` | `RegisterRateThrottle` | 5/hour | `register` |
| `POST /api/auth/login/` | `LoginRateThrottle` | 30/hour | `login` |

**Login rate tăng từ 20 lên 30/hour** để accommodate mobile client token refresh và multi-device login patterns.

### Cơ chế hoạt động

- DRF `AnonRateThrottle` track theo IP. Cache key: `throttle_register_<ip>` / `throttle_login_<ip>`.
- Cache backend: **Redis** (đã có, `CACHES["default"]` → `RedisCache`).
- Window: **sliding window** (DRF default).
- Khi vượt rate: HTTP 429, header `Retry-After: <seconds>` được trả về tự động.

### IP Detection và NUM_PROXIES

DRF `AnonRateThrottle.get_ident()` đọc IP theo thứ tự:
1. `X-Forwarded-For` header (nếu có) — lấy IP đầu tiên trong danh sách.
2. Fallback về `REMOTE_ADDR`.

**Cấu hình `NUM_PROXIES = 1`** trong settings:
- Báo cho DRF biết có đúng 1 trusted proxy (nginx) trong chain.
- DRF sẽ lấy IP đầu tiên từ `X-Forwarded-For` (được nginx append), bỏ qua các proxy tiếp theo.
- Ngăn chặn IP spoofing: nếu client gửi fake `X-Forwarded-For`, nginx thêm real IP vào cuối, DRF đọc real IP từ vị trí đúng.

**Nginx phải có:**
```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

### Rate values (justification)

- **Register 5/hour:** Một người dùng hợp lệ hiếm khi cần đăng ký nhiều hơn 1-2 lần/giờ. Rate 5 đủ để chống spam nhưng không làm khó UX (ví dụ: thử email sai).
- **Login 30/hour:** Người dùng hợp lệ có thể đăng nhập nhiều lần trong ngày (nhất là trên nhiều thiết bị, mobile token refresh). Rate 30/giờ (~1 lần/2 phút) là hợp lý và không làm khó UX bình thường.

---

## 7. Admin Workflow

### Quy trình phê duyệt tài khoản mới

```
1. Người dùng đăng ký → tài khoản tạo với is_active=False, KHÔNG tạo UserDevice
2. Admin định kỳ check: /admin/users/user/?approval_status=pending
   (V1: manual check, không có email notification tự động)
3. Admin vào Django Admin → Users → filter "Chờ duyệt"
4. Admin xem thông tin user → đánh giá → click "Save" với is_active=True
   HOẶC chọn nhiều user → Actions → "Kích hoạt tài khoản đã chọn"
5. User đăng nhập lần đầu → UserDevice được tạo tại thời điểm này
6. User sử dụng bình thường
```

### Vị trí trong Django Admin

- URL: `/admin/users/user/?approval_status=pending`
- List display: cột `is_active` và `created_at` hiển thị.
- Filter sidebar: `PendingApprovalFilter` → click "Chờ duyệt" để xem danh sách.
- Bulk action: "Kích hoạt tài khoản đã chọn" (chọn checkbox → Actions dropdown).

### Audit Trail

Mỗi lần admin activate/deactivate user, hệ thống tạo `AdminAuditLog` với:
- `action_category = 'USER_ACTIVATION'`
- `action_detail = 'Admin kích hoạt tài khoản: user@example.com'`
- `change_log = {'before': {'is_active': False}, 'after': {'is_active': True}}`
- `staff = request.user`
- `ip_address = request IP`

Audit log được tạo cho cả hai hình thức:
- **Bulk action** (`activate_users` / `deactivate_users`)
- **Form chi tiết** (`save_model()` override khi `is_active` thay đổi)

---

## 8. Deployment Plan & Rollback

### Deployment Plan

**Register API là breaking change** — response không còn trả về `access`/`refresh` token. Frontend cũ sẽ lỗi nếu backend mới được deploy trước.

**Yêu cầu:** Backend và frontend phải được deploy **đồng thời** (hoặc trong khoảng thời gian rất ngắn, với downtime thông báo trước).

**Recommended deployment steps:**
1. Bật maintenance mode (nếu có).
2. Deploy backend mới.
3. Deploy frontend mới.
4. Tắt maintenance mode.
5. Smoke test: thử đăng ký → kiểm tra response 201 với `message`/`email`, không có token.

### Rollback Steps

Nếu cần rollback backend:
1. Revert `RegisterView.create()` về code cũ (issue JWT token như trước).
2. Revert `RegisterSerializer.create()` để tạo user với `is_active=True` (Django default) và tạo `UserDevice`.
3. Revert frontend về code cũ (dùng `auth.setTokens()` và `router.push('/')`).

**Lưu ý khi rollback:**
- User đã đăng ký trong thời gian feature active (với `is_active=False`) cần được admin kích hoạt thủ công, hoặc cần data migration để set `is_active=True`.
- `AdminAuditLog` records với `USER_ACTIVATION` category sẽ vẫn tồn tại (không gây hại).

---

## 9. File Changes Summary

### Backend

| File | Thay đổi |
|------|---------|
| `src/backend/users/serializers/auth.py` | `RegisterSerializer.create()`: thêm `is_active=False`, bỏ `UserDevice` creation; `CustomLoginSerializer.validate()`: cập nhật message lỗi inactive |
| `src/backend/users/views/auth.py` | `RegisterView.create()`: bỏ JWT issue, trả về message chờ duyệt; thêm `throttle_classes` cho cả RegisterView và LoginView |
| `src/backend/users/throttles.py` | **File mới**: `RegisterRateThrottle`, `LoginRateThrottle` |
| `src/backend/users/admin.py` | `UserAdmin`: thêm `is_active`/`created_at` vào `list_display`; thêm `PendingApprovalFilter`; thêm `activate_users`/`deactivate_users` actions với audit log; override `save_model()` để log `is_active` changes; override `get_queryset` để sort inactive users lên đầu |
| `src/backend/users/models/audit.py` | `AdminAuditLog.ACTION_CHOICES`: thêm `('USER_ACTIVATION', 'User Account Activation')` |
| `src/backend/config/settings.py` | Thêm `NUM_PROXIES = 1`; `REST_FRAMEWORK`: thêm `DEFAULT_THROTTLE_RATES` |

### Frontend

| File | Thay đổi |
|------|---------|
| `src/frontend/src/views/RegisterView.vue` | Xử lý response không có token; hiển thị màn hình "chờ duyệt"; xử lý HTTP 429 với Retry-After; xử lý 400 email exists với pending hint |
| `src/frontend/src/views/LoginView.vue` | Xử lý HTTP 429 rate limit error với Retry-After; message inactive user hiển thị từ backend `detail` |
| `src/frontend/src/locales/vi.js` | Thêm keys: `register.successTitle`, `register.pendingApproval`, `register.pendingHint`, `register.emailAlreadyPendingHint`, `register.rateLimitExceeded`, `register.rateLimitExceededSeconds`, `login.rateLimitExceeded`, `login.rateLimitExceededSeconds` |
| `src/frontend/src/locales/en.js` | Thêm tương tự bằng tiếng Anh |

---

## 10. Testing Checklist

### Backend

- [ ] Đăng ký tài khoản mới → `is_active=False` trong DB, **không** có `UserDevice` record
- [ ] Đăng ký thành công → response HTTP 201 với `message` và `email`, **không** có `access`/`refresh`
- [ ] Đăng nhập với user `is_active=False` → HTTP 400 với message "Tài khoản của bạn đang chờ admin kích hoạt..."
- [ ] Admin kích hoạt user (`is_active=True`) → user đăng nhập được, `UserDevice` được tạo tại login
- [ ] Register API: gọi 6 lần từ cùng IP trong 1 giờ → lần thứ 6 trả về HTTP 429
- [ ] Login API: gọi 31 lần từ cùng IP trong 1 giờ → lần thứ 31 trả về HTTP 429
- [ ] Response HTTP 429 có header `Retry-After`
- [ ] `AdminAuditLog` được tạo khi admin activate/deactivate user qua list action
- [ ] `AdminAuditLog` được tạo khi admin thay đổi `is_active` qua form chi tiết
- [ ] Django Admin: filter "Chờ duyệt" hiển thị đúng users chờ duyệt
- [ ] Django Admin: bulk action "Kích hoạt" cập nhật `is_active=True` cho nhiều user
- [ ] Existing users vẫn `is_active=True` — không bị ảnh hưởng

### Frontend

- [ ] Đăng ký thành công → hiển thị màn hình "chờ duyệt" thay vì redirect về `/`
- [ ] Màn hình chờ duyệt hiển thị email đã đăng ký
- [ ] Màn hình chờ duyệt có hint về "đã đăng ký và đang chờ duyệt"
- [ ] Đăng nhập với tài khoản chưa kích hoạt → hiển thị message lỗi từ backend
- [ ] Đăng ký quá nhiều lần → hiển thị message rate limit với thời gian chờ
- [ ] Đăng nhập quá nhiều lần → hiển thị message rate limit với thời gian chờ
- [ ] 400 email already exists → hiển thị friendly message với pending hint
- [ ] Sau khi được kích hoạt → đăng nhập bình thường, redirect về `/`

### Integration

- [ ] Flow end-to-end: Đăng ký → Admin kích hoạt → Đăng nhập thành công → UserDevice được tạo
- [ ] Existing users không bị ảnh hưởng (vẫn login được bình thường)
- [ ] Rate limit hoạt động đúng sau nginx proxy (real IP được detect, không phải proxy IP)

---

## 11. Các quyết định đã chốt

| # | Câu hỏi | Quyết định | Lý do |
|---|---------|-----------|-------|
| 1 | UserDevice lifecycle | **Không tạo UserDevice khi đăng ký** — chỉ tạo tại lần login thành công đầu tiên sau khi admin kích hoạt | User inactive → device record vô nghĩa, tránh orphaned data, không gây nhầm lẫn DeviceJWTAuthentication |
| 2 | Existing users | **Không data migration** — tất cả user hiện tại giữ `is_active=True` | Chỉ user mới đăng ký sau khi deploy mới bị ảnh hưởng; migration sẽ lock out toàn bộ user hiện tại |
| 3 | Rate limiting library | **DRF Built-in Throttling** + Redis cache | Không cần thêm package; Redis đã có sẵn; đủ với yêu cầu hiện tại |
| 4 | Login rate limit | **30/hour** (không phải 20) | Accommodate mobile client token refresh và multi-device login patterns |
| 5 | Register rate limit | **5/hour** | Người dùng hợp lệ hiếm khi cần đăng ký nhiều lần; đủ để chống spam |
| 6 | NUM_PROXIES | **`NUM_PROXIES = 1`** trong settings | Nginx là trusted proxy duy nhất; ngăn IP spoofing qua `X-Forwarded-For` |
| 7 | Register API response | **Breaking change** — không trả về JWT token | Bắt buộc để implement pending approval flow; deploy đồng thời frontend + backend |
| 8 | Admin notification V1 | **Manual check only** — không có email notification tự động | V1 đơn giản; V2 sẽ thêm Celery task gửi email |
| 9 | Audit log scope | **Cả bulk action lẫn form chi tiết** — override `save_model()` | Admin có thể thay đổi `is_active` qua 2 đường; cần log đầy đủ cả hai |
| 10 | Retry-After UX | **Frontend đọc `Retry-After` header** để hiển thị countdown thực | Trải nghiệm người dùng tốt hơn so với hiển thị text cứng |
