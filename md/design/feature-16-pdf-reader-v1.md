# Feature 16: PDF Reader V1 — UX & DRM Improvements

**Ngày tạo:** 2026-03-13
**Status:** 📝 Design
**Priority:** Medium
**Effort ước tính:** S (~2 ngày)
**Stack:** Frontend only — `BookReaderView.vue` + new composable `useBreakpoint.js`
**Idea doc:** `md/idea/pdf-reading-experience.md`

---

## Mục tiêu

Cải thiện trải nghiệm đọc sách trên desktop (keyboard shortcuts, split-panel layout) và tăng cường bảo vệ bản quyền nội dung (blur khi mất focus, chặn right-click) — toàn bộ thay đổi frontend-only.

---

## Scope V1

3 items được chọn dựa trên impact/effort:

1. **Keyboard shortcuts** — navigation + zoom + toggle TOC
2. **Desktop split-panel layout** — TOC cố định bên phải trên ≥1024px
3. **DRM Protection** — blur canvas khi tab mất focus + right-click prevention

**Không làm trong V1:**
- Estimated reading time (defer V2 — nice-to-have)
- Text Layer / highlight / annotation (defer V2+)
- Bookmark (defer V2 — cần backend model)
- Dark/sepia mode (defer V2)
- Pre-fetch chapter tiếp theo (defer V2)

---

## Phân tích code hiện tại (BookReaderView.vue)

### State/refs quan trọng
```
currentPage       ref(1)           — trang hiện tại trong chương
chapterPageCount  ref(0)           — tổng số trang chương hiện tại
currentChapterOrder ref(1)         — order của chương đang đọc
showToc           ref(false)       — toggle TOC panel
showZoom          ref(false)       — toggle zoom popup
zoomLevel         ref(1.0)         — zoom hiện tại
isTrainingOpen    ref(false)       — toggle Training Drawer (quan trọng cho keyboard guard)
ZOOM_STEPS        [0.5,0.75,1.0,1.25,1.5,2.0]  — các mức zoom
canvasRef         ref(null)        — canvas element
hasPrev           computed         — còn trang/chương trước không
hasNext           computed         — còn trang/chương sau không
```

### Functions navigation
```
nextPage()        — qua trang sau, hoặc sang chương tiếp nếu hết trang
prevPage()        — về trang trước, hoặc về chương trước trang cuối
goToPage(num)     — nhảy tới trang cụ thể trong chương
goToChapter(order)— nhảy tới chương khác, reset về trang 1
zoomIn()          — tăng zoom theo ZOOM_STEPS
zoomOut()         — giảm zoom theo ZOOM_STEPS
```

### Layout hiện tại
- `.reader` — `position: fixed; inset: 0; display: flex; flex-direction: column; background: #1a2035`
- TOC là **overlay toàn màn hình** (`position: fixed; inset: 0; z-index: 200`), slide từ phải vào
- `.reader__toc-panel` — `width: min(320px, 85vw)`, slide-in với Transition `toc`
- `.reader__content` — `flex: 1`, chứa canvas wrap
- Toggle TOC: `showToc = !showToc` (button trong topbar)

### Keyboard / touch hiện có
- Touch swipe: `onTouchStart` / `onTouchEnd` — swipe ngang để chuyển trang
- **Không có** keyboard handler nào

### CSS classes chính
- `.reader` — container cố định toàn màn hình
- `.reader__topbar` — thanh trên
- `.reader__content` — vùng nội dung scrollable
- `.reader__canvas-wrap` — wrapper của canvas + watermark
- `.reader__canvas` — canvas pdf.js
- `.reader__watermark` — watermark overlay, `pointer-events: none`
- `.reader__toc` — overlay backdrop
- `.reader__toc-panel` — panel nội dung TOC

---

## New Composable: `useBreakpoint.js`

### Vấn đề hiện tại

`FlashcardSession.vue` và `BookReaderView.vue` (sau Feature 16) đều cần detect viewport width để switch layout. Hiện tại `FlashcardSession.vue` đã inline `windowWidth` + `onResize`. Cần tách ra composable để reuse.

### File mới: `src/frontend/src/composables/useBreakpoint.js`

```js
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * Composable để detect viewport breakpoints.
 * Reusable across components that need responsive layout switching.
 *
 * Breakpoints (consistent with Tailwind defaults):
 *   sm  >= 640px
 *   md  >= 768px
 *   lg  >= 1024px
 *   xl  >= 1280px
 */
export function useBreakpoint() {
  const windowWidth = ref(window.innerWidth)

  function onResize() {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))

  return {
    windowWidth,
    isSm:  computed(() => windowWidth.value >= 640),
    isMd:  computed(() => windowWidth.value >= 768),
    isLg:  computed(() => windowWidth.value >= 1024),
    isXl:  computed(() => windowWidth.value >= 1280),
  }
}
```

### Cách dùng

**BookReaderView.vue:**
```js
import { useBreakpoint } from '../composables/useBreakpoint'
const { isLg: isDesktop } = useBreakpoint()
// isDesktop thay thế windowWidth + computed isDesktop inline
```

**FlashcardSession.vue** (refactor cùng lúc):
```js
import { useBreakpoint } from '../../composables/useBreakpoint'
const { isMd } = useBreakpoint()
// isSplitPanel = computed(() => !props.embedded && isMd.value)
// Xóa windowWidth ref + onResize function + resize listener trong lifecycle
```

### Lưu ý
- `onMounted` / `onBeforeUnmount` nằm trong composable — mỗi component gọi `useBreakpoint()` sẽ có listener riêng, không share state. Đây là behavior đúng (Vue composable pattern).
- `window.innerWidth` được đọc lại khi `resize` fire — không debounce vì resize handler nhẹ, không cần optimize ở mức này.

---

## Implementation

### 1. Keyboard Shortcuts

#### Shortcuts map

| Key | Action | Function gọi |
|---|---|---|
| `ArrowLeft` | Trang trước | `prevPage()` |
| `ArrowRight` | Trang tiếp | `nextPage()` |
| `Space` | Trang tiếp (xuống) | `nextPage()` |
| `Shift+Space` | Trang trước (lên) | `prevPage()` |
| `+` hoặc `=` | Zoom in | `zoomIn()` |
| `-` | Zoom out | `zoomOut()` |
| `t` hoặc `T` | Toggle TOC | `showToc.value = !showToc.value` |
| `Escape` | Đóng TOC (nếu mở), hoặc đóng zoom popup | logic inline |

#### Code snippet

```js
// Thêm vào onMounted:
document.addEventListener('keydown', onKeyDown)

// Thêm vào onBeforeUnmount:
document.removeEventListener('keydown', onKeyDown)

// Function — thêm sau phần Touch/swipe:
function onKeyDown(e) {
  // Guard 1: không trigger khi user đang focus vào input / textarea / select
  const tag = document.activeElement?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return

  // Guard 2: không trigger khi Training Drawer đang mở
  // (FlashcardSession.vue có keyboard handler riêng; tránh conflict ArrowLeft/Right)
  if (isTrainingOpen.value) return

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      prevPage()
      break
    case 'ArrowRight':
      e.preventDefault()
      nextPage()
      break
    case ' ':
      e.preventDefault()
      if (e.shiftKey) prevPage()
      else nextPage()
      break
    case '+':
    case '=':
      e.preventDefault()
      zoomIn()
      break
    case '-':
      e.preventDefault()
      zoomOut()
      break
    case 't':
    case 'T':
      e.preventDefault()
      showToc.value = !showToc.value
      showZoom.value = false
      break
    case 'Escape':
      if (showToc.value) showToc.value = false
      else if (showZoom.value) showZoom.value = false
      break
  }
}
```

#### Notes
- Guard `isTrainingOpen.value` ngăn conflict với `FlashcardSession.vue` keyboard handler khi TrainingDrawer mở
- Guard `document.activeElement.tagName` là chuẩn — reuse pattern từ `FlashcardSession.vue`
- `Space` cần `e.preventDefault()` để ngăn scroll trang
- `ArrowLeft/Right` cần `e.preventDefault()` để ngăn scroll horizontal
- `T` uppercase cũng handle vì user có thể bật CapsLock

---

### 2. Desktop Split-Panel Layout (≥1024px)

#### Phân tích layout hiện tại

TOC hiện tại là **overlay** (`position: fixed; inset: 0; z-index: 200`) — hiển thị phủ lên toàn màn hình, cần dismiss. Trên desktop, muốn TOC luôn visible ở bên phải mà không cần toggle.

**Chọn bên phải** vì TOC panel hiện tại slide từ phải — consistent với behavior mobile/tablet, không cần thay đổi animation.

#### State — dùng `useBreakpoint` composable

```js
import { useBreakpoint } from '../composables/useBreakpoint'

// Thêm vào script setup (thay thế windowWidth + computed isDesktop inline):
const { isLg: isDesktop } = useBreakpoint()
// Không cần windowWidth ref, onWindowResize function, hoặc resize listener riêng
```

#### Template changes

**Cấu trúc mới:** Bọc `reader__content` và TOC trong `reader__body` — một "body row" để flex-direction thay đổi theo breakpoint:

```html
<!-- Cấu trúc mới: -->
<div class="reader">
  <!-- topbar (giữ nguyên) -->
  <div class="reader__topbar">...</div>

  <!-- body: flex-row trên desktop, flex-col trên mobile -->
  <div class="reader__body" :class="{ 'reader__body--desktop': isDesktop }">

    <!-- TOC: di chuyển vào đây, không còn position:fixed trên desktop -->
    <Transition :name="isDesktop ? '' : 'toc'">
      <div
        v-if="showToc || isDesktop"
        class="reader__toc"
        :class="{ 'reader__toc--desktop': isDesktop }"
        @click.self="!isDesktop && (showToc = false)"
      >
        <div class="reader__toc-panel">
          <div class="reader__toc-header">
            <span>Mục lục</span>
            <!-- Ẩn nút đóng trên desktop: sidebar cố định, không cần dismiss -->
            <button v-if="!isDesktop" class="reader__icon-btn" @click="showToc = false">
              <!-- X icon -->
            </button>
          </div>
          <div class="reader__toc-list">
            <!-- items giữ nguyên -->
          </div>
        </div>
      </div>
    </Transition>

    <!-- Content -->
    <div class="reader__content" ...>...</div>
  </div>

  <!-- progress bar + bottom nav (giữ nguyên) -->
</div>
```

**Lưu ý quan trọng về Transition:** Dùng `:name="isDesktop ? '' : 'toc'"` để **tắt animation khi desktop mode** — khi resize sang desktop, TOC xuất hiện ngay không slide-in (không phù hợp với sidebar). Trên mobile/tablet thì vẫn slide bình thường.

#### CSS changes

```css
/* ── Body row (wrap TOC + content) ───────────────────────── */
.reader__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.reader__body--desktop {
  flex-direction: row;
}

/* ── TOC — desktop mode (không còn position:fixed) ──────── */
.reader__toc--desktop {
  position: static;          /* ghi đè position: fixed */
  background: transparent;   /* bỏ backdrop rgba(0,0,0,0.6) */
  z-index: auto;             /* reset z-index: 200 */
  width: 260px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  order: 1;                  /* TOC bên phải, content bên trái */
}

/* Override width: min(320px, 85vw) của panel trên desktop */
.reader__toc--desktop .reader__toc-panel {
  width: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

/* TOC list chiếm full height trong sidebar */
.reader__toc--desktop .reader__toc-list {
  flex: 1;
  overflow-y: auto;
}

/* ── Content expand khi có TOC sidebar ────────────────────── */
.reader__body--desktop .reader__content {
  flex: 1;
  min-width: 0;
  order: 0;                  /* content bên trái */
}
```

**Lưu ý về `order`:** Dùng `order: 0` (content) và `order: 1` (TOC) để đảm bảo content luôn bên trái, TOC bên phải — không phụ thuộc vào thứ tự render trong DOM (TOC được render trước content trong template để Transition hoạt động đúng).

#### Behavior chi tiết

| State | Layout |
|---|---|
| `windowWidth < 1024px` | TOC là overlay (behavior hiện tại, `showToc` toggle, có Transition `toc`) |
| `windowWidth >= 1024px` | TOC là sidebar cố định bên phải, luôn visible, không có Transition |
| Resize từ desktop → mobile | TOC sidebar ẩn (nếu `showToc = false`), chuyển về overlay mode |
| Resize từ mobile → desktop | TOC sidebar hiện lại tự động, không animation |

#### Notes
- TOC width desktop: **260px** (đủ để title không bị truncate)
- Nút toggle TOC trong topbar vẫn giữ nguyên — hữu ích trên tablet (768–1023px), không cần thêm logic ẩn
- `reader__content` đã có `overflow-y: auto` — giữ nguyên

---

### 3. DRM Protection — Blur + Right-click Prevention

#### State mới

```js
const isBlurred = ref(false)
```

#### visibilitychange listener

```js
function onVisibilityChange() {
  isBlurred.value = document.hidden
}

// Thêm vào onMounted:
document.addEventListener('visibilitychange', onVisibilityChange)

// Thêm vào onBeforeUnmount:
document.removeEventListener('visibilitychange', onVisibilityChange)
```

#### Template — class binding và contextmenu

```html
<!-- Root reader: thêm @contextmenu.prevent để cover cả topbar, bottom nav -->
<div class="reader" @contextmenu.prevent>

<!-- reader__canvas-wrap: thêm blur class -->
<div
  v-else
  class="reader__canvas-wrap"
  :class="{ 'reader__canvas-wrap--blurred': isBlurred }"
>
```

**`@contextmenu.prevent` đặt trên root `.reader`** — cover toàn bộ reader view, kể cả khi canvas chưa load xong.

#### CSS

```css
/* ── DRM blur ─────────────────────────────────────────────── */
.reader__canvas-wrap--blurred canvas {
  filter: blur(14px);
  pointer-events: none;
}

/* Ngăn text selection trên canvas wrap (phòng TextLayer tương lai) */
.reader__canvas-wrap {
  /* thêm vào rule hiện tại: */
  user-select: none;
}
```

**Lưu ý về `user-select: none`:** V1 add lên canvas-wrap. Khi V2 implement TextLayer (cho phép copy text), cần bỏ `user-select: none` và dùng approach khác (chỉ allow select trong text layer element).

#### Notes
- `document.hidden = true` khi: tab bị ẩn, window minimize, màn hình khóa
- Blur **chỉ apply lên canvas** — topbar, bottom nav, progress bar vẫn hiện bình thường
- Khi tab active lại, `document.hidden = false` → `isBlurred = false` → canvas clear ngay
- `filter: blur(14px)` đủ để obscure nội dung nhưng user vẫn biết đang ở chương/trang nào
- `visibilitychange` cũng fire khi mobile browser bị background — behavior đúng, không cần guard

---

## Files cần thay đổi

| File | Action | Nội dung thay đổi |
|---|---|---|
| `src/frontend/src/composables/useBreakpoint.js` | CREATE | Composable reactive breakpoints (sm/md/lg/xl) |
| `src/frontend/src/views/BookReaderView.vue` | MODIFY | Keyboard handler, `useBreakpoint`, visibilitychange, isDesktop layout, blur class, contextmenu prevent, CSS mới |
| `src/frontend/src/components/training/FlashcardSession.vue` | MODIFY | Refactor: thay inline `windowWidth` + `onResize` bằng `useBreakpoint()` |

---

## Checklist implement

### 0. Composable `useBreakpoint.js` (làm trước)
- [ ] Tạo `src/frontend/src/composables/useBreakpoint.js`
- [ ] Export `useBreakpoint()` trả về `{ windowWidth, isSm, isMd, isLg, isXl }`
- [ ] `onMounted` / `onBeforeUnmount` quản lý resize listener bên trong composable

### 1. Keyboard shortcuts (BookReaderView.vue)
- [ ] Thêm `onKeyDown(e)` function với switch/case đầy đủ
- [ ] Guard 1: skip nếu `activeElement` là input/textarea/select
- [ ] Guard 2: skip nếu `isTrainingOpen.value === true`
- [ ] Bind `document.addEventListener('keydown', onKeyDown)` trong `onMounted`
- [ ] Unbind trong `onBeforeUnmount`

### 2. Desktop split-panel (BookReaderView.vue)
- [ ] Import và dùng `useBreakpoint`: `const { isLg: isDesktop } = useBreakpoint()`
- [ ] Xóa `windowWidth ref` + `onWindowResize` function + `resize listener` nếu có (dùng composable thay)
- [ ] Wrap `reader__content` và TOC trong `reader__body` div
- [ ] TOC: đổi `v-if="showToc"` → `v-if="showToc || isDesktop"`
- [ ] TOC: đổi `<Transition name="toc">` → `<Transition :name="isDesktop ? '' : 'toc'">`
- [ ] TOC: thêm `:class="{ 'reader__toc--desktop': isDesktop }"`
- [ ] TOC backdrop click: guard `!isDesktop && (showToc = false)`
- [ ] TOC close button: thêm `v-if="!isDesktop"`
- [ ] Thêm CSS: `.reader__body`, `.reader__body--desktop`, `.reader__toc--desktop` (và sub-selectors), `order` values

### 3. DRM protection (BookReaderView.vue)
- [ ] Thêm `const isBlurred = ref(false)`
- [ ] Thêm `onVisibilityChange()` function
- [ ] Bind `visibilitychange` listener trong `onMounted`, unbind trong `onBeforeUnmount`
- [ ] Thêm `@contextmenu.prevent` vào root `.reader` div
- [ ] Thêm `:class="{ 'reader__canvas-wrap--blurred': isBlurred }"` vào `reader__canvas-wrap`
- [ ] Thêm CSS: `.reader__canvas-wrap--blurred canvas`, `user-select: none` vào `.reader__canvas-wrap`

### 4. Refactor FlashcardSession.vue
- [ ] Import `useBreakpoint` từ `'../../composables/useBreakpoint'`
- [ ] Thêm `const { isMd } = useBreakpoint()`
- [ ] Đổi `isSplitPanel` computed: `!props.embedded && isMd.value`
- [ ] Xóa `windowWidth` ref, `onResize` function, và `resize` event listener trong lifecycle hooks

### Testing
- [ ] Keyboard: ArrowLeft/Right chuyển trang đúng, Space đúng
- [ ] Keyboard: +/= zoom in, - zoom out
- [ ] Keyboard: T toggle TOC, Escape đóng TOC/zoom
- [ ] Keyboard guard 1: không fire khi focus vào input (nếu có)
- [ ] Keyboard guard 2: không fire khi TrainingDrawer đang mở
- [ ] Resize desktop → mobile: TOC chuyển về overlay (có slide animation)
- [ ] Resize mobile → desktop: TOC sidebar hiện lại không animation
- [ ] Desktop layout: TOC sidebar cố định bên phải, content chiếm phần còn lại
- [ ] Minimize/switch tab: canvas bị blur
- [ ] Tab active lại: canvas clear ngay
- [ ] Right-click trên toàn reader: context menu không hiện
- [ ] FlashcardSession split-panel vẫn hoạt động đúng (isMd ≥ 768px)
- [ ] Test Chrome + Firefox + Safari (keydown behavior khác với Space)

---

## Trade-off & lưu ý khi implement

1. **`useBreakpoint` mỗi component có listener riêng**: Mỗi component gọi `useBreakpoint()` sẽ tạo một `resize` listener riêng. Ở quy mô hiện tại (vài component), không phải vấn đề. Nếu sau này nhiều component dùng cùng lúc, có thể convert sang singleton pattern (module-level ref + one listener).

2. **TOC `order` vs DOM order**: Dùng CSS `order` để đảm bảo content (order: 0) luôn bên trái, TOC (order: 1) bên phải trong flex row — không cần đổi thứ tự DOM. Điều này giữ Transition logic đơn giản.

3. **TOC Transition tắt trên desktop**: `:name="isDesktop ? '' : 'toc'"` — khi `isDesktop` thay đổi (resize), TOC appear/disappear không có animation. Đây là UX đúng vì sidebar xuất hiện là layout change, không phải panel toggle.

4. **blur và `user-select` với TextLayer tương lai**: V1 add `user-select: none` lên canvas-wrap. Khi V2 implement TextLayer, cần revisit — canvas natively không có text selection nhưng TextLayer overlay thì có.

5. **Right-click `@contextmenu.prevent` trên root**: Chặn hoàn toàn context menu trong reader view. Không phải silver bullet (devtools vẫn bypass), nhưng đủ cho casual user. Nhất quán với DRM approach của platform.

6. **`isTrainingOpen` guard trong keyboard**: Ref này đã tồn tại trong `BookReaderView.vue` để control `TrainingDrawer`. Không cần thêm state mới, chỉ cần reference đúng tên ref.
