"""
Management command: sync_bunny_metadata

Scans VideoLessons with a Bunny video_id and updates missing thumbnail
or duration by fetching them from Bunny Stream.

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py sync_bunny_metadata

Options:
    --lesson <pk>      Only process the lesson with this pk (repeatable)
    --course <id>      Only process lessons belonging to this course id
    --force            Re-fetch even if thumbnail/duration already exist
    --dry-run          Print what would be updated without making changes
"""

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from videos.models import VideoLesson
from videos.storage import BunnyVideoStorage, get_video_storage


class Command(BaseCommand):
    help = 'Sync missing thumbnail and duration for VideoLessons from Bunny.'

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
            '--force',
            action='store_true',
            help='Re-fetch even if thumbnail/duration already exist.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be updated without making changes.',
        )

    def handle(self, *args, **options):
        lesson_pks = options['lesson_pks']
        course_id  = options['course_id']
        force      = options['force']
        dry_run    = options['dry_run']

        storage = get_video_storage()
        if not isinstance(storage, BunnyVideoStorage):
            raise CommandError(
                'VIDEO_STORAGE_BACKEND is not "bunny". '
                'Set VIDEO_STORAGE_BACKEND=bunny in .env and try again.'
            )

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN — nothing will be updated ===\n'))

        qs = VideoLesson.objects.select_related('course').exclude(video_id='').order_by(
            'course__title', 'order'
        )

        if lesson_pks:
            qs = qs.filter(pk__in=lesson_pks)
        if course_id:
            qs = qs.filter(course_id=course_id)
        if not force:
            qs = qs.filter(Q(thumbnail='') | Q(thumbnail__isnull=True) | Q(duration_seconds__isnull=True))

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No lessons need updating.'))
            return

        self.stdout.write(f'Found {total} lesson(s) to process.\n')

        ok = skipped = errors = 0

        for i, lesson in enumerate(qs.iterator(), start=1):
            prefix = (
                f'[{i}/{total}] {lesson.course.title} > "{lesson.title}" '
                f'(pk={lesson.pk}, guid={lesson.video_id})'
            )
            self.stdout.write(self.style.HTTP_INFO(prefix))

            need_duration  = force or lesson.duration_seconds is None
            need_thumbnail = force or not lesson.thumbnail

            if dry_run:
                parts = []
                if need_duration:
                    parts.append('duration')
                if need_thumbnail:
                    parts.append('thumbnail')
                self.stdout.write(f'  -> [dry-run] Would update: {", ".join(parts)}\n')
                ok += 1
                continue

            update_fields = []
            had_error = False

            if need_duration:
                try:
                    metadata = storage.get_metadata(lesson.video_id)
                    if metadata.duration_seconds is not None:
                        lesson.duration_seconds = metadata.duration_seconds
                        update_fields.append('duration_seconds')
                        self.stdout.write(f'  + duration={metadata.duration_seconds}s')
                    else:
                        self.stdout.write(self.style.WARNING('  ! Bunny returned no duration (still transcoding?)'))
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f'  x Failed to fetch duration: {exc}'))
                    had_error = True

            if need_thumbnail:
                try:
                    thumb_bytes = storage.extract_thumbnail(lesson.video_id)
                    if thumb_bytes:
                        lesson.thumbnail.save(
                            f'{lesson.pk}.jpg',
                            ContentFile(thumb_bytes),
                            save=False,
                        )
                        update_fields.append('thumbnail')
                        self.stdout.write(f'  + thumbnail={len(thumb_bytes) // 1024}KB')
                    else:
                        self.stdout.write(self.style.WARNING('  ! Bunny returned no thumbnail'))
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f'  x Failed to fetch thumbnail: {exc}'))
                    had_error = True

            if update_fields:
                lesson.save(update_fields=update_fields)
                self.stdout.write(self.style.SUCCESS(f'  -> Saved: {", ".join(update_fields)}\n'))
                ok += 1
            elif had_error:
                errors += 1
                self.stdout.write('')
            else:
                self.stdout.write(self.style.WARNING('  -> Nothing to update\n'))
                skipped += 1

        self.stdout.write('─' * 60)
        summary = f'Done.  ok={ok}  skipped={skipped}  errors={errors}'
        self.stdout.write(self.style.ERROR(summary) if errors else self.style.SUCCESS(summary))
