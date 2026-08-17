"""
Management command: cleanup_bunny_originals

Reclaims Bunny Stream storage by deleting the uploaded source file (and MP4
fallback renditions when present) of videos that have already finished
transcoding. Every HLS resolution stays untouched, so playback is unaffected.

The source file is only kept by Bunny for re-transcoding to a resolution that
was not generated at upload time. Once a video is transcoded and the library's
resolution set is settled, it is dead weight — typically several times the size
of all playable renditions combined.

DESTRUCTIVE: deleting the source file cannot be undone through the API. Keep an
off-Bunny copy of the masters, and always inspect --dry-run output first.

Usage:
    # Report what would be freed, change nothing
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py cleanup_bunny_originals --dry-run

    # Delete for real, one course at a time
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py cleanup_bunny_originals --course 3 --yes

Options:
    --lesson <pk>      Only process the lesson with this pk (repeatable)
    --course <id>      Only process lessons belonging to this course id
    --limit <n>        Stop after processing n lessons
    --keep-mp4         Delete only the source file, leave MP4 fallbacks alone
    --dry-run          Ask Bunny what it would delete, without deleting
    --yes              Skip the interactive confirmation prompt
"""

import time

from django.core.management.base import BaseCommand, CommandError

from videos.models import VideoLesson
from videos.storage import BunnyVideoStorage, get_video_storage

# Bunny Stream API allows roughly 10 req/s; each lesson costs 2-3 calls.
_THROTTLE_SECONDS = 0.15

# Bunny video status 4 = Finished. Anything lower is still being processed and
# must keep its source file to finish transcoding.
_STATUS_FINISHED = 4


class Command(BaseCommand):
    help = "Delete Bunny source files / MP4 fallbacks to reclaim storage."

    def add_arguments(self, parser):
        parser.add_argument(
            '--lesson',
            type=int,
            action='append',
            dest='lesson_pks',
            metavar='PK',
            help='Only process lesson with this pk (repeatable).',
        )
        parser.add_argument(
            '--course',
            type=int,
            dest='course_id',
            metavar='ID',
            help='Only process lessons belonging to this course id.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            dest='limit',
            metavar='N',
            help='Stop after processing N lessons.',
        )
        parser.add_argument(
            '--keep-mp4',
            action='store_true',
            help='Delete only the source file, leave MP4 fallbacks alone.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ask Bunny what it would delete, without deleting.',
        )
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip the interactive confirmation prompt.',
        )

    def handle(self, *args, **options):
        lesson_pks = options['lesson_pks']
        course_id  = options['course_id']
        limit      = options['limit']
        keep_mp4   = options['keep_mp4']
        dry_run    = options['dry_run']
        assume_yes = options['yes']

        storage = get_video_storage()
        if not isinstance(storage, BunnyVideoStorage):
            raise CommandError(
                'VIDEO_STORAGE_BACKEND is not "bunny". '
                'Set VIDEO_STORAGE_BACKEND=bunny in .env and try again.'
            )

        qs = VideoLesson.objects.select_related('course').exclude(video_id='').order_by(
            'course__title', 'order'
        )
        if lesson_pks:
            qs = qs.filter(pk__in=lesson_pks)
        if course_id:
            qs = qs.filter(course_id=course_id)
        if limit:
            qs = qs[:limit]

        total = len(qs)
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No lessons with a Bunny video GUID to process.'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN — nothing will be deleted ===\n'))
        else:
            self.stdout.write(self.style.WARNING(
                f'About to delete Bunny source files'
                f'{"" if keep_mp4 else " and MP4 fallbacks"} for up to {total} video(s).\n'
                f'This CANNOT be undone. Transcoded resolutions are not affected.\n'
            ))
            if not assume_yes:
                try:
                    answer = input('Type "yes" to continue: ').strip().lower()
                except EOFError:
                    # Non-interactive stdin (e.g. `docker-compose exec -T`).
                    raise CommandError(
                        'Aborted: no interactive terminal to confirm on. '
                        'Re-run with --dry-run to preview, or --yes to confirm.'
                    )
                if answer != 'yes':
                    raise CommandError('Aborted.')
                self.stdout.write('')

        self.stdout.write(f'Processing {total} lesson(s).\n')

        cleaned = skipped = pending = errors = 0
        freed_bytes = 0

        for i, lesson in enumerate(qs, start=1):
            prefix = (
                f'[{i}/{total}] {lesson.course.title} > "{lesson.title}" '
                f'(pk={lesson.pk}, guid={lesson.video_id})'
            )
            self.stdout.write(self.style.HTTP_INFO(prefix))

            try:
                video = storage.get_video(lesson.video_id)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  x Failed to read video: {exc}\n'))
                errors += 1
                continue

            status       = video.get('status')
            size_before  = video.get('storageSize') or 0
            has_original = bool(video.get('hasOriginal'))
            has_mp4      = bool(video.get('hasMP4Fallback'))

            # Deleting the source of a video that has not finished transcoding
            # would leave it permanently broken.
            if status != _STATUS_FINISHED:
                self.stdout.write(self.style.WARNING(
                    f'  ! Not finished transcoding (status={status}) — skipped\n'
                ))
                pending += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            if not has_original and not (has_mp4 and not keep_mp4):
                self.stdout.write(f'  -> Nothing to reclaim ({size_before / 1e9:.2f} GB)\n')
                skipped += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            try:
                data = storage.cleanup_video_storage(
                    lesson.video_id,
                    delete_original=True,
                    delete_mp4=not keep_mp4,
                    dry_run=dry_run,
                )
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  x Cleanup failed: {exc}\n'))
                errors += 1
                continue

            objects = data.get('storageObjectsToDelete') or []
            kept    = data.get('availableResolutionsAfter') or []

            if not objects:
                self.stdout.write(f'  -> Bunny reports nothing to delete\n')
                skipped += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            if dry_run:
                self.stdout.write(
                    f'  -> [dry-run] Would delete {", ".join(objects)} '
                    f'| now {size_before / 1e9:.2f} GB | keeps {",".join(kept)}\n'
                )
                cleaned += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            # Re-read so the reported saving is Bunny's own number, not an estimate.
            try:
                size_after = storage.get_video(lesson.video_id).get('storageSize') or 0
            except Exception:
                size_after = size_before

            saved = max(0, size_before - size_after)
            freed_bytes += saved
            self.stdout.write(self.style.SUCCESS(
                f'  -> Deleted {", ".join(objects)} | '
                f'{size_before / 1e9:.2f} -> {size_after / 1e9:.2f} GB '
                f'(freed {saved / 1e9:.2f} GB) | keeps {",".join(kept)}\n'
            ))
            cleaned += 1
            time.sleep(_THROTTLE_SECONDS)

        self.stdout.write('─' * 60)
        verb = 'would clean' if dry_run else 'cleaned'
        summary = (
            f'Done.  {verb}={cleaned}  nothing_to_do={skipped}  '
            f'still_transcoding={pending}  errors={errors}'
        )
        if not dry_run and freed_bytes:
            summary += f'  |  freed {freed_bytes / 1e9:.2f} GB'
        self.stdout.write(self.style.ERROR(summary) if errors else self.style.SUCCESS(summary))
