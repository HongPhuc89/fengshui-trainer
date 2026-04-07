from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import F

from books.models import BookChapter
from books.services.pdf_encryption import (
    build_bunny_cdn_url,
    build_encrypted_cdn_url,
    derive_chapter_key,
    encrypted_cdn_path,
    get_s3_client,
    upload_bin_to_bunny,
)


def _encrypt_and_upload_to_bunny(chapter: BookChapter) -> str:
    """Encrypt chapter PDF and upload to Bunny Storage Zone. Returns the public CDN URL."""
    with chapter.file_path.open("rb") as f:
        pdf_bytes = f.read()

    version = chapter.encryption_version
    key, iv = derive_chapter_key(chapter.id, version)
    encrypted = AESGCM(key).encrypt(iv, pdf_bytes, associated_data=None)

    upload_bin_to_bunny(chapter.id, version, encrypted)
    return build_bunny_cdn_url(chapter.id, version)


def _encrypt_and_upload_to_supabase(chapter: BookChapter, s3) -> str:
    """Encrypt chapter PDF and upload to Supabase. Returns the Supabase CDN URL (for rollback)."""
    with chapter.file_path.open("rb") as f:
        pdf_bytes = f.read()

    version = chapter.encryption_version
    key, iv = derive_chapter_key(chapter.id, version)
    encrypted = AESGCM(key).encrypt(iv, pdf_bytes, associated_data=None)

    cdn_path = encrypted_cdn_path(chapter.id, version)
    s3.put_object(
        Bucket=settings.SUPABASE_STORAGE_BUCKET,
        Key=cdn_path,
        Body=encrypted,
        ContentType="application/octet-stream",
        CacheControl="public, max-age=31536000, immutable",
    )
    return build_encrypted_cdn_url(chapter.id, version)


class Command(BaseCommand):
    help = (
        "Encrypt chapter PDFs and upload to Bunny Storage Zone (default) or Supabase "
        "(--target=supabase for rollback). Uploads to encrypt_book/v{version}/{id}.bin."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-encrypt all chapters (including those already encrypted). Increments encryption_version.",
        )
        parser.add_argument(
            "--id",
            type=int,
            dest="chapter_id",
            help="Encrypt a single chapter by ID.",
        )
        parser.add_argument(
            "--target",
            choices=["bunny", "supabase"],
            default="bunny",
            help="Storage target for the encrypted .bin upload (default: bunny). "
                 "Use --target=supabase to roll back to Supabase-hosted files.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        chapter_id = options.get("chapter_id")
        target = options["target"]

        qs = BookChapter.objects.filter(file_path__isnull=False).exclude(file_path="")
        if chapter_id:
            qs = qs.filter(id=chapter_id)
        elif not force:
            qs = qs.filter(encrypted_cdn_url__isnull=True)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No chapters need encryption."))
            return

        if force:
            # Increment version before encrypting so a fresh IV is derived for each chapter
            qs.update(encryption_version=F("encryption_version") + 1, encrypted_cdn_url=None)
            # Re-query to pick up the updated encryption_version values
            qs = BookChapter.objects.filter(file_path__isnull=False).exclude(file_path="")
            if chapter_id:
                qs = qs.filter(id=chapter_id)

        label_suffix = f"  [--force] [--target={target}]" if force else f"  [--target={target}]"
        self.stdout.write(f"Encrypting {total} chapter(s){label_suffix}...")

        # Only initialise the S3 client when uploading to Supabase
        s3 = get_s3_client() if target == "supabase" else None
        ok, failed = 0, []

        for chapter in qs.select_related("book").iterator():
            label = (
                f"[{chapter.book.title} / Chapter {chapter.order} "
                f"(id={chapter.id}, v{chapter.encryption_version})]"
            )
            try:
                if target == "bunny":
                    url = _encrypt_and_upload_to_bunny(chapter)
                else:
                    url = _encrypt_and_upload_to_supabase(chapter, s3)

                BookChapter.objects.filter(pk=chapter.id).update(encrypted_cdn_url=url)
                ok += 1
                self.stdout.write(f"  OK  {label}")
            except Exception as exc:
                failed.append(chapter.id)
                self.stderr.write(self.style.ERROR(f"  FAIL {label}: {exc}"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Done: {ok}/{total} succeeded."))
        if failed:
            self.stdout.write(self.style.ERROR(f"Failed IDs: {failed}"))
