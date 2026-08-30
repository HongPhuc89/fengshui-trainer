# Implementation Tasks & Progress Tracking

## Document Information
- **Project**: Thiên Thư - Feng Shui Learning Platform
- **Version**: 1.7
- **Last Updated**: 2026-03-13
- **Status**: Phase 1 Backend ✅ Complete | Phase 2 Web MVP 🚧 In Progress | Admin Panel (Django Jazzmin) ✅ Done

---

## Design Documents (md/design/)

> **Lưu ý:** Feature numbering ở đây là số thứ tự của **design doc**, không phải feature number của Phase 2 web frontend.

| # | Doc | Mô tả | Status |
| :--- | :--- | :--- | :--- |
| 1 | [feature-1-auth.md](design/feature-1-auth.md) | User Management & Authentication | ✅ |
| 2 | [feature-2-books.md](design/feature-2-books.md) | Books Module | ✅ |
| 3 | [feature-3-videos.md](design/feature-3-videos.md) | Videos Module | ✅ |
| 4 | [feature-4-exams.md](design/feature-4-exams.md) | Exams & Practice | ✅ |
| 5 | [feature-5-comments.md](design/feature-5-comments.md) | Comments & Interactions | ✅ |
| 6 | [feature-6-notifications.md](design/feature-6-notifications.md) | Notifications | ✅ |
| 7 | [feature-7-wallet.md](design/feature-7-wallet.md) | Wallet & Payment Bridge | ✅ |
| — | [frontend-detail-design.md](design/frontend-detail-design.md) | Frontend design system, Auth, profile, Books/Videos/Practice outlines | ✅ |
| — | [designer-summary.md](design/designer-summary.md) | UX/UI platform overview cho designer | ✅ |
| 8 | [feature-8-vue-setup.md](design/feature-8-vue-setup.md) | Vue.js Project Setup | ✅ |
| 9 | [feature-9-training-architecture.md](design/feature-9-training-architecture.md) | Training Architecture (TrainingSet, TrainingActivity, Activity-based Flashcard/Quiz) | ✅ |
| 10 | [feature-10-simplified-flashcard.md](design/feature-10-simplified-flashcard.md) | Simplified Flashcard (bỏ SM-2, random 20 cards/session) | ✅ |
| 11 | [feature-11-smart-import.md](design/feature-11-smart-import.md) | Smart Content Import (admin import flashcard + quiz từ VideoLesson/BookChapter) | ✅ |
| 12 | [feature-12-flashcard-ui.md](design/feature-12-flashcard-ui.md) | Modern Flashcard UI — V1 (progress bar, hover state, back face styling, keyboard shortcuts, swipe-UP-to-flip) + V1.5 (split-panel desktop layout) | ✅ |
| 13 | [feature-13-content-sync.md](design/feature-13-content-sync.md) | Content Sync — Django management commands export/import books+videos giữa environments | 📝 |
| 14 | [feature-14-firebase-analytics.md](design/feature-14-firebase-analytics.md) | Firebase Analytics — User activity tracking (page_view, purchase, voucher, flashcard, book/video progress) | 📝 |
| 15 | [feature-15-client-caching.md](design/feature-15-client-caching.md) | Client-Side Caching — axios-cache-interceptor + localforage, TTL per endpoint, cache invalidation on logout/purchase | 📝 |
| 16 | [feature-16-pdf-reader-v1.md](design/feature-16-pdf-reader-v1.md) | PDF Reader V1 — Keyboard shortcuts, desktop split-panel TOC sidebar, blur DRM + right-click prevention | 📝 |
| 17 | [feature-17-admin-activity-dashboard.md](design/feature-17-admin-activity-dashboard.md) | Admin Activity Dashboard — DAU & Linh Thạch theo ngày (date range picker, KPI tiles, charts, table) | 📝 |
| 24 | [feature-24-quiz-session-v2.md](design/feature-24-quiz-session-v2.md) | Quiz Session V2 — Immediate per-question feedback, score ring animation, answer review với highlight đúng/sai | 📝 |
| 30 | [feature-30-lesson-infographic.md](design/feature-30-lesson-infographic.md) | Lesson Infographic — Đính kèm lược đồ PDF hoặc video tóm tắt vào VideoLesson; tab "Lược đồ" trong player | 📝 |
| 31 | [feature-31-book-cover-image-optimization.md](design/feature-31-book-cover-image-optimization.md) | Book Cover Image Optimization — Thêm `small_cover` CharField (WebP, Bunny CDN) giữ nguyên `cover_image` gốc trên Supabase | 📝 |
| 32 | [feature-32-change-password.md](design/feature-32-change-password.md) | Change Password — Đổi mật khẩu từ màn hình Profile (IsAuthenticated, verify current_password, Django validate_password) | 📝 |
| 33 | [feature-33-device-geo-location.md](design/feature-33-device-geo-location.md) | Device IP Geolocation — Lưu city/region/country vào UserDevice từ last_ip qua ipinfo.io; async trigger khi tạo device + management command backfill | 📝 |

---

## MVP Definition (Web App)

> **Mục tiêu MVP**: Ra mắt web app đầy đủ chức năng cho phép người dùng đăng ký, mua và học nội dung Phong Thủy (sách + video + luyện tập).

### MVP Scope (Web Only)
| Module | Minimum Required | Priority |
|--------|-----------------|----------|
| Auth | Login + Register + Device lock flow | P0 |
| Profile | Xem profile + cập nhật tên | P0 |
| Trang chủ | Hiển thị nội dung nổi bật + điều hướng | P0 |
| Sách | List + Detail + PDF Reader (watermark) | P0 |
| Video | List + Detail + Player (tiến trình) | P0 |
| Luyện tập | Flashcard + Bài thi (embedded trong Video Player + standalone Training) | P1 |
| Ví / Cửa hàng | Xem số dư + Nạp voucher + Mua nội dung | P0 |
| Thông báo | Danh sách + Đánh dấu đã đọc | P2 |

### Out of Scope cho MVP
- Mobile App (Flutter) — Phase 3
- Push notification (FCM/APNs)
- Admin revenue dashboard (Vue.js admin riêng) — dùng Django Jazzmin thay thế
- Comment system (UI)
- Full E2E test suite

---

## Phase 1: Backend API Development ✅ COMPLETE

### Feature 1: User Management & Authentication ✅
**Priority**: Critical | **Status**: ✅ Implemented

- [x] **1.1 User Model & Database**
  - [x] User model với custom fields (phone_number, user_type, device_id)
  - [x] UserDevice model for device tracking
  - [x] Database migrations
  - [x] BaseModel (Private ID + Public UUID)
  - [ ] Multi-tier Logging (Daily files Dev, Sentry Prod) ← còn lại, post-MVP
  - [x] Admin interface (Jazzmin theme)

- [x] **1.2 Authentication API**
  - [x] POST `/api/auth/register/`
  - [x] POST `/api/auth/login/`
  - [x] POST `/api/auth/refresh/`
  - [x] POST `/api/auth/logout/`
  - [x] Hard Device Locking logic
  - [x] Login-integrated Reset Flow (Cooldown + Confirmation flag)
  - [x] Admin un-link override
  - [x] AdminAuditLog system
  - [ ] Hybrid monetization logic (FREE → VIP → Paid) ← chưa hoàn chỉnh

- [x] **1.3 User Profile API**
  - [x] GET/PUT `/api/users/me/`
  - [x] GET `/api/users/me/device-status/`
  - [x] Admin interface + Audit Log dashboard
  - [ ] POST `/api/users/me/avatar/` ← cần làm (avatar upload + Pillow resize)

---

### Feature 7: Wallet & Payment Bridge ✅ (core done)
**Priority**: Critical | **Status**: ✅ Core | 🚧 Dashboard & Tests pending

- [x] **7.1 Models & Logic** — Wallet, Voucher, Transaction, AdminAuditLog
- [x] **7.2 API** — GET me, POST redeem, GET history, purchase-book/video/subscribe-vip
- [x] **7.3 Admin Voucher Tool** — generate bulk, export CSV
  - [ ] Revenue estimation dashboard (post-MVP)
- [ ] **7.4 Integration** — nút "Mua bằng Linh Thạch" trên detail pages, real-time balance
- [ ] **7.5 Testing** (post-MVP)

---

### Feature 2: Books Module ✅
- [x] Models: BookCategory, Book, BookChapter, UserBookPurchase
- [x] Books API: CRUD + Permission + Watermark config
- [x] Admin: Book management + Chapter inline editor
  - [ ] Bulk import (post-MVP)
- [x] **Admin Smart Import** (Feature 11): Import flashcard + quiz từ BookChapter page ✅

---

### Feature 3: Videos Module ✅
- [x] Models: VideoCourse, VideoLesson, UserVideoPurchase, UserLessonProgress
- [x] API: List, Detail, Progress tracking
- [x] **Admin Smart Import** (Feature 11): Import flashcard + quiz từ VideoLesson page ✅
- [ ] Bunny Stream production setup (post-MVP)

---

### Feature 4: Exams & Practice Module ✅
- [x] **4.1 Standalone Exams** — Exam, PracticeQuestion, UserExamProgress, Submit API
- [x] **4.2 Practice Tower** — PracticeModule, Flashcard models
- [x] **4.3 Training Architecture** (Feature 9) — TrainingSet, TrainingActivity, Activity-based Flashcard/Quiz
- [x] **4.4 Simplified Flashcard** (Feature 10) — bỏ SM-2, random 20 cards, FlashcardReview model giữ nguyên schema

---

### Feature 5: Comments & Interactions ✅
- [x] Comment + CommentReply model với GenericForeignKey
- [x] CRUD APIs với purchase verification

---

### Feature 6: Notifications ✅ (in-app) / 🚧 (email/push)
- [x] In-app Notification: Model + Mark read API
- [x] EmailLog + EmailQuota model
- [ ] Celery task email với quota check (post-MVP)
- [ ] Push notification FCM/APNs (post-MVP)

---

### Feature 14: Firebase Analytics 📝 (chưa implement)
**Priority**: Medium | **Status**: 📝 Design done | **Effort**: S (~1 ngày)

- [ ] **14.1** Cài `firebase` package, tạo `src/plugins/analytics.js` (init + track/identifyUser/clearUser)
- [ ] **14.2** Update `main.js` (use plugin) + `router/index.js` (afterEach → page_view)
- [ ] **14.3** Update `auth.js` — identifyUser sau login, clearUser khi logout
- [ ] **14.4** Track `purchase` trong `BookDetailView.vue` + `VideoDetailView.vue`
- [ ] **14.5** Track `voucher_redeemed` trong `StoreView.vue`
- [ ] **14.6** Thêm `VITE_FIREBASE_*` vào `.env.example`
- [ ] **14.7** Verify events trên Firebase DebugView
- [ ] **14.8** (V2) Track chapter/lesson progress + flashcard session

> **Design doc**: `md/design/feature-14-firebase-analytics.md`
> **Frontend only** — không cần backend changes

---

### Feature 15: Client-Side Caching ✅ COMPLETE
**Priority**: Medium | **Status**: ✅ Implemented (commit a33ccf6) | **Effort**: S

- [x] **15.1** Cài `axios-cache-interceptor` + `localforage` (`npm install` trong `src/frontend/`)
- [x] **15.2** Tạo `src/api/cache-storage.js` — localforage adapter với `buildStorage()` (instance `thienthu-api-cache`)
- [x] **15.3** Update `src/api/client.js` — wrap `axiosInstance` với `setupCache()`, `ttl: 0` default, `methods: ['get']`, `staleIfError: 3_600_000`
- [x] **15.4** Update `src/services/books.service.js` — thêm `cache` option cho `getCategories` (12h), `getBooks` (1h), `getBookDetail` (1h), `getRecentlyRead` (5m)
- [x] **15.5** Update `src/services/videos.service.js` — thêm `cache` option cho `getCategories` (12h), `getVideos` (1h), `getVideoDetail` (1h), `getRecentlyWatched` (5m)
- [x] **15.6** Update `src/services/training.service.js` — thêm `cache` option cho `getTrainingByLesson` (15m), `getTrainingByChapter` (15m), `getFlashcards` (10m)
- [x] **15.7** Update `src/stores/auth.js` — `clearApiCache()` trong `clearAuth()`
- [x] **15.8** Invalidate book/video cache sau purchase trong `BookDetailView.vue` + `VideoDetailView.vue`
- [ ] **15.9** Test: navigate Home → Books → Home không trigger network call (Network tab)
- [ ] **15.10** Test: logout → login lại → fresh requests (cache đã clear)

> **Design doc**: `md/design/feature-15-client-caching.md`
> **Frontend only** — không cần backend changes

---

### Feature 16: PDF Reader V1 — UX & DRM Improvements 📝 (chưa implement)
**Priority:** Medium | **Status:** 📝 Design done | **Effort:** S (~2 ngày)

- [ ] **16.1 Keyboard shortcuts**
  - [ ] Thêm `onKeyDown` handler với switch/case (ArrowLeft, ArrowRight, Space, Shift+Space, +/=, -, T, Escape)
  - [ ] Guard: skip khi `activeElement` là input/textarea/select
  - [ ] Bind `document.addEventListener('keydown', onKeyDown)` trong `onMounted`
  - [ ] Unbind trong `onBeforeUnmount`

- [ ] **16.2 Desktop split-panel layout (≥1024px)**
  - [ ] Thêm `windowWidth` ref + `onWindowResize` function + resize listener
  - [ ] Thêm `isDesktop` computed (`windowWidth >= 1024`)
  - [ ] Wrap `reader__content` + TOC trong `reader__body` div
  - [ ] TOC: `v-if="showToc || isDesktop"` + `isDesktop` class + guard backdrop click
  - [ ] Ẩn TOC close button khi desktop (`v-if="!isDesktop"`)
  - [ ] Disable Transition khi desktop (`:name="isDesktop ? '' : 'toc'"`)
  - [ ] CSS: `.reader__body`, `.reader__body--desktop`, `.reader__toc--desktop`

- [ ] **16.3 DRM protection — blur + right-click prevention**
  - [ ] Thêm `isBlurred` ref + `onVisibilityChange` function
  - [ ] Bind/unbind `visibilitychange` listener
  - [ ] Thêm `:class="{ 'reader__canvas-wrap--blurred': isBlurred }"` vào canvas-wrap
  - [ ] Thêm `@contextmenu.prevent` vào root `.reader` div
  - [ ] CSS: `.reader__canvas-wrap--blurred canvas { filter: blur(14px); }` + `user-select: none`

- [ ] **16.4 Testing**
  - [ ] Keyboard Chrome + Firefox + Safari
  - [ ] Resize desktop ↔ mobile (TOC overlay vs sidebar)
  - [ ] Minimize/switch tab → canvas blur → tab active → clear
  - [ ] Right-click prevention trên canvas + topbar

> **Design doc**: `md/design/feature-16-pdf-reader-v1.md`
> **Frontend only** — `BookReaderView.vue` only, không cần backend changes

---

### Feature 13: Content Sync Commands 📝 (chưa implement)
**Priority**: Medium | **Status**: 📝 Design done

- [ ] **13.1** `sync_content_export` — export BookCategory/Book/BookChapter + VideoCategory/VideoCourse/VideoLesson → JSON portable
  - `--output` flag (default: `content_export.json`)
  - `--models books|videos|all` flag
- [ ] **13.2** `sync_content_import` — import JSON với `update_or_create` theo slug
  - `--input` flag (required)
  - `--dry-run` flag (preview không ghi DB)
- [ ] **13.3** Test thủ công: export staging → import local → verify

> **Design doc**: `md/design/feature-13-content-sync.md`
> **Không cần sync files** — PDF/thumbnail/video đã trên Supabase bucket + Bunny library (shared giữa environments)

---

### Feature 35: Admin quản lý thiết bị mobile ✅ COMPLETE
**Priority**: High | **Status**: ✅ Implemented (2026-08-30)

- [x] **35.1** Nút **Thêm thiết bị** trên `MobileDeviceAdmin` — chọn user, hệ thống tự sinh `client_code` + `pairing_code`
  - `add_view()` thay form ModelAdmin chuẩn, route qua `issue_slot()` để giữ kiểm tra quota dưới row lock
  - Quota đầy → lỗi trên form, không phải 500
- [x] **35.2** Action **Làm mới thiết bị** — reset slot về `UNCLAIMED` tại chỗ, giữ `client_code` và lịch sử
  - Sinh mã mới, xoá `device_id`/`hardware_hash`, gia hạn TTL, reset `claim_attempts`
  - Blacklist token máy cũ để app đăng xuất sạch
- [x] **35.3** `verify_pairing_code()` khớp slot **theo mã** thay vì theo `created_at`
- [x] **35.4** `claim_slot()` bọc `IntegrityError` thành `SlotError` (400 thay vì 500)
- [x] **35.5** Sửa bug có sẵn: `issue_tokens_for_device()` ghi `OutstandingToken` trước khi gắn claim `device_id` → `blacklist_tokens_for_devices()` chưa bao giờ khớp (ảnh hưởng cả `revoke_slots` từ feature-34)
- [x] **35.6** Nút "Làm mới thiết bị" trên change form kèm pop-up xác nhận, POST-only, ẩn với slot đã chết
- [x] **35.7** Test T35-1…T35-21 — 55/55 test backend xanh

> **Design doc**: `md/design/feature-35-admin-refresh-device.md` (v4)
> **Không có migration** — chỉ đổi giá trị trong cột đã có của `users_mobiledevice`

---

### Feature 36: Quản lý phiên bản app & cập nhật trong app ✅ COMPLETE
**Priority**: High | **Status**: ✅ Implemented (2026-08-30)

- [x] **36.0** 🔴 **Hotfix**: `INTERNET` chỉ có trong manifest debug → APK release chưa từng gọi được API. Thêm vào manifest `main`
- [x] **36.1** Model `AppRelease` + migration — `version_code` là đơn vị so sánh duy nhất; `CheckConstraint` chặn `min_supported > version_code`
- [x] **36.2** `GET /api/app/version/` (AllowAny) — trả verdict `BLOCKED` / `AVAILABLE` / `UP_TO_DATE`
- [x] **36.3** `GET /api/app/ios/manifest.plist` — sinh động, ký lại URL IPA mỗi request
- [x] **36.4** `AppReleaseAdmin` — sha256 + file_size tự tính, chặn publish lùi version, hiện phân bố phiên bản đang chạy
- [x] **36.5** Flutter: kiểm tra lúc mở app + resume (throttle 6h), **không** móc vào login
- [x] **36.6** Verdict dính — kiểm tra thất bại không mở khoá được máy đang bị chặn
- [x] **36.7** Nút "Bỏ qua" ghi nhớ theo `version_code`, tự dọn bản ghi cũ
- [x] **36.8** Android: tải bằng dio + verify sha256 theo stream + MethodChannel gọi trình cài đặt; iOS: `itms-services://`
- [x] **36.9** Test — 22 backend (77/77 toàn suite) + 15 Flutter unit

> **Design doc**: `md/design/feature-36-app-version-update.md` (v4)
> ⚠️ **Vận hành**: APK phải ký đúng keystore hiện tại (D1/D3). Mỗi lần build IPA phải export lại profile với UDID hiện hành (O1). Không bao giờ dùng lại một `version_code` đã publish.

---

### Admin Panel — Django Jazzmin ✅
**Thay thế Feature 18 (Vue.js admin riêng)**: Admin chạy trên Django + Jazzmin theme.
- [x] Books, Videos, Exams admin đầy đủ
- [x] Smart Import: Import flashcard + quiz trực tiếp từ VideoLesson/BookChapter page
- [x] Voucher: tạo bulk, export CSV
- [x] User management + Device unlink
- [x] AdminAuditLog dashboard

---

## Phase 2: Vue.js Web App MVP 🚧 IN PROGRESS

> **Lưu ý numbering**: Feature số bên dưới (F-A đến F-K) là tracking nội bộ Phase 2, **độc lập** với số feature design doc (1–11) ở trên.

---

### F-A: Vue.js Project Setup ✅ COMPLETE

- [x] Vite + Vue.js, Pinia + Axios + Vue Router + vue-i18n
- [x] Project structure: `src/api`, `src/components`, `src/layouts`, `src/stores`, `src/router`, `src/style`, `src/services`, `src/composables`
- [x] Pre-commit hooks (Prettier)
- [x] API client + Axios interceptor + JWT auto-refresh
- [x] Device fingerprinting (`composables/useDeviceId.js`)
- [x] Language support (VI + EN)
- [x] Auth store (Pinia)
- [x] `axios-cache-interceptor` + `localforage` installed (Feature 15 caching layer)
- [ ] Watermark composable (`composables/useWatermark.js`) ← còn lại

---

### F-B: Authentication & Profile 🟡

- [x] **Login** (`LoginView.vue`) — phone/email + password + device lock handling
- [x] **Register** (`RegisterView.vue`) — form đầy đủ + device registration
- [x] **DeviceLockModal** component
- [x] Auth store with JWT management

- [🟡] **Profile** (`ProfileView.vue`) — 723 lines, có đầy đủ skeleton:
  - [x] Hiển thị tên, email/phone, loại tài khoản, VIP badge
  - [x] Hiển thị số dư Linh Thạch (wallet store)
  - [x] Form chỉnh sửa tên (inline edit)
  - [x] Device info section (GET `/api/users/me/device-status/`)
  - [x] Nút đăng xuất
  - [ ] Avatar section (upload + crop với `vue-advanced-cropper`) ← cần `POST /api/users/me/avatar/` (BE chưa có)

- [x] **Backend**: `POST /api/users/me/avatar/` — nhận file, Pillow resize 400×400, lưu, trả `avatar_url` ✅ (AvatarUploadView, validate JPEG/PNG/WEBP, max 5MB)

---

### F-C: Home Page ✅ COMPLETE

- [x] **HomeView.vue** — 340 lines, đầy đủ:
  - [x] Greeting với tên user (time-aware) + motto
  - [x] Section "Sách mới" từ API (card grid với badge free/VIP/premium)
  - [x] Section "Video khóa học" từ API (thumbnail, title, category, lesson count)
  - [x] Section "Đọc/Xem gần đây" (recent books + videos với resume overlay)
  - [x] Navigation bottom bar (5 tabs: Home/Books/Store/Videos/Profile via BottomNav.vue)

---

### F-D: Books Module (Web) ✅

- [x] **BooksView.vue** — 633 lines, danh sách sách với filter theo category, search, API thật
- [x] **BookReaderView.vue** — 995 lines, PDF viewer, watermark, chapter navigation, reading progress
- [x] **BookDetailView.vue** — 722 lines, đầy đủ:
  - [x] Nút mua "Mở khóa với X Linh Thạch" (GemIcon)
  - [x] Purchase modal (title, price, balance, kiểm tra đủ tiền, redirect Store nếu thiếu)
  - [x] Chapter list với access control (lock icon, demo badge, check icon)
  - [x] Tích hợp `booksService.purchaseBook()` + error handling

---

### F-E: Videos Module (Web) ✅

- [x] **VideosView.vue** — danh sách khóa học, search + filter từ API
- [x] **VideoDetailView.vue** — 569 lines, danh sách bài học, mô tả, tiến độ, nút Mua
- [x] **VideoPlayerView.vue** — 393 lines, Bunny Stream / HTML5 player, progress tracking, tabs (Summary, Transcript), training sidebar:
  - [x] FlashcardTab (FlashcardSession embedded, 20 cards/session, simplified)
  - [x] QuizTab (lấy exam từ TrainingActivity)
  - [x] VideoSidebar với danh sách bài học
- [x] **TrainingView.vue** — standalone training page cho Flashcard/Quiz theo lesson/chapter

---

### F-F: Practice & Training Module (Web) ✅

> Thay kiến trúc standalone ban đầu: Practice được tích hợp vào Training system (Feature 9/10).

- [x] **TrainingView.vue** — selector + FlashcardSession + QuizSession
- [x] **FlashcardSession.vue** — flip cards, progress, completion (random 20, no SM-2)
- [x] **QuizSession / QuizTab** — bài thi từ Exam gắn TrainingActivity
- [x] Training embedded trong VideoPlayerView (FlashcardTab, QuizTab)
- [x] Training embedded trong BookReaderView (TrainingDrawer)
- [ ] **PracticeView.vue** (standalone practice tower/module list) ← không trong plan hiện tại

---

### F-K: Modern Flashcard UI (Feature 12) ✅ V1 + V1.5 COMPLETE

> **Design doc**: `md/design/feature-12-flashcard-ui.md` ✅ (817 lines)
> **Idea doc**: `md/idea/modern-flashcard-ui.md`
> **Scope**: Frontend only — `FlashcardSession.vue` (532 lines) + `variables.css` + `index.html`

**V1 — ✅ SHIPPED** (`FlashcardSession.vue`):
- [x] **12.1** Progress bar 4px gold, animated, hiển thị "X / Y" (thay dot indicators)
- [x] **12.2** Hover state: `translateY(-4px)` + `--shadow-card-hover` trên desktop (`@media (hover: hover)`)
- [x] **12.3** Back face: gradient gold tint + gold left border 3px
- [x] **12.4** Keyboard shortcuts: Space flip, ArrowLeft/ArrowRight navigate (bind onMounted, unbind onUnmounted, guard form elements)
- [x] **12.5** Swipe UP = flip card (`deltaY < 0 && absY >= 60 && absY > absX`)

**V1.5 — ✅ SHIPPED** (split-panel desktop layout):
- [x] **12.6** Split-panel `!embedded && windowWidth >= 768px`: 60/40 grid (card | card list)
- [x] **12.7** Card list panel: index + category badge only, current card gold border, click to jump, seen cards faded
- [x] Keyboard hint bar hiển thị trong split-panel mode
- [x] Window resize listener (onMounted / onUnmounted)

**Font & CSS (prerequisites — ✅ DONE):**
- [x] Noto Serif SC loaded via Google Fonts CDN (`index.html`)
- [x] `--font-cjk` CSS variable + `--shadow-card-hover` / `--shadow-card-base` (`variables.css`)
- [x] SVG icons thay emoji (checkmark, shuffle)

**V2 — Defer** (cần quyết định image_url backend trước):
- [ ] Card stack visual (pseudo-elements peeking effect)
- [ ] Swipe animation slide-out/in (Vue `<Transition>`)
- [ ] Image/diagram support (`image_url` field — cần BE)
- [ ] Completion screen: hiển thị lesson/chapter name

---

### F-G: Store / Wallet Page ✅ COMPLETE

- [x] **StoreView.vue** — số dư LT, trạng thái VIP, nhập voucher, gói VIP, lịch sử giao dịch, loading/error

---

### F-H: Notifications (Web) ❌

- [ ] **NotificationsView.vue** — danh sách, đánh dấu đã đọc
- [ ] Badge số chưa đọc trên nav
- [ ] `notifications.service.js`

---

### F-I: UX & Polish 🟡

- [x] CSS variables + design system (variables.css)
- [ ] Global error handler (toast notifications)
- [ ] Loading skeleton components (tái sử dụng)
- [ ] Empty state components
- [ ] Confirmation modal khi mua sách/video
- [ ] Insufficient balance → redirect Store
- [ ] Responsive check (375px / 768px / 1024px+)
- [ ] Disable right-click + CSS screenshot prevention trên reader/player
- [ ] Watermark composable (`useWatermark.js`)

---

### F-J: API Services Layer ✅ (mostly)

- [x] `auth.service.js` — login, register, refresh token
- [x] `wallet.service.js` — balance, transactions, voucher redeem
- [x] `books.service.js` — getCategories (cache 12h), getBooks (cache 1h), getBookDetail (cache 1h), getChapter, getRecentlyRead (cache 5m), purchaseBook
- [x] `videos.service.js` — getVideos (cache 1h), getVideoDetail (cache 1h), getLesson, getCategories (cache 12h), getRecentlyWatched (cache 5m), updateProgress, purchaseVideo
- [x] `training.service.js` — getTrainingByLesson (cache 15m), getTrainingByChapter (cache 15m), getFlashcards (cache 10m), getExam
- [x] `exams.service.js` — submitExam
- [x] `user.service.js` — getProfile, updateProfile, getDeviceStatus
- [ ] `notifications.service.js` — getNotifications, markRead, markAllRead

---

## Phase 3: Flutter Mobile App (Post-MVP)

**Status**: ❌ Not started — sau khi web MVP hoàn thành

- [ ] Flutter project setup
- [ ] Auth screens
- [ ] Books reader (PDF + watermark)
- [ ] Video player (+ FLAG_SECURE screenshot prevention)
- [ ] Practice / Training module
- [ ] Wallet & store

---

## Phase 4: Testing & Production Deployment

### Integration Testing (Post-MVP)
- [ ] Backend API tests
- [ ] E2E tests (Cypress)
- [ ] Cross-browser testing
- [ ] Load testing

### Production Deployment
- [ ] VPS provisioning (Hetzner CPX21), Docker + Nginx, SSL, domain
- [ ] Django API + Gunicorn + Celery
- [ ] Database migration (PostgreSQL)
- [ ] Sentry monitoring
- [ ] Build + deploy Vue.js static files via Nginx
- [ ] Mobile: APK/AAB + IPA → Google Play + App Store

---

## Progress Tracking Legend

- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed
- `[🟡]` Substantially done, chi tiết cần verify
- `[!]` Blocked/Issues

---

## Current Sprint (2026-03-13)

**Branch**: `main`

### Đã hoàn thành (Phase 1 Backend)
- [x] Auth, Books, Videos, Exams, Wallet, Notifications APIs
- [x] Training Architecture (Feature 9) — TrainingSet, TrainingActivity
- [x] Simplified Flashcard (Feature 10) — bỏ SM-2
- [x] Smart Content Import (Feature 11) — admin import từ VideoLesson/BookChapter
- [x] Admin panel (Django Jazzmin) đầy đủ
- [x] Avatar upload endpoint (`POST /api/users/me/avatar/`) — Pillow 400×400, validate JPEG/PNG/WEBP

### Đã hoàn thành (Phase 2 Frontend)
- [x] Vue.js setup + Pinia + Axios + Router + i18n
- [x] Auth flows (Login + Register + Device lock)
- [x] StoreView.vue (Wallet + Voucher + VIP)
- [x] BooksView.vue + BookReaderView.vue + BookDetailView.vue (purchase modal)
- [x] VideosView.vue + VideoDetailView.vue + VideoPlayerView.vue
- [x] TrainingView.vue + FlashcardSession.vue (Feature 12 V1+V1.5) + QuizTab
- [x] HomeView.vue đầy đủ (greeting, recent content, books, videos, bottom nav)
- [x] ProfileView.vue (phần lớn — trừ avatar crop modal)
- [x] Tất cả services: auth, wallet, books, videos, training, exams, user
- [x] **Feature 15** — Client-side caching (axios-cache-interceptor + localforage)
- [x] **CORS fix** — `VITE_API_BASE_URL=` (empty) dùng Vite proxy thay vì bypass

### Còn lại (theo thứ tự ưu tiên)
1. **Avatar upload FE** — crop modal (`vue-advanced-cropper`) + `POST /api/users/me/avatar/`
2. **notifications.service.js** + NotificationsView.vue + badge unread trên nav
3. **UX polish** — toast errors, loading skeletons, empty states, responsive check (375/768/1024px)
4. **Watermark composable** (`useWatermark.js`) — dùng cho BookReader + VideoPlayer
5. **Feature 14** — Firebase Analytics (design done, chưa implement)
6. **Feature 13** — Content Sync commands (design done, chưa implement)
7. **Feature 16** — PDF Reader V1 (keyboard shortcuts + desktop split-panel + blur/right-click DRM, design done)
8. **Feature 17** — Admin Activity Dashboard (DAU + LT theo ngày, design done)
8. Feature 12 V2 — card stack, swipe animation, image support (defer đến có quyết định BE)

---

## MVP Completion Checklist

### Backend ✅ Ready
- [x] Auth, Books, Videos, Exams, Wallet, Notifications APIs
- [x] Training API (Feature 9/10)
- [x] Admin Smart Import (Feature 11)
- [x] Avatar upload endpoint (`POST /api/users/me/avatar/`)

### Web Frontend
- [x] Vue.js setup + Auth + Wallet + Store
- [x] Books (list + reader + detail + purchase)
- [x] Videos (list + detail + player + training)
- [x] Training (flashcard V1+V1.5 + quiz)
- [x] Home Page (greeting, recent, books, videos, bottom nav)
- [x] Profile (phần lớn)
- [x] All API services (trừ notifications)
- [x] Client-side caching (Feature 15)
- [ ] Avatar upload UI (crop modal — FE còn lại)
- [ ] Notifications center (NotificationsView + notifications.service.js)
- [ ] Watermark composable (`useWatermark.js`)
- [ ] UX polish (toast, skeletons, empty states, responsive check)
- [ ] Right-click prevention trên reader/player
- [ ] Firebase Analytics (Feature 14 — design done)

---

## Phase 1 Completion Summary

| Feature | Status |
|---------|--------|
| 1. User Management & Auth | ✅ |
| 2. Books Module | ✅ |
| 3. Videos Module | ✅ (Bunny Stream prod pending) |
| 4. Exams & Practice + Training | ✅ |
| 5. Comments & Interactions | ✅ |
| 6. Notifications | ✅ in-app, 🚧 email/push post-MVP |
| 7. Wallet & Payment | ✅ core, 🚧 revenue dashboard post-MVP |
| 9. Training Architecture | ✅ |
| 10. Simplified Flashcard | ✅ |
| 11. Smart Content Import | ✅ |

## Phase 2 Progress Summary

| Feature | Status |
|---------|--------|
| F-A. Vue.js Setup | ✅ |
| F-B. Auth & Profile | 🟡 (avatar FE crop modal còn lại) |
| F-C. Home Page | ✅ |
| F-D. Books (Web) | ✅ |
| F-E. Videos (Web) | ✅ |
| F-F. Training/Practice (Web) | ✅ |
| F-G. Store / Wallet (Web) | ✅ |
| F-H. Notifications (Web) | ❌ |
| F-I. UX & Polish | 🟡 (CSS done, toast/skeleton/responsive pending) |
| F-J. API Services | 🟡 (notifications.service.js còn lại) |
| F-K. Modern Flashcard UI V1+V1.5 (Feature 12) | ✅ (V2 deferred) |
| Feature 13. Content Sync Commands | 📝 Design done, chưa implement |
| Feature 14. Firebase Analytics | 📝 Design done, chưa implement |
| Feature 15. Client-Side Caching | ✅ |
| Feature 16. PDF Reader V1 (UX + DRM) | 📝 Design done, chưa implement |
| Feature 17. Admin Activity Dashboard | 📝 Design done, chưa implement |

---

*Last updated: 2026-03-13 (v1.7 — Feature 17 Admin Activity Dashboard design doc added)*
