# Technical Leader — Tech Stack: Django | Vue.js | PostgreSQL

Tài liệu tham chiếu conventions và patterns khi đưa ra giải pháp. Technical Leader áp dụng các điểm dưới đây trừ khi yêu cầu cụ thể khác đi.

---

## Backend — Django

- **API:** Django REST Framework (DRF). ViewSet + Serializer cho CRUD; `APIView` khi cần logic đặc thù. Permission: `IsAuthenticated`, custom permission class khi cần (ví dụ `_can_access_lesson`).
- **Models:** Mỗi app có `models.py` rõ ràng. Dùng `ForeignKey`, `OneToOneField` với `related_name` có ý nghĩa. Ràng buộc phức tạp đặt trong `Model.clean()` hoặc `UniqueConstraint`. Tránh circular dependency giữa app.
- **Migrations:** Một migration một thay đổi logic (tạo model, thêm field, data migration tách riêng). Data migration cần rollback plan và xử lý edge case.
- **URL:** RESTful, slug hoặc UUID cho resource. Ví dụ: `/api/training/lesson/<slug>/`, `/api/training/activities/<uuid>/flashcards/`.
- **Settings:** Biến môi trường cho secret/DB; không hardcode. Chạy lệnh Django qua docker-compose (xem CLAUDE.md / project rules).

---

## Frontend — Vue.js

- **Phiên bản:** Vue 3 (Composition API). Component single-file `.vue`.
- **State:** Pinia khi cần state dùng chung; ref/reactive cho state local. Tránh store quá lớn.
- **Routing:** Vue Router. Route có `meta.requiresAuth` khi cần bảo vệ. Back navigation: `router.back()` với fallback rõ ràng.
- **API:** Một service layer (ví dụ `services/training.service.js`) gọi `axios`/fetch tới backend. Xử lý 4xx/5xx và hiển thị thông báo user.
- **Components:** Tách theo chức năng (view, layout, form, list). Props rõ ràng; emit event khi cần. Dynamic component khi có nhiều mode (ví dụ FLASHCARD / QUIZ).
- **UX:** Loading, empty, error state đều có UI và copy; form có validation và feedback.

---

## Database — PostgreSQL

- **Dùng qua Django ORM:** Khai báo model Django, migration tạo schema. Tránh raw SQL trừ khi cần tối ưu cụ thể.
- **Index:** Thêm index cho field dùng trong `filter()`, `order_by()` hoặc join thường xuyên. Unique constraint cho business rule (ví dụ một bản ghi duy nhất per (training_set, activity_type)).
- **Transaction:** Dùng `transaction.atomic()` cho thao tác nhiều bảng hoặc data migration. Tránh long-running transaction.
- **Naming:** Tên bảng/tên cột theo Django (snake_case). Tên index/constraint có ý nghĩa (ví dụ `exams_trainingactivity_unique_type_per_set`).

---

## Tích hợp Django ↔ Vue ↔ PostgreSQL

- **API contract:** Backend trả JSON (DRF serializer). Frontend gọi đúng endpoint, parse response. Có versioning hoặc prefix (`/api/`) nếu dự án quy định.
- **Auth:** Token/session do Django; mỗi request gửi credential. Frontend lưu token an toàn, gửi header mỗi call.
- **Id:** Dùng UUID (public_id) cho resource expose ra API nếu không muốn lộ sequential ID; Django model có thể dùng `UUIDField` hoặc custom field.

---

**Cập nhật:** Khi dự án thêm convention (linter, formatter, cấu trúc thư mục chuẩn), bổ sung vào file này để Technical Leader áp dụng thống nhất.
