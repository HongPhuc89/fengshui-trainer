# Feature 12 — Modern Flashcard UI (V1 + V1.5)

**Ngày tạo:** 2026-03-06
**Trạng thái:** Draft
**Tác giả:** Technical Lead
**PO Approved:** V1 (Approve with minor fixes), V1.5 (Conditional Approve)

---

## 1. Mục tiêu

`FlashcardSession.vue` sau Feature 10 hoạt động đúng về logic nhưng UX chưa tốt ở 2 khía cạnh:

1. **Progress feedback kém**: Dots indicator khó đọc với 20 cards, không có thanh tiến trình rõ ràng.
2. **Desktop bị lãng phí không gian**: Khi dùng standalone (`TrainingView.vue`), card chiếm full-width nhưng layout không tận dụng được không gian hai cột. Không có keyboard shortcut cho power user.
3. **Mobile thiếu gesture**: Chỉ có swipe LEFT/RIGHT; swipe UP để flip (gesture tự nhiên hơn) chưa được support.
4. **Thiếu visual feedback**: Không có hover state trên desktop, không phân biệt rõ mặt trước/sau của card.
5. **CJK typography**: Nội dung Phong Thủy chứa chữ Hán (甲乙丙丁, 坎離震兌, 二十四山...) nhưng hiện tại không có font CJK được load, dễ bị tofu box trên Windows.

Feature 12 giải quyết tất cả vấn đề trên chỉ bằng **frontend changes** — không đụng backend.

---

## 2. Phạm vi

### In-scope (V1)
- **12.1** Progress bar thay thế dot indicators
- **12.2** Desktop hover state trên card (box-shadow + translateY)
- **12.3** Back face subtle visual differentiation so với front face
- **12.4** Keyboard shortcuts: Space lật card, ArrowLeft/ArrowRight điều hướng
- **12.5** Swipe UP to flip trên mobile (bổ sung vào touch handler hiện tại)

### In-scope (V1.5)
- **12.6** Split-panel layout trên desktop (≥ 768px, standalone mode — `embedded === false`)
- **12.7** Card list panel bên phải: hiển thị index + category badge, không có front text

### Out-of-scope (V2 — deferred)
- Card stack depth animation (pseudo-elements peeking behind)
- Image/diagram support trong card (cần extend Flashcard model)
- Completion screen redesign với lesson name
- Visual swipe affordance arrows (fade sau khi dùng, localStorage flag)
- "Xem lại tất cả" mode sau completion

---

## 3. Quyết định thiết kế

### 3.1 Font CJK

**Vấn đề:** `base.css` khai báo `font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` — không có font nào có CJK coverage. Trên Windows với system font thiếu CJK, ký tự Hán sẽ bị tofu box (□□□).

**Quyết định: Noto Serif SC từ Google Fonts (preload)**

- **Font được chọn:** `Noto Serif SC` (Simplified Chinese, nhưng có đầy đủ CJK Unified Ideographs bao gồm Traditional Chinese characters dùng trong Phong Thủy cổ điển)
- **Weights cần load:** `400` (body text) và `600` (heading/question text)
- **Subset:** `chinese-simplified` — bao gồm toàn bộ các ký tự Hán thường dùng; Google Fonts tự optimize bằng `unicode-range`
- **Loading strategy:** `<link rel="preconnect">` + `<link rel="stylesheet">` trong `index.html`. Dùng `display=swap` để tránh FOIT (Flash of Invisible Text).

**Fallback chain cho CJK content:**
```css
--font-cjk: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', 'SimSun', serif;
```
- `Source Han Serif SC`: Có sẵn trên macOS Ventura+
- `STSong`: Có sẵn trên macOS (cổ hơn)
- `SimSun`: Có sẵn trên Windows 7+
- `serif`: Final fallback

**CSS variable:** Thêm `--font-cjk` vào `variables.css`. Áp dụng cho `.fc__text` khi component render CJK content.

**Lý do không dùng npm package:** `@fontsource/noto-serif-sc` sẽ bundle ~2MB font vào app build. Google Fonts CDN với `unicode-range` chỉ download subset cần thiết — nhẹ hơn nhiều. Trade-off là phụ thuộc CDN ngoài, nhưng với nội dung học thuật này chấp nhận được.

### 3.2 Emoji rendering

**Tình trạng hiện tại:** `package.json` không có bất kỳ emoji library nào (`twemoji`, `emoji-mart`, etc. đều vắng mặt).

**Các option đánh giá:**

| Option | Pros | Cons |
|--------|------|------|
| `twemoji` (npm) | Cross-platform consistent, Twitter's SVG/PNG emoji | +~100KB bundle, cần parse DOM hoặc dùng `twemoji.parse()` trên text nodes |
| `emoji-mart` (npm) | Full picker UI | ~500KB, overkill — chỉ cần display, không cần picker |
| Plain Unicode system emoji | Zero overhead | Trông khác nhau giữa Windows/macOS/Android (heart có thể là ❤️ hay ❤ tùy OS) |
| SVG icons thay thế | Consistent 100%, no lib needed | Tốn công design/source icons |

**Quyết định: SVG icons thay thế emoji trong component code**

Reasoning:
- Emoji chỉ dùng ở 2 chỗ trong `FlashcardSession.vue`: completion screen (`✅` và `🔀`). Đây là số lượng rất nhỏ.
- `twemoji` cần DOM manipulation (không native Vue) hoặc phải wrap text qua `twemoji.parse()` — thêm complexity không cần thiết cho 2 icon.
- SVG inline đảm bảo consistent look, không phụ thuộc external CDN, và dễ style với CSS variables.
- Trong V1 scope, completion screen không được redesign (deferred V2) — nên chỉ cần giải quyết icon nhỏ, không cần full emoji lib.

**Implementation:** Thay `✅` bằng SVG checkmark icon, thay `🔀` bằng SVG shuffle icon. Cả hai đều inline SVG trong template, dùng `stroke="var(--accent-gold)"` để match design system.

### 3.3 Embedded vs Standalone layout

**Condition cho split-panel:**
```javascript
const isSplitPanel = computed(() => !props.embedded && windowWidth.value >= 768)
```

**Mechanism:**
- `windowWidth` ref được cập nhật qua `window.addEventListener('resize', ...)` trong `onMounted`, unbind trong `onUnmounted`.
- Template dùng `v-if="isSplitPanel"` để render layout khác nhau — không dùng CSS breakpoint đơn thuần vì cần điều kiện `!embedded`.
- Khi `embedded === true` (dùng trong `FlashcardTab.vue` → `VideoSidebar`): luôn dùng single-column layout bất kể viewport width. Sidebar chỉ rộng ~380px, không đủ cho split-panel.

---

## 4. Frontend — Component changes

### 4.1 FlashcardSession.vue changes (V1)

#### Progress bar (thay thế dots)

**Xóa:** Toàn bộ `.fc__dots` / `.fc__dot` / `.fc__dot--active` trong template và CSS.

**Thêm:** Progress bar ở phía trên card, bên trong `.fc__wrap` (trước phần card):

```html
<!-- Progress bar — thêm trước .fc__card, bên trong .fc__wrap -->
<div class="fc__progress-wrap">
  <div class="fc__progress-bar">
    <div
      class="fc__progress-fill"
      :style="{ width: progressPercent + '%' }"
    ></div>
  </div>
  <span class="fc__progress-label">{{ index + 1 }} / {{ flashcards.length }}</span>
</div>
```

**Computed mới:**
```javascript
const progressPercent = computed(() =>
  flashcards.value.length > 0
    ? Math.round(((index.value + 1) / flashcards.value.length) * 100)
    : 0
)
```

**CSS:**
```css
.fc__progress-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}
.fc__progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}
.fc__progress-fill {
  height: 100%;
  background: var(--accent-gold);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.fc__progress-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  min-width: 36px;
  text-align: right;
}
```

#### Hover state (desktop only)

**Condition:** Chỉ áp dụng khi device có pointer (không phải touch-only). Dùng `@media (hover: hover)` để tránh sticky hover state trên mobile.

```css
/* Hover lift effect — chỉ trên device có pointer (desktop) */
@media (hover: hover) {
  .fc__card:not(.fc__card--flipped):hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(214, 158, 46, 0.15);
  }
}
```

**Lưu ý:** Transition cho hover phải được thêm vào rule gốc `.fc__card`, không nằm trong hover rule:
```css
.fc__card {
  /* ... existing ... */
  transition: transform 0.4s ease, box-shadow 0.2s ease;
}
```
Điều này đảm bảo cả flip animation (transform rotateY) và hover (transform translateY) dùng cùng transition property — cần tách ra nếu muốn duration khác nhau. Giải pháp: dùng `will-change: transform` và viết hover transform đầy đủ:

```css
@media (hover: hover) {
  .fc__card:not(.fc__card--flipped):hover {
    transform: translateY(-4px) rotateY(0deg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(214, 158, 46, 0.15);
  }
}
.fc__card--flipped {
  transform: rotateY(180deg) !important;
}
```

Dùng `!important` trên `.fc__card--flipped` để đảm bảo flip state thắng hover transform.

#### Back face visual differentiation

**Mục tiêu:** User nhận ra ngay "đây là mặt đáp án" mà không cần đọc text.

**Implementation:** Chỉ đổi background và thêm border-left cho `.fc__face--back`:

```css
.fc__face--back {
  transform: rotateY(180deg);
  background: rgba(26, 38, 45, 1); /* giữ nguyên --bg-card base */
  /* Thêm: gold tint overlay và left accent border */
  background: linear-gradient(
    135deg,
    rgba(214, 158, 46, 0.06) 0%,
    rgba(26, 38, 45, 1) 60%
  );
  border-left: 2px solid var(--accent-gold);
}
```

**Lý do dùng gradient thay vì `rgba(214,158,46,0.08)` flat:**
- Gradient subtle hơn ở trung tâm (nơi text hiển thị), đậm hơn ở góc trái
- Kết hợp với `border-left` gold tạo visual cue rõ ràng mà không làm chói mắt

#### Keyboard shortcuts

**Phím được hỗ trợ:**
- `Space` — lật card (toggle `isFlipped`)
- `ArrowRight` — next card
- `ArrowLeft` — prev card

**Guard:** Không trigger khi user đang focus vào input/textarea/select/contenteditable (để tránh conflict với form fields khác trong page).

**Implementation trong `<script setup>`:**

```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ... existing state ...

function handleKeydown(e) {
  // Guard: không xử lý khi focus vào form element
  const tag = document.activeElement?.tagName?.toLowerCase()
  if (['input', 'textarea', 'select'].includes(tag)) return
  if (document.activeElement?.isContentEditable) return

  // Guard: không xử lý khi session chưa active
  if (loading.value || error.value || sessionDone.value || !currentCard.value) return

  switch (e.key) {
    case ' ':
    case 'Spacebar': // IE/Edge compat
      e.preventDefault() // tránh page scroll
      isFlipped.value = !isFlipped.value
      break
    case 'ArrowRight':
      e.preventDefault()
      next()
      break
    case 'ArrowLeft':
      e.preventDefault()
      prev()
      break
  }
}

onMounted(() => {
  loadCards()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
```

**Lưu ý quan trọng:** `onMounted` hiện tại chỉ gọi `loadCards()`. Cần sửa để bind keyboard handler cùng lúc. `onUnmounted` cần được thêm mới.

#### Swipe UP to flip

**Hiện trạng:** Touch handler chỉ track `touchStartX` và detect horizontal swipe.

**Thay đổi:** Track thêm `touchStartY`, detect swipe UP để flip card.

**Guard theo PO decision:**
- `Math.abs(deltaY) >= 60` — threshold đủ lớn tránh trigger khi scroll nhẹ
- `Math.abs(deltaY) > Math.abs(deltaX)` — swipe chủ yếu theo chiều dọc (không phải diagonal)
- Chỉ gọi `preventDefault()` khi swipe UP được detect — không block page scroll khi user swipe ngang hoặc scroll thông thường

**Implementation:**

```javascript
// Sửa từ:
let touchStartX = 0
function onTouchStart(e) { touchStartX = e.touches[0].clientX }
function onTouchEnd(e) {
  const delta = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(delta) < 50) return
  if (delta < 0) next()
  else prev()
}

// Thành:
let touchStartX = 0
let touchStartY = 0

function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e) {
  const deltaX = e.changedTouches[0].clientX - touchStartX
  const deltaY = e.changedTouches[0].clientY - touchStartY

  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)

  // Swipe UP to flip: deltaY âm (ngón tay đi lên), đủ threshold, chủ yếu dọc
  if (deltaY < 0 && absY >= 60 && absY > absX) {
    // Không flip nếu session done hoặc loading
    if (!sessionDone.value && currentCard.value) {
      isFlipped.value = !isFlipped.value
    }
    return // consumed — không check horizontal
  }

  // Horizontal swipe: giữ nguyên behavior
  if (absX < 50) return
  if (deltaX < 0) next()
  else prev()
}
```

**Không cần `preventDefault()` trực tiếp trong `onTouchEnd`** vì `touchend` event không có scroll behavior mặc định. Nếu cần block scroll trong quá trình swipe, cần handle ở `touchmove` — nhưng đây là scope V2.

**Template:** Thêm `@touchstart.passive="onTouchStart"` và giữ `@touchend="onTouchEnd"` (không passive vì có thể cần `preventDefault` sau này).

### 4.2 FlashcardSession.vue changes (V1.5)

#### Window width tracking

```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue'

const windowWidth = ref(window.innerWidth)

function onResize() {
  windowWidth.value = window.innerWidth
}

const isSplitPanel = computed(() => !props.embedded && windowWidth.value >= 768)

onMounted(() => {
  loadCards()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', onResize)
})
```

#### Split-panel template structure

Khi `isSplitPanel === true`, wrap toàn bộ card session trong layout 2 cột:

```html
<!-- Card session — V1.5 split panel wrapper -->
<template v-else-if="currentCard">
  <div :class="isSplitPanel ? 'fc__split' : 'fc__single'">

    <!-- Left column: card area (luôn hiển thị) -->
    <div class="fc__col-main">
      <!-- Progress bar -->
      <div class="fc__progress-wrap"> ... </div>

      <!-- Card -->
      <div class="fc__wrap" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
        <div class="fc__card" :class="{ 'fc__card--flipped': isFlipped }" @click="isFlipped = !isFlipped">
          <div class="fc__face fc__face--front">
            <div v-if="currentCard.category" class="fc__category">{{ currentCard.category }}</div>
            <p class="fc__text">{{ currentCard.front }}</p>
          </div>
          <div class="fc__face fc__face--back">
            <div v-if="currentCard.category" class="fc__category">{{ currentCard.category }}</div>
            <p class="fc__text">{{ currentCard.back }}</p>
          </div>
        </div>
      </div>

      <p v-if="!isFlipped" class="fc__hint">
        <template v-if="isSplitPanel">Nhấn Space hoặc click để lật</template>
        <template v-else>Chạm để lật thẻ</template>
      </p>

      <!-- Nav -->
      <div class="fc__nav"> ... </div>

      <!-- Keyboard hint (desktop only, split panel) -->
      <p v-if="isSplitPanel" class="fc__kb-hint">
        Phím tắt: ← → di chuyển &nbsp;|&nbsp; Space lật thẻ
      </p>
    </div>

    <!-- Right column: card list (chỉ khi split panel) -->
    <div v-if="isSplitPanel" class="fc__col-list">
      <div class="fc__list-header">Danh sách thẻ</div>
      <ul class="fc__list">
        <li
          v-for="(card, i) in flashcards"
          :key="card.public_id ?? i"
          class="fc__list-item"
          :class="{
            'fc__list-item--active': i === index,
            'fc__list-item--seen': i < index,
          }"
          @click="jumpTo(i)"
        >
          <span class="fc__list-num">{{ i + 1 }}</span>
          <span v-if="card.category" class="fc__list-badge">{{ card.category }}</span>
        </li>
      </ul>
    </div>

  </div>
</template>
```

#### jumpTo function

```javascript
function jumpTo(i) {
  if (i >= 0 && i < flashcards.value.length) {
    index.value = i
    isFlipped.value = false
  }
}
```

#### CSS cho split-panel

```css
/* Split panel layout */
.fc__split {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: var(--space-lg);
  align-items: start;
  padding: var(--space-md);
}

.fc__single {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
}

/* Card column */
.fc__col-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 0;
}

/* Tăng min-height card khi desktop split-panel */
.fc__split .fc__card {
  min-height: 280px;
}

/* Card list column */
.fc__col-list {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.fc__list-header {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fc__list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  padding: var(--space-xs) 0;
}

.fc__list-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 7px var(--space-md);
  cursor: pointer;
  transition: background 0.12s;
  border-left: 2px solid transparent;
}

.fc__list-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.fc__list-item--active {
  background: rgba(214, 158, 46, 0.08);
  border-left-color: var(--accent-gold);
}

.fc__list-item--seen {
  opacity: 0.5;
}

.fc__list-item--active.fc__list-item--seen {
  opacity: 1; /* active luôn full opacity dù đã xem */
}

.fc__list-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  min-width: 24px;
  text-align: right;
}

.fc__list-item--active .fc__list-num {
  color: var(--accent-gold);
}

.fc__list-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--accent-gold);
  background: rgba(214, 158, 46, 0.12);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Keyboard hint bar */
.fc__kb-hint {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  padding-top: var(--space-xs);
  letter-spacing: 0.02em;
}
```

---

## 5. CSS Architecture

### 5.1 CSS variable additions (variables.css)

Thêm vào `/Users/phucnh/projects/fengshui-trainer/src/frontend/src/style/variables.css`:

```css
/* Typography — CJK support */
--font-cjk: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', 'SimSun', serif;

/* Shadows — card elevation */
--shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(214, 158, 46, 0.15);
--shadow-card-base: 0 2px 8px rgba(0, 0, 0, 0.3);
```

### 5.2 Responsive breakpoints

| Breakpoint | Behavior |
|-----------|---------|
| `< 768px` | Single-column always (mobile) |
| `≥ 768px` + `embedded=false` | Split-panel (V1.5) |
| `≥ 768px` + `embedded=true` | Single-column (VideoSidebar) |

Breakpoint được quản lý bằng `windowWidth` computed ref trong component, không phải CSS media query, vì cần kết hợp với `props.embedded`.

### 5.3 Scoped CSS trong FlashcardSession.vue

Tất cả CSS thay đổi đều là `<style scoped>` trong component — không ảnh hưởng đến component khác.

**Tóm tắt các CSS blocks cần thêm/sửa:**
- **Sửa** `.fc__card`: thêm `transition: transform 0.4s ease, box-shadow 0.2s ease;`
- **Sửa** `.fc__face--back`: thêm gradient background + border-left
- **Xóa** `.fc__dots`, `.fc__dot`, `.fc__dot--active`
- **Thêm** `.fc__progress-wrap`, `.fc__progress-bar`, `.fc__progress-fill`, `.fc__progress-label`
- **Thêm** `@media (hover: hover)` block cho hover state
- **Thêm** `.fc__split`, `.fc__single`, `.fc__col-main`, `.fc__col-list` (V1.5)
- **Thêm** `.fc__list-*` styles (V1.5)
- **Thêm** `.fc__kb-hint` (V1.5)

---

## 6. Assets & Dependencies

### 6.1 Font loading (index.html)

Thêm vào `<head>` trong `/Users/phucnh/projects/fengshui-trainer/src/frontend/index.html`:

```html
<!-- Google Fonts: Noto Serif SC for CJK character support -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&display=swap">
```

**Giải thích:**
- `preconnect` giảm latency DNS lookup và TLS handshake
- `display=swap` đảm bảo text vẫn hiển thị với fallback font trong khi Noto Serif SC đang load (tránh FOIT)
- Weights `400;600` đủ cho body text và question text; không load `700` hay `900` để tiết kiệm bandwidth

**Áp dụng font trong component:** Thêm vào `.fc__text`:
```css
.fc__text {
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  color: var(--text-primary);
  line-height: 1.7;
  text-align: center;
  white-space: pre-line;
  font-family: var(--font-cjk); /* CJK fallback chain */
}
```

**Lưu ý `font-size` change:** Hiện tại `.fc__text` dùng `font-size: 0.95rem` cố định. Sửa sang `clamp(0.9rem, 2.5vw, 1.1rem)` để scale tốt hơn trên desktop split-panel (card rộng hơn, cần text lớn hơn).

### 6.2 Emoji/Icon — SVG thay thế

**Không install thêm library nào.**

Thay thế emoji trong completion screen của `FlashcardSession.vue`:

**Thay `✅` (done icon) bằng SVG checkmark:**
```html
<!-- Thay: <div class="fc__done-icon">✅</div> -->
<div class="fc__done-icon">
  <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2.5" width="48" height="48">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
</div>
```

**Thay `🔀` (shuffle icon) trong button bằng SVG:**
```html
<!-- Thay: 🔀 Lấy bộ mới ngẫu nhiên -->
<button class="fc__action-btn fc__action-btn--primary" @click="loadCards">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <polyline points="16 3 21 3 21 8"/>
    <line x1="4" y1="20" x2="21" y2="3"/>
    <polyline points="21 16 21 21 16 21"/>
    <line x1="15" y1="15" x2="21" y2="21"/>
  </svg>
  Lấy bộ mới ngẫu nhiên
</button>
```

**CSS update cho done icon:**
```css
/* Sửa: .fc__done-icon { font-size: 2.5rem; } */
.fc__done-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(214, 158, 46, 0.1);
  border-radius: 50%;
}
```

---

## 7. Files cần sửa / tạo

| File | Loại thay đổi | V1 / V1.5 |
|------|--------------|-----------|
| `src/frontend/index.html` | Thêm Google Fonts preconnect + stylesheet | V1 |
| `src/frontend/src/style/variables.css` | Thêm `--font-cjk` và `--shadow-card-*` | V1 |
| `src/frontend/src/components/training/FlashcardSession.vue` | Refactor script + template + scoped CSS | Both |

**Không có file mới cần tạo. Không có backend changes.**

### Chi tiết thay đổi FlashcardSession.vue

**Script section — thêm/sửa:**
- Import `onUnmounted` (thêm vào import list)
- Thêm `windowWidth` ref + `onResize` handler
- Thêm `isSplitPanel` computed
- Thêm `progressPercent` computed
- Sửa `onTouchStart` + `onTouchEnd` để support swipe UP
- Thêm `handleKeydown` function
- Thêm `jumpTo(i)` function
- Sửa `onMounted` để bind keyboard + resize listeners
- Thêm `onUnmounted` để unbind tất cả listeners

**Template section — thêm/sửa:**
- Xóa `.fc__dots` block
- Thêm `.fc__progress-wrap` block
- Sửa `.fc__wrap` `@touchstart` thêm `.passive`
- Bọc card session trong `fc__split` / `fc__single` layout (V1.5)
- Thêm `fc__col-list` với `v-if="isSplitPanel"` (V1.5)
- Thay emoji trong completion screen bằng SVG
- Sửa hint text (context-aware: desktop vs mobile)
- Thêm keyboard hint bar (V1.5, desktop only)

**CSS section — thêm/sửa:**
- Sửa `.fc__card`: thêm `box-shadow` transition
- Sửa `.fc__card--flipped`: thêm `!important` để thắng hover
- Sửa `.fc__face--back`: gradient background + border-left
- Sửa `.fc__text`: thêm `font-family: var(--font-cjk)`, sửa font-size sang `clamp`
- Xóa `.fc__dots`, `.fc__dot`, `.fc__dot--active`
- Thêm `.fc__progress-*` rules
- Thêm `@media (hover: hover)` block
- Thêm `.fc__done-icon` update
- Thêm `.fc__split`, `.fc__single`, `.fc__col-*`, `.fc__list-*`, `.fc__kb-hint` (V1.5)

---

## 8. Acceptance criteria

### V1
- [ ] Progress bar hiển thị tỷ lệ X/20 theo chiều ngang, màu `--accent-gold`, không còn dot grid
- [ ] Progress bar animate smooth khi chuyển card (transition 0.3s)
- [ ] Trên desktop (hover-capable device), hover vào card front face tạo hiệu ứng lift (translateY -4px + box-shadow mở rộng)
- [ ] Hover effect không áp dụng cho card đã flipped (`.fc__card--flipped`)
- [ ] Back face có gradient gold tint nhẹ + border-left 2px gold — phân biệt visual với front face
- [ ] Phím Space lật card khi không focus vào input/textarea
- [ ] Phím ArrowRight chuyển sang card kế tiếp; không hoạt động khi focus form element
- [ ] Phím ArrowLeft quay lại card trước; không hoạt động khi focus form element
- [ ] Keyboard handler bị unbind khi component unmounted (không leak)
- [ ] Trên mobile, swipe UP (deltaY >= 60px, deltaY > deltaX) lật card
- [ ] Swipe UP không block page scroll khi gesture là scroll thông thường (deltaY < 60 hoặc deltaX > deltaY)
- [ ] Swipe LEFT/RIGHT (horizontal navigation) vẫn hoạt động bình thường
- [ ] Ký tự Hán (e.g. 甲乙丙丁, 坎離震兌) render đúng trên Windows Chrome (Noto Serif SC loaded)
- [ ] Completion screen dùng SVG icons thay vì emoji — trông consistent trên mọi platform

### V1.5
- [ ] Trên desktop standalone (viewport >= 768px, `embedded=false`), layout hiển thị 2 cột: card 60% bên trái, card list 40% bên phải
- [ ] Card list bên phải chỉ hiển thị số thứ tự (index + 1) và category badge — không có front text
- [ ] Card hiện tại trong list được highlight (gold background + gold left border)
- [ ] Cards đã xem (index < current) trong list có opacity giảm
- [ ] Click vào item trong card list nhảy đến card đó, reset isFlipped = false
- [ ] Keyboard hint bar hiển thị bên dưới nav khi split-panel mode
- [ ] Card min-height tăng lên 280px trong split-panel (không bị vuông vức)
- [ ] Khi resize viewport từ >= 768px về < 768px: layout chuyển về single-column real-time
- [ ] Khi `embedded=true` (VideoSidebar): luôn dùng single-column dù viewport bao nhiêu
- [ ] Trên mobile (< 768px): luôn dùng single-column, không hiển thị card list

---

## 9. Open questions (resolved)

| # | Question | Decision |
|---|----------|----------|
| OQ1 | Embedded vs standalone detection | Dùng `props.embedded` có sẵn; không cần prop mới |
| OQ2 | Swipe UP conflict với scroll | Guard: `Math.abs(deltaY) >= 60` AND `Math.abs(deltaY) > Math.abs(deltaX)`; `preventDefault` không cần thiết trong `touchend` |
| OQ3 | Card list content | Index number + category badge only; NO front text (PO decision — tránh spoiler) |
| OQ4 | Font CJK | Noto Serif SC via Google Fonts CDN; fallback chain đầy đủ; không dùng npm package để tránh bundle size |
| OQ5 | Emoji rendering | SVG inline icons (không install emoji lib); chỉ có 2 emoji trong toàn component |
| OQ6 | Back face differentiation | `linear-gradient(135deg, rgba(214,158,46,0.06) 0%, var(--bg-card) 60%)` + `border-left: 2px solid var(--accent-gold)` |
| OQ7 | Hover vs flip transform conflict | `.fc__card--flipped { transform: rotateY(180deg) !important; }` thắng hover; hover chỉ apply khi `:not(.fc__card--flipped)` |
| OQ8 | Window resize handler memory leak | Unbind trong `onUnmounted` cùng với keyboard handler |

---

## 10. Bước tiếp theo

1. **Implement V1** trong `FlashcardSession.vue`:
   - Xóa dots, thêm progress bar
   - Thêm hover CSS + `@media (hover: hover)`
   - Sửa back face CSS
   - Thêm keyboard handler (`onMounted`/`onUnmounted`)
   - Sửa touch handler (swipe UP)
   - Thay emoji bằng SVG icons

2. **Font loading**: Thêm 3 dòng Google Fonts vào `index.html`; thêm `--font-cjk` vào `variables.css`; apply `font-family: var(--font-cjk)` vào `.fc__text`

3. **Implement V1.5** trong `FlashcardSession.vue`:
   - Thêm `windowWidth` + `isSplitPanel` computed
   - Sửa template wrapper (`fc__split` / `fc__single`)
   - Thêm `fc__col-list` template block
   - Thêm `jumpTo()` function
   - Thêm tất cả CSS cho split-panel

4. **Test matrix:**
   - Desktop Chrome/Firefox (Windows): CJK rendering, hover state, keyboard shortcuts, split-panel
   - Desktop Chrome/Firefox (macOS): Tương tự
   - iOS Safari: Swipe UP flip, swipe LEFT/RIGHT navigate, single-column layout
   - Android Chrome: Tương tự iOS
   - VideoSidebar embedded (`embedded=true`): Không hiển thị split-panel, card list, keyboard hint
   - TrainingView standalone (`embedded=false`): Split-panel bật khi >= 768px

5. **Regression check:** `FlashcardTab.vue` không thay đổi (chỉ pass `embedded=true`). `TrainingDrawer.vue` (BookReader) không thay đổi.
