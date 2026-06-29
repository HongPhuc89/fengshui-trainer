import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import UserDevice
from users.services.geo import fetch_geo_by_ip

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
        self.stdout.write(f"Processing {total} device(s)...")

        success = 0
        for device in qs.iterator():
            geo = fetch_geo_by_ip(device.last_ip)
            if geo:
                device.geo_city = geo["city"]
                device.geo_region = geo["region"]
                device.geo_country_code = geo["country_code"]
                device.geo_fetched_at = timezone.now()
                device.save(update_fields=[
                    "geo_city", "geo_region", "geo_country_code", "geo_fetched_at",
                ])
                success += 1
            else:
                self.stdout.write(f"  skip device {device.pk} (IP: {device.last_ip})")
            time.sleep(RATE_LIMIT_DELAY)

        self.stdout.write(self.style.SUCCESS(f"Done: {success}/{total} updated."))
