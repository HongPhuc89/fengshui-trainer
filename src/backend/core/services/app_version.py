"""Parsing and comparing mobile app versions (feature-36 §6.1)."""

from ..models import AppRelease

# Verdicts the client acts on. Computed server-side so the policy lives in one
# place and the server sees which versions are still out there.
STATUS_BLOCKED = 'BLOCKED'
STATUS_AVAILABLE = 'AVAILABLE'
STATUS_UP_TO_DATE = 'UP_TO_DATE'

PLATFORM_BY_PARAM = {
    'android': AppRelease.PLATFORM_ANDROID,
    'ios': AppRelease.PLATFORM_IOS,
}


def parse_version_code(raw) -> int | None:
    """
    Pull the build number out of either form the clients send.

    The endpoint sends a bare int; MobileDevice.app_version stores "1.0.0+7".
    Returns None when it cannot be determined — every caller must then skip
    enforcement rather than guess (feature-36 §4.1). Blocking on a parse failure
    would lock users out over a formatting slip.
    """
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    if '+' in text:
        text = text.rsplit('+', 1)[1]
    try:
        value = int(text)
    except ValueError:
        return None
    return value if value >= 0 else None


def resolve_status(release, client_version_code: int | None) -> str | None:
    """Compare a client against a release. None when the client version is unknown."""
    if client_version_code is None:
        return None
    if client_version_code < release.min_supported_version_code:
        return STATUS_BLOCKED
    if client_version_code < release.version_code:
        return STATUS_AVAILABLE
    return STATUS_UP_TO_DATE
