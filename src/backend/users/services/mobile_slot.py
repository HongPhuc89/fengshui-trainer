"""
Device slots and pairing codes (feature-34 §7.5).

The verify/claim split is not stylistic. Counting a wrong attempt has to commit
even though the request fails, so it cannot share a transaction with the success
path's writes (see verify_pairing_code).
"""

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from ..constants import PAIRING_ALPHABET, PAIRING_BODY_LENGTH, PAIRING_PREFIX
from ..models import MobileDevice, User
from ..utils import get_client_ip
from .client_id import generate_client_code

logger = logging.getLogger(__name__)
_MAX_CODE_ATTEMPTS = 5


class SlotError(Exception):
    """Raised with a user-facing Vietnamese message when a slot cannot be issued or claimed."""


def _generate_unique_pairing_code() -> str:
    """Draw a Crockford Base32 body until it is unused, then format it in groups of four."""
    for _ in range(_MAX_CODE_ATTEMPTS):
        body = ''.join(secrets.choice(PAIRING_ALPHABET) for _ in range(PAIRING_BODY_LENGTH))
        code = f'{PAIRING_PREFIX}-{body[0:4]}-{body[4:8]}-{body[8:12]}'
        if not MobileDevice.objects.filter(pairing_code=code).exists():
            return code
    raise IntegrityError('Unable to allocate a unique pairing code.')


def normalize_code(raw: str) -> str:
    """
    Canonicalise a code typed by a user.

    Uppercases, strips separators, and folds the characters the alphabet excludes
    onto their look-alikes (I/L -> 1, O -> 0), so a code read out over the phone
    still matches when the listener picks the wrong glyph.
    """
    value = (raw or '').upper().replace('-', '').replace(' ', '')
    value = value.replace('I', '1').replace('L', '1').replace('O', '0')
    if value.startswith(PAIRING_PREFIX):
        value = value[len(PAIRING_PREFIX):]
    return value


def issue_slot(user, staff, reason: str = '') -> MobileDevice:
    """
    Allocate an unclaimed device slot and mint its pairing code.

    The row lock serialises count-then-create: two admins clicking at the same
    moment would otherwise both read the same count and both allocate.
    """
    with transaction.atomic():
        locked = User.objects.select_for_update().get(pk=user.pk)
        taken = locked.mobile_devices.filter(status__in=MobileDevice.OCCUPYING).count()
        if taken >= locked.mobile_max_devices:
            raise SlotError(
                f'Đã dùng hết {locked.mobile_max_devices} thiết bị cho phép. '
                f'Gỡ liên kết máy cũ trước khi cấp slot mới.'
            )

        return MobileDevice.objects.create(
            user=locked,
            client_code=generate_client_code(secrets.token_hex(16)),
            pairing_code=_generate_unique_pairing_code(),
            status='UNCLAIMED',
            issued_by=staff,
            issued_reason=reason,
            expires_at=timezone.now() + timedelta(days=settings.DEVICE_PAIRING_TTL_DAYS),
        )


def verify_pairing_code(user, raw_code: str) -> MobileDevice:
    """
    Check a pairing code and record the attempt. Runs in its own transaction and
    MUST be called outside the caller's write transaction.

    A wrong code raises only after the incremented attempt counter has committed.
    Counting inside the caller's atomic block would roll the counter back
    together with the failed request, leaving the lockout permanently disarmed.
    """
    normalized = normalize_code(raw_code)

    with transaction.atomic():
        slot = (
            MobileDevice.objects.select_for_update()
            .filter(user=user, status='UNCLAIMED')
            .order_by('created_at')
            .first()
        )
        error = _check_slot(slot, normalized)
    # Transaction has committed here — the attempt counter is durable.

    if error:
        raise SlotError(error)
    return slot


def _check_slot(slot, normalized: str) -> str | None:
    """Validate a locked slot, persisting expiry and attempt changes."""
    if slot is None:
        return 'Chưa có slot thiết bị nào được cấp cho tài khoản này. Vui lòng liên hệ admin.'

    if timezone.now() >= slot.expires_at:
        slot.status = 'EXPIRED'
        slot.save(update_fields=['status'])
        return 'Mã đã hết hạn. Vui lòng liên hệ admin để được cấp mã mới.'

    if normalize_code(slot.pairing_code) != normalized:
        slot.claim_attempts += 1
        fields = ['claim_attempts']
        if slot.claim_attempts >= settings.DEVICE_PAIRING_MAX_ATTEMPTS:
            slot.status = 'EXPIRED'
            fields.append('status')
            message = 'Nhập sai mã quá số lần cho phép. Vui lòng liên hệ admin để được cấp mã mới.'
        else:
            remaining = settings.DEVICE_PAIRING_MAX_ATTEMPTS - slot.claim_attempts
            message = f'Mã không đúng. Bạn còn {remaining} lần thử.'
        slot.save(update_fields=fields)
        return message

    return None


def apply_handset_metadata(device, attrs, request) -> None:
    """Copy the handset details the client reported onto the row."""
    device.device_type = 'IOS' if attrs['platform_os'] == 'ios' else 'ANDROID'
    # device_name comes from the client: the Dio User-Agent ("Dart/3.x") tells us
    # nothing, so parse_device_name() is deliberately not used here.
    device.device_name = attrs.get('device_name') or attrs.get('device_model') or 'Mobile'
    device.device_model = attrs.get('device_model') or None
    device.os_version = attrs.get('os_version') or None
    device.app_version = attrs.get('app_version') or None
    device.last_ip = get_client_ip(request)


def claim_slot(slot, attrs, hardware_hash, request) -> MobileDevice:
    """
    Bind a handset to a verified slot. Called INSIDE the login transaction so the
    slot and the handset details commit together, or neither does.

    Re-reads under a row lock: verify and claim are separate transactions, so a
    concurrent request could have taken the slot in between.
    """
    locked = (
        MobileDevice.objects.select_for_update()
        .filter(pk=slot.pk, status='UNCLAIMED')
        .first()
    )
    if locked is None:
        raise SlotError('Slot này vừa được sử dụng. Vui lòng liên hệ admin.')

    locked.device_id = attrs['device_id']
    locked.hardware_hash = hardware_hash
    locked.status = 'ACTIVE'
    locked.claimed_at = timezone.now()
    locked.claim_ip = get_client_ip(request)
    locked.bound_at = timezone.now()
    apply_handset_metadata(locked, attrs, request)
    locked.save()
    return locked


def rebind_known_handset(device, attrs, hardware_hash, request) -> None:
    """
    Refresh the metadata of a handset that already holds a live slot.

    Revokes nothing: with slots, being here means the handset already owns its
    place, and every other slot of this user is one staff deliberately allocated.
    """
    device.hardware_hash = hardware_hash or device.hardware_hash
    apply_handset_metadata(device, attrs, request)
    device.save()
