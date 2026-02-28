# Hướng dẫn sử dụng skill: Technical Leader

Skill Claude Code (chuẩn Agent Skills). Giúp Claude đóng vai **Technical Leader** chuyên đưa ra giải pháp kỹ thuật, thông thạo **Django (backend), Vue.js (frontend), PostgreSQL (database)**.

---

## Vị trí skill

- **Đường dẫn:** `.claude/skills/technical-leader/`
- **Phạm vi:** Project skill — dùng trong repo **fengshui-trainer**.

---

## Cách gọi skill

### 1. Slash command (gọi trực tiếp)

Trong Claude Code, gõ:

```
/technical-leader [mô tả vấn đề hoặc file]
```

Ví dụ:
- `/technical-leader Cách implement export báo cáo ra PDF từ Django qua Vue`
- `/technical-leader So sánh dùng ViewSet vs APIView cho training API`
- `/technical-leader` — rồi mô tả yêu cầu trong tin nhắn tiếp theo

### 2. Tự động (theo description)

Claude load skill khi câu hỏi khớp với `description`. Ví dụ:

- *"Đưa giải pháp kỹ thuật cho feature X"*
- *"Tech lead cho ý kiến: nên dùng OneToOne hay FK cho TrainingActivity–Exam"*
- *"Kiến trúc API Django cho module training, best practice"*
- *"Vue component nào nên tách cho màn hình luyện tập"*

---

## Bạn nhận được gì

Một bản **Technical Solution** dạng markdown:

- **Tóm tắt** — Giải pháp tổng quan và stack liên quan.
- **Phân tích** — Yêu cầu, ràng buộc, các tầng (DB / Backend / Frontend).
- **Đề xuất giải pháp** — Theo từng tầng (PostgreSQL schema/Django models+API / Vue components+routes), có thể kèm snippet ngắn.
- **Trade-off & lưu ý** — Đánh đổi, rủi ro, edge case, gợi ý test/migration.
- **Bước tiếp theo** — Danh sách bước implement hoặc file cần tạo/sửa.

Giải pháp luôn bám **Django | Vue.js | PostgreSQL** và conventions trong `tech-stack.md`.

---

## Cấu trúc thư mục

```
.claude/skills/technical-leader/
├── SKILL.md      # Entrypoint — vai trò, quy trình, template output
├── tech-stack.md # Conventions Django, Vue.js, PostgreSQL
└── USAGE.md      # File này — hướng dẫn cho người dùng
```

- Sửa **convention stack:** `tech-stack.md`
- Sửa **cách đưa giải pháp hoặc slash command:** `SKILL.md` (frontmatter `name` = slash command).
