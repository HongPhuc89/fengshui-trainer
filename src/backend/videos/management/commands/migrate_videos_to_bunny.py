"""
Management command: migrate_videos_to_bunny

Tìm tất cả VideoLesson có video lưu local (video_url trống, video_id là UUID hex),
upload lên Bunny Stream, rồi cập nhật video_id và video_url trong DB.

Cách dùng:
    docker-compose -f docker/docker-compose.yml exec web \
        python manage.py migrate_videos_to_bunny

Options:
    --dry-run          Chỉ in ra danh sách, không thực sự upload
    --lesson <pk>      Chỉ xử lý lesson có pk cụ thể (có thể dùng nhiều lần)
    --course <slug>    Chỉ xử lý các lesson thuộc course này
    --skip-existing    Bỏ qua lesson đã có video_url (mặc định: cũng bỏ qua)

Lưu ý:
    - Cần VIDEO_STORAGE_BACKEND=bunny và các BUNNY_* env var
    - File local phải tồn tại tại MEDIA_ROOT/videos/{video_id}.{ext}
    - Sau khi upload thành công, file local KHÔNG bị xóa (xóa thủ công khi cần)
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from videos.models import VideoLesson
from videos.storage import BunnyVideoStorage, get_video_storage

SUPPORTED_EXTS = ['.mp4', '.mov', '.mkv', '.avi', '.webm']


def find_local_file(video_id: str) -> Path | None:
    """Tìm file video local theo video_id (thử các extension phổ biến)."""
    videos_dir = Path(settings.MEDIA_ROOT) / 'videos'
    for ext in SUPPORTED_EXTS:
        path = videos_dir / f'{video_id}{ext}'
        if path.exists():
            return path
    return None


def is_local_lesson(lesson: VideoLesson) -> bool:
    """True nếu lesson có video lưu local (video_id có, video_url trống)."""
    return bool(lesson.video_id) and not lesson.video_url


class Command(BaseCommand):
    help = 'Upload các video local lên Bunny Stream và cập nhật DB.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Chỉ in danh sách, không upload.',
        )
        parser.add_argument(
            '--lesson',
            type=int,
            action='append',
            dest='lesson_pks',
            metavar='PK',
            help='Chỉ xử lý lesson có pk này (có thể dùng nhiều lần: --lesson 1 --lesson 2).',
        )
        parser.add_argument(
            '--course',
            type=str,
            dest='course_slug',
            metavar='SLUG',
            help='Chỉ xử lý các lesson thuộc course có slug này.',
        )

    def handle(self, *args, **options):
        dry_run     = options['dry_run']
        lesson_pks  = options['lesson_pks']
        course_slug = options['course_slug']

        # ── Kiểm tra storage backend ──────────────────────────────────────────
        storage = get_video_storage()
        if not isinstance(storage, BunnyVideoStorage):
            raise CommandError(
                'VIDEO_STORAGE_BACKEND không phải "bunny". '
                'Set VIDEO_STORAGE_BACKEND=bunny trong .env và thử lại.'
            )

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN — không có gì được upload ===\n'))

        # ── Xây dựng queryset ─────────────────────────────────────────────────
        qs = VideoLesson.objects.select_related('course').order_by('course__title', 'order')

        if lesson_pks:
            qs = qs.filter(pk__in=lesson_pks)
        if course_slug:
            qs = qs.filter(course__slug=course_slug)

        # Chỉ lấy lesson có video_id nhưng chưa có video_url (local storage)
        qs = qs.filter(video_url='').exclude(video_id='')

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS(
                'Không tìm thấy lesson nào cần migrate '
                '(tất cả đã có video_url hoặc chưa có video nào).'
            ))
            return

        self.stdout.write(f'Tìm thấy {total} lesson cần migrate.\n')

        ok = skipped = errors = 0

        for i, lesson in enumerate(qs.iterator(), start=1):
            prefix = f'[{i}/{total}] {lesson.course.title} › "{lesson.title}" (pk={lesson.pk})'
            self.stdout.write(self.style.HTTP_INFO(prefix))

            # ── Tìm file local ───────────────────────────────────────────────
            local_path = find_local_file(lesson.video_id)
            if not local_path:
                self.stdout.write(self.style.WARNING(
                    f'  ⚠ Không tìm thấy file local cho video_id={lesson.video_id} — bỏ qua.\n'
                ))
                skipped += 1
                continue

            size_mb = local_path.stat().st_size / 1024 / 1024
            self.stdout.write(f'  → File: {local_path.name}  ({size_mb:.1f} MB)')

            if dry_run:
                self.stdout.write('  → [dry-run] Sẽ upload lên Bunny.\n')
                ok += 1
                continue

            # ── Upload lên Bunny ─────────────────────────────────────────────
            try:
                self.stdout.write('  → Đang upload lên Bunny...', ending='')
                self.stdout.flush()

                with open(local_path, 'rb') as f:
                    # Wrap file object để có .chunks() method tương thích BunnyVideoStorage
                    result = storage.upload(_FileWrapper(f), local_path.name)

                lesson.video_id  = result.video_id
                lesson.video_url = result.video_url
                lesson.save(update_fields=['video_id', 'video_url'])

                self.stdout.write(f' guid={result.video_id}')
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ video_url={result.video_url}\n'
                ))
                ok += 1

            except Exception as exc:
                self.stdout.write('')  # newline after the '...' above
                self.stdout.write(self.style.ERROR(f'  ✗ Lỗi: {exc}\n'))
                errors += 1

        # ── Tổng kết ──────────────────────────────────────────────────────────
        self.stdout.write('─' * 60)
        summary = f'Hoàn tất.  OK={ok}  bỏ-qua={skipped}  lỗi={errors}'
        if errors:
            self.stdout.write(self.style.ERROR(summary))
        else:
            self.stdout.write(self.style.SUCCESS(summary))

        if not dry_run and ok:
            self.stdout.write(self.style.WARNING(
                '\nFile local vẫn còn trên đĩa. Xóa thủ công tại:\n'
                f'  {Path(settings.MEDIA_ROOT) / "videos"}\n'
                'sau khi đã kiểm tra video trên Bunny hoạt động đúng.'
            ))


class _FileWrapper:
    """
    Bọc file object thông thường để tương thích với BunnyVideoStorage._iter_chunks(),
    vốn dùng Django's UploadedFile.chunks().
    """
    CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB

    def __init__(self, f):
        self._f = f

    def chunks(self, chunk_size=None):
        size = chunk_size or self.CHUNK_SIZE
        while True:
            data = self._f.read(size)
            if not data:
                break
            yield data
