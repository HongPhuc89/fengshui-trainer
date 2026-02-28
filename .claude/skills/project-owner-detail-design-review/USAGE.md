# Hướng dẫn sử dụng skill: Project Owner — Detail Design Review & Feature Proposal

Skill Claude Code (chuẩn [Agent Skills](https://agentskills.io/)). Giúp Claude đóng vai **Project Owner (PO)** để:
1. **Review** kĩ lưỡng tài liệu detail design trước khi implement.
2. **Hỗ trợ đề xuất tính năng** — cấu trúc ý tưởng, đặt câu hỏi làm rõ, gợi ý bước tiếp theo.

---

## Vị trí skill (Claude Code)

- **Đường dẫn:** `.claude/skills/project-owner-detail-design-review/`
- **Phạm vi:** Project skill — chỉ áp dụng trong repo **fengshui-trainer** (commit cùng codebase).

---

## Cách gọi skill

### 1. Slash command (gọi trực tiếp)

Trong Claude Code, gõ:

```
/project-owner-detail-design-review [file hoặc mô tả]
```

Ví dụ:
- `/project-owner-detail-design-review md/design/feature-9-detail-design.md` — review doc đó
- `/project-owner-detail-design-review` — rồi mô tả ý tưởng tính năng trong tin nhắn tiếp theo

Tên slash command = trường `name` trong frontmatter của `SKILL.md` (dấu gạch ngang).

### 2. Tự động (theo description)

Claude load skill khi câu hỏi khớp với `description`. Chỉ cần nói rõ ý định, ví dụ:

**Review detail design:**
- *"Review detail design giúp tôi"* / *"PO review bản thiết kế này"*
- *"Review md/design/feature-9-detail-design.md"*

**Đề xuất tính năng:**
- *"Tôi muốn đề xuất tính năng: [mô tả], PO cho ý kiến giúp"*
- *"Ý tưởng tính năng X, PO giúp làm rõ phạm vi"*

---

## Bạn nhận được gì

**Khi review (A):** Báo cáo markdown — Tóm tắt, Điểm mạnh, Critical/Suggestion/Nice-to-have, Checklist, Kết luận (Approve / Approve with minor fixes / Revise).

**Khi đề xuất tính năng (B):** Tóm tắt đề xuất, draft cấu trúc (Vấn đề, Mục tiêu, Phạm vi, Giải pháp, Open questions), feedback PO, khuyến nghị (Tiến tới detail design / Làm rõ thêm / Thu hẹp scope).

---

## Cấu trúc thư mục (.claude)

```
.claude/skills/project-owner-detail-design-review/
├── SKILL.md           # Entrypoint — frontmatter + hướng dẫn cho Claude
├── reference.md       # Checklist review detail design
├── feature-proposal.md # Template & hướng dẫn đề xuất tính năng
└── USAGE.md           # File này — hướng dẫn cho người dùng
```

- Sửa **checklist review:** `reference.md`
- Sửa **template/câu hỏi đề xuất:** `feature-proposal.md`
- Sửa **cách Claude trả lời hoặc slash command:** `SKILL.md` (frontmatter `name` đổi thì slash command đổi theo).
