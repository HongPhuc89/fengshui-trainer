"""
Bunny Storage helpers for PDF infographic files (Feature 30).

Security model (same as .bin chapter files):
- PDF files are stored on Bunny Storage and served via a public CDN pull zone.
- The storage key contains lesson_pk + lesson_uuid + hex4 random suffix — not guessable.
- Access control is enforced by the Django API gate: only authenticated, authorised users
  receive the CDN URL. The CDN itself has no token authentication.
"""
import uuid

import requests as http
from django.conf import settings

_STORAGE_API_BASE = 'https://storage.bunnycdn.com'


def _storage_api_base() -> str:
    """Return the correct Bunny Storage API base URL, respecting the region setting."""
    region = getattr(settings, 'BUNNY_STORAGE_REGION', '')
    if region and region != 'de':
        return f'https://{region}.storage.bunnycdn.com'
    return _STORAGE_API_BASE


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
