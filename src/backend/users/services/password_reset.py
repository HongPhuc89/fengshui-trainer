"""
Password reset via OTP email verification.

Flow:
  1. request_otp(email)     — generate 6-digit OTP, store hash in DB, send email,
                              increment per-email daily Redis counter.
  2. verify_otp(email, otp) — validate OTP (expiry + attempt limit),
                              return a short-lived reset_token stored in Redis.
  3. confirm_reset(token, new_password) — look up token in Redis, set new password,
                                          delete token so it cannot be reused.
"""

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from ..models import User, PasswordResetOTP


class RateLimitExceeded(Exception):
    """Raised when the daily OTP request limit for an email is exceeded."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _hash_otp(otp: str) -> str:
    """Return the SHA-256 hex digest of an OTP string."""
    return hashlib.sha256(otp.encode()).hexdigest()


def _daily_count_key(email: str) -> str:
    """Redis key for the per-email OTP request counter (resets at midnight VN time)."""
    date_str = timezone.localdate().isoformat()  # uses TIME_ZONE = Asia/Ho_Chi_Minh
    return f"otp_daily_count:{email}:{date_str}"


def _seconds_until_midnight() -> int:
    """Return the number of seconds remaining until midnight (local time)."""
    now = timezone.localtime()
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now).total_seconds())


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def request_otp(email: str) -> dict:
    """Send a 6-digit OTP to the given email address.

    Raises:
        ValueError: Email not found or account inactive.
        RateLimitExceeded: Daily OTP request limit reached.

    Returns:
        dict with `expires_in` (seconds until OTP expiry).
    """
    # 1. Resolve user
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        raise ValueError("Email không tồn tại hoặc tài khoản chưa được kích hoạt.")

    # 2. Check daily rate limit (per email)
    daily_key = _daily_count_key(email)
    daily_count = cache.get(daily_key, 0)
    if daily_count >= settings.OTP_DAILY_LIMIT:
        raise RateLimitExceeded(
            f"Đã vượt quá giới hạn {settings.OTP_DAILY_LIMIT} lần gửi OTP trong ngày. "
            "Vui lòng thử lại vào ngày mai."
        )

    # 3. Generate OTP and persist (overwrite any existing record for this user)
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

    # 4. Increment daily counter (TTL = seconds until local midnight)
    cache.set(daily_key, daily_count + 1, timeout=_seconds_until_midnight())

    # 5. Send OTP email
    _send_otp_email(user, otp_code, settings.OTP_EXPIRY_MINUTES)

    return {"expires_in": settings.OTP_EXPIRY_MINUTES * 60}


def verify_otp(email: str, otp_code: str) -> dict:
    """Verify the OTP submitted by the user.

    Uses select_for_update() inside an atomic transaction to prevent
    concurrent submissions from each consuming an attempt independently.

    Raises:
        ValueError: OTP missing, expired, already used, or incorrect.

    Returns:
        dict with `reset_token` (URL-safe 32-byte token) and `expires_in` (seconds).
    """
    # 1. Resolve user
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        raise ValueError("Email không tồn tại.")

    with transaction.atomic():
        # 2. Acquire row lock to serialise concurrent verify attempts
        try:
            otp_obj = PasswordResetOTP.objects.select_for_update().get(user=user)
        except PasswordResetOTP.DoesNotExist:
            raise ValueError("OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.")

        # 3. Guard: already expired or used
        if not otp_obj.is_valid:
            raise ValueError("OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.")

        # 4. Increment attempt counter before hash comparison
        otp_obj.attempts += 1

        if otp_obj.otp_hash != _hash_otp(otp_code):
            remaining = settings.OTP_MAX_ATTEMPTS - otp_obj.attempts
            if remaining <= 0:
                otp_obj.is_used = True
                otp_obj.save(update_fields=['attempts', 'is_used'])
                raise ValueError(
                    "Đã nhập sai quá nhiều lần. OTP bị vô hiệu. Vui lòng yêu cầu mã mới."
                )
            otp_obj.save(update_fields=['attempts'])
            raise ValueError(f"OTP không đúng. Còn {remaining} lần thử.")

        # 5. OTP matches — mark as used
        otp_obj.is_used = True
        otp_obj.save(update_fields=['attempts', 'is_used'])

    # 6. Issue a cryptographically secure reset token stored in Redis
    reset_token = secrets.token_urlsafe(32)
    expiry_seconds = settings.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60
    cache.set(f"password_reset_token:{reset_token}", user.pk, timeout=expiry_seconds)

    return {"reset_token": reset_token, "expires_in": expiry_seconds}


def confirm_reset(reset_token: str, new_password: str) -> None:
    """Set a new password using the short-lived reset token.

    Raises:
        ValueError: Token invalid, expired, or user not found.
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

    # Delete token immediately so it cannot be reused
    cache.delete(f"password_reset_token:{reset_token}")


# ---------------------------------------------------------------------------
# Internal email helper
# ---------------------------------------------------------------------------

def _send_otp_email(user: User, otp_code: str, expiry_minutes: int) -> None:
    """Render the HTML email template and send it via the configured SMTP backend."""
    from django.core.mail import EmailMessage
    from django.template.loader import render_to_string

    context = {
        'display_name': user.first_name or user.username,
        'otp_code': otp_code,
        'expiry_minutes': expiry_minutes,
    }
    subject = "Mã OTP đặt lại mật khẩu — Thiên Thư"
    body_html = render_to_string('emails/password_reset_otp.html', context)

    email = EmailMessage(
        subject=subject,
        body=body_html,
        from_email=None,  # uses DEFAULT_FROM_EMAIL from settings
        to=[user.email],
    )
    email.content_subtype = 'html'
    email.send(fail_silently=False)
