"""Utility helpers for book image optimization (Feature 31)."""
from videos.bunny_file_storage import upload_image_to_bunny

# Target dimensions for small book covers.
# Based on largest rendered CSS size (140px in HomeView) × 2× Retina + buffer,
# using 2:3 portrait ratio to match standard book cover proportions.
BOOK_COVER_MAX_WIDTH = 400
BOOK_COVER_MAX_HEIGHT = 600


def generate_and_upload_small_cover(book_pk: int, source_image_field, force: bool = False) -> str:
    """Resize a book cover image to WebP and upload to Bunny Storage.

    Args:
        book_pk: Primary key of the Book — used as the storage key filename.
        source_image_field: Django ``ImageField`` instance with a valid ``.path``.
        force: If True, re-upload even if the file already exists on Bunny.

    Returns:
        Public Bunny CDN URL of the small cover.
    """
    storage_key = f'book_covers/small/{book_pk}.webp'
    return upload_image_to_bunny(
        source_image_field,
        storage_key,
        max_width=BOOK_COVER_MAX_WIDTH,
        max_height=BOOK_COVER_MAX_HEIGHT,
        skip_if_exists=not force,
    )
