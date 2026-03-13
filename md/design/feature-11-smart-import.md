# Feature 11 — Smart Content Import cho VideoLesson & BookChapter

## 1. Mục tiêu

Giảm thiểu số bước admin cần thực hiện để import flashcard và quiz từ **7 bước phân tán → 2 bước**:

1. Mở trang VideoLesson hoặc BookChapter
2. Upload file CSV → Done

Admin không cần hiểu kiến trúc TrainingSet/TrainingActivity. Hệ thống tự tạo hierarchy phía sau.

---

## 2. Vấn đề hiện tại

### 2.1 Workflow quá nhiều bước

Để import flashcard + quiz cho một VideoLesson, admin hiện phải:

```
[1] Tạo/mở VideoLesson
[2] Tạo TrainingSet (trang riêng)
[3] Tạo TrainingActivity(FLASHCARD) (inline trong TrainingSet)
[4] Tạo TrainingActivity(QUIZ) (inline trong TrainingSet)
[5] Tạo Exam rỗng (trang riêng)
[6] Vào TrainingActivity → Import flashcards CSV
[7] Vào Exam → Import questions CSV
```

### 2.2 Entry point chồng chéo

Ba đường import flashcard hiện tồn tại song song:
- `FlashcardAdmin` → legacy lesson/module FK
- `VideoLessonAdmin` (change_form) → legacy lesson FK
- `TrainingActivityAdmin` → đúng chuẩn feature-10 (activity FK)

Admin không biết dùng đường nào. Hai đường đầu import sai vào legacy path.

### 2.3 BookChapterAdmin chưa có import

`BookChapterAdmin` hiện là admin bare-bones — không có inline, không có custom URL, không có import. Admin không có cách nào import content cho chapter.

---

## 3. Phạm vi V1

| Hạng mục | Trong scope |
|---|---|
| Import flashcard từ VideoLesson page | ✅ |
| Import quiz từ VideoLesson page | ✅ |
| Import flashcard từ BookChapter page | ✅ |
| Import quiz từ BookChapter page | ✅ |
| Auto-provision TrainingSet + TrainingActivity + Exam | ✅ |
| Ẩn legacy entry points (FlashcardAdmin, VideoLessonAdmin cũ) | ✅ |
| Preview trước khi import | ❌ (defer) |
| Bundle ZIP import | ❌ (defer) |
| Import history/audit log | ❌ (defer) |
| Update/overwrite mode | ❌ (defer) |

---

## 4. Data Model — Không thay đổi

Không có migration mới. Feature này chỉ thay đổi admin layer, tái dùng các model và utils đã có:

- `TrainingSet` — `get_or_create` từ lesson hoặc chapter
- `TrainingActivity` — `get_or_create` theo activity_type
- `Exam` — `get_or_create` khi import quiz
- `Flashcard` — tạo mới via `parse_flashcards_csv_for_activity()`
- `PracticeQuestion` — tạo mới via `parse_questions_csv()`

---

## 5. Backend — Admin Views

### 5.1 Utility function mới: `_provision_training_activity()`

Thêm vào `exams/utils.py` (hoặc `exams/admin_utils.py`):

```python
def provision_training_activity(source_type: str, source_obj, activity_type: str):
    """
    Get or create TrainingSet + TrainingActivity cho một content source.

    Args:
        source_type: 'lesson' | 'chapter'
        source_obj: VideoLesson hoặc BookChapter instance
        activity_type: 'FLASHCARD' | 'QUIZ'

    Returns:
        (TrainingActivity, Exam | None)
    """
    from exams.models import TrainingSet, TrainingActivity, Exam

    # Step 1: Get or create TrainingSet
    ts_kwargs = {source_type: source_obj}
    training_set, _ = TrainingSet.objects.get_or_create(
        **ts_kwargs,
        defaults={'title': f"Luyện tập — {source_obj.title}"}
    )

    # Step 2: Get or create TrainingActivity
    activity_title = "Flashcard" if activity_type == 'FLASHCARD' else "Quiz"
    activity_order = 0 if activity_type == 'FLASHCARD' else 1

    activity, _ = TrainingActivity.objects.get_or_create(
        training_set=training_set,
        activity_type=activity_type,
        defaults={
            'title': f"{activity_title} — {source_obj.title}",
            'order': activity_order,
            'is_active': True,
        }
    )

    # Step 3: If QUIZ, get or create Exam
    exam = None
    if activity_type == 'QUIZ':
        import uuid
        exam, _ = Exam.objects.get_or_create(
            activity=activity,
            defaults={
                'title': f"Quiz — {source_obj.title}",
                'slug': f"quiz-{source_obj.slug}-{str(activity.pk)[:8]}",
                'exam_type': 'QUIZ',
                'passing_score': 70,
            }
        )

    return activity, exam
```

**Lưu ý slug Exam:** Slug được tạo với suffix từ activity UUID để tránh trùng. Nếu `source_obj.slug` chưa tồn tại, dùng `slugify(source_obj.title)`.

---

### 5.2 VideoLessonAdmin — Thay thế import views

**File:** `videos/admin.py`

**Xóa / thay thế:**
- `import_flashcards_view()` cũ → thay bằng view mới dùng `provision_training_activity()`
- `export_flashcards_template_view()` → giữ nguyên

**Thêm mới:**
- `import_quiz_view()` — tương tự nhưng cho QUIZ

**URLs mới trong `get_urls()`:**
```python
path('<int:pk>/import-flashcards/', self.import_flashcards_view, name='lesson-import-flashcards'),
path('<int:pk>/import-quiz/', self.import_quiz_view, name='lesson-import-quiz'),
path('export-flashcards-template/', self.export_flashcards_template_view, name='lesson-export-flashcards-template'),
path('export-quiz-template/', self.export_quiz_template_view, name='lesson-export-quiz-template'),
```

**View logic `import_flashcards_view(request, pk)`:**
```python
def import_flashcards_view(self, request, pk):
    lesson = get_object_or_404(VideoLesson, pk=pk)
    if request.method == 'POST':
        csv_file = request.FILES.get('file')
        activity, _ = provision_training_activity('lesson', lesson, 'FLASHCARD')
        result = parse_flashcards_csv_for_activity(csv_file, activity)
        # show messages, redirect to lesson change page
        return redirect(reverse('admin:videos_videolesson_change', args=[pk]))
    # GET: render simple upload form
    return render(request, 'admin/videos/videolesson/import_flashcards.html', {...})
```

**View logic `import_quiz_view(request, pk)`:**
```python
def import_quiz_view(self, request, pk):
    lesson = get_object_or_404(VideoLesson, pk=pk)
    if request.method == 'POST':
        csv_file = request.FILES.get('file')
        _, exam = provision_training_activity('lesson', lesson, 'QUIZ')
        result = parse_questions_csv(csv_file, exam)
        # show messages, redirect
        return redirect(reverse('admin:videos_videolesson_change', args=[pk]))
    return render(request, 'admin/videos/videolesson/import_quiz.html', {...})
```

**Xóa khỏi `VideoLessonAdmin`:**
- `LessonFlashcardInline` — bỏ khỏi `inlines` list
- `LessonExamInline` — bỏ khỏi `inlines` list (thay bằng nút import trực tiếp)

**Giữ nguyên:**
- `fetch_metadata_view`, `extract_thumbnail_view`
- `change_form_template`

---

### 5.3 BookChapterAdmin — Thêm import hoàn toàn mới

**File:** `books/admin.py`

**Thêm custom URLs:**
```python
def get_urls(self):
    urls = super().get_urls()
    custom = [
        path('<int:pk>/import-flashcards/', self.import_flashcards_view, name='chapter-import-flashcards'),
        path('<int:pk>/import-quiz/', self.import_quiz_view, name='chapter-import-quiz'),
        path('export-flashcards-template/', self.export_flashcards_template_view, name='chapter-export-flashcards-template'),
        path('export-quiz-template/', self.export_quiz_template_view, name='chapter-export-quiz-template'),
    ]
    return custom + urls
```

**Views:** Logic giống VideoLessonAdmin nhưng `source_type='chapter'`.

**Thêm:**
```python
change_form_template = 'admin/books/bookchapter/change_form.html'
```

**Thêm vào `change_view()`:**
```python
def change_view(self, request, object_id, form_url='', extra_context=None):
    extra_context = extra_context or {}
    extra_context['import_flashcards_url'] = reverse('admin:chapter-import-flashcards', args=[object_id])
    extra_context['import_quiz_url'] = reverse('admin:chapter-import-quiz', args=[object_id])
    return super().change_view(request, object_id, form_url, extra_context)
```

---

### 5.4 Ẩn legacy entry points

**`exams/admin.py` — FlashcardAdmin:**
- Xóa custom URL `import-flashcards/` và `export-flashcards-template/`
- Xóa `change_list_template` (trả về default Django changelist)
- Giữ toàn bộ list_display, search, filter — chỉ bỏ import button

**`videos/admin.py` — VideoLessonAdmin:**
- Bỏ `LessonFlashcardInline` và `LessonExamInline` khỏi `inlines`
- Import views cũ được thay thế bởi views mới (không cần xóa URL, chỉ thay logic)

---

## 6. Backend — CSV Templates

### Flashcard template (giữ nguyên format)
```csv
category,front,back,difficulty
KHÁI NIỆM,"Câu hỏi mặt trước?","Nội dung mặt sau.",MEDIUM
```

### Quiz template (giữ nguyên format)
```csv
question_type,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,points,difficulty
MULTIPLE_CHOICE,"Câu hỏi MCQ?","Lựa chọn A","Lựa chọn B","Lựa chọn C","Lựa chọn D","c","Giải thích đáp án",10,MEDIUM
YES_NO,"Câu hỏi đúng/sai?","","","","","yes","Giải thích",10,EASY
TRUE_FALSE,"Đây là phát biểu đúng?","","","","","true","Giải thích",10,EASY
```

**Thêm `export_quiz_template_view()`** vào cả VideoLessonAdmin và BookChapterAdmin — trả về questions CSV template (tương tự `QuestionExportTemplateView` hiện có trong REST API).

---

## 7. Frontend Admin — Templates

### 7.1 `templates/admin/videos/videolesson/change_form.html` — Cập nhật

Thay thế block "Import / Export Flashcards" hiện có bằng block mới có 2 section:

```html
{% block after_related_objects %}
<div class="card mt-3">
  <div class="card-header"><strong>Import Nội dung Học tập</strong></div>
  <div class="card-body d-flex gap-3 flex-wrap">

    <!-- Flashcard -->
    <div>
      <p class="mb-1"><strong>Flashcard</strong></p>
      <a href="{% url 'admin:lesson-export-flashcards-template' %}" class="btn btn-sm btn-outline-secondary">
        Tải template CSV
      </a>
      <a href="{{ import_flashcards_url }}" class="btn btn-sm btn-primary">
        Import Flashcards
      </a>
    </div>

    <!-- Quiz -->
    <div>
      <p class="mb-1"><strong>Quiz / Bài ôn luyện</strong></p>
      <a href="{% url 'admin:lesson-export-quiz-template' %}" class="btn btn-sm btn-outline-secondary">
        Tải template CSV
      </a>
      <a href="{{ import_quiz_url }}" class="btn btn-sm btn-success">
        Import Quiz
      </a>
    </div>

  </div>
</div>
{% endblock %}
```

### 7.2 `templates/admin/videos/videolesson/import_flashcards.html` — Giữ nguyên cấu trúc

Chỉ cập nhật message bỏ dropdown chọn lesson/module (không còn cần thiết — lesson đã biết từ URL `pk`):

```html
<form method="post" enctype="multipart/form-data">
  {% csrf_token %}
  <p>Import flashcard cho bài học: <strong>{{ lesson.title }}</strong></p>
  <p class="text-muted">
    TrainingSet và TrainingActivity sẽ được tạo tự động nếu chưa tồn tại.<br>
    Import sẽ THÊM vào flashcard hiện có. Câu trùng mặt trước sẽ bị bỏ qua.
  </p>
  <input type="file" name="file" accept=".csv" required>
  <button type="submit" class="btn btn-primary">Import</button>
  <a href="../" class="btn btn-secondary">Hủy</a>
</form>
```

### 7.3 NEW `templates/admin/videos/videolesson/import_quiz.html`

Cấu trúc tương tự import_flashcards.html nhưng cho quiz questions.

### 7.4 NEW `templates/admin/books/bookchapter/change_form.html`

```html
{% extends "admin/change_form.html" %}
{% block after_related_objects %}
<div class="card mt-3">
  <div class="card-header"><strong>Import Nội dung Học tập</strong></div>
  <div class="card-body d-flex gap-3 flex-wrap">
    <div>
      <p class="mb-1"><strong>Flashcard</strong></p>
      <a href="{% url 'admin:chapter-export-flashcards-template' %}" class="btn btn-sm btn-outline-secondary">Tải template</a>
      <a href="{{ import_flashcards_url }}" class="btn btn-sm btn-primary">Import Flashcards</a>
    </div>
    <div>
      <p class="mb-1"><strong>Quiz</strong></p>
      <a href="{% url 'admin:chapter-export-quiz-template' %}" class="btn btn-sm btn-outline-secondary">Tải template</a>
      <a href="{{ import_quiz_url }}" class="btn btn-sm btn-success">Import Quiz</a>
    </div>
  </div>
</div>
{% endblock %}
```

### 7.5 NEW `templates/admin/books/bookchapter/import_flashcards.html`
### 7.6 NEW `templates/admin/books/bookchapter/import_quiz.html`

Cùng cấu trúc với VideoLesson templates, thay lesson → chapter.

---

## 8. Danh sách file thay đổi

### Sửa đổi
| File | Thay đổi |
|---|---|
| `src/backend/exams/utils.py` | Thêm `provision_training_activity()` |
| `src/backend/videos/admin.py` | Thay `import_flashcards_view` (legacy→smart), thêm `import_quiz_view`, xóa 2 inlines cũ |
| `src/backend/books/admin.py` | Thêm custom URLs, 4 views, `change_form_template`, `change_view()` |
| `src/backend/exams/admin.py` | Xóa `change_list_template` và custom import URLs của `FlashcardAdmin` |
| `src/backend/templates/admin/videos/videolesson/change_form.html` | Cập nhật block import — thêm Quiz section, bỏ dropdown |
| `src/backend/templates/admin/videos/videolesson/import_flashcards.html` | Bỏ dropdown lesson/module |

### Tạo mới
| File |
|---|
| `src/backend/templates/admin/videos/videolesson/import_quiz.html` |
| `src/backend/templates/admin/books/bookchapter/change_form.html` |
| `src/backend/templates/admin/books/bookchapter/import_flashcards.html` |
| `src/backend/templates/admin/books/bookchapter/import_quiz.html` |

### Không thay đổi
- `exams/models.py` — không có migration
- `exams/views.py`, `exams/views_training.py` — REST API giữ nguyên
- `exams/utils.py:parse_flashcards_csv_for_activity()` — giữ nguyên
- `exams/utils.py:parse_questions_csv()` — giữ nguyên
- `TrainingActivityAdmin` — giữ nguyên (vẫn hữu ích cho power user)

---

## 9. Edge Cases & Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| TrainingSet đã tồn tại | `get_or_create` → dùng existing, không tạo mới |
| TrainingActivity đã tồn tại | `get_or_create` → dùng existing, append flashcards/questions vào |
| Exam đã tồn tại (QUIZ) | `get_or_create` → dùng existing exam |
| Slug Exam bị trùng | Thêm suffix uuid ngắn vào slug khi create |
| File CSV rỗng | Parse function trả về `{'created': 0, 'skipped': 0, 'errors': []}` → flash message warning |
| File không phải CSV | DRF/Django trả về lỗi, hiển thị message |
| BookChapter chưa có slug | Tạm thời dùng `slugify(chapter.title)` cho Exam slug |

---

## 10. UX Flow sau khi implement

### Import flashcard cho VideoLesson
```
Admin → Mở VideoLesson → Cuộn xuống "Import Nội dung Học tập"
→ Click "Import Flashcards"
→ Upload flashcards.csv
→ Submit → Redirect về trang lesson với message:
   "✅ Đã tạo 25 flashcard. Bỏ qua 3 trùng lặp."
```

### Import quiz cho BookChapter
```
Admin → Mở BookChapter → Cuộn xuống "Import Nội dung Học tập"
→ Click "Import Quiz"
→ Upload questions.csv
→ Submit → Redirect về trang chapter với message:
   "✅ Đã tạo 10 câu hỏi."
```

---

## 11. Testing Checklist

- [ ] Import flashcard cho VideoLesson chưa có TrainingSet → TrainingSet + Activity được tạo tự động
- [ ] Import flashcard lần 2 → không tạo TrainingSet/Activity mới, chỉ append flashcards
- [ ] Import quiz cho VideoLesson → Exam được tạo tự động
- [ ] Import flashcard cho BookChapter (chưa có TrainingSet) → tạo đầy đủ
- [ ] Import quiz cho BookChapter → Exam được tạo
- [ ] Duplicate flashcard → skipped, không lỗi
- [ ] CSV lỗi format → message error rõ ràng
- [ ] FlashcardAdmin không còn nút import
- [ ] VideoLessonAdmin không còn `LessonFlashcardInline` và `LessonExamInline`
