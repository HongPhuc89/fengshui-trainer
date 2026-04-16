"""
Management command: sync_video_lessons

Scans a local video folder, creates/updates VideoLesson records for a course,
uploads each video to Bunny Stream, and queues a metadata-fetch task.

Filename convention expected:
    {order}. {title}.{ext}
    e.g.  "45. Khai quang 1.mp4"  →  order=45, title="Khai quang 1"

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py sync_video_lessons <course_id>

Options:
    --video-dir <path>   Folder containing video files (default: data/video)
    --dry-run            Print what would happen without making any changes
    --force              Re-upload lessons that already have a video_url
"""

import re
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from videos.models import VideoCourse, VideoLesson
from videos.storage import BunnyVideoStorage, get_video_storage

DEFAULT_VIDEO_DIR = Path("data/video")
SUPPORTED_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}

_FILENAME_RE = re.compile(r"^(\d+)\.\s+(.+)$")


def _parse_filename(path: Path) -> tuple[int, str] | None:
    """
    Parse '{order}. {title}.{ext}' filename.
    Returns (order, title) or None if the name does not match.
    """
    stem = path.stem  # filename without extension
    m = _FILENAME_RE.match(stem)
    if not m:
        return None
    order = int(m.group(1))
    title = m.group(2).strip()
    return order, title


def _sorted_video_files(video_dir: Path) -> list[Path]:
    """Return video files sorted by the numeric order prefix."""
    files = [
        f for f in video_dir.iterdir()
        if f.suffix.lower() in SUPPORTED_EXTS and _parse_filename(f) is not None
    ]
    return sorted(files, key=lambda p: _parse_filename(p)[0])


def _sync_lesson_record(course: VideoCourse, order: int, title: str, dry_run: bool) -> tuple[VideoLesson | None, str]:
    """
    Create or update a VideoLesson record.
    Returns (lesson, status) where status is 'created' | 'updated' | 'unchanged'.
    """
    slug = slugify(title)
    lesson = VideoLesson.objects.filter(course=course, order=order).first()

    if lesson is None:
        if not dry_run:
            lesson = VideoLesson.objects.create(
                course=course,
                order=order,
                title=title,
                slug=slug,
                is_free=False,
            )
        return lesson, "created"

    changed_fields = []
    if lesson.title != title:
        lesson.title = title
        changed_fields.append("title")
    if lesson.slug != slug:
        lesson.slug = slug
        changed_fields.append("slug")

    if changed_fields:
        if not dry_run:
            lesson.save(update_fields=changed_fields)
        return lesson, "updated"

    return lesson, "unchanged"


class Command(BaseCommand):
    help = "Sync VideoLesson records from a local folder and upload videos to Bunny Stream."

    def add_arguments(self, parser):
        parser.add_argument("course_id", type=int, help="ID of the VideoCourse to sync")
        parser.add_argument(
            "--video-dir",
            default=str(DEFAULT_VIDEO_DIR),
            help=f"Folder containing video files (default: {DEFAULT_VIDEO_DIR})",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be done without making any changes.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-upload even if video_url already exists.",
        )

    def handle(self, *args, **options):
        course_id = options["course_id"]
        video_dir = Path(options["video_dir"])
        dry_run   = options["dry_run"]
        force     = options["force"]

        # ── Validate course ───────────────────────────────────────────────────
        try:
            course = VideoCourse.objects.get(id=course_id)
        except VideoCourse.DoesNotExist:
            raise CommandError(f"VideoCourse id={course_id} not found.")

        self.stdout.write(f'Course: "{course.title}" (id={course.id})\n')

        # ── Validate storage ──────────────────────────────────────────────────
        storage = get_video_storage()
        if not isinstance(storage, BunnyVideoStorage):
            raise CommandError(
                'VIDEO_STORAGE_BACKEND is not "bunny". '
                "Set VIDEO_STORAGE_BACKEND=bunny in .env and try again."
            )

        # ── Validate video dir ────────────────────────────────────────────────
        if not video_dir.exists():
            raise CommandError(f"Video directory not found: {video_dir}")

        video_files = _sorted_video_files(video_dir)
        if not video_files:
            self.stdout.write(self.style.WARNING("No matching video files found in directory."))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN — nothing will be changed ===\n"))

        self.stdout.write(f"Found {len(video_files)} video file(s).\n")

        # ── Process files ─────────────────────────────────────────────────────
        created = updated = unchanged = uploaded = skipped = errors = 0

        for i, path in enumerate(video_files, start=1):
            order, title = _parse_filename(path)
            size_mb = path.stat().st_size / 1024 / 1024

            self.stdout.write(
                self.style.HTTP_INFO(
                    f"[{i}/{len(video_files)}] order={order}: {title}  ({size_mb:.1f} MB)"
                )
            )

            # ── Step 1: sync DB record ────────────────────────────────────────
            lesson, record_status = _sync_lesson_record(course, order, title, dry_run)

            if record_status == "created":
                created += 1
                self.stdout.write(f"  + record: CREATED (id={lesson.pk if lesson else 'dry-run'})")
            elif record_status == "updated":
                updated += 1
                self.stdout.write(f"  ~ record: UPDATED (id={lesson.pk})")
            else:
                unchanged += 1

            # ── Step 2: upload video ──────────────────────────────────────────
            if dry_run:
                needs_upload = force or not (lesson and lesson.video_url)
                self.stdout.write(
                    f"  → [dry-run] Would {'upload' if needs_upload else 'skip upload (already uploaded)'}.\n"
                )
                continue

            if lesson is None:
                # Should not happen outside dry-run, but guard anyway.
                self.stdout.write(self.style.ERROR("  x lesson record is None — skipping upload.\n"))
                errors += 1
                continue

            if lesson.video_url and not force:
                self.stdout.write(f"  - upload: skipped (video_url already set).\n")
                skipped += 1
                continue

            try:
                self.stdout.write("  → Uploading to Bunny...", ending="")
                self.stdout.flush()

                with open(path, "rb") as f:
                    result = storage.upload(File(f), path.name)

                VideoLesson.objects.filter(pk=lesson.pk).update(
                    video_id=result.video_id,
                    video_url=result.video_url,
                )
                lesson.video_id  = result.video_id
                lesson.video_url = result.video_url

                self.stdout.write(f" guid={result.video_id}")
                self.stdout.write(self.style.SUCCESS(f"  ✓ uploaded.\n"))
                uploaded += 1

            except Exception as exc:
                self.stdout.write("")  # newline after the '...' above
                self.stdout.write(self.style.ERROR(f"  ✗ Upload failed: {exc}\n"))
                errors += 1

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write("─" * 60)
        summary = (
            f"Records — created={created}  updated={updated}  unchanged={unchanged} | "
            f"Upload — ok={uploaded}  skipped={skipped}  errors={errors}"
        )
        if errors:
            self.stdout.write(self.style.ERROR(summary))
        else:
            self.stdout.write(self.style.SUCCESS(summary))

        if not dry_run and uploaded:
            self.stdout.write(self.style.WARNING(
                "\nRun sync_bunny_metadata to fetch duration and thumbnail after Bunny finishes transcoding."
            ))
