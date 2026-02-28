# Feature 9: Training Architecture — Extensible Activity-Based Design

**Date:** 2026-02-28
**Status:** Draft v6 — Tech Lead review fixes applied (T1–T12)
**Scope:** Database redesign + unified training UX từ Book Chapter & Video Lesson

---

## 1. Mục tiêu

- Người dùng có thể luyện tập từ **bất kỳ chapter sách** hoặc **video bài học** nào.
- Giao diện chọn chế độ: **Flashcard**, **Quiz** — kiến trúc mở rộng cho Mindmap, Infographic ở v2.
- **Access control**: chỉ truy cập training khi đã có quyền với content gốc.
- Giữ nguyên SM-2 algorithm, exam submission, progress tracking.

---

## 2. Vấn đề hiện tại

| Vấn đề | Mô tả |
|--------|-------|
| `Flashcard` và `Exam` thiếu liên kết `BookChapter` | Chỉ có FK tới `VideoLesson` hoặc `PracticeModule` |
| Thêm loại nội dung mới buộc sửa schema | Phải thêm FK trên `TrainingSet` mỗi khi có type mới |
| BookReaderView không có entry point luyện tập | Không có UI từ chapter sách vào flashcard/quiz |

---

## 3. Kiến trúc tổng quan

### 3.1 Hai lớp trung gian

```
Source (lesson / chapter / module)
        │ 1
        ↓
  TrainingSet         ← gắn với content source
        │ 1
        ↓ N
  TrainingActivity    ← một chế độ luyện tập (FLASHCARD, QUIZ, ...)
        │
        ├── [FLASHCARD] ← Flashcard[]   (reverse FK)
        └── [QUIZ]      ← Exam (1:1)   (reverse OneToOne)
                                        [MINDMAP, INFOGRAPHIC — v2]
```

**Lý do giữ `TrainingActivity`** dù Mindmap/Infographic là future:
- Admin cần `is_active` flag để bật/tắt từng chế độ per training set
- Admin cần `order` để sắp xếp thứ tự hiển thị
- Frontend render `ModeSelector` **động từ `activities[]`** — không hardcode
- Thêm type mới: chỉ thêm `MINDMAP` vào `choices` + tạo model mới, không sửa TrainingSet/Flashcard/Exam

### 3.2 UX Entry Point theo loại content

| Source | Entry Point | UX Pattern |
|--------|-------------|------------|
| VideoLesson | Tab trong VideoPlayerView | Embedded tab (hiện có) + nút "↗ Mở rộng" |
| BookChapter | Nút trong BookReaderView | **Drawer/panel overlay** — không navigate ra ngoài |
| PracticeModule | Route standalone | `/training/module/:slug` |

> **Lý do dùng drawer cho Book**: User đang đọc dở trang 47, không nên bị đẩy ra trang khác.
> Video đã dùng tab embedded — giữ nguyên pattern.

---

## 4. Access Control

### 4.1 Quy tắc truy cập

| Nguồn Training | Điều kiện truy cập |
|----------------|-------------------|
| `TrainingSet.lesson` | Free lesson, VIP, hoặc đã mua course |
| `TrainingSet.chapter` | Free book, VIP, đã mua book, hoặc chapter demo |
| `TrainingSet.module` | Chỉ cần auth |

### 4.2 Helper dùng chung cho tất cả training views

Thay vì lặp logic ở mỗi view, tạo 1 helper:

```python
# exams/views_training.py

def _verify_training_set_access(user, training_set) -> bool:
    """Kiểm tra access cho TrainingSet dựa theo source type."""
    if training_set.lesson_id:
        lesson = training_set.lesson
        return _can_access_lesson(user, lesson.course, lesson)
    if training_set.chapter_id:
        chapter = training_set.chapter
        return _can_access_chapter(user, chapter.book, chapter)
    # module (STANDALONE): chỉ cần auth
    return user.is_authenticated

def _get_activity_or_403(user, activity_id):
    """
    Lookup TrainingActivity và verify access.
    Dùng cho ActivityFlashcardsView, ActivityExamView.
    Ngăn user biết UUID trực tiếp bypass access check.

    select_related bắt buộc để tránh N+1 trong _verify_training_set_access():
    - training_set__lesson__course  (cho LESSON access check)
    - training_set__chapter__book   (cho CHAPTER access check)
    - training_set__module          (cho STANDALONE — chỉ cần auth)
    """
    activity = get_object_or_404(
        TrainingActivity.objects.select_related(
            'training_set__lesson__course',
            'training_set__chapter__book',
            'training_set__module',
        ),
        public_id=activity_id,
    )
    if not _verify_training_set_access(user, activity.training_set):
        raise PermissionDenied
    return activity
```

### 4.3 Áp dụng vào views

```python
class TrainingSetByLessonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_slug):
        lesson = get_object_or_404(VideoLesson, slug=lesson_slug)
        if not _can_access_lesson(request.user, lesson.course, lesson):
            return Response(status=403)
        training_set = get_object_or_404(TrainingSet, lesson=lesson)
        ...

class ActivityFlashcardsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, activity_id):
        activity = _get_activity_or_403(request.user, activity_id)  # ← bao gồm access check
        ...

class ActivityExamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, activity_id):
        activity = _get_activity_or_403(request.user, activity_id)  # ← bao gồm access check
        ...
```

**Frontend**: Nút "Luyện tập" chỉ hiện nếu `chapter.has_training_set === true` (xem Section 7 về tối ưu API call). Nếu API trả 403, hiển thị "Cần mua sách/khóa học để luyện tập."

---

## 5. Database Design

### 5.1 Model mới: `TrainingSet`

> **Fix #3**: `source_type` không lưu vào DB — derive từ FK nào non-null để tránh bất đồng bộ.
> **Fix #8**: `module` dùng `CASCADE` thay `SET_NULL` để tránh orphan record khi module bị xóa.

```python
from django.utils.functional import cached_property

class TrainingSet(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Exactly one non-null — source_type được derive từ đây
    lesson = models.OneToOneField(
        'videos.VideoLesson', on_delete=models.CASCADE,
        null=True, blank=True, related_name='training_set',
    )
    chapter = models.OneToOneField(
        'books.BookChapter', on_delete=models.CASCADE,
        null=True, blank=True, related_name='training_set',
    )
    module = models.ForeignKey(
        'PracticeModule', on_delete=models.CASCADE,  # CASCADE: xóa module → xóa luôn training
        null=True, blank=True, related_name='training_sets',
    )

    # source_type là @cached_property, không lưu DB → không bao giờ bất đồng bộ với FK
    # cached_property: cache trên instance, tránh re-evaluate nhiều lần trong cùng request
    @cached_property
    def source_type(self):
        if self.lesson_id:  return 'LESSON'
        if self.chapter_id: return 'CHAPTER'
        return 'STANDALONE'

    # source_meta cho frontend fallback navigation
    @cached_property
    def source_meta(self):
        if self.lesson_id:
            return {
                'lesson_slug': self.lesson.slug,
                'course_slug': self.lesson.course.slug,
            }
        if self.chapter_id:
            return {
                'book_slug':      self.chapter.book.slug,
                'chapter_order':  self.chapter.order,
            }
        return {'module_slug': self.module.slug}

    class Meta:
        ordering = ['title']
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(lesson_id__isnull=False, chapter_id__isnull=True, module_id__isnull=True) |
                    Q(lesson_id__isnull=True, chapter_id__isnull=False, module_id__isnull=True) |
                    Q(lesson_id__isnull=True, chapter_id__isnull=True, module_id__isnull=False)
                ),
                name='trainingset_exactly_one_source'
            )
        ]

    def clean(self):
        sources = [bool(self.lesson_id), bool(self.chapter_id), bool(self.module_id)]
        if sources.count(True) != 1:
            raise ValidationError("TrainingSet phải gắn với đúng 1 source.")
```

### 5.2 Model mới: `TrainingActivity`

```python
class TrainingActivity(BaseModel):
    """
    Extensibility rule:
      - Thêm value vào ActivityType
      - Tạo content model mới với FK/OneToOne trỏ vào TrainingActivity
      - KHÔNG thay đổi TrainingSet, Flashcard, Exam, hay migration cũ
    """
    class ActivityType(models.TextChoices):
        FLASHCARD = 'FLASHCARD', 'Flashcard Deck'
        QUIZ      = 'QUIZ',      'Quiz / Exam'
        # v2: MINDMAP = 'MINDMAP', 'Mind Map'
        # v2: INFOGRAPHIC = 'INFOGRAPHIC', 'Infographic'

    training_set = models.ForeignKey(
        TrainingSet, on_delete=models.CASCADE, related_name='activities',
    )
    activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        constraints = [
            models.UniqueConstraint(
                fields=['training_set', 'activity_type'],
                name='exams_trainingactivity_unique_type_per_set'
            )
        ]
```

### 5.3 `Flashcard` — thay đổi

**Xóa:** `lesson` FK, `module` FK — **Thêm:** `activity` FK

```python
class Flashcard(BaseModel):
    activity = models.ForeignKey(
        TrainingActivity, on_delete=models.CASCADE, related_name='flashcards',
    )
    front = models.TextField()
    back = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    image = models.URLField(max_length=500, blank=True)  # S3/CDN URL — không phải file upload
    difficulty = models.CharField(max_length=10, blank=True)
    order = models.PositiveIntegerField(default=0)
    # Giữ nguyên: FlashcardReview (SM-2 per user)
```

### 5.4 `Exam` — thay đổi

**Xóa:** `lesson` FK, `module` FK — **Thêm:** `activity` OneToOneField (nullable cho FINAL_EXAM)

```python
class Exam(BaseModel):
    activity = models.OneToOneField(
        TrainingActivity, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='exam',
    )
    # exam_type=FINAL_EXAM → activity=None
    # exam_type=PRACTICE   → activity → TrainingActivity(type=QUIZ)
    # ... các field còn lại giữ nguyên
```

### 5.5 Schema tổng thể

```
Source
  └─ TrainingSet  (source_type = @property)
       └─ TrainingActivity[]  (order, is_active)
            ├── [FLASHCARD]
            │     └─ Flashcard[]
            │           └─ FlashcardReview[]  (SM-2 per user)
            └── [QUIZ]
                  └─ Exam (type=PRACTICE, activity=OneToOne)
                        ├─ PracticeQuestion[]
                        └─ UserExamProgress[]

Standalone finals:
  Exam (type=FINAL_EXAM, activity=null) ← Book.final_exam_id / Course.final_exam_id
```

---

## 6. Admin Workflow — Tạo Training Content

### 6.1 Workflow tạo mới cho Chapter

```
1. Admin → TrainingSet → [+ Add]
   - Title: "Chương 3: Can Chi"
   - Chapter: [chọn từ autocomplete]   ← không dùng raw_id_fields
   → Save

2. TrainingSet detail → Activities inline → [+ Add Activity]
   - Type: FLASHCARD | Title: "Ôn luyện thẻ nhớ" | Order: 0
   → Save → ghi nhớ public_id của activity (hiển thị ở detail page)

3. Import flashcards:
   GET  /api/training/activities/{activity_public_id}/flashcards/export-template/
   POST /api/training/activities/{activity_public_id}/flashcards/import/

4. (Optional) Quiz:
   - Thêm Activity type=QUIZ | Order: 1
   - Vào Exam admin → [+ Add Exam], chọn activity vừa tạo
   - Import questions CSV
```

### 6.2 Import endpoint

Endpoint cũ (`POST /api/exams/flashcards/{lesson_slug}/import/`) **chưa được sử dụng → xóa luôn, không cần backward compatibility**.

Endpoint mới (dùng ngay từ đầu):
```
POST /api/training/activities/{activity_id}/flashcards/import/
GET  /api/training/activities/{activity_id}/flashcards/export-template/
```

### 6.3 Admin UI

```python
class TrainingActivityInline(admin.TabularInline):
    model = TrainingActivity
    extra = 0
    fields = ['activity_type', 'title', 'order', 'is_active', 'public_id']
    readonly_fields = ['public_id']  # hiển thị để copy dùng cho import

@admin.register(TrainingSet)
class TrainingSetAdmin(admin.ModelAdmin):
    list_display = ['title', 'source_type', 'get_source_name', 'activity_summary']
    list_filter = ['lesson__course__category', 'chapter__book__category']
    search_fields = ['title']
    autocomplete_fields = ['lesson', 'chapter', 'module']  # thay raw_id_fields
    inlines = [TrainingActivityInline]

    def get_source_name(self, obj):
        return obj.lesson or obj.chapter or obj.module
    get_source_name.short_description = 'Source'

    def get_queryset(self, request):
        # prefetch activities để activity_summary không gây N+1 per row
        return super().get_queryset(request).prefetch_related('activities')

    def activity_summary(self, obj):
        parts = [
            f"{'✓' if a.is_active else '✗'} {a.activity_type}"
            for a in obj.activities.all()
        ]
        return ' | '.join(parts) or '—'
    activity_summary.short_description = 'Activities'
```

---

## 7. Backend API Design

### 7.1 `GET /api/training/lesson/{lesson_slug}/`

Access: `_can_access_lesson()`.

**Response** — bao gồm `source_meta` cho frontend navigation:

```json
{
  "id": "public-uuid",
  "title": "Bài 1: Nhập môn Kỳ Môn",
  "source_type": "LESSON",
  "source_meta": {
    "lesson_slug": "bai-1-nhap-mon",
    "course_slug": "ky-mon-don-gia"
  },
  "activities": [
    {
      "id": "public-uuid",
      "activity_type": "FLASHCARD",
      "title": "Ôn luyện thẻ nhớ",
      "order": 0,
      "is_active": true,
      "stats": { "total_count": 15, "due_count": 4 }
    },
    {
      "id": "public-uuid",
      "activity_type": "QUIZ",
      "title": "Kiểm tra kiến thức",
      "order": 1,
      "is_active": true,
      "stats": { "question_count": 10, "last_score": 80, "is_passed": true }
    }
  ]
}
```

### 7.2 `GET /api/training/chapter/{book_slug}/{chapter_order}/`

Access: `_can_access_chapter()`.
Response tương tự, `source_meta: { book_slug, chapter_order }`.
Trả về `404` nếu chapter chưa có TrainingSet.

> `<int:chapter_order>` chỉ validate là số nguyên dương — không validate range. View trả `404` tự nhiên qua `get_object_or_404(BookChapter, book__slug=book_slug, order=chapter_order)`. Test case cần cover: `chapter_order=0`, `chapter_order=99999`.

### 7.3 `GET /api/training/activities/{activity_id}/flashcards/?count=10`

Access: `_get_activity_or_403()` — bao gồm traverse lên TrainingSet → source.

Smart sampling: `due first` rồi fill ngẫu nhiên.

### 7.4 `GET /api/training/activities/{activity_id}/exam/`

Access: `_get_activity_or_403()`.

### 7.5 `POST /api/training/activities/{activity_id}/flashcards/import/`

Staff only. Thay thế endpoint cũ theo `lesson_slug`.

### 7.6 Giữ nguyên

| Endpoint | Ghi chú |
|----------|---------|
| `POST /api/practice/flashcards/{id}/review/` | SM-2 — không đổi |
| `POST /api/exams/{slug}/submit/` | Submit exam — không đổi |

### 7.7 `BookChapterContentSerializer` — thêm `has_training_set`

> **Fix #7**: Tránh double API call từ BookReaderView. Field này dùng để show/hide nút "Luyện tập" mà không cần gọi thêm API.

```python
# books/serializers.py
class BookChapterContentSerializer(serializers.ModelSerializer):
    has_training_set = serializers.SerializerMethodField()

    def get_has_training_set(self, chapter):
        # Kiểm tra có ít nhất 1 active activity
        ts = getattr(chapter, 'training_set', None)
        if ts is None:
            return False
        return ts.activities.filter(is_active=True).exists()
```

View prefetch để tránh N+1:
```python
# books/views.py — BookChapterDetailView
chapter = BookChapter.objects.select_related(
    'training_set'
).prefetch_related(
    'training_set__activities'
).get(...)
```

> **N+1 requirement cho `source_meta`**: Bất cứ queryset nào dùng `TrainingSetSerializer` (có `source_meta`) phải thêm:
> ```python
> queryset = TrainingSet.objects.select_related(
>     'lesson__course',   # cho source_type=LESSON
>     'chapter__book',    # cho source_type=CHAPTER
>     'module',           # cho source_type=STANDALONE
> )
> ```
> Thiếu `select_related` sẽ gây N+1 query khi serialize list.

```python
# Ví dụ trong TrainingSetByLessonView / TrainingSetByChapterView:
training_set = TrainingSet.objects.select_related(
    'lesson__course', 'chapter__book', 'module'
).get(...)
```

### 7.8 Serializer: `TrainingActivitySerializer` — fix `due_count`

> **Fix #6**: Đếm cả thẻ chưa từng review (không chỉ đếm thẻ có review và đến hạn).
> **Fix #T1**: `get_stats()` gọi DB per activity → N+1 khi serialize list. View phải prefetch trước.

**Prefetch bắt buộc** trong `TrainingSetByLessonView` / `TrainingSetByChapterView`:

```python
from django.db.models import Prefetch

training_set = TrainingSet.objects.select_related(
    'lesson__course', 'chapter__book', 'module'
).prefetch_related(
    # Flashcard stats
    Prefetch(
        'activities__flashcards__reviews',
        queryset=FlashcardReview.objects.filter(user=request.user),
    ),
    # Quiz stats
    'activities__exam__questions',
    Prefetch(
        'activities__exam__user_progresses',
        queryset=UserExamProgress.objects.filter(user=request.user),
    ),
).get(...)
```

Với prefetch này, `get_stats()` dùng `activity.flashcards.all()` (đã cached) thay vì hit DB mới — toàn bộ endpoint chỉ tốn **4–5 queries** bất kể số lượng activities.

```python
import logging
logger = logging.getLogger(__name__)

class TrainingActivitySerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()

    def get_stats(self, activity):
        user = self.context['request'].user

        if activity.activity_type == TrainingActivity.ActivityType.FLASHCARD:
            total = activity.flashcards.count()
            # .distinct() đảm bảo không double-count nếu FlashcardReview không có
            # unique constraint (flashcard, user). Nếu có unique constraint → vẫn safe.
            not_due_count = activity.flashcards.filter(
                reviews__user=user,
                reviews__next_review__gt=timezone.now()
            ).distinct().count()
            due = total - not_due_count
            return {'total_count': total, 'due_count': due}

        if activity.activity_type == TrainingActivity.ActivityType.QUIZ:
            exam = getattr(activity, 'exam', None)
            if not exam:
                return {'question_count': 0, 'last_score': None, 'is_passed': False}
            progress = exam.user_progresses.filter(user=user).first()
            return {
                'question_count': exam.questions.count(),
                'last_score':  progress.score if progress else None,
                'is_passed':   progress.is_passed if progress else False,
            }

        # Nếu v2 thêm MINDMAP/INFOGRAPHIC mà quên thêm case → warning để phát hiện sớm
        logger.warning(
            "TrainingActivitySerializer.get_stats: unknown activity_type '%s' (id=%s)",
            activity.activity_type, activity.pk
        )
        return {}
```

### 7.9 URL routing

```python
# exams/urls_training.py
urlpatterns = [
    path('lesson/<slug:lesson_slug>/',
         TrainingSetByLessonView.as_view()),
    path('chapter/<slug:book_slug>/<int:chapter_order>/',
         TrainingSetByChapterView.as_view()),
    path('activities/<uuid:activity_id>/flashcards/',
         ActivityFlashcardsView.as_view()),
    path('activities/<uuid:activity_id>/flashcards/import/',
         FlashcardImportView.as_view()),
    path('activities/<uuid:activity_id>/flashcards/export-template/',
         FlashcardExportTemplateView.as_view()),
    path('activities/<uuid:activity_id>/exam/',
         ActivityExamView.as_view()),
]
# → 6 views tổng cộng

# config/urls.py
path('api/training/', include('exams.urls_training')),
```

---

## 8. Frontend Architecture

### 8.1 UX Pattern theo loại source

#### Book Chapter → Drawer Overlay

```
┌─────────────────────────────────────────────────┐
│ BookReaderView (đang hiển thị trang 47)         │
│                                                  │
│ ┌── Training Drawer (slide up) ─────────────┐   │
│ │ × Luyện tập: Chương 3 — Can Chi          │   │
│ │ ──────────────────────────────────────   │   │
│ │  [🃏 Flashcard]  [📝 Quiz]               │   │
│ │   15 thẻ / 4 đến hạn   10 câu / 80%     │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

User đóng drawer → vẫn ở trang 47.

#### Video Lesson → Tab Embedded + Standalone

VideoPlayerView giữ nguyên tab. Nút "↗" → `/training/lesson/:slug`.

#### Standalone Module → TrainingView route

`/training/module/:moduleSlug`

### 8.2 Routes

```javascript
// 2 routes (chapter dùng drawer, không cần route riêng)
{
  path: '/training/lesson/:lessonSlug',
  name: 'TrainingLesson',
  component: () => import('@/views/TrainingView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/training/module/:moduleSlug',
  name: 'TrainingModule',
  component: () => import('@/views/TrainingView.vue'),
  meta: { requiresAuth: true }
}
```

### 8.3 Component: `TrainingDrawer.vue`

Dùng trong `BookReaderView.vue`. Props: `{ bookSlug, chapterOrder }`.

```
TrainingDrawer
├── [loading]    Skeleton
├── [error]      "Không thể tải nội dung luyện tập"
│                 - 403 → "Bạn không có quyền luyện tập nội dung này"
│                 - Network/5xx → "Lỗi kết nối" + CTA: [Thử lại]
├── [no active activities]  "Nội dung luyện tập đang được cập nhật"
│                            CTA: [← Tiếp tục đọc]
├── [mode_select]  TrainingModeSelector
│   └── ActivityCard × N (chỉ hiện is_active=true)
└── [session]
    └── <dynamic: FlashcardSession | QuizSession>
        props: { activityId, embedded: true }
```

> **Error handling**: Dù `has_training_set=true` khi load chapter, race condition vẫn có thể xảy ra (admin vừa xóa TrainingSet, hoặc quyền user thay đổi). Drawer phải handle 403 và 404 từ `/api/training/chapter/...` một cách graceful.

**BookReaderView integration** — không gọi thêm API, dùng `has_training_set` từ chapter response:

```javascript
// BookReaderView.vue
const chapter = ref(null)
const showTrainingDrawer = ref(false)

// chapter đã chứa has_training_set từ BookChapterContentSerializer
const hasTraining = computed(() => chapter.value?.has_training_set ?? false)

// Toolbar: nút chỉ hiện khi hasTraining === true
// Khi click: showTrainingDrawer.value = true
// TrainingDrawer fetch full training data lazily khi lần đầu mở
```

### 8.4 View: `TrainingView.vue` — fix `goBack()`

> **Fix #4**: Dùng `window.history.state?.back` thay `window.history.length > 1`.
> **Fix #5**: Dùng `source_meta` từ API response cho fallback URL.

```javascript
// TrainingView.vue
const trainingSet = ref(null)

const goBack = () => {
  // window.history.state.back được Vue Router 4 (HTML5 mode) set khi navigate in-app
  // null nếu user mở trực tiếp URL hoặc từ external site
  if (window.history.state?.back) {
    router.back()
    return
  }

  // Fallback: dùng source_meta từ API response
  const meta = trainingSet.value?.source_meta
  if (!meta) { router.push({ name: 'Home' }); return }

  if (trainingSet.value.source_type === 'LESSON') {
    router.push({
      name: 'VideoPlayer',
      params: { slug: meta.course_slug, lessonSlug: meta.lesson_slug }
    })
  } else if (trainingSet.value.source_type === 'CHAPTER') {
    // Fallback khi user mở URL trực tiếp (không qua drawer)
    router.push({
      name: 'BookReader',
      params: { slug: meta.book_slug },
      query: { chapter: meta.chapter_order }
    })
  } else {
    // STANDALONE
    router.push({ name: 'Home' })
  }
}
```

**State machine:**
```
LOADING → MODE_SELECT → SESSION → SUMMARY/RESULTS → MODE_SELECT
              ↓ (no active activities)
           INACTIVE_STATE  [CTA: Quay lại bài học]
              ↓ (404 - training set chưa có)
           EMPTY_STATE     [CTA: Quay lại bài học]
```

> **Fix #9**: Phân biệt 2 trạng thái: `EMPTY_STATE` (không có TrainingSet) vs `INACTIVE_STATE` (có TrainingSet nhưng all activities inactive → "đang được cập nhật").

**Dynamic component mapping:**
```javascript
const ACTIVITY_COMPONENTS = {
  FLASHCARD: () => import('@/components/training/FlashcardSession.vue'),
  QUIZ:      () => import('@/components/training/QuizSession.vue'),
  // v2: MINDMAP, INFOGRAPHIC
}
```

### 8.5 Component: `TrainingModeSelector.vue`

Chỉ render activities có `is_active === true`:

```javascript
const activeActivities = computed(() =>
  props.activities.filter(a => a.is_active)
)
```

Props:
```typescript
{
  activities: TrainingActivity[],
  title: string
}
emits: ['select']
```

**ActivityCard config:**
```javascript
const ACTIVITY_CONFIG = {
  FLASHCARD: { icon: '🃏', color: 'indigo', label: 'Flashcard' },
  QUIZ:      { icon: '📝', color: 'emerald', label: 'Quiz' },
}
```

### 8.6 Components: `FlashcardSession.vue` / `QuizSession.vue`

Dùng trong cả 3 context: tab embedded, drawer embedded, full page.

Props: `{ activityId: string, embedded: boolean }`

Behavior theo `embedded`:

| | `embedded: false` (full page) | `embedded: true` (tab/drawer) |
|-|-------------------------------|-------------------------------|
| Header/navigation | Hiển thị — có nút Back/Exit | Ẩn — container tự quản lý navigation |
| Chiều cao | `min-h-screen` | 100% container (scroll trong drawer/tab) |
| Khi hoàn thành | Navigate sang SUMMARY route | Emit `@complete` cho parent xử lý |

---

## 9. Service Layer (Frontend)

```javascript
// services/training.service.js
export const trainingService = {
  getTrainingByLesson(lessonSlug) {
    return apiClient.get(`/api/training/lesson/${lessonSlug}/`)
  },
  getTrainingByChapter(bookSlug, chapterOrder) {
    return apiClient.get(`/api/training/chapter/${bookSlug}/${chapterOrder}/`)
  },
  getFlashcards(activityId, count = 10) {
    return apiClient.get(`/api/training/activities/${activityId}/flashcards/?count=${count}`)
  },
  getExam(activityId) {
    return apiClient.get(`/api/training/activities/${activityId}/exam/`)
  },
  // Submit: vẫn dùng exams.service.js (không đổi)
}
```

---

## 10. Migration Plan

### Phase 1 — Tạo models mới (4 migrations)

```
M1: Tạo TrainingSet  (không có source_type column — là @property)
M2: Tạo TrainingActivity
M3: Thêm activity (nullable FK) vào Flashcard
M4: Thêm activity (nullable OneToOne) vào Exam
```

### Phase 2 — Data migration (M5)

> **Fix #2**: Script tách rõ từng source type, không dùng f-string kwarg phức tạp.
> **Fix #2b**: Chỉ migrate PRACTICE exam, bỏ qua FINAL_EXAM.
> **Fix #2c**: Pre-migration assertion + xử lý rõ nhiều PRACTICE exam per source (không để "admin xử lý thủ công" mơ hồ).

```python
def migrate_to_training_activities(apps, schema_editor):
    TrainingSet    = apps.get_model('exams', 'TrainingSet')
    TrainingActivity = apps.get_model('exams', 'TrainingActivity')
    Flashcard      = apps.get_model('exams', 'Flashcard')
    Exam           = apps.get_model('exams', 'Exam')
    VideoLesson    = apps.get_model('videos', 'VideoLesson')
    PracticeModule = apps.get_model('exams', 'PracticeModule')

    # --- Pre-migration assertions ---
    # 1. Không có Flashcard có cả lesson lẫn module (data lỗi)
    dirty_flashcards = Flashcard.objects.filter(
        lesson__isnull=False, module__isnull=False
    ).count()
    if dirty_flashcards > 0:
        raise Exception(
            f"[M5] {dirty_flashcards} Flashcard có cả lesson lẫn module — "
            "cần cleanup trước khi chạy migration."
        )

    # 2. Kiểm tra lesson nào có nhiều PRACTICE exam → warn, không block
    # Dùng warnings.warn / print thay logging.getLogger vì trong migration context
    # Django logging chưa chắc được configure đúng level → output không đảm bảo hiển thị
    from collections import Counter
    import warnings

    lesson_exam_counts = Counter(
        Exam.objects.filter(lesson__isnull=False, exam_type='PRACTICE')
        .values_list('lesson_id', flat=True)
    )
    for lesson_id, count in lesson_exam_counts.items():
        if count > 1:
            warnings.warn(
                f"[M5] lesson_id={lesson_id} có {count} PRACTICE exam. "
                "Chỉ exam đầu tiên (pk nhỏ nhất) sẽ được migrate; "
                "các exam còn lại bị deactivated.",
                stacklevel=2,
            )

    def process_source(ts, source_filter):
        """Tạo TrainingActivity và gán content cho TrainingSet đã có."""
        flashcards = Flashcard.objects.filter(**source_filter)
        # Chỉ migrate PRACTICE exam, FINAL_EXAM giữ activity=null
        practice_exams = Exam.objects.filter(
            exam_type='PRACTICE', **source_filter
        ).order_by('pk')  # pk nhỏ nhất = exam tạo trước

        if flashcards.exists():
            fa = TrainingActivity.objects.create(
                training_set=ts, activity_type='FLASHCARD',
                title='Ôn luyện thẻ nhớ', order=0,
            )
            flashcards.update(activity=fa)

        if practice_exams.exists():
            qa = TrainingActivity.objects.create(
                training_set=ts, activity_type='QUIZ',
                title='Kiểm tra kiến thức', order=1,
            )
            exams_list = list(practice_exams)
            # Exam đầu tiên (pk nhỏ nhất) → được migrate vào activity
            first = exams_list[0]
            first.activity = qa
            first.save(update_fields=['activity'])
            # Các exam dư → deactivate để không bị orphan khi Phase 3 cleanup
            if len(exams_list) > 1:
                extra_ids = [e.pk for e in exams_list[1:]]
                Exam.objects.filter(pk__in=extra_ids).update(is_active=False)
                warnings.warn(
                    f"[M5] Deactivated {len(extra_ids)} PRACTICE exam(s): {extra_ids}",
                    stacklevel=2,
                )

    # --- VideoLesson ---
    lesson_ids = set(
        list(Flashcard.objects.filter(lesson__isnull=False)
             .values_list('lesson_id', flat=True)) +
        list(Exam.objects.filter(lesson__isnull=False, exam_type='PRACTICE')
             .values_list('lesson_id', flat=True))
    )
    for lesson_id in lesson_ids:
        lesson = VideoLesson.objects.get(pk=lesson_id)
        ts = TrainingSet.objects.create(title=lesson.title, lesson=lesson)
        process_source(ts, {'lesson_id': lesson_id})

    # --- PracticeModule ---
    module_ids = set(
        list(Flashcard.objects.filter(module__isnull=False)
             .values_list('module_id', flat=True)) +
        list(Exam.objects.filter(module__isnull=False, exam_type='PRACTICE')
             .values_list('module_id', flat=True))
    )
    for module_id in module_ids:
        module = PracticeModule.objects.get(pk=module_id)
        ts = TrainingSet.objects.create(title=module.title, module=module)
        process_source(ts, {'module_id': module_id})

    # Sau migration, verify:
    # Flashcard.objects.filter(activity__isnull=True).count()              → phải = 0
    # Exam.objects.filter(activity__isnull=True, exam_type='PRACTICE',
    #                      is_active=True).count()                          → phải = 0
```

**Rollback plan:**
M5 là data migration. Nếu thất bại: `migrate exams M4`. Columns `lesson`/`module` cũ vẫn còn cho đến Phase 3.

**Transaction guarantee:**
Django tự wrap mỗi migration trong `transaction.atomic()`. Nếu M5 fail giữa chừng, toàn bộ data changes rollback — DB quay về trạng thái sau M4, không có partial state. Migration M5 **không có side effect ngoài DB** (không ghi file, không gọi S3/API ngoài), nên transaction rollback là safe và clean.

### Phase 3 — Cleanup (sau khi verify production)

```
M6: Flashcard.activity → NOT NULL; xóa Flashcard.lesson, Flashcard.module
M7: Xóa Exam.lesson, Exam.module
```

> **Fix #10**: Verify cả Flashcard lẫn PRACTICE Exam trước khi chạy Phase 3:
> ```bash
> # Kiểm tra qua Django shell trước khi chạy M6:
> Flashcard.objects.filter(activity__isnull=True).count()         # phải = 0
> Exam.objects.filter(activity__isnull=True, exam_type='PRACTICE').count()  # phải = 0
> ```

---

## 11. File Changes Summary

### Backend

| File | Thay đổi |
|------|---------|
| `exams/models.py` | Thêm `TrainingSet` (source_type là @property), `TrainingActivity`; sửa `Flashcard`, `Exam` |
| `exams/serializers.py` | Thêm `TrainingActivitySerializer`, `TrainingSetSerializer` (có `source_meta`, `due_count` fix) |
| `exams/views_training.py` | Tạo mới — 6 views + helpers `_verify_training_set_access`, `_get_activity_or_403` |
| `exams/urls_training.py` | Tạo mới |
| `exams/admin.py` | Thêm `TrainingSetAdmin` (autocomplete_fields, public_id readonly trong inline) |
| `exams/migrations/` | M1–M7 (4 schema + 1 data + 2 cleanup) |
| `books/serializers.py` | Thêm `has_training_set` vào `BookChapterContentSerializer` |
| `books/views.py` | Thêm `select_related('training_set').prefetch_related('training_set__activities')` |
| `config/urls.py` | Include `exams.urls_training` |

### Frontend

| File | Thay đổi |
|------|---------|
| `views/TrainingView.vue` | Tạo mới — goBack() dùng `history.state.back` + `source_meta`; INACTIVE vs EMPTY state |
| `components/training/TrainingDrawer.vue` | Tạo mới — lazy load training data khi lần đầu mở |
| `components/training/TrainingModeSelector.vue` | Tạo mới — filter `is_active`, hai empty states |
| `components/training/ActivityCard.vue` | Tạo mới |
| `components/training/FlashcardSession.vue` | Tách từ `FlashcardTab.vue` |
| `components/training/QuizSession.vue` | Tách từ `QuizTab.vue` |
| `services/training.service.js` | Tạo mới |
| `router/index.js` | Thêm 2 routes |
| `views/BookReaderView.vue` | Dùng `chapter.has_training_set` để show/hide nút; tích hợp `TrainingDrawer` |
| `components/video/FlashcardTab.vue` | Refactor dùng `FlashcardSession` (embedded: true) |
| `components/video/QuizTab.vue` | Refactor dùng `QuizSession` (embedded: true) |

---

## 12. Extensibility Contract (v2)

Thêm `MINDMAP` — không sửa code hiện tại:

**Backend:**
1. Thêm `('MINDMAP', 'Mind Map')` vào `TrainingActivity.ACTIVITY_TYPE_CHOICES`
2. Tạo model `Mindmap(activity=OneToOneField(TrainingActivity))`
3. Thêm `MINDMAP` case vào `get_stats()` trong `TrainingActivitySerializer`
4. Thêm URL + View: `GET /api/training/activities/{id}/mindmap/`
5. Thêm `MINDMAP` vào `_get_activity_or_403` — logic access traverse không thay đổi

**Frontend:**
1. Thêm `MINDMAP` vào `ACTIVITY_COMPONENTS` map
2. Thêm `MINDMAP` vào `ACTIVITY_CONFIG`
3. Tạo `MindmapSession.vue`
4. Thêm `getMindmap(activityId)` vào `training.service.js`

---

## 13. Các quyết định đã chốt

| # | Câu hỏi | Quyết định | Lý do |
|---|---------|-----------|-------|
| source_type | Field DB hay @property? | `@property` | Tránh bất đồng bộ với FK |
| module on_delete | SET_NULL hay CASCADE? | `CASCADE` | Xóa module → xóa training liên quan, không để orphan |
| Activity access | Verify ở đâu? | Helper `_get_activity_or_403()` | Tập trung, tránh bypass qua UUID |
| due_count | Tính thế nào? | `total - not_due` | Đếm cả thẻ chưa từng review |
| goBack | `history.length` hay `history.state`? | `history.state.back` | Vue Router 4 set field này đáng tin hơn |
| double API call | Tách hay gộp? | Gộp vào chapter response (`has_training_set`) | Giảm 1 API call per chapter load |
| all activities inactive | Cùng empty state? | Tách `INACTIVE_STATE` riêng | "đang cập nhật" vs "chưa có nội dung" |
| FINAL_EXAM | Migrate vào TrainingActivity? | Không — giữ `activity=null` | FINAL_EXAM thuộc Book/Course level |
| UX book chapter | Full page hay drawer? | Drawer overlay | Giữ reading position |
| Mindmap/Infographic | Build ngay? | Không — v2 | Extensibility contract đã sẵn sàng |
| TrainingSet exactly-one source | `clean()` hay DB constraint? | Cả hai | `clean()` cho UX validation; `CheckConstraint` cho DB integrity |
| Endpoint cũ flashcard import | Deprecated hay xóa? | Xóa luôn | Endpoint chưa dùng — không cần backward compatibility |
| goBack CHAPTER case | Xử lý hay bỏ qua? | Xử lý — navigate về BookReader | User có thể mở URL trực tiếp, không qua drawer |
| Nhiều PRACTICE exam per source | Admin thủ công hay script? | Script deactivate exam dư + log warning | Đảm bảo Phase 3 verify pass mà không phụ thuộc admin action |
| ActivityType | List of tuples hay TextChoices? | `TextChoices` | Type-safety, tránh magic string khi compare |
| source_type / source_meta | `@property` hay `@cached_property`? | `@cached_property` | Pure computation từ FK IDs — cache tránh re-evaluate trong cùng request |
| Flashcard.image | CharField hay URLField? | `URLField` | Lưu S3/CDN URL — URLField có validation sẵn |
| get_stats N+1 | Tính trong serializer hay prefetch? | Prefetch trước trong view, serializer dùng cached data | Cố định số query bất kể số activities |
| _get_activity_or_403 N+1 | Lazy load hay select_related? | `select_related('training_set__lesson__course', ...)` | Tránh 3–4 extra queries per access check |
| logger trong migration | logging.getLogger hay warnings.warn? | `warnings.warn` | Đảm bảo output luôn hiện, không phụ thuộc Django logging config |
| due_count double-count | `.count()` hay `.distinct().count()`? | `.distinct().count()` | Safe khi FlashcardReview không có unique constraint |
