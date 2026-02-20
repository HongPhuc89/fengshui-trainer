# Feature 6 Detailed Design: Notifications

## Document Information
- **Feature**: Notifications (Backend) – In-app + Email quota
- **Reference**: TASKS.md Phase 1 – Feature 6, database-design.md (EmailLog, EmailQuota)
- **Last Updated**: 2026-02-20

---

## 1. Core Data Structures & Models

### 1.1 EmailLog (Full audit trail)
| Field | Type | Description |
| :--- | :--- | :--- |
| `recipient` | EmailField | Email người nhận. |
| `subject` | CharField(255) | Tiêu đề. |
| `template_name` | CharField(100, blank=True) | Template dùng (e.g. welcome, reset_password). |
| `status` | CharField(10) | PENDING, SENT, FAILED. |
| `error_message` | TextField(blank=True) | Lỗi nếu FAILED. |
| `created_at` | DateTimeField(auto_now_add=True) | |

### 1.2 EmailQuota (Daily limit)
| Field | Type | Description |
| :--- | :--- | :--- |
| `date` | DateField(unique=True) | Ngày (CURRENT_DATE). |
| `count` | PositiveIntegerField(default=0) | Số email đã gửi trong ngày. |

Giới hạn: 300 email/ngày (configurable). Trước khi gửi: check quota; nếu count >= 300 thì từ chối hoặc queue.

### 1.3 Notification (In-app alerts)
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | FK(User, CASCADE) | User nhận. |
| `title` | CharField(255) | Tiêu đề. |
| `body` | TextField(blank=True) | Nội dung. |
| `notification_type` | CharField(50) | e.g. RECHARGE, PURCHASE, VIP_EXPIRY, SYSTEM. |
| `is_read` | BooleanField(default=False) | Đã đọc. |
| `related_object_type` | CharField(50, blank=True) | book, video, wallet, ... |
| `related_object_id` | CharField(255, blank=True) | public_id (optional). |
| `created_at` | DateTimeField(auto_now_add=True) | |

---

## 2. Business Logic

### 2.1 Sending Email (with quota)
1. Lấy hoặc tạo EmailQuota cho date=today.
2. Nếu quota.count >= DAILY_LIMIT (300): return error hoặc enqueue cho ngày sau.
3. Gửi email (Gmail SMTP hoặc Mailpit khi dev).
4. Tạo EmailLog (recipient, subject, template_name, status=SENT/FAILED, error_message nếu có).
5. Tăng quota.count += 1.

### 2.2 Celery Task
- Task: `send_email_with_quota.delay(recipient, subject, body_html, template_name=...)`.
- Trong task: check quota, send, log, increment quota.

### 2.3 In-app Notification
- Sau khi redeem voucher / purchase / subscribe VIP: tạo Notification cho user (title, body, type).
- GET /api/notifications/: trả danh sách của user, paginated, sort -created_at.
- POST /api/notifications/{id}/mark-read/: set is_read=True.

---

## 3. API Endpoints

| Endpoint | Method | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET /api/notifications/` | GET | Yes | List notification của user (paginated). |
| `POST /api/notifications/{id}/mark-read/` | POST | Yes | Đánh dấu đã đọc. |
| `POST /api/notifications/mark-all-read/` | POST | Yes | Đánh dấu tất cả đã đọc (optional). |

---

## 4. Admin

- EmailLog: list_display (recipient, subject, status, created_at); filter status, date; search recipient; readonly.
- EmailQuota: list_display (date, count); readonly (chỉ Celery/script cập nhật).
- Admin Email Dashboard: custom view hoặc link tới EmailLog + EmailQuota; hiển thị quota hôm nay và số đã gửi.

### 4.1 Push Notification (FCM/APNs)
- Ngoài phạm vi detail design backend: tích hợp FCM/APNs (device token lưu UserDevice hoặc bảng riêng); backend có thể gửi payload qua Celery. Để implementation sau.

---

## 5. Implementation Status

| # | Task | Status |
| :--- | :--- | :--- |
| 1 | EmailLog model | ⬜ Pending |
| 2 | EmailQuota model | ⬜ Pending |
| 3 | Notification model | ⬜ Pending |
| 4 | Celery task send_email_with_quota | ⬜ Pending |
| 5 | API notifications list, mark-read | ⬜ Pending |
| 6 | Admin EmailLog, EmailQuota + dashboard | ⬜ Pending |
| 7 | Tạo notification khi redeem/purchase/VIP (hook từ wallet) | ⬜ Pending |
| 8 | Push (FCM/APNs) – optional | ⬜ Pending |

---
*Last updated: 2026-02-20*
