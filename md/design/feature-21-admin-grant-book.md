# Feature 21 — Quản lý & Kích hoạt Nội dung cho User (Admin)

## Tổng quan

Admin có thể:
1. **Xem danh sách user đã sở hữu** từng cuốn sách / bộ video
2. **Kích hoạt nội dung** (sách hoặc video) cho một user cụ thể — 1 thao tác, không cần qua ví

Đây là thao tác **"cấp phép trực tiếp"** (admin grant) — không trừ LT trong ví user, tạo đầy đủ audit log và thông báo.

---

## Phạm vi

- **Backend only** — Django Admin UI
- Hai entry point song song:
  - **Từ nội dung**: Book detail / VideoCourse detail → xem danh sách user sở hữu → kích hoạt thêm
  - **Từ user**: User detail → xem danh sách sách + video đang sở hữu → kích hoạt thêm nội dung
- Không có thay đổi API public, không có thay đổi Vue frontend

---

## Hiện trạng

| Model | Admin hiện tại | Thiếu gì |
|---|---|---|
| `UserBookPurchase` | `UserBookPurchaseAdmin` — list_display cơ bản, raw_id_fields | Không có inline trong BookAdmin, không có nút kích hoạt |
| `UserVideoPurchase` | `UserVideoPurchaseAdmin` — list_display cơ bản | Không có inline trong VideoCourseAdmin, không có nút kích hoạt |
| `UserAdmin` | Có sẵn, dùng `BaseUserAdmin` | Không có inline nội dung đã sở hữu, không có nút kích hoạt |
| `AdminAuditLog` | Có sẵn | Chưa dùng cho hành động grant |

---

## Thiết kế giải pháp

### A. Xem danh sách sở hữu — dùng Inline

**Entry point từ nội dung:** Thêm `UserBookPurchaseInline` vào `BookAdmin` và `UserVideoPurchaseInline` vào `VideoCourseAdmin`.

```
[BookAdmin — Trang chi tiết sách]
  ├── ... (fields hiện tại)
  ├── [Inline] Người dùng sở hữu
  │     user | pdf_ready | ngày kích hoạt
  │     user | pdf_ready | ngày kích hoạt
  └── [Form] Kích hoạt cho user mới → nhập user ID → submit
```

**Entry point từ user:** Thêm 2 inline vào `UserAdmin` — một cho sách, một cho video.

```
[UserAdmin — Trang chi tiết user]
  ├── ... (fields hiện tại)
  ├── [Inline] Sách đã sở hữu
  │     sách | pdf_ready | ngày kích hoạt
  ├── [Form] Kích hoạt sách mới → nhập book ID → submit
  ├── [Inline] Khoá học đã sở hữu
  │     khoá học | ngày kích hoạt
  └── [Form] Kích hoạt khoá học mới → nhập course ID → submit
```

### B. Kích hoạt nội dung — custom admin view

**Từ nội dung (Book/VideoCourse → user):**
```
POST /admin/books/book/<pk>/grant-access/          # nhận user_id
POST /admin/videos/videocourse/<pk>/grant-access/  # nhận user_id
```

**Từ user (User → nội dung):**
```
POST /admin/users/user/<pk>/grant-book/    # nhận book_id
POST /admin/users/user/<pk>/grant-video/   # nhận video_id
```

Flow xử lý (chung cho cả 4 endpoint):
```
Admin submit form
    │
    ├─ Kiểm tra đối tượng tồn tại → báo lỗi nếu không
    ├─ Kiểm tra đã sở hữu chưa → báo lỗi nếu có
    │
    └─ atomic():
          Tạo UserBookPurchase / UserVideoPurchase
          Tạo AdminAuditLog (category='CONTENT')
          Tạo Notification cho user
          → success message
```

**Không trừ LT** — đây là admin grant, không phải purchase thông thường.

---

## Chi tiết kỹ thuật

### 1. `books/admin.py` — Thêm inline + grant view vào `BookAdmin`

#### Inline

```python
class UserBookPurchaseInline(admin.TabularInline):
    model = UserBookPurchase
    extra = 0
    fields = ('user', 'pdf_ready', 'created_at')
    readonly_fields = ('pdf_ready', 'created_at')
    raw_id_fields = ('user',)
    can_delete = False
    verbose_name = 'Người dùng sở hữu'
    verbose_name_plural = 'Người dùng sở hữu'

    def has_add_permission(self, request, obj=None):
        return False  # Dùng custom view để thêm, không dùng inline add
```

#### URL + View

```python
# Trong BookAdmin.get_urls():
path('<int:pk>/grant-access/', self.admin_site.admin_view(self.grant_access_view), name='books_book_grant_access'),
```

```python
def grant_access_view(self, request, pk):
    from django.db import transaction
    from users.models import User, AdminAuditLog

    book = get_object_or_404(Book, pk=pk)

    if request.method != 'POST':
        return redirect(reverse('admin:books_book_change', args=[pk]))

    user_id = request.POST.get('user_id')
    if not user_id:
        self.message_user(request, 'Vui lòng chọn người dùng.', level='error')
        return redirect(reverse('admin:books_book_change', args=[pk]))

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        self.message_user(request, 'Không tìm thấy người dùng.', level='error')
        return redirect(reverse('admin:books_book_change', args=[pk]))

    if UserBookPurchase.objects.filter(user=user, book=book).exists():
        self.message_user(request, f'Người dùng "{user}" đã sở hữu sách này.', level='error')
        return redirect(reverse('admin:books_book_change', args=[pk]))

    with transaction.atomic():
        UserBookPurchase.objects.create(user=user, book=book)
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=user,
            action_category='CONTENT',
            action_detail=f'Admin kích hoạt sách "{book.title}" cho "{user}"',
            change_log={'book_id': str(book.public_id), 'book_title': book.title},
            ip_address=get_client_ip(request),
        )
        try:
            from notifications.models import Notification
            Notification.objects.create(
                user=user,
                title='Sách đã được kích hoạt',
                body=f'Sách "{book.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 📖',
                notification_type='PURCHASE',
                related_object_type='book',
                related_object_id=str(book.public_id),
            )
        except Exception:
            pass

    self.message_user(request, f'✅ Đã kích hoạt sách "{book.title}" cho {user}.')
    return redirect(reverse('admin:books_book_change', args=[pk]))
```

#### Template — cập nhật `admin/books/book/change_form.html`

Thêm section "Kích hoạt cho user mới" bên dưới inline:

```html
<div style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
  <h3 style="margin-top: 0">Kích hoạt cho người dùng mới</h3>
  <form method="post" action="{% url 'admin:books_book_grant_access' original.pk %}">
    {% csrf_token %}
    <label for="grant_user_id">ID người dùng:</label>
    <input type="number" name="user_id" id="grant_user_id" placeholder="Nhập user ID" required
           style="margin: 0 8px; padding: 4px 8px;">
    <button type="submit" class="button default">Kích hoạt</button>
    <span style="margin-left: 12px; color: #888; font-size: 12px;">
      Tra cứu ID tại: <a href="{% url 'admin:users_user_changelist' %}" target="_blank">Danh sách người dùng</a>
    </span>
  </form>
</div>
```

---

### 2. `videos/admin.py` — Thêm inline + grant view vào `VideoCourseAdmin`

Tương tự `BookAdmin`, thay `Book` → `VideoCourse`, `UserBookPurchase` → `UserVideoPurchase`.

#### Inline

```python
class UserVideoPurchaseInline(admin.TabularInline):
    model = UserVideoPurchase
    extra = 0
    fields = ('user', 'created_at')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    can_delete = False
    verbose_name = 'Người dùng sở hữu'
    verbose_name_plural = 'Người dùng sở hữu'

    def has_add_permission(self, request, obj=None):
        return False
```

#### URL + View

```python
# Trong VideoCourseAdmin.get_urls():
path('<int:pk>/grant-access/', self.admin_site.admin_view(self.grant_access_view), name='videos_videocourse_grant_access'),
```

Logic grant_access_view tương tự BookAdmin:
- Tạo `UserVideoPurchase`
- Tạo `AdminAuditLog` category `CONTENT`
- Gửi `Notification`: `"Khoá học "{video.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 🎬"`

---

### 3. `users/admin.py` — Thêm inline + grant views vào `UserAdmin`

#### Inlines

```python
class OwnedBookInline(admin.TabularInline):
    model = UserBookPurchase
    extra = 0
    fields = ('book', 'pdf_ready', 'created_at')
    readonly_fields = ('book', 'pdf_ready', 'created_at')
    can_delete = False
    verbose_name = 'Sách đã sở hữu'
    verbose_name_plural = 'Sách đã sở hữu'

    def has_add_permission(self, request, obj=None):
        return False


class OwnedVideoInline(admin.TabularInline):
    model = UserVideoPurchase
    extra = 0
    fields = ('video', 'created_at')
    readonly_fields = ('video', 'created_at')
    can_delete = False
    verbose_name = 'Khoá học đã sở hữu'
    verbose_name_plural = 'Khoá học đã sở hữu'

    def has_add_permission(self, request, obj=None):
        return False
```

Thêm vào `UserAdmin`:
```python
inlines = [OwnedBookInline, OwnedVideoInline]
change_form_template = 'admin/users/user/change_form.html'
```

#### URLs + Views

```python
def get_urls(self):
    urls = super().get_urls()
    custom = [
        path('<int:pk>/grant-book/',  self.admin_site.admin_view(self.grant_book_view),  name='users_user_grant_book'),
        path('<int:pk>/grant-video/', self.admin_site.admin_view(self.grant_video_view), name='users_user_grant_video'),
    ]
    return custom + urls
```

```python
def grant_book_view(self, request, pk):
    from django.db import transaction
    from books.models import Book, UserBookPurchase
    from .models import AdminAuditLog
    from notifications.models import Notification

    user = get_object_or_404(User, pk=pk)

    if request.method != 'POST':
        return redirect(reverse('admin:users_user_change', args=[pk]))

    book_id = request.POST.get('book_id')
    if not book_id:
        self.message_user(request, 'Vui lòng nhập ID sách.', level='error')
        return redirect(reverse('admin:users_user_change', args=[pk]))

    try:
        book = Book.objects.get(pk=book_id)
    except Book.DoesNotExist:
        self.message_user(request, 'Không tìm thấy sách.', level='error')
        return redirect(reverse('admin:users_user_change', args=[pk]))

    if UserBookPurchase.objects.filter(user=user, book=book).exists():
        self.message_user(request, f'Người dùng đã sở hữu sách "{book.title}".', level='error')
        return redirect(reverse('admin:users_user_change', args=[pk]))

    with transaction.atomic():
        UserBookPurchase.objects.create(user=user, book=book)
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=user,
            action_category='CONTENT',
            action_detail=f'Admin kích hoạt sách "{book.title}" cho "{user}"',
            change_log={'book_id': str(book.public_id), 'book_title': book.title},
            ip_address=self._get_client_ip(request),
        )
        try:
            Notification.objects.create(
                user=user,
                title='Sách đã được kích hoạt',
                body=f'Sách "{book.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 📖',
                notification_type='PURCHASE',
                related_object_type='book',
                related_object_id=str(book.public_id),
            )
        except Exception:
            pass

    self.message_user(request, f'✅ Đã kích hoạt sách "{book.title}" cho {user}.')
    return redirect(reverse('admin:users_user_change', args=[pk]))
```

`grant_video_view` tương tự, thay `Book` → `VideoCourse`, `UserBookPurchase` → `UserVideoPurchase`.

#### Template — `admin/users/user/change_form.html` (tạo mới)

```html
{% extends "admin/change_form.html" %}
{% block after_related_objects %}

<!-- Kích hoạt sách mới -->
<div style="margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
  <h3 style="margin-top: 0">Kích hoạt sách cho người dùng này</h3>
  <form method="post" action="{% url 'admin:users_user_grant_book' original.pk %}">
    {% csrf_token %}
    <label>ID sách:</label>
    <input type="number" name="book_id" placeholder="Nhập book ID" required style="margin: 0 8px; padding: 4px 8px;">
    <button type="submit" class="button default">Kích hoạt</button>
    <span style="margin-left: 12px; color: #888; font-size: 12px;">
      Tra cứu tại: <a href="{% url 'admin:books_book_changelist' %}" target="_blank">Danh sách sách</a>
    </span>
  </form>
</div>

<!-- Kích hoạt khoá học mới -->
<div style="margin-top: 12px; padding: 12px; border: 1px solid #ddd; border-radius: 4px;">
  <h3 style="margin-top: 0">Kích hoạt khoá học cho người dùng này</h3>
  <form method="post" action="{% url 'admin:users_user_grant_video' original.pk %}">
    {% csrf_token %}
    <label>ID khoá học:</label>
    <input type="number" name="video_id" placeholder="Nhập course ID" required style="margin: 0 8px; padding: 4px 8px;">
    <button type="submit" class="button default">Kích hoạt</button>
    <span style="margin-left: 12px; color: #888; font-size: 12px;">
      Tra cứu tại: <a href="{% url 'admin:videos_videocourse_changelist' %}" target="_blank">Danh sách khoá học</a>
    </span>
  </form>
</div>

{% endblock %}
```

---

## Thông báo gửi đến user

| Trường hợp | `title` | `body` |
|---|---|---|
| Kích hoạt sách | `Sách đã được kích hoạt` | `Sách "{book.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 📖` |
| Kích hoạt video | `Khoá học đã được kích hoạt` | `Khoá học "{video.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 🎬` |

---

## Validation & Edge Cases

| Tình huống | Xử lý |
|---|---|
| User đã sở hữu nội dung | Báo lỗi: `"Người dùng X đã sở hữu [sách/khoá học] này."` |
| User ID không tồn tại | Báo lỗi: `"Không tìm thấy người dùng."` |
| User ID rỗng | Báo lỗi: `"Vui lòng chọn người dùng."` |
| Concurrent grant | `UserBookPurchase` có unique constraint `[user, book]` — DB reject nếu race condition |

---

## Audit Trail

Mỗi lần kích hoạt tạo ra:
- 1 `UserBookPurchase` hoặc `UserVideoPurchase`
- 1 `AdminAuditLog` với `action_category='CONTENT'`
- 1 `Notification` gửi đến user

**Không tạo** `WalletTransaction` — đây là admin grant, không phải mua bằng LT.

---

## Files cần thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/books/admin.py` | Thêm `UserBookPurchaseInline` + `grant_access_view` + URL + cập nhật `BookAdmin` |
| `src/backend/videos/admin.py` | Thêm `UserVideoPurchaseInline` + `grant_access_view` + URL + cập nhật `VideoCourseAdmin` |
| `src/backend/users/admin.py` | Thêm `OwnedBookInline` + `OwnedVideoInline` + `grant_book_view` + `grant_video_view` + URLs + cập nhật `UserAdmin` |
| `src/backend/templates/admin/books/book/change_form.html` | Thêm form kích hoạt user mới |
| `src/backend/templates/admin/videos/videocourse/change_form.html` | Thêm form kích hoạt user mới (tạo mới nếu chưa có) |
| `src/backend/templates/admin/users/user/change_form.html` | Tạo mới — extend base, thêm 2 form kích hoạt sách + video |

**Không cần migration** — không thêm model mới.

---

## Không nằm trong scope

- Thu hồi quyền truy cập (revoke) — cần thảo luận thêm về nghiệp vụ
- Kích hoạt hàng loạt (bulk grant) cho nhiều user cùng lúc
- Tích hợp ví LT vào flow này (đây là grant, không phải purchase)
