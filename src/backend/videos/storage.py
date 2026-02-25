"""
Video storage backend abstraction.

Current backend : LocalVideoStorage  → saves to MEDIA_ROOT/videos/
Future  backend : BunnyVideoStorage  → uploads to Bunny Stream API

To switch backends, set the env var:
    VIDEO_STORAGE_BACKEND=bunny   (with BUNNY_LIBRARY_ID, BUNNY_API_KEY, BUNNY_CDN_HOSTNAME)
    VIDEO_STORAGE_BACKEND=local   (default)
"""

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings


@dataclass
class VideoUploadResult:
    """Result from any storage backend upload."""
    video_id: str   # Unique identifier (hex UUID for local, Bunny GUID for Bunny)
    video_url: str  # Playback URL (empty for local — resolved at request time via DEBUG fallback)


class VideoStorageBackend(ABC):
    @abstractmethod
    def upload(self, file_obj, original_filename: str) -> VideoUploadResult:
        """Upload a video file and return its identifiers."""

    @abstractmethod
    def delete(self, video_id: str) -> None:
        """Delete a previously uploaded video by its ID."""


class LocalVideoStorage(VideoStorageBackend):
    """
    Saves videos to MEDIA_ROOT/videos/{uuid}{ext}.
    Served via /media/videos/{video_id}.ext in DEBUG mode.

    The existing DEBUG fallback in VideoLessonDetailView already handles
    building the absolute URL:
        video_url = request.build_absolute_uri(f'/media/videos/{lesson.video_id}.mp4')
    """

    def upload(self, file_obj, original_filename: str) -> VideoUploadResult:
        suffix = Path(original_filename).suffix.lower() or '.mp4'
        video_id = uuid.uuid4().hex
        dest_dir = Path(settings.MEDIA_ROOT) / 'videos'
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / f'{video_id}{suffix}'
        with open(dest_path, 'wb') as f:
            for chunk in file_obj.chunks():
                f.write(chunk)
        return VideoUploadResult(video_id=video_id, video_url='')

    def delete(self, video_id: str) -> None:
        for suffix in ('.mp4', '.mov', '.mkv', '.avi', '.webm'):
            path = Path(settings.MEDIA_ROOT) / 'videos' / f'{video_id}{suffix}'
            if path.exists():
                path.unlink()
                break


class BunnyVideoStorage(VideoStorageBackend):
    """
    Uploads videos to Bunny Stream CDN.

    Required Django settings (from env):
        BUNNY_LIBRARY_ID      — Bunny Stream library numeric ID
        BUNNY_API_KEY         — Bunny Stream API key (AccessKey)
        BUNNY_CDN_HOSTNAME    — e.g. 'iframe.mediadelivery.net'

    Upload flow (Bunny Stream REST API):
        1. POST https://video.bunnycdn.com/library/{BUNNY_LIBRARY_ID}/videos
           Body: {"title": "<original_filename>"}
           → Response: {"guid": "<video_guid>", ...}

        2. PUT  https://video.bunnycdn.com/library/{BUNNY_LIBRARY_ID}/videos/{guid}
           Body: raw video bytes (stream)
           Headers: AccessKey: {BUNNY_API_KEY}

        3. Playback URL:
           https://{BUNNY_CDN_HOSTNAME}/embed/{BUNNY_LIBRARY_ID}/{guid}

    After switching:
        - video_url  will hold the Bunny embed/stream URL
        - video_id   will hold the Bunny video GUID
        - The DEBUG fallback in views.py is bypassed since video_url is non-empty
    """

    def upload(self, file_obj, original_filename: str) -> VideoUploadResult:
        raise NotImplementedError(
            "BunnyVideoStorage is not yet implemented. "
            "See the docstring above for the Bunny Stream API integration guide."
        )

    def delete(self, video_id: str) -> None:
        raise NotImplementedError("BunnyVideoStorage.delete is not yet implemented.")


def get_video_storage() -> VideoStorageBackend:
    """Return the configured video storage backend instance."""
    backend = getattr(settings, 'VIDEO_STORAGE_BACKEND', 'local')
    if backend == 'bunny':
        return BunnyVideoStorage()
    return LocalVideoStorage()
