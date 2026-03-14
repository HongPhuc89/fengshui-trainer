from celery import shared_task
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings

from .models import BookChapter
from .services.pdf_encryption import (
    build_encrypted_cdn_url,
    derive_chapter_key,
    encrypted_cdn_path,
    get_s3_client,
)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def encrypt_and_upload_chapter_pdf(self, chapter_id: int):
    """
    Encrypt chapter PDF with AES-256-GCM and upload to Supabase CDN subfolder encrypt_book/.
    Triggered by BookChapter.save() whenever file_path changes.
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
        with chapter.file_path.open('rb') as f:
            pdf_bytes = f.read()

        version = chapter.encryption_version
        key, iv = derive_chapter_key(chapter_id, version)

        # AES-256-GCM encrypt — 16-byte auth tag is appended to the ciphertext
        encrypted = AESGCM(key).encrypt(iv, pdf_bytes, associated_data=None)

        # Upload to Supabase; path includes version to bypass CDN immutable cache on re-encrypt
        cdn_path = encrypted_cdn_path(chapter_id, version)
        get_s3_client().put_object(
            Bucket=settings.SUPABASE_STORAGE_BUCKET,
            Key=cdn_path,
            Body=encrypted,
            ContentType="application/octet-stream",
            CacheControl="public, max-age=31536000, immutable",
        )

        # Persist the public URL using UPDATE to avoid triggering save() recursively
        BookChapter.objects.filter(pk=chapter_id).update(
            encrypted_cdn_url=build_encrypted_cdn_url(chapter_id, version),
        )

    except Exception as exc:
        raise self.retry(exc=exc)
