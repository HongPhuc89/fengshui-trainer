"""
Video storage backend abstraction.

Current backend : LocalVideoStorage  → saves to MEDIA_ROOT/videos/ + ffmpeg faststart
Future  backend : BunnyVideoStorage  → uploads to Bunny Stream API

To switch backends, set the env var:
    VIDEO_STORAGE_BACKEND=bunny   (with BUNNY_LIBRARY_ID, BUNNY_API_KEY, BUNNY_CDN_HOSTNAME)
    VIDEO_STORAGE_BACKEND=local   (default)
"""

import hashlib
import hmac as _hmac
import json
import logging
import shutil
import subprocess
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

import requests as http
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class VideoUploadResult:
    """Result from any storage backend upload."""
    video_id: str   # hex UUID (local) or Bunny GUID (bunny)
    video_url: str  # empty for local (resolved at request time); Bunny embed URL for bunny


@dataclass
class VideoMetadata:
    """Metadata fetched from a stored video."""
    duration_seconds: int | None = None


class VideoStorageBackend(ABC):
    @abstractmethod
    def upload(self, file_obj, original_filename: str) -> VideoUploadResult:
        """Upload a video file and return its identifiers."""

    @abstractmethod
    def delete(self, video_id: str) -> None:
        """Delete a previously uploaded video by its ID."""

    @abstractmethod
    def get_metadata(self, video_id: str) -> VideoMetadata:
        """Fetch metadata (duration etc.) for a stored video."""

    @abstractmethod
    def extract_thumbnail(self, video_id: str) -> bytes | None:
        """Extract a thumbnail image (JPEG bytes) from the video. Returns None on failure."""


class LocalVideoStorage(VideoStorageBackend):
    """
    Saves videos to MEDIA_ROOT/videos/{uuid}{ext}.

    If ffmpeg is available in PATH, processes with -movflags faststart to move the
    moov atom to the front of the file — this enables seeking without buffering the
    entire file.  Falls back silently to the raw file if ffmpeg is unavailable or fails.

    Served via /media/videos/{video_id}{ext} in DEBUG mode (see VideoLessonDetailView).
    """

    def upload(self, file_obj, original_filename: str) -> VideoUploadResult:
        suffix = Path(original_filename).suffix.lower() or '.mp4'
        video_id = uuid.uuid4().hex
        dest_dir = Path(settings.MEDIA_ROOT) / 'videos'
        dest_dir.mkdir(parents=True, exist_ok=True)

        raw_path  = dest_dir / f'{video_id}_raw{suffix}'
        dest_path = dest_dir / f'{video_id}{suffix}'

        # 1. Write uploaded bytes to disk
        with open(raw_path, 'wb') as f:
            for chunk in file_obj.chunks():
                f.write(chunk)

        # 2. Try ffmpeg faststart (move moov atom to front → enables browser seeking)
        if shutil.which('ffmpeg'):
            try:
                subprocess.run(
                    [
                        'ffmpeg', '-y',
                        '-i', str(raw_path),
                        '-movflags', 'faststart',
                        '-c', 'copy',
                        str(dest_path),
                    ],
                    check=True,
                    capture_output=True,
                )
                raw_path.unlink()
                logger.info('LocalVideoStorage: faststart applied to %s', dest_path.name)
            except subprocess.CalledProcessError as exc:
                logger.warning(
                    'LocalVideoStorage: ffmpeg faststart failed (%s), keeping raw file',
                    exc.stderr.decode(errors='replace'),
                )
                raw_path.rename(dest_path)
        else:
            logger.warning('LocalVideoStorage: ffmpeg not found in PATH, saving raw file (seeking may be slow)')
            raw_path.rename(dest_path)

        return VideoUploadResult(video_id=video_id, video_url='')

    def delete(self, video_id: str) -> None:
        for suffix in ('.mp4', '.mov', '.mkv', '.avi', '.webm'):
            path = Path(settings.MEDIA_ROOT) / 'videos' / f'{video_id}{suffix}'
            if path.exists():
                path.unlink()
                break

    def get_metadata(self, video_id: str) -> VideoMetadata:
        for suffix in ('.mp4', '.mov', '.mkv', '.avi', '.webm'):
            path = Path(settings.MEDIA_ROOT) / 'videos' / f'{video_id}{suffix}'
            if path.exists():
                if shutil.which('ffprobe'):
                    try:
                        result = subprocess.run(
                            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(path)],
                            capture_output=True, text=True, check=True,
                        )
                        data = json.loads(result.stdout)
                        duration = float(data['format'].get('duration', 0))
                        return VideoMetadata(duration_seconds=int(duration) if duration else None)
                    except Exception as exc:
                        logger.warning('LocalVideoStorage: ffprobe failed: %s', exc)
                break
        return VideoMetadata()

    def extract_thumbnail(self, video_id: str) -> bytes | None:
        for suffix in ('.mp4', '.mov', '.mkv', '.avi', '.webm'):
            path = Path(settings.MEDIA_ROOT) / 'videos' / f'{video_id}{suffix}'
            if path.exists():
                if not shutil.which('ffmpeg'):
                    logger.warning('LocalVideoStorage: ffmpeg not found, cannot extract thumbnail')
                    return None
                try:
                    result = subprocess.run(
                        [
                            'ffmpeg', '-y',
                            '-ss', '5',          # seek to 5 s (fast thumbnail)
                            '-i', str(path),
                            '-vframes', '1',
                            '-q:v', '2',         # high quality JPEG
                            '-f', 'image2pipe',
                            '-vcodec', 'mjpeg',
                            'pipe:1',            # output to stdout
                        ],
                        capture_output=True,
                        check=True,
                    )
                    logger.info('LocalVideoStorage: extracted thumbnail for %s', video_id)
                    return result.stdout
                except subprocess.CalledProcessError as exc:
                    logger.warning('LocalVideoStorage: thumbnail extraction failed: %s', exc.stderr.decode(errors='replace'))
                    return None
        return None


class BunnyVideoStorage(VideoStorageBackend):
    """
    Uploads videos to Bunny Stream CDN.

    Required Django settings (set via .env):
        BUNNY_LIBRARY_ID      — numeric library ID (e.g. "123456")
        BUNNY_API_KEY         — Bunny Stream API AccessKey
        BUNNY_CDN_HOSTNAME    — pull zone hostname (e.g. "vz-abc123.b-cdn.net")
                                 OR use "iframe.mediadelivery.net" for the default embed player

    Upload flow:
        1. POST /library/{id}/videos        → create video entry, receive GUID
        2. PUT  /library/{id}/videos/{guid} → stream raw bytes
        3. video_url = f'https://iframe.mediadelivery.net/embed/{library_id}/{guid}'
           video_id  = guid

    After upload Bunny transcodes to HLS automatically (adaptive bitrate, fast seeking).
    The embed URL works with the Bunny iframe player out of the box.
    """

    _API_BASE = 'https://video.bunnycdn.com/library'

    @property
    def _library_id(self) -> str:
        return str(settings.BUNNY_LIBRARY_ID)

    @property
    def _api_key(self) -> str:
        return settings.BUNNY_API_KEY

    @property
    def _cdn_hostname(self) -> str:
        return getattr(settings, 'BUNNY_CDN_HOSTNAME', 'iframe.mediadelivery.net')

    @property
    def _storage_zone(self) -> str:
        return getattr(settings, 'BUNNY_STORAGE_ZONE', '')

    @property
    def _storage_api_key(self) -> str:
        return getattr(settings, 'BUNNY_STORAGE_API_KEY', '')

    @property
    def _storage_cdn_hostname(self) -> str:
        return getattr(settings, 'BUNNY_STORAGE_CDN_HOSTNAME', 'storage.bunnycdn.com')

    def upload(self, file_obj, original_filename: str) -> VideoUploadResult:
        library_id = self._library_id
        api_key    = self._api_key

        # Step 1 — create video entry in Bunny library
        create_resp = http.post(
            f'{self._API_BASE}/{library_id}/videos',
            json={'title': original_filename},
            headers={
                'AccessKey': api_key,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout=30,
        )
        create_resp.raise_for_status()
        guid = create_resp.json()['guid']
        logger.info('BunnyVideoStorage: created video entry guid=%s', guid)

        # Step 2 — stream upload raw bytes
        upload_resp = http.put(
            f'{self._API_BASE}/{library_id}/videos/{guid}',
            data=self._iter_chunks(file_obj),
            headers={
                'AccessKey': api_key,
                'Content-Type': 'application/octet-stream',
            },
            timeout=3600,  # allow up to 1 h for large files
        )
        upload_resp.raise_for_status()
        logger.info('BunnyVideoStorage: uploaded video guid=%s', guid)

        # Step 3 — build embed URL (Bunny transcodes to HLS in background)
        video_url = f'https://iframe.mediadelivery.net/embed/{library_id}/{guid}'

        return VideoUploadResult(video_id=guid, video_url=video_url)

    def delete(self, video_id: str) -> None:
        resp = http.delete(
            f'{self._API_BASE}/{self._library_id}/videos/{video_id}',
            headers={'AccessKey': self._api_key},
            timeout=30,
        )
        resp.raise_for_status()
        logger.info('BunnyVideoStorage: deleted video guid=%s', video_id)

    def get_metadata(self, video_id: str) -> VideoMetadata:
        resp = http.get(
            f'{self._API_BASE}/{self._library_id}/videos/{video_id}',
            headers={'AccessKey': self._api_key, 'Accept': 'application/json'},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        length = data.get('length')  # Bunny returns duration in seconds
        return VideoMetadata(duration_seconds=int(length) if length else None)

    def extract_thumbnail(self, video_id: str) -> bytes | None:
        """
        Download thumbnail from Bunny Storage API.
        Stream thumbnails are stored in the connected storage zone at:
          /{videoId}/thumbnail.jpg
        """
        try:
            # Get thumbnailFileName from Stream API
            meta_resp = http.get(
                f'{self._API_BASE}/{self._library_id}/videos/{video_id}',
                headers={'AccessKey': self._api_key, 'Accept': 'application/json'},
                timeout=30,
            )
            meta_resp.raise_for_status()
            thumbnail_filename = meta_resp.json().get('thumbnailFileName') or 'thumbnail.jpg'

            # Download from Bunny Storage API (authenticated, no CDN token needed)
            storage_url = f'https://{self._storage_cdn_hostname}/{self._storage_zone}/{video_id}/{thumbnail_filename}'
            resp = http.get(
                storage_url,
                headers={'AccessKey': self._storage_api_key},
                timeout=30,
            )
            resp.raise_for_status()
            logger.info('BunnyVideoStorage: fetched thumbnail for guid=%s', video_id)
            return resp.content
        except Exception as exc:
            logger.warning('BunnyVideoStorage: thumbnail fetch failed: %s', exc)
            return None

    # ── Direct TUS upload helpers ─────────────────────────────────────────────

    def create_entry(self, title: str) -> str:
        """Create a video entry in Bunny library and return its GUID."""
        resp = http.post(
            f'{self._API_BASE}/{self._library_id}/videos',
            json={'title': title},
            headers={
                'AccessKey': self._api_key,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout=30,
        )
        resp.raise_for_status()
        guid = resp.json()['guid']
        logger.info('BunnyVideoStorage: created entry guid=%s', guid)
        return guid

    def generate_tus_auth(self, guid: str) -> dict:
        """
        Generate a pre-signed TUS auth payload for direct browser→Bunny upload.

        Signature = HMAC-SHA256( library_id + api_key + expiration + video_id )
        Valid for 1 hour.
        """
        expiration = int(time.time()) + 3600
        sig_input  = f'{self._library_id}{self._api_key}{expiration}{guid}'
        signature  = _hmac.new(
            self._api_key.encode('utf-8'),
            sig_input.encode('utf-8'),
            hashlib.sha256,
        ).hexdigest()

        return {
            'tus_endpoint': 'https://video.bunnycdn.com/tusupload',
            'guid': guid,
            'video_url': f'https://iframe.mediadelivery.net/embed/{self._library_id}/{guid}',
            'headers': {
                'AuthorizationSignature': signature,
                'AuthorizationExpire':    str(expiration),
                'VideoId':               guid,
                'LibraryId':             self._library_id,
            },
        }

    def get_video_status(self, guid: str) -> dict:
        """
        Return Bunny transcoding status for a video.

        status codes: 0=Created, 1=Uploading, 2=Processing,
                      3=Transcoding, 4=Finished, 5=Error, 6=UploadFailed
        """
        resp = http.get(
            f'{self._API_BASE}/{self._library_id}/videos/{guid}',
            headers={'AccessKey': self._api_key, 'Accept': 'application/json'},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            'status':          data.get('status', 0),
            'encode_progress': data.get('encodeProgress', 0),
        }

    @staticmethod
    def _iter_chunks(file_obj):
        """Generator that yields chunks — keeps memory usage low for large uploads."""
        for chunk in file_obj.chunks(chunk_size=8 * 1024 * 1024):  # 8 MB chunks
            yield chunk


def get_video_storage() -> VideoStorageBackend:
    """Return the configured video storage backend instance."""
    backend = getattr(settings, 'VIDEO_STORAGE_BACKEND', 'local')
    if backend == 'bunny':
        return BunnyVideoStorage()
    return LocalVideoStorage()
