import ipaddress
import logging

import requests
from django.conf import settings
from django.utils import timezone

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


def save_geo_to_device(device) -> bool:
    """
    Fetch geo for a device's last_ip and persist the result.
    Returns True if geo was saved, False if skipped or failed.
    """
    if not device.last_ip:
        return False
    geo = fetch_geo_by_ip(device.last_ip)
    if not geo:
        return False
    device.geo_city = geo["city"]
    device.geo_region = geo["region"]
    device.geo_country_code = geo["country_code"]
    device.geo_fetched_at = timezone.now()
    device.save(update_fields=[
        "geo_city", "geo_region", "geo_country_code", "geo_fetched_at",
    ])
    return True


def _is_private_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        if addr.is_private:
            return True
        # Skip network gateway addresses (e.g. 172.20.0.1, 192.168.x.1, 10.x.x.1)
        # These appear when Django receives requests via Docker bridge without a real proxy IP.
        if int(addr) & 0xFF == 1:
            return True
        return False
    except ValueError:
        return False
