# Fullstack Developer — Best Practices

Chuẩn coding khi implement từ detail design. Áp dụng cho mọi thay đổi backend/frontend trong repo.

---

## Project layout

- **Backend:** `src/backend/` — Django project, apps trong đó (ví dụ `exams/`, `videos/`, `books/`).
- **Frontend:** `src/frontend/src/` — Vue 3 app (views, components, router, services).
- **Docker:** `docker/docker-compose.yml`, service `web` cho Django. Mọi lệnh Django chạy qua:
  `docker-compose -f docker/docker-compose.yml exec web python manage.py <command>`.
- Code và comment bằng tiếng Anh
- Comment tóm tắt và ngắn gọn, không nên comment quá 5 dòng

---

## Backend — Django

### Models
- Một model một file trong `models.py` hoặc tách trong app (theo convention dự án). `related_name` có ý nghĩa, không trùng với tên class.
- Ràng buộc: `UniqueConstraint`, `Meta.constraints`; logic phức tạp trong `clean()` và gọi `full_clean()` trước `save()` khi cần.
- Kế thừa base (ví dụ `BaseModel`) nếu dự án có (id, timestamps). UUID cho PK public: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)` hoặc field `public_id` tùy design.
- **Không** xóa field đang dùng trong một migration; dùng migration tách: schema → data → cleanup.
- Các hàm dài tối đa 50 dòng

### Migrations
- `makemigrations` chỉ chạy sau khi đã sửa model. Tên migration mô tả ngắn (ví dụ `add_training_set_and_activity`).
- Data migration: dùng `apps.get_model()`; xử lý null/empty/edge case; viết `reverse_code` nếu cần rollback. Tránh import model trực tiếp.
- Một migration một mục đích (schema **hoặc** data). Review `dependencies`.

### API (DRF)
- **Views:** `APIView` hoặc `ViewSet` tùy design. Permission: `IsAuthenticated` hoặc custom; kiểm tra access (ví dụ `_can_access_lesson`) trước khi trả dữ liệu.
- **Serializers:** Tên rõ ràng (ví dụ `TrainingSetSerializer`, `TrainingActivitySerializer`). Nested đúng mức, tránh N+1: dùng `select_related`/`prefetch_related` trong view.
- **URL:** RESTful, slug/uuid theo design. Nhóm trong `urls.py` hoặc `urls_training.py`, include vào `config/urls.py`.
- **Response:** 200/201 + JSON đúng format design; 400 (validation), 403 (forbidden), 404 (not found). Không trả stack trace.

### Admin
- `ModelAdmin`: `list_display`, `list_filter`, `search_fields` khi có. FK dùng `raw_id_fields` hoặc autocomplete nếu nhiều bản ghi. Inline cho quan hệ 1-N (ví dụ `TrainingActivityInline` trong `TrainingSetAdmin`).
- Không expose action nguy hiểm không cần thiết.

### Testing (khi có)
- Test permission (403 khi không có quyền), 404 khi resource không tồn tại, 200/201 và shape response khi hợp lệ. Dùng `APITestCase`, factory hoặc fixture tùy dự án.

---

## Frontend — Vue.js

### Cấu trúc
- **Views:** `src/frontend/src/views/*.vue` — trang full, gắn route.
- **Components:** `src/frontend/src/components/` — tách theo domain (ví dụ `training/`, `video/`). Component nhỏ, single responsibility.
- **Services:** `src/frontend/src/services/*.js` — gọi API, trả về promise. Một service một domain (ví dụ `training.service.js`).
- **Router:** Định nghĩa route trong `router/index.js` (hoặc tương đương). `meta.requiresAuth: true` cho route cần đăng nhập.

### Component
- Vue 3 Composition API (`<script setup>`). Props định nghĩa rõ type; emit event tên có ý nghĩa.
- State: `ref`/`reactive` local; Pinia khi state dùng chung nhiều component. Tránh prop drilling sâu — có thể dùng provide/inject hoặc store.
- Template: không logic nặng; format hiển thị dùng computed hoặc helper. Accessibility cơ bản (label, aria khi cần).

### Gọi API
- Dùng service layer. Xử lý loading (flag hoặc skeleton), error (message user), empty state (copy + CTA theo design). Không để lỗi 4xx/5xx im lặng.

### UX
- Loading: skeleton hoặc spinner khi fetch. Empty: text + nút hành động (ví dụ "Tiếp tục đọc"). Error: thông báo rõ, có thể retry. Theo đúng design doc (copy, CTA).

### Naming
- Component: PascalCase. File component: PascalCase.vue. Service: camelCase.service.js. Route name: PascalCase hoặc kebab-case tùy convention dự án.

---

## Database — PostgreSQL (qua Django)

- Schema qua ORM; index cho field filter/order/join thường dùng. Unique constraint đúng business rule.
- Transaction: `transaction.atomic()` cho nhiều bảng hoặc data migration. Tránh lock lâu.

---

## Bảo mật & ổn định

- Không hardcode secret; dùng env. Không log password/token.
- Input: validate phía backend; escape nếu render HTML. CSRF khi dùng session.
- Permission: mỗi endpoint kiểm tra quyền; 403 khi không đủ quyền.

---

## Khi detail design không đủ chi tiết

- **API:** Chọn RESTful, response shape gần với doc; nếu thiếu field thì thêm hợp lý và ghi comment "theo design §X, bổ sung Y".
- **UI:** Giữ đúng flow và entry point; copy/CTA theo doc hoặc tạm tiếng Anh/Việt nhất quán, comment "TODO copy".
- **Migration:** Nếu doc không nói rõ rollback, vẫn viết `reverse_code` an toàn (no-op hoặc revert schema) khi có thể.

---

**Cập nhật:** Khi dự án thêm quy ước (linter, formatter, cấu trúc thư mục), bổ sung vào file này để Fullstack Developer áp dụng thống nhất.
