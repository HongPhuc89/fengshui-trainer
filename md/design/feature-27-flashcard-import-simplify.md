# Feature 27 — Simplify Flashcard CSV Import & Cap Quick-Practice at 10 Cards

## Tóm tắt

Hai thay đổi nhỏ, độc lập nhau:

1. **Admin CSV import** — đơn giản hóa template flashcard từ 4 cột (`category,front,back,difficulty`) xuống còn 2 cột (`Front,Back`). Bỏ hoàn toàn `difficulty` và `category` khỏi template, cả hai parser, và HTML template trang import.
2. **Video flashcard API** — `LessonFlashcardsView` (endpoint quick-practice trong VideoPlayerView) giới hạn cứng tối đa **10 cards**.

Không có migration DB. Không thay đổi model. Không có file CSV cũ cần backward compat.

---

## Phân tích

- **Yêu cầu / ràng buộc:**
  - Admin thấy `difficulty` và `category` không cần thiết khi nhập liệu thực tế → bỏ.
  - Template 2 cột đơn giản hơn, ít lỗi hơn khi admin tự làm CSV tay.
  - Quick-practice trong video player nên gọn (10 cards) phù hợp thời gian xem video.
  - Không có file CSV cũ 4 cột nào đang lưu hành → không cần backward compat.
- **Các tầng liên quan:** Backend (Django) — cả hai parser + template constant + API view.
- **Frontend:** Không thay đổi. `VideoPlayerView` dùng `getLessonFlashcards(count=10)` — đã đúng.

---

## Đề xuất giải pháp

### Backend (Django)

#### 1. `src/backend/exams/utils.py` — Sửa template constant + cả hai parser

**`FLASHCARDS_CSV_TEMPLATE`** — thay bằng template 2 cột:

```python
FLASHCARDS_CSV_TEMPLATE = (
    'Front,Back\r\n'
    '"Sự khác biệt giữa Phong và Thủy?","Phong tán khí — gió làm tan khí. Thủy tụ khí — nước giữ khí lại."\r\n'
    '"Tại sao phòng ngủ cần năng lượng Âm?","Phòng ngủ cần năng lượng Âm để thư giãn. Quá nhiều Dương gây mất ngủ."\r\n'
    '"Kim khắc Mộc — ý nghĩa thực tế?","Kim đại diện cho sắc bén kiểm soát sự bành trướng của Mộc."\r\n'
)
```

**`parse_flashcards_csv_for_activity()`** — dùng cho admin import (VideoLesson/BookChapter page):

```python
def parse_flashcards_csv_for_activity(file_obj, activity: 'TrainingActivity') -> dict:
    text = file_obj.read()
    if isinstance(text, bytes):
        text = text.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    rows = [{k.strip().lower(): v for k, v in row.items()} for row in reader]

    existing = set(activity.flashcards.values_list('front', flat=True))
    next_order = activity.flashcards.count()
    to_create, skipped, errors = [], 0, []

    for i, row in enumerate(rows, start=2):
        front = row.get('front', '').strip()
        back  = row.get('back', '').strip()
        if not front or not back:
            errors.append({'row': i, 'error': 'Missing Front or Back — skipped'})
            skipped += 1
            continue
        if front in existing:
            errors.append({'row': i, 'error': 'Duplicate Front — skipped'})
            skipped += 1
            continue
        to_create.append(Flashcard(
            activity=activity,
            front=front,
            back=back,
            order=next_order + len(to_create),
        ))
        existing.add(front)

    Flashcard.objects.bulk_create(to_create)
    return {'created': len(to_create), 'skipped': skipped, 'errors': errors}
```

**`parse_flashcards_csv()`** — dùng cho REST API `FlashcardImportView` (`POST /api/exams/flashcards/{lesson_slug}/import/`), cũng cập nhật sang 2 cột:

```python
def parse_flashcards_csv(file_obj, lesson=None, module=None) -> dict:
    if not lesson and not module:
        return {'created': 0, 'skipped': 0, 'errors': [{'row': 0, 'error': 'Must provide lesson or module'}]}

    text = file_obj.read()
    if isinstance(text, bytes):
        text = text.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    rows = [{k.strip().lower(): v for k, v in row.items()} for row in reader]

    existing_qs = Flashcard.objects.filter(lesson=lesson) if lesson else Flashcard.objects.filter(module=module)
    existing = set(existing_qs.values_list('front', flat=True))
    next_order = existing_qs.count()
    to_create, skipped, errors = [], 0, []

    for i, row in enumerate(rows, start=2):
        front = row.get('front', '').strip()
        back  = row.get('back', '').strip()
        if not front or not back:
            errors.append({'row': i, 'error': 'Missing Front or Back — skipped'})
            skipped += 1
            continue
        if front in existing:
            errors.append({'row': i, 'error': 'Duplicate Front — skipped'})
            skipped += 1
            continue
        to_create.append(Flashcard(
            lesson=lesson,
            module=module,
            front=front,
            back=back,
            order=next_order + len(to_create),
        ))
        existing.add(front)

    Flashcard.objects.bulk_create(to_create)
    return {'created': len(to_create), 'skipped': skipped, 'errors': errors}
```

> `FLASHCARDS_CSV_TEMPLATE` được dùng chung cho cả `FlashcardExportTemplateView` (REST API) và `export_flashcards_template_view()` trong admin — tự động phản ánh template mới sau khi sửa constant.

---

#### 2. `src/backend/videos/views.py` — `LessonFlashcardsView`

Hiện tại: `count = min(int(request.query_params.get('count', 10)), 50)` — cap là 50.

Thay thành:

```python
count = min(int(request.query_params.get('count', 10)), 10)
```

Default = 10, hard cap = 10.

> `ActivityFlashcardsView` trong `exams/views_training.py` **không thay đổi** — phục vụ standalone TrainingView, giữ default 20 và cap 100.

---

#### 3. HTML template trang import admin

Cập nhật hướng dẫn trong các template sau để phản ánh format 2 cột mới:

| File | Nội dung cần sửa |
|---|---|
| `templates/admin/videos/videolesson/import_flashcards.html` | Mô tả format CSV: "2 cột: `Front`, `Back`" |
| `templates/admin/books/bookchapter/import_flashcards.html` | Như trên |

---

### Không thay đổi

| Thành phần | Lý do |
|---|---|
| `Flashcard` model (`difficulty`, `category` fields) | Vẫn tồn tại trong DB — data cũ không bị ảnh hưởng. Không import từ CSV nữa nhưng field vẫn có. |
| `ActivityFlashcardsView` (`exams/views_training.py`) | Standalone training — count cap 100, default 20. |
| `FlashcardSession.vue` | Dùng training endpoint khác, không liên quan. |
| `VideoPlayerView.vue` | `getLessonFlashcards(count=10)` — đã đúng. |
| `parse_questions_csv()` + `QUESTIONS_CSV_TEMPLATE` | Quiz template không thay đổi. |
| Serializers (`FlashcardForSessionSerializer`, `FlashcardWithReviewSerializer`) | Response format không thay đổi. |

---

## Danh sách file thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/exams/utils.py` | `FLASHCARDS_CSV_TEMPLATE` (2 cột); `parse_flashcards_csv_for_activity()` bỏ difficulty/category; `parse_flashcards_csv()` bỏ difficulty/category |
| `src/backend/videos/views.py` | `LessonFlashcardsView` — cap 50 → 10 |
| `src/backend/templates/admin/videos/videolesson/import_flashcards.html` | Cập nhật mô tả format CSV |
| `src/backend/templates/admin/books/bookchapter/import_flashcards.html` | Cập nhật mô tả format CSV |

**Không tạo file mới. Không có migration.**

---

## Bước tiếp theo

1. Sửa `exams/utils.py` — constant + cả hai parser.
2. Sửa `videos/views.py` — count cap.
3. Sửa 2 HTML template admin.
4. Test thủ công: tải template → điền 2 cột → import → verify flashcard tạo đúng.
5. Test API: `GET /api/videos/{slug}/lessons/{lesson_slug}/flashcards/?count=100` → phải trả về tối đa 10.
