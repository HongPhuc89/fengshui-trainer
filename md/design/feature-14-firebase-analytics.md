# Feature 14: Firebase Analytics — User Activity Tracking

**Ngày tạo:** 2026-03-13
**Status:** 📝 Design — chưa implement
**Priority:** Medium
**Effort ước tính:** S (~1 ngày)
**Stack liên quan:** Frontend only (Vue.js) — không cần backend changes

---

## Mục tiêu

Track user activity trên Thiên Thư để:
- Hiểu hành vi học tập (người dùng xem gì, đọc đến đâu, bỏ ở đâu)
- Đo conversion funnel (browse → detail → purchase → learn)
- Theo dõi doanh thu linh thạch theo ngày (Firebase revenue events)
- Phát hiện drop-off points (chapter nào user hay bỏ giữa chừng)

---

## Hiện trạng

Firebase project đã có (dùng cho **Hosting** — `firebase.json` + deploy script). Chưa install Firebase SDK, chưa có analytics nào.

Frontend stack: Vue 3 + Vite + Pinia + Vue Router (`router/index.js` có `beforeEach` guard → điểm inject page_view tự nhiên).

---

## Kiến trúc

```
src/
├── plugins/
│   └── analytics.js        ← Firebase init + logEvent wrapper (NEW)
├── main.js                 ← import analytics plugin (MODIFY)
├── router/index.js         ← track page_view trong afterEach (MODIFY)
└── (views/components)      ← gọi analytics.track() tại business events
```

**Không tạo Pinia store cho analytics** — analytics là side-effect, không cần reactive state. Plugin singleton đủ.

---

## Implementation

### Bước 1 — Cài Firebase SDK

```bash
npm install firebase
```

Chỉ import modules cần dùng (tree-shakeable), không import toàn bộ SDK:
```js
import { initializeApp } from 'firebase/app'
import { getAnalytics, logEvent } from 'firebase/analytics'
```

---

### Bước 2 — Tạo `src/plugins/analytics.js`

```js
// src/plugins/analytics.js
import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, logEvent, setUserId } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let analytics = null

function init() {
  // Tránh double-init khi HMR (Vite dev mode)
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  analytics = getAnalytics(app)
}

/**
 * Track một event. No-op nếu analytics chưa init hoặc đang ở môi trường
 * không có measurementId (local dev không có .env).
 */
function track(eventName, params = {}) {
  if (!analytics) return
  logEvent(analytics, eventName, params)
}

/**
 * Gán user_id sau khi login — giúp cross-device tracking và
 * liên kết events với user cụ thể trong Firebase dashboard.
 * Dùng public_id (UUID) của user, KHÔNG dùng private integer ID.
 */
function identifyUser(publicId) {
  if (!analytics || !publicId) return
  setUserId(analytics, publicId)
}

/**
 * Clear user_id khi logout.
 */
function clearUser() {
  if (!analytics) return
  setUserId(analytics, null)
}

export const analyticsPlugin = {
  install(app) {
    if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
      init()
    }
    app.config.globalProperties.$track = track
  },
}

export { track, identifyUser, clearUser }
```

**Privacy note:** Dùng `public_id` (UUID) thay vì integer ID để tránh expose internal DB sequence.

---

### Bước 3 — Update `src/main.js`

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import { analyticsPlugin } from './plugins/analytics'  // ADD
import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)
app.use(analyticsPlugin)  // ADD — sau pinia/router để có access nếu cần

app.mount('#app')

const auth = useAuthStore()
auth.startAutoRefresh()

window.addEventListener('auth:logout', () => {
  router.push({ name: 'Login' })
})
```

---

### Bước 4 — Track page_view trong `src/router/index.js`

```js
import { track } from '../plugins/analytics'  // ADD

// Thêm afterEach (sau beforeEach hiện tại):
router.afterEach((to) => {
  track('page_view', {
    page_title: to.name,
    page_path: to.path,
  })
})
```

`afterEach` đảm bảo chỉ track sau khi navigation thật sự hoàn tất (guard đã pass).

---

### Bước 5 — Track identity sau login

Trong `src/stores/auth.js`, update `fetchMe()` và `clearAuth()`:

```js
import { identifyUser, clearUser } from '../plugins/analytics'  // ADD

// Trong fetchMe():
async function fetchMe() {
  const { data } = await authService.getMe()
  setUser(data)
  identifyUser(data.public_id)  // ADD — xem note bên dưới
  return data
}

// Trong clearAuth():
function clearAuth() {
  stopAutoRefresh()
  clearUser()  // ADD — clear analytics user_id trước khi xóa local state
  access.value = null
  // ... rest unchanged
}
```

> **Note về `public_id`:** `auth.js` hiện tại lưu toàn bộ API response từ `authService.getMe()` vào `user` store mà không filter fields. Field `public_id` (UUID) cần được trả về từ Django API endpoint `/auth/me/`. Nếu API chưa expose field này, cần thêm vào serializer backend. Fallback an toàn: dùng `data.public_id ?? null` — nếu null thì `identifyUser()` sẽ no-op theo guard `if (!analytics || !publicId) return`.

---

### Bước 6 — Business events trong Views/Components

Import `track` và gọi tại đúng thời điểm business event xảy ra.

#### `BookReaderView.vue` — đọc chapter

```js
import { track } from '../plugins/analytics'

// Trong loadChapter() — sau khi await loadPdf() thành công (cuối try block):
// Hook đúng là sau loadPdf() vì lúc này pdfDoc và chapterPageCount đã được set.
// bookSlug là const ở top-level, currentChapter là computed dựa trên currentChapterOrder.
track('book_chapter_opened', {
  book_slug: bookSlug,                       // const bookSlug = route.params.slug
  chapter_slug: currentChapter.value?.slug,
  chapter_order: currentChapter.value?.order,
})

// Khi user đến trang cuối chapter — inject trong scheduleSave() hoặc nextPage():
// Condition đúng: currentPage.value >= chapterPageCount.value
// (đây là condition đã dùng trong scheduleSave() để mark completed)
if (currentPage.value >= chapterPageCount.value) {
  track('book_chapter_completed', {
    book_slug: bookSlug,
    chapter_slug: currentChapter.value?.slug,
  })
}
```

> **Note về hook points:**
> - `book_chapter_opened`: inject vào cuối `try` block trong `loadChapter()`, sau `await loadPdf(file_url, page)` thành công.
> - `book_chapter_completed`: inject trong `goToPage()` hoặc `nextPage()` khi `currentPage.value >= chapterPageCount.value`. Lưu ý dùng guard để tránh fire nhiều lần (ví dụ: `hasTrackedComplete` flag per chapter).

#### `VideoPlayerArea.vue` — xem video

> **Quan trọng:** Video logic KHÔNG nằm trong `VideoPlayerView.vue` mà nằm trong child component `src/components/video/VideoPlayerArea.vue`. `VideoPlayerView.vue` chỉ là layout wrapper, không có access trực tiếp vào video element hay progress state.

```js
// Inject vào VideoPlayerArea.vue (KHÔNG phải VideoPlayerView.vue)
import { track } from '../../plugins/analytics'

// Khi video bắt đầu play — thêm @play handler vào <video> element:
function onPlay() {
  track('video_lesson_started', {
    course_slug: props.courseSlug,
    lesson_slug: props.lessonSlug,
  })
}

// Khi progress >= 90% — inject trong onTimeUpdate():
// videoRef.value.currentTime và videoRef.value.duration là các variables thực tế.
// Dùng flag hasTrackedCompleted để chỉ fire 1 lần per lesson.
let hasTrackedCompleted = false
function onTimeUpdate() {
  if (Date.now() - lastSavedAt.value > SAVE_INTERVAL) saveProgress()

  // Track completion khi >= 90%
  const vid = videoRef.value
  if (!hasTrackedCompleted && vid && vid.duration > 0) {
    const pct = vid.currentTime / vid.duration
    if (pct >= 0.9) {
      hasTrackedCompleted = true
      track('video_lesson_completed', {
        course_slug: props.courseSlug,
        lesson_slug: props.lessonSlug,
      })
    }
  }
}
```

> **Note:**
> - `props.courseSlug` và `props.lessonSlug` là các props đã có sẵn trong `VideoPlayerArea.vue`.
> - `onEnded()` đã có sẵn — có thể dùng làm trigger thay thế cho `video_lesson_completed` (đơn giản hơn 90% threshold nhưng chỉ fire khi xem đến cuối hoàn toàn).
> - `isEmbedUrl` (Bunny Stream iframe): không thể track `currentTime` qua JavaScript vì iframe cross-origin. Events `video_lesson_started/completed` chỉ reliable cho native `<video>` element. Với embed URL, có thể chỉ track `video_lesson_started` dựa trên component mount.

#### `FlashcardSession.vue` — luyện flashcard

> **Quan trọng — Props sai:** Design doc gốc dùng `props.sourceType` và `props.sourceSlug` — **KHÔNG tồn tại**. Props thực tế của `FlashcardSession.vue` chỉ có: `activityId` (String, required) và `embedded` (Boolean). Component KHÔNG nhận source info từ bên ngoài.

```js
// Inject vào FlashcardSession.vue
import { track } from '../../plugins/analytics'

// Khi hoàn thành session — inject trong next() khi sessionDone.value = true:
function next() {
  isFlipped.value = false
  if (index.value < flashcards.value.length - 1) {
    index.value++
  } else {
    sessionDone.value = true
    // ADD: track completion
    track('flashcard_session_completed', {
      activity_id: props.activityId,   // dùng activityId vì không có source info
      card_count: flashcards.value.length,
    })
  }
}
```

> **Note về params:** Do FlashcardSession không nhận `sourceType`/`sourceSlug`, event params chỉ có `activity_id` và `card_count`. Nếu muốn có source context, cần thêm optional props vào component (ví dụ: `sourceType`, `sourceSlug`) và truyền từ VideoSidebar/TrainingView khi mount.

#### `BookDetailView.vue` — purchase sách

```js
import { track } from '../plugins/analytics'

// Trong confirmPurchase() — sau book.value.has_purchased = true (line ~103):
// API: booksService.purchaseBook(book.value.public_id)
track('purchase', {
  item_id: book.value.slug,       // book.value.slug có sẵn
  item_name: book.value.title,
  item_category: 'book',
  value: book.value.price_lt,     // book.value.price_lt — computed price = book.value?.price_lt ?? 0
  currency: 'LT',
})
```

#### `VideoDetailView.vue` — purchase video course

```js
import { track } from '../plugins/analytics'

// Trong handleBuy() — sau course.value.has_purchased = true (line ~75):
// API: videosService.purchaseCourse(course.value.public_id)
track('purchase', {
  item_id: course.value.slug,
  item_name: course.value.title,
  item_category: 'video',
  value: course.value.price_lt,   // course.value.price_lt (dùng trong template)
  currency: 'LT',
})
```

#### `StoreView.vue` — nạp voucher

> **Lưu ý quan trọng:** `StoreView.vue` (route "Store") hiện tại **chỉ hiển thị balance và transaction history** — không có UI hay function để redeem voucher. File này dùng `walletService.getBalance()` và `walletService.getTransactions()`. Transaction type `RECHARGE_VOUCHER` tồn tại trong `TX_CONFIG` nhưng chỉ để render icon trong history list.
>
> Voucher redeem feature chưa implement trên frontend. Khi implement, tracking point sẽ là sau khi API call redeem thành công:

```js
import { track } from '../plugins/analytics'

// Sau khi redeem voucher API call thành công — inject tại point này khi feature được build:
track('voucher_redeemed', {
  lt_amount: result.lt_amount,  // từ API response
})
```

**Action cần làm:** Xác định file/component nào sẽ chứa voucher redeem UI trước khi implement tracking này.

---

## Events Reference

| Event name | Trigger | Params | File inject |
|---|---|---|---|
| `page_view` | Mỗi route navigation | `page_title`, `page_path` | `router/index.js` |
| `book_chapter_opened` | Chapter PDF load xong | `book_slug`, `chapter_slug`, `chapter_order` | `BookReaderView.vue` — cuối `loadChapter()` try block |
| `book_chapter_completed` | User đến trang cuối chapter | `book_slug`, `chapter_slug` | `BookReaderView.vue` — trong `goToPage()` / `nextPage()` |
| `video_lesson_started` | Video bắt đầu play | `course_slug`, `lesson_slug` | `VideoPlayerArea.vue` — `@play` handler |
| `video_lesson_completed` | Progress ≥ 90% hoặc `onEnded()` | `course_slug`, `lesson_slug` | `VideoPlayerArea.vue` — trong `onTimeUpdate()` hoặc `onEnded()` |
| `flashcard_session_completed` | Session completion screen | `activity_id`, `card_count` | `FlashcardSession.vue` — trong `next()` khi `sessionDone = true` |
| `purchase` | Mua sách/video thành công | `item_id`, `item_name`, `item_category`, `value`, `currency` | `BookDetailView.vue` → `confirmPurchase()` / `VideoDetailView.vue` → `handleBuy()` |
| `voucher_redeemed` | Nạp voucher thành công | `lt_amount` | Chưa có UI — defer đến khi feature voucher được implement |

---

## Env Variables

Thêm vào `.env` (và `.env.example`):

```bash
# Firebase Analytics
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

**Lấy config từ:** Firebase Console → Project Settings → Your apps → Web app → SDK setup and configuration.

`VITE_FIREBASE_MEASUREMENT_ID` (dạng `G-XXXXXXX`) là key để bật Analytics. Nếu không set → analytics bị skip (no-op), không ảnh hưởng dev local.

---

## Files cần thay đổi

| File | Action | Nội dung |
|---|---|---|
| `src/plugins/analytics.js` | **CREATE** | Firebase init + track/identifyUser/clearUser |
| `src/main.js` | **MODIFY** | Import + `app.use(analyticsPlugin)` |
| `src/router/index.js` | **MODIFY** | `router.afterEach` → track page_view |
| `src/stores/auth.js` | **MODIFY** | `identifyUser` sau fetchMe, `clearUser` trong clearAuth |
| `src/views/BookReaderView.vue` | **MODIFY** | track chapter opened/completed |
| `src/components/video/VideoPlayerArea.vue` | **MODIFY** | track lesson started/completed (**KHÔNG phải VideoPlayerView.vue**) |
| `src/components/training/FlashcardSession.vue` | **MODIFY** | track session completed (dùng `activityId`, không có `sourceType`/`sourceSlug`) |
| `src/views/BookDetailView.vue` | **MODIFY** | track purchase (book) trong `confirmPurchase()` |
| `src/views/VideoDetailView.vue` | **MODIFY** | track purchase (video) trong `handleBuy()` |
| `src/views/StoreView.vue` | **SKIP** | Không có voucher redeem UI — defer |
| `.env.example` | **MODIFY** | Thêm VITE_FIREBASE_* keys |

---

## Trade-off & lưu ý

| Điểm | Ghi chú |
|---|---|
| **Data delay** | Firebase Analytics có độ trễ ~24h trên dashboard chuẩn. Realtime view có nhưng giới hạn (DebugView cho dev) |
| **Không retroactive** | Chỉ track từ khi deploy — không có historical data trước đó |
| **Privacy** | Firebase Analytics thu thập IP, device info. Cần thêm vào Privacy Policy nếu có user EU (GDPR) |
| **Ad blockers** | ~20-30% user có thể bị block bởi ad blocker. Analytics là best-effort, không 100% accurate |
| **`currency: 'LT'`** | Firebase `purchase` event chuẩn dùng ISO currency. `LT` (Linh Thạch) là custom — dashboard sẽ hiển thị nhưng không convert sang real money tự động |
| **Bundle size** | `firebase/analytics` thêm ~17KB gzipped. Acceptable |

---

## Scope V1

- [ ] Cài `firebase` package
- [ ] Tạo `src/plugins/analytics.js`
- [ ] Update `main.js`, `router/index.js`, `auth.js`
- [ ] Track `page_view` (auto via router)
- [ ] Track `purchase` (book + video)
- [ ] Track `voucher_redeemed`
- [ ] Thêm VITE_FIREBASE_* vào `.env.example`
- [ ] Verify trên Firebase DebugView

## Scope V2 (defer)

- [ ] Track `book_chapter_opened/completed`
- [ ] Track `video_lesson_started/completed`
- [ ] Track `flashcard_session_completed`
- [ ] Custom dashboard trong Firebase (funnel: browse → detail → purchase)
