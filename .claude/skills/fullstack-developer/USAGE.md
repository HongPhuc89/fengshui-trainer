# Hướng dẫn sử dụng skill: Fullstack Developer

Skill Claude Code (chuẩn Agent Skills). Giúp Claude đóng vai **Fullstack Developer**: đọc detail design và **triển khai code** theo đúng thứ tự (DB → Backend → Frontend), tuân thủ best practices (Django, Vue.js, PostgreSQL) và convention dự án.

---

## Vị trí skill

- **Đường dẫn:** `.claude/skills/fullstack-developer/`
- **Phạm vi:** Project skill — dùng trong repo **fengshui-trainer**.

---

## Cách gọi skill

### 1. Slash command (gọi trực tiếp từ picker)

Trong Claude Code (VSCode extension hoặc terminal), gõ `/` để mở picker rồi chọn:

```
/fullstack-developer [file design hoặc mô tả]
```

Command này được định nghĩa tại `.claude/commands/fullstack-developer.md`.

Ví dụ:
- `/fullstack-developer md/design/feature-9-detail-design.md` — implement feature theo doc đó
- `/fullstack-developer Implement phase 1 (models + migrations) theo feature-9` — chỉ làm một phần

### 2. Tự động (theo description)

Claude load skill khi câu hỏi khớp với `description`. Ví dụ:

- *"Implement theo detail design feature 9"*
- *"Code feature training architecture theo md/design/feature-9-detail-design.md"*
- *"Làm fullstack implement theo design doc"*
- *"Viết code theo đúng detail design, đúng best practice"*

---

## Bạn nhận được gì

- **Implementation checklist** — Từ design doc: list file tạo/sửa, thứ tự (DB → Backend → Frontend).
- **Code thực tế** — Tạo/sửa file trong `src/backend/` và `src/frontend/src/`: models, migrations, serializers, views, URLs, admin, services, components, routes.
- **Tuân thủ:** [best-practices.md](best-practices.md) và CLAUDE.md (Django chạy qua docker-compose). Access control, validation, loading/empty/error state theo design.

Có thể implement từng phase (ví dụ chỉ Phase 1: models + migrations) nếu bạn nói rõ.

---

## Cấu trúc thư mục

```
.claude/skills/fullstack-developer/
├── SKILL.md           # Entrypoint — vai trò, quy trình, nguyên tắc
├── best-practices.md  # Chuẩn coding Django / Vue / PostgreSQL
└── USAGE.md           # File này — hướng dẫn cho người dùng
```

- Sửa **chuẩn coding:** `best-practices.md`
- Sửa **quy trình hoặc slash command:** `SKILL.md` (frontmatter `name` = slash command).
