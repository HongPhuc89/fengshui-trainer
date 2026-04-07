import hmac
import hashlib

import boto3
import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


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
    """S3 key for the encrypted file. Version in path to bust CDN cache on re-encrypt."""
    return f"encrypt_book/v{version}/{chapter_id}.bin"


def build_encrypted_cdn_url(chapter_id: int, version: int) -> str:
    """
    Canonical marker URL stored in DB to indicate the file exists on Supabase.
    NOT used directly for fetching (bucket is private) — generate a pre-signed URL instead.
    """
    path = encrypted_cdn_path(chapter_id, version)
    return (
        f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co"
        f"/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{path}"
    )


def get_presigned_encrypted_url(chapter_id: int, version: int) -> str:
    """Generate a time-limited pre-signed URL for the encrypted file (private bucket)."""
    path = encrypted_cdn_path(chapter_id, version)
    expiry = getattr(settings, "SUPABASE_URL_EXPIRY", 3600)
    return get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.SUPABASE_STORAGE_BUCKET, "Key": path},
        ExpiresIn=expiry,
    )


# ── Bunny Storage Zone helpers (Feature 26) ───────────────────────────────────


def _bunny_storage_base_url(region: str) -> str:
    """
    Return the regional Bunny Storage HTTP API base URL for the given region code.

    Bunny region codes → Storage API endpoint:
      de  (Frankfurt, EU)  → https://storage.bunnycdn.com         (default)
      ny  (New York, US)   → https://ny.storage.bunnycdn.com
      la  (Los Angeles)    → https://la.storage.bunnycdn.com
      sg  (Singapore, SEA) → https://sg.storage.bunnycdn.com      ← recommended for Vietnam
      syd (Sydney, AU)     → https://syd.storage.bunnycdn.com
      br  (São Paulo, SA)  → https://br.storage.bunnycdn.com
      jh  (Johannesburg)   → https://jh.storage.bunnycdn.com
    """
    if region == "de":
        return "https://storage.bunnycdn.com"
    return f"https://{region}.storage.bunnycdn.com"


def upload_bin_to_bunny(chapter_id: int, version: int, data: bytes) -> None:
    """
    Upload an encrypted .bin file to Bunny Storage Zone via HTTP PUT.

    The .bin file is AES-256-GCM ciphertext — safe to store in a public-accessible
    Storage Zone because without the key/IV (gated by /decrypt-key/ API) the bytes
    are meaningless to anyone who downloads them.

    Path on Bunny: encrypt_book/v{version}/{chapter_id}.bin
    The path includes the version so re-encrypting produces a new path, allowing
    Cache-Control: immutable on the CDN edge without stale-content risk.

    Raises:
        ImproperlyConfigured: if BUNNY_STORAGE_ZONE or BUNNY_STORAGE_API_KEY are not set.
        requests.HTTPError: on a non-2xx response from the Bunny Storage API.
    """
    zone = getattr(settings, "BUNNY_STORAGE_ZONE", "")
    api_key = getattr(settings, "BUNNY_STORAGE_API_KEY", "")
    if not zone or not api_key:
        raise ImproperlyConfigured(
            "BUNNY_STORAGE_ZONE and BUNNY_STORAGE_API_KEY must be set to upload .bin files."
        )

    region = getattr(settings, "BUNNY_STORAGE_REGION", "sg")
    base = _bunny_storage_base_url(region)
    path = encrypted_cdn_path(chapter_id, version)  # "encrypt_book/v{version}/{chapter_id}.bin"

    resp = requests.put(
        f"{base}/{zone}/{path}",
        data=data,
        headers={
            "AccessKey": api_key,
            "Content-Type": "application/octet-stream",
            # immutable: safe because path includes version — re-encrypt → new path → CDN cache busted.
            "Cache-Control": "public, max-age=31536000, immutable",
        },
        timeout=120,
    )
    resp.raise_for_status()


def build_bunny_cdn_url(chapter_id: int, version: int) -> str:
    """
    Return the public CDN URL for an encrypted .bin file served via the Bunny Pull Zone.

    URL format: https://{BUNNY_STORAGE_CDN_HOSTNAME}/encrypt_book/v{version}/{chapter_id}.bin

    This URL is permanent and publicly accessible. The file content is AES-256-GCM
    encrypted, so access without the decryption key (distributed only by /decrypt-key/
    after authentication and purchase verification) is harmless.
    """
    path = encrypted_cdn_path(chapter_id, version)
    hostname = getattr(settings, "BUNNY_STORAGE_CDN_HOSTNAME", "")
    return f"https://{hostname}/{path}"
