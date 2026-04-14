"""Utility helpers for video lesson image optimization (Feature 31)."""
from videos.bunny_file_storage import upload_image_to_bunny

# Target dimensions for small lesson thumbnails.
# Based on largest rendered CSS size (180px in HomeView) × 2× Retina + buffer,
# using 16:9 landscape ratio to match standard video thumbnail proportions.
THUMBNAIL_MAX_WIDTH = 400
THUMBNAIL_MAX_HEIGHT = 225


def generate_and_upload_small_thumbnail(lesson_pk: int, source_image_field, force: bool = False) -> str:
    """Resize a lesson thumbnail image to WebP and upload to Bunny Storage.

    Args:
        lesson_pk: Primary key of the VideoLesson — used as the storage key filename.
        source_image_field: Django ``ImageField`` instance with a valid ``.path``.
        force: If True, re-upload even if the file already exists on Bunny.

    Returns:
        Public Bunny CDN URL of the small thumbnail.
    """
    storage_key = f'thumbnails/small/{lesson_pk}.webp'
    return upload_image_to_bunny(
        source_image_field,
        storage_key,
        max_width=THUMBNAIL_MAX_WIDTH,
        max_height=THUMBNAIL_MAX_HEIGHT,
        skip_if_exists=not force,
    )
