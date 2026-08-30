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
from django.db.models import Count
from django.utils import timezone

from ..constants import PAIRING_ALPHABET, PAIRING_BODY_LENGTH, PAIRING_PREFIX
from ..models import MobileDevice, User
from ..utils import get_client_ip
from .client_id import generate_client_code
from .tokens import blacklist_tokens_for_devices

logger = logging.getLogger(__name__)
_MAX_CODE_ATTEMPTS = 5


class SlotError(Exception):
    """Raised with a user-facing Vietnamese message when a slot cannot be issued or claimed."""


def _generate_unique_pairing_code() -> str:
    """
    Draw a Crockford Base32 body until it is unused, then format it in groups of four.

    Bodies starting with the prefix are rejected. Both sides strip a leading "TT"
    when normalising, so a body of "TTAB..." would normalise differently
    depending on whether the user typed the prefix — and the code could never be
    redeemed. Excluding them costs ~0.1% of the keyspace and removes the ambiguity.
    """
    for _ in range(_MAX_CODE_ATTEMPTS):
        body = ''.join(secrets.choice(PAIRING_ALPHABET) for _ in range(PAIRING_BODY_LENGTH))
        if body.startswith(PAIRING_PREFIX):
            continue
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


# Offered on the admin add form. Free text stays free text — this is an audit
# note, not a taxonomy — but typing the same sentence by hand every time invites
# near-duplicates that make the log hard to read later (feature-35 §6.3).
ISSUED_REASON_PRESETS = (
    'User đổi máy mới',
    'Máy cũ hỏng hoặc bị mất',
    'Cấp thêm máy theo hợp đồng',
    'Khách hàng mới onboard',
)

# Written by the add form when the admin leaves the field empty; suggesting it
# back would just spread a placeholder.
AUTO_ISSUED_REASON = 'Issued from Mobile Device admin'


def issued_reason_suggestions(limit: int = 12) -> list[str]:
    """
    Presets first, then reasons this deployment has actually used.

    Ordered by how often each has been used so the common ones surface, and
    de-duplicated case-insensitively against the presets — otherwise a preset
    typed once by hand would come back as a second, near-identical option.
    """
    seen = {preset.casefold() for preset in ISSUED_REASON_PRESETS}
    suggestions = list(ISSUED_REASON_PRESETS)

    used = (
        MobileDevice.objects
        .exclude(issued_reason='')
        .exclude(issued_reason=AUTO_ISSUED_REASON)
        .values('issued_reason')
        .annotate(uses=Count('id'))
        .order_by('-uses', 'issued_reason')
    )
    for row in used:
        reason = row['issued_reason'].strip()
        key = reason.casefold()
        if not reason or key in seen:
            continue
        seen.add(key)
        suggestions.append(reason)
        if len(suggestions) >= limit:
            break
    return suggestions


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
        candidates = list(
            MobileDevice.objects.select_for_update()
            .filter(user=user, status='UNCLAIMED')
            .order_by('created_at')
        )
        slot, error = _match_slot(candidates, normalized)
    # Transaction has committed here — the attempt counter is durable.

    if error:
        raise SlotError(error)
    return slot


def _match_slot(candidates, normalized: str):
    """
    Find the slot this code opens, persisting expiry and attempt changes.

    Matches on the code across every unclaimed slot rather than picking the
    oldest one: a refreshed slot keeps its original created_at, so ordering
    would hand back a slot the user is not holding a code for (feature-35 §4.1).
    """
    if not candidates:
        return None, 'Chưa có slot thiết bị nào được cấp cho tài khoản này. Vui lòng liên hệ admin.'

    live = _expire_stale(candidates)
    if not live:
        return None, 'Mã đã hết hạn. Vui lòng liên hệ admin để được cấp mã mới.'

    for slot in live:
        if normalize_code(slot.pairing_code) == normalized:
            return slot, None

    return None, _burn_attempt(live)


def _expire_stale(candidates) -> list:
    """Mark every timed-out slot EXPIRED and return the ones still claimable."""
    now = timezone.now()
    live = []
    for slot in candidates:
        if now >= slot.expires_at:
            slot.status = 'EXPIRED'
            slot.save(update_fields=['status'])
        else:
            live.append(slot)
    return live


def _burn_attempt(live) -> str:
    """
    Charge a wrong code to every live slot and build the message.

    Each live slot is a candidate the attempt could have been aimed at, so all of
    them burn a try — counting on just one would leave the others open to
    grinding with a stolen password.
    """
    remaining = []
    for slot in live:
        slot.claim_attempts += 1
        fields = ['claim_attempts']
        if slot.claim_attempts >= settings.DEVICE_PAIRING_MAX_ATTEMPTS:
            slot.status = 'EXPIRED'
            fields.append('status')
            # min(remaining) below would hide this from the user entirely when a
            # sibling slot still has tries left, so leave a trace.
            logger.warning('Pairing slot %s burnt out after %s wrong attempts',
                           slot.client_code, slot.claim_attempts)
        else:
            remaining.append(settings.DEVICE_PAIRING_MAX_ATTEMPTS - slot.claim_attempts)
        slot.save(update_fields=fields)

    if not remaining:
        return 'Nhập sai mã quá số lần cho phép. Vui lòng liên hệ admin để được cấp mã mới.'
    return f'Mã không đúng. Bạn còn {min(remaining)} lần thử.'


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
    try:
        locked.save()
    except IntegrityError:
        # uniq_mobile_device_id_per_user / uniq_mobile_hardware_per_user: this
        # handset already holds another live slot of the same user. The
        # constraint is right to refuse; only the 500 would be wrong.
        raise SlotError(
            'Máy này đang dùng một slot khác của chính tài khoản bạn. '
            'Vui lòng liên hệ admin để gỡ liên kết slot cũ trước.'
        )
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


# Cleared on refresh: the row goes back to describing a slot that is waiting for
# a handset, so any leftover handset detail would describe a phone that no longer
# holds it. Split by nullability — device_type is CharField(blank=True) with
# null=False, so clearing it to None would violate NOT NULL.
_NULLABLE_HANDSET_FIELDS = (
    'device_id', 'hardware_hash', 'device_name', 'device_model', 'os_version',
    'app_version', 'last_ip', 'geo_city', 'geo_region', 'geo_country_code',
    'geo_fetched_at', 'claimed_at', 'claim_ip', 'bound_at',
)
_BLANK_HANDSET_FIELDS = ('device_type',)
_HANDSET_FIELDS = _NULLABLE_HANDSET_FIELDS + _BLANK_HANDSET_FIELDS


def _serialise(value):
    """
    Make a field value safe for AdminAuditLog.change_log.

    change_log is a plain JSONField with no encoder=DjangoJSONEncoder, so a
    datetime would raise TypeError on save.
    """
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def refresh_slot(slot) -> dict:
    """
    Reset an occupied slot back to UNCLAIMED so a different handset can take it.

    Keeps client_code and the row itself: the slot is the user's identity, not
    the phone's, so a device change must not fragment the history into a new row
    (feature-35 §3.1).

    Takes no staff argument — issued_by records who allocated the slot and must
    survive a refresh; the audit row is written by the caller.

    Returns the snapshot of the handset that was released, for the audit log.
    """
    if slot.status not in MobileDevice.OCCUPYING:
        raise SlotError(
            f'Slot {slot.client_code} đang ở trạng thái {slot.status}, không làm mới được. '
            f'Dùng "Cấp slot thiết bị mới" nếu cần thêm chỗ.'
        )

    with transaction.atomic():
        locked = MobileDevice.objects.select_for_update().get(pk=slot.pk)
        before = {f: _serialise(getattr(locked, f)) for f in _HANDSET_FIELDS}
        before['status'] = locked.status
        before['pairing_code'] = locked.pairing_code

        # Blacklist BEFORE clearing device_id — the helper matches outstanding
        # tokens on that exact claim, so clearing first would find nothing.
        if locked.status == 'ACTIVE' and locked.device_id:
            blacklist_tokens_for_devices(locked.user, [locked.device_id])

        for field in _NULLABLE_HANDSET_FIELDS:
            setattr(locked, field, None)
        for field in _BLANK_HANDSET_FIELDS:
            setattr(locked, field, '')
        locked.status = 'UNCLAIMED'
        locked.pairing_code = _generate_unique_pairing_code()
        locked.expires_at = timezone.now() + timedelta(days=settings.DEVICE_PAIRING_TTL_DAYS)
        locked.claim_attempts = 0
        locked.save()

    return before
