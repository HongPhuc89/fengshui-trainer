# Client-Side Caching — Giảm API calls với localforage / axios-cache-interceptor

**Ngày đề xuất:** 2026-03-13
**Nguồn cảm hứng:** Phân tích codebase thực tế — mỗi lần navigate view đều gọi lại API; stale-while-revalidate best practice từ web.dev
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** M (3–5 ngày bao gồm testing)

---

## Vấn đề / Cơ hội

Mỗi lần user navigate giữa các màn hình (Home → Books → Home → Videos), toàn bộ API list được gọi lại từ đầu:

- `HomeView.vue` `onMounted`: gọi đồng thời 4 APIs (`books/`, `books/recently-read/`, `videos/`, `videos/recently-watched/`)
- `BooksView.vue` `onMounted`: gọi đồng thời `books/categories/` + `books/`
- `BooksView.vue` `watch(activeCategory)`: gọi lại `books/` mỗi khi đổi tab category
- `VideosView.vue` `onMounted`: gọi đồng thời `videos/categories/` + `videos/`
- `VideosView.vue` `watch(activeCategory)`: gọi lại `videos/` mỗi khi đổi tab category

Với platform EdTech dạng catalogue (book/video list không đổi hàng giờ), đây là lãng phí bandwidth + server load + UX chậm không cần thiết. Book list và video categories là static data — admin cập nhật rất hiếm (vài lần/tuần), nhưng mỗi user lại gọi lại 100% data mỗi session.

---

## Hiện trạng (từ code thực tế)

1. **Service layer**: Tất cả 7 service files (`books.service.js`, `videos.service.js`, v.v.) đều gọi thẳng `api.get(...)` — không có caching logic nào.

2. **Axios client** (`src/api/client.js`): Chỉ có 2 interceptors — request interceptor để attach JWT token, response interceptor để handle 401 + auto-refresh. Không có cache interceptor.

3. **Pinia store**: Chỉ có duy nhất `auth.js` store. Không có store nào cho books, videos, categories. Data được giữ trong `ref()` local của từng view component — mất khi component unmount (navigate đi rồi về = gọi lại API).

4. **HTTP caching headers từ Django**: Không có. Grep toàn bộ backend source không tìm thấy `cache_control`, `Cache-Control`, `ETag`, hay `cache_page`. DRF mặc định không set caching headers, có nghĩa trình duyệt không cache bất kỳ response nào.

5. **Dependencies hiện tại**: Chưa có `localforage`, `axios-cache-interceptor`, hay `@tanstack/vue-query`. Stack hiện tại: `axios ^1.7.7`, `pinia ^2.2.4`, `vue ^3.5.25`, `vite ^7.3.1`.

---

## Phân loại data theo chiến lược cache

### Cache dài (TTL 1–12 giờ) — data catalogue, ít thay đổi

| Data | API endpoint | TTL gợi ý | Lý do |
|---|---|---|---|
| Book categories | `GET /books/categories/` | 12 giờ | Admin cập nhật cực hiếm — thêm/xóa category cả tháng mới có |
| Video categories | `GET /videos/categories/` | 12 giờ | Tương tự book categories |
| Book list (all) | `GET /books/` | 1 giờ | Admin thêm sách không thường xuyên; user không cần thấy ngay |
| Video list (all) | `GET /videos/` | 1 giờ | Tương tự book list |
| Book detail | `GET /books/:slug/` | 1 giờ | Metadata sách (title, price, chapters) không đổi thường xuyên |
| Video detail | `GET /videos/:slug/` | 1 giờ | Metadata khóa học tương tự |

### Cache ngắn (TTL 5–15 phút) — data thay đổi vừa

| Data | API endpoint | TTL gợi ý | Lý do |
|---|---|---|---|
| Recently read | `GET /books/recently-read/` | 5 phút | Đọc xong chapter → list này thay đổi, nhưng không cần realtime |
| Recently watched | `GET /videos/recently-watched/` | 5 phút | Tương tự recently read |
| Book progress | `GET /books/:slug/progress/` | 5 phút | Progress được POST cập nhật liên tục khi đọc |
| Course progress | `GET /videos/:slug/progress/` | 5 phút | Tương tự book progress |
| Flashcards | `GET /training/activities/:id/flashcards/` | 10 phút | Random shuffle mỗi session, không cần fetch lại nếu trong session |
| Training set | `GET /training/lesson/:slug/` | 15 phút | Thay đổi khi admin import content mới |

### Không cache — data realtime / security-sensitive

| Data | API endpoint | Lý do không cache |
|---|---|---|
| Wallet balance | `GET /wallet/me/` | Thay đổi ngay sau purchase/voucher; sai số dư = UX bug nghiêm trọng |
| Transaction history | `GET /wallet/history/` | Giao dịch mới phải hiển thị ngay |
| User profile | `GET /users/me/` | Avatar, tên user cập nhật phải reflect ngay |
| Device status | `GET /users/me/device-status/` | Security-critical — cần fresh nhất |
| Chapter content | `GET /books/:slug/chapters/:order/` | Có watermark config, DRM — không được cache trên disk |
| Watermark config | `GET /books/:slug/chapters/:order/watermark-config/` | Security config, phải fresh |
| Exam data | `GET /training/activities/:id/exam/` | Random/variant, cần fresh mỗi lần |

---

## Kiến trúc đề xuất

### Option A: axios-cache-interceptor (Khuyến nghị cho V1)

Wrap `axios` instance hiện tại với `axios-cache-interceptor`. Toàn bộ caching logic nằm ở `api/client.js` — service files và views không cần thay đổi.

```
src/api/client.js          ← thêm setupCache(), per-request TTL
src/api/cache-storage.js   ← buildStorage() adapter cho localforage (persistent) hoặc memory
src/services/*.service.js  ← thêm cache config vào từng request có muốn cache
```

Flow:
```
Component calls service → service calls api.get() → axios-cache-interceptor checks cache:
  Hit (fresh):    trả về cached data ngay (0ms latency)
  Hit (stale):    trả về stale data + background revalidate (stale-while-revalidate)
  Miss:           fetch từ server → lưu cache → trả về data
```

Ưu điểm quyết định:
- Không cần refactor views hay services — chỉ thay đổi `client.js` + thêm `cache` option vào từng service call
- Hỗ trợ sẵn ETag, TTL, `stale-while-revalidate`, custom storage (localforage)
- Bundle size nhỏ (~5KB gzip)
- Cache key tự động từ URL + params — không phải tự quản lý key

### Option B: TanStack Vue Query (@tanstack/vue-query)

Thay đổi mạnh hơn: mỗi view/composable phải dùng `useQuery()` thay vì gọi service trực tiếp. Đòi hỏi refactor nhiều components.

### Option C: Custom localforage wrapper composable

Viết `useCache(key, fetcher, ttl)` composable riêng dùng localforage. Phải tự handle TTL, stale-while-revalidate, key management — nhiều boilerplate.

### Option D: Pinia persist plugin

`pinia-plugin-persistedstate` persist store state sang localStorage. Tuy nhiên không có TTL built-in — phải tự implement expiry logic. Hơn nữa hiện tại data không nằm trong store (nằm trong `ref()` local của view), nên phải vừa tạo stores mới vừa implement persist — effort cao hơn Option A.

---

## So sánh công cụ

| Tool | Pros | Cons | Fit với Thiên Thư |
|---|---|---|---|
| **axios-cache-interceptor** | Plug-in vào axios instance hiện tại; không đổi service/view code; TTL per-request; hỗ trợ localforage storage adapter; ETag support; stale-while-revalidate built-in; bundle nhỏ ~5KB | Ít tính năng advanced hơn TanStack Query; không có DevTools GUI | **Phù hợp nhất** — zero-refactor approach, fastest path to value |
| **TanStack Vue Query** | Feature-rich: background sync, pagination, optimistic update, DevTools; ecosystem lớn; TypeScript tốt; community mạnh | Refactor lớn — mọi data fetch phải đổi sang `useQuery()` hook; thêm ~13KB bundle; overkill cho MVP | Tốt cho V2 nếu app phức tạp hơn, nhưng quá nặng cho giai đoạn này |
| **swrv (Kong/swrv)** | Lightweight SWR cho Vue 3; Composition API native | Ít maintained hơn TanStack Query; không hỗ trợ persistent storage (IndexedDB/localforage) out-of-box | Không phù hợp — thiếu persistent cache |
| **localforage + custom wrapper** | Persistent cross-session; full control; không phụ thuộc thêm ngoài localforage | Phải tự implement toàn bộ TTL, SWR, key management, dedup; nhiều bug risk | Quá nhiều boilerplate cho V1 |
| **Pinia persist plugin** | Tích hợp tốt với Pinia; đơn giản để setup | Không có TTL built-in; cần tạo stores mới cho books/videos; không giải quyết category watch re-fetch issue | Có thể dùng bổ sung sau, không phải giải pháp chính |

---

## Khuyến nghị

**Dùng `axios-cache-interceptor` + localforage storage adapter** cho V1.

Lý do:
1. Codebase đang dùng axios 100% — không cần thay đổi service layer hay views
2. Chỉ cần wrap `axios.create()` thành `setupCache(axios.create())` trong `client.js`
3. Per-request TTL: mỗi service call có thể set `cache: { ttl: 60_000 }` khác nhau
4. localforage adapter tích hợp sẵn trong docs — data persist qua page refresh (IndexedDB > WebSQL > localStorage fallback)
5. Stale-while-revalidate pattern: user thấy data cũ ngay lập tức, background fetch update UI sau — không có loading spinner trên navigate
6. Cache invalidation explicit: `api.storage.remove(key)` hoặc `api.storage.clear()` — đơn giản để gọi khi logout hoặc sau purchase

---

## Cache Invalidation Strategy

### Khi nào clear cache

| Trigger | Action | Lý do |
|---|---|---|
| **Logout** (`clearAuth()` trong `auth.js`) | `api.storage.clear()` — xóa toàn bộ cache | Cache có thể chứa data của user khác (thiết bị chung) |
| **Purchase book/video thành công** | Invalidate `books/${slug}/` và `books/` list | `is_purchased` flag thay đổi sau mua → cache cũ hiển thị lock icon sai |
| **Redeem voucher / nạp Linh Thạch** | Không cần clear book/video cache; wallet không cache | Wallet đã excluded khỏi cache strategy |
| **Admin update content** | Không tự động — user sẽ thấy update sau khi TTL hết | Acceptable vì content update không urgent với user |
| **App update (new deploy)** | Clear cache khi version thay đổi | Tránh stale data từ API format cũ |

### Cache key pattern với axios-cache-interceptor

Cache key tự động = URL + query params. Ví dụ:
- `GET /api/books/` → key: `/api/books/`
- `GET /api/books/?category=phong-thuy` → key khác: `/api/books/?category=phong-thuy`
- Điều này có nghĩa category filter cũng được cache — `watch(activeCategory)` sẽ không gọi server nếu category đó đã được fetch trong TTL

---

## Implementation Plan V1

### Bước 1: Cài đặt dependencies

```bash
npm install axios-cache-interceptor localforage
```

### Bước 2: Tạo cache storage adapter

Tạo file `src/api/cache-storage.js`:

```js
import { buildStorage } from 'axios-cache-interceptor'
import localforage from 'localforage'

// Dùng instance riêng để tránh conflict với auth tokens
const store = localforage.createInstance({ name: 'thienthu-api-cache' })

export const localforageStorage = buildStorage({
  async find(key) {
    const value = await store.getItem(key)
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

### Bước 3: Wrap axios instance trong client.js

```js
// src/api/client.js (thay đổi tối thiểu)
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
  ttl: 0,          // mặc định: không cache (opt-in per request)
  methods: ['get'], // chỉ cache GET
  staleIfError: 3_600_000, // nếu server lỗi: dùng cache cũ tối đa 1 giờ
})

// Giữ nguyên 2 interceptors hiện tại (JWT + 401 refresh)
api.interceptors.request.use(/* ... */)
api.interceptors.response.use(/* ... */)
```

### Bước 4: Apply TTL vào từng service call có lợi nhất

```js
// books.service.js
const CACHE_LONG  = { ttl: 60 * 60 * 1000 }        // 1 giờ
const CACHE_CAT   = { ttl: 12 * 60 * 60 * 1000 }   // 12 giờ
const CACHE_SHORT = { ttl: 5 * 60 * 1000 }          // 5 phút

export const booksService = {
  getCategories() {
    return api.get('books/categories/', { cache: CACHE_CAT })
  },
  getBooks(params = {}) {
    return api.get('books/', { params, cache: CACHE_LONG })
  },
  getBookDetail(slug) {
    return api.get(`books/${slug}/`, { cache: CACHE_LONG })
  },
  getRecentlyRead() {
    return api.get('books/recently-read/', { cache: CACHE_SHORT })
  },
  // Không cache: getChapter, getWatermarkConfig, purchaseBook
}
```

### Bước 5: Cache invalidation khi logout và purchase

```js
// auth.js store — thêm vào clearAuth()
import { api } from '../api/client'

function clearAuth() {
  stopAutoRefresh()
  // ... existing clear logic ...
  api.storage.clear() // xóa toàn bộ API cache
}

// books.service.js — sau khi purchase thành công
async purchaseBook(bookId) {
  const res = await api.post('payments/purchase-book/', { book_id: bookId })
  // Invalidate cache của book detail và list để is_purchased flag refresh
  await api.storage.remove(`GET${api.defaults.baseURL}books/`)
  await api.storage.remove(`GET${api.defaults.baseURL}books/${res.data.book_slug}/`)
  return res
},
```

---

## Scope V1 (MVP)

- [ ] Cài `axios-cache-interceptor` + `localforage`
- [ ] Tạo `src/api/cache-storage.js` với localforage adapter
- [ ] Wrap axios instance trong `client.js` với `setupCache()`
- [ ] Apply cache TTL cho: `books/categories/`, `videos/categories/`, `books/`, `videos/`, `books/:slug/`, `videos/:slug/`
- [ ] Apply short TTL cho: `books/recently-read/`, `videos/recently-watched/`
- [ ] Clear cache khi logout trong `auth.js` `clearAuth()`
- [ ] Invalidate book/video cache sau khi purchase thành công
- [ ] Test: navigate Home → Books → Home không gọi lại API (verify trong Network tab)
- [ ] Test: sau logout → login lại → cache bị clear (không còn data của session trước)

## Out of scope V1

- Stale-while-revalidate UI indicator (spinning icon khi background refresh)
- Cache version migration khi deploy API breaking change
- Cache warming (prefetch trên idle)
- Server-side ETag integration (cần thêm Django middleware)

---

## Open questions

1. **Cache phân quyền**: Book list có thể khác nhau tùy `user_type` (FREE vs VIP vs premium). Cache key hiện tại chỉ dựa vào URL — nếu user đăng nhập bằng 2 tài khoản khác nhau (hiếm nhưng có thể), cache có thể bị mix. Giải pháp: thêm `user_id` vào cache key prefix, hoặc clear toàn bộ cache khi switch account.

2. **localforage vs memory-only storage**: localforage (IndexedDB) persist qua page refresh — tốt cho UX nhưng cần kiểm tra platform (Safari Private Mode có limit IndexedDB). Nếu muốn conservative hơn, V1 có thể dùng in-memory storage của axios-cache-interceptor (không persist, nhưng vẫn giúp cho same-session navigation).

3. **Cache size limit**: localforage trên IndexedDB không có hard limit nhỏ, nhưng cần monitor. Book list + video list data không lớn (JSON ~50–200KB), không đáng lo ngại trong giai đoạn đầu.

4. **Content freshness SLA**: Nếu admin publish sách mới, user có thể chờ tối đa 1 giờ mới thấy — có chấp nhận được không? Nếu không, giảm book list TTL xuống 15–30 phút, hoặc chỉ cache categories (12h) và không cache book list (chỉ session-level cache).

---

## Bước tiếp theo

- [ ] Technical lead review kiến trúc, quyết định memory vs. persistent storage cho V1
- [ ] Quyết định cache key strategy có bao gồm `user_id` hay không (xem Open question 1)
- [ ] Viết detail design nếu cần, hoặc implement trực tiếp (scope nhỏ)
- [ ] Verify trên Safari Private Mode (IndexedDB fallback behavior)

---

## Tham khảo

- [axios-cache-interceptor docs](https://axios-cache-interceptor.js.org/)
- [localForage](https://localforage.github.io/localForage/)
- [Stale-While-Revalidate — web.dev](https://web.dev/articles/stale-while-revalidate)
- [TanStack Vue Query overview](https://tanstack.com/query/v5/docs/framework/vue/overview)
- [Kong/swrv — SWR for Vue](https://github.com/Kong/swrv)
- [Markus Oberlehner — SWR Composable with Vue 3](https://markus.oberlehner.net/blog/stale-while-revalidate-data-fetching-composable-with-vue-3-composition-api)
