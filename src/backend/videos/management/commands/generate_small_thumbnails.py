"""Management command to backfill small WebP thumbnails for existing lessons (Feature 31)."""
from django.core.management.base import BaseCommand

from videos.models import VideoLesson
from videos.utils import generate_and_upload_small_thumbnail


class Command(BaseCommand):
    help = (
        "Generate and upload small WebP thumbnails to Bunny Storage for all lessons that have a "
        "thumbnail but no small_thumbnail yet. Use --force to re-upload all regardless."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            default=False,
            help='Re-upload and overwrite even if small_thumbnail already exists.',
        )

    def handle(self, *args, **options):
        force = options['force']

        qs = (
            VideoLesson.objects
            .exclude(thumbnail='')
            .filter(thumbnail__isnull=False)
            .select_related('course')
        )
        if not force:
            qs = qs.filter(small_thumbnail='')

        total = qs.count()
        self.stdout.write(f"Found {total} lesson(s) to process.")

        success = 0
        errors = 0
        for lesson in qs.iterator():
            try:
                url = generate_and_upload_small_thumbnail(lesson.pk, lesson.thumbnail, force=force)
                VideoLesson.objects.filter(pk=lesson.pk).update(small_thumbnail=url)
                success += 1
                self.stdout.write(f"  [OK] Lesson {lesson.pk}: {lesson.course.title} — {lesson.title}")
            except Exception as exc:
                errors += 1
                self.stderr.write(f"  [ERR] Lesson {lesson.pk}: {lesson.title} — {exc}")

        self.stdout.write(self.style.SUCCESS(f"Done. {success} uploaded, {errors} failed."))
