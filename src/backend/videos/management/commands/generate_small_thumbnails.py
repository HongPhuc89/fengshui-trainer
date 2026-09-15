"""Management command to backfill small WebP thumbnails for existing lessons (Feature 31)."""
from django.core.management.base import BaseCommand

from videos.bunny_file_storage import purge_cdn_url
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
        parser.add_argument(
            '--course-id',
            type=int,
            default=None,
            help='Only process lessons belonging to this course ID.',
        )
        parser.add_argument(
            '--lesson-id',
            type=int,
            default=None,
            help='Only process this single lesson ID.',
        )

    def handle(self, *args, **options):
        force = options['force']
        course_id = options['course_id']
        lesson_id = options['lesson_id']

        qs = (
            VideoLesson.objects
            .exclude(thumbnail='')
            .filter(thumbnail__isnull=False)
            .select_related('course')
        )
        if not force:
            qs = qs.filter(small_thumbnail='')
        if course_id is not None:
            qs = qs.filter(course_id=course_id)
        if lesson_id is not None:
            qs = qs.filter(pk=lesson_id)

        total = qs.count()
        self.stdout.write(f"Found {total} lesson(s) to process.")

        success = 0
        errors = 0
        for lesson in qs.iterator():
            try:
                url = generate_and_upload_small_thumbnail(lesson.pk, lesson.thumbnail, force=force)
                VideoLesson.objects.filter(pk=lesson.pk).update(small_thumbnail=url)
                if force:
                    purge_cdn_url(url)
                success += 1
                self.stdout.write(f"  [OK] Lesson {lesson.pk}: {lesson.course.title} — {lesson.title}")
            except Exception as exc:
                errors += 1
                self.stderr.write(f"  [ERR] Lesson {lesson.pk}: {lesson.title} — {exc}")

        self.stdout.write(self.style.SUCCESS(f"Done. {success} uploaded, {errors} failed."))
