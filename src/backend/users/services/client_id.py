"""Client identifier helpers for mobile devices (feature-34 §7.3)."""

import hashlib
import secrets

from django.db import IntegrityError

from ..constants import ANDROID_ID_DENYLIST, CLIENT_CODE_PREFIX

_MAX_ATTEMPTS = 5
_HEX_DIGITS = set('0123456789abcdef')


def generate_client_code(seed: str) -> str:
    """
    Build a short, human-readable identifier for a mobile device: MC-7F3A2B91.

    Called exactly once, when the row is created. The code must never be
    recomputed afterwards: device_id changes in place when a client re-binds
    after a reinstall, and support workflows depend on the code being stable.
    """
    from ..models import MobileDevice

    for attempt in range(_MAX_ATTEMPTS):
        salt = '' if attempt == 0 else secrets.token_hex(4)
        digest = hashlib.sha256(f'{seed}{salt}'.encode()).hexdigest()
        code = f'{CLIENT_CODE_PREFIX}-{digest[:8].upper()}'
        if not MobileDevice.objects.filter(client_code=code).exists():
            return code

    raise IntegrityError('Unable to allocate a unique client_code.')


def normalize_hardware_hash(raw: str | None) -> str | None:
    """
    Validate a client-supplied hardware anchor.

    Returns None for anything unusable so the caller falls back to treating the
    login as a brand-new device. The value is a trust hint used to relax the
    device check, never an authorisation input.
    """
    value = (raw or '').strip().lower()
    if len(value) != 64 or not set(value) <= _HEX_DIGITS:
        return None
    if value in ANDROID_ID_DENYLIST:
        return None
    return value
