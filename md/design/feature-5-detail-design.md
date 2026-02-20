# Feature 5 Detailed Design: Comments & Interactions

## Document Information
- **Feature**: Comments & Interactions (Backend)
- **Reference**: TASKS.md Phase 1 – Feature 5, database-design.md (ER: User writes Comment)
- **Last Updated**: 2026-02-20

---

## 1. Core Data Structures & Models

### 1.1 Comment (GenericForeignKey)
Comment gắn với một content object (Book, VideoCourse, VideoLesson, v.v.) qua ContentType.

| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | FK(User, CASCADE) | Người viết. |
| `content_type` | FK(ContentType) | Loại object (Book, VideoCourse, ...). |
| `object_id` | CharField/UUIDField | ID object (dùng public_id nếu API dùng UUID). |
| `content_object` | GenericForeignKey | content_type, object_id. |
| `body` | TextField | Nội dung comment. |
| `is_pinned` | BooleanField(default=False) | Comment được ghim (admin). |
| `created_at` | DateTimeField(auto_now_add=True) | |
| `updated_at` | DateTimeField(auto_now=True) | |

### 1.2 CommentReply
| Field | Type | Description |
| :--- | :--- | :--- |
| `comment` | FK(Comment, CASCADE) | Comment gốc. |
| `user` | FK(User, CASCADE) | Người trả lời. |
| `body` | TextField | Nội dung reply. |
| `created_at` | DateTimeField(auto_now_add=True) | |

---

## 2. Business Logic

### 2.1 Permission
- **Chỉ user đã mua (hoặc VIP)** mới được comment trên Book/VideoCourse (hoặc Lesson) tương ứng.
- Kiểm tra: UserBookPurchase / UserVideoPurchase tồn tại hoặc user.user_type == 'VIP'.
- 403 nếu chưa mua.

### 2.2 Moderation (optional)
- is_pinned: chỉ staff set.
- Có thể thêm is_hidden/soft-delete do admin.

---

## 3. API Endpoints

| Endpoint | Method | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET /api/comments/` | GET | No/Yes | List comment (query: content_type, object_id; paginated). |
| `POST /api/comments/` | POST | Yes | Tạo comment; body { "content_type": "book", "object_id": "uuid", "body": "..." }; check purchase. |
| `POST /api/comments/{id}/reply/` | POST | Yes | Trả lời comment; body { "body": "..." }; check purchase cùng nội dung. |
| `DELETE /api/comments/{id}/` | DELETE | Yes | Xóa comment (chỉ author hoặc staff). |

Content_type: có thể dùng "book", "video_course" và map tới ContentType id.

---

## 4. Admin

- Comment: list_display (user, content_type, object_id, body, is_pinned, created_at); filter content_type; search body, user.
- CommentReply: list_display (comment, user, created_at); inline trong Comment (optional).

---

## 5. Implementation Status

| # | Task | Status |
| :--- | :--- | :--- |
| 1 | Comment model (GenericForeignKey) | ⬜ Pending |
| 2 | CommentReply model | ⬜ Pending |
| 3 | Permission helper (purchased/VIP) | ⬜ Pending |
| 4 | API list, create, reply, delete | ⬜ Pending |
| 5 | Admin Comment/Reply | ⬜ Pending |

---
*Last updated: 2026-02-20*
