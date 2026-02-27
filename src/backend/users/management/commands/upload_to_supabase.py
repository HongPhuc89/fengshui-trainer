from botocore.exceptions import ClientError
from django.apps import apps
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from config.storage import SUPABASE_SYNC_TTL, LocalFirstSupabaseStorage

# All (app_label, model_name, field_name) with FileField / ImageField
MEDIA_FIELDS = [
    ("users", "User", "avatar"),
    ("books", "Book", "cover_image"),
    ("books", "BookChapter", "file_path"),
    ("videos", "VideoLesson", "thumbnail"),
]


class Command(BaseCommand):
    help = "Upload local media files to Supabase. Use --force to re-upload all (e.g. to refresh CacheControl headers)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-upload every file even if already on Supabase (updates CacheControl and other metadata).",
        )

    def handle(self, *args, **options):
        if not isinstance(default_storage, LocalFirstSupabaseStorage):
            self.stderr.write("Default storage is not LocalFirstSupabaseStorage. Aborting.")
            return

        storage = default_storage
        if not storage._is_configured():
            self.stderr.write("Supabase credentials not configured. Aborting.")
            return

        force = options["force"]
        s3 = storage._s3_client()
        bucket = settings.SUPABASE_STORAGE_BUCKET

        uploaded = already_synced = missing_local = errors = 0

        for app_label, model_name, field_name in MEDIA_FIELDS:
            Model = apps.get_model(app_label, model_name)
            qs = Model.objects.exclude(**{field_name: ""}).exclude(**{field_name: None})

            for obj in qs.iterator():
                name = getattr(obj, field_name).name
                if not name:
                    continue

                if not force:
                    # 1. Cache hit → already synced
                    if cache.get(f"supabase_sync:{name}"):
                        already_synced += 1
                        continue

                    # 2. Check S3 directly
                    try:
                        s3.head_object(Bucket=bucket, Key=name)
                        cache.set(f"supabase_sync:{name}", True, timeout=SUPABASE_SYNC_TTL)
                        already_synced += 1
                        continue
                    except ClientError as exc:
                        code = exc.response["Error"]["Code"]
                        if code not in ("404", "NoSuchKey"):
                            self.stderr.write(f"  S3 error for {name}: {exc}")
                            errors += 1
                            continue

                # 3. Local file must exist before uploading
                if not storage.exists(name):
                    self.stdout.write(self.style.WARNING(f"  [missing local] {name}"))
                    missing_local += 1
                    continue

                # 4. Upload (or re-upload with updated metadata when --force)
                try:
                    storage._upload(name)
                    cache.set(f"supabase_sync:{name}", True, timeout=SUPABASE_SYNC_TTL)
                    cache.delete(f"supabase_url:{name}")  # invalidate cached pre-signed URL
                    label = "[re-uploaded]" if force else "[uploaded]"
                    self.stdout.write(f"  {label} {name}")
                    uploaded += 1
                except Exception as exc:
                    self.stderr.write(f"  [error] {name}: {exc}")
                    errors += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. uploaded={uploaded}  already_synced={already_synced}"
            f"  missing_local={missing_local}  errors={errors}"
        ))
