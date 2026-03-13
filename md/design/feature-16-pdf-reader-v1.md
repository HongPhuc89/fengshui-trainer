# Feature 16: PDF Reader V1 — UX & DRM Improvements

**Ngày tạo:** 2026-03-13
**Status:** 📝 Design
**Priority:** Medium
**Effort ước tính:** S (~2 ngày)
**Stack:** Frontend only — `BookReaderView.vue` only, không cần backend changes
**Idea doc:** `md/idea/pdf-reading-experience.md`

---

## Mục tiêu

Cải thiện trải nghiệm đọc sách trên desktop (keyboard shortcuts, split-panel layout) và tăng cường bảo vệ bản quyền nội dung (blur khi mất focus, chặn right-click) — toàn bộ thay đổi frontend-only trong `BookReaderView.vue`.

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

#### Code snippet — thêm vào `onMounted` / `onBeforeUnmount`

```js
// Thêm vào onMounted (sau phần load hiện tại):
document.addEventListener('keydown', onKeyDown)

// Thêm vào onBeforeUnmount (sau clearTimeout/cancel hiện tại):
document.removeEventListener('keydown', onKeyDown)

// Function mới — thêm sau phần Touch/swipe:
function onKeyDown(e) {
  // Guard: không trigger khi user đang focus vào input / textarea / select
  const tag = document.activeElement?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return

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
- Guard `document.activeElement.tagName` là chuẩn — reuse pattern từ `FlashcardSession.vue`
- `Space` cần `e.preventDefault()` để ngăn scroll trang
- `ArrowLeft/Right` cần `e.preventDefault()` để ngăn scroll horizontal
- `T` uppercase cũng handle vì user có thể bật CapsLock

---

### 2. Desktop Split-Panel Layout (≥1024px)

#### Phân tích layout hiện tại

TOC hiện tại là **overlay** (`position: fixed; inset: 0; z-index: 200`) — hiển thị phủ lên toàn màn hình, cần dismiss. Trên desktop, muốn TOC luôn visible ở bên phải mà không cần toggle.

**Chọn bên phải** vì TOC panel hiện tại slide từ phải — consistent với behavior mobile/tablet, không cần thay đổi animation.

#### State mới cần thêm

```js
// Thêm vào phần State (sau touchStartY):
const windowWidth = ref(window.innerWidth)

// Computed mới:
const isDesktop = computed(() => windowWidth.value >= 1024)

// Functions mới — thêm sau onTouchEnd:
function onWindowResize() {
  windowWidth.value = window.innerWidth
}
```

#### onMounted / onBeforeUnmount

```js
// Thêm vào onMounted:
window.addEventListener('resize', onWindowResize)

// Thêm vào onBeforeUnmount:
window.removeEventListener('resize', onWindowResize)
```

#### Template changes

**Điều kiện hiển thị TOC** — trên desktop, TOC luôn visible (không cần `v-if="showToc"`):

```html
<!-- BEFORE -->
<Transition name="toc">
  <div v-if="showToc" class="reader__toc" @click.self="showToc = false">
    ...
  </div>
</Transition>

<!-- AFTER -->
<Transition name="toc">
  <div
    v-if="showToc || isDesktop"
    class="reader__toc"
    :class="{ 'reader__toc--desktop': isDesktop }"
    @click.self="!isDesktop && (showToc = false)"
  >
    <div class="reader__toc-panel">
      <div class="reader__toc-header">
        <span>Mục lục</span>
        <!-- Ẩn nút đóng trên desktop vì không có overlay -->
        <button v-if="!isDesktop" class="reader__icon-btn" @click="showToc = false">
          <!-- X icon -->
        </button>
      </div>
      <!-- toc-list giữ nguyên -->
    </div>
  </div>
</Transition>
```

**Main content area** — dùng grid khi desktop:

```html
<!-- BEFORE -->
<div class="reader__content" ...>

<!-- AFTER -->
<div class="reader__body" :class="{ 'reader__body--desktop': isDesktop }">
  <div class="reader__content" ...>
    ...
  </div>
  <!-- TOC được move ra ngoài reader__content, render trong reader__body -->
</div>
```

**Lưu ý quan trọng về cấu trúc:** TOC panel hiện nằm trong Transition riêng, không trong `reader__content`. Cần tái cấu trúc nhẹ để có một "body row" bao quanh cả `reader__content` và TOC:

```html
<!-- Cấu trúc mới: -->
<div class="reader">
  <!-- topbar (giữ nguyên) -->
  <div class="reader__topbar">...</div>

  <!-- body: flex-row trên desktop, flex-col trên mobile -->
  <div class="reader__body" :class="{ 'reader__body--desktop': isDesktop }">

    <!-- TOC (di chuyển vào đây, không còn position:fixed) -->
    <Transition name="toc">
      <div
        v-if="showToc || isDesktop"
        class="reader__toc"
        :class="{ 'reader__toc--desktop': isDesktop }"
        @click.self="!isDesktop && (showToc = false)"
      >
        <div class="reader__toc-panel">
          <div class="reader__toc-header">
            <span>Mục lục</span>
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
  position: static;        /* ghi đè position: fixed */
  background: transparent; /* bỏ backdrop */
  width: 260px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
}

.reader__toc--desktop .reader__toc-panel {
  width: 100%;             /* fill 260px */
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

/* Desktop TOC: ẩn header (không cần "Mục lục" title khi sidebar cố định) */
/* Hoặc giữ header nhưng bỏ nút X — đã handle qua v-if="!isDesktop" */

/* TOC content chiếm full height trong sidebar */
.reader__toc--desktop .reader__toc-list {
  overflow-y: auto;
}

/* ── Content expand khi có TOC sidebar ────────────────────── */
.reader__body--desktop .reader__content {
  flex: 1;
  min-width: 0;
}
```

#### Behavior chi tiết

| State | Layout |
|---|---|
| `windowWidth < 1024px` | TOC là overlay (behavior hiện tại, `showToc` toggle) |
| `windowWidth >= 1024px` | TOC là sidebar cố định bên phải, luôn visible, `isDesktop = true` |
| Resize từ desktop → mobile | TOC sidebar ẩn, chuyển về overlay mode |
| Resize từ mobile → desktop | TOC sidebar hiện lại tự động (vì `isDesktop` computed thay đổi) |

#### Notes
- TOC width desktop: **260px** (tăng nhẹ từ gợi ý 240px để TOC title không bị truncate)
- Nút toggle TOC trong topbar vẫn giữ — hữu ích trên tablet (768-1023px), không cần thêm logic ẩn
- `reader__content` đã có `overflow-y: auto` — giữ nguyên
- TOC panel trên desktop đặt bên **phải** (consistent với slide animation hiện tại)
- Transition `toc` vẫn hoạt động bình thường — khi `isDesktop` thay đổi, slide in/out

---

### 3. DRM Protection — Blur + Right-click Prevention

#### 3a. State mới

```js
// Thêm vào phần State:
const isBlurred = ref(false)
```

#### 3b. visibilitychange listener

```js
// Function mới — thêm sau onWindowResize:
function onVisibilityChange() {
  isBlurred.value = document.hidden
}

// Thêm vào onMounted:
document.addEventListener('visibilitychange', onVisibilityChange)

// Thêm vào onBeforeUnmount:
document.removeEventListener('visibilitychange', onVisibilityChange)
```

#### 3c. Template — class binding và contextmenu

```html
<!-- reader__canvas-wrap: thêm blur class + contextmenu prevent -->
<div
  v-else
  class="reader__canvas-wrap"
  :class="{ 'reader__canvas-wrap--blurred': isBlurred }"
  @contextmenu.prevent
>
```

#### 3d. CSS

```css
/* ── DRM blur ─────────────────────────────────────────────── */
.reader__canvas-wrap--blurred canvas {
  filter: blur(14px);
  pointer-events: none;
  user-select: none;
}

/* User-select: none trên toàn canvas wrap (ngăn text selection nếu có text layer sau này) */
.reader__canvas-wrap {
  /* thêm vào rule hiện tại: */
  user-select: none;
}
```

#### 3e. Right-click prevention

`@contextmenu.prevent` đã thêm vào `reader__canvas-wrap` ở trên — không cần thêm nơi khác.

Nếu muốn cover toàn reader (bao gồm topbar), có thể thêm vào `reader` root:

```html
<div class="reader" @contextmenu.prevent>
```

**Khuyến nghị:** Thêm vào root `.reader` để cover tất cả, kể cả khi canvas chưa load.

#### Notes
- `document.hidden` là `true` khi: tab bị ẩn, window bị minimize, hoặc màn hình khóa
- Blur **chỉ apply lên canvas** — topbar, bottom nav, progress bar vẫn hiện bình thường
- Khi tab active lại, `document.hidden = false` → `isBlurred = false` → canvas hiện ngay (không cần user action)
- `filter: blur(14px)` đủ để obscure nội dung nhưng user vẫn biết context (chương nào, trang nào)
- Không show "đang xem ở tab khác" overlay — đơn giản hơn, blur đã đủ effect

---

## Files cần thay đổi

| File | Action | Nội dung thay đổi |
|---|---|---|
| `src/frontend/src/views/BookReaderView.vue` | MODIFY | Tất cả: keyboard handler, resize listener, visibilitychange, isDesktop layout, blur class, contextmenu prevent, CSS mới |

**Không tạo file mới** — toàn bộ thay đổi trong 1 file duy nhất.

---

## Checklist implement

### 1. Keyboard shortcuts
- [ ] Thêm `const onKeyDown = (e) => { ... }` function với switch/case
- [ ] Bind `document.addEventListener('keydown', onKeyDown)` trong `onMounted`
- [ ] Unbind `document.removeEventListener('keydown', onKeyDown)` trong `onBeforeUnmount`
- [ ] Guard: skip nếu `activeElement` là input/textarea/select

### 2. Desktop split-panel
- [ ] Thêm `const windowWidth = ref(window.innerWidth)` vào State section
- [ ] Thêm `const isDesktop = computed(() => windowWidth.value >= 1024)` vào Computed section
- [ ] Thêm `onWindowResize()` function
- [ ] Bind/unbind `resize` listener trong `onMounted` / `onBeforeUnmount`
- [ ] Wrap `reader__content` và TOC trong `reader__body` div
- [ ] TOC: đổi `v-if="showToc"` → `v-if="showToc || isDesktop"`
- [ ] TOC: thêm `:class="{ 'reader__toc--desktop': isDesktop }"`
- [ ] TOC backdrop click: thêm guard `!isDesktop &&` trước `showToc = false`
- [ ] TOC close button: thêm `v-if="!isDesktop"`
- [ ] Thêm CSS: `.reader__body`, `.reader__body--desktop`, `.reader__toc--desktop`, `.reader__toc--desktop .reader__toc-panel`

### 3. DRM protection
- [ ] Thêm `const isBlurred = ref(false)` vào State section
- [ ] Thêm `onVisibilityChange()` function
- [ ] Bind `document.addEventListener('visibilitychange', onVisibilityChange)` trong `onMounted`
- [ ] Unbind trong `onBeforeUnmount`
- [ ] Thêm `:class="{ 'reader__canvas-wrap--blurred': isBlurred }"` vào `reader__canvas-wrap`
- [ ] Thêm `@contextmenu.prevent` vào root `.reader` div
- [ ] Thêm CSS: `.reader__canvas-wrap--blurred canvas { filter: blur(14px); ... }`
- [ ] Thêm `user-select: none` vào `.reader__canvas-wrap` CSS rule

### Testing
- [ ] Keyboard: ArrowLeft/Right chuyển trang đúng, Space đúng
- [ ] Keyboard: +/= zoom in, - zoom out
- [ ] Keyboard: T toggle TOC, Escape đóng TOC/zoom
- [ ] Keyboard guard: không fire khi focus vào input (nếu có input nào trong view)
- [ ] Resize desktop → mobile: TOC chuyển về overlay
- [ ] Resize mobile → desktop: TOC sidebar hiện lại
- [ ] Desktop layout: TOC sidebar cố định bên phải, content chiếm phần còn lại
- [ ] Minimize/switch tab: canvas bị blur
- [ ] Tab active lại: canvas clear ngay
- [ ] Right-click trên canvas: context menu không hiện
- [ ] Right-click trên topbar: context menu không hiện (nếu thêm vào root)
- [ ] Test Chrome + Firefox + Safari (keydown behavior khác nhau với Space)

---

## Trade-off & lưu ý khi implement

1. **TOC position trong DOM**: TOC hiện là sibling của `reader__content` (ngoài `reader__content`). Khi thêm `reader__body` wrapper, cần chắc chắn không break flexbox của `.reader` (đã là `flex-direction: column` — `reader__body` sẽ là child flex item, `flex: 1` để chiếm toàn bộ space còn lại giữa topbar và bottom nav).

2. **TOC Transition khi isDesktop**: Khi resize sang desktop, `v-if="showToc || isDesktop"` từ `false` → `true` sẽ trigger Transition `toc`. Transition hiện tại là slide từ phải — trên desktop không muốn animation này. Giải pháp: disable transition trên desktop bằng `<Transition :name="isDesktop ? '' : 'toc'">`.

3. **TOC overlay backdrop vs sidebar**: `reader__toc` hiện có `background: rgba(0,0,0,0.6)` làm backdrop. Trên desktop mode (`.reader__toc--desktop`), cần override thành `background: transparent` và `position: static` để không phủ lên content.

4. **z-index của TOC overlay**: `reader__toc` hiện có `z-index: 200`. Trên desktop mode, `z-index` không cần thiết (static position) — không cần xử lý thêm vì `z-index` chỉ áp dụng cho positioned elements.

5. **blur và visibilitychange trên mobile**: `visibilitychange` cũng fire khi mobile browser bị background — behavior đúng và mong muốn. Không cần guard riêng cho mobile.

6. **Right-click `@contextmenu.prevent` trên root**: Chặn context menu của browser hoàn toàn trong reader view. User vẫn có thể dùng devtools → không phải silver bullet, nhưng đủ cho casual user. Consistent với pattern F-I backlog.

7. **`user-select: none` vs text layer tương lai**: V1 add `user-select: none` lên canvas-wrap (canvas không có text selection natively). Khi V2 implement TextLayer, cần bỏ `user-select: none` và thay bằng logic phức tạp hơn (chỉ allow select trong text layer, block ở canvas).

8. **`isDesktop` threshold 1024px**: Consistent với breakpoint thường dùng trong codebase (mention trong F-I: `1024px+`). Không dùng CSS media query thuần vì cần Vue reactivity để điều khiển `v-if`.
