---
name: product-ideation
description: Researches similar EdTech/learning products, analyzes gaps in the current platform, and proposes creative new features. Saves proposals to md/idea/. Use when the user wants new feature ideas, product research, competitive analysis, or inspiration for what to build next. Trigger keywords: ý tưởng, ideation, feature mới, cạnh tranh, sản phẩm tương tự, khám phá tính năng, product research.
---

# Product Ideation — Nghiên cứu & Đề xuất tính năng mới

Agent đóng vai **Product Analyst + Creative Strategist**: chủ động nghiên cứu thị trường, phân tích sản phẩm tương đương, tìm gaps trong platform hiện tại, và đề xuất tính năng mới có giá trị. Mọi đề xuất được lưu vào `md/idea/`.

---

## Khi nào áp dụng

- User muốn "ý tưởng tính năng mới", "feature mới cho sản phẩm", "nghiên cứu cạnh tranh".
- User hỏi "nên làm gì tiếp theo", "platform mình đang thiếu gì", "có ý tưởng gì hay không".
- User muốn khám phá market trend hoặc best practices từ EdTech platforms khác.
- User muốn xem `md/idea/` để tham khảo backlog ý tưởng.

---

## Quy trình

### Bước 1 — Đọc context dự án

Đọc các tài liệu sau để hiểu platform hiện tại:

| Tài liệu | Mục đích |
|---|---|
| `md/TASKS.md` | Features đã có, đang làm, còn thiếu |
| `md/design/designer-summary.md` | Vision, user flows, business model |
| `md/core/system-overview.md` | Kiến trúc, modules, data model |
| `md/idea/` | Ý tưởng đã đề xuất trước đó (tránh trùng lặp) |

### Bước 2 — Nghiên cứu sản phẩm tương đương

Dùng **WebSearch** để nghiên cứu các platform liên quan. Tập trung vào:

**Nhóm platform cần research:**
- EdTech học thuật / niche knowledge: Coursera, MasterClass, Skillshare, Teachable
- Flashcard / spaced learning: Anki, Quizlet, Brainscape, Remnote
- Gamified learning: Duolingo, Kahoot, Quizizz
- Asian / Vietnamese EdTech: Topik, Elsa Speak, CoderSchool, Unica
- Niche spiritual/traditional knowledge platforms (nếu tồn tại)
- Community-driven learning: Reddit (subreddits học), Discord study servers

**Câu hỏi nghiên cứu:**
- Platform đó có tính năng gì đặc biệt giúp retention/engagement?
- UX flow nào được người dùng yêu thích nhất?
- Tính năng nào viral / được chia sẻ nhiều?
- Pain point nào họ chưa giải quyết tốt?

### Bước 3 — Phân tích gaps

So sánh features của platform tương đương với Thiên Thư hiện tại (từ TASKS.md). Tìm:
- Features phổ biến ở competitors nhưng Thiên Thư chưa có
- UX improvements rõ ràng
- Cơ hội tận dụng niche (Phong Thuỷ/Kỳ Môn/Trạch Nhật)

### Bước 4 — Đề xuất và lưu file

Với mỗi ý tưởng đáng chú ý:
1. Tạo file `md/idea/<tên-ý-tưởng>.md` theo template bên dưới
2. Cập nhật `md/idea/README.md` (danh sách tổng hợp)

---

## Template file ý tưởng (`md/idea/<tên>.md`)

```markdown
# [Tên tính năng]

**Ngày đề xuất:** YYYY-MM-DD
**Nguồn cảm hứng:** [Platform / trend đã nghiên cứu]
**Độ ưu tiên gợi ý:** 🔴 High / 🟡 Medium / 🟢 Low
**Effort ước tính:** S / M / L / XL

---

## Vấn đề / Cơ hội

[Mô tả pain point người dùng hoặc cơ hội thị trường — 2-4 câu.]

## Ý tưởng tính năng

[Mô tả tính năng đề xuất — người dùng làm gì, hệ thống phản hồi gì.]

## Tại sao phù hợp với Thiên Thư

[Lý do tính năng này align với vision, user base, hoặc niche Phong Thuỷ của platform.]

## Inspiration từ market

- [Platform A]: [Cách họ làm tương tự]
- [Platform B]: [Variation khác]

## Scope gợi ý cho V1

- [ ] [Hạng mục tối thiểu 1]
- [ ] [Hạng mục tối thiểu 2]

## Open questions

- [Câu hỏi cần PO/team quyết định trước khi design chi tiết]

## Bước tiếp theo

[ ] Chuyển sang PO review → `/project-owner-detail-design-review`
[ ] Viết detail design → `md/design/feature-N-detail-design.md`
[ ] Cần research thêm
```

---

## Output khi chạy skill

1. **Tóm tắt research** — những insight nổi bật từ market (3-5 điểm).
2. **Danh sách ý tưởng đề xuất** — từ 3-7 ý tưởng, mỗi ý có tên + one-liner mô tả + độ ưu tiên gợi ý.
3. **File đã lưu** — liệt kê các file mới tạo trong `md/idea/`.
4. **Khuyến nghị tiếp theo** — ý tưởng nào nên đưa vào PO review / detail design trước.

---

## Nguyên tắc

- **Thực tế**: Ưu tiên ý tưởng khả thi với stack Django/Vue.js hiện tại, không đề xuất đổi stack.
- **Niche-aware**: Luôn cân nhắc tính đặc thù của platform (học Phong Thuỷ, Kỳ Môn, Trạch Nhật) — đừng copy paste từ generic EdTech.
- **Không trùng lặp**: Kiểm tra `md/idea/` và `md/TASKS.md` trước khi đề xuất để tránh ý tưởng đã có.
- **Research thật**: Dùng WebSearch để tìm thông tin thực tế, không bịa tính năng của competitors.
- **Lưu file ngay**: Mỗi ý tưởng đủ hình thành → tạo file trong `md/idea/` ngay, không để trong chat.
