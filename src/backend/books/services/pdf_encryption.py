import hmac
import hashlib

import boto3
from django.conf import settings


def derive_chapter_key(chapter_id: int, version: int) -> tuple[bytes, bytes]:
    """
    Derive (key, iv) from MASTER_KEY + chapter_id + version.

    Version-aware: re-encrypting with a new version yields a different IV,
    preventing AES-GCM nonce reuse even when the same chapter_id is re-uploaded.
    Deterministic: same (chapter_id, version) → same (key, iv) → no DB storage needed.
    """
    master = settings.PDF_MASTER_KEY.encode()
    key = hmac.new(master, f"enc-key:{chapter_id}".encode(), hashlib.sha256).digest()          # 32 bytes
    iv  = hmac.new(master, f"enc-iv:{chapter_id}:v{version}".encode(), hashlib.sha256).digest()[:12]  # 12 bytes GCM
    return key, iv


def get_s3_client():
    """S3-compatible boto3 client for Supabase Storage. Shared by task and management command."""
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3",
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
        region_name=getattr(settings, "SUPABASE_REGION", "ap-southeast-1"),
    )


def encrypted_cdn_path(chapter_id: int, version: int) -> str:
    """S3 key for the encrypted file. Version in path to bypass CDN immutable cache on re-encrypt."""
    return f"encrypt_book/v{version}/{chapter_id}.bin"


def build_encrypted_cdn_url(chapter_id: int, version: int) -> str:
    """Public URL of the encrypted file on Supabase CDN."""
    path = encrypted_cdn_path(chapter_id, version)
    return (
        f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co"
        f"/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
    )
