import logging
import threading
import time

from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

RATE_LIMIT_DELAY = 0.1  # seconds between requests to avoid bursting ipinfo.io


@shared_task(name="users.backfill_device_geo")
def backfill_device_geo():
    """Periodic Celery task: fetch geo for devices that have last_ip but no geo data yet."""
    from users.models import UserDevice
    from users.services.geo import save_geo_to_device

    qs = UserDevice.objects.filter(geo_fetched_at=None).exclude(last_ip=None)
    total = qs.count()
    if not total:
        logger.info("backfill_device_geo: no devices to process")
        return

    logger.info("backfill_device_geo: processing %d device(s)", total)
    success = 0
    for device in qs.iterator():
        if save_geo_to_device(device):
            success += 1
        time.sleep(RATE_LIMIT_DELAY)

    logger.info("backfill_device_geo: %d/%d updated", success, total)


def fetch_and_save_device_geo(device_id: int) -> None:
    """Fetch geo for one device and persist. Runs in a background thread."""
    from users.models import UserDevice
    from users.services.geo import save_geo_to_device

    try:
        device = UserDevice.objects.get(pk=device_id)
        save_geo_to_device(device)
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
