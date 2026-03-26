# Dark Mode — Chế Độ Tối

**Ngày đề xuất:** 2026-03-26
**Nguồn cảm hứng:** Kindle (dark/sepia/light modes), Notion (dark mode), mọi reading app hiện đại
**Độ ưu tiên gợi ý:** 🟡 Medium
**Effort ước tính:** M

---

## Vấn đề / Cơ hội

Người học Phong Thuỷ **thường đọc sách và xem video vào buổi tối** (sau giờ làm). Hiện tại Thiên Thư chỉ có light mode — nền trắng với màu vàng gold là accent. Đọc sách/xem video trên nền trắng ban đêm gây mỏi mắt, đặc biệt với PDF reader. Designer-summary.md đã đề cập dark mode là "rất quan trọng" nhưng chưa được implement.

Platform đọc sách mà không có dark mode là một điểm trừ lớn với người dùng so sánh với Kindle app hay bất kỳ reading app nào.

## Ý tưởng tính năng

**3 chế độ hiển thị** (toggle trên header/profile):
- ☀️ **Sáng** (Light) — hiện tại
- 🌙 **Tối** (Dark) — nền `#1a1a2e` tông navy/xanh đêm, text `#e8e8e8`, accent vàng giữ nguyên
- 📖 **Sepia** — nền `#f5efe0` tông vàng kem, text `#3d2b1a` — ideal cho đọc sách dài

**Thêm tùy chọn:**
- "Tự động theo hệ thống" (follow `prefers-color-scheme`)
- Lưu preference vào localStorage (hoặc user profile nếu BE hỗ trợ)

**Implementation approach với CSS variables (Thiên Thư đã có `variables.css`):**
```css
/* variables.css */
[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-bg-card: #16213e;
  --color-text-primary: #e8e8e8;
  --color-text-secondary: #a0a0b0;
  --color-border: #2d2d4e;
  /* Gold accent giữ nguyên — đẹp trên dark background */
}

[data-theme="sepia"] {
  --color-bg: #f5efe0;
  --color-bg-card: #ede7d4;
  --color-text-primary: #3d2b1a;
  --color-text-secondary: #6b5840;
  --color-border: #d4c4a0;
}
```

**PDF Reader dark mode:**
- CSS filter `invert(1) hue-rotate(180deg)` trên canvas element — cheap trick nhưng effective cho text-heavy PDFs
- Hoặc option riêng trong reader: Light / Dark / Sepia (chỉ cho reader context)

## Tại sao phù hợp với Thiên Thư

Aesthetic Phong Thuỷ với dark background + gold accent sẽ trông **rất đẹp và mystical** — phù hợp với vibe của nội dung hơn là light mode. Dark navy + gold là color palette truyền thống của sách Phong Thuỷ cổ điển. Đây cũng là feature mà user sẽ thấy **ngay lập tức** và chia sẻ "app này trông xịn hơn" — perception value cao.

## Inspiration từ market

- **Kindle**: 3 modes (Light/Dark/Sepia) + auto brightness — gold standard cho reading apps
- **Notion**: System auto / light / dark — clean toggle trong settings
- **Twitter/X**: Dark blue vs. pure dark — học được rằng navy dark ít harsh hơn pure black

## Scope gợi ý cho V1

- [ ] Thêm `data-theme` attribute lên `<html>` element
- [ ] Update `variables.css` — thêm dark và sepia variants cho tất cả CSS variables hiện tại
- [ ] `useTheme.js` composable — `currentTheme`, `setTheme()`, persist vào localStorage
- [ ] Theme toggle button trong Header/Nav (moon icon)
- [ ] PDF Reader: thêm reader-specific mode toggle (light/dark/sepia chỉ cho reader)
- [ ] Test: tất cả components hiển thị đúng trong dark mode (icons, badges, modals)

## Open questions

- Lưu preference ở đâu: localStorage (simple, no BE needed) hay user profile (sync across devices)?
  Gợi ý V1: localStorage, V2 sync lên BE
- Color palette dark: navy blue (`#1a1a2e`) hay pure dark (`#121212` Material style)?
  Gợi ý: navy blue — phù hợp Phong Thuỷ aesthetic hơn
- PDF canvas dark mode: CSS filter invert đủ không? Test cần thiết với actual PDF content

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-N-dark-mode.md`
- [ ] Design: chọn color palette cụ thể cho dark theme, prototype 1 screen trước khi implement toàn bộ
