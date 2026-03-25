from django.core.management.base import BaseCommand

from books.models import BookChapter
from books.services.pdf_encryption import get_s3_client
from django.conf import settings

S3_PREFIX = "encrypt_book/"


def _list_s3_files(s3, bucket: str) -> list[dict]:
    """Return all objects under encrypt_book/ prefix."""
    files = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=S3_PREFIX):
        files.extend(page.get("Contents", []))
    return files


def _parse_chapter_id(key: str) -> int | None:
    """Extract chapter_id from 'encrypt_book/v{version}/{chapter_id}.bin'."""
    try:
        stem = key.rsplit("/", 1)[-1]          # '{chapter_id}.bin'
        return int(stem.removesuffix(".bin"))
    except (ValueError, IndexError):
        return None


def _find_orphans(s3_files: list[dict], valid_ids: set[int]) -> list[dict]:
    orphans = []
    for obj in s3_files:
        chapter_id = _parse_chapter_id(obj["Key"])
        if chapter_id is None or chapter_id not in valid_ids:
            orphans.append(obj)
    return orphans


def _delete_objects(s3, bucket: str, keys: list[str]) -> int:
    payload = {"Objects": [{"Key": k} for k in keys]}
    resp = s3.delete_objects(Bucket=bucket, Delete=payload)
    errors = resp.get("Errors", [])
    for err in errors:
        print(f"  ERROR deleting {err['Key']}: {err['Message']}")
    return len(keys) - len(errors)


class Command(BaseCommand):
    help = "Find (and optionally delete) S3 files in encrypt_book/ not linked to any BookChapter."

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Delete orphan files from Supabase S3 (dry-run by default).",
        )

    def handle(self, *args, **options):
        bucket = settings.SUPABASE_STORAGE_BUCKET
        s3 = get_s3_client()

        self.stdout.write(f"Scanning bucket '{bucket}' prefix '{S3_PREFIX}'...")
        s3_files = _list_s3_files(s3, bucket)
        self.stdout.write(f"  Found {len(s3_files)} file(s) on S3.")

        valid_ids = set(BookChapter.objects.values_list("id", flat=True))
        self.stdout.write(f"  Found {len(valid_ids)} chapter(s) in DB.\n")

        orphans = _find_orphans(s3_files, valid_ids)

        if not orphans:
            self.stdout.write(self.style.SUCCESS("No orphan files found."))
            return

        self.stdout.write(self.style.WARNING(f"Orphan files ({len(orphans)}):"))
        for obj in orphans:
            size_kb = obj["Size"] / 1024
            self.stdout.write(f"  {obj['Key']}  ({size_kb:.1f} KB)")

        if not options["delete"]:
            self.stdout.write(
                self.style.WARNING("\nDry-run mode. Pass --delete to remove orphan files.")
            )
            return

        self.stdout.write("\nDeleting orphan files...")
        keys = [obj["Key"] for obj in orphans]
        deleted = _delete_objects(s3, bucket, keys)
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted}/{len(orphans)} orphan file(s)."))
