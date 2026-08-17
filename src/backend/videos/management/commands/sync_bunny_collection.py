"""
Management command: sync_bunny_collection

Scans VideoLessons that have a Bunny video GUID, checks whether the video is
already assigned to its course's Bunny collection, and assigns it when it is
not.

The collection GUID comes from VideoCourse.bunny_collection_id. Courses with an
empty value are skipped, unless --collection is passed to override it for the
whole run.

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py sync_bunny_collection

Options:
    --lesson <pk>          Only process the lesson with this pk (repeatable)
    --course <id>          Only process lessons belonging to this course id
    --collection <guid>    Override the collection GUID for every processed
                           lesson, ignoring VideoCourse.bunny_collection_id
    --check                Report current assignment only, never write to Bunny
    --force                Reassign videos that already belong to a different
                           collection (default: warn and skip)
    --dry-run              Print what would change without calling Bunny
"""

import time

from django.core.management.base import BaseCommand, CommandError

from videos.models import VideoLesson
from videos.storage import BunnyVideoStorage, get_video_storage

# Bunny Stream API allows roughly 10 req/s; each lesson costs up to 3 calls.
_THROTTLE_SECONDS = 0.15


class Command(BaseCommand):
    help = "Assign VideoLessons to their course's Bunny Stream collection."

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
            '--collection',
            dest='collection_id',
            metavar='GUID',
            help='Override the collection GUID for every processed lesson.',
        )
        parser.add_argument(
            '--check',
            action='store_true',
            help='Report current assignment only, never write to Bunny.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Reassign videos that already belong to a different collection.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would change without calling Bunny.',
        )

    def handle(self, *args, **options):
        lesson_pks    = options['lesson_pks']
        course_id     = options['course_id']
        override      = (options['collection_id'] or '').strip()
        check_only    = options['check']
        force         = options['force']
        dry_run       = options['dry_run']

        storage = get_video_storage()
        if not isinstance(storage, BunnyVideoStorage):
            raise CommandError(
                'VIDEO_STORAGE_BACKEND is not "bunny". '
                'Set VIDEO_STORAGE_BACKEND=bunny in .env and try again.'
            )

        if check_only:
            self.stdout.write(self.style.WARNING('=== CHECK ONLY — nothing will be assigned ===\n'))
        elif dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN — nothing will be assigned ===\n'))

        qs = VideoLesson.objects.select_related('course').exclude(video_id='').order_by(
            'course__title', 'order'
        )
        if lesson_pks:
            qs = qs.filter(pk__in=lesson_pks)
        if course_id:
            qs = qs.filter(course_id=course_id)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No lessons with a Bunny video GUID to process.'))
            return

        # Validate every collection GUID up front so a bad value fails before
        # any video is touched.
        if override:
            wanted_ids = {override}
        else:
            wanted_ids = {
                cid for cid in qs.values_list('course__bunny_collection_id', flat=True) if cid
            }
        for cid in sorted(wanted_ids):
            if storage.get_collection(cid) is None:
                raise CommandError(
                    f'Collection "{cid}" does not exist in Bunny library '
                    f'{storage._library_id}.'
                )
            self.stdout.write(self.style.SUCCESS(f'[OK] Collection {cid} exists.'))

        self.stdout.write(f'\nFound {total} lesson(s) to process.\n')

        assigned = correct = skipped = warned = errors = 0

        for i, lesson in enumerate(qs.iterator(), start=1):
            wanted = override or (lesson.course.bunny_collection_id or '').strip()
            prefix = (
                f'[{i}/{total}] {lesson.course.title} > "{lesson.title}" '
                f'(pk={lesson.pk}, guid={lesson.video_id})'
            )
            self.stdout.write(self.style.HTTP_INFO(prefix))

            if not wanted:
                self.stdout.write(self.style.WARNING(
                    '  -> Course has no bunny_collection_id — skipped\n'
                ))
                skipped += 1
                continue

            try:
                current = storage.get_video_collection_id(lesson.video_id)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  x Failed to read collection: {exc}\n'))
                errors += 1
                continue

            if current == wanted:
                self.stdout.write(self.style.SUCCESS(f'  -> Already in {wanted}\n'))
                correct += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            if current and not force:
                self.stdout.write(self.style.WARNING(
                    f'  ! Belongs to a different collection {current} — '
                    f'skipped (use --force to reassign to {wanted})\n'
                ))
                warned += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            action = 'Would reassign' if current else 'Would assign'
            if check_only or dry_run:
                self.stdout.write(f'  -> [{"check" if check_only else "dry-run"}] '
                                  f'{action} {current or "(none)"} -> {wanted}\n')
                assigned += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            try:
                applied = storage.set_video_collection(lesson.video_id, wanted)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  x Failed to assign: {exc}\n'))
                errors += 1
                continue

            if applied == wanted:
                self.stdout.write(self.style.SUCCESS(
                    f'  -> Assigned {current or "(none)"} -> {wanted}\n'
                ))
                assigned += 1
            else:
                self.stdout.write(self.style.ERROR(
                    f'  x Bunny did not apply the collection '
                    f'(read back "{applied}", expected "{wanted}")\n'
                ))
                errors += 1

            time.sleep(_THROTTLE_SECONDS)

        self.stdout.write('─' * 60)
        summary = (
            f'Done.  assigned={assigned}  already_correct={correct}  '
            f'skipped={skipped}  conflicts={warned}  errors={errors}'
        )
        self.stdout.write(self.style.ERROR(summary) if errors else self.style.SUCCESS(summary))
