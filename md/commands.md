# Management Commands

All commands run inside Docker:

```bash
docker-compose -f docker/docker-compose.yml exec web python manage.py <command>
```

---

## Django cơ bản

```bash
# Tạo migration sau khi đổi model
python manage.py makemigrations

# Chạy migration
python manage.py migrate

# Mở Django shell
python manage.py shell

# Tạo superuser
python manage.py createsuperuser
```

---

## Videos

### `sync_video_lessons` — Upload video từ folder local lên course

Đọc folder `data/video/`, tạo/cập nhật `VideoLesson`, upload lên Bunny Stream.

**Filename convention:** `{order}. {title}.{ext}`
> Ví dụ: `45. Khai quang 1.mp4` → order=45, title="Khai quang 1", is_free=False

```bash
# Xem trước (không thay đổi gì)
python manage.py sync_video_lessons <course_id> --dry-run

# Chạy thật
python manage.py sync_video_lessons <course_id>

# Đổi thư mục nguồn
python manage.py sync_video_lessons <course_id> --video-dir data/khoa-hoc-khac

# Re-upload dù đã có video_url
python manage.py sync_video_lessons <course_id> --force
```

Sau khi upload xong, chạy `sync_bunny_metadata` để lấy duration + thumbnail.

---

### `sync_bunny_metadata` — Fetch duration + thumbnail từ Bunny

```bash
# Tất cả lesson chưa có duration/thumbnail
python manage.py sync_bunny_metadata

# Chỉ một course
python manage.py sync_bunny_metadata --course <course_id>

# Chỉ một lesson
python manage.py sync_bunny_metadata --lesson <lesson_pk>

# Re-fetch dù đã có đủ dữ liệu
python manage.py sync_bunny_metadata --force

# Dry run
python manage.py sync_bunny_metadata --dry-run
```

---

### `upload_infographics_from_folder` — Upload PDF infographic cho lesson

Đọc folder `data/kymon/pdf/`, upload PDF theo `{order}_{name}.pdf`.

```bash
python manage.py upload_infographics_from_folder <course_id>

# Đổi folder
python manage.py upload_infographics_from_folder <course_id> --folder data/infographic

# Dry run
python manage.py upload_infographics_from_folder <course_id> --dry-run
```

---

### `generate_small_thumbnails` — Tạo thumbnail WebP nhỏ cho lesson

```bash
python manage.py generate_small_thumbnails

# Re-generate dù đã có
python manage.py generate_small_thumbnails --force
```

---

### `migrate_videos_to_bunny` — Migrate video local lên Bunny (one-time)

Dùng khi video đang lưu local (`video_url` trống), cần upload lên Bunny.

```bash
python manage.py migrate_videos_to_bunny --dry-run
python manage.py migrate_videos_to_bunny
python manage.py migrate_videos_to_bunny --course <slug>
python manage.py migrate_videos_to_bunny --lesson <pk>
```

---

## Books

### `sync_book_chapters` — Sync chương từ CSV + upload PDF

```bash
python manage.py sync_book_chapters <book_id>

# Chỉ định file CSV và folder PDF
python manage.py sync_book_chapters <book_id> \
    --csv data/chapter_list.csv \
    --pdf-dir data/book_chapter
```

**CSV format:** mỗi dòng là một tên chương (không cần header).
**PDF filename convention:** `{order}_{name}.pdf`

---

### `encrypt_chapters` — Mã hoá PDF chương (AES-256-GCM) + upload Bunny

```bash
python manage.py encrypt_chapters
```

---

### `migrate_bin_to_bunny` — Migrate file .bin từ Supabase → Bunny (one-time)

```bash
python manage.py migrate_bin_to_bunny --dry-run
python manage.py migrate_bin_to_bunny
python manage.py migrate_bin_to_bunny --chapter-ids 1,2,3
python manage.py migrate_bin_to_bunny --force-reupload
```

---

### `generate_small_covers` — Tạo cover WebP nhỏ cho book

```bash
python manage.py generate_small_covers
python manage.py generate_small_covers --force
```

---

## Workflow thường gặp

### Thêm video mới cho một course

```bash
# 1. Upload video lên Bunny
python manage.py sync_video_lessons <course_id>

# 2. Fetch duration + thumbnail sau khi Bunny transcode xong
python manage.py sync_bunny_metadata --course <course_id>

# 3. (Nếu có infographic PDF)
python manage.py upload_infographics_from_folder <course_id>
```

### Thêm sách mới

```bash
# 1. Sync chương + upload PDF
python manage.py sync_book_chapters <book_id>

# 2. Mã hoá và đưa lên Bunny
python manage.py encrypt_chapters
```
