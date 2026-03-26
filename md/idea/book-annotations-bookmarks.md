# Book Annotations & Bookmarks — "Ghi Chú Khi Đọc"

**Ngày đề xuất:** 2026-03-26
**Nguồn cảm hứng:** Kindle (highlights + notes), GoodReads (reading notes), Notability
**Độ ưu tiên gợi ý:** 🟡 Medium
**Effort ước tính:** L

---

## Vấn đề / Cơ hội

Người học Phong Thuỷ đọc sách nghiêm túc — họ cần **ghi chú lại những điểm quan trọng** khi đọc. Hiện tại BookReaderView không có cách nào để đánh dấu trang, ghi chú, hay highlight text. Kết quả: người dùng phải dùng app ghi chú riêng (Notes, Notion) → trải nghiệm bị phân mảnh.

Đây là tính năng phân biệt giữa một "PDF viewer đơn giản" và một "học liệu thật sự". Kindle thành công vì highlight + notes là core workflow của người đọc nghiêm túc.

## Ý tưởng tính năng

**3 tính năng liên quan, có thể ra mắt độc lập:**

### 1. Bookmark trang (V1 — dễ nhất)
- Icon bookmark ở corner của PDF reader
- Click → lưu "trang X của chương Y" vào danh sách bookmarks
- Danh sách bookmarks: trong TOC sidebar — tab "Dấu trang" song song với "Mục lục"
- Click bookmark → jump tới trang đó

### 2. Ghi chú theo chương (V1 — text notes)
- Nút "Ghi chú" trong reader toolbar
- Side panel (desktop) hoặc drawer (mobile): textarea gắn với current chapter
- Lưu note theo `(user, book_chapter)` — 1 note per chapter
- Hiển thị trong "Ghi chú của tôi" — list tất cả notes đã viết (cross-book)
- Export notes: copy-to-clipboard (V1), export PDF (V2)

### 3. Text highlight trong PDF (V2 — phức tạp hơn)
- Chọn text trên canvas PDF → popup "Highlight" với màu sắc
- Lưu highlight theo tọa độ (page, rect) + màu + optional note text
- Re-render highlights khi mở lại trang
- Kỹ thuật: `pdfjs-dist` có annotation layer API — khả thi nhưng non-trivial

**UX flow (V1):**
```
[Reader] ─── toolbar: [← Prev] [12/45] [Next →] [🔖] [📝] [⚙️]
              │
              ├── [🔖] → toggle bookmark trang hiện tại
              └── [📝] → mở note panel/drawer

[TOC Sidebar]
  ├── Mục lục (chapters)
  └── Dấu trang (bookmarks)  ← tab mới
       • Chương 3, trang 12
       • Chương 7, trang 34
```

## Tại sao phù hợp với Thiên Thư

Học Phong Thuỷ/Kỳ Môn có rất nhiều bảng số, công thức, và quy tắc cần ghi nhớ lại. Người học thật sự **sẽ dùng notes** để viết ra những điểm họ thấy quan trọng hoặc chưa hiểu → quay lại hỏi cộng đồng. Kết hợp với Comment UI (idea riêng), một học viên có thể: ghi chú → post question trong comment → nhận giải thích → cập nhật note. Đây là **learning workflow hoàn chỉnh** mà không nơi nào khác có cho niche Phong Thuỷ.

## Inspiration từ market

- **Kindle**: Highlight colors (yellow/orange/pink/blue) + free-text notes + "My Clippings" export. Sticky feature nhất của Kindle.
- **Readwise**: Aggregate highlights từ Kindle, highlights review via spaced repetition — tích hợp với Thiên Thư's flashcard system trong tương lai
- **GoodReads**: Reading notes per book — simple text, cộng đồng có thể thấy public notes

## Scope gợi ý cho V1 (Bookmark + Chapter Notes only)

**Backend:**
- [ ] `BookBookmark` model: `user`, `book_chapter`, `page_number`, `created_at`
- [ ] `BookNote` model: `user`, `book_chapter`, `content` (TextField), `updated_at`
- [ ] `GET/POST /api/books/{slug}/bookmarks/` — list + create/toggle
- [ ] `GET/PUT /api/books/{slug}/chapters/{order}/note/` — get/upsert note

**Frontend:**
- [ ] Bookmark icon trong reader toolbar, toggle state (filled/outline)
- [ ] Bookmarks tab trong TOC sidebar (list + click-to-jump)
- [ ] Notes panel/drawer (textarea + auto-save debounce 2s)
- [ ] `bookmarks.service.js` + `notes.service.js` (hoặc trong `books.service.js`)

## Open questions

- Notes: per-chapter hay per-book? Gợi ý: per-chapter (contextual)
- Notes có private/public toggle? V1: private only, V2 có thể share với cộng đồng
- Auto-save hay manual save? Gợi ý: debounce auto-save 2s sau khi stop typing
- PDF highlight (V2): cần lưu tọa độ rect hay text content? Lưu cả 2 để resilient hơn

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-N-book-annotations.md`
- [ ] Cần quyết định: ra mắt Bookmark + Notes V1 trước, defer PDF highlight sang V2
