# Hướng dẫn sử dụng skill: Product Ideation

Skill Claude Code giúp **nghiên cứu sản phẩm tương đương trên thị trường**, phân tích gaps, và **đề xuất tính năng mới** cho Thiên Thư. Mọi ý tưởng được lưu vào `md/idea/`.

---

## Vị trí skill

- **Đường dẫn:** `.claude/skills/product-ideation/`
- **Phạm vi:** Project skill — chỉ áp dụng trong repo **fengshui-trainer**

---

## Cách gọi skill

### 1. Slash command

```
/product-ideation [chủ đề hoặc câu hỏi tùy chọn]
```

Ví dụ:
- `/product-ideation` — tự do research và đề xuất
- `/product-ideation tính năng gamification` — focus vào chủ đề gamification
- `/product-ideation sản phẩm EdTech Việt Nam` — research thị trường VN
- `/product-ideation cải thiện retention người dùng` — focus vào retention

### 2. Tự động (theo description)

Nói tự nhiên, Claude tự load skill:
- *"Thiên Thư đang thiếu tính năng gì so với thị trường?"*
- *"Nghiên cứu Duolingo và đề xuất ý tưởng cho mình"*
- *"Có ý tưởng feature nào hay không?"*
- *"Cạnh tranh của mình đang làm gì tốt hơn mình?"*

---

## Bạn nhận được gì

1. **Research summary** — insight từ 3-5 platform tương đương
2. **3-7 ý tưởng tính năng** — mỗi ý có tên, mô tả ngắn, độ ưu tiên
3. **Files lưu tại `md/idea/`** — mỗi ý tưởng = 1 file markdown đầy đủ
4. **Khuyến nghị** — ý tưởng nào nên đưa vào PO review / detail design trước

---

## Cấu trúc thư mục

```
.claude/skills/product-ideation/
├── SKILL.md      # Entrypoint — hướng dẫn cho Claude
└── USAGE.md      # File này

md/idea/
├── README.md     # Danh sách tổng hợp tất cả ý tưởng
├── <tên-ý-tưởng-1>.md
├── <tên-ý-tưởng-2>.md
└── ...
```

---

## Workflow gợi ý

```
/product-ideation
    ↓
Đọc context + WebSearch research
    ↓
Tạo files md/idea/*.md
    ↓
Chọn ý tưởng hay nhất
    ↓
/project-owner-detail-design-review   (review & scope)
    ↓
/technical-leader                      (giải pháp kỹ thuật)
    ↓
/fullstack-developer                   (implement)
```
