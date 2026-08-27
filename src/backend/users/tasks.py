import logging
import threading
import time

from celery import shared_task
from django.apps import apps
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

RATE_LIMIT_DELAY = 0.1  # seconds between requests to avoid bursting ipinfo.io

# Both device tables carry the same geo columns, so save_geo_to_device() works on
# either one (see users.services.geo).
GEO_DEVICE_MODELS = ('users.UserDevice', 'users.MobileDevice')


@shared_task(name="users.backfill_device_geo")
def backfill_device_geo():
    """Periodic Celery task: fetch geo for devices that have last_ip but no geo data yet."""
    from users.services.geo import save_geo_to_device

    total = success = 0
    for label in GEO_DEVICE_MODELS:
        qs = apps.get_model(label).objects.filter(geo_fetched_at=None).exclude(last_ip=None)
        count = qs.count()
        total += count
        if not count:
            continue
        logger.info("backfill_device_geo: processing %d %s(s)", count, label)
        for device in qs.iterator():
            if save_geo_to_device(device):
                success += 1
            time.sleep(RATE_LIMIT_DELAY)

    if not total:
        logger.info("backfill_device_geo: no devices to process")
        return
    logger.info("backfill_device_geo: %d/%d updated", success, total)


@shared_task(name="users.expire_activation_keys")
def expire_activation_keys():
    """
    Mark overdue activation keys EXPIRED.

    Cosmetic only — it keeps the admin list readable. Redemption never trusts the
    status alone: verify_activation_key() re-checks expires_at on every attempt.
    """
    from django.utils import timezone

    from users.models import DeviceActivationKey

    updated = DeviceActivationKey.objects.filter(
        status='ISSUED', expires_at__lt=timezone.now(),
    ).update(status='EXPIRED')
    logger.info("expire_activation_keys: %d key(s) expired", updated)
    return updated


def fetch_and_save_device_geo(model_label: str, pk: int) -> None:
    """Fetch geo for one device and persist. Runs in a background thread."""
    from django.db import connection

    from users.services.geo import save_geo_to_device

    try:
        device = apps.get_model(model_label).objects.get(pk=pk)
        save_geo_to_device(device)
    except ObjectDoesNotExist:
        logger.warning("Device %s:%s not found, skipping geo fetch", model_label, pk)
    except Exception:
        logger.exception("fetch_and_save_device_geo failed for %s:%s", model_label, pk)
    finally:
        # Django opens a connection per thread and never reclaims it for threads
        # it did not spawn, so a fire-and-forget worker has to hand it back.
        connection.close()


def trigger_geo_fetch(model_label: str, pk: int) -> None:
    """Fire-and-forget: launch a daemon thread to fetch geo for a device."""
    t = threading.Thread(
        target=fetch_and_save_device_geo,
        args=(model_label, pk),
        daemon=True,
    )
    t.start()
