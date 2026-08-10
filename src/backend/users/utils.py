import re


def get_client_ip(request) -> str | None:
    """
    Extract the real client IP from request headers.
    Handles X-Forwarded-For (set by Nginx / load balancers) before falling back to REMOTE_ADDR.
    """
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        # X-Forwarded-For: client, proxy1, proxy2 — take the first (leftmost) address
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or None


def normalize_device_key(device_id: str) -> str:
    """
    Reduce a client device_id to the part that stably identifies the device.

    Web clients send "web_<fingerprint>_<uuid8>", where the trailing segment is
    derived from a localStorage UUID and gets regenerated whenever the browser
    clears site data (private window, Safari ITP eviction, manual clear). Only
    the first two segments identify the physical device, so device lookups match
    on this key instead of the full string.

    IDs with fewer than three segments (e.g. the fingerprint-less fallback
    "web_<uuid>") are returned unchanged.
    """
    parts = (device_id or '').split('_')
    if len(parts) > 2:
        return '_'.join(parts[:2])
    return device_id or ''


def parse_device_name(ua_string: str) -> str:
    """
    Parse a User-Agent string into a human-readable device name.
    Returns strings like "Chrome 120 / Windows", "Safari / iPhone", "Firefox 121 / macOS".
    """
    if not ua_string:
        return 'Web Browser'

    # ── Browser detection (order matters — check specific ones first) ──
    if m := re.search(r'Edg/(\d+)', ua_string):
        browser = f"Edge {m.group(1)}"
    elif m := re.search(r'OPR/(\d+)', ua_string):
        browser = f"Opera {m.group(1)}"
    elif m := re.search(r'Firefox/(\d+)', ua_string):
        browser = f"Firefox {m.group(1)}"
    elif m := re.search(r'(?<!like )Chrome/(\d+)', ua_string):
        # Exclude "like Chrome" in some UA strings
        browser = f"Chrome {m.group(1)}"
    elif 'Safari/' in ua_string:
        browser = 'Safari'
    else:
        browser = 'Browser'

    # ── OS / Device detection ──
    if 'iPhone' in ua_string:
        os_name = 'iPhone'
    elif 'iPad' in ua_string:
        os_name = 'iPad'
    elif 'Android' in ua_string:
        os_name = 'Android'
    elif 'Windows NT' in ua_string:
        os_name = 'Windows'
    elif 'Mac OS X' in ua_string:
        os_name = 'macOS'
    elif 'Linux' in ua_string:
        os_name = 'Linux'
    else:
        os_name = 'Unknown OS'

    return f"{browser} / {os_name}"
