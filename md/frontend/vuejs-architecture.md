# Vue.js Web App Architecture

## Document Information
- **Project**: Thiên Thư Web Application
- **Framework**: Vue.js 3 + Vite
- **Version**: 1.2
- **Last Updated**: 2026-03-13

---

## Project Structure

```
src/
├── main.js
├── App.vue
├── i18n.js
├── style.css
├── router/
│   └── index.js
├── stores/
│   └── auth.js           ← single Pinia store (auth only; no separate books/videos stores)
├── api/
│   ├── client.js         ← axios + setupCache (axios-cache-interceptor)
│   └── cache-storage.js  ← localforage adapter for cache storage
├── services/             ← all API calls live here (not in stores)
│   ├── auth.service.js
│   ├── books.service.js
│   ├── videos.service.js
│   ├── training.service.js
│   ├── exams.service.js
│   ├── user.service.js
│   └── wallet.service.js
├── composables/
│   └── useDeviceId.js    ← FingerprintJS device ID helper
├── views/
│   ├── HomeView.vue
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── ProfileView.vue
│   ├── BooksView.vue
│   ├── BookDetailView.vue
│   ├── BookReaderView.vue
│   ├── StoreView.vue
│   ├── VideosView.vue
│   ├── VideoDetailView.vue
│   ├── VideoPlayerView.vue
│   ├── TrainingView.vue
│   └── CommunityView.vue
├── components/
│   ├── app/              ← AppHeader, BottomNav, LangSwitcher
│   ├── auth/             ← DeviceLockModal, FormInput, PrimaryButton, etc.
│   ├── training/         ← FlashcardSession, QuizSession, TrainingDrawer, TrainingModeSelector, ActivityCard
│   └── video/            ← VideoPlayerArea, VideoSidebar, FlashcardTab, QuizTab, VideoTabNav, etc.
├── layouts/
│   ├── AppLayout.vue
│   └── AuthLayout.vue
├── locales/
│   ├── en.js
│   └── vi.js
└── utils/
    └── flags.js
```

---

## State Management (Pinia)

There is **one Pinia store**: `auth.js`. There are no separate books/videos/practice stores — all data fetching is handled by the services layer directly inside views.

### Auth Store (`src/stores/auth.js`)

Key responsibilities:
- `access` / `refresh` / `user` refs, persisted to `localStorage` (keys: `access`, `refresh`, `thienthu_user`)
- `isAuthenticated` computed: `!!access && !!user`
- `setTokens()`, `setUser()`, `clearAuth()` — `clearAuth()` also calls `clearApiCache()` to prevent stale purchase data leaking to the next user session
- `startAutoRefresh()` / `scheduleTokenRefresh()` — JWT expiry decoded from payload, refresh scheduled 5 min before expiry
- `fetchMe()` — calls `authService.getMe()`, updates user ref

> Note: No `pinia-plugin-persistedstate` package — persistence is done manually via `localStorage` in store methods.

---

## API Layer (`src/api/`)

### `client.js` — Axios + Cache wrapper

```
axios instance → setupCache(axiosInstance, { storage: localforageStorage, ttl: 0, methods: ['get'], staleIfError: 3_600_000 })
```

- `ttl: 0` = caching is **opt-in per request** (default no cache)
- Only GET requests are cached
- `staleIfError: 3_600_000` — on server 5xx, serve stale cache up to 1 hour (offline resilience)
- Request interceptor: attaches `Authorization: Bearer <token>` from `localStorage.getItem('access')`
- Response interceptor: on 401, attempts token refresh once (`_retry` flag), then retries; on second failure dispatches `auth:logout` event

### `cache-storage.js` — localforage adapter

```
localforage.createInstance({ name: 'thienthu-api-cache', storeName: 'api_cache' })
```

Implements `buildStorage({ find, set, remove })` adapter for `axios-cache-interceptor`.
`clearApiCache()` — exported function, called by auth store on logout.

### Per-service cache TTLs

| Service | Method | TTL |
|---------|--------|-----|
| `books.service.js` | getCategories | 12h |
| | getBooks | 1h |
| | getBookDetail | 1h |
| | getRecentlyRead | 5m |
| `videos.service.js` | getCategories | 12h |
| | getVideos | 1h |
| | getVideoDetail | 1h |
| | getRecentlyWatched | 5m |
| `training.service.js` | getTrainingByLesson | 15m |
| | getTrainingByChapter | 15m |
| | getFlashcards | 10m |

Book/video cache is invalidated after purchase in `BookDetailView.vue` / `VideoDetailView.vue`.

---

## Router Configuration (`src/router/index.js`)

All routes under `/` use `AppLayout` with `meta: { requiresAuth: true }`. Auth routes under `/auth` use `AuthLayout` with `meta: { guest: true }` (redirects to Home if already authenticated).

```
AppLayout (requiresAuth):
  /                    → HomeView
  /profile             → ProfileView
  /books               → BooksView
  /books/:slug         → BookDetailView
  /store               → StoreView
  /videos              → VideosView
  /videos/:slug        → VideoDetailView

Standalone (requiresAuth):
  /videos/:slug/lessons/:lessonSlug   → VideoPlayerView
  /books/:slug/read                   → BookReaderView
  /training/lesson/:lessonSlug        → TrainingView
  /training/chapter/:bookSlug/:chapterOrder → TrainingView

AuthLayout (guest):
  /auth/login          → LoginView
  /auth/register       → RegisterView

Catch-all: redirect → /
```

Navigation guard: unauthenticated → redirect to Login with `?redirect=<path>`; already-authenticated guest route → redirect to Home.

---

## Views

All views are plain `.vue` files (not TypeScript, no Vuetify components). Key views:

| View | Notes |
|------|-------|
| `HomeView.vue` | Greeting, recent books/videos, bottom nav |
| `LoginView.vue` / `RegisterView.vue` | Device lock flow via `DeviceLockModal` |
| `ProfileView.vue` | Name edit, wallet balance, device status; avatar upload (FE pending) |
| `BooksView.vue` | Category filter + search |
| `BookDetailView.vue` | Purchase modal with Linh Thạch balance check |
| `BookReaderView.vue` | PDF viewer via `pdfjs-dist`, watermark, chapter nav, `TrainingDrawer` |
| `StoreView.vue` | Wallet balance, voucher redeem, VIP packages, transaction history |
| `VideosView.vue` | Category filter + search |
| `VideoDetailView.vue` | Purchase modal, lesson list with progress |
| `VideoPlayerView.vue` | Bunny Stream / HTML5 player, `VideoSidebar`, `FlashcardTab`, `QuizTab` |
| `TrainingView.vue` | `TrainingModeSelector` + `FlashcardSession` + `QuizSession` (standalone) |
| `CommunityView.vue` | Placeholder |

---

## Components

### `src/components/app/`
- `AppHeader.vue` — top header bar
- `BottomNav.vue` — mobile bottom navigation (5 tabs: Home / Books / Store / Videos / Profile)
- `LangSwitcher.vue` — VI/EN language toggle

### `src/components/auth/`
- `DeviceLockModal.vue` — device lock / reset flow UI
- `FormInput.vue`, `PrimaryButton.vue`, `AppLogo.vue`, `AuthLink.vue`, `PolicyBox.vue`

### `src/components/training/`
- `FlashcardSession.vue` — flip cards, progress bar, keyboard shortcuts, swipe-up-to-flip, split-panel desktop layout (Feature 12 V1+V1.5)
- `QuizSession.vue` — exam-based quiz
- `TrainingDrawer.vue` — drawer wrapper used in `BookReaderView`
- `TrainingModeSelector.vue` — selector for Flashcard vs Quiz mode
- `ActivityCard.vue` — card showing training activity stats

### `src/components/video/`
- `VideoPlayerArea.vue` — Bunny Stream / HTML5 player wrapper
- `VideoSidebar.vue` — lesson list sidebar
- `FlashcardTab.vue` — embeds `FlashcardSession` in video player tabs
- `QuizTab.vue` — embeds `QuizSession` in video player tabs
- `VideoTabNav.vue` — tab navigation bar (Summary / Transcript / Flashcard / Quiz)
- `LessonListTab.vue`, `LessonMeta.vue`, `LessonNav.vue`, `LessonSummaryTab.vue`, `FullscreenIcon.vue`

---

## Composables

### `useDeviceId.js` (`src/composables/useDeviceId.js`)

Uses `@fingerprintjs/fingerprintjs` to generate a stable browser device ID. Exposed to login/register forms to attach `device_id` to auth requests.

> Note: `ua-parser-js` is NOT a dependency. There is no `useWatermark.js` yet (planned, not implemented).

---

## Internationalization

`vue-i18n` v11 with two locales: `src/locales/en.js` and `src/locales/vi.js`. Config in `src/i18n.js`. Language switcher via `LangSwitcher.vue` + `flag-icons` CSS package.

---

## Environment Configuration

```env
# .env.development (Vite proxy mode — recommended)
VITE_API_BASE_URL=          # empty → api client falls back to /api, Vite proxy handles it

# .env.production
VITE_API_BASE_URL=https://api.fengshui-trainer.com/api
```

---

## Dependencies

Actual `package.json` (`src/frontend/package.json`):

```json
{
  "name": "thienthu-frontend",
  "dependencies": {
    "@fingerprintjs/fingerprintjs": "^5.0.1",
    "axios": "^1.7.7",
    "axios-cache-interceptor": "^1.12.0",
    "flag-icons": "^7.5.0",
    "localforage": "^1.10.0",
    "pdfjs-dist": "^4.10.38",
    "pinia": "^2.2.4",
    "vue": "^3.5.25",
    "vue-advanced-cropper": "^2.8.9",
    "vue-i18n": "^11.2.8",
    "vue-router": "^4.4.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.2",
    "prettier": "^3.3.3",
    "vite": "^7.3.1"
  }
}
```

**Notable differences from original design:**
- No TypeScript, no Vuetify, no video.js, no pinia-plugin-persistedstate, no ua-parser-js
- Added: `axios-cache-interceptor` + `localforage` (client-side caching, Feature 15)
- Added: `pdfjs-dist` (PDF reader in BookReaderView)
- Added: `vue-i18n` + `flag-icons` (i18n, VI/EN)
- Added: `vue-advanced-cropper` (avatar upload modal — FE implementation pending)
- `@fingerprintjs/fingerprintjs` upgraded to v5 (was v4 in original design)
