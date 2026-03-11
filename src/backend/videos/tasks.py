import logging
import time

from celery import shared_task
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

POLL_INTERVAL = 10   # seconds between status checks
MAX_WAIT      = 3600  # give up after 1 hour


@shared_task(bind=True, max_retries=0)
def fetch_video_metadata_after_transcode(self, lesson_pk: int):
    """
    Poll Bunny until the video finishes transcoding, then save
    duration_seconds and thumbnail to the VideoLesson.
    """
    from .models import VideoLesson
    from .storage import BunnyVideoStorage, get_video_storage

    try:
        lesson = VideoLesson.objects.get(pk=lesson_pk)
    except VideoLesson.DoesNotExist:
        logger.warning('fetch_video_metadata: lesson %s not found', lesson_pk)
        return

    if not lesson.video_id:
        logger.warning('fetch_video_metadata: lesson %s has no video_id', lesson_pk)
        return

    storage = get_video_storage()
    if not isinstance(storage, BunnyVideoStorage):
        return

    guid     = lesson.video_id
    elapsed  = 0

    while elapsed < MAX_WAIT:
        try:
            info   = storage.get_video_status(guid)
            status = info.get('status', 0)
        except Exception as exc:
            logger.warning('fetch_video_metadata: status check failed: %s', exc)
            time.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL
            continue

        # status 4 = Finished
        if status == 4:
            _save_metadata(lesson, storage, guid)
            return

        # status 5/6 = error
        if status in (5, 6):
            logger.error('fetch_video_metadata: Bunny transcode failed (status=%s) for guid=%s', status, guid)
            return

        logger.info('fetch_video_metadata: guid=%s status=%s, waiting...', guid, status)
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

    logger.error('fetch_video_metadata: timed out waiting for guid=%s', guid)


def _save_metadata(lesson, storage, guid):
    update_fields = []

    # Duration
    try:
        meta = storage.get_metadata(guid)
        if meta.duration_seconds:
            lesson.duration_seconds = meta.duration_seconds
            update_fields.append('duration_seconds')
            logger.info('fetch_video_metadata: duration=%s for guid=%s', meta.duration_seconds, guid)
    except Exception as exc:
        logger.warning('fetch_video_metadata: get_metadata failed: %s', exc)

    # Thumbnail
    try:
        data = storage.extract_thumbnail(guid)
        if data:
            lesson.thumbnail.save(f'{guid}.jpg', ContentFile(data), save=False)
            update_fields.append('thumbnail')
            logger.info('fetch_video_metadata: thumbnail saved for guid=%s', guid)
    except Exception as exc:
        logger.warning('fetch_video_metadata: extract_thumbnail failed: %s', exc)

    if update_fields:
        lesson.save(update_fields=update_fields)
