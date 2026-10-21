"""
Management command: delete_orphan_bunny_videos

Delete Bunny Stream videos that no VideoLesson references any more.

Re-uploading a lesson's video overwrites VideoLesson.video_id with the new
GUID but never deletes the old video, so the old one keeps costing storage.

Safety guards:
  * Videos uploaded within --min-age-hours are skipped: a browser TUS upload
    creates the Bunny entry before the lesson is saved, so a fresh video may
    simply be mid-upload.
  * Aborts when no lesson GUID matches any library video — that means the DB
    is not the one this library belongs to (e.g. local DB against prod Bunny),
    and every video would look orphaned.

DESTRUCTIVE: deleted videos cannot be restored. Always inspect --dry-run first.

Usage:
    # List orphans, change nothing
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py delete_orphan_bunny_videos --dry-run

    # Delete for real
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py delete_orphan_bunny_videos --yes

Options:
    --min-age-hours <n>  Skip videos uploaded less than n hours ago (default 24)
    --dry-run            List orphans without deleting
    --yes                Skip the interactive confirmation prompt
"""

import time
from datetime import datetime, timedelta, timezone

from django.core.management.base import BaseCommand, CommandError

from videos.models import VideoLesson
from videos.storage import BunnyVideoStorage, get_video_storage

# Bunny Stream API allows roughly 10 req/s.
_THROTTLE_SECONDS = 0.15


def _uploaded_at(video: dict) -> datetime | None:
    raw = video.get('dateUploaded')
    if not raw:
        return None
    # Bunny returns UTC timestamps without an offset, sometimes with 7-digit fractions.
    raw = raw.rstrip('Z').split('.')[0]
    return datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)


class Command(BaseCommand):
    help = 'Delete Bunny Stream videos that no VideoLesson references.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-age-hours',
            type=float,
            default=24,
            metavar='N',
            help='Skip videos uploaded less than N hours ago (default 24).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List orphans without deleting.',
        )
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip the interactive confirmation prompt.',
        )

    def handle(self, *args, **options):
        min_age    = timedelta(hours=options['min_age_hours'])
        dry_run    = options['dry_run']
        assume_yes = options['yes']

        storage = get_video_storage()
        if not isinstance(storage, BunnyVideoStorage):
            raise CommandError(
                'VIDEO_STORAGE_BACKEND is not "bunny". '
                'Set VIDEO_STORAGE_BACKEND=bunny in .env and try again.'
            )

        referenced = set(VideoLesson.objects.exclude(video_id='').values_list('video_id', flat=True))
        videos = storage.list_videos()
        self.stdout.write(f'Library has {len(videos)} video(s); DB references {len(referenced)} GUID(s).\n')

        if videos and not referenced & {v['guid'] for v in videos}:
            raise CommandError(
                'No lesson GUID matches any video in this library — the DB does not '
                'belong to this Bunny library. Aborted.'
            )

        cutoff = datetime.now(timezone.utc) - min_age
        orphans, recent = [], 0
        for v in videos:
            if v['guid'] in referenced:
                continue
            uploaded = _uploaded_at(v)
            if uploaded is None or uploaded > cutoff:
                recent += 1
                continue
            orphans.append(v)

        if not orphans:
            self.stdout.write(self.style.SUCCESS(f'No orphan videos. (skipped {recent} recent)'))
            return

        total_bytes = 0
        for v in orphans:
            size = v.get('storageSize') or 0
            total_bytes += size
            self.stdout.write(
                f'  {v["guid"]}  {v.get("dateUploaded", "")[:10]}  '
                f'{size / 1e9:6.2f} GB  "{v.get("title", "")}"'
            )
        self.stdout.write(
            f'\n{len(orphans)} orphan video(s), {total_bytes / 1e9:.2f} GB '
            f'(skipped {recent} uploaded within {options["min_age_hours"]:g}h).\n'
        )

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN — nothing deleted ==='))
            return

        if not assume_yes:
            self.stdout.write(self.style.WARNING('This CANNOT be undone.'))
            try:
                answer = input('Type "yes" to delete these videos: ').strip().lower()
            except EOFError:
                # Non-interactive stdin (e.g. `docker-compose exec -T`).
                raise CommandError(
                    'Aborted: no interactive terminal to confirm on. '
                    'Re-run with --dry-run to preview, or --yes to confirm.'
                )
            if answer != 'yes':
                raise CommandError('Aborted.')

        deleted = errors = 0
        for v in orphans:
            try:
                storage.delete(v['guid'])
                deleted += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ deleted {v["guid"]}'))
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  x {v["guid"]}: {exc}'))
            time.sleep(_THROTTLE_SECONDS)

        summary = f'Done.  deleted={deleted}  errors={errors}'
        self.stdout.write(self.style.ERROR(summary) if errors else self.style.SUCCESS(summary))
