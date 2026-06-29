import ipaddress
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

IPINFO_TIMEOUT = 5  # seconds


def fetch_geo_by_ip(ip: str) -> dict | None:
    """
    Fetch geographic location for an IP address via ipinfo.io.

    Returns a normalized dict on success, None if the IP is private,
    bogon, or the request fails.

    Return shape:
        {"city": str, "region": str, "country_code": str}
    """
    if not ip or _is_private_ip(ip):
        return None

    token = getattr(settings, "IPINFO_TOKEN", "")
    url = f"https://ipinfo.io/{ip}/json"
    params = {"token": token} if token else {}

    try:
        resp = requests.get(url, params=params, timeout=IPINFO_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        if data.get("bogon"):
            return None

        return {
            "city": data.get("city") or "",
            "region": data.get("region") or "",
            "country_code": data.get("country") or "",
        }
    except requests.exceptions.RequestException as e:
        logger.warning("ipinfo.io request failed for IP %s: %s", ip, e)
        return None
    except ValueError:
        logger.warning("ipinfo.io malformed JSON for IP %s", ip)
        return None


def _is_private_ip(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return False
