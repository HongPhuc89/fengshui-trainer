# Modern Flashcard UI — Web & Mobile

**Ngày đề xuất:** 2026-03-06
**Nguồn cảm hứng:** Anki 3.0 redesign discussions, Quizlet responsive patterns, Duolingo gesture UX, modern card flip CSS patterns
**Độ ưu tiên gợi ý:** 🟡 Medium
**Effort ước tính:** M (frontend only — không đụng backend)

---

## Vấn đề / Cơ hội

`FlashcardSession.vue` hiện tại hoạt động đúng về mặt logic nhưng **layout chưa tận dụng tốt không gian màn hình** trên cả 2 platform:

- **Mobile**: Card nhỏ (min-height 180px), thiếu visual hierarchy rõ ràng, hint text "Chạm để lật thẻ" quá mờ, không có cue trực quan nào gợi ý swipe.
- **Desktop**: Card chiếm full-width trong sidebar hẹp hoặc trong container, không tận dụng được vùng rộng khi dùng standalone (`TrainingView`). Không có keyboard shortcut, không có hover state rõ ràng trên card.
- **Nội dung Phong Thủy**: Các card có thể chứa ký tự Hán cổ, biểu đồ La Bàn, sơ đồ Bát Quái — cần layout linh hoạt hơn để display diagram/image bên trong card.
- **Progress feedback**: Dots indicator hiện tại khó đọc khi có 20 cards, thiếu visual progress bar rõ ràng.

---

## Ý tưởng tính năng

Redesign `FlashcardSession.vue` với **2 layout mode** phân biệt rõ giữa desktop và mobile, giữ nguyên toàn bộ logic backend (random 20 cards, no SM-2).

---

## Layout Web Desktop (>= 768px) — Split-Panel Layout

### Concept: "Study Studio"

Khi standalone (`TrainingView.vue`, không phải embedded trong sidebar), desktop dùng layout **2 cột**:

```
┌─────────────────────────────────────────────────────────────┐
│  [Card Deck Column — 60%]          [Card List Column — 40%] │
│                                                             │
│  ┌─────────────────────────────┐   ┌─────────────────────┐ │
│  │                             │   │ #1  Thiên Can        │ │
│  │     ♻ FRONT                 │   │ #2  Địa Chi ← active │ │
│  │                             │   │ #3  Ngũ Hành         │ │
│  │   Địa Chi là gì?            │   │ #4  Bát Quái         │ │
│  │                             │   │ #5  Hà Đồ Lạc Thư   │ │
│  │   [category badge]          │   │ ...                  │ │
│  │                             │   │ 20  Long Mạch        │ │
│  └─────────────────────────────┘   └─────────────────────┘ │
│                                                             │
│  [Progress bar ==================== 5/20]                   │
│                                                             │
│  [← Trước]   Space = lật   Mũi tên = điều hướng  [Sau →]  │
│                                                             │
│          Keyboard: ← → điều hướng | Space lật thẻ          │
└─────────────────────────────────────────────────────────────┘
```

**Đặc điểm cột trái (Card Column):**
- Card có `min-height: 280px` (cao hơn, không bị vuông vức)
- Hover state: card nhẹ nhàng nâng lên (box-shadow mở rộng + translate-y -4px) trước khi click
- 3D flip animation giữ nguyên (rotateY 180deg)
- Click hoặc Space để lật
- Hiển thị "nhấn Space hoặc click để lật" khi card chưa flipped

**Đặc điểm cột phải (Card List):**
- Danh sách scrollable tất cả 20 cards
- Card hiện tại highlighted (accent-gold border)
- Cards đã xem: opacity mờ hơn hoặc có checkmark nhỏ
- Click vào card trong list = jump tới card đó
- Không hiển thị nội dung back — chỉ hiển thị số + front truncated

**Khi embedded trong VideoSidebar** (sidebar hẹp ~380px):
- Layout 1 cột (không đủ chỗ split)
- Tương tự mobile layout nhưng có hover state

---

## Layout Mobile (< 768px) — Full-Screen Swipeable

### Concept: "Tinder-style Card Stack"

```
┌───────────────────────┐
│  Địa Chi              │  ← category badge (góc trái trên)
│  ─────────────────    │
│  5 / 20               │  ← progress text
│  ██████░░░░░░░░░░░░░  │  ← progress bar (thin, gold)
│                       │
│  ╔═══════════════════╗│
│  ║                   ║│  ← card shadow stack effect
│  ║   Địa Chi là gì?  ║│     (2-3 cards peeking behind)
│  ║                   ║│
│  ║   [Hình ảnh nếu   ║│
│  ║    có diagram]    ║│
│  ║                   ║│
│  ╚═══════════════════╝│
│                       │
│  ↕ Chạm để lật thẻ    │  ← animated bounce arrow
│                       │
│  ◀────────────────▶   │  ← swipe indicator (dots left/right)
│                       │
└───────────────────────┘
```

**Cơ chế swipe:**
- Swipe LEFT = next card (giữ nguyên behavior hiện tại)
- Swipe RIGHT = previous card (giữ nguyên)
- Swipe UP hoặc tap = flip card
- Tap anywhere = flip (giữ nguyên)

**Card stack visual:**
- 2 cards "peeking" phía sau card hiện tại (offset nhỏ + opacity thấp hơn)
- Tạo cảm giác có "bộ bài" thật
- Implement bằng `::before`/`::after` pseudo-elements hoặc 2 div tĩnh

**Swipe animation:**
- Khi swipe sang card tiếp theo: card hiện tại trượt ra (translateX -100%) + fade
- Card mới vào từ bên phải (translateX 100% → 0)
- Duration 250ms, easing ease-out

**Progress bar thay vì dots:**
- Thin bar (4px height) ở trên card
- Màu accent-gold fill
- Không dùng dots (quá nhỏ, khó đọc khi 20 items)

---

## Interaction Patterns

### Desktop
| Action | Keyboard | Mouse |
|--------|----------|-------|
| Lật thẻ | `Space` hoặc `Enter` | Click card |
| Card tiếp theo | `→` hoặc `L` | Button "Sau" |
| Card trước | `←` hoặc `J` | Button "Trước" |
| Jump to card N | (không hỗ trợ) | Click trong card list |

**Keyboard hint bar** (chỉ hiển thị trên desktop, ẩn đi sau 5 giây khi user bắt đầu dùng keyboard):
```
Phím tắt: ← → di chuyển | Space lật thẻ
```

### Mobile
| Action | Gesture |
|--------|---------|
| Lật thẻ | Tap card, hoặc swipe UP |
| Card tiếp theo | Swipe LEFT |
| Card trước | Swipe RIGHT |

**Visual affordance cho swipe:** Hiển thị mũi tên nhỏ mờ ở 2 bên card (left/right), giúp user nhận ra có thể swipe. Mờ dần sau khi user đã swipe lần đầu (localStorage flag).

---

## Card Content Design

### Typography
- **Front text (câu hỏi)**: `font-size: clamp(1rem, 2.5vw, 1.3rem)`, `font-weight: 600`
- **Back text (câu trả lời)**: `font-size: clamp(0.9rem, 2vw, 1.1rem)`, `font-weight: 400`, line-height 1.7
- **Category badge**: Giữ nguyên style hiện tại (gold uppercase, 0.68rem)
- **Hán tự / ký tự đặc biệt**: `font-family: 'Noto Serif SC', serif` fallback — Thiên Thư nội dung Phong Thủy có thể có chữ Hán

### Image/Diagram Support
Bổ sung support cho card có `image_url` field (cần extend model nếu muốn, hoặc dùng Markdown trong front/back text):

**Option A (không cần BE change):** Parse Markdown trong front/back text, render `![alt](url)` thành `<img>`. Dùng `marked.js` hoặc regex đơn giản.

**Option B (cần BE):** Thêm `image_url` field vào Flashcard model, frontend render riêng.

**Image layout trong card:**
```
┌─────────────────────┐
│  [Category]         │
│                     │
│  [Hình ảnh — max    │
│   height 140px,     │
│   object-fit cover] │
│                     │
│  Nội dung text      │
│  mô tả / câu hỏi   │
└─────────────────────┘
```

### Card Faces — Visual Differentiation
- **Front face** (câu hỏi): Background `var(--bg-card)` = `#1A262D` — đậm hơn
- **Back face** (câu trả lời): Background nhạt hơn 1 tông, ví dụ `#1E2F38` hoặc có subtle gold tint `rgba(214, 158, 46, 0.05)` — giúp user nhận ra ngay "đây là mặt đáp án"

### Completion Screen
Màn hình kết thúc session hiện tại quá đơn giản. Đề xuất:
```
┌────────────────────────────┐
│                            │
│   Hoàn thành! 🎉           │
│                            │
│   Bạn đã xem 20 thẻ        │
│   về Địa Chi               │  ← tên category/lesson
│                            │
│   [🔀 Bộ mới ngẫu nhiên]  │
│   [📖 Xem lại tất cả]     │  ← review mode (optional V2)
│                            │
└────────────────────────────┘
```

---

## Tại sao phù hợp với Thiên Thư

1. **Nội dung phức tạp**: Phong Thủy, Kỳ Môn có nhiều khái niệm trừu tượng (La Bàn, Bát Quái, 60 Hoa Giáp). Split-panel desktop cho phép user theo dõi toàn bộ session khi study, không bị mất context.

2. **Học giả lớn tuổi**: Đối tượng học Phong Thủy thường là người lớn tuổi, thích học trên desktop. Keyboard shortcut và layout rõ ràng giúp UX mượt hơn.

3. **Học trên mobile khi di chuyển**: Swipe gesture tự nhiên, card stack visual tạo cảm giác "giở thẻ" như học truyền thống — phù hợp với aesthetic cổ điển của platform.

4. **Consistency với design system**: Màu gold (`--accent-gold`), dark navy (`--bg-card`) được giữ nguyên — chỉ cải thiện layout và interaction, không phá vỡ visual identity.

5. **Đặc thù nội dung hình ảnh**: Phong Thủy có nhiều sơ đồ (Tiên Thiên Bát Quái, Hậu Thiên Bát Quái, Lạc Thư, Hà Đồ). Image support trong card là yêu cầu tự nhiên cho platform này.

---

## Inspiration từ market

| App | Feature lấy cảm hứng |
|-----|---------------------|
| **Anki** | Card list sidebar trong Anki 3.0 proposal, keyboard shortcuts (Space/Enter flip, ←→ navigate) |
| **Quizlet** | Progress bar thay dots, card stack visual, "tap to flip" hint với animation |
| **Duolingo** | Swipe gesture mobile, visual affordance cues (mũi tên nhỏ), completion screen celebration |
| **RemNote** | Split panel: card on left, outline/notes on right |
| **Brainscape** | Subtle card face differentiation (front vs back màu khác) |

---

## Scope gợi ý cho V1

**Implement ngay (low risk, high impact):**
1. Progress bar thay thế dot indicators — 1 change nhỏ, impact lớn trên mobile
2. Hover state rõ ràng cho card trên desktop (box-shadow + translate)
3. Back face có subtle background khác front face
4. Keyboard shortcut: Space lật, ← → navigate (thêm `useEventListener` trong script setup)
5. Swipe UP = flip card (bổ sung vào touch handler hiện tại — chỉ cần thêm touchStartY)

**V1.5 — layout chia đôi desktop:**
6. Detect viewport width, render split-panel layout khi `!embedded && width >= 768`
7. Card list panel bên phải (scrollable, tên cards truncated)

**V2 — image support + card stack:**
8. Card stack visual (pseudo-elements)
9. Swipe animation (slide-out/in)
10. Image/diagram support (parse markdown URL hoặc dedicated field)
11. Completion screen cải tiến (hiển thị lesson/chapter name)

---

## Open questions

1. **Embedded vs Standalone**: Split-panel chỉ apply khi `!embedded` (TrainingView), hay cũng apply khi sidebar đủ rộng (>= 400px)? Cần breakpoint riêng trong component hay detect từ parent?

2. **Card list sidebar**: Có hiển thị nội dung front text không? Nếu có → user có thể "nhìn trước" câu hỏi → giảm giá trị học. Đề xuất: chỉ hiển thị số thứ tự + category, không hiển thị nội dung.

3. **Image trong flashcard**: Cần extend Flashcard model (`image_url` field) hay chỉ cần parse URL trong text? Nếu extend → cần migration + admin UI update → V2 scope.

4. **Font chữ Hán**: Nội dung Thiên Thư có nhiều chữ Hán (甲乙丙丁...). Có cần load Google Fonts Noto Serif SC không, hay system font đủ dùng trên macOS/Windows?

5. **Completion screen**: "Xem lại tất cả" (review mode — user có thể scroll qua tất cả cards đã xem) có vào scope V1 không? Khả thi: chỉ reset index về 0 và disable auto-advance, user tự navigate.

6. **Swipe animation**: CSS transition đơn giản hay Framer Motion / GSAP? Với Vue 3 có thể dùng `<Transition>` built-in với `mode="out-in"` là đủ — không cần external lib.

---

## Bước tiếp theo

1. **PO review**: Xác nhận scope V1 (5 items nhỏ) vs V1.5 (split-panel)
2. **Design mockup** (nếu cần): Wireframe split-panel desktop trong Figma trước khi implement
3. **Tạo design doc**: `md/design/feature-12-detail-design.md` nếu PO approve
4. **Implement**: Tất cả thay đổi V1 chỉ cần sửa `FlashcardSession.vue` (và CSS scoped bên trong), không đụng backend

**Prerequisite:** Không có — feature này hoàn toàn frontend, không phụ thuộc sprint hiện tại.
