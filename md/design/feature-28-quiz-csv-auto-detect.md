# Feature 28 — Import Quiz từ NotebookLM CSV (Separate Button)

## Tóm tắt

Thêm button **"Import Quiz (NotebookLM)"** riêng biệt vào trang VideoLesson và BookChapter trong admin, cho phép upload thẳng file CSV export từ NotebookLM mà không cần convert thủ công. Parser nội bộ hiện tại không thay đổi.

Không có migration DB. Không thay đổi model. Parser mới độc lập với parser nội bộ.

---

## Phân tích format

### Format NotebookLM (file `chuong1-quiz.csv`)

```csv
"#","Question","Option A","Option B","Option C","Option D","Correct Answer","Rationale"
"1","Câu hỏi?","Đáp án A","Đáp án B","Đáp án C","Đáp án D","A. Đáp án A","Giải thích..."
```

### Mapping sang internal model

| NotebookLM column | Internal field | Transform |
|---|---|---|
| `#` | — | Bỏ qua |
| `Question` | `question_text` | strip |
| `Option A` | option id=`a` | strip |
| `Option B` | option id=`b` | strip |
| `Option C` | option id=`c` | strip |
| `Option D` | option id=`d` | strip, có thể trống |
| `Correct Answer` | `correct_answer` | `"A. ..."` → lấy ký tự đầu, lowercase → `"a"` |
| `Rationale` | `explanation` | strip |
| _(absent)_ | `question_type` | Default: `MULTIPLE_CHOICE` |
| _(absent)_ | `points` | Default: `10` |
| _(absent)_ | `difficulty` | Default: `''` |

---

## Đề xuất giải pháp

### Backend (Django)

#### 1. `src/backend/exams/utils.py` — Thêm parser mới

```python
def parse_questions_csv_notebooklm(file_obj, exam) -> dict:
    """
    Parse NotebookLM quiz CSV format and bulk-create PracticeQuestions for an Exam.

    Expected columns: #, Question, Option A, Option B, Option C, Option D,
                      Correct Answer (format "A. text"), Rationale
    All rows are created as MULTIPLE_CHOICE with points=10.
    """
    text = file_obj.read()
    if isinstance(text, bytes):
        text = text.decode('utf-8-sig')

    reader = csv.DictReader(io.StringIO(text))
    # Normalize header keys: strip + lowercase
    rows = [{k.strip().lower(): v for k, v in row.items()} for row in reader]

    existing = set(exam.questions.values_list('question_text', flat=True))
    next_order = exam.questions.count() + 1
    to_create, skipped, errors = [], 0, []

    for i, row in enumerate(rows, start=2):
        q_text = row.get('question', '').strip()
        if not q_text:
            errors.append({'row': i, 'error': 'Question trống — skipped'})
            skipped += 1
            continue
        if q_text in existing:
            errors.append({'row': i, 'error': 'Duplicate Question — skipped'})
            skipped += 1
            continue

        options = [
            {'id': k, 'text': row.get(f'option {k}', '').strip()}
            for k in ('a', 'b', 'c', 'd')
            if row.get(f'option {k}', '').strip()
        ]
        if len(options) < 2:
            errors.append({'row': i, 'error': 'Cần ít nhất 2 đáp án — skipped'})
            skipped += 1
            continue

        # "A. Full answer text" → "a"
        raw_correct = row.get('correct answer', '').strip()
        correct = raw_correct[0].lower() if raw_correct else ''
        valid_ids = {o['id'] for o in options}
        if correct not in valid_ids:
            errors.append({'row': i, 'error': f'correct_answer "{correct}" không hợp lệ — skipped'})
            skipped += 1
            continue

        to_create.append(PracticeQuestion(
            exam=exam,
            question_type='MULTIPLE_CHOICE',
            question_text=q_text,
            options=options,
            correct_answer=correct,
            explanation=row.get('rationale', '').strip(),
            points=10,
            order=next_order + len(to_create),
        ))
        existing.add(q_text)

    PracticeQuestion.objects.bulk_create(to_create)
    return {'created': len(to_create), 'skipped': skipped, 'errors': errors}
```

---

#### 2. `src/backend/videos/admin.py` — Thêm URL + view + context

**`get_urls()`** — thêm 1 path mới:

```python
path(
    '<int:pk>/import-quiz-notebooklm/',
    self.admin_site.admin_view(self.import_quiz_notebooklm_view),
    name='videos_videolesson_import_quiz_notebooklm',
),
```

**View mới `import_quiz_notebooklm_view()`:**

```python
def import_quiz_notebooklm_view(self, request, pk):
    lesson = get_object_or_404(VideoLesson, pk=pk)
    if request.method == 'POST':
        from exams.utils import parse_questions_csv_notebooklm, provision_training_activity
        csv_file = request.FILES.get('file')
        if not csv_file:
            self.message_user(request, 'Chưa chọn file.', level='error')
        else:
            _, exam = provision_training_activity('lesson', lesson, 'QUIZ')
            result = parse_questions_csv_notebooklm(csv_file, exam)
            self.message_user(
                request,
                f"✅ Đã tạo {result['created']} câu hỏi. Bỏ qua: {result['skipped']}."
                + (f" Lỗi: {len(result['errors'])}." if result['errors'] else ''),
            )
        return redirect(reverse('admin:videos_videolesson_change', args=[pk]))

    from django.template.response import TemplateResponse
    return TemplateResponse(request, 'admin/videos/videolesson/import_quiz_notebooklm.html', {
        'lesson': lesson,
        'title': f'Import Quiz (NotebookLM) — {lesson.title}',
        'opts': self.model._meta,
    })
```

**`change_view()`** — thêm 1 context var:

```python
extra_context['import_quiz_notebooklm_url'] = reverse(
    'admin:videos_videolesson_import_quiz_notebooklm', args=[object_id]
)
```

---

#### 3. `src/backend/books/admin.py` — Thêm URL + view + context (tương tự)

Logic giống VideoLessonAdmin, thay `lesson` → `chapter`, `source_type='chapter'`.

---

### HTML Templates

#### 4. `templates/admin/videos/videolesson/change_form.html` — Thêm button

Thêm section "QUIZ (NotebookLM)" vào card "Import Nội dung Học tập":

```html
{% if import_quiz_notebooklm_url %}
<div>
  <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px">QUIZ — NOTEBOOKLM</div>
  <div style="display:flex;gap:8px">
    <a href="{{ import_quiz_notebooklm_url }}" class="btn btn-warning btn-sm">
      📥 Import NotebookLM CSV
    </a>
  </div>
</div>
{% endif %}
```

#### 5. NEW `templates/admin/videos/videolesson/import_quiz_notebooklm.html`

```html
{% extends "admin/base_site.html" %}
{% block title %}Import Quiz (NotebookLM) — {{ lesson.title }}{% endblock %}
{% block content %}
<div class="module" style="max-width:560px;padding:20px">
  <h1>📥 Import Quiz từ NotebookLM CSV</h1>
  <p style="color:#555;margin-bottom:12px">Bài học: <strong>{{ lesson.title }}</strong></p>

  <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:12px;margin-bottom:16px;font-size:13px">
    ⚠️ Import sẽ <strong>THÊM</strong> vào câu hỏi hiện có. Câu trùng sẽ bị bỏ qua.<br>
    TrainingSet, TrainingActivity và Exam sẽ được tạo tự động nếu chưa tồn tại.<br><br>
    📋 <strong>Định dạng CSV (NotebookLM):</strong><br>
    Cột: <code>#</code>, <code>Question</code>, <code>Option A</code>, <code>Option B</code>,
    <code>Option C</code>, <code>Option D</code>, <code>Correct Answer</code>, <code>Rationale</code><br>
    Cột <code>Correct Answer</code> định dạng: <code>A. Nội dung đáp án đúng</code>
  </div>

  <form method="post" enctype="multipart/form-data">
    {% csrf_token %}
    <div style="margin-bottom:14px">
      <label style="display:block;font-weight:600;margin-bottom:4px">Chọn file CSV:</label>
      <input type="file" name="file" accept=".csv,text/csv" required
             style="border:1px solid #ccc;padding:6px;border-radius:4px;width:100%">
    </div>
    <div style="display:flex;gap:10px">
      <a href="{% url 'admin:videos_videolesson_change' lesson.pk %}"
         style="padding:8px 16px;background:#6c757d;color:#fff;border-radius:4px;text-decoration:none;font-size:13px">
        Huỷ
      </a>
      <button type="submit"
              style="padding:8px 20px;background:#417690;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:600">
        Import
      </button>
    </div>
  </form>
</div>
{% endblock %}
```

#### 6. `templates/admin/books/bookchapter/change_form.html` — Thêm button (tương tự)

#### 7. NEW `templates/admin/books/bookchapter/import_quiz_notebooklm.html` (tương tự, thay lesson → chapter)

---

### Không thay đổi

| Thành phần | Lý do |
|---|---|
| `parse_questions_csv()` | Parser nội bộ không đổi — button "Import Quiz" cũ vẫn dùng |
| `QUESTIONS_CSV_TEMPLATE` | Template nội bộ giữ nguyên |
| `PracticeQuestion` model | Không field mới |
| `FlashcardAdmin`, `TrainingActivityAdmin` | Không liên quan |
| Frontend Vue | Không thay đổi |

---

## Danh sách file thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/exams/utils.py` | Thêm `parse_questions_csv_notebooklm()` |
| `src/backend/videos/admin.py` | Thêm URL + view + context var |
| `src/backend/books/admin.py` | Thêm URL + view + context var |
| `src/backend/templates/admin/videos/videolesson/change_form.html` | Thêm button QUIZ NotebookLM |
| `src/backend/templates/admin/books/bookchapter/change_form.html` | Thêm button QUIZ NotebookLM |

**Tạo mới:**

| File |
|---|
| `src/backend/templates/admin/videos/videolesson/import_quiz_notebooklm.html` |
| `src/backend/templates/admin/books/bookchapter/import_quiz_notebooklm.html` |

**Không có migration.**

---

## UX Flow sau khi implement

```
Admin → Mở VideoLesson → Card "Import Nội dung Học tập"
  ├── FLASHCARD: [Tải template] [Import CSV]
  ├── QUIZ:      [Tải template] [Import CSV]        ← format nội bộ
  └── QUIZ — NOTEBOOKLM: [Import NotebookLM CSV]   ← format mới

→ Click "Import NotebookLM CSV"
→ Upload chuong1-quiz.csv
→ Submit → message: "✅ Đã tạo 26 câu hỏi."
```

---

## Testing Checklist

- [ ] Upload `data/kymon/chuong1-quiz.csv` từ VideoLesson → 26 câu tạo thành công
- [ ] `correct_answer` parse đúng: `"A. ..."` → `"a"`, `"B. ..."` → `"b"`
- [ ] `question_type = MULTIPLE_CHOICE` cho tất cả câu
- [ ] `Option D` trống → MCQ 3 đáp án, không lỗi
- [ ] Upload lần 2 → duplicate skipped, không crash
- [ ] Button "Import Quiz" (format nội bộ) vẫn hoạt động bình thường
- [ ] BookChapter cũng có button và hoạt động tương tự
