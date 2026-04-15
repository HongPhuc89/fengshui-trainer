# Feature 32: Forgot Password via OTP Email Verification

## Document Information
- **Feature**: Forgot Password — OTP-based email verification
- **Version**: 1.1
- **Created**: 2026-04-15
- **Updated**: 2026-04-15
- **Status**: 📝 Design — Awaiting PO Review

---

## Summary

Implement a three-step "Forgot Password" flow: user requests an OTP sent to their registered email via **Resend SMTP**, enters the OTP to receive a short-lived reset token, then submits a new password. Key constraints: OTP valid for N minutes (default 5), max 5 wrong attempts before OTP is voided, max N OTP requests per day per email (default 5) to prevent spam.

**Stack involved**: Django (backend), Vue.js (frontend), PostgreSQL (DB), Redis (rate limiting + reset token cache).

---

## Analysis

### Requirements & Constraints
| Constraint | Value | Config key |
|---|---|---|
| OTP validity | 5 min (default) | `OTP_EXPIRY_MINUTES` |
| Max wrong attempts | 5 | `OTP_MAX_ATTEMPTS` |
| Max OTP requests/day/email | 5 (default) | `OTP_DAILY_LIMIT` |
| Reset token validity (after OTP) | 15 min | `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES` |
| OTP format | 6-digit numeric | — |
| Email provider | Resend via SMTP | `EMAIL_HOST=smtp.resend.com` |

### Layers Involved
- **DB**: New `PasswordResetOTP` model in `users` app
- **Backend (Django)**: 3 new API endpoints, OTP service, email task, Redis-based daily counter
- **Frontend (Vue.js)**: New `ForgotPasswordView.vue` (multi-step: 3 steps in one view)

---

## Proposed Solution

### Database (PostgreSQL)

#### New Model: `PasswordResetOTP`

Location: `src/backend/users/models/password_reset.py`

**Design choice**: `OneToOneField` — enforces exactly 1 OTP row per user at the DB level. On new request, the existing row is overwritten via `update_or_create`, so no explicit void step is needed and no rows accumulate.

```python
from django.db import models
from django.utils import timezone
from .base import BaseModel


class PasswordResetOTP(BaseModel):
    """
    One OTP record per user (OneToOneField).
    Overwritten on each new request — no row accumulation, DB-level uniqueness.
    """
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='password_reset_otp',
    )
    otp_hash = models.CharField(max_length=128)   # SHA-256 hash of the 6-digit code
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)      # wrong attempts counter
    is_used = models.BooleanField(default=False)   # True = consumed after correct OTP

    class Meta:
        verbose_name = "Password Reset OTP"
        verbose_name_plural = "Password Reset OTPs"

    @property
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at
```

**Migration**: `users/migrations/0006_passwordresetotp.py`

#### No new table for reset tokens
After OTP verification, a short-lived **reset token** (`secrets.token_urlsafe(32)`) is stored only in **Redis** (`password_reset_token:{token}` → `user.pk`, TTL = 15 min). This avoids a second DB table for ephemeral data.

---

### Backend (Django)

#### 1. Settings (`src/backend/config/settings.py`)

Add OTP configuration block and Resend SMTP settings:

```python
# --- OTP / Forgot Password ---
OTP_EXPIRY_MINUTES = env.int("OTP_EXPIRY_MINUTES", default=5)
OTP_MAX_ATTEMPTS = env.int("OTP_MAX_ATTEMPTS", default=5)
OTP_DAILY_LIMIT = env.int("OTP_DAILY_LIMIT", default=5)
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = env.int("PASSWORD_RESET_TOKEN_EXPIRY_MINUTES", default=15)
```

Update `DEFAULT_THROTTLE_RATES` to include the new scope:
```python
"DEFAULT_THROTTLE_RATES": {
    "register": "5/hour",
    "login": "30/hour",
    "otp_request": "20/hour",   # IP-level guard (coarse); daily-per-email is handled in service
},
```

#### 2. `.env` additions

```dotenv
# Resend SMTP (https://resend.com/settings/smtp)
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=<RESEND_API_KEY>
DEFAULT_FROM_EMAIL=Thiên Thư <noreply@yourdomain.com>

# OTP config (optional overrides)
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_DAILY_LIMIT=5
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=15
```

#### 3. OTP Service (`src/backend/users/services/password_reset.py`)

```python
import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from ..models import User, PasswordResetOTP


# ------------------------------------------------------------------
# Exceptions
# ------------------------------------------------------------------

class RateLimitExceeded(Exception):
    """Raised when the daily OTP request limit for an email is exceeded."""


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def _daily_count_key(email: str) -> str:
    date_str = timezone.localdate().isoformat()   # Asia/Ho_Chi_Minh
    return f"otp_daily_count:{email}:{date_str}"


def _seconds_until_midnight() -> int:
    """Seconds from now until midnight in server timezone (UTC+7)."""
    now = timezone.localtime()
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now).total_seconds())


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

def request_otp(email: str) -> dict:
    """
    Step 1 — Generate and send OTP.
    Returns {'expires_in': seconds}.
    Raises ValueError with user-facing message on failure.
    """
    # 1. Validate email exists
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        raise ValueError("Email không tồn tại hoặc tài khoản chưa được kích hoạt.")

    # 2. Daily rate limit (per email, stored in Redis)
    daily_key = _daily_count_key(email)
    daily_count = cache.get(daily_key, 0)
    if daily_count >= settings.OTP_DAILY_LIMIT:
        raise RateLimitExceeded(
            f"Đã vượt quá giới hạn {settings.OTP_DAILY_LIMIT} lần gửi OTP trong ngày. "
            "Vui lòng thử lại vào ngày mai."
        )

    # 3. Generate 6-digit OTP and upsert (OneToOneField — overwrite existing row)
    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    PasswordResetOTP.objects.update_or_create(
        user=user,
        defaults={
            'otp_hash': _hash_otp(otp_code),
            'expires_at': expires_at,
            'attempts': 0,
            'is_used': False,
        },
    )

    # 4. Increment daily counter (TTL = seconds until midnight)
    cache.set(daily_key, daily_count + 1, timeout=_seconds_until_midnight())

    # 5. Send email (inline; Celery is optional enhancement)
    _send_otp_email(user, otp_code, settings.OTP_EXPIRY_MINUTES)

    return {"expires_in": settings.OTP_EXPIRY_MINUTES * 60}


def verify_otp(email: str, otp_code: str) -> dict:
    """
    Step 2 — Verify OTP.
    Returns {'reset_token': str, 'expires_in': seconds} on success.
    Raises ValueError on failure.
    Uses select_for_update() inside a transaction to prevent race condition
    where two concurrent correct submissions both receive a reset token.
    """
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        raise ValueError("Email không tồn tại.")

    with transaction.atomic():
        # OneToOneField accessor; lock the row to prevent concurrent verify
        try:
            otp_obj = (
                PasswordResetOTP.objects
                .select_for_update()
                .get(user=user)
            )
        except PasswordResetOTP.DoesNotExist:
            raise ValueError("OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.")

        if not otp_obj.is_valid:
            raise ValueError("OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.")

        otp_obj.attempts += 1

        if otp_obj.otp_hash != _hash_otp(otp_code):
            remaining = settings.OTP_MAX_ATTEMPTS - otp_obj.attempts
            if remaining <= 0:
                otp_obj.is_used = True
                otp_obj.save(update_fields=['attempts', 'is_used'])
                raise ValueError("Đã nhập sai quá nhiều lần. OTP bị vô hiệu. Vui lòng yêu cầu mã mới.")
            otp_obj.save(update_fields=['attempts'])
            raise ValueError(f"OTP không đúng. Còn {remaining} lần thử.")

        # Correct OTP — mark as used and issue reset token
        otp_obj.is_used = True
        otp_obj.save(update_fields=['attempts', 'is_used'])

    reset_token = secrets.token_urlsafe(32)   # 256-bit cryptographically secure token
    expiry_seconds = settings.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60
    cache.set(f"password_reset_token:{reset_token}", user.pk, timeout=expiry_seconds)

    return {"reset_token": reset_token, "expires_in": expiry_seconds}


def confirm_reset(reset_token: str, new_password: str) -> None:
    """
    Step 3 — Set new password.
    Raises ValueError on invalid/expired token.
    """
    user_pk = cache.get(f"password_reset_token:{reset_token}")
    if not user_pk:
        raise ValueError("Token không hợp lệ hoặc đã hết hạn.")

    try:
        user = User.objects.get(pk=user_pk, is_active=True)
    except User.DoesNotExist:
        raise ValueError("Tài khoản không tồn tại.")

    user.set_password(new_password)
    user.save(update_fields=['password'])

    # Consume the token immediately
    cache.delete(f"password_reset_token:{reset_token}")


# ------------------------------------------------------------------
# Email helper
# ------------------------------------------------------------------

def _send_otp_email(user: User, otp_code: str, expiry_minutes: int) -> None:
    from django.core.mail import EmailMessage
    from django.template.loader import render_to_string

    context = {
        'display_name': user.first_name or user.username,
        'otp_code': otp_code,
        'expiry_minutes': expiry_minutes,
    }
    subject   = "Mã OTP đặt lại mật khẩu — Thiên Thư"
    body_html = render_to_string('emails/password_reset_otp.html', context)

    email = EmailMessage(
        subject=subject,
        body=body_html,
        from_email=None,   # uses DEFAULT_FROM_EMAIL
        to=[user.email],
    )
    email.content_subtype = 'html'   # send as HTML-only (single template file)
    email.send(fail_silently=False)
```

> **Note on Celery**: `_send_otp_email` is called synchronously. Wrap in a Celery task (`@shared_task`) if email latency becomes a concern — the service interface stays the same.

#### 4.a Email Template

Django's template loader looks in `BASE_DIR / "templates"` (already configured in `settings.py`).

**`src/backend/templates/emails/password_reset_otp.html`**:
```html
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; max-width: 480px; margin: auto; padding: 24px;">
  <h2 style="color: #b8860b;">Thiên Thư</h2>
  <p>Xin chào <strong>{{ display_name }}</strong>,</p>
  <p>Mã OTP của bạn để đặt lại mật khẩu là:</p>
  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
              background: #fdf6e3; border: 1px solid #e0c97a;
              border-radius: 8px; padding: 16px 24px; text-align: center;
              margin: 16px 0;">
    {{ otp_code }}
  </div>
  <p>Mã có hiệu lực trong <strong>{{ expiry_minutes }} phút</strong>.</p>
  <p style="color: #888; font-size: 13px;">
    Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #aaa; font-size: 12px;">© Thiên Thư</p>
</body>
</html>
```

Template context variables:

| Variable | Type | Ví dụ |
|---|---|---|
| `display_name` | str | `"Nguyen Van A"` |
| `otp_code` | str | `"482931"` |
| `expiry_minutes` | int | `5` |

#### 4. Throttle (`src/backend/users/throttles.py` — add)

```python
class OtpRequestRateThrottle(AnonRateThrottle):
    """IP-level coarse throttle for OTP request endpoint."""
    scope = 'otp_request'
```

#### 5. Serializers (`src/backend/users/serializers/password_reset.py`)

```python
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class RequestOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)


class ConfirmResetSerializer(serializers.Serializer):
    reset_token = serializers.CharField()   # secrets.token_urlsafe(32), not UUID format
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Mật khẩu xác nhận không khớp.")
        validate_password(data['new_password'])
        return data
```

#### 6. Views (`src/backend/users/views/password_reset.py`)

```python
from rest_framework import status, views
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..serializers.password_reset import (
    ConfirmResetSerializer, RequestOTPSerializer, VerifyOTPSerializer,
)
from ..services.password_reset import RateLimitExceeded, confirm_reset, request_otp, verify_otp
from ..throttles import OtpRequestRateThrottle


class RequestOTPView(views.APIView):
    """POST /api/auth/password-reset/request/"""
    permission_classes = (AllowAny,)
    throttle_classes = [OtpRequestRateThrottle]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = request_otp(serializer.validated_data['email'])
        except RateLimitExceeded as e:
            return Response({'detail': str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Mã OTP đã được gửi đến email của bạn.', **result})


class VerifyOTPView(views.APIView):
    """POST /api/auth/password-reset/verify/"""
    permission_classes = (AllowAny,)
    throttle_classes = [OtpRequestRateThrottle]   # defense-in-depth IP throttle

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = verify_otp(
                serializer.validated_data['email'],
                serializer.validated_data['otp'],
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class ConfirmResetView(views.APIView):
    """POST /api/auth/password-reset/confirm/"""
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = ConfirmResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirm_reset(
                serializer.validated_data['reset_token'],
                serializer.validated_data['new_password'],
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Mật khẩu đã được đặt lại thành công.'})
```

#### 7. URL Registration

**`src/backend/users/urls.py`** — add 3 paths:

```python
from .views.password_reset import ConfirmResetView, RequestOTPView, VerifyOTPView

urlpatterns = [
    # ... existing paths ...
    path('password-reset/request/', RequestOTPView.as_view(), name='password_reset_request'),
    path('password-reset/verify/',  VerifyOTPView.as_view(),  name='password_reset_verify'),
    path('password-reset/confirm/', ConfirmResetView.as_view(), name='password_reset_confirm'),
]
```

These are mounted at `/api/auth/` in `config/urls.py` (same as existing auth views), so the full paths are:
- `POST /api/auth/password-reset/request/`
- `POST /api/auth/password-reset/verify/`
- `POST /api/auth/password-reset/confirm/`

#### 8. Admin (`src/backend/users/admin.py` — add)

Register `PasswordResetOTP` for debugging/monitoring:

```python
@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'attempts', 'is_used')
    list_filter = ('is_used',)
    search_fields = ('user__email',)
    readonly_fields = ('otp_hash', 'created_at', 'updated_at')
```

---

### API Specification

#### `POST /api/auth/password-reset/request/`

Request OTP for a given email.

| | Detail |
|---|---|
| Auth | None |
| Throttle | IP: 20/hour (`otp_request` scope) |
| Rate limit | Email: N/day (Redis, configurable) |

**Request body**:
```json
{ "email": "user@example.com" }
```

**200 OK**:
```json
{ "message": "Mã OTP đã được gửi đến email của bạn.", "expires_in": 300 }
```

**400 Bad Request** (email không tồn tại):
```json
{ "detail": "Email không tồn tại hoặc tài khoản chưa được kích hoạt." }
```

**429 Too Many Requests** (vượt daily limit):
```json
{ "detail": "Đã vượt quá giới hạn 5 lần gửi OTP trong ngày. Vui lòng thử lại vào ngày mai." }
```

---

#### `POST /api/auth/password-reset/verify/`

Verify OTP and receive a reset token.

**Request body**:
```json
{ "email": "user@example.com", "otp": "123456" }
```

**200 OK**:
```json
{ "reset_token": "3yHk9mXqL2vNpRwTcBdJeUfAiZoGs8Wn", "expires_in": 900 }
```

**400 Bad Request** (wrong OTP with remaining attempts):
```json
{ "detail": "OTP không đúng. Còn 3 lần thử." }
```

**400 Bad Request** (max attempts exceeded):
```json
{ "detail": "Đã nhập sai quá nhiều lần. OTP bị vô hiệu. Vui lòng yêu cầu mã mới." }
```

---

#### `POST /api/auth/password-reset/confirm/`

Set new password using the reset token.

**Request body**:
```json
{
  "reset_token": "3yHk9mXqL2vNpRwTcBdJeUfAiZoGs8Wn",
  "new_password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}
```

**200 OK**:
```json
{ "message": "Mật khẩu đã được đặt lại thành công." }
```

**400 Bad Request**:
```json
{ "detail": "Token không hợp lệ hoặc đã hết hạn." }
```

---

### Frontend (Vue.js)

#### New File: `src/frontend/src/views/ForgotPasswordView.vue`

Single-view component with **3 steps** rendered conditionally:

```
Step 1: "Quên mật khẩu"    — Email input + "Gửi OTP" button
Step 2: "Nhập mã OTP"      — 6 input boxes (one digit each) + countdown timer + "Gửi lại" link
Step 3: "Đặt mật khẩu mới" — New password + Confirm password inputs + "Xác nhận" button
```

**Component structure**:

```vue
<script setup>
import { ref, computed } from 'vue'
// step: 1 | 2 | 3
const step = ref(1)
const email = ref('')
const otp = ref('')
const resetToken = ref('')
const otpExpiresIn = ref(0)   // seconds countdown
const loading = ref(false)
const error = ref('')

async function requestOtp() { /* POST /api/auth/password-reset/request/ */ }
async function verifyOtp()   { /* POST /api/auth/password-reset/verify/  */ }
async function confirmReset(){ /* POST /api/auth/password-reset/confirm/ */ }
</script>
```

**OTP Input UX**: Six individual `<input maxlength="1">` elements with auto-focus-next behavior (same pattern as typical OTP inputs). Paste support: split into individual chars.

**Countdown timer**: Shows "OTP hết hạn sau X:XX" using `setInterval`. When timer reaches 0, show "OTP đã hết hạn. " button.

**Resend logic**: After requesting OTP, a "Gửi lại" link is shown, disabled until the previous OTP expires. Clicking it re-calls `requestOtp()` and resets the timer.

**Success redirect (Step 3)**: After `confirmReset()` succeeds, redirect to `/auth/login?reset=success`. `LoginView.vue` checks `route.query.reset === 'success'` on mount and shows a one-time success banner: "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập."

#### New Service: `src/frontend/src/services/auth.service.js` — add methods

```javascript
// Append to authService object:
requestPasswordResetOtp(email) {
  return apiClient.post('/api/auth/password-reset/request/', { email })
},
verifyPasswordResetOtp(email, otp) {
  return apiClient.post('/api/auth/password-reset/verify/', { email, otp })
},
confirmPasswordReset(resetToken, newPassword, confirmPassword) {
  return apiClient.post('/api/auth/password-reset/confirm/', {
    reset_token: resetToken,
    new_password: newPassword,
    confirm_password: confirmPassword,
  })
},
```

#### Router Update: `src/frontend/src/router/index.js`

Add route under the `guest` `AuthLayout` children:

```javascript
{ path: 'forgot-password', name: 'ForgotPassword', component: () => import('../views/ForgotPasswordView.vue') },
```

#### `LoginView.vue` — add link

Add "Quên mật khẩu?" link below the password field linking to `{ name: 'ForgotPassword' }`.

---

## Files to Create / Modify

### Backend

| Action | File |
|---|---|
| **Create** | `src/backend/users/models/password_reset.py` |
| **Modify** | `src/backend/users/models/__init__.py` — export `PasswordResetOTP` |
| **Create** | `src/backend/users/services/__init__.py` *(new package)* |
| **Create** | `src/backend/users/services/password_reset.py` |
| **Create** | `src/backend/users/serializers/password_reset.py` |
| **Create** | `src/backend/users/views/password_reset.py` |
| **Modify** | `src/backend/users/views/__init__.py` — export new views |
| **Modify** | `src/backend/users/urls.py` — 3 new paths |
| **Modify** | `src/backend/users/throttles.py` — add `OtpRequestRateThrottle` |
| **Modify** | `src/backend/config/settings.py` — OTP settings + `otp_request` throttle rate |
| **Create** | `src/backend/users/migrations/0006_passwordresetotp.py` *(via makemigrations)* |
| **Modify** | `src/backend/users/admin.py` — register `PasswordResetOTP` |
| **Modify** | `.env` / `.env.example` — add Resend SMTP + OTP config vars |
| **Create** | `src/backend/templates/emails/password_reset_otp.html` — HTML email template (HTML-only, single file) |

### Frontend

| Action | File |
|---|---|
| **Create** | `src/frontend/src/views/ForgotPasswordView.vue` |
| **Modify** | `src/frontend/src/router/index.js` — add `/auth/forgot-password` route |
| **Modify** | `src/frontend/src/services/auth.service.js` — 3 new methods |
| **Modify** | `src/frontend/src/views/LoginView.vue` — add "Quên mật khẩu?" link |

---

## Trade-offs & Notes

| Topic | Decision | Rationale |
|---|---|---|
| OTP storage | DB (`PasswordResetOTP`) | Auditable; easy admin visibility |
| Reset token storage | Redis only | Ephemeral (15 min), no audit need, avoids extra table |
| Email sending | Synchronous `EmailMessage` | Simplest; wrap in Celery task later if latency is an issue |
| Daily limit tracking | Redis key with midnight TTL | O(1) lookup, no DB query needed |
| OTP hashing | SHA-256 | OTPs are short-lived; bcrypt overhead not justified here |
| Email enumeration | Reveals whether email exists | Acceptable for a closed learning platform; UX > security trade-off |
| Resend integration | Django SMTP backend | No new SDK needed; reuses existing `EMAIL_*` settings pattern |

### Edge Cases
- **Concurrent verify requests**: `select_for_update()` inside `transaction.atomic()` in `verify_otp` prevents two simultaneous correct submissions both receiving a reset token.
- **OTP for inactive user**: `is_active=True` check in service prevents OTP for deactivated accounts.
- **Password validation**: `validate_password()` enforces Django's `AUTH_PASSWORD_VALIDATORS` (length, common password check, etc.).
- **Token reuse**: Reset token is deleted from Redis immediately after successful password change.
- **IP throttle bypass**: The Redis daily counter is per-email, so rotating IPs doesn't bypass the daily limit.

---

## Implementation Order

1. **Backend first**:
   1. Add `PasswordResetOTP` model + migration
   2. Create service layer (`services/password_reset.py`)
   3. Create serializers + views
   4. Register URLs
   5. Update settings + `.env.example`
   6. Register in admin

2. **Frontend**:
   1. Add service methods to `auth.service.js`
   2. Add route
   3. Build `ForgotPasswordView.vue` (step 1 → 2 → 3)
   4. Add "Quên mật khẩu?" link in `LoginView.vue`

---

*Last updated: 2026-04-15 (v1.1 — post PO review: select_for_update, 429 rate limit, success redirect, cleanup)*
