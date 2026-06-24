# Feature 33 — Private Content Visibility

## Tóm tắt

Cho phép admin đánh dấu một số `Book` hoặc `VideoCourse` là **private** (`is_public=False`). Nội dung private chỉ xuất hiện trong danh sách và detail khi user đã mua hoặc là VIP. Mọi thứ khác giữ nguyên hành vi hiện tại.

**Stack liên quan:** Django (backend) — không cần thay đổi frontend.

---

## Phân tích

**Yêu cầu:**
- Một số sách/video chỉ user sở hữu mới được thấy trong list và detail.
- User không có quyền: list không trả về item đó, detail trả 404.
- VIP bypass mọi kiểm tra (giống pattern hiện tại).
- Admin có thể bật/tắt qua Django admin.

**Các tầng liên quan:**
- ✅ Database (PostgreSQL) — thêm field mới vào 2 model
- ✅ Backend (Django) — filter list + guard detail
- ❌ Frontend (Vue) — không cần thay đổi

**Access control hiện tại (để đối chiếu):**

| Scope | Logic hiện tại |
|---|---|
| `BookListView` | `AllowAny` — trả tất cả published |
| `BookDetailView` | `AllowAny` — trả `has_purchased` field |
| `BookChapterDetailView` | `IsAuthenticated` + `_can_access_chapter()` |
| `VideoCourseListView` | `AllowAny` — trả tất cả published |
| `VideoCourseDetailView` | `AllowAny` — trả `has_purchased` field |
| `VideoLessonDetailView` | `IsAuthenticated` + `_can_access_lesson()` |

---

## Đề xuất giải pháp

### Database (PostgreSQL)

Thêm `is_public = BooleanField(default=True)` vào hai model:

```python
# books/models.py — class Book
is_public = models.BooleanField(
    default=True,
    help_text="If False, only owners (purchased or VIP) can see this book in lists and detail.",
)

# videos/models.py — class VideoCourse
is_public = models.BooleanField(
    default=True,
    help_text="If False, only owners (purchased or VIP) can see this course in lists and detail.",
)
```

**Lý do chọn `is_public=True` làm default:**
- Tất cả content hiện tại đều public → migration không ảnh hưởng data cũ.
- Rõ nghĩa hơn `is_private=False` (double negative).

**Migrations:**
- `books/migrations/0013_book_is_public.py`
- `videos/migrations/0011_videocourse_is_public.py`

---

### Backend (Django)

#### 1. Helper chung — `_can_access_content(user, is_public, purchase_qs)`

Để tránh lặp lại logic access check ở nhiều view, định nghĩa helper inline:

```python
def _user_can_see(user, is_public):
    """True if user is allowed to see a private content item."""
    if is_public:
        return True
    if not user or not user.is_authenticated:
        return False
    if user.user_type == 'VIP':
        return True
    return False  # caller phải kiểm tra purchase riêng
```

Lý do không dùng helper chung duy nhất: purchase lookup cần model khác nhau (Book vs VideoCourse), tốt hơn để inline trong từng view.

---

#### 2. `BookListView.get_queryset()` — `books/views.py`

```python
def get_queryset(self):
    today = timezone.now().date()
    qs = Book.objects.filter(published_date__lte=today).select_related('category')

    # --- private content filter ---
    user = self.request.user
    if user.is_authenticated and user.user_type == 'VIP':
        pass  # VIP thấy tất cả
    elif user.is_authenticated:
        owned_ids = UserBookPurchase.objects.filter(user=user).values_list('book_id', flat=True)
        qs = qs.filter(models.Q(is_public=True) | models.Q(id__in=owned_ids))
    else:
        qs = qs.filter(is_public=True)
    # --- end private content filter ---

    # ...existing filters (category, is_new_release, is_free, search, exclude_read)
    return qs.order_by('-published_date')
```

**Performance note:** `owned_ids` là subquery nhỏ (user thường sở hữu ít content), không cần annotation thêm. Cả hai queryset đều được evaluate bởi DB — không có Python-level filtering.

---

#### 3. `BookDetailView` — `books/views.py`

Override `get_object()` để trả 404 thay vì 403 (không lộ sự tồn tại):

```python
class BookDetailView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'

    def get_queryset(self):
        today = timezone.now().date()
        return Book.objects.filter(published_date__lte=today).select_related('category').prefetch_related('chapters')

    def get_object(self):
        obj = super().get_object()
        if not obj.is_public:
            user = self.request.user
            allowed = False
            if user.is_authenticated:
                if user.user_type == 'VIP':
                    allowed = True
                elif UserBookPurchase.objects.filter(user=user, book=obj).exists():
                    allowed = True
            if not allowed:
                raise Http404
        return obj

    def get_serializer_class(self):
        if self.request.user.is_authenticated:
            return BookDetailWithPurchaseSerializer
        return BookDetailSerializer
```

**Lý do dùng 404 thay vì 403:** Trả 403 xác nhận item tồn tại → cho biết content bị ẩn → user có thể đoán được URL. 404 ẩn hoàn toàn sự tồn tại.

---

#### 4. `VideoCourseListView.get_queryset()` — `videos/views.py`

Logic tương tự `BookListView`:

```python
def get_queryset(self):
    today = timezone.now().date()
    qs = VideoCourse.objects.filter(published_date__lte=today).select_related('category')

    # --- private content filter ---
    user = self.request.user
    if user.is_authenticated and user.user_type == 'VIP':
        pass  # VIP thấy tất cả
    elif user.is_authenticated:
        owned_ids = UserVideoPurchase.objects.filter(user=user).values_list('video_id', flat=True)
        qs = qs.filter(models.Q(is_public=True) | models.Q(id__in=owned_ids))
    else:
        qs = qs.filter(is_public=True)
    # --- end private content filter ---

    # ...existing filters (category, level, search, exclude_watched)
    return qs.order_by('-created_at')
```

---

#### 5. `VideoCourseDetailView` — `videos/views.py`

```python
class VideoCourseDetailView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'

    def get_queryset(self):
        today = timezone.now().date()
        return VideoCourse.objects.filter(published_date__lte=today).select_related('category').prefetch_related('lessons')

    def get_object(self):
        obj = super().get_object()
        if not obj.is_public:
            user = self.request.user
            allowed = False
            if user.is_authenticated:
                if user.user_type == 'VIP':
                    allowed = True
                elif UserVideoPurchase.objects.filter(user=user, video=obj).exists():
                    allowed = True
            if not allowed:
                raise Http404
        return obj

    def get_serializer_class(self):
        if self.request.user.is_authenticated:
            return VideoCourseDetailWithPurchaseSerializer
        return VideoCourseDetailSerializer
```

Cần thêm `Http404` vào imports ở `videos/views.py` (đã có `Http404` trong file — dòng 2, không cần thêm).

---

#### 6. Import cần thêm trong `books/views.py`

```python
from django.db import models as db_models  # để dùng db_models.Q
```

Hoặc đơn giản hơn: import `Q` từ `django.db.models`:

```python
from django.db.models import OuterRef, Subquery, Q  # thêm Q vào import hiện tại
```

---

### Admin Panel

#### `books/admin.py` — `BookAdmin`

```python
@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'slug', 'category', 'price_lt', 'is_free',
        'is_public', 'is_new_release', 'published_date', 'reader_progress_link'
    )
    list_filter = ('is_free', 'is_public', 'is_new_release', 'category')
    # readonly_fields, inlines, etc. giữ nguyên
```

Thêm `is_public` vào `list_display` và `list_filter`. Không cần thêm vào `fieldsets` (Django admin tự render field chưa có trong fieldsets ở cuối form, hoặc thêm vào section phù hợp).

Thêm vào `fieldsets` tường minh (trong section đầu hoặc tạo section mới):

```python
fieldsets = (
    (None, {
        'fields': ('title', 'slug', 'author', 'category', 'cover_image', 'small_cover_preview'),
    }),
    ('Visibility & Pricing', {
        'fields': ('is_public', 'is_free', 'is_new_release', 'price_lt', 'published_date'),
    }),
    # ...
)
```

> **Lưu ý:** `BookAdmin` hiện tại không có `fieldsets` được khai báo tường minh — Django auto-renders tất cả fields. Chỉ cần thêm `is_public` vào `list_display` và `list_filter` là đủ để admin có thể thấy và filter.

#### `videos/admin.py` — `VideoCourseAdmin`

```python
@admin.register(VideoCourse)
class VideoCourseAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'slug', 'category', 'price_lt', 'is_public',
        'level', 'total_lessons', 'published_date', 'learner_progress_link'
    )
    list_filter = ('is_free', 'is_public', 'level', 'category')
```

Thêm `is_public` vào `list_display` và `list_filter`. `VideoCourseAdmin` cũng không có explicit `fieldsets`, nên tương tự Books.

---

### Frontend — Không thay đổi

- `BooksView.vue`, `BookDetailView.vue`, `VideosView.vue`, `VideoDetailView.vue` không cần sửa.
- Backend filter ra → UI nhận array nhỏ hơn → hiển thị bình thường.
- Khi detail trả 404 → Vue Router's error handling hoặc `404 Not Found` page hiện tại xử lý.
- Cache invalidation sau purchase (`clearApiCache()`) đã xóa toàn bộ cache → lần request tiếp theo sẽ lấy list mới đã bao gồm item vừa mua.

---

## Trade-off & Lưu ý

| Điểm | Phân tích |
|---|---|
| **VIP luôn thấy tất cả** | Consistent với pattern hiện tại (`_can_access_chapter`, `_can_access_lesson`). VIP subscription = full access. |
| **404 cho detail** | Ẩn sự tồn tại của private content. Trade-off: nếu admin muốn cho user xem trang giới thiệu để mua, cần quay lại dùng 403 + frontend xử lý. Hiện tại chọn 404 theo yêu cầu "không thấy". |
| **Performance list** | `UserBookPurchase.filter(user=user).values_list(...)` là query phụ nhỏ (user hiếm khi có >100 purchases). Acceptable cho MVP. Nếu cần scale: thêm index trên `(user_id, book_id)` — đã có via `unique_together`. |
| **`is_free` vs `is_public`** | `is_free=True` vẫn bị ẩn nếu `is_public=False`. Admin có thể set cả hai — `is_free` điều khiển price, `is_public` điều khiển visibility. Không conflict. |
| **`exclude_read` filter** | Nếu user đã đọc 1 private book (đã mua), book đó vẫn có trong queryset của user → `exclude_read` hoạt động đúng. |
| **RecentlyReadBooksView / RecentlyWatchedCoursesView** | Các view này query trực tiếp qua `UserChapterProgress` / `UserCourseProgress` — chỉ trả data của chính user đó → không cần filter thêm. |

---

## Bước Tiếp Theo (Implementation Order)

1. **DB & Migrations**
   - Thêm `is_public` vào `Book` model (`books/models.py`)
   - Thêm `is_public` vào `VideoCourse` model (`videos/models.py`)
   - Tạo migration: `0013_book_is_public.py`
   - Tạo migration: `0011_videocourse_is_public.py`

2. **Backend Views**
   - `books/views.py`: thêm `Q` vào imports, update `BookListView.get_queryset()`, thêm `get_object()` vào `BookDetailView`
   - `videos/views.py`: update `VideoCourseListView.get_queryset()`, thêm `get_object()` vào `VideoCourseDetailView`

3. **Admin**
   - `books/admin.py`: thêm `is_public` vào `BookAdmin.list_display` + `list_filter`
   - `videos/admin.py`: thêm `is_public` vào `VideoCourseAdmin.list_display` + `list_filter`

4. **Run migrations** trong docker-compose:
   ```bash
   docker-compose -f docker/docker-compose.yml exec web python manage.py migrate
   ```

---

## Verification

1. Vào Django admin → set `is_public=False` cho 1 sách và 1 video course.
2. Unauthenticated request:
   - `GET /api/books/` → sách private không xuất hiện ✅
   - `GET /api/books/{slug}/` → 404 ✅
   - `GET /api/videos/` → video private không xuất hiện ✅
   - `GET /api/videos/{slug}/` → 404 ✅
3. User thường (chưa mua):
   - `GET /api/books/` → private không xuất hiện ✅
   - `GET /api/books/{slug}/` → 404 ✅
4. User đã mua:
   - `GET /api/books/` → private xuất hiện ✅
   - `GET /api/books/{slug}/` → 200 với `has_purchased: true` ✅
5. VIP user:
   - `GET /api/books/` → private xuất hiện ✅
   - `GET /api/books/{slug}/` → 200 ✅
6. Tương tự cho videos.
7. Frontend: vào trang Books → item private không thấy. Vào trang Books sau khi mua → item xuất hiện.
