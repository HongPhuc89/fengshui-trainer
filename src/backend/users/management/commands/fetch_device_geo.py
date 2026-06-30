import logging
import time

from django.core.management.base import BaseCommand

from users.models import UserDevice
from users.services.geo import save_geo_to_device

logger = logging.getLogger(__name__)

RATE_LIMIT_DELAY = 0.1  # seconds between requests to avoid bursting ipinfo.io


class Command(BaseCommand):
    help = "Fetch IP geo location for UserDevices with a known last_ip."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Re-fetch even devices that already have geo data.",
        )
        parser.add_argument(
            "--device-id",
            type=int,
            metavar="ID",
            help="Fetch for a single device by primary key.",
        )

    def handle(self, *args, **options):
        qs = UserDevice.objects.exclude(last_ip=None)

        if options.get("device_id"):
            qs = qs.filter(pk=options["device_id"])
        elif not options.get("all"):
            qs = qs.filter(geo_fetched_at=None)

        total = qs.count()
        logger.info("fetch_device_geo: processing %d device(s)", total)

        success = 0
        for device in qs.iterator():
            if save_geo_to_device(device):
                success += 1
            else:
                logger.info("fetch_device_geo: skip device %s (IP: %s)", device.pk, device.last_ip)
            time.sleep(RATE_LIMIT_DELAY)

        logger.info("fetch_device_geo: %d/%d updated", success, total)
