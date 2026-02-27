# Feature 8 Detailed Design: Video Player Tab Layout

> **v3** — cập nhật sau review khả thi & UX (2026-02-26)

## 1. Tổng quan

Cập nhật `VideoPlayerView` thêm tab bar **Tóm tắt AI | Flashcards | Ôn luyện** bên dưới video.

### Nguyên tắc kiến trúc (tham chiếu Udemy)

| Udemy | Fengshui Trainer |
|-------|-----------------|
| Course → Sections → Lectures | VideoCourse → VideoLesson |
| Section có Practice Test riêng | VideoLesson có Exam riêng |
| Section có Flashcard Set riêng | VideoLesson có Flashcard Pool (kho) riêng |
| Smart shuffle ưu tiên due cards | Smart sampling: due first → random fill |

**Flashcard là 1 kho** gắn với lesson. Mỗi lần user mở tab Flashcards → server smart-sample
trả về N thẻ: ưu tiên thẻ đến hạn ôn (SM-2 due), sau đó random fill cho đủ.

Exam (Ôn luyện) gắn trực tiếp với lesson. Câu hỏi shuffle thứ tự mỗi lần làm.

Flashcard và Exam dùng **FK ngược** vào `VideoLesson` — không UUID indirection.

---

## 2. Layout mới

```
┌─────────────────────────────────┐
│ ← Header (sticky, z:10)     ⋮  │
├─────────────────────────────────┤
│      Video Player (16:9)        │
├─────────────────────────────────┤
│ Bài 4/12  |  Tên bài học        │  ← lesson meta (không sticky)
├─────────────────────────────────┤
│  Tóm tắt AI │ Flashcards🔴 │ Ôn│  ← Tab bar (sticky top:56px, z:9)
├─────────────────────────────────┤
│                                 │
│        Tab Content              │  ← scrollable
│        (lazy mounted)           │
│                                 │
├─────────────────────────────────┤
│  Mô tả  (inline, luôn hiển thị)│
├─────────────────────────────────┤
│  [← Bài trước]  [Bài tiếp →]  │  ← floating bottom bar (fixed)
└─────────────────────────────────┘
```

**Thay đổi so với v2:**
- Prev/Next nav chuyển xuống **floating bottom bar** (fixed), không còn bị scroll mất
- Tab Flashcards có **badge đỏ** khi có thẻ đến hạn ôn
- Tab content dùng `v-if` + `<keep-alive>` (lazy mount, không gọi API thừa)

---

## 3. Data Model Changes

### 3.1 Thêm `lesson` FK vào `Flashcard`

**File**: `src/backend/exams/models.py`

```python
class Flashcard(BaseModel):
    module = models.ForeignKey(          # giữ cho standalone practice flow
        PracticeModule, on_delete=models.CASCADE,
        related_name='flashcards', null=True, blank=True,
    )
    lesson = models.ForeignKey(          # NEW: gắn với video lesson
        'videos.VideoLesson',
        on_delete=models.CASCADE,
        related_name='flashcards',
        null=True, blank=True,
    )
    front      = models.TextField()
    back       = models.TextField()
    category   = models.CharField(       # NEW: nhãn chủ đề
        max_length=100, blank=True,
        help_text="Nhãn hiển thị trên thẻ, vd: KHÁI NIỆM CỐT LÕI",
    )
    image      = models.CharField(max_length=255, blank=True)
    difficulty = models.CharField(max_length=10, blank=True)  # EASY/MEDIUM/HARD
    order      = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def clean(self):
        """Flashcard phải thuộc lesson hoặc module, không được cả hai đều null."""
        if not self.lesson_id and not self.module_id:
            raise ValidationError(
                "Flashcard phải thuộc một VideoLesson hoặc PracticeModule."
            )
```

### 3.2 Thêm `lesson` FK vào `Exam`

**File**: `src/backend/exams/models.py`

```python
class Exam(BaseModel):
    module = models.ForeignKey(          # giữ cho standalone practice
        PracticeModule, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='exams',
    )
    lesson = models.ForeignKey(          # NEW: gắn với video lesson
        'videos.VideoLesson',
        on_delete=models.CASCADE,        # lesson xoá → exam xoá theo
        related_name='exams',
        null=True, blank=True,
    )
    title              = models.CharField(max_length=255)
    slug               = models.SlugField(unique=True, max_length=255)
    description        = models.TextField(blank=True)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    passing_score      = models.PositiveIntegerField(default=70)
    exam_type          = models.CharField(
        max_length=20, choices=EXAM_TYPE_CHOICES, default='PRACTICE',
    )

    class Meta:
        # Mỗi lesson chỉ có 1 exam PRACTICE — enforce ở application level
        ordering = ['-created_at']
```

> `on_delete=CASCADE` cho `lesson`: lesson bị xoá thì exam đi theo — hợp lý vì exam không có nghĩa khi mất lesson.

### 3.3 Thêm `question_type` vào `PracticeQuestion`

**File**: `src/backend/exams/models.py`

```python
class PracticeQuestion(BaseModel):
    QUESTION_TYPE_CHOICES = [
        ('MULTIPLE_CHOICE', 'Trắc nghiệm nhiều lựa chọn'),
        ('YES_NO',          'Có / Không'),
        ('TRUE_FALSE',      'Đúng / Sai'),
    ]
    # ... existing fields ...
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        default='MULTIPLE_CHOICE',
    )
```

**Cấu trúc `options` JSON theo loại:**

| `question_type` | `options` | `correct_answer` |
|---|---|---|
| `MULTIPLE_CHOICE` | `[{"id":"a","text":"..."},...]` | `"a"/"b"/"c"/"d"` |
| `YES_NO` | `[{"id":"yes","text":"Có"},{"id":"no","text":"Không"}]` | `"yes"/"no"` |
| `TRUE_FALSE` | `[{"id":"true","text":"Đúng"},{"id":"false","text":"Sai"}]` | `"true"/"false"` |

> YES_NO và TRUE_FALSE: options **tự động sinh** khi import CSV.

### 3.4 `VideoLesson` — không thêm field mới

Quan hệ qua FK ngược: `lesson.flashcards.all()`, `lesson.exams.all()`.

**Migration:**
```bash
docker-compose -f docker/docker-compose.yml exec web python manage.py makemigrations exams
docker-compose -f docker/docker-compose.yml exec web python manage.py migrate
```

---

## 4. API Design

### 4.1 GET Flashcards — Smart sampling

```
GET /api/videos/{course_slug}/lessons/{lesson_slug}/flashcards/
```

**Auth**: IsAuthenticated + đã mua course (hoặc `lesson.is_free`)

**Query params:**
- `count=10` (default 10, max 50)

**Smart sampling logic** — ưu tiên thẻ SM-2 đến hạn, random fill phần còn lại:

```python
import random
from django.utils import timezone
from django.db.models import Q

class LessonFlashcardsView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, slug, lesson_slug):
        lesson = get_object_or_404(
            VideoLesson, course__slug=slug, slug=lesson_slug,
        )
        count = min(int(request.query_params.get('count', 10)), 50)
        user  = request.user

        all_ids = list(lesson.flashcards.values_list('id', flat=True))
        total   = len(all_ids)

        if total == 0:
            return Response({'total_in_pool': 0, 'count': 0,
                             'due_count': 0, 'cards': []})

        # IDs của thẻ đến hạn hoặc chưa học
        due_ids = set(lesson.flashcards.filter(
            Q(reviews__user=user, reviews__next_review__lte=timezone.now())
            | ~Q(reviews__user=user)   # chưa có FlashcardReview
        ).values_list('id', flat=True))

        # Sample: due trước, random fill sau
        due_sample    = random.sample(list(due_ids), min(count, len(due_ids)))
        remaining_ids = [i for i in all_ids if i not in set(due_sample)]
        fill_count    = count - len(due_sample)
        fill_sample   = random.sample(remaining_ids, min(fill_count, len(remaining_ids)))

        selected_ids  = due_sample + fill_sample
        random.shuffle(selected_ids)   # trộn lại để due_ids không luôn đứng đầu

        cards = Flashcard.objects.filter(id__in=selected_ids)
        # Inject user_review
        reviews = {
            r.flashcard_id: r
            for r in FlashcardReview.objects.filter(
                user=user, flashcard_id__in=selected_ids
            )
        }
        serializer = FlashcardWithReviewSerializer(
            cards, many=True,
            context={'reviews': reviews},
        )
        return Response({
            'total_in_pool': total,
            'due_count':     len(due_ids),
            'count':         len(selected_ids),
            'cards':         serializer.data,
        })
```

**Response:**
```json
{
  "total_in_pool": 42,
  "due_count": 3,
  "count": 10,
  "cards": [
    {
      "id": "uuid",
      "category": "KHÁI NIỆM CỐT LÕI",
      "front": "Sự khác biệt giữa Phong và Thủy?",
      "back": "Phong tán khí, Thủy tụ khí...",
      "difficulty": "MEDIUM",
      "is_due": true,
      "user_review": {
        "repetitions": 3,
        "next_review": "2026-02-25T00:00:00Z",
        "interval": 4
      }
    }
  ]
}
```

> `due_count` dùng để hiển thị badge đỏ trên tab. `is_due` để frontend đánh dấu thẻ đến hạn.

### 4.2 GET Exam ôn luyện của lesson

```
GET /api/videos/{course_slug}/lessons/{lesson_slug}/exam/
```

**Auth**: IsAuthenticated

```python
class LessonExamView(generics.RetrieveAPIView):
    serializer_class = ExamDetailSerializer

    def get_object(self):
        lesson = get_object_or_404(
            VideoLesson, course__slug=self.kwargs['slug'],
            slug=self.kwargs['lesson_slug'],
        )
        exam = lesson.exams.filter(exam_type='PRACTICE').first()
        if not exam:
            raise Http404
        return exam
```

**Response:**
```json
{
  "slug": "on-tap-bai-4",
  "title": "Ôn tập bài 4",
  "passing_score": 70,
  "time_limit_minutes": null,
  "total_questions": 10,
  "questions": [
    {
      "id": "uuid",
      "question_type": "MULTIPLE_CHOICE",
      "question_text": "Câu hỏi...",
      "options": [{"id":"a","text":"..."},{"id":"b","text":"..."}],
      "points": 10
    },
    {
      "id": "uuid",
      "question_type": "YES_NO",
      "question_text": "Phong Thủy có nguồn gốc từ Trung Quốc?",
      "options": [{"id":"yes","text":"Có"},{"id":"no","text":"Không"}],
      "points": 10
    }
  ],
  "user_progress": {
    "score": 85,
    "is_passed": true,
    "attempts": 2,
    "last_attempt": "2026-02-20T10:00:00Z"
  }
}
```

### 4.3 POST Submit exam (dùng lại endpoint hiện có)

```
POST /api/exams/{exam_slug}/submit/
{ "answers": [{ "question_id": "uuid", "answer": "b" }] }
```

Không cần thay đổi.

### 4.4 URL patterns

**`src/backend/videos/urls.py`:**
```python
path('<slug:slug>/lessons/<slug:lesson_slug>/flashcards/',
     LessonFlashcardsView.as_view(), name='lesson-flashcards'),
path('<slug:slug>/lessons/<slug:lesson_slug>/exam/',
     LessonExamView.as_view(), name='lesson-exam'),
```

**`src/backend/exams/urls.py`:**
```python
path('exams/<slug:slug>/questions/import/',
     QuestionImportView.as_view(), name='exam-question-import'),
path('exams/<slug:slug>/questions/export-template/',
     QuestionExportTemplateView.as_view(), name='exam-question-export-template'),
path('exams/<slug:slug>/flashcards/import/',
     FlashcardImportView.as_view(), name='exam-flashcard-import'),
path('exams/<slug:slug>/flashcards/export-template/',
     FlashcardExportTemplateView.as_view(), name='exam-flashcard-export-template'),
```

---

## 5. CSV Import/Export

### 5.1 CSV Câu hỏi (Questions)

**Format:**
```csv
question_type,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,points,difficulty
MULTIPLE_CHOICE,"Nguyên lý tụ khí?","Gió tán","Nước tụ","Cả hai đúng","Không cái nào","c","Phong tán Thủy tụ",10,MEDIUM
YES_NO,"Phòng ngủ nên có gương đối giường?","","","","","no","Gương tạo năng lượng bất an",10,EASY
TRUE_FALSE,"Hướng Nam là hướng Hỏa?","","","","","true","Nam thuộc Hỏa - Hậu Thiên Bát Quái",10,EASY
```

**Validation rules:**
- `question_type`: `MULTIPLE_CHOICE` / `YES_NO` / `TRUE_FALSE`
- MCQ: ít nhất 2 options không rỗng
- YES_NO / TRUE_FALSE: options tự sinh — bỏ trống cột option_*
- `correct_answer` phải thuộc tập options hợp lệ
- **Duplicate detection**: bỏ qua nếu `question_text` + `exam_id` đã tồn tại
- Import mode: **APPEND** (thêm vào) — không xoá câu hỏi cũ

**Backend `parse_questions_csv()`** — `src/backend/exams/utils.py`:

```python
def parse_questions_csv(file_obj, exam) -> dict:
    reader = csv.DictReader(io.StringIO(file_obj.read().decode('utf-8')))
    to_create, errors, skipped = [], [], 0

    # Duplicate detection: hash by question_text
    existing = set(exam.questions.values_list('question_text', flat=True))

    for i, row in enumerate(reader, start=2):
        q_type = row.get('question_type', '').strip().upper()
        q_text = row.get('question_text', '').strip()

        if q_type not in {'MULTIPLE_CHOICE', 'YES_NO', 'TRUE_FALSE'}:
            errors.append({'row': i, 'error': f'question_type "{q_type}" không hợp lệ'})
            skipped += 1; continue
        if not q_text:
            errors.append({'row': i, 'error': 'question_text trống'})
            skipped += 1; continue
        if q_text in existing:
            errors.append({'row': i, 'error': 'Câu hỏi đã tồn tại (bỏ qua duplicate)'})
            skipped += 1; continue

        if q_type == 'MULTIPLE_CHOICE':
            options = [{'id': k, 'text': row.get(f'option_{k}', '').strip()}
                       for k in ('a', 'b', 'c', 'd')
                       if row.get(f'option_{k}', '').strip()]
            if len(options) < 2:
                errors.append({'row': i, 'error': 'MCQ cần ít nhất 2 đáp án'})
                skipped += 1; continue
        elif q_type == 'YES_NO':
            options = [{'id': 'yes', 'text': 'Có'}, {'id': 'no', 'text': 'Không'}]
        else:
            options = [{'id': 'true', 'text': 'Đúng'}, {'id': 'false', 'text': 'Sai'}]

        correct = row.get('correct_answer', '').strip().lower()
        if correct not in {o['id'] for o in options}:
            errors.append({'row': i, 'error': f'correct_answer "{correct}" không hợp lệ'})
            skipped += 1; continue

        to_create.append(PracticeQuestion(
            exam=exam, question_type=q_type, question_text=q_text,
            options=options, correct_answer=correct,
            explanation=row.get('explanation', '').strip(),
            points=int(row.get('points') or 10),
            difficulty=row.get('difficulty', '').strip().upper() or '',
            order=exam.questions.count() + len(to_create) + 1,
        ))
        existing.add(q_text)  # prevent intra-file duplicates

    PracticeQuestion.objects.bulk_create(to_create)
    return {'created': len(to_create), 'skipped': skipped, 'errors': errors}
```

### 5.2 CSV Flashcard (Kho thẻ)

**Format:**
```csv
category,front,back,difficulty
KHÁI NIỆM CỐT LÕI,"Sự khác biệt giữa Phong và Thủy?","Phong tán khí — gió làm tan khí. Thủy tụ khí — nước giữ khí lại.",MEDIUM
ÂM DƯƠNG,"Tại sao không nên có quá nhiều năng lượng Dương trong phòng ngủ?","Phòng ngủ cần năng lượng Âm để thư giãn. Quá nhiều Dương gây mất ngủ.",EASY
NGŨ HÀNH,"Kim khắc Mộc — ý nghĩa thực tế?","Kim đại diện cho sắc bén, Mộc đại diện cho sự phát triển. Kim kiểm soát sự bành trướng của Mộc.",HARD
```

**Validation:** `category` optional, `front` + `back` bắt buộc. Duplicate detection theo `front` text.

**Backend `parse_flashcards_csv()`** — tương tự pattern trên, bulk create `Flashcard` với `lesson=lesson`.

### 5.3 Export Template

Cả hai loại đều có endpoint export template trả file CSV mẫu (header + 1 dòng ví dụ mỗi loại). Filename: `questions_template.csv` / `flashcards_template.csv`.

---

## 6. Admin Design

### 6.1 `VideoLessonAdmin` — Trung tâm quản lý nội dung

**File**: `src/backend/videos/admin.py`

```python
class LessonFlashcardInline(admin.StackedInline):   # StackedInline cho long text
    model               = Flashcard
    fk_name             = 'lesson'
    extra               = 0
    fields              = ['order', 'category', 'front', 'back', 'difficulty']
    ordering            = ['order']
    verbose_name        = "Flashcard"
    verbose_name_plural = "Kho Flashcard"
    show_change_link    = True
    classes             = ['collapse']   # collapsible để trang không quá dài


class LessonExamInline(admin.TabularInline):   # TabularInline ổn vì ít fields
    model               = Exam
    fk_name             = 'lesson'
    extra               = 0
    fields              = ['title', 'slug', 'exam_type', 'passing_score',
                           'time_limit_minutes']
    show_change_link    = True
    verbose_name        = "Bài ôn luyện"
    verbose_name_plural = "Bài ôn luyện"


@admin.register(VideoLesson)
class VideoLessonAdmin(admin.ModelAdmin):
    inlines             = [LessonExamInline, LessonFlashcardInline]
    list_display        = ['title', 'course', 'order', 'is_free',
                           'flashcard_count', 'has_exam']
    list_filter         = ['is_free']
    autocomplete_fields = ['course']     # thay list_filter course — tránh dropdown dài
    search_fields       = ['title', 'course__title']
    ordering            = ['course', 'order']

    def flashcard_count(self, obj):
        c = obj.flashcards.count()
        return f"{c} thẻ" if c else "—"
    flashcard_count.short_description = "Kho Flashcard"

    def has_exam(self, obj):
        return "✅" if obj.exams.filter(exam_type='PRACTICE').exists() else "—"
    has_exam.short_description = "Ôn luyện"
```

**VideoLesson change_view layout:**
```
┌──────────────────────────────────────────────────────┐
│  Video Lesson: Bài 4 - Tụ Khí Phong Thủy            │
│  Course: [Khai Thông Phong Thủy ▼ autocomplete]      │
│  Order: 4   is_free: ☐   duration: 1445s             │
│  Summary: [textarea]                                 │
├──────────────────────────────────────────────────────┤
│  BÀI ÔN LUYỆN                           [+ Thêm]    │
│  title        │ slug     │ type    │ passing │  [→]  │
│  Ôn tập bài 4 │ on-tap-4 │PRACTICE │  70%    │  [→]  │
├──────────────────────────────────────────────────────┤
│  KHO FLASHCARD  (12 thẻ)           [▼ Mở rộng]      │
│  ┌────────────────────────────────────────────────┐  │
│  │ order: 1  category: KHÁI NIỆM CỐT LÕI         │  │
│  │ front: [textarea]                              │  │
│  │ back:  [textarea]                              │  │
│  │ difficulty: MEDIUM                             │  │
│  └────────────────────────────────────────────────┘  │
│  ┌─ Flashcard 2 ─────────────────────────────────┐  │
│  │ ...                                            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

> `LessonFlashcardInline` dùng `classes = ['collapse']` để collapsed by default khi có nhiều thẻ. Admin click "Mở rộng" mới hiện ra.

### 6.2 `ExamAdmin` — Quản lý câu hỏi + CSV Import/Export

**File**: `src/backend/exams/admin.py`

```python
class PracticeQuestionInline(admin.StackedInline):   # StackedInline — question_text dài
    model    = PracticeQuestion
    extra    = 0
    fields   = ['order', 'question_type', 'question_text', 'options',
                'correct_answer', 'explanation', 'points', 'difficulty']
    ordering = ['order']
    classes  = ['collapse']


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    inlines             = [PracticeQuestionInline]
    list_display        = ['title', 'lesson_link', 'exam_type',
                           'question_count', 'passing_score']
    list_filter         = ['exam_type']
    search_fields       = ['title', 'lesson__title']
    autocomplete_fields = ['lesson']
    prepopulated_fields = {'slug': ('title',)}   # tự sinh slug — tránh lỗi unique

    def lesson_link(self, obj):
        if obj.lesson:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson.pk])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        return "—"
    lesson_link.short_description = "Bài học"

    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = "Số câu"

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('<pk>/import-questions/',
                 self.admin_site.admin_view(self.import_questions_view),
                 name='exam-import-questions'),
            path('<pk>/export-template/',
                 self.admin_site.admin_view(self.export_template_view),
                 name='exam-export-template'),
        ]
        return custom + urls
```

**ExamAdmin change_view** (custom template `admin/exams/exam/change_form.html`):
```
┌──────────────────────────────────────────────────────┐
│  Exam: Ôn tập bài 4                                  │
│  Lesson: [Bài 4 - Tụ Khí ▼]  Slug: on-tap-bai-4    │
│  Type: PRACTICE  Passing: 70%  Time limit: —         │
├──────────────────────────────────────────────────────┤
│  CÂU HỎI (10 câu)              [▼ Mở rộng] [+ Thêm] │
│  ┌──────────────────────────────────────────────┐    │
│  │ #1  MULTIPLE_CHOICE                          │    │
│  │ question: Nguyên lý tụ khí?                  │    │
│  │ options: [JSON textarea]                     │    │
│  │ correct: c   points: 10   difficulty: MEDIUM │    │
│  └──────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────┤
│  [📥 Import câu hỏi từ CSV]  [📤 Tải template CSV]  │
└──────────────────────────────────────────────────────┘
```

**Import flow trong admin:**
```
Popup modal (hoặc trang riêng):
┌───────────────────────────────────────┐
│  Import câu hỏi từ CSV               │
│                                       │
│  📄 [Tải file template mẫu]          │
│                                       │
│  📁 Chọn file: [Browse] file.csv     │
│                                       │
│  ⚠️  Import THÊM vào câu hỏi hiện có │
│     Câu hỏi trùng sẽ bị bỏ qua      │
│                                       │
│  [Huỷ]              [Import]         │
└───────────────────────────────────────┘

Sau import — kết quả:
✅ Đã import 9 câu hỏi thành công.
⚠️  Bỏ qua 2 dòng:
    • Dòng 3: Câu hỏi đã tồn tại (duplicate)
    • Dòng 7: correct_answer "x" không hợp lệ
```

### 6.3 `VideoLessonAdmin` — Flashcard CSV Import

Thêm tương tự vào `VideoLessonAdmin` change_view (custom template `admin/videos/videolesson/change_form.html`):

```
├──────────────────────────────────────────────────────┤
│  [📥 Import flashcard từ CSV]  [📤 Tải template CSV] │
└──────────────────────────────────────────────────────┘
```

Endpoint:
```
POST /api/videos/{lesson_id}/flashcards/import/
GET  /api/videos/flashcards/export-template/
```

### 6.4 `FlashcardAdmin` — Quản lý độc lập

```python
@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display  = ['front_preview', 'category', 'lesson_link',
                     'module', 'difficulty', 'order']
    list_filter   = ['difficulty', 'category']
    search_fields = ['front', 'back', 'category', 'lesson__title']
    list_editable = ['order', 'category', 'difficulty']
    ordering      = ['lesson', 'order']

    def front_preview(self, obj):
        return (obj.front[:60] + '...') if len(obj.front) > 60 else obj.front
    front_preview.short_description = "Mặt trước"

    def lesson_link(self, obj):
        if obj.lesson:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson.pk])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        return "—"
    lesson_link.short_description = "Bài học"
```

### 6.5 `VideoCourseAdmin` — Overview

```python
class VideoLessonInline(admin.TabularInline):
    model            = VideoLesson
    extra            = 0
    fields           = ['order', 'title', 'slug', 'is_free',
                        'duration_seconds', 'flashcard_count_display', 'has_exam_display']
    readonly_fields  = ['flashcard_count_display', 'has_exam_display']
    show_change_link = True   # → VideoLessonAdmin

@admin.register(VideoCourse)
class VideoCourseAdmin(admin.ModelAdmin):
    inlines             = [VideoLessonInline]
    list_display        = ['title', 'instructor', 'level', 'is_free',
                           'price_lt', 'total_lessons', 'published_date']
    list_filter         = ['level', 'is_free', 'category']
    search_fields       = ['title', 'instructor']
    prepopulated_fields = {'slug': ('title',)}
```

---

## 7. Frontend Components

### 7.1 `VideoTabNav.vue` (mới)

**File**: `src/frontend/src/components/video/VideoTabNav.vue`

**Props:** `modelValue: number`, `dueBadgeCount: number` (từ flashcard API response `due_count`)

```
┌───────────────────────────────────────────────┐
│  ✨ Tóm tắt AI │ 🃏 Flashcards 🔴3 │ 📝 Ôn luyện │
│  ─────────────                                │  ← gold underline 2px
└───────────────────────────────────────────────┘
```

Badge đỏ trên Flashcards tab: hiển thị `due_count` từ API. Lưu `due_count` vào store/parent sau lần đầu fetch để badge không biến mất khi switch tab.

**Style:** `position: sticky; top: 56px; z-index: 9; background: var(--bg-main)`

---

### 7.2 `LessonSummaryTab.vue` (mới)

**File**: `src/frontend/src/components/video/LessonSummaryTab.vue`

**Props:** `summary: string`

```
┌─────────────────────────────────┐
│  [📋 Sao chép]           ← góc phải  │
│                                 │
│  Nội dung tóm tắt hiển thị     │
│  với white-space: pre-line      │
│                                 │
└─────────────────────────────────┘
```

- **Has data**: render text + nút `📋 Sao chép` (copy to clipboard)
- **Empty**: icon + "Tóm tắt AI đang được tạo cho bài học này..."

---

### 7.3 `FlashcardTab.vue` (mới)

**File**: `src/frontend/src/components/video/FlashcardTab.vue`

**Load logic:**
- Mount lần đầu → gọi API (lazy nhờ `v-if` ở parent)
- Nút "Xáo bài" → confirm dialog → gọi lại API
- Lưu `due_count` emit lên parent để update badge

**Internal state:**
```js
const pool        = ref({ total_in_pool: 0, due_count: 0, count: 0, cards: [] })
const index       = ref(0)
const isFlipped   = ref(false)
const loading     = ref(false)
const sessionRatings = ref({})  // { cardId: 'hard'|'ok'|'easy' }
const sessionDone    = ref(false)
```

#### Layout: Session đang học
```
┌──────────────────────────────────────────────┐
│  🃏  Kho 42 thẻ · 3 đến hạn  [🔀 Xáo bài]  │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │  🔴 ĐẾN HẠN ÔN    KHÁI NIỆM CỐT LÕI│   │ ← badge đỏ nếu is_due
│   │                                      │   │
│   │   Sự khác biệt cơ bản giữa          │   │
│   │   "Phong" và "Thủy" trong            │   │
│   │   việc tụ khí?                       │   │
│   │                                      │   │
│   │           • ● • • •                  │   │ ← dot indicator
│   └──────────────────────────────────────┘   │
│           Chạm để lật thẻ                    │
│                                              │
│  [← Trước]       3 / 10       [Sau →]       │
└──────────────────────────────────────────────┘

──── Sau khi flip ────────────────────────────
│   ┌──────────────────────────────────────┐   │
│   │  KHÁI NIỆM CỐT LÕI                  │   │
│   │  Phong tán khí — gió làm tan khí.   │   │ ← back text
│   │  Thủy tụ khí — nước giữ khí lại.    │   │
│   └──────────────────────────────────────┘   │
│                                              │
│  Bạn nhớ tốt không?                         │
│  [😓 Khó]    [😐 Ổn]    [😊 Dễ]           │
│                    [→ Bỏ qua]               │ ← optional, nhỏ
│                                              │
│  [← Trước]       3 / 10       [Sau →]       │
```

> SM-2 rating **optional**: user có thể bỏ qua bằng nút nhỏ "Bỏ qua" hoặc swipe sang thẻ tiếp mà không cần rate.

#### Layout: Session hoàn thành
```
┌──────────────────────────────────────────────┐
│         ✅ Phiên học hoàn thành!             │
│              10 thẻ đã xem                   │
│                                              │
│   😓 Khó: 2   😐 Ổn: 5   😊 Dễ: 3          │
│                                              │
│   Lần ôn tiếp theo: 3 thẻ vào ngày mai      │ ← từ SM-2 schedule
│                                              │
│  [🔀 Xáo bài mới]   [📝 Ôn luyện ngay →]   │
└──────────────────────────────────────────────┘
```

Nút "Ôn luyện ngay" → emit event để parent switch sang tab QuizTab.

**Flip animation (CSS 3D):**
```css
.fc-wrap  { perspective: 1000px; }
.fc-card  { transform-style: preserve-3d; transition: transform 0.4s ease; cursor: pointer; }
.fc-card.is-flipped { transform: rotateY(180deg); }
.fc-front, .fc-back { backface-visibility: hidden; position: absolute; inset: 0; }
.fc-back  { transform: rotateY(180deg); }
```

**Swipe:** `touchstart`/`touchend`, delta > 50px → prev/next (unflip card trước khi navigate).

**"Xáo bài" confirm** (khi đang dở session):
```
Bạn đang ở thẻ 7/10.
Xáo bài sẽ đặt lại phiên học hiện tại.
[Huỷ]   [Xáo bài]
```

**Empty state:** "Bài học này chưa có flashcard."

**Loading state:** 3 skeleton cards với shimmer animation.

---

### 7.4 `QuizTab.vue` (mới)

**File**: `src/frontend/src/components/video/QuizTab.vue`

**States:** `idle` → `in_progress` → `submitted`

**Question shuffle:** Khi chuyển `idle → in_progress`, shuffle array câu hỏi ở frontend:
```js
function startQuiz() {
  shuffledQuestions.value = [...exam.value.questions].sort(() => Math.random() - 0.5)
  state.value = 'in_progress'
}
```

#### State: idle
```
┌─────────────────────────────────┐
│  📝 Ôn tập bài 4                │
│  10 câu  ·  Đạt: ≥70%          │
│  Không giới hạn thời gian       │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Lần trước: 85/100 ✅     │    │
│  │ 2 lần làm  · 20/02/2026 │    │
│  └─────────────────────────┘    │
│                                 │
│  [    Bắt đầu ôn luyện    ]     │
└─────────────────────────────────┘
```

#### State: in_progress — one-by-one với back button
```
┌─────────────────────────────────┐
│  Câu 3 / 10    [━━━━━░░░░░]    │
├─────────────────────────────────┤
│  Phong Thủy có nguồn gốc từ    │
│  Trung Quốc không?              │
│                                 │
│  ── MULTIPLE_CHOICE ──          │
│  ○  A. Đáp án A                 │
│  ●  B. Đáp án B  (gold)        │
│  ○  C. Đáp án C                 │
│  ○  D. Đáp án D                 │
│                                 │
│  ── YES_NO ──                   │
│  ┌──────────┐  ┌──────────┐    │
│  │  ● Có    │  │  ○ Không │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  ── TRUE_FALSE ──               │
│  ┌──────────┐  ┌──────────┐    │
│  │  ○ Đúng  │  │  ● Sai   │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  [← Câu trước]  [Câu tiếp →]  │ ← back button enabled từ câu 2
└─────────────────────────────────┘
```

> Nút `← Câu trước`: disabled ở câu 1, enabled từ câu 2. Cho phép sửa đáp án câu trước.

> Nút `Câu tiếp` đổi thành `Nộp bài` ở câu cuối.

#### State: submitted
```
┌─────────────────────────────────┐
│          85 / 100               │
│        ✅ Đã vượt qua!          │
│  "Xuất sắc! Tiếp tục phát huy" │
│                                 │
│  ▼ Xem lại đáp án               │
│  ┌─────────────────────────┐    │
│  │ ✅ Câu 1: B — Đáp án B  │    │
│  │ ❌ Câu 2: Đúng           │    │
│  │         (bạn chọn: Sai) │    │
│  └─────────────────────────┘    │
│                                 │
│  [Làm lại]   [Bài tiếp theo →] │
└─────────────────────────────────┘
```

**Empty state:** "Bài học này chưa có bài ôn luyện."

**Loading state:** Skeleton cho câu hỏi và options.

**Error state (API fail):** "Không thể tải bài ôn luyện. Thử lại?" + retry button.

---

### 7.5 Services

**`src/frontend/src/services/exams.service.js`** (mới):
```js
import { api } from './api'

export const examsService = {
  submitExam(examSlug, answers) {
    return api.post(`/exams/${examSlug}/submit/`, { answers })
  },
  reviewFlashcard(flashcardId, quality) {
    return api.post(`/practice/flashcards/${flashcardId}/review/`, { quality })
  },
}
```

**`src/frontend/src/services/videos.service.js`** (bổ sung):
```js
getLessonFlashcards(courseSlug, lessonSlug, count = 10) {
  return api.get(`/videos/${courseSlug}/lessons/${lessonSlug}/flashcards/`,
                 { params: { count } })
},
getLessonExam(courseSlug, lessonSlug) {
  return api.get(`/videos/${courseSlug}/lessons/${lessonSlug}/exam/`)
},
```

---

### 7.6 Refactor `VideoPlayerView.vue`

**Script:**
```js
import VideoTabNav      from '../components/video/VideoTabNav.vue'
import LessonSummaryTab from '../components/video/LessonSummaryTab.vue'
import FlashcardTab     from '../components/video/FlashcardTab.vue'
import QuizTab          from '../components/video/QuizTab.vue'

const activeTab    = ref(0)
const dueBadgeCount = ref(0)   // cập nhật từ FlashcardTab emit

const TABS = [
  { label: 'Tóm tắt AI', icon: 'sparkle' },
  { label: 'Flashcards', icon: 'cards'   },
  { label: 'Ôn luyện',   icon: 'quiz'    },
]

function onFlashcardDueCount(count) {
  dueBadgeCount.value = count
}
function switchToQuiz() {
  activeTab.value = 2
}
```

**Template:**
```html
<div class="vp">
  <header class="vp__header" />                        <!-- sticky z:10 -->
  <div class="vp__player-wrap" />                      <!-- video 16:9 -->

  <div class="vp__lesson-meta">                        <!-- title + index -->
    <h1>{{ lesson.title }}</h1>
    <span>{{ currentIndex + 1 }} / {{ sortedLessons.length }}</span>
  </div>

  <VideoTabNav
    v-model="activeTab"
    :tabs="TABS"
    :due-badge-count="dueBadgeCount"
  />

  <!-- v-if + keep-alive: lazy mount, cache sau lần đầu -->
  <div class="vp__tab-content">
    <LessonSummaryTab
      v-show="activeTab === 0"
      :summary="lesson.summary"
    />
    <keep-alive>
      <FlashcardTab
        v-if="activeTab === 1"
        :course-slug="route.params.slug"
        :lesson-slug="route.params.lessonSlug"
        @due-count="onFlashcardDueCount"
        @go-quiz="switchToQuiz"
      />
    </keep-alive>
    <keep-alive>
      <QuizTab
        v-if="activeTab === 2"
        :course-slug="route.params.slug"
        :lesson-slug="route.params.lessonSlug"
      />
    </keep-alive>
  </div>

  <div v-if="lesson.description" class="vp__section">  <!-- description luôn hiện -->
    <h2 class="vp__section-title">Mô tả</h2>
    <p class="vp__section-text">{{ lesson.description }}</p>
  </div>

  <!-- Floating bottom bar (fixed) -->
  <div class="vp__bottom-nav">
    <button :disabled="!prevLesson" @click="goToLesson(prevLesson)">
      ← Bài trước
    </button>
    <button :disabled="!nextLesson" @click="goToLesson(nextLesson)">
      Bài tiếp →
    </button>
  </div>
</div>
```

**CSS bổ sung:**
```css
.vp__bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom));
  background: var(--bg-main);
  border-top: 1px solid rgba(255,255,255,0.08);
  z-index: 20;
}
.vp { padding-bottom: 80px; }  /* clearance cho bottom nav */
```

---

## 8. Task List

### Phase 1 — Backend: Models & Migrations

| # | Task | File |
|---|------|------|
| B1 | Thêm `lesson` FK + `category` vào `Flashcard`, thêm `clean()` | `exams/models.py` |
| B2 | Thêm `lesson` FK vào `Exam` | `exams/models.py` |
| B3 | Thêm `question_type` vào `PracticeQuestion` | `exams/models.py` |
| B4 | `makemigrations exams && migrate` | — |

### Phase 2 — Backend: API

| # | Task | File |
|---|------|------|
| B5 | `FlashcardWithReviewSerializer` thêm `category`, `is_due`, `user_review` | `exams/serializers.py` |
| B6 | `PracticeQuestionSerializer` thêm `question_type` | `exams/serializers.py` |
| B7 | `LessonFlashcardsView` — smart sampling (due first + random fill) | `videos/views.py` |
| B8 | `LessonExamView` — lấy exam PRACTICE đầu tiên của lesson | `videos/views.py` |
| B9 | URL patterns flashcards + exam endpoints | `videos/urls.py` |
| B10 | `parse_questions_csv()` với duplicate detection | `exams/utils.py` |
| B11 | `parse_flashcards_csv()` | `exams/utils.py` |
| B12 | `QuestionImportView`, `QuestionExportTemplateView` | `exams/views.py` |
| B13 | `FlashcardImportView`, `FlashcardExportTemplateView` | `exams/views.py` |
| B14 | URL patterns import/export | `exams/urls.py` |

### Phase 3 — Admin

| # | Task | File |
|---|------|------|
| B15 | `LessonFlashcardInline` (StackedInline + collapse) + `LessonExamInline` | `videos/admin.py` |
| B16 | `VideoLessonAdmin` với `autocomplete_fields`, `flashcard_count`, `has_exam` | `videos/admin.py` |
| B17 | `VideoCourseAdmin` với `VideoLessonInline` + `show_change_link` | `videos/admin.py` |
| B18 | `ExamAdmin` với `PracticeQuestionInline` (StackedInline) + `prepopulated_fields` | `exams/admin.py` |
| B19 | Custom template `admin/exams/exam/change_form.html` (Import/Export buttons) | `templates/` |
| B20 | Custom template `admin/videos/videolesson/change_form.html` (Flashcard Import) | `templates/` |
| B21 | `FlashcardAdmin` với `list_editable` + `lesson_link` | `exams/admin.py` |

### Phase 4 — Frontend

| # | Task | File |
|---|------|------|
| F1 | `exams.service.js` | `services/` |
| F2 | Bổ sung `getLessonFlashcards`, `getLessonExam` vào `videos.service.js` | `services/` |
| F3 | `VideoTabNav.vue` (sticky, badge đỏ `due_count`) | `components/video/` |
| F4 | `LessonSummaryTab.vue` (copy button, empty state) | `components/video/` |
| F5 | `FlashcardTab.vue` (smart load, flip 3D, swipe, optional SM-2, session complete, xáo confirm) | `components/video/` |
| F6 | `QuizTab.vue` (shuffle, back button, MCQ+YES_NO+TRUE_FALSE, result) | `components/video/` |
| F7 | Refactor `VideoPlayerView.vue` (v-if+keep-alive, floating bottom nav, due badge) | `views/` |

---

## 9. Tổng hợp fixes từ review

| Vấn đề | Fix |
|--------|-----|
| `order_by('?')` slow | Python `random.sample()` trên list IDs |
| Pure random bỏ qua SM-2 | Smart sampling: due first → random fill |
| `TabularInline` cho long text | `StackedInline` + `classes=['collapse']` |
| `v-show` mount tất cả tabs | `v-if` + `<keep-alive>` |
| CSV import duplicate | Hash check `question_text` + intra-file check |
| `Exam.slug` lỗi khi tạo inline | `prepopulated_fields = {'slug': ('title',)}` |
| Flashcard orphan (lesson=null, module=null) | `clean()` validation |
| Prev/Next nav bị scroll mất | Floating bottom bar (fixed) |
| SM-2 rating bắt buộc | Optional — thêm nút "Bỏ qua" |
| Không có session complete | Session complete screen + summary |
| Xáo bài mất progress | Confirm dialog trước khi reshuffle |
| Quiz không có back button | `← Câu trước` (disabled ở câu 1) |
| Quiz câu hỏi cùng thứ tự | Shuffle ở frontend khi bắt đầu |
| Due badge ẩn khi switch tab | Lưu `due_count` emit lên parent |
| Course dropdown quá dài | `autocomplete_fields = ['course']` |
| Chỉ có CSV import cho câu hỏi | Thêm CSV import/export cho flashcard |
| Copy tóm tắt | Nút `📋 Sao chép` trong LessonSummaryTab |

---

## 10. Design Tokens

| Token | Value |
|-------|-------|
| `--bg-main` | `#2E1A0F` |
| `--bg-card` | `#4A2C27` |
| `--accent-gold` | `#C5A551` |
| `--accent-red` | `#C13123` |
| `--text-primary` | `#FFFFFF` |
| `--radius-md` | `12px` |
| `--space-md` | `16px` |
| Header height | `56px` |
| Tab bar height | `48px` |
| Tab bar `sticky top` | `56px` |
| Bottom nav height | `~64px + safe-area` |
| Page bottom padding | `80px` |
