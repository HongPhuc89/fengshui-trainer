"""
Staff-issued activation keys — the only way a user may move to another handset.

The verify/consume split is not stylistic. Counting a wrong attempt has to
commit even though the request fails, so it cannot share a transaction with the
success path's writes (see verify_activation_key).
"""

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from ..constants import ACTIVATION_ALPHABET, ACTIVATION_BODY_LENGTH, ACTIVATION_PREFIX
from ..models import DeviceActivationKey

logger = logging.getLogger(__name__)
_MAX_KEY_ATTEMPTS = 5


class ActivationError(Exception):
    """Raised with a user-facing Vietnamese message when a code cannot be redeemed."""


def _generate_unique_key() -> str:
    """Draw a Crockford Base32 body until it is unused, then format it in groups of four."""
    for _ in range(_MAX_KEY_ATTEMPTS):
        body = ''.join(secrets.choice(ACTIVATION_ALPHABET) for _ in range(ACTIVATION_BODY_LENGTH))
        key = f'{ACTIVATION_PREFIX}-{body[0:4]}-{body[4:8]}-{body[8:12]}'
        if not DeviceActivationKey.objects.filter(key=key).exists():
            return key
    raise IntegrityError('Unable to allocate a unique activation key.')


def normalize_key(raw: str) -> str:
    """
    Canonicalise a code typed by a user.

    Uppercases, strips separators, and folds the characters the alphabet excludes
    onto their look-alikes (I/L -> 1, O -> 0), so a code read out over the phone
    still matches when the listener picks the wrong glyph.
    """
    value = (raw or '').upper().replace('-', '').replace(' ', '')
    value = value.replace('I', '1').replace('L', '1').replace('O', '0')
    if value.startswith(ACTIVATION_PREFIX):
        value = value[len(ACTIVATION_PREFIX):]
    return value


def issue_key(user, staff, reason: str = '', notify_email: bool = True) -> DeviceActivationKey:
    """
    Issue a single-use activation code, revoking any code still outstanding so
    support is never looking at two live codes for the same person.
    """
    with transaction.atomic():
        DeviceActivationKey.objects.filter(user=user, status='ISSUED').update(
            status='REVOKED', revoked_at=timezone.now(), revoked_by=staff,
        )
        key = DeviceActivationKey.objects.create(
            user=user,
            key=_generate_unique_key(),
            issued_by=staff,
            issued_reason=reason,
            expires_at=timezone.now() + timedelta(days=settings.DEVICE_ACTIVATION_KEY_TTL_DAYS),
        )

    if notify_email and user.email:
        try:
            send_activation_email(user, key)
        except Exception:
            # The admin still sees the code in the success message, so a mail
            # outage must not lose an already-issued key.
            logger.exception('Failed to email activation key to user_id=%s', user.pk)
    return key


def verify_activation_key(user, raw_key: str) -> DeviceActivationKey:
    """
    Check a code and record the attempt. Runs in its own transaction and MUST be
    called outside the caller's write transaction.

    A wrong code raises only after the incremented attempt counter has committed.
    Counting inside the caller's atomic block would roll the counter back
    together with the failed request, leaving the lockout permanently disarmed.

    Returns the still-ISSUED key on success; consume_activation_key marks it used.
    """
    normalized = normalize_key(raw_key)

    with transaction.atomic():
        key = (
            DeviceActivationKey.objects.select_for_update()
            .filter(user=user, status='ISSUED')
            .first()
        )
        error = _check_key(key, normalized)
    # Transaction has committed here — the attempt counter is durable.

    if error:
        raise ActivationError(error)
    return key


def _check_key(key, normalized: str) -> str | None:
    """Validate a locked key row, persisting expiry and attempt changes. Returns an error message or None."""
    if key is None:
        return 'Chưa có mã kích hoạt cho tài khoản này. Vui lòng liên hệ admin.'

    if timezone.now() >= key.expires_at:
        key.status = 'EXPIRED'
        key.save(update_fields=['status'])
        return 'Mã kích hoạt đã hết hạn. Vui lòng liên hệ admin để được cấp mã mới.'

    if normalize_key(key.key) != normalized:
        key.attempts += 1
        fields = ['attempts']
        if key.attempts >= settings.DEVICE_ACTIVATION_MAX_ATTEMPTS:
            key.status = 'REVOKED'
            key.revoked_at = timezone.now()
            fields += ['status', 'revoked_at']
            message = 'Nhập sai mã quá số lần cho phép. Vui lòng liên hệ admin để được cấp mã mới.'
        else:
            remaining = settings.DEVICE_ACTIVATION_MAX_ATTEMPTS - key.attempts
            message = f'Mã kích hoạt không đúng. Bạn còn {remaining} lần thử.'
        key.save(update_fields=fields)
        return message

    return None


def consume_activation_key(key, device, ip: str | None) -> None:
    """
    Mark a verified key as spent. Called INSIDE the bind transaction so the key
    and the device it created commit together, or neither does.

    Re-reads under a row lock: verify and consume are separate transactions, so a
    concurrent activation could have spent the key in between.
    """
    locked = (
        DeviceActivationKey.objects.select_for_update()
        .filter(pk=key.pk, status='ISSUED')
        .first()
    )
    if locked is None:
        raise ActivationError('Mã kích hoạt vừa được sử dụng. Vui lòng liên hệ admin.')

    locked.status = 'USED'
    locked.used_at = timezone.now()
    locked.used_device = device
    locked.used_ip = ip
    locked.save(update_fields=['status', 'used_at', 'used_device', 'used_ip'])


def send_activation_email(user, key) -> None:
    """Render and send the activation code email over the configured SMTP backend."""
    from django.core.mail import EmailMessage
    from django.template.loader import render_to_string

    context = {
        'display_name': user.first_name or user.username,
        'activation_key': key.key,
        'expires_at': key.expires_at,
        'ttl_days': settings.DEVICE_ACTIVATION_KEY_TTL_DAYS,
    }
    email = EmailMessage(
        subject='Mã kích hoạt thiết bị — Thiên Thư',
        body=render_to_string('emails/device_activation_key.html', context),
        from_email=None,  # uses DEFAULT_FROM_EMAIL
        to=[user.email],
    )
    email.content_subtype = 'html'
    email.send(fail_silently=False)
