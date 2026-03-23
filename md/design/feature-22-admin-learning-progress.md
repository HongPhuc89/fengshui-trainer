# Feature 22 — Admin Learning Progress Dashboard

**Ngày:** 2026-03-23
**Idea doc:** `md/idea/video-watch-tracking.md`
**Scope:** Admin có thể xem ai đang xem video nào, đọc sách nào, tiến độ bao nhiêu bài/chapter

---

## Tóm tắt

Tất cả data đã có sẵn — không cần thêm model mới. Giải pháp là **Django Admin customization thuần túy** (Jazzmin), nhất quán với pattern hiện tại (`admin_stats.py`, custom `change_view`). Không cần Vue page riêng hay API endpoint mới.

---

## Phân tích

### Data hiện có

| Model | Fields hữu ích |
|---|---|
| `UserLessonProgress` | `user`, `lesson`, `progress_seconds`, `completed`, `last_watched` |
| `UserCourseProgress` | `user`, `course`, `last_lesson` |
| `UserChapterProgress` | `user`, `chapter`, `current_page`, `completed`, `last_read` |
| `UserVideoPurchase` | `user`, `video` (khoá đã mua) |
| `UserBookPurchase` | `user`, `book` (sách đã mua) |

### Gaps

1. `UserChapterProgressAdmin` chưa được `@admin.register` trong `books/admin.py`
2. Thiếu composite index cho query aggregate per user
3. Không có per-user progress summary trong User detail page

---

## Đề xuất giải pháp

### Database — Thêm index

```python
# videos/models.py — UserLessonProgress.Meta
indexes = [
    models.Index(fields=['user', 'last_watched'], name='idx_userlessonprogress_user_lastwatched'),
]

# books/models.py — UserChapterProgress.Meta
indexes = [
    models.Index(fields=['user', 'last_read'], name='idx_userchapterprogress_user_lastread'),
]
```

### Backend — Django Admin

#### 1. Nâng cấp `UserLessonProgressAdmin` (videos/admin.py)

```python
class CourseCompletionFilter(admin.SimpleListFilter):
    title = 'Mức hoàn thành'
    parameter_name = 'completion'

    def lookups(self, request, model_admin):
        return [
            ('completed', 'Đã hoàn thành'),
            ('in_progress', 'Đang học'),
            ('just_started', 'Mới bắt đầu (< 60s)'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'completed':
            return queryset.filter(completed=True)
        if self.value() == 'in_progress':
            return queryset.filter(completed=False, progress_seconds__gt=0)
        if self.value() == 'just_started':
            return queryset.filter(progress_seconds__lt=60)
        return queryset


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'course_title', 'lesson_title', 'progress_seconds', 'completed', 'last_watched')
    list_filter = ('completed', ('lesson__course', admin.RelatedFieldListFilter), CourseCompletionFilter)
    search_fields = ('user__username', 'user__phone_number', 'lesson__title', 'lesson__course__title')
    date_hierarchy = 'last_watched'
    raw_id_fields = ('user', 'lesson')
    ordering = ('-last_watched',)
    show_full_result_count = False  # tắt COUNT(*) chậm

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'lesson', 'lesson__course')

    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user_id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__username'

    def course_title(self, obj):
        url = reverse('admin:videos_videocourse_change', args=[obj.lesson.course_id])
        return format_html('<a href="{}">{}</a>', url, obj.lesson.course.title)
    course_title.short_description = 'Khoá học'
    course_title.admin_order_field = 'lesson__course__title'

    def lesson_title(self, obj):
        return f"#{obj.lesson.order} {obj.lesson.title}"
    lesson_title.short_description = 'Bài học'
    lesson_title.admin_order_field = 'lesson__order'
```

#### 2. Thêm `UserChapterProgressAdmin` mới (books/admin.py)

```python
@admin.register(UserChapterProgress)
class UserChapterProgressAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'book_title', 'chapter_title', 'current_page', 'completed', 'last_read')
    list_filter = ('completed', ('chapter__book', admin.RelatedFieldListFilter))
    search_fields = ('user__username', 'user__phone_number', 'chapter__title', 'chapter__book__title')
    date_hierarchy = 'last_read'
    raw_id_fields = ('user', 'chapter')
    ordering = ('-last_read',)
    show_full_result_count = False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'chapter', 'chapter__book')

    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user_id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)
    user_link.short_description = 'User'

    def book_title(self, obj):
        url = reverse('admin:books_book_change', args=[obj.chapter.book_id])
        return format_html('<a href="{}">{}</a>', url, obj.chapter.book.title)
    book_title.short_description = 'Sách'
    book_title.admin_order_field = 'chapter__book__title'

    def chapter_title(self, obj):
        return f"#{obj.chapter.order} {obj.chapter.title}"
    chapter_title.short_description = 'Chương'
```

#### 3. File mới: `users/admin_progress.py`

Dùng single `annotate` query để tránh N+1:

```python
# users/admin_progress.py

from django.db.models import Count, Q, Max


def get_user_video_summary(user_id):
    """Per-course progress cho một user — single query dùng annotate."""
    from videos.models import UserVideoPurchase

    return (
        UserVideoPurchase.objects
        .filter(user_id=user_id)
        .annotate(
            watched_count=Count(
                'video__lessons__user_progresses',
                filter=Q(video__lessons__user_progresses__user_id=user_id),
                distinct=True,
            ),
            completed_count=Count(
                'video__lessons__user_progresses',
                filter=Q(
                    video__lessons__user_progresses__user_id=user_id,
                    video__lessons__user_progresses__completed=True,
                ),
                distinct=True,
            ),
            last_watched=Max(
                'video__lessons__user_progresses__last_watched',
                filter=Q(video__lessons__user_progresses__user_id=user_id),
            ),
        )
        .select_related('video')
        .order_by('-last_watched')
    )


def get_user_book_summary(user_id):
    """Per-book progress cho một user — single query dùng annotate."""
    from books.models import UserBookPurchase

    return (
        UserBookPurchase.objects
        .filter(user_id=user_id)
        .annotate(
            read_count=Count(
                'book__chapters__user_progresses',
                filter=Q(book__chapters__user_progresses__user_id=user_id),
                distinct=True,
            ),
            completed_count=Count(
                'book__chapters__user_progresses',
                filter=Q(
                    book__chapters__user_progresses__user_id=user_id,
                    book__chapters__user_progresses__completed=True,
                ),
                distinct=True,
            ),
            last_read=Max(
                'book__chapters__user_progresses__last_read',
                filter=Q(book__chapters__user_progresses__user_id=user_id),
            ),
            total_chapters=Count('book__chapters', distinct=True),
        )
        .select_related('book')
        .order_by('-last_read')
    )
```

> **Lưu ý:** Cần verify tên `related_name` thực tế trong models (`user_progresses` có thể khác). Grep `UserLessonProgress` và `UserChapterProgress` để xác nhận `related_name`.

#### 4. Inject progress vào User detail page (users/admin.py)

```python
# Trong UserAdmin.change_view()
def change_view(self, request, object_id, form_url='', extra_context=None):
    extra_context = extra_context or {}
    # ... existing code ...

    from users.admin_progress import get_user_video_summary, get_user_book_summary
    pk = int(object_id)
    extra_context['video_progress'] = get_user_video_summary(pk)
    extra_context['book_progress'] = get_user_book_summary(pk)

    return super().change_view(request, object_id, form_url, extra_context)
```

#### 5. Template: `admin/users/user/change_form.html`

Thêm vào cuối file, trước `{% endblock %}`:

```html
{% if video_progress %}
<div class="module" style="margin-top: 20px;">
  <h2>Tiến độ Video</h2>
  <table>
    <thead>
      <tr>
        <th>Khoá học</th>
        <th>Đã xem / Tổng bài</th>
        <th>Đã hoàn thành</th>
        <th>Lần cuối xem</th>
      </tr>
    </thead>
    <tbody>
      {% for row in video_progress %}
      <tr>
        <td>{{ row.video.title }}</td>
        <td>{{ row.watched_count }} / {{ row.video.total_lessons }}</td>
        <td>{{ row.completed_count }}</td>
        <td>{{ row.last_watched|date:"d/m/Y H:i"|default:"—" }}</td>
      </tr>
      {% empty %}
      <tr><td colspan="4">Chưa có tiến độ nào.</td></tr>
      {% endfor %}
    </tbody>
  </table>
</div>
{% endif %}

{% if book_progress %}
<div class="module" style="margin-top: 20px;">
  <h2>Tiến độ Sách</h2>
  <table>
    <thead>
      <tr>
        <th>Sách</th>
        <th>Đã đọc / Tổng chương</th>
        <th>Đã hoàn thành</th>
        <th>Lần cuối đọc</th>
      </tr>
    </thead>
    <tbody>
      {% for row in book_progress %}
      <tr>
        <td>{{ row.book.title }}</td>
        <td>{{ row.read_count }} / {{ row.total_chapters }}</td>
        <td>{{ row.completed_count }}</td>
        <td>{{ row.last_read|date:"d/m/Y H:i"|default:"—" }}</td>
      </tr>
      {% empty %}
      <tr><td colspan="4">Chưa có tiến độ nào.</td></tr>
      {% endfor %}
    </tbody>
  </table>
</div>
{% endif %}
```

#### 6. Drill-down từ Course/Book → "Ai đang học"

```python
# videos/admin.py — trong VideoCourseAdmin.list_display
def learner_progress_link(self, obj):
    url = reverse('admin:videos_userlessonprogress_changelist') + f'?lesson__course__id__exact={obj.pk}'
    return format_html('<a href="{}">Xem tiến độ học viên</a>', url)
learner_progress_link.short_description = 'Tiến độ'

# books/admin.py — trong BookAdmin.list_display
def reader_progress_link(self, obj):
    url = reverse('admin:books_userchapterprogress_changelist') + f'?chapter__book__id__exact={obj.pk}'
    return format_html('<a href="{}">Xem tiến độ đọc sách</a>', url)
reader_progress_link.short_description = 'Tiến độ'
```

---

## Trade-off & lưu ý

### N+1 Queries

`get_user_video_summary` và `get_user_book_summary` dùng single `annotate` query — không có N+1. Cần verify bằng `django-debug-toolbar` sau khi implement.

### Performance với nhiều users

- `show_full_result_count = False` đã thêm để tắt `COUNT(*)` chậm trên changelist
- Index `(user, last_watched)` và `(user, last_read)` giúp aggregate queries nhanh

### Security

- Tất cả admin views protected bởi `is_staff=True` (Django Admin mặc định)
- Progress data là **read-only** — không có action edit

### Cần verify trước khi implement

- `related_name` thực tế của `UserLessonProgress` → `VideoLesson` (grep `related_name` trong `videos/models.py`)
- `related_name` thực tế của `UserChapterProgress` → `BookChapter` (grep trong `books/models.py`)
- Tên field `video` trong `UserVideoPurchase` (có thể là `course` hoặc `video`)

---

## Thứ tự implement

| # | File | Việc làm | Effort |
|---|---|---|---|
| 1 | `src/backend/videos/admin.py` | Nâng cấp `UserLessonProgressAdmin` + `CourseCompletionFilter` | S |
| 2 | `src/backend/books/admin.py` | Thêm `UserChapterProgressAdmin` | S |
| 3 | `src/backend/users/admin_progress.py` | Tạo file mới với 2 helper functions | S |
| 4 | `src/backend/users/admin.py` | Inject `video_progress` + `book_progress` vào `UserAdmin.change_view()` | XS |
| 5 | `src/backend/templates/admin/users/user/change_form.html` | Thêm 2 bảng tiến độ | S |
| 6 | `src/backend/videos/admin.py` | `learner_progress_link` trong `VideoCourseAdmin` | XS |
| 7 | `src/backend/books/admin.py` | `reader_progress_link` trong `BookAdmin` | XS |
| 8 | Migration | 2 index mới cho `UserLessonProgress` và `UserChapterProgress` | XS |

**Không cần:** model mới, API endpoint mới, Vue component mới, Django URL mới.

---

## Out of scope (V2+)

- Heatmap chi tiết từng giây (cần `VideoWatchSegment` event log)
- Re-watch tracking (cần `watch_count` field)
- Export CSV / PDF report
- Email automation dựa trên inactivity (cần Celery)
- Learner-facing progress summary (trang Profile Vue.js)
