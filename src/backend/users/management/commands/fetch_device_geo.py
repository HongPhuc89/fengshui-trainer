import logging
import time

from django.apps import apps
from django.core.management.base import BaseCommand

from users.services.geo import save_geo_to_device
from users.tasks import GEO_DEVICE_MODELS

logger = logging.getLogger(__name__)

RATE_LIMIT_DELAY = 0.1  # seconds between requests to avoid bursting ipinfo.io

MODEL_CHOICES = {
    'web': ('users.UserDevice',),
    'mobile': ('users.MobileDevice',),
    'all': GEO_DEVICE_MODELS,
}


class Command(BaseCommand):
    help = "Fetch IP geo location for devices with a known last_ip."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Re-fetch even devices that already have geo data.",
        )
        parser.add_argument(
            "--model",
            choices=sorted(MODEL_CHOICES),
            default='all',
            help="Which device table to process (default: all).",
        )
        parser.add_argument(
            "--device-id",
            type=int,
            metavar="ID",
            help="Fetch for a single device by primary key. Use with --model.",
        )

    def handle(self, *args, **options):
        total = success = 0

        for label in MODEL_CHOICES[options["model"]]:
            qs = apps.get_model(label).objects.exclude(last_ip=None)

            if options.get("device_id"):
                qs = qs.filter(pk=options["device_id"])
            elif not options.get("all"):
                qs = qs.filter(geo_fetched_at=None)

            count = qs.count()
            total += count
            logger.info("fetch_device_geo: processing %d %s(s)", count, label)

            for device in qs.iterator():
                if save_geo_to_device(device):
                    success += 1
                else:
                    logger.info(
                        "fetch_device_geo: skip %s %s (IP: %s)", label, device.pk, device.last_ip
                    )
                time.sleep(RATE_LIMIT_DELAY)

        logger.info("fetch_device_geo: %d/%d updated", success, total)
