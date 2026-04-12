# Feature 29 — Admin Quiz Management Screen

## Tóm tắt

Bổ sung màn quản lý quiz đầy đủ trong Django Admin: standalone `PracticeQuestionAdmin` cho phép duyệt/sửa câu hỏi xuyên suốt mọi exam, cải thiện `ExamAdmin` với thông tin rõ hơn, và thêm custom widget cho field JSON `options` để tránh phải sửa raw JSON.

Không có model mới. Không có migration. Chỉ thay đổi `src/backend/exams/admin.py` và thêm CSS/JS/form nhỏ cho admin widget.

---

## Phân tích

### Tình trạng hiện tại

| Màn admin | Trạng thái | Vấn đề |
|---|---|---|
| `ExamAdmin` | Có — với `PracticeQuestionInline` (StackedInline, collapse) | Inline collapse, khó thao tác nhiều câu; không filter được theo lesson/chapter từ list view |
| `PracticeQuestionAdmin` | **Không có** | Không thể duyệt toàn bộ câu hỏi; không thể filter/search câu hỏi theo nguồn |
| `options` JSON field | Raw textarea | Phải nhớ cú pháp `[{"id":"a","text":"..."}]`, dễ lỗi |

**Vấn đề cốt lõi:**
- Muốn xem "bài học X có bao nhiêu câu quiz EASY?" → phải mở từng Exam → scroll xuống inline.
- Muốn sửa câu hỏi → phải biết câu đó trong Exam nào → mở Exam → tìm trong inline.
- Muốn nhập options → raw JSON, không thân thiện.

### Phạm vi (v1)

**In-scope:**
- Standalone `PracticeQuestionAdmin` với list/filter/search đầy đủ.
- `OptionsWidget` để nhập đáp án dạng table thay raw JSON.
- Cải thiện `ExamAdmin`: cột số câu badge + action nhân bản.
- Cải thiện `PracticeQuestionInline`: chuyển TabularInline + `show_change_link`.

**Out-of-scope (v2):**
- Bulk edit câu hỏi trực tiếp từ list view.
- Import/export questions từ màn `PracticeQuestionAdmin` (đã có ở Feature 11/28 từ VideoLesson/BookChapter).
- Vue.js frontend thay đổi — không ảnh hưởng.

**Tầng liên quan:** Backend (Django Admin) only — không có API mới, không có FE Vue thay đổi.

---

## Đề xuất giải pháp

### 1. Standalone `PracticeQuestionAdmin`

Đăng ký `PracticeQuestion` với admin config đầy đủ — đây là **thay đổi chính**.

**`list_display`:**
```python
('question_preview', 'exam_link', 'source_link', 'question_type', 'difficulty', 'points', 'order')
```

**`list_filter`:**
```python
(
    'question_type',
    DifficultyFilter,                                    # SimpleListFilter custom (xem bên dưới)
    'exam__exam_type',
    'exam__activity__training_set__lesson__course',      # filter theo Course
    'exam__activity__training_set__chapter__book',       # filter theo Book
)
```

**`search_fields`:**
```python
(
    'question_text',
    'exam__title',
    'exam__activity__training_set__lesson__title',
    'exam__activity__training_set__chapter__title',
)
```

**`list_per_page`** = `50` (mặc định 100 quá nhiều cho câu hỏi dài).

**`ordering`** = `['exam', 'order']` (nhóm theo exam, thứ tự trong exam).

**`list_display_links`** = `('question_preview',)` — chỉ column câu hỏi là link vào trang sửa.

---

**`DifficultyFilter` — SimpleListFilter custom:**

`difficulty` là CharField không có choices cố định → list_filter mặc định hiện tất cả distinct values trong DB kể cả rác. Dùng SimpleListFilter với giá trị cố định:

```python
class DifficultyFilter(admin.SimpleListFilter):
    title = "Độ khó"
    parameter_name = "difficulty"

    def lookups(self, request, model_admin):
        return [
            ('EASY', 'Dễ'),
            ('MEDIUM', 'Trung bình'),
            ('HARD', 'Khó'),
            ('', 'Chưa phân loại'),
        ]

    def queryset(self, request, queryset):
        if self.value() is not None:
            return queryset.filter(difficulty=self.value())
        return queryset
```

---

**Custom columns:**

```python
def question_preview(self, obj):
    text = obj.question_text
    return (text[:80] + '…') if len(text) > 80 else text
question_preview.short_description = "Câu hỏi"

def exam_link(self, obj):
    url = reverse('admin:exams_exam_change', args=[obj.exam_id])
    return format_html('<a href="{}">{}</a>', url, obj.exam.title)
exam_link.short_description = "Bộ Quiz"

def source_link(self, obj):
    """Resolve nguồn từ TrainingActivity → TrainingSet → lesson/chapter.
    Exam legacy (activity_id=None) trả về "—", không crash.
    """
    if not obj.exam.activity_id:
        return "—"
    ts = obj.exam.activity.training_set
    if ts.lesson_id:
        url = reverse('admin:videos_videolesson_change', args=[ts.lesson_id])
        return format_html('<a href="{}">[Video] {}</a>', url, ts.lesson.title)
    if ts.chapter_id:
        url = reverse('admin:books_bookchapter_change', args=[ts.chapter_id])
        return format_html('<a href="{}">[Sách] {}</a>', url, ts.chapter.title)
    return "—"
source_link.short_description = "Nguồn"
```

---

**`get_queryset` — tránh N+1:**

```python
def get_queryset(self, request):
    return (
        super().get_queryset(request)
        .select_related(
            'exam',                                              # exam_link cần exam.title
            'exam__activity__training_set__lesson',             # source_link cần lesson.title
            'exam__activity__training_set__lesson__course',     # filter theo Course
            'exam__activity__training_set__chapter',            # source_link cần chapter.title
            'exam__activity__training_set__chapter__book',      # filter theo Book
        )
    )
```

> **Lý do cần cả `lesson` lẫn `lesson__course`:**
> `select_related('exam__activity__training_set__lesson__course')` join qua lesson nhưng nếu không explicit `lesson`, Django có thể không cache intermediate object đúng. Khai báo explicit cả hai đảm bảo không có lazy query nào khi `source_link` gọi `ts.lesson.title`.

---

### 2. `OptionsWidget` + `PracticeQuestionForm`

#### Phân tách file rõ ràng

- `src/backend/exams/widgets.py` — chứa `OptionsWidget` (Django `Widget` subclass).
- `src/backend/exams/forms.py` — chứa `PracticeQuestionForm` (`ModelForm` dùng widget + xử lý `correct_answer`).

#### Vấn đề cross-field `correct_answer`

`PracticeQuestion` có hai field liên quan nhau:
- `options` (JSONField): `[{"id":"a","text":"..."}, ...]`
- `correct_answer` (CharField): `"a"` — id của đáp án đúng

`OptionsWidget` chỉ được đăng ký cho `options`. Để điều phối cả hai, dùng `clean()` trong form:

```python
# forms.py
class PracticeQuestionForm(forms.ModelForm):
    class Meta:
        model = PracticeQuestion
        fields = '__all__'
        widgets = {
            'options': OptionsWidget(),
        }

    def clean(self):
        cleaned = super().clean()
        # OptionsWidget đặt 'correct_answer_radio' vào POST data.
        # Đọc giá trị từ request.POST qua widget's value_from_datadict
        # đã xử lý — OptionsWidget.value_from_datadict trả về tuple
        # (options_json, correct_answer_value). Form clean() lấy từ
        # widget output và gán vào correct_answer.
        #
        # Cách triển khai: OptionsWidget.value_from_datadict trả về
        # JSON string cho options field; đồng thời đặt 'correct_answer'
        # vào data dict qua một hidden input tên 'correct_answer'
        # → Django form tự nhận.
        return cleaned
```

#### Cơ chế `OptionsWidget` chi tiết

`OptionsWidget` render HTML gồm:
1. Table 4 hàng (a, b, c, d) với `<input type="text" name="options_text_a">`, v.v.
2. Radio group `<input type="radio" name="correct_answer_radio" value="a">`, v.v.
3. **Hidden input** `<input type="hidden" name="correct_answer" id="id_correct_answer">` — JavaScript sync giá trị từ radio vào đây khi user chọn.
4. Hidden input `<input type="hidden" name="options" id="id_options">` — JavaScript serialize table thành JSON khi form submit.

`value_from_datadict(data, files, name)`:
- Đọc `data.get('options_text_a')`, `data.get('options_text_b')`, v.v.
- Build list options, loại bỏ option có text trống.
- Serialize thành JSON string → trả về cho `options` field.

`correct_answer` field trong form đọc từ `data.get('correct_answer')` (hidden input được JS sync) — Django xử lý bình thường như CharField.

```
┌─────────────────────────────────────────────────────────────┐
│  ID  │  Nội dung đáp án                    │  Đúng?         │
├──────┼─────────────────────────────────────┼────────────────┤
│  a   │ [________________________________]  │  ◉             │
│  b   │ [________________________________]  │  ○             │
│  c   │ [________________________________]  │  ○             │
│  d   │ [________________________________]  │  ○             │
│      │ (để trống → bỏ khỏi options JSON)   │                │
└─────────────────────────────────────────────────────────────┘
[Hidden: options JSON] [Hidden: correct_answer]
```

**YES_NO / TRUE_FALSE:** JS ẩn hàng c, d khi `question_type` dropdown = "YES_NO" hoặc "TRUE_FALSE". Options auto-set `[{"id":"a","text":"Có"},{"id":"b","text":"Không"}]` cho YES_NO.

**Media:**
```python
class Media:
    css = {'all': ('exams/css/options_widget.css',)}
    js = ('exams/js/options_widget.js',)
```

---

### 3. Cải thiện `ExamAdmin`

**`list_display` bổ sung:**
- `question_count_badge`: số câu, tô màu đỏ nếu = 0 (exam trống), xanh nếu > 0.

**`list_display_links`:** Giữ nguyên `('title',)` — `source_link` đã là `format_html` link, không đặt vào `list_display_links` để tránh nested `<a>` tags.

**Action mới — `duplicate_exam`:**

```python
@admin.action(description="Nhân bản Exam đã chọn")
def duplicate_exam(self, request, queryset):
    count = queryset.count()   # capture trước loop, tránh re-evaluate queryset
    for exam in queryset.prefetch_related('questions'):
        questions = list(exam.questions.all())
        exam.pk = None
        exam.uuid = None
        exam.slug = exam.slug + '-copy'
        exam.title = exam.title + ' (Copy)'
        exam.activity = None   # ← bắt buộc: tránh IntegrityError trên OneToOneField
        exam.save()
        for q in questions:
            q.pk = None
            q.uuid = None
            q.exam = exam
            q.save()
    self.message_user(request, f"Đã nhân bản {count} exam. Exam mới chưa gắn TrainingActivity — cần gắn thủ công.")
```

> **Lưu ý:** Exam clone có `activity = None` → không xuất hiện trong Frontend Training flow cho đến khi admin gắn TrainingActivity. Đây là hành vi mong muốn (admin tự quyết định khi nào publish).

---

### 4. `PracticeQuestionInline` — cải thiện UX

**Đổi sang `TabularInline`** với các cột rút gọn. Inline này **không chứa `options` và `correct_answer`** — hai fields đó chỉ edit được qua trang sửa câu riêng (`show_change_link`). Điều này tránh conflict giữa `OptionsWidget` (table phức tạp) với layout `TabularInline`.

```python
class PracticeQuestionInline(admin.TabularInline):
    model = PracticeQuestion
    extra = 0
    fields = ('order', 'question_type', 'question_preview_text', 'difficulty', 'points')
    readonly_fields = ('question_preview_text',)
    show_change_link = True   # link "Sửa" ra PracticeQuestionAdmin change page
    ordering = ('order',)

    def question_preview_text(self, obj):
        return (obj.question_text[:60] + '…') if len(obj.question_text) > 60 else obj.question_text
    question_preview_text.short_description = "Câu hỏi"
```

> **Không include `options`, `correct_answer`, `explanation`** — những field này chỉ chỉnh sửa qua trang `PracticeQuestionAdmin` (click "Sửa →" từ inline).

---

## Access Control

Tất cả màn admin Django yêu cầu `is_staff=True`. Không có custom permission override nào được thêm trong feature này.

**`duplicate_exam` action:** Chỉ staff có `change_exam` permission mới thấy action (Django tự lọc theo permission model). Không cần superuser-only.

**Xóa câu hỏi:** `PracticeQuestionAdmin` không override `has_delete_permission` — mặc định staff có `delete_practicequestion` permission được xóa. Nếu cần bảo vệ, override để chỉ cho superuser. **Ghi nhận là nice-to-have, không block v1.**

---

## Trade-off & lưu ý

| Điểm | Ghi chú |
|---|---|
| `OptionsWidget` tự viết | Cần test kỹ round-trip serialize/deserialize. Nếu JS disabled: hidden input giữ giá trị cũ → form submit vẫn hoạt động (giữ data cũ, không mất). |
| `duplicate_exam` tạo orphan exam | `activity = None` → không xuất hiện frontend đến khi gắn thủ công. Message rõ cho admin. |
| `PracticeQuestionInline` không edit options | Đổi lẽ: inline dùng để xem nhanh + navigate; edit đầy đủ qua `show_change_link`. Không mất chức năng vì `PracticeQuestionAdmin` đã bổ sung. |
| N+1 queries | `select_related` khai báo explicit cả 5 paths. Test với Django Debug Toolbar ≥ 100 câu. |
| `difficulty` filter | Dùng `SimpleListFilter` với 4 giá trị cố định — tránh rác từ DB. |

---

## Danh sách file thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/exams/admin.py` | `PracticeQuestionAdmin` (mới) + `DifficultyFilter` (mới), cải thiện `ExamAdmin` + `PracticeQuestionInline`, `duplicate_exam` action |
| `src/backend/exams/forms.py` | **Tạo mới** — `PracticeQuestionForm` (ModelForm dùng OptionsWidget) |
| `src/backend/exams/widgets.py` | **Tạo mới** — `OptionsWidget` (Widget subclass) |
| `src/backend/static/exams/css/options_widget.css` | **Tạo mới** — style cho widget table |
| `src/backend/static/exams/js/options_widget.js` | **Tạo mới** — sync radio → hidden input, serialize JSON khi submit, ẩn/hiện hàng theo question_type |

**Không có migration.**

---

## UX Flow sau khi implement

```
Admin sidebar: "Exams" → "Practice Questions"  ← MỚI

Trang danh sách Practice Questions:
  Filter left: [Question Type ▾] [Difficulty ▾] [Exam Type ▾] [Course ▾] [Book ▾]
  Search box:  tìm nội dung câu hỏi / tên exam / tên bài học
  Columns:     Câu hỏi (link) | Bộ Quiz | Nguồn | Loại | Độ khó | Điểm | Thứ tự
  50 items/page, sort mặc định: exam → order

  Click câu hỏi → Trang sửa câu hỏi (PracticeQuestionAdmin change page):
    ┌───────────────────────────────────────────────────────────────┐
    │ Exam:  [Bộ Quiz: Kỳ Môn - Bài 1 ▾]                           │
    │ Loại:  [Trắc nghiệm ▾]  Độ khó: [Dễ ▾]  Điểm: [10]  Order: [1] │
    │ Câu hỏi: [___________________________________________]        │
    │                                                               │
    │ Đáp án:                                                       │
    │  ID │ Nội dung                        │ Đúng?                 │
    │  a  │ [____________________________]  │  ◉                    │
    │  b  │ [____________________________]  │  ○                    │
    │  c  │ [____________________________]  │  ○                    │
    │  d  │ [____________________________]  │  ○  (ẩn nếu YES_NO)   │
    │                                                               │
    │ Giải thích: [_______________________________________]         │
    └───────────────────────────────────────────────────────────────┘

Admin sidebar: "Exams" → "Exams" (đã có — cải thiện)
  + Cột "Số câu" tô đỏ nếu = 0 / xanh nếu > 0
  + Action: "Nhân bản Exam đã chọn" (exam clone có activity=None, message cảnh báo)
  + Inline: TabularInline (order | loại | câu hỏi preview | độ khó | điểm | Sửa →)
            [Không có options/correct_answer trong inline — chỉnh sửa qua "Sửa →"]
```

---

## Testing Checklist

**`PracticeQuestionAdmin` list:**
- [ ] Load không N+1 — Django Debug Toolbar: số query ≤ 5 với 50 câu bất kỳ.
- [ ] Filter theo Course hiện đúng câu của course đó, ẩn câu của course khác.
- [ ] Filter theo Book tương tự.
- [ ] Filter Difficulty "Chưa phân loại" (`difficulty=""`) trả về đúng.
- [ ] Search theo `question_text` tìm được câu đúng.
- [ ] Câu hỏi thuộc Exam **legacy** (`activity_id=None`) → `source_link` = "—", không crash, không 500.

**`OptionsWidget`:**
- [ ] Mở trang sửa câu cũ → widget hiển thị đúng text từng đáp án + radio chọn đúng đáp án hiện tại.
- [ ] Submit form → `options` JSON lưu đúng format `[{"id":"a","text":"..."}]`.
- [ ] `correct_answer` lưu đúng từ radio button (hidden input sync qua JS).
- [ ] Option D để trống → JSON chỉ có 3 phần tử, không có `{"id":"d","text":""}`.
- [ ] `question_type = YES_NO` → hàng c, d ẩn tự động.
- [ ] `question_type = MULTIPLE_CHOICE` → 4 hàng hiện đủ.
- [ ] Submit với options trống hoàn toàn → validation error rõ ràng.

**`duplicate_exam` action:**
- [ ] Exam có `activity` (OneToOne) → clone thành công, không IntegrityError.
- [ ] Exam không có `activity` (legacy) → clone thành công.
- [ ] Exam clone có `activity = None` — xác nhận trong DB.
- [ ] Questions của exam gốc được clone đủ số lượng vào exam mới.
- [ ] Message hiển thị đúng count + cảnh báo "chưa gắn TrainingActivity".

**`PracticeQuestionInline` (trong ExamAdmin):**
- [ ] Hiện TabularInline với 5 cột (order, question_type, preview, difficulty, points).
- [ ] Không có `options` và `correct_answer` trong inline.
- [ ] Link "Sửa →" nhảy đúng sang `PracticeQuestionAdmin` change page của câu đó.
- [ ] Exam 0 câu → inline trống, cột "Số câu" tô đỏ trong list view.
