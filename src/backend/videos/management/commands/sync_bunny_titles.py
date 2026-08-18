"""
Management command: sync_bunny_titles

Renames videos on Bunny Stream so their title matches the VideoLesson title in
the database. Bunny titles default to the uploaded filename ("12. Khai mon.mp4"),
which makes the Bunny dashboard hard to cross-reference with the app.

The database is the source of truth; nothing in the app reads the Bunny title,
so this only affects what you see in the Bunny dashboard.

Usage:
    # Preview every rename
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py sync_bunny_titles --dry-run

    # Apply, one course at a time
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py sync_bunny_titles --course 3

Options:
    --lesson <pk>      Only process the lesson with this pk (repeatable)
    --course <id>      Only process lessons belonging to this course id
    --limit <n>        Stop after processing n lessons
    --template <str>   Title format, default "{title}". Available placeholders:
                       {title} {order} {course} {slug}
                       e.g. --template "{order:02d}. {title}"
    --only-mismatched  Skip lessons whose Bunny title already differs only by
                       leading numbering and the file extension
    --dry-run          Print what would change without calling Bunny
"""

import re
import time
import unicodedata

from django.core.management.base import BaseCommand, CommandError

from videos.models import VideoLesson
from videos.storage import BunnyVideoStorage, get_video_storage

# Bunny Stream API allows roughly 10 req/s; each rename costs 2 calls.
_THROTTLE_SECONDS = 0.15

_EXT_RE = re.compile(r'\.(mp4|mov|mkv|avi|webm)$', re.IGNORECASE)
_LEAD_NUM_RE = re.compile(r'^\s*(?:tập|tap|bài|bai)?\s*\d+(?:\.\d+)?\s*[\.\-_:\)]*\s*', re.IGNORECASE)


def _normalise(text: str) -> str:
    """Reduce a title to its comparable core: no extension, no leading number."""
    text = _EXT_RE.sub('', text or '')
    text = _LEAD_NUM_RE.sub('', text)
    text = re.sub(r'[\s_\-]+', ' ', text).strip().lower()
    return unicodedata.normalize('NFC', text)


class Command(BaseCommand):
    help = "Rename Bunny Stream videos to match their VideoLesson title."

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
            '--template',
            dest='template',
            default='{title}',
            metavar='STR',
            help='Title format. Placeholders: {title} {order} {course} {slug}.',
        )
        parser.add_argument(
            '--only-mismatched',
            action='store_true',
            help='Skip lessons that already match apart from numbering/extension.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would change without calling Bunny.',
        )

    def handle(self, *args, **options):
        lesson_pks = options['lesson_pks']
        course_id  = options['course_id']
        limit      = options['limit']
        template   = options['template']
        only_mism  = options['only_mismatched']
        dry_run    = options['dry_run']

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

        # Fail before touching Bunny if the template is malformed.
        try:
            sample = qs[0]
            self._render(template, sample)
        except (KeyError, ValueError, IndexError) as exc:
            raise CommandError(f'Invalid --template {template!r}: {exc}')

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN — nothing will be renamed ===\n'))

        self.stdout.write(f'Processing {total} lesson(s).\n')

        renamed = correct = skipped = errors = 0

        for i, lesson in enumerate(qs, start=1):
            wanted = self._render(template, lesson)
            prefix = (
                f'[{i}/{total}] {lesson.course.title} > "{lesson.title}" '
                f'(pk={lesson.pk}, guid={lesson.video_id})'
            )
            self.stdout.write(self.style.HTTP_INFO(prefix))

            try:
                current = (storage.get_video(lesson.video_id).get('title') or '').strip()
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  x Failed to read title: {exc}\n'))
                errors += 1
                continue

            if current == wanted:
                self.stdout.write(self.style.SUCCESS('  -> Title already matches\n'))
                correct += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            if only_mism and _normalise(current) == _normalise(wanted):
                self.stdout.write(
                    f'  -> Equivalent apart from numbering — skipped ({current})\n'
                )
                skipped += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            if dry_run:
                self.stdout.write(f'  -> [dry-run] {current!r} -> {wanted!r}\n')
                renamed += 1
                time.sleep(_THROTTLE_SECONDS)
                continue

            try:
                applied = storage.set_video_title(lesson.video_id, wanted)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  x Rename failed: {exc}\n'))
                errors += 1
                continue

            if applied == wanted:
                self.stdout.write(self.style.SUCCESS(f'  -> {current!r} -> {wanted!r}\n'))
                renamed += 1
            else:
                self.stdout.write(self.style.ERROR(
                    f'  x Bunny did not apply the title (read back {applied!r})\n'
                ))
                errors += 1

            time.sleep(_THROTTLE_SECONDS)

        self.stdout.write('─' * 60)
        verb = 'would rename' if dry_run else 'renamed'
        summary = (
            f'Done.  {verb}={renamed}  already_correct={correct}  '
            f'skipped={skipped}  errors={errors}'
        )
        self.stdout.write(self.style.ERROR(summary) if errors else self.style.SUCCESS(summary))

    @staticmethod
    def _render(template: str, lesson: VideoLesson) -> str:
        return template.format(
            title=lesson.title,
            order=lesson.order,
            course=lesson.course.title,
            slug=lesson.slug,
        ).strip()
