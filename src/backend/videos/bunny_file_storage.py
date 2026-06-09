"""
Bunny Storage helpers for PDF infographic files (Feature 30) and image optimization (Feature 31).

Security model (same as .bin chapter files):
- PDF files are stored on Bunny Storage and served via a public CDN pull zone.
- The storage key contains lesson_pk + lesson_uuid + hex4 random suffix — not guessable.
- Access control is enforced by the Django API gate: only authenticated, authorised users
  receive the CDN URL. The CDN itself has no token authentication.
"""
import io
import logging
import uuid

import requests as http
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from PIL import Image
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

_STORAGE_API_BASE = 'https://storage.bunnycdn.com'


def _storage_api_base() -> str:
    """Return the correct Bunny Storage API base URL, respecting the region setting."""
    region = getattr(settings, 'BUNNY_STORAGE_REGION', '')
    if region and region != 'de':
        return f'https://{region}.storage.bunnycdn.com'
    return _STORAGE_API_BASE


def upload_image_to_bunny(
    source_image_field,
    storage_key: str,
    max_width: int,
    max_height: int,
    webp_quality: int = 85,
    skip_if_exists: bool = True,
) -> str:
    """Resize an image field value, convert to WebP, and upload to Bunny Storage.

    Args:
        source_image_field: A Django ``ImageField`` instance with a valid ``.path``.
        storage_key: Destination path within the Bunny storage zone (e.g. ``book_covers/small/1.webp``).
        max_width: Maximum width in pixels (bounding box for ``thumbnail()``).
        max_height: Maximum height in pixels.
        webp_quality: WebP compression quality 1–100 (default 85).
        skip_if_exists: If True, HEAD-check Bunny first and skip upload if the file already exists.

    Returns:
        Public CDN URL of the uploaded image.

    Raises:
        RuntimeError: If Pillow is not installed.
        requests.HTTPError: If Bunny returns a non-2xx status on upload.
    """
    if not _PIL_AVAILABLE:
        raise RuntimeError("Pillow is required for image optimization. Install it with: pip install Pillow")

    zone = settings.BUNNY_STORAGE_ZONE
    api_key = settings.BUNNY_STORAGE_API_KEY
    cdn_hostname = settings.BUNNY_STORAGE_CDN_HOSTNAME
    upload_url = f'{_storage_api_base()}/{zone}/{storage_key}'
    cdn_url = f'https://{cdn_hostname}/{storage_key}'

    if skip_if_exists:
        check = http.head(upload_url, headers={'AccessKey': api_key}, timeout=10)
        if check.status_code == 200:
            return cdn_url

    with Image.open(source_image_field.path) as img:
        img = img.convert('RGB')
        img.thumbnail((max_width, max_height), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='WEBP', quality=webp_quality, method=6)
        buf.seek(0)
        image_data = buf.read()

    resp = http.put(
        upload_url,
        data=image_data,
        headers={
            'AccessKey': api_key,
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000',
        },
        timeout=60,
    )
    resp.raise_for_status()
    return cdn_url


def upload_pdf_to_bunny(file_obj, lesson_pk: int, lesson_uuid: str, existing_key: str = '') -> str:
    """Upload a PDF file to Bunny Storage and return the storage key.

    If ``existing_key`` is provided, the same Bunny key is reused (overwrite in-place).
    Otherwise a new key is generated: ``infographics/{lesson_pk}_{lesson_uuid}_{hex4}.pdf``.

    Args:
        file_obj: A Django ``UploadedFile`` (or any file-like object with ``.read()``).
        lesson_pk: Integer primary key of the lesson (for sortable prefix).
        lesson_uuid: UUID string of the lesson (for identifiable prefix).
        existing_key: Existing Bunny storage key to overwrite; empty string to create new.

    Returns:
        The Bunny storage key (path relative to the storage zone root).

    Raises:
        requests.HTTPError: If Bunny returns a non-2xx status code.
    """
    if existing_key:
        storage_key = existing_key
    else:
        short_random = uuid.uuid4().hex[:4]
        storage_key = f'infographics/{lesson_pk}_{lesson_uuid}_{short_random}.pdf'

    zone = settings.BUNNY_STORAGE_ZONE
    api_key = settings.BUNNY_STORAGE_API_KEY
    url = f'{_storage_api_base()}/{zone}/{storage_key}'

    resp = http.put(
        url,
        data=file_obj.read(),
        headers={
            'AccessKey': api_key,
            'Content-Type': 'application/pdf',
        },
        timeout=120,
    )
    resp.raise_for_status()
    return storage_key


def delete_pdf_from_bunny(storage_key: str) -> None:
    """Delete a PDF file from Bunny Storage.

    Args:
        storage_key: The Bunny storage key to delete.

    Raises:
        requests.HTTPError: If Bunny returns a non-2xx status code.
    """
    zone = settings.BUNNY_STORAGE_ZONE
    api_key = settings.BUNNY_STORAGE_API_KEY
    url = f'{_storage_api_base()}/{zone}/{storage_key}'

    resp = http.delete(
        url,
        headers={'AccessKey': api_key},
        timeout=30,
    )
    resp.raise_for_status()


def purge_cdn_url(cdn_url: str) -> bool:
    """Purge a single URL from Bunny CDN edge cache.

    Uses the Bunny account-level API key (BUNNY_ACCOUNT_API_KEY in settings).
    Silently returns False if the key is not configured — purge is best-effort.

    Args:
        cdn_url: The fully qualified CDN URL to purge (e.g. https://zone.b-cdn.net/path/file.webp).

    Returns:
        True if purge succeeded (2xx), False otherwise.
    """
    api_key = getattr(settings, 'BUNNY_ACCOUNT_API_KEY', '')
    if not api_key:
        logger.warning('purge_cdn_url: BUNNY_ACCOUNT_API_KEY not configured, skipping purge for %s', cdn_url)
        return False
    try:
        resp = http.get(
            'https://api.bunny.net/purge',
            params={'url': cdn_url, 'async': 'false'},
            headers={'AccessKey': api_key},
            timeout=15,
        )
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception('purge_cdn_url: failed to purge %s', cdn_url)
        return False


def get_pdf_cdn_url(storage_key: str) -> str:
    """Return the public CDN URL for a PDF infographic stored on Bunny.

    The URL is not signed — security relies on:
    1. The storage key being unguessable (lesson_pk + lesson_uuid + hex4 random suffix).
    2. The Django API gate (only authorised users receive the URL).

    Args:
        storage_key: The Bunny storage key (path within the zone).

    Returns:
        A fully qualified HTTPS CDN URL.
    """
    cdn_hostname = settings.BUNNY_STORAGE_CDN_HOSTNAME
    return f'https://{cdn_hostname}/{storage_key}'
