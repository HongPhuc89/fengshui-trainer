# Feature 33 — Device IP Geolocation

## Document Information
- **Feature**: Device IP Geolocation via ipinfo.io
- **Status**: Draft
- **Created**: 2026-06-29

---

## Overview

Enrich `UserDevice` records with geographic location data (city, region, country) derived from the device's last known IP address, using ipinfo.io as the geolocation provider. Location data is displayed in the Django Admin for operational analysis.

---

## Requirements

- When a `UserDevice` is created, automatically fetch and save geo location from `last_ip` (async, non-blocking).
- Provide a Django management command to manually backfill or re-fetch geo data.
- Display `city` and `country_code` in the `UserDeviceAdmin` list view.
- The geo service must be loosely coupled — provider can be swapped without touching callers.
- No frontend changes required.

---

## Database

### Migration: `users/migrations/0008_userdevice_geo_fields.py`

Add 4 nullable fields to `users_userdevice`:

| Field | Type | Null | Description |
|---|---|---|---|
| `geo_city` | `VARCHAR(100)` | Yes | City name from ipinfo.io |
| `geo_region` | `VARCHAR(100)` | Yes | Region/state name |
| `geo_country_code` | `CHAR(2)` | Yes | Country ISO 3166-1 alpha-2 code (e.g. `VN`, `US`) |
| `geo_fetched_at` | `TIMESTAMP` | Yes | When geo was last fetched; `NULL` = not yet fetched |

> `geo_fetched_at = NULL` signals that geo has never been fetched or all attempts failed. The management command uses this to find devices that still need processing.
>
> `geo_country` is intentionally omitted — ipinfo.io returns `country` as ISO code only. Full country name can be mapped at the display layer if needed (e.g. via `pycountry`); storing a redundant copy in DB adds no value.

No indexes required — these fields are read-only display data.

---

## Backend

### File structure

```
src/backend/users/
├── services/
│   ├── __init__.py
│   └── geo.py                          # ipinfo.io wrapper (new)
├── tasks.py                            # background geo fetch (new)
├── signals.py                          # add on_device_created receiver (modify)
├── models/
│   └── device.py                       # add geo fields (modify)
├── admin.py                            # add geo columns to UserDeviceAdmin (modify)
└── management/
    └── commands/
        └── fetch_device_geo.py         # backfill command (new)
```

---

### 1. Model — `users/models/device.py`

Add geo fields to `UserDevice`:

```python
class UserDevice(BaseModel):
    # ... existing fields ...

    # Geo location (populated async after device creation)
    geo_city = models.CharField(max_length=100, null=True, blank=True)
    geo_region = models.CharField(max_length=100, null=True, blank=True)
    geo_country_code = models.CharField(max_length=2, null=True, blank=True)
    geo_fetched_at = models.DateTimeField(null=True, blank=True)
```

---

### 2. Geo service — `users/services/geo.py`

Wraps ipinfo.io. All ipinfo-specific logic lives here — callers only see `fetch_geo_by_ip(ip)`.

```python
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
```

> **ipinfo.io free tier:** Returns `country` as ISO 3166-1 alpha-2 code (`VN`, `US`). Both `geo_country` and `geo_country_code` store this code. If a human-readable country name is needed, map via `pycountry` at the display layer — do not store a second copy in DB.

---

### 3. Background task — `users/tasks.py`

Uses `threading.Thread` (daemon) — no additional dependency needed for 100 req/day. Interface is intentionally thin so it can be replaced with a Celery task later without changing callers.

```python
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
```

---

### 4. Signal — `users/signals.py`

Add one new receiver to the existing signals file:

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import UserDevice


@receiver(post_save, sender=UserDevice)
def on_device_created(sender, instance, created, **kwargs):
    """Trigger async geo fetch when a new device is registered."""
    if created and instance.last_ip:
        from users.tasks import trigger_geo_fetch
        trigger_geo_fetch(instance.pk)
```

---

### 5. Management command — `users/management/commands/fetch_device_geo.py`

```python
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
```

**Usage:**

```bash
# Fetch only devices with no geo yet (default)
docker-compose -f docker/docker-compose.yml exec web python manage.py fetch_device_geo

# Re-fetch all devices
docker-compose -f docker/docker-compose.yml exec web python manage.py fetch_device_geo --all

# Fetch a specific device
docker-compose -f docker/docker-compose.yml exec web python manage.py fetch_device_geo --device-id 42
```

---

### 6. Admin — `users/admin.py`

Modify `UserDeviceAdmin` to display geo fields:

```python
@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = (
        'device_name', 'user', 'device_type',
        'geo_city', 'geo_country_code',        # new
        'is_primary_bound', 'status', 'last_active',
    )
    list_filter = ('device_type', 'is_primary_bound', 'status', 'geo_country_code')  # geo_country_code new
    search_fields = ('device_id', 'device_name', 'user__username', 'user__phone_number')
    readonly_fields = (
        'device_id', 'last_ip', 'user_agent', 'last_active',
        'geo_city', 'geo_region', 'geo_country_code', 'geo_fetched_at',  # new
    )
    actions = ['revoke_devices']
    # ... existing action methods unchanged ...
```

---

### 7. Settings — `config/settings.py`

```python
# ipinfo.io API token (optional for free tier, required for higher rate limits)
IPINFO_TOKEN = env("IPINFO_TOKEN", default="")
```

Add to `.env` / `.env.example`:

```
IPINFO_TOKEN=
```

---

## Trade-off & Notes

| Topic | Decision |
|---|---|
| **Async mechanism** | `threading.Thread(daemon=True)` — zero extra dependency, sufficient for 100 req/day. To migrate to Celery later, replace `trigger_geo_fetch` body only; callers unchanged. |
| **Provider coupling** | All ipinfo.io logic is in `users/services/geo.py`. Swap provider by editing that file only. |
| **Private/bogon IPs** | Detected before calling the API → skip silently. Handles localhost dev and internal networks. |
| **Fetch failure** | `geo_fetched_at` stays `NULL` → device appears in next `fetch_device_geo` run (without `--all`). Note: `NULL` does not distinguish "never attempted" from "failed" — acceptable at current scale. |
| **IP change** | Signal triggers only on `created=True`. If `last_ip` changes on an existing device and re-fetch is needed, run the management command manually. |
| **Country storage** | Only `geo_country_code` (ISO code e.g. `VN`) is stored. Full country name is mapped at display layer if needed — no redundant column in DB. |
| **Rate limiting (command)** | `time.sleep(0.1)` between iterations in management command prevents bursting ipinfo.io when backfilling many devices. |
| **No index** | Geo fields are display-only. `geo_country_code` in `list_filter` uses Django's in-memory grouping, not a DB index — acceptable for admin use. |

---

## Implementation Order

1. `users/models/device.py` — add `geo_city`, `geo_region`, `geo_country_code`, `geo_fetched_at` fields
2. `users/migrations/0008_userdevice_geo_fields.py` — generate migration
3. `users/services/__init__.py` + `users/services/geo.py` — geo service
4. `users/tasks.py` — background task
5. `users/signals.py` — add `on_device_created` receiver
6. `users/management/commands/fetch_device_geo.py` — backfill command
7. `users/admin.py` — update `UserDeviceAdmin` (list_display, list_filter, readonly_fields)
8. `config/settings.py` + `.env.example` — `IPINFO_TOKEN`
