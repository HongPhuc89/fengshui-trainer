"""
Verify Bunny Storage Zone credentials and CDN reachability.

Usage:
    python manage.py verify_bunny_config

Checks (in order):
    1. All 4 BUNNY_STORAGE_* env vars are set.
    2. Storage API is reachable and credentials are valid (upload a 16-byte test file).
    3. CDN Pull Zone serves the uploaded file (HTTP GET, measures latency).
    4. Test file is cleaned up via Storage API DELETE.
    5. Warns if BUNNY_STORAGE_REGION is not "sg" (recommended for SEA users).

Exit codes:
    0 — all critical checks passed (CDN warn is non-fatal).
    1 — missing env vars or Storage API upload failed.
"""

import time

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from books.services.pdf_encryption import _bunny_storage_base_url

_TEST_FILE = "_verify_bunny_config_test.bin"
_TEST_DATA = b"\x00" * 16  # 16 zero bytes — minimal payload, safe to expose


class Command(BaseCommand):
    help = "Verify Bunny Storage Zone credentials and CDN reachability."

    def handle(self, *args, **options):
        # ── Step 1: check env vars ─────────────────────────────────────────
        required = {
            "BUNNY_STORAGE_ZONE": getattr(settings, "BUNNY_STORAGE_ZONE", ""),
            "BUNNY_STORAGE_API_KEY": getattr(settings, "BUNNY_STORAGE_API_KEY", ""),
            "BUNNY_STORAGE_CDN_HOSTNAME": getattr(settings, "BUNNY_STORAGE_CDN_HOSTNAME", ""),
            "BUNNY_STORAGE_REGION": getattr(settings, "BUNNY_STORAGE_REGION", ""),
        }
        all_set = True
        for key, val in required.items():
            display = "(not set)" if not val else ("******" if "zzzKEY" in key else val)
            if val:
                self.stdout.write(self.style.SUCCESS(f"[OK]   {key:<30} = {display}"))
            else:
                self.stdout.write(self.style.ERROR(f"[FAIL] {key:<30} = {display}"))
                all_set = False

        if not all_set:
            self.stdout.write(self.style.ERROR(
                "[ERROR] Missing required settings. Set all BUNNY_STORAGE_* vars in .env and retry."
            ))
            raise SystemExit(1)

        zone = settings.BUNNY_STORAGE_ZONE
        api_key = settings.BUNNY_STORAGE_API_KEY
        cdn_hostname = settings.BUNNY_STORAGE_CDN_HOSTNAME
        region = getattr(settings, "BUNNY_STORAGE_REGION", "sg")
        base = _bunny_storage_base_url(region)
        # base = "https://storage.bunnycdn.com"
        storage_url = f"{base}/{zone}/{_TEST_FILE}"

        # ── Step 5: region advisory (shown early so user sees it) ──────────
        if region != "sg":
            self.stdout.write(self.style.WARNING(
                f'[WARN] BUNNY_STORAGE_REGION={region!r} — "sg" (Singapore) is recommended '
                f"for Vietnam/SEA users to minimise latency."
            ))

        # ── Step 2: Storage API upload ─────────────────────────────────────
        try:
            resp = requests.put(
                storage_url,
                data=_TEST_DATA,
                headers={
                    "AccessKey": api_key,
                    "Content-Type": "application/octet-stream",
                },
                timeout=15,
            )
            resp.raise_for_status()
            self.stdout.write(self.style.SUCCESS(
                f"[OK]   Storage API upload test  → HTTP {resp.status_code}"
            ))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(
                f"[FAIL] Storage API upload test  → {exc}"
            ))
            self.stdout.write(self.style.ERROR(
                "[ERROR] Cannot reach Bunny Storage API. Check BUNNY_STORAGE_ZONE, "
                "BUNNY_STORAGE_API_KEY, and BUNNY_STORAGE_REGION."
            ))
            raise SystemExit(1)

        # ── Step 3: CDN reachability ───────────────────────────────────────
        # CDN propagation after upload can take 10–60 s depending on PoP.
        # A failure here is a warning, not a fatal error — Storage credentials are still valid.
        cdn_url = f"https://{cdn_hostname}/{_TEST_FILE}"
        try:
            t0 = time.monotonic()
            resp = requests.get(cdn_url, timeout=15)
            latency_ms = int((time.monotonic() - t0) * 1000)
            resp.raise_for_status()
            self.stdout.write(self.style.SUCCESS(
                f"[OK]   CDN reachability test    → HTTP {resp.status_code} (latency: {latency_ms}ms)"
            ))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(
                f"[WARN] CDN reachability test    → {exc}\n"
                "       CDN may need a few seconds to propagate. Re-run to confirm, "
                "or check BUNNY_STORAGE_CDN_HOSTNAME."
            ))

        # ── Step 4: delete test file ───────────────────────────────────────
        try:
            resp = requests.delete(
                storage_url,
                headers={"AccessKey": api_key},
                timeout=15,
            )
            resp.raise_for_status()
            self.stdout.write(self.style.SUCCESS(
                f"[OK]   Storage API delete test  → HTTP {resp.status_code}"
            ))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(
                f"[WARN] Could not delete test file → {exc}\n"
                f"       Please delete '{_TEST_FILE}' manually from the Storage Zone."
            ))

        self.stdout.write(self.style.SUCCESS(
            "[OK]   Bunny Storage config is valid and ready."
        ))
