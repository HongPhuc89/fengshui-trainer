"""
Migrate existing encrypted .bin files from Supabase Storage → Bunny Storage Zone.

Each chapter is processed independently — a failure on one chapter is logged and
skipped without aborting the rest of the batch.

Usage:
    # Preview what would be migrated (no changes made):
    python manage.py migrate_bin_to_bunny --dry-run

    # Migrate all pending chapters:
    python manage.py migrate_bin_to_bunny

    # Migrate specific chapters by ID:
    python manage.py migrate_bin_to_bunny --chapter-ids 1,2,3

    # Re-upload even if the chapter already has a Bunny CDN URL:
    python manage.py migrate_bin_to_bunny --force-reupload

Migration steps per chapter:
    1. Skip if already migrated (URL starts with Bunny CDN hostname) — unless --force-reupload.
    2. Download the encrypted .bin from Supabase via S3 get_object.
    3. Upload to Bunny Storage Zone via HTTP PUT.
    4. Update BookChapter.encrypted_cdn_url → Bunny CDN URL.
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from books.models import BookChapter
from books.services.pdf_encryption import (
    build_bunny_cdn_url,
    encrypted_cdn_path,
    get_s3_client,
    upload_bin_to_bunny,
)


class Command(BaseCommand):
    help = "Migrate encrypted .bin chapter files from Supabase Storage to Bunny Storage Zone."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be migrated without making any changes.",
        )
        parser.add_argument(
            "--chapter-ids",
            type=str,
            default="",
            help="Comma-separated list of chapter IDs to migrate (e.g. 1,2,3). Default: all pending.",
        )
        parser.add_argument(
            "--force-reupload",
            action="store_true",
            help="Re-upload even if the chapter already has a Bunny CDN URL.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force_reupload = options["force_reupload"]
        chapter_ids_raw = options["chapter_ids"].strip()

        bunny_hostname = getattr(settings, "BUNNY_STORAGE_CDN_HOSTNAME", "")
        if not bunny_hostname:
            self.stderr.write(self.style.ERROR(
                "[ERROR] BUNNY_STORAGE_CDN_HOSTNAME is not set. "
                "Run verify_bunny_config first."
            ))
            raise SystemExit(1)

        bunny_prefix = f"https://{bunny_hostname}/"

        # Build queryset — only chapters that have already been encrypted
        qs = BookChapter.objects.filter(
            encrypted_cdn_url__isnull=False,
            file_path__isnull=False,
        ).exclude(file_path="").select_related("book")

        if chapter_ids_raw:
            try:
                ids = [int(x.strip()) for x in chapter_ids_raw.split(",") if x.strip()]
            except ValueError:
                self.stderr.write(self.style.ERROR(
                    "[ERROR] --chapter-ids must be a comma-separated list of integers."
                ))
                raise SystemExit(1)
            qs = qs.filter(id__in=ids)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No chapters found to migrate."))
            return

        if dry_run:
            self.stdout.write(f"[DRY-RUN] Found {total} chapter(s). Preview:")

        s3 = get_s3_client()
        migrated = skipped = errors = 0

        for chapter in qs.iterator():
            label = (
                f"[{chapter.book.title} / ch.{chapter.order} "
                f"(id={chapter.id}, v{chapter.encryption_version})]"
            )

            # Skip already-migrated chapters unless --force-reupload
            already_on_bunny = chapter.encrypted_cdn_url.startswith(bunny_prefix)
            if already_on_bunny and not force_reupload:
                self.stdout.write(f"  SKIP  {label} — already on Bunny CDN")
                skipped += 1
                continue

            if dry_run:
                action = "RE-UPLOAD" if already_on_bunny else "MIGRATE"
                self.stdout.write(f"  {action}  {label}")
                migrated += 1
                continue

            try:
                # Step 2: download from Supabase
                s3_key = encrypted_cdn_path(chapter.id, chapter.encryption_version)
                try:
                    obj = s3.get_object(
                        Bucket=settings.SUPABASE_STORAGE_BUCKET,
                        Key=s3_key,
                    )
                    data = obj["Body"].read()
                except Exception as exc:
                    self.stderr.write(self.style.ERROR(
                        f"  ERROR {label} — cannot download from Supabase ({exc}). "
                        f"File will need re-encryption (re-save the chapter in admin)."
                    ))
                    errors += 1
                    continue

                # Step 3: upload to Bunny
                try:
                    upload_bin_to_bunny(chapter.id, chapter.encryption_version, data)
                except Exception as exc:
                    self.stderr.write(self.style.ERROR(
                        f"  ERROR {label} — Bunny upload failed ({exc}). "
                        f"Chapter keeps its current URL."
                    ))
                    errors += 1
                    continue

                # Step 4: update DB
                try:
                    new_url = build_bunny_cdn_url(chapter.id, chapter.encryption_version)
                    BookChapter.objects.filter(pk=chapter.id).update(encrypted_cdn_url=new_url)
                except Exception as exc:
                    self.stderr.write(self.style.WARNING(
                        f"  WARN  {label} — file uploaded to Bunny but DB update failed ({exc}). "
                        f"Re-run this command to retry the DB update."
                    ))
                    errors += 1
                    continue

                self.stdout.write(self.style.SUCCESS(f"  OK    {label}"))
                migrated += 1

            except Exception as exc:
                # Catch-all: log and continue so one bad chapter doesn't stop the batch
                self.stderr.write(self.style.ERROR(f"  ERROR {label} — unexpected error: {exc}"))
                errors += 1

        # Summary
        self.stdout.write("")
        if dry_run:
            self.stdout.write(f"[DRY-RUN] Would migrate: {migrated} | Skip: {skipped} | Total: {total}")
        else:
            summary = f"Migrated: {migrated} | Skipped: {skipped} | Errors: {errors} | Total: {total}"
            if errors:
                self.stdout.write(self.style.WARNING(summary))
            else:
                self.stdout.write(self.style.SUCCESS(summary))
