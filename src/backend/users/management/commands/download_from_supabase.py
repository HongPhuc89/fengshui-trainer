import os

from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from config.storage import SUPABASE_SYNC_TTL, LocalFirstSupabaseStorage


class Command(BaseCommand):
    help = "Download all Supabase media files that are missing locally."

    def handle(self, *args, **options):
        if not isinstance(default_storage, LocalFirstSupabaseStorage):
            self.stderr.write("Default storage is not LocalFirstSupabaseStorage. Aborting.")
            return

        storage = default_storage
        if not storage._is_configured():
            self.stderr.write("Supabase credentials not configured. Aborting.")
            return

        s3 = storage._s3_client()
        bucket = settings.SUPABASE_STORAGE_BUCKET

        downloaded = already_local = errors = 0

        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                local_path = os.path.join(settings.MEDIA_ROOT, key)

                if os.path.exists(local_path):
                    already_local += 1
                    cache.set(f"supabase_sync:{key}", True, timeout=SUPABASE_SYNC_TTL)
                    continue

                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                try:
                    s3.download_file(bucket, key, local_path)
                    cache.set(f"supabase_sync:{key}", True, timeout=SUPABASE_SYNC_TTL)
                    self.stdout.write(f"  [downloaded] {key}")
                    downloaded += 1
                except Exception as exc:
                    self.stderr.write(f"  [error] {key}: {exc}")
                    errors += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. downloaded={downloaded}  already_local={already_local}  errors={errors}"
        ))
