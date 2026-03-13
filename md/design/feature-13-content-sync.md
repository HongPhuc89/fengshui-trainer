# Feature 13: Content Sync — Django Management Commands

**Ngày tạo:** 2026-03-13
**Status:** 📝 Design — chưa implement
**Priority:** Medium (dev workflow improvement)
**Effort ước tính:** S (~2 ngày)

---

## Vấn đề

Khi develop local, DB records cho Books và Videos cần phải khớp với staging/production để test đúng nội dung thật. Hiện tại:
- Không có cách nào export content từ production/staging xuống local
- `import_fake_data` chỉ dùng fixture cứng (data test, không phải content thật)
- Files (PDF, thumbnail, video) đã nằm trên shared storage (Supabase + Bunny) → chỉ cần sync DB records

**Không cần sync files** vì tất cả environments trỏ vào cùng Supabase bucket + Bunny library.

---

## Giải pháp: 2 Management Commands

### Command 1: `sync_content_export`

Export DB records cho Books + Videos thành JSON portable.

**Chạy trên:** production hoặc staging (môi trường nguồn)

```bash
# Export toàn bộ
docker-compose -f docker/docker-compose.yml exec web \
  python manage.py sync_content_export --output /tmp/content.json

# Chỉ export books
docker-compose -f docker/docker-compose.yml exec web \
  python manage.py sync_content_export --models books --output /tmp/books.json

# Chỉ export videos
docker-compose -f docker/docker-compose.yml exec web \
  python manage.py sync_content_export --models videos --output /tmp/videos.json
```

**Models được export:**
- Books: `BookCategory`, `Book`, `BookChapter`
- Videos: `VideoCategory`, `VideoCourse`, `VideoLesson`

**Models KHÔNG export** (user-specific, không cần sync):
- `UserBookPurchase`, `UserVideoPurchase`
- `UserChapterProgress`, `UserLessonProgress`
- `FlashcardReview`, `UserExamProgress`
- `TrainingSet`, `TrainingActivity` (được tạo lại qua Smart Import)
- Tất cả user data

---

### Command 2: `sync_content_import`

Import JSON từ Command 1 vào môi trường target. Dùng `update_or_create` theo slug → **idempotent**, an toàn chạy nhiều lần.

**Chạy trên:** local (hoặc staging khi sync từ production)

```bash
docker-compose -f docker/docker-compose.yml exec web \
  python manage.py sync_content_import --input /tmp/content.json

# Dry run — chỉ preview, không ghi DB
docker-compose -f docker/docker-compose.yml exec web \
  python manage.py sync_content_import --input /tmp/content.json --dry-run
```

---

## Workflow thực tế

```
[Staging/Production]
    │
    ├── python manage.py sync_content_export --output /tmp/content.json
    │
    │   (copy file về local)
    │   scp user@server:/tmp/content.json ./content.json
    │   hoặc: copy thủ công
    │
[Local]
    ├── python manage.py sync_content_import --input content.json
    │
    └── Xong — files PDF/thumbnail/video đã trên Supabase/Bunny
        không cần download gì thêm
```

---

## Chi tiết Implementation

### File locations

```
src/backend/books/management/commands/sync_content_export.py
src/backend/books/management/commands/sync_content_import.py
```

> Đặt trong app `books` vì nó quản lý cả books lẫn videos content (có thể chuyển sang app `core` nếu muốn sau).

---

### sync_content_export.py

```python
# src/backend/books/management/commands/sync_content_export.py

import json
from django.core.management.base import BaseCommand
from books.models import BookCategory, Book, BookChapter
from videos.models import VideoCategory, VideoCourse, VideoLesson


class Command(BaseCommand):
    help = "Export Books + Videos DB records to a portable JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default="content_export.json",
            help="Output file path (default: content_export.json)",
        )
        parser.add_argument(
            "--models",
            type=str,
            choices=["books", "videos", "all"],
            default="all",
            help="Which models to export (default: all)",
        )

    def handle(self, *args, **options):
        output_path = options["output"]
        models = options["models"]
        data = {"version": 1, "books": {}, "videos": {}}

        if models in ("books", "all"):
            data["books"] = self._export_books()
            self.stdout.write(self.style.SUCCESS(
                f"Exported {len(data['books']['books'])} books, "
                f"{len(data['books']['chapters'])} chapters"
            ))

        if models in ("videos", "all"):
            data["videos"] = self._export_videos()
            self.stdout.write(self.style.SUCCESS(
                f"Exported {len(data['videos']['courses'])} courses, "
                f"{len(data['videos']['lessons'])} lessons"
            ))

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

        self.stdout.write(self.style.SUCCESS(f"✅ Saved to {output_path}"))

    def _export_books(self):
        categories = list(BookCategory.objects.values(
            "id", "name", "slug", "description", "order"
        ))
        books = list(Book.objects.values(
            "id", "title", "slug", "author", "description",
            "price_lt", "is_free", "table_of_contents",
            "cover_image", "final_exam_id",
            "category__slug",  # FK reference by slug
        ))
        chapters = list(BookChapter.objects.values(
            "id", "title", "slug", "order", "is_demo",
            "file_path", "file_size", "page_count",
            "book__slug",  # FK reference by slug
        ))
        return {
            "categories": categories,
            "books": books,
            "chapters": chapters,
        }

    def _export_videos(self):
        categories = list(VideoCategory.objects.values(
            "id", "name", "slug", "description", "order"
        ))
        courses = list(VideoCourse.objects.values(
            "id", "title", "slug", "description", "level",
            "cover_image", "trailer_url", "price_lt", "is_free",
            "total_duration_seconds", "total_lessons", "final_exam_id",
            "category__slug",
        ))
        lessons = list(VideoLesson.objects.values(
            "id", "title", "slug", "order", "is_demo",
            "video_url", "video_id", "thumbnail",
            "duration_seconds", "transcript", "summary",
            "course__slug",
        ))
        return {
            "categories": categories,
            "courses": courses,
            "lessons": lessons,
        }
```

---

### sync_content_import.py

```python
# src/backend/books/management/commands/sync_content_import.py

import json
from django.core.management.base import BaseCommand
from django.db import transaction
from books.models import BookCategory, Book, BookChapter
from videos.models import VideoCategory, VideoCourse, VideoLesson


class Command(BaseCommand):
    help = "Import Books + Videos from a JSON file exported by sync_content_export"

    def add_arguments(self, parser):
        parser.add_argument(
            "--input",
            type=str,
            required=True,
            help="Input JSON file path",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without writing to DB",
        )

    def handle(self, *args, **options):
        input_path = options["input"]
        dry_run = options["dry_run"]

        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — không ghi vào DB"))

        with transaction.atomic():
            if data.get("books"):
                self._import_books(data["books"], dry_run)
            if data.get("videos"):
                self._import_videos(data["videos"], dry_run)

            if dry_run:
                transaction.set_rollback(True)  # rollback toàn bộ sau khi preview

        self.stdout.write(self.style.SUCCESS("✅ Import hoàn tất"))

    def _import_books(self, data, dry_run):
        # 1. Categories
        cat_map = {}  # slug → instance
        for cat_data in data.get("categories", []):
            slug = cat_data["slug"]
            if not dry_run:
                obj, created = BookCategory.objects.update_or_create(
                    slug=slug,
                    defaults={k: v for k, v in cat_data.items() if k not in ("id", "slug")},
                )
                cat_map[slug] = obj
            action = "CREATE" if slug not in cat_map else "UPDATE"
            self.stdout.write(f"  BookCategory [{action}] {slug}")

        # 2. Books
        book_map = {}  # slug → instance
        for book_data in data.get("books", []):
            slug = book_data["slug"]
            cat_slug = book_data.pop("category__slug", None)
            fields = {k: v for k, v in book_data.items() if k not in ("id", "slug")}
            if cat_slug and cat_slug in cat_map:
                fields["category"] = cat_map[cat_slug]
            if not dry_run:
                obj, created = Book.objects.update_or_create(slug=slug, defaults=fields)
                book_map[slug] = obj
            self.stdout.write(f"  Book [{'CREATE' if not dry_run else 'DRY'}] {slug}")

        # 3. Chapters
        for chap_data in data.get("chapters", []):
            slug = chap_data["slug"]
            book_slug = chap_data.pop("book__slug", None)
            fields = {k: v for k, v in chap_data.items() if k not in ("id", "slug")}
            if book_slug and book_slug in book_map:
                fields["book"] = book_map[book_slug]
            if not dry_run:
                BookChapter.objects.update_or_create(slug=slug, defaults=fields)
            self.stdout.write(f"  BookChapter [{'DRY' if dry_run else 'UPSERT'}] {slug}")

    def _import_videos(self, data, dry_run):
        # 1. Categories
        cat_map = {}
        for cat_data in data.get("categories", []):
            slug = cat_data["slug"]
            if not dry_run:
                obj, _ = VideoCategory.objects.update_or_create(
                    slug=slug,
                    defaults={k: v for k, v in cat_data.items() if k not in ("id", "slug")},
                )
                cat_map[slug] = obj
            self.stdout.write(f"  VideoCategory [UPSERT] {slug}")

        # 2. Courses
        course_map = {}
        for course_data in data.get("courses", []):
            slug = course_data["slug"]
            cat_slug = course_data.pop("category__slug", None)
            fields = {k: v for k, v in course_data.items() if k not in ("id", "slug")}
            if cat_slug and cat_slug in cat_map:
                fields["category"] = cat_map[cat_slug]
            if not dry_run:
                obj, _ = VideoCourse.objects.update_or_create(slug=slug, defaults=fields)
                course_map[slug] = obj
            self.stdout.write(f"  VideoCourse [UPSERT] {slug}")

        # 3. Lessons
        for lesson_data in data.get("lessons", []):
            slug = lesson_data["slug"]
            course_slug = lesson_data.pop("course__slug", None)
            fields = {k: v for k, v in lesson_data.items() if k not in ("id", "slug")}
            if course_slug and course_slug in course_map:
                fields["course"] = course_map[course_slug]
            if not dry_run:
                VideoLesson.objects.update_or_create(slug=slug, defaults=fields)
            self.stdout.write(f"  VideoLesson [UPSERT] {slug}")
```

---

## Trade-off & lưu ý

| Điểm | Ghi chú |
|---|---|
| **Idempotent** | `update_or_create` theo `slug` — an toàn chạy nhiều lần |
| **Không xóa** | Import chỉ tạo mới / cập nhật, không xóa records không có trong JSON. Nếu cần sync xóa → dùng `--purge` flag (V2) |
| **File URLs** | `cover_image`, `file_path`, `thumbnail`, `video_url` được import as-is (string path/URL). Vì files đã trên Supabase/Bunny nên không cần download |
| **Private IDs** | Export bao gồm `id` (UUID) để reference, nhưng import dùng `slug` làm key — tránh conflict ID giữa environments |
| **TrainingSet** | Không được export. Sau khi import content, cần chạy Smart Import (Feature 11) để tạo lại flashcard/quiz nếu cần |
| **final_exam_id** | Là UUID raw (không FK), import as-is. Nếu exam không tồn tại ở target → field sẽ có giá trị orphan (acceptable) |

---

## Scope V1

- [ ] `sync_content_export.py` — export books + videos theo `--models` flag
- [ ] `sync_content_import.py` — import với `update_or_create` + `--dry-run` support
- [ ] Test thủ công: export từ staging → import local → verify book list hiển thị đúng

## Scope V2 (defer)

- [ ] `--purge` flag: xóa records không có trong JSON (sync xóa)
- [ ] Export TrainingSet / Flashcard / Exam data
- [ ] Compress output JSON (gzip)
- [ ] Progress bar cho import lớn (nhiều chapters)

---

## Bước tiếp theo

- [ ] Implement `sync_content_export.py`
- [ ] Implement `sync_content_import.py`
- [ ] Test với content thật từ staging
