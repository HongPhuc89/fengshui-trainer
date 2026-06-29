import logging
import threading

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

logger = logging.getLogger(__name__)


def fetch_and_save_device_geo(device_id: int) -> None:
    """Fetch geo for one device and persist. Runs in a background thread."""
    from users.models import UserDevice
    from users.services.geo import fetch_geo_by_ip

    try:
        device = UserDevice.objects.get(pk=device_id)
        if not device.last_ip:
            return
        geo = fetch_geo_by_ip(device.last_ip)
        if geo:
            device.geo_city = geo["city"]
            device.geo_region = geo["region"]
            device.geo_country_code = geo["country_code"]
            device.geo_fetched_at = timezone.now()
            device.save(update_fields=[
                "geo_city", "geo_region", "geo_country_code", "geo_fetched_at",
            ])
    except ObjectDoesNotExist:
        logger.warning("Device %s not found, skipping geo fetch", device_id)
    except Exception:
        logger.exception("fetch_and_save_device_geo failed for device_id=%s", device_id)


def trigger_geo_fetch(device_id: int) -> None:
    """Fire-and-forget: launch a daemon thread to fetch geo for a device."""
    t = threading.Thread(
        target=fetch_and_save_device_geo,
        args=(device_id,),
        daemon=True,
    )
    t.start()
