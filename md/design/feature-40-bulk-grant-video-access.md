# Feature 40 — Bulk Grant Video Access (Admin)

## Tổng quan

Mở rộng chức năng "Kích hoạt cho người dùng mới" đã có trên `VideoCourseAdmin` (Feature 21) từ **nhập 1 user ID thủ công** sang **chọn nhiều user cùng lúc qua dropdown multi-select**, danh sách chỉ hiện user **chưa sở hữu** và **không phải VIP** (VIP đã mặc định full access, grant thêm là record thừa).

## Phạm vi

- Backend only — Django Admin UI, `VideoCourseAdmin` (`src/backend/videos/admin.py`)
- Không đổi API public, không đổi Vue frontend, không đổi model/migration
- Tái sử dụng tối đa logic đã có ở `grant_access_view` (Feature 21), chỉ mở rộng từ single-user sang multi-user

## Hiện trạng (Feature 21 đã live)

- `VideoCourseAdmin.grant_access_view` (`videos/admin.py:118-177`): nhận `user_id` qua AJAX POST, validate tồn tại + chưa sở hữu, tạo `UserVideoPurchase` + `AdminAuditLog` + `Notification` trong 1 `transaction.atomic()`.
- Template `admin/videos/videocourse/change_form.html`: input số (nhập tay 1 user ID) + nút gọi AJAX.
- **Giới hạn hiện tại:** mỗi lần chỉ kích hoạt được 1 user, phải biết trước ID, không lọc được ai đã sở hữu / ai là VIP.
- **Bug có sẵn (ngoài scope task này nhưng tiện sửa vì cùng dòng code):** dòng `videos/admin.py:156` dùng `action_category='CONTENT'`, không khớp `AdminAuditLog.ACTION_CHOICES` (giá trị đúng là `'CONTENT_GRANT'`, đã dùng đúng bên `books/admin.py:119`). Không raise lỗi (Django không validate choices ở DB level) nhưng hiển thị sai nhãn trong audit log. Đề xuất sửa luôn cho nhất quán.

## Thiết kế giải pháp

### UI/UX

Thay input text hiện tại bằng widget admin có sẵn `FilteredSelectMultiple` (2 cột, search được, click chuyển qua lại — dùng cho `filter_horizontal`), không cần biết trước ID:

```
[VideoCourseAdmin — Trang chi tiết khoá học]
  ├── ... (fields hiện tại)
  ├── [Inline] Người dùng sở hữu (giữ nguyên, không đổi)
  └── [Form] Kích hoạt hàng loạt
        ┌─────────────────┐      ┌─────────────────┐
        │ Có thể chọn      │  →   │ Đã chọn          │
        │ (search box)     │  ←   │                  │
        └─────────────────┘      └─────────────────┘
        → [Kích hoạt]
```

Danh sách "Có thể chọn" **loại trừ**:
1. User đã sở hữu khoá học này (`UserVideoPurchase` tồn tại)
2. User có `user_type='VIP'` — VIP đã bypass mọi kiểm tra purchase (`videos/views.py:26,96,140,164` đều check `user.user_type == 'VIP'` trước, không cần `UserVideoPurchase`)

### Backend

**Sửa `grant_access_view`** để nhận nhiều `user_id` (`request.POST.getlist('user_ids')` thay vì `request.POST.get('user_id')`), loop tạo `UserVideoPurchase` + `AdminAuditLog` + `Notification` cho từng user hợp lệ, bỏ qua (không lỗi cứng) user đã sở hữu nếu lọt qua do race condition:

```python
def grant_access_view(self, request, pk):
    from users.models import User, AdminAuditLog

    video = get_object_or_404(VideoCourse, pk=pk)

    if request.method != 'POST':
        return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    user_ids = request.POST.getlist('user_ids')

    if not user_ids:
        message = 'Vui lòng chọn ít nhất một người dùng.'
        if is_ajax:
            return JsonResponse({'ok': False, 'message': message}, status=400)
        self.message_user(request, message, level='error')
        return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

    users = list(User.objects.filter(pk__in=user_ids))

    already_owned = set(
        UserVideoPurchase.objects.filter(video=video, user__in=users)
        .values_list('user_id', flat=True)
    )

    granted = []
    with transaction.atomic():
        for user in users:
            if user.pk in already_owned:
                continue
            UserVideoPurchase.objects.create(user=user, video=video)
            AdminAuditLog.objects.create(
                staff=request.user,
                target_user=user,
                action_category='CONTENT_GRANT',
                action_detail=f'Admin kích hoạt khoá học "{video.title}" cho "{user}"',
                change_log={'video_id': str(video.public_id), 'video_title': video.title},
                ip_address=self._get_client_ip(request),
            )
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='Khoá học đã được kích hoạt',
                    body=f'Khoá học "{video.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 🎬',
                    notification_type='PURCHASE',
                    related_object_type='videocourse',
                    related_object_id=str(video.public_id),
                )
            except Exception:
                pass
            granted.append(user)

    if not granted:
        message = f'Tất cả {len(users)} người dùng đã chọn đều đã sở hữu khoá học "{video.title}".'
        if is_ajax:
            return JsonResponse({'ok': False, 'message': message}, status=400)
        self.message_user(request, message, level='warning')
        return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

    message = f'✅ Đã kích hoạt khoá học "{video.title}" cho {len(granted)} người dùng.'
    if already_owned:
        message += f' Bỏ qua {len(already_owned)} người đã sở hữu.'

    if is_ajax:
        return JsonResponse({'ok': True, 'message': message})
    self.message_user(request, message)
    return redirect(reverse('admin:videos_videocourse_change', args=[pk]))
```

**Thêm `change_view` context** để truyền danh sách user hợp lệ (chưa sở hữu + không VIP) cho template render dropdown:

```python
def change_view(self, request, object_id, form_url='', extra_context=None):
    extra_context = extra_context or {}
    pk = int(object_id)
    extra_context['grant_access_url'] = reverse('admin:videos_videocourse_grant_access', args=[pk])

    owned_ids = UserVideoPurchase.objects.filter(video_id=pk).values_list('user_id', flat=True)
    eligible_users = (
        User.objects.exclude(id__in=owned_ids)
        .exclude(user_type='VIP')
        .order_by('email')
        .values('id', 'email')
    )
    extra_context['eligible_users'] = list(eligible_users)
    return super().change_view(request, object_id, form_url, extra_context)
```

*(cần `from users.models import User` ở đầu file `videos/admin.py`, hiện đang import cục bộ trong `grant_access_view` — chuyển lên module-level vì giờ dùng ở 2 chỗ)*

### Template — `admin/videos/videocourse/change_form.html`

Thay `<input type="number" id="grant_user_id">` bằng `<select multiple id="grant_user_ids">` render từ `eligible_users`, dùng Django admin's `SelectFilter2` (JS có sẵn trong `django.contrib.admin`, cùng cơ chế `filter_horizontal`) để có giao diện 2 cột search được:

```html
<select multiple id="grant_user_ids" name="user_ids" style="min-width:300px;">
  {% for u in eligible_users %}
    <option value="{{ u.id }}">{{ u.email }} (ID: {{ u.id }})</option>
  {% endfor %}
</select>
```

Load `SelectFilter2` qua `class Media` của `VideoCourseAdmin` (giống cách admin dùng cho `filter_horizontal`):
```python
class Media:
    js = (
        'videos/js/auto_slug_course.js',
        'admin/js/SelectFilter2.js',
        'admin/js/jsi18n/en/djangojs.js',
    )
```

Init trong script:
```javascript
django.jQuery(function () {
  SelectFilter.init('grant_user_ids', 'người dùng', 1);
});
```

JS gửi AJAX: đổi `body: 'user_id=' + ...` → serialize tất cả `<option selected>` thành nhiều `user_ids=`.

## Trade-off & lưu ý

- **Không dùng `bulk_create`** để giữ nguyên hành vi tạo `AdminAuditLog` + `Notification` riêng cho từng user (audit trail đầy đủ per-user, đúng tinh thần Feature 21) — đánh đổi là loop query, nhưng số lượng user chọn 1 lần thường nhỏ (vài chục), không đáng lo performance.
- **VIP bị loại khỏi danh sách chọn** dựa trên logic thực tế đang chạy (`user.user_type == 'VIP'` bypass hết check purchase) — nếu sau này có VIP hết hạn (`subscription_end_date` qua ngày) nhưng `user_type` chưa hạ về FREE, user đó vẫn bị loại khỏi dropdown dù không còn quyền thực tế. Đây là vấn đề tồn tại sẵn ở toàn hệ thống (không nơi nào check `subscription_end_date`), không phải regression do task này — không xử lý trong scope.
- **Sửa `action_category='CONTENT'` → `'CONTENT_GRANT'`**: bug có sẵn, gộp vào task này theo xác nhận của PO — an toàn, chỉ ảnh hưởng nhãn audit log hiển thị, không ảnh hưởng logic hay dữ liệu đã ghi trước đó (log cũ giữ nguyên giá trị `'CONTENT'`, chỉ log mới từ sau khi sửa dùng `'CONTENT_GRANT'`).
- **Race condition**: nếu 2 admin cùng grant cho cùng 1 user tại cùng thời điểm, `unique_together` trên `UserVideoPurchase` sẽ chặn ở DB (`IntegrityError`). Do đã lọc `already_owned` trước và race condition hiếm khi xảy ra trong thao tác admin thông thường (2 admin thao tác cùng lúc trên cùng course, cùng user), chấp nhận **rollback toàn batch** nếu có `IntegrityError` — toàn bộ nằm trong 1 `transaction.atomic()` duy nhất, không bắt lỗi riêng lẻ từng user. Admin thử lại là đủ.

## Files cần thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/videos/admin.py` | Sửa `grant_access_view` nhận nhiều `user_ids`; thêm `eligible_users` vào `change_view` context; chuyển import `User` lên module-level; sửa `action_category` thành `'CONTENT_GRANT'` |
| `src/backend/templates/admin/videos/videocourse/change_form.html` | Đổi input text → `<select multiple>` + `SelectFilter2`; sửa JS AJAX gửi nhiều `user_ids` |

**Không cần migration** — không đổi model.

## Không nằm trong scope

- Thu hồi quyền truy cập hàng loạt (bulk revoke)
- Áp dụng tương tự cho `BookAdmin` (chỉ làm VideoCourse theo yêu cầu hiện tại; có thể làm riêng nếu cần)
- Xử lý VIP hết hạn nhưng chưa hạ `user_type` (vấn đề toàn hệ thống, ngoài scope)
