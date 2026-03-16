# Feature 19: Reading & Watching Progress — Detail Design

**Version:** 1.2
**Date:** 2026-03-15
**Status:** Ready for implementation

---

## 1. Tổng quan

Cho phép user tiếp tục đọc sách / xem video từ đúng vị trí đã dừng, và hiển thị trạng thái tiến độ trên các màn hình danh sách và chi tiết.

### 1.1 Phạm vi

| Tầng | Trạng thái |
|------|-----------|
| Backend (Django) — Models | ✅ Hoàn thành |
| Backend (Django) — APIs | ✅ Hoàn thành |
| Frontend — Service layer | ✅ Hoàn thành |
| Frontend — BookReaderView (lưu & resume từ chapter/page cuối) | ✅ Hoàn thành |
| Frontend — VideoPlayerArea (lưu progress mỗi 15s) | ✅ Hoàn thành |
| Frontend — VideoDetailView (hiển thị %, nút Tiếp tục xem) | ✅ Hoàn thành |
| **Frontend — HomeView (Tiếp tục học: max 5 items, navigate tới last lesson)** | ❌ Cần làm |
| **Frontend — BooksView (badge "Đang đọc" trên card)** | ❌ Cần làm |
| **Frontend — VideosView (progress bar / badge "Hoàn thành" trên card)** | ❌ Cần làm |
| **Frontend — BookDetailView (highlight chapter đang đọc)** | ❌ Cần làm |
| **Frontend — LessonListTab (icon components + prop showFreeBadge)** | ❌ Cần làm |
| **Frontend — Icon components (PlayIcon, BookOpenIcon, CheckIcon, VideoPlaceholderIcon)** | ❌ Cần làm |

### 1.2 Mục tiêu UX

1. **HomeView**: "Tiếp tục học" hiển thị tối đa **5 items** (books + videos gộp, sort theo recency). Click video → navigate thẳng tới last lesson.
2. **BooksView**: Card hiển thị badge "Đang đọc" nếu user đang đọc dở sách đó.
3. **VideosView**: Card hiển thị progress bar nếu đang xem dở, badge "Hoàn thành" nếu xong 100%.
4. **BookDetailView**: Chapter đang đọc dở được highlight kèm số trang.
5. **LessonListTab**: Tái sử dụng ở cả `VideoDetailView` (thay inline list) và `VideoPlayerView`.

---

## 2. API Reference

### 2.1 Books

```
GET /api/books/recently-read/
Response: [
  {
    slug, title, cover_image,
    chapter_order,   // chương đang đọc
    current_page,    // trang đang đọc
    last_read        // ISO datetime — dùng để sort recency
  },
  ...
]

GET /api/books/{slug}/progress/
Response: {
  chapter_order: 3,
  current_page: 12
}

POST /api/books/{slug}/chapters/{order}/progress/
Body: { current_page: 12, completed: false }
Response: 200 OK
```

### 2.2 Videos

```
GET /api/videos/recently-watched/
Response: [
  {
    slug, title, cover_image,
    progress_percent,   // % hoàn thành course (0-100)
    last_watched        // ISO datetime — dùng để sort recency
  },
  ...
]

GET /api/videos/{slug}/progress/
Response: {
  progress_percent: 45,
  completed_lessons: 4,
  total_lessons: 9
}

GET /api/videos/{slug}/progress/last-lesson/
Response: {
  lesson_slug: "bai-1-gioi-thieu",   // ⚠️ field này bắt buộc phải có
  lesson_public_id: "uuid-..."
}

POST /api/videos/{slug}/lessons/{lessonSlug}/progress/
Body: { progress_seconds: 120 }
Response: 200 OK
```

### 2.3 Backend Verification (cần confirm trước khi code)

| API | Field cần có | Hành động |
|-----|-------------|-----------|
| `GET /books/recently-read/` | `last_read` (ISO datetime) | Confirm field tồn tại |
| `GET /books/recently-read/` | Không có pagination / limit | Confirm trả về tất cả sách đang đọc dở |
| `GET /videos/recently-watched/` | `last_watched` (ISO datetime) | Confirm field tồn tại |
| `GET /videos/{slug}/progress/last-lesson/` | `lesson_slug` | **Bắt buộc** — nếu chưa có, backend thêm vào response |

---

## 3. Implementation Detail

### 3.1 Icon Components — Tạo mới

Tạo tại `src/frontend/src/components/icons/`:

**`PlayIcon.vue`**
```vue
<script setup>
defineProps({ size: { type: Number, default: 16 } })
</script>
<template>
  <svg viewBox="0 0 24 24" fill="currentColor" :width="size" :height="size">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
</template>
```

**`VideoPlaceholderIcon.vue`**
```vue
<script setup>
defineProps({ size: { type: Number, default: 20 } })
</script>
<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.5" :width="size" :height="size" opacity=".4">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
</template>
```

**`BookOpenIcon.vue`**
```vue
<script setup>
defineProps({ size: { type: Number, default: 14 } })
</script>
<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" :width="size" :height="size">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
</template>
```

**`CheckIcon.vue`**
```vue
<script setup>
defineProps({ size: { type: Number, default: 14 } })
</script>
<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2.5" :width="size" :height="size">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
</template>
```

---

### 3.2 LessonListTab — Cập nhật

**File:** `src/frontend/src/components/video/LessonListTab.vue`

**Thay đổi 1:** Thêm prop `showFreeBadge` để dùng được ở `VideoDetailView` (xem vấn đề U3).

```javascript
const props = defineProps({
  lessons: Array,
  currentLessonSlug: String,
  courseSlug: String,
  canAccessLesson: Function,
  showFreeBadge: { type: Boolean, default: false }, // mới
})
```

```html
<!-- Trong .lesson-list__info, sau lesson title -->
<div class="lesson-list__meta">
  <span v-if="lesson.duration_seconds" class="lesson-list__duration">
    {{ formatDuration(lesson.duration_seconds) }}
  </span>
  <span v-if="showFreeBadge && lesson.is_free" class="lesson-list__free-badge">
    Miễn phí
  </span>
</div>
```

```css
.lesson-list__free-badge {
  font-size: 10px;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 500;
}
```

**Thay đổi 2:** Thay 3 SVG inline bằng icon components.

```javascript
import LockIcon from '../icons/LockIcon.vue'
import PlayIcon from '../icons/PlayIcon.vue'
import VideoPlaceholderIcon from '../icons/VideoPlaceholderIcon.vue'
```

```html
<!-- Indicator (lock / play / order number) -->
<span class="lesson-list__indicator">
  <LockIcon v-if="!canAccessLesson(lesson)" :size="13" class="lesson-list__lock-icon" />
  <PlayIcon v-else-if="lesson.slug === currentLessonSlug" :size="12" />
  <span v-else class="lesson-list__order">{{ lesson.order }}</span>
</span>

<!-- Thumbnail empty state -->
<div v-if="!lesson.thumbnail" class="lesson-list__thumb lesson-list__thumb--empty">
  <VideoPlaceholderIcon :size="20" />
</div>
```

---

### 3.3 VideoDetailView — Reuse LessonListTab

**File:** `src/frontend/src/views/VideoDetailView.vue`

Xóa toàn bộ block `.vd__lessons` inline (lines 220–266), thay bằng `LessonListTab`.

```javascript
import LessonListTab from '../components/video/LessonListTab.vue'
```

```html
<div class="vd__lessons">
  <h2 class="vd__lessons-title">Danh sách bài học</h2>
  <LessonListTab
    :lessons="course.lessons"
    :current-lesson-slug="null"
    :course-slug="course.slug"
    :can-access-lesson="canAccessLesson"
    :show-free-badge="true"
  />
</div>
```

> `currentLessonSlug="null"` → không có item nào active (chỉ browse, chưa xem).

---

### 3.4 HomeView — Tiếp tục học (max 5 items)

**File:** `src/frontend/src/views/HomeView.vue`

**Approach:** Gộp `recently-read` và `recently-watched` thành một list, sort theo `last_read`/`last_watched` giảm dần, lấy top 5. Bỏ hardcode `slice(0, 2)` / `slice(0, 3)`.

**Data:**
```javascript
import { videosService } from '../services/videos.service'
import PlayIcon from '../components/icons/PlayIcon.vue'

// Thay recentBooks + recentVideos bằng:
const recentItems = ref([]) // max 5, mixed books + videos, sorted by recency
const navigatingVideoSlug = ref(null)

// Trong onMounted — thay đoạn fetch recentBooks/recentVideos:
const [recentBooksRes, recentVideosRes] = await Promise.allSettled([
  booksService.getRecentlyRead(),
  videosService.getRecentlyWatched(),
])

const books = (recentBooksRes.status === 'fulfilled'
  ? recentBooksRes.value.data ?? [] : [])
  .map(b => ({ ...b, type: 'book', recency: new Date(b.last_read) }))

const videos = (recentVideosRes.status === 'fulfilled'
  ? recentVideosRes.value.data ?? [] : [])
  .map(v => ({ ...v, type: 'video', recency: new Date(v.last_watched) }))

recentItems.value = [...books, ...videos]
  .sort((a, b) => b.recency - a.recency)
  .slice(0, 5)
```

**Navigate function:**
```javascript
async function goRecentItem(item) {
  if (item.type === 'book') {
    router.push({ name: 'BookReader', params: { slug: item.slug } })
    return
  }
  // Video: luôn gọi getLastLesson để navigate đúng lesson
  if (navigatingVideoSlug.value) return
  navigatingVideoSlug.value = item.slug

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000)
  )
  try {
    const { data } = await Promise.race([
      videosService.getLastLesson(item.slug),
      timeout,
    ])
    router.push(data.lesson_slug
      ? { name: 'VideoPlayer', params: { slug: item.slug, lessonSlug: data.lesson_slug } }
      : { name: 'VideoDetail', params: { slug: item.slug } }
    )
  } catch {
    router.push({ name: 'VideoDetail', params: { slug: item.slug } })
  } finally {
    navigatingVideoSlug.value = null
  }
}

// Pre-fetch khi hover trên desktop để giảm latency
function prefetchLastLesson(item) {
  if (item.type === 'video' && window.matchMedia('(hover: hover)').matches) {
    videosService.getLastLesson(item.slug).catch(() => {})
  }
}
```

**Template — thay 2 v-for riêng bằng 1 v-for gộp:**
```html
<section v-if="recentItems.length" class="home-section">
  <h2 class="home-section__title">
    <!-- icon giữ nguyên -->
    {{ t('home.continueStudy.title') }}
  </h2>
  <div class="home-books">
    <div
      v-for="item in recentItems"
      :key="item.type + '-' + item.slug"
      class="home-book-card"
      @click="goRecentItem(item)"
      @mouseenter="prefetchLastLesson(item)"
    >
      <div class="home-book-card__cover">
        <img v-if="item.cover_image" :src="item.cover_image" :alt="item.title" />
        <div v-else class="home-book-card__cover-placeholder"></div>

        <!-- Badge: chương sách hoặc % video -->
        <span class="home-book-card__chapter-badge">
          <PlayIcon v-if="item.type === 'video'" :size="9" />
          {{ item.type === 'video'
            ? (item.progress_percent ? item.progress_percent + '%' : 'Video')
            : (t('home.continueStudy.chapter') + ' ' + item.chapter_order) }}
        </span>

        <!-- Loading overlay khi đang fetch last lesson -->
        <div v-if="navigatingVideoSlug === item.slug" class="home-book-card__nav-loading">
          <div class="home-book-card__spinner"></div>
        </div>

        <div class="home-book-card__play-overlay">
          <!-- giữ nguyên play icon SVG hiện tại -->
        </div>
      </div>
      <span class="home-book-card__title">{{ item.title }}</span>
    </div>
  </div>
</section>
```

**CSS — loading overlay:**
```css
.home-book-card__nav-loading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  z-index: 2;
}
.home-book-card__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

**Cache invalidation khi quay lại HomeView:**
```javascript
import { onActivated } from 'vue'
import { clearApiCache } from '../api/client'

onActivated(async () => {
  clearApiCache('books/recently-read/')
  clearApiCache('videos/recently-watched/')
  // Re-fetch và rebuild recentItems
  // (tách logic fetch thành function loadRecentItems() để gọi lại được)
  await loadRecentItems()
})
```

---

### 3.5 BooksView — Badge "Đang đọc"

**File:** `src/frontend/src/views/BooksView.vue`

**Data:**
```javascript
import { onActivated } from 'vue'
import { clearApiCache } from '../api/client'

const readingSet = ref(new Set()) // Set of slugs đang đọc dở

async function loadReadingSet() {
  try {
    const res = await booksService.getRecentlyRead()
    const list = Array.isArray(res.data) ? res.data : []
    readingSet.value = new Set(list.map(b => b.slug))
  } catch { /* không show badge nếu lỗi */ }
}

// Trong onMounted — gọi song song với các fetch khác
onMounted(() => { loadReadingSet() })

// Invalidate cache khi quay lại view (sau khi đọc xong)
onActivated(() => {
  clearApiCache('books/recently-read/')
  loadReadingSet()
})
```

**Template — thêm badge vào `.books__cover`:**
```html
<span v-if="readingSet.has(book.slug)" class="books__badge-reading">
  Đang đọc
</span>
```

**CSS:**
```css
.books__badge-reading {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(234, 179, 8, 0.9);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}
```

---

### 3.6 VideosView — Progress bar / Badge "Hoàn thành"

**File:** `src/frontend/src/views/VideosView.vue`

**Data:**
```javascript
import { onActivated } from 'vue'
import { clearApiCache } from '../api/client'

const watchProgressMap = ref({}) // { [slug]: progress_percent }

async function loadWatchProgress() {
  try {
    const res = await videosService.getRecentlyWatched()
    const list = Array.isArray(res.data) ? res.data : []
    const map = {}
    list.forEach(v => { map[v.slug] = v.progress_percent ?? 0 })
    watchProgressMap.value = map
  } catch { /* không show bar nếu lỗi */ }
}

onMounted(() => { loadWatchProgress() })

onActivated(() => {
  clearApiCache('videos/recently-watched/')
  loadWatchProgress()
})
```

**Template — thêm vào cuối `.videos__info`:**
```html
<template v-if="watchProgressMap[course.slug] > 0">
  <!-- Hoàn thành 100%: badge xanh -->
  <span v-if="watchProgressMap[course.slug] >= 100" class="videos__badge-done">
    ✓ Hoàn thành
  </span>
  <!-- Đang xem dở: progress bar amber -->
  <div
    v-else
    class="videos__progress-bar"
    :style="`--pct: ${watchProgressMap[course.slug]}%`"
  >
    <div class="videos__progress-fill"></div>
  </div>
</template>
```

**CSS:**
```css
.videos__badge-done {
  font-size: 10px;
  font-weight: 600;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 6px;
  display: inline-block;
}
.videos__progress-bar {
  height: 3px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}
.videos__progress-fill {
  height: 100%;
  width: var(--pct);
  background: #f59e0b;
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

---

### 3.7 BookDetailView — Highlight chapter đang đọc

**File:** `src/frontend/src/views/BookDetailView.vue`

**Imports:**
```javascript
import BookOpenIcon from '../components/icons/BookOpenIcon.vue'
import CheckIcon from '../components/icons/CheckIcon.vue'
```

**Data:**
```javascript
const currentProgress = ref(null) // { chapter_order, current_page }

// Trong onMounted — sau khi getBookDetail resolve:
const bookRes = await booksService.getBookDetail(route.params.slug)
book.value = bookRes.data
const isOwned = book.value.is_free || book.value.is_owned

// Chỉ gọi getBookProgress khi user có quyền truy cập
if (isOwned) {
  booksService.getBookProgress(route.params.slug)
    .then(res => { currentProgress.value = res.data })
    .catch(() => {})
}
```

**Helper:**
```javascript
function isCurrentChapter(chapter) {
  return isOwned
    && currentProgress.value
    && chapter.order === currentProgress.value.chapter_order
}
```

**Template — chapter row:**
```html
<div
  v-for="chapter in sortedChapters"
  :key="chapter.order"
  class="book-detail__chapter-row"
  :class="{
    'book-detail__chapter-row--locked': !canAccessChapter(chapter),
    'book-detail__chapter-row--reading': isCurrentChapter(chapter),
  }"
  ...
>
  <div class="book-detail__chapter-left">
    <span class="book-detail__chapter-num">{{ chapter.order }}</span>
    <span class="book-detail__chapter-title">{{ chapter.title }}</span>
    <span v-if="chapter.is_demo" class="badge badge--demo">Đọc thử</span>
    <span v-if="isCurrentChapter(chapter)" class="badge badge--reading">
      Trang {{ currentProgress.current_page }}
    </span>
  </div>

  <div class="book-detail__chapter-right">
    <LockIcon     v-if="!canAccessChapter(chapter)"   :size="14" class="book-detail__chapter-lock" />
    <BookOpenIcon v-else-if="isCurrentChapter(chapter)" :size="14" class="book-detail__chapter-reading-icon" />
    <CheckIcon    v-else-if="isUnlocked"               :size="14" class="book-detail__chapter-check" />
  </div>
</div>
```

**CSS:**
```css
.book-detail__chapter-row--reading {
  background: rgba(234, 179, 8, 0.06);
  border-left: 3px solid #f59e0b;
}
.book-detail__chapter-reading-icon { color: #f59e0b; }
.badge--reading {
  background: rgba(234, 179, 8, 0.15);
  color: #92400e;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
}
```

---

## 4. Thứ tự implement

```
1. Verify backend (xem mục 2.3)
   └─ Confirm `last_read`, `last_watched` fields tồn tại
   └─ Confirm `last-lesson` response có `lesson_slug`
   └─ Nếu thiếu → yêu cầu backend bổ sung trước

2. Tạo 4 icon components (section 3.1)
   └─ PlayIcon, VideoPlaceholderIcon, BookOpenIcon, CheckIcon

3. LessonListTab — thêm showFreeBadge + dùng icon components (section 3.2)
   └─ Test: LessonListTab hiện "Miễn phí" badge khi showFreeBadge=true

4. VideoDetailView — replace inline lesson list bằng LessonListTab (section 3.3)
   └─ Test: lesson list hiển thị đúng, badge "Miễn phí" có mặt, click navigate đúng

5. HomeView — gộp recentItems, navigate + spinner (section 3.4)
   └─ Test: 5 items mixed book/video sorted by recency
   └─ Test: click video → spinner → navigate tới đúng lesson
   └─ Test: click book → navigate tới BookReader

6. BookDetailView — highlight chapter đang đọc (section 3.7)
   └─ Test: mở book đã đọc tới chương 3 → chương 3 highlight + số trang

7. BooksView — badge "Đang đọc" (section 3.5)
   └─ Test: book đang đọc dở → badge xuất hiện; back từ reader → badge cập nhật

8. VideosView — progress bar + badge "Hoàn thành" (section 3.6)
   └─ Test: 45% → amber bar; 100% → badge xanh; 0% → không hiện gì
```

---

## 5. Edge Cases

| Tình huống | Xử lý |
|-----------|-------|
| User chưa đăng nhập | `getRecentlyRead/Watched` trả 401 → `catch(() => {})` → không hiện badge/bar/section |
| `progress_percent = 0` | Không hiện gì trên card |
| `progress_percent = 100` | Badge "✓ Hoàn thành" màu xanh (section 3.6) |
| User chưa mua sách | Không gọi `getBookProgress` — guard `is_owned` (section 3.7) |
| `getLastLesson` timeout > 5s | Fallback navigate về VideoDetail (section 3.4) |
| Last lesson bị xóa / hết access | `getLastLesson` trả 404 → fallback navigate về VideoDetail |
| Quay lại BooksView/VideosView sau khi đọc/xem | `onActivated` invalidate cache + re-fetch (section 3.5, 3.6) |
| `recently-read` không có `last_read` field | Sort theo index (thứ tự API trả về) → Confirm với backend |
| Books nhiều hơn videos trong top 5 | Tự nhiên — sort recency, ai dùng nhiều hơn chiếm nhiều slot hơn |

---

## 6. Files cần tạo / sửa

| File | Loại thay đổi |
|------|--------------|
| `src/components/icons/PlayIcon.vue` | **Tạo mới** |
| `src/components/icons/VideoPlaceholderIcon.vue` | **Tạo mới** |
| `src/components/icons/BookOpenIcon.vue` | **Tạo mới** |
| `src/components/icons/CheckIcon.vue` | **Tạo mới** |
| `src/components/video/LessonListTab.vue` | Sửa: icon components + prop `showFreeBadge` |
| `src/views/VideoDetailView.vue` | Sửa: xóa inline lesson list → dùng `LessonListTab` với `show-free-badge` |
| `src/views/HomeView.vue` | Sửa: gộp recentItems (max 5, sort recency), `goRecentItem`, spinner, pre-fetch hover |
| `src/views/BooksView.vue` | Sửa: `readingSet` + `onActivated` cache invalidation |
| `src/views/VideosView.vue` | Sửa: `watchProgressMap` + badge "Hoàn thành" + `onActivated` cache invalidation |
| `src/views/BookDetailView.vue` | Sửa: `currentProgress` với guard `is_owned`; `BookOpenIcon`, `CheckIcon` |
| Backend (nếu cần) | Bổ sung `lesson_slug` vào `last-lesson` response; confirm `last_read`/`last_watched` fields |
