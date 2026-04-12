from celery import shared_task
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .models import BookChapter
from .services.pdf_encryption import (
    build_bunny_cdn_url,
    derive_chapter_key,
    upload_bin_to_bunny,
)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def encrypt_and_upload_chapter_pdf(self, chapter_id: int):
    """
    Encrypt chapter PDF with AES-256-GCM and upload to Bunny Storage Zone.
    Triggered by BookChapter.save() whenever file_path changes.

    The encrypted file is stored at: encrypt_book/v{version}/{chapter_id}.bin
    The public CDN URL is then persisted to BookChapter.encrypted_cdn_url.
    """
    try:
        chapter = BookChapter.objects.get(id=chapter_id)
    except BookChapter.DoesNotExist:
        # Chapter was deleted while this task was queued — nothing to do.
        return

    if not chapter.file_path:
        return

    try:
        # Read via Django storage API (works for both local and Supabase-backed storage)
        with chapter.file_path.open("rb") as f:
            pdf_bytes = f.read()

        version = chapter.encryption_version
        key, iv = derive_chapter_key(chapter_id, version)

        # AES-256-GCM encrypt — 16-byte auth tag is appended to the ciphertext
        encrypted = AESGCM(key).encrypt(iv, pdf_bytes, associated_data=None)

        # Upload to Bunny Storage Zone; path includes version to bust CDN cache on re-encrypt
        upload_bin_to_bunny(chapter_id, version, encrypted)

        # Persist the Bunny CDN URL using UPDATE to avoid triggering save() recursively
        BookChapter.objects.filter(pk=chapter_id).update(
            encrypted_cdn_url=build_bunny_cdn_url(chapter_id, version),
        )

    except Exception as exc:
        raise self.retry(exc=exc)
