# Feature 15: Client-Side Caching — axios-cache-interceptor + localforage

**Ngày tạo:** 2026-03-13
**Status:** 📝 Design — chưa implement
**Priority:** Medium
**Effort ước tính:** S (~1 ngày)
**Stack liên quan:** Frontend only (Vue.js) — không cần backend changes

---

## Mục tiêu

Giảm số lần gọi API cho các data ít thay đổi (book/video catalogue, categories), cải thiện UX khi user navigate giữa các trang. Hiện tại mỗi lần navigate (Home → Books → Home → Videos) đều trigger toàn bộ API calls từ đầu vì data được giữ trong `ref()` local của từng view component — mất ngay khi component unmount.

Sau khi implement:
- Navigate giữa trang đã visit: data hiển thị ngay từ cache (0ms latency), không có loading spinner
- Category filter (`watch(activeCategory)`) sẽ dùng cache nếu tab đó đã fetch trong TTL
- Server load giảm đáng kể cho các endpoint catalogue

---

## Hiện trạng

**Service layer:** 5 service files (`books.service.js`, `videos.service.js`, `user.service.js`, `wallet.service.js`, `training.service.js`) đều import `api` từ `../api/client` và gọi thẳng `api.get(...)` / `api.post(...)` — không có caching logic nào.

**`src/api/client.js`:** Tạo axios instance với `axios.create()`, export là `api`. Có 2 interceptors:
- Request interceptor: attach JWT từ `localStorage.getItem('access')` vào header `Authorization`
- Response interceptor: handle 401 — tự động refresh token bằng `localStorage.getItem('refresh')`, retry request gốc; nếu refresh fail thì xóa tokens và dispatch `auth:logout` event

**Auth store (`src/stores/auth.js`):** `clearAuth()` là hàm logout — clear tokens khỏi ref + localStorage, gọi `stopAutoRefresh()`. Đây là điểm duy nhất cần thêm `api.storage.clear()`.

**Không có cache nào:** Không có `localforage`, `axios-cache-interceptor`, hay bất kỳ caching layer nào. `package.json` confirm: chỉ có `axios ^1.7.7`, `pinia ^2.2.4`, `vue ^3.5.25`.

**Django backend:** Không set HTTP caching headers (`Cache-Control`, `ETag`). DRF mặc định — browser không cache bất kỳ response nào.

---

## Kiến trúc

Wrap `axiosInstance` trong `client.js` với `setupCache()` từ `axios-cache-interceptor`. Toàn bộ caching logic tập trung tại tầng API client — service files và views chỉ cần thêm `cache` option vào từng call muốn cache.

```
src/api/client.js         <- wrap axiosInstance với setupCache() (MODIFY)
src/api/cache-storage.js  <- localforage adapter dùng buildStorage() (CREATE)
src/services/books.service.js    <- thêm cache TTL option per endpoint (MODIFY)
src/services/videos.service.js   <- thêm cache TTL option per endpoint (MODIFY)
src/services/training.service.js <- thêm cache TTL option per endpoint (MODIFY)
src/stores/auth.js        <- clear cache khi logout trong clearAuth() (MODIFY)
```

**Storage backend:** `localforage` — persistent qua page refresh, dùng IndexedDB ưu tiên, fallback WebSQL rồi localStorage. Instance riêng biệt `thienthu-api-cache` tránh conflict với auth tokens.

**Flow:**
```
Component calls service
  -> service calls api.get(url, { cache: { ttl: X } })
  -> axios-cache-interceptor checks localforage:
       Cache hit (fresh)  : trả về data ngay, không gọi network
       Cache hit (stale)  : trả về data cũ + background revalidate (stale-while-revalidate)
       Cache miss         : fetch từ server -> lưu localforage -> trả về data
```

**Default TTL = 0:** Cache là opt-in per request. Mọi endpoint không được chỉ định `cache` option sẽ không bao giờ cache — đảm bảo an toàn cho wallet, user profile, và các data sensitive.

---

## Implementation

### Bước 1 — Cài packages

Chạy trong thư mục `src/frontend/`:

```bash
npm install axios-cache-interceptor localforage
```

Sau khi install, `package.json` sẽ có thêm 2 dependencies mới.

---

### Bước 2 — Tạo `src/api/cache-storage.js`

File mới, implement localforage adapter theo interface `buildStorage` của `axios-cache-interceptor`.

```js
import { buildStorage } from 'axios-cache-interceptor'
import localforage from 'localforage'

// Instance riêng để tránh conflict với auth tokens trong localStorage
const store = localforage.createInstance({
  name: 'thienthu-api-cache',
  storeName: 'api_cache',
})

export const localforageStorage = buildStorage({
  async find(key) {
    const value = await store.getItem(key)
    // buildStorage expects undefined (not null) for cache miss
    return value ?? undefined
  },

  async set(key, value) {
    await store.setItem(key, value)
  },

  async remove(key) {
    await store.removeItem(key)
  },
})
```

`buildStorage` wrap 3 methods này và add TTL logic, stale-while-revalidate, và deduplication tự động. Không cần implement TTL thủ công.

---

### Bước 3 — Update `src/api/client.js`

Thay đổi tối thiểu: import `setupCache` + `localforageStorage`, wrap instance, giữ nguyên 2 interceptors.

**Trước:**
```js
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => { ... })
api.interceptors.response.use(...)

export default api
```

**Sau:**
```js
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { localforageStorage } from './cache-storage'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const axiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

export const api = setupCache(axiosInstance, {
  storage: localforageStorage,
  ttl: 0,           // default: không cache — opt-in per request
  methods: ['get'], // chỉ cache GET requests, không bao giờ cache POST/PUT/DELETE
  staleIfError: 3_600_000, // nếu server 5xx: dùng cache cũ tối đa 1 giờ (offline resilience)
})

// Giữ nguyên hoàn toàn 2 interceptors hiện tại
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(`${baseURL.replace(/\/$/, '')}/auth/refresh/`, { refresh })
          localStorage.setItem('access', data.access)
          if (data.refresh) localStorage.setItem('refresh', data.refresh)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (_) {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          window.dispatchEvent(new Event('auth:logout'))
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
```

**Lưu ý quan trọng:** `setupCache()` return một cached axios instance — `api` vẫn là axios instance với đầy đủ `.get()`, `.post()`, `.interceptors` API. Không cần thay đổi gì ở các service files ngoài việc thêm `cache` option.

---

### Bước 4 — TTL Strategy per endpoint

| Endpoint | TTL | Lý do |
|---|---|---|
| `books/categories/` | 12 giờ | Admin thêm/xóa category cả tháng mới có — cực stable |
| `videos/categories/` | 12 giờ | Tương tự book categories |
| `books/` (list) | 1 giờ | Admin publish sách không thường xuyên; acceptable lag 1h |
| `videos/` (list) | 1 giờ | Tương tự book list |
| `books/:slug/` (detail) | 1 giờ | Metadata sách (title, price, chapters) ít thay đổi |
| `videos/:slug/` (detail) | 1 giờ | Metadata course tương tự |
| `books/recently-read/` | 5 phút | Thay đổi sau mỗi lần đọc chapter |
| `videos/recently-watched/` | 5 phút | Thay đổi sau mỗi lần xem video |
| `training/lesson/:slug/` | 15 phút | Admin import content mới không thường xuyên |
| `training/chapter/:slug/:order/` | 15 phút | Tương tự training by lesson |
| `training/activities/:id/flashcards/` | 10 phút | Random shuffle per session; không cần fresh mỗi lần trong session |
| `books/:slug/progress/` | **Không cache** | Progress update sau mỗi chapter — cần fresh |
| `videos/:slug/progress/` | **Không cache** | Progress update real-time khi xem |
| `videos/:slug/progress/last-lesson/` | **Không cache** | Cần biết lesson cuối cùng chính xác |
| `books/:slug/chapters/:order/` | **Không cache** | Chapter content có watermark DRM — không cache trên disk |
| `books/:slug/chapters/:order/watermark-config/` | **Không cache** | Security config — phải fresh |
| `training/activities/:id/exam/` | **Không cache** | Exam data cần fresh mỗi session |
| `wallet/me/` | **Không cache** | Balance sai = UX bug nghiêm trọng |
| `wallet/history/` | **Không cache** | Giao dịch mới phải hiển thị ngay |
| `users/me/` | **Không cache** | Avatar, tên user cập nhật phải reflect ngay |
| `users/me/device-status/` | **Không cache** | Security-critical |

---

### Bước 5 — Update service files

Thêm cache constants và `cache` option vào từng endpoint được chọn. Các endpoint không được list dưới đây (POST, watermark, progress, wallet, user) giữ nguyên — không thêm `cache`.

#### `src/services/books.service.js`

```js
import api from '../api/client'

const CACHE_12H = { ttl: 12 * 60 * 60 * 1000 }
const CACHE_1H  = { ttl: 60 * 60 * 1000 }
const CACHE_5M  = { ttl: 5 * 60 * 1000 }

export const booksService = {
  getCategories() {
    return api.get('books/categories/', { cache: CACHE_12H })
  },

  getRecentlyRead() {
    return api.get('books/recently-read/', { cache: CACHE_5M })
  },

  getBooks(params = {}) {
    return api.get('books/', { params, cache: CACHE_1H })
  },

  getBookDetail(slug) {
    return api.get(`books/${slug}/`, { cache: CACHE_1H })
  },

  // Không cache: chapter content, watermark config, progress, purchase
  getChapter(bookSlug, order) {
    return api.get(`books/${bookSlug}/chapters/${order}/`)
  },

  getBookProgress(slug) {
    return api.get(`books/${slug}/progress/`)
  },

  saveChapterProgress(bookSlug, order, data) {
    return api.post(`books/${bookSlug}/chapters/${order}/progress/`, data)
  },

  getWatermarkConfig(bookSlug, order) {
    return api.get(`books/${bookSlug}/chapters/${order}/watermark-config/`)
  },

  purchaseBook(bookId) {
    return api.post('payments/purchase-book/', { book_id: bookId })
  },
}
```

#### `src/services/videos.service.js`

```js
import api from '../api/client'

const CACHE_12H = { ttl: 12 * 60 * 60 * 1000 }
const CACHE_1H  = { ttl: 60 * 60 * 1000 }
const CACHE_5M  = { ttl: 5 * 60 * 1000 }

export const videosService = {
  getRecentlyWatched() {
    return api.get('videos/recently-watched/', { cache: CACHE_5M })
  },

  getCategories() {
    return api.get('videos/categories/', { cache: CACHE_12H })
  },

  getVideos(params = {}) {
    return api.get('videos/', { params, cache: CACHE_1H })
  },

  getVideoDetail(slug) {
    return api.get(`videos/${slug}/`, { cache: CACHE_1H })
  },

  // Không cache: lesson content, progress, purchase, upload
  getLesson(courseSlug, lessonSlug) {
    return api.get(`videos/${courseSlug}/lessons/${lessonSlug}/`)
  },

  updateProgress(courseSlug, lessonSlug, progressSeconds) {
    return api.post(`videos/${courseSlug}/lessons/${lessonSlug}/progress/`, {
      progress_seconds: progressSeconds,
    })
  },

  getCourseProgress(courseSlug) {
    return api.get(`videos/${courseSlug}/progress/`)
  },

  getLastLesson(courseSlug) {
    return api.get(`videos/${courseSlug}/progress/last-lesson/`)
  },

  purchaseCourse(videoId) {
    return api.post('payments/purchase-video/', { video_id: videoId })
  },

  getLessonFlashcards(courseSlug, lessonSlug, count = 10) {
    return api.get(`videos/${courseSlug}/lessons/${lessonSlug}/flashcards/`, { params: { count } })
  },

  getLessonExam(courseSlug, lessonSlug) {
    return api.get(`videos/${courseSlug}/lessons/${lessonSlug}/exam/`)
  },

  uploadLessonVideo(lessonPublicId, file, onProgress) {
    const form = new FormData()
    form.append('video', file)
    return api.post(`videos/lessons/${lessonPublicId}/upload/`, form, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: onProgress,
    })
  },
}
```

#### `src/services/training.service.js`

```js
import api from '../api/client'

const CACHE_15M = { ttl: 15 * 60 * 1000 }
const CACHE_10M = { ttl: 10 * 60 * 1000 }

export const trainingService = {
  getTrainingByLesson(lessonSlug) {
    return api.get(`training/lesson/${lessonSlug}/`, { cache: CACHE_15M })
  },

  getTrainingByChapter(bookSlug, chapterOrder) {
    return api.get(`training/chapter/${bookSlug}/${chapterOrder}/`, { cache: CACHE_15M })
  },

  getFlashcards(activityId, count = 20) {
    return api.get(`training/activities/${activityId}/flashcards/`, {
      params: { count },
      cache: CACHE_10M,
    })
  },

  // Không cache: exam data cần fresh mỗi session
  getExam(activityId) {
    return api.get(`training/activities/${activityId}/exam/`)
  },
}
```

**`src/services/wallet.service.js` và `src/services/user.service.js`:** Không thay đổi — toàn bộ endpoints đều thuộc nhóm "không cache".

---

### Bước 6 — Cache invalidation khi logout

Thêm `api.storage.clear()` vào hàm `clearAuth()` trong `src/stores/auth.js`. Import `api` từ `../api/client`.

**Trước:**
```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { authService } from '../services/auth.service'
// ...

function clearAuth() {
  stopAutoRefresh()
  access.value = null
  refresh.value = null
  user.value = null
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}
```

**Sau:**
```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { authService } from '../services/auth.service'
import { api } from '../api/client'  // thêm import này
// ...

function clearAuth() {
  stopAutoRefresh()
  access.value = null
  refresh.value = null
  user.value = null
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
  api.storage.clear()  // xóa toàn bộ API cache khi logout
}
```

**Lý do clear toàn bộ khi logout:** Cache có thể chứa book/video list data phản ánh trạng thái của user trước (ví dụ `is_purchased: true`). Nếu user khác login trên cùng thiết bị, họ sẽ thấy cache sai. Clear toàn bộ là safe nhất.

---

### Bước 7 — Cache invalidation sau purchase

Sau khi `purchaseBook()` hoặc `purchaseCourse()` thành công, `is_purchased` flag trong book/video detail và list sẽ thay đổi. Cần invalidate cache để reflect trạng thái mới.

`axios-cache-interceptor` lưu cache với key được build từ method + baseURL + path. Cách invalidate cụ thể:

```js
// Trong BookDetailView.vue, sau khi purchaseBook() thành công:
// Xóa cache của book detail và book list để is_purchased refresh ngay
await api.storage.remove(`${api.defaults.baseURL}books/`)
await api.storage.remove(`${api.defaults.baseURL}books/${slug}/`)

// Trong VideoDetailView.vue, sau khi purchaseCourse() thành công:
await api.storage.remove(`${api.defaults.baseURL}videos/`)
await api.storage.remove(`${api.defaults.baseURL}videos/${slug}/`)
```

**Lưu ý:** Cache key format của `axios-cache-interceptor` v1.x có thể khác tùy config. Nên verify key format bằng cách inspect `api.storage` trong browser DevTools sau khi implement, sau đó dùng đúng key. Nếu không chắc, gọi `api.storage.clear()` là safe (clear toàn bộ sau purchase).

---

## Cache TTL Reference

| Endpoint | Service | TTL | Lý do |
|---|---|---|---|
| `GET books/categories/` | booksService | 12 giờ | Admin update cực hiếm |
| `GET videos/categories/` | videosService | 12 giờ | Admin update cực hiếm |
| `GET books/` | booksService | 1 giờ | Catalogue, không cần realtime |
| `GET videos/` | videosService | 1 giờ | Catalogue, không cần realtime |
| `GET books/:slug/` | booksService | 1 giờ | Metadata ổn định |
| `GET videos/:slug/` | videosService | 1 giờ | Metadata ổn định |
| `GET books/recently-read/` | booksService | 5 phút | Thay đổi sau đọc chapter |
| `GET videos/recently-watched/` | videosService | 5 phút | Thay đổi sau xem video |
| `GET training/lesson/:slug/` | trainingService | 15 phút | Stable, admin import hiếm |
| `GET training/chapter/:slug/:order/` | trainingService | 15 phút | Stable |
| `GET training/activities/:id/flashcards/` | trainingService | 10 phút | Per session là đủ |
| `GET books/:slug/progress/` | booksService | **Không cache** | Real-time progress |
| `GET videos/:slug/progress/` | videosService | **Không cache** | Real-time progress |
| `GET videos/:slug/progress/last-lesson/` | videosService | **Không cache** | Navigation accuracy |
| `GET books/:slug/chapters/:order/` | booksService | **Không cache** | DRM/watermark content |
| `GET books/:slug/chapters/:order/watermark-config/` | booksService | **Không cache** | Security config |
| `GET training/activities/:id/exam/` | trainingService | **Không cache** | Exam cần fresh |
| `GET wallet/me/` | walletService | **Không cache** | Balance = financial data |
| `GET wallet/history/` | walletService | **Không cache** | Transaction history realtime |
| `GET /users/me/` | userService | **Không cache** | Profile changes ngay |
| `GET /users/me/device-status/` | userService | **Không cache** | Security-critical |

---

## Files cần thay đổi

| File | Action | Nội dung |
|---|---|---|
| `src/api/cache-storage.js` | CREATE | localforage adapter với `buildStorage()` |
| `src/api/client.js` | MODIFY | Import `setupCache` + `localforageStorage`; wrap `axiosInstance` với `setupCache()` |
| `src/services/books.service.js` | MODIFY | Thêm `CACHE_12H`, `CACHE_1H`, `CACHE_5M`; thêm `cache` option cho 4 endpoints |
| `src/services/videos.service.js` | MODIFY | Thêm `CACHE_12H`, `CACHE_1H`, `CACHE_5M`; thêm `cache` option cho 4 endpoints |
| `src/services/training.service.js` | MODIFY | Thêm `CACHE_15M`, `CACHE_10M`; thêm `cache` option cho 3 endpoints |
| `src/stores/auth.js` | MODIFY | Import `api`; thêm `api.storage.clear()` vào `clearAuth()` |
| `src/frontend/package.json` | AUTO (npm) | Thêm `axios-cache-interceptor` + `localforage` vào dependencies |

---

## Trade-off & lưu ý

### Stale data risk
- **Book list / Video list:** User có thể không thấy sách mới publish trong tối đa 1 giờ. Acceptable vì admin không publish liên tục, và user thường không F5 mong đợi content mới.
- **Category filter:** Khi user chuyển tab category (`watch(activeCategory)` trong `BooksView.vue`), nếu category đó đã được fetch trong TTL, không gọi server. Đây là hành vi mong muốn — giảm redundant calls.
- **Recently read/watched:** Cache 5 phút — nếu user đọc xong chapter rồi ngay lập tức về Home, "Recently Read" section có thể chưa update trong ~5 phút. Trade-off nhỏ, acceptable.

### Cache size
- localforage dùng IndexedDB — không có hard limit nhỏ (browser thường cho phép 50MB–unlimited tùy origin)
- Book list + video list JSON ước tính ~50–200KB tổng — không đáng lo
- Không cần implement cache size limit cho V1

### User-specific data không cache
Các endpoint sau **tuyệt đối không cache** dù chỉ 1 giây:
- `wallet/me/`, `wallet/history/` — financial data
- `users/me/`, `users/me/device-status/` — security
- Chapter content + watermark config — DRM

### Auth-gated endpoints và shared device
Book list / video list trả về `is_purchased` flag theo user hiện tại. Nếu 2 người dùng khác nhau login trên cùng thiết bị (hiếm nhưng có thể), cache của user A sẽ bị clear khi user A logout (`api.storage.clear()` trong `clearAuth()`). User B sẽ thấy fresh data sau khi login — an toàn.

### `staleIfError` behavior
Khi set `staleIfError: 3_600_000`, nếu server trả về 5xx error, axios-cache-interceptor sẽ trả về cached data cũ (dù đã hết TTL) thay vì throw error — tối đa 1 giờ. Điều này có nghĩa app vẫn hiển thị được catalogue dù server tạm thời down. Với wallet/progress (không cache), lỗi server vẫn throw như bình thường.

### Safari Private Mode
IndexedDB trong Safari Private Mode có quota rất nhỏ (~50MB per origin). localforage tự động fallback sang localStorage nếu IndexedDB unavailable. Behavior không thay đổi về mặt logic, chỉ là storage backend khác.

### axios-cache-interceptor v1.x API
- Dùng `setupCache()` (không phải `CacheAxios` hay wrapper khác)
- `buildStorage()` nhận `{ find, set, remove }` — không có `clear` method riêng; `api.storage.clear()` là method của storage object được build
- Cache key tự động từ URL + params — không cần custom key function

---

## Scope V1

- [ ] Cài `axios-cache-interceptor` + `localforage` (`npm install`)
- [ ] Tạo `src/api/cache-storage.js` với localforage adapter (`buildStorage`)
- [ ] Update `src/api/client.js`: wrap với `setupCache()`, `ttl: 0` default, `methods: ['get']`
- [ ] Update `src/services/books.service.js`: cache cho `getCategories`, `getBooks`, `getBookDetail`, `getRecentlyRead`
- [ ] Update `src/services/videos.service.js`: cache cho `getCategories`, `getVideos`, `getVideoDetail`, `getRecentlyWatched`
- [ ] Update `src/services/training.service.js`: cache cho `getTrainingByLesson`, `getTrainingByChapter`, `getFlashcards`
- [ ] Update `src/stores/auth.js`: `api.storage.clear()` trong `clearAuth()`
- [ ] Invalidate book/video cache sau purchase thành công (trong `BookDetailView.vue` + `VideoDetailView.vue`)
- [ ] Test manual: navigate Home → Books → Home → không thấy request mới trong Network tab
- [ ] Test manual: category filter tab switch — lần đầu có network call, lần sau không
- [ ] Test manual: logout → login lại → Network tab có fresh requests (cache cleared)

## Scope V2 (defer)

- [ ] Cache version key theo app version (clear cache khi deploy API format thay đổi) — implement `VITE_APP_VERSION` prefix trong cache key
- [ ] Stale-while-revalidate UI indicator (subtle spinner) khi background revalidating
- [ ] Cache warming: prefetch book/video categories khi app idle sau login
- [ ] Server-side ETag integration (cần Django middleware thêm `ETag` header)
- [ ] Monitor cache hit rate (custom analytics event khi cache hit vs miss)
- [ ] `user_id` prefix trong cache key nếu cần isolate cache cho multi-account scenarios
