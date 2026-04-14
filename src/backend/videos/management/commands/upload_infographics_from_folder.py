"""
Management command: upload_infographics_from_folder

Scan a local folder for PDF infographic files matching the pattern
``{order}_{any_name}.pdf``, then for each file check whether the
corresponding VideoLesson in the given course already has an
infographic uploaded to Bunny.  If not, upload it.

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py upload_infographics_from_folder <course_id>

Options:
    --folder   Path to the folder containing PDF files.
               Defaults to  data/kymon/pdf  relative to BASE_DIR.
    --dry-run  Print what would be uploaded without actually uploading.

File naming convention:
    <order>_<any_name>.pdf
    e.g.  1_introduction.pdf  →  lesson with order=1 in the course

Notes:
    - Lessons that already have infographic_pdf_key are skipped.
    - Requires BUNNY_STORAGE_ZONE / BUNNY_STORAGE_API_KEY env vars.
"""

import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from videos.models import VideoCourse, VideoLesson


# filename pattern: leading integer + any non-digit separator + anything + .pdf
# Matches: "10. Tử Môn.pdf", "2.càn khôn.pdf", "1_introduction.pdf", etc.
_FILENAME_RE = re.compile(r'^(\d+)\D.*\.pdf$', re.IGNORECASE)


class Command(BaseCommand):
    help = 'Upload infographic PDFs from a local folder to Bunny for a video course.'

    def add_arguments(self, parser):
        parser.add_argument(
            'course_id',
            type=int,
            help='Primary key of the VideoCourse to process.',
        )
        parser.add_argument(
            '--folder',
            default=None,
            help=(
                'Path to the folder containing PDF files. '
                'Defaults to data/pdf inside BASE_DIR.'
            ),
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Print actions without uploading anything.',
        )

    def handle(self, *args, **options):
        from videos.bunny_file_storage import upload_pdf_to_bunny  # local import to mirror project style

        course_id: int = options['course_id']
        dry_run: bool = options['dry_run']

        # --- resolve folder ---
        if options['folder']:
            folder = Path(options['folder'])
        else:
            folder = Path(settings.BASE_DIR) / 'data' / 'pdf'

        if not folder.exists():
            raise CommandError(f'Folder does not exist: {folder}')
        if not folder.is_dir():
            raise CommandError(f'Path is not a directory: {folder}')

        # --- load course ---
        try:
            course = VideoCourse.objects.get(pk=course_id)
        except VideoCourse.DoesNotExist:
            raise CommandError(f'VideoCourse with id={course_id} does not exist.')

        self.stdout.write(
            f'Course: [{course.pk}] {course.title}'
        )
        self.stdout.write(f'Folder: {folder}')
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY-RUN mode — nothing will be uploaded.'))

        # --- scan folder for matching PDF files ---
        pdf_files: dict[int, Path] = {}
        for path in sorted(folder.iterdir()):
            if not path.is_file():
                continue
            m = _FILENAME_RE.match(path.name)
            if not m:
                self.stdout.write(
                    self.style.WARNING(f'  Skipping (name does not match pattern): {path.name}')
                )
                continue
            order = int(m.group(1))
            if order in pdf_files:
                self.stdout.write(
                    self.style.WARNING(
                        f'  Duplicate order={order}: {path.name} conflicts with '
                        f'{pdf_files[order].name} — keeping first match.'
                    )
                )
                continue
            pdf_files[order] = path

        if not pdf_files:
            self.stdout.write(self.style.WARNING('No matching PDF files found.'))
            return

        self.stdout.write(f'Found {len(pdf_files)} PDF file(s): orders {sorted(pdf_files)}')

        # --- pre-load lessons for the course ---
        lessons: dict[int, VideoLesson] = {
            lesson.order: lesson
            for lesson in VideoLesson.objects.filter(course=course)
        }

        # --- process each PDF ---
        ok = skipped = errors = 0

        for order in sorted(pdf_files):
            pdf_path = pdf_files[order]
            lesson = lessons.get(order)

            if lesson is None:
                self.stdout.write(
                    self.style.WARNING(
                        f'  order={order} ({pdf_path.name}): no lesson found — skipping.'
                    )
                )
                skipped += 1
                continue

            if lesson.infographic_pdf_key:
                self.stdout.write(
                    f'  order={order} lesson="{lesson.title}": already has infographic '
                    f'(key={lesson.infographic_pdf_key}) — skipping.'
                )
                skipped += 1
                continue

            self.stdout.write(
                f'  order={order} lesson="{lesson.title}" ({pdf_path.name}): '
                + ('would upload' if dry_run else 'uploading...')
            )

            if dry_run:
                ok += 1
                continue

            try:
                with open(pdf_path, 'rb') as fh:
                    key = upload_pdf_to_bunny(
                        fh,
                        lesson_pk=lesson.pk,
                        lesson_uuid=str(lesson.public_id),
                        existing_key='',  # no existing key — create new
                    )
                lesson.infographic_pdf_key = key
                lesson.save(update_fields=['infographic_pdf_key'])
                self.stdout.write(
                    self.style.SUCCESS(f'    Uploaded → key={key}')
                )
                ok += 1
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(
                    self.style.ERROR(f'    ERROR uploading: {exc}')
                )
                errors += 1

        # --- summary ---
        self.stdout.write('')
        self.stdout.write(
            f'Done. uploaded={ok}  skipped={skipped}  errors={errors}'
        )
        if errors:
            raise CommandError(f'{errors} file(s) failed to upload.')
