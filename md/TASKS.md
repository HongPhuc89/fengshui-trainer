# Implementation Tasks & Progress Tracking

## Document Information
- **Project**: Thiên Thư - Feng Shui Learning Platform
- **Version**: 1.8
- **Last Updated**: 2026-09-01
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
| 34 | [feature-34-mobile-device-app-consolidated.md](design/feature-34-mobile-device-app-consolidated.md) | **Consolidated** (thay thế feature-34…41 gốc) — Mobile Device & Pairing (bảng riêng, khoá 1 máy/user, admin issue/refresh slot, pairing_code 6 ký tự), App Version & Update (Android-only, singleton), Mobile UI Parity (PDF reader cuộn liên tục, Video/Book Detail giống web) | ✅ |
| 35 | [feature-35-background-apk-download.md](design/feature-35-background-apk-download.md) | Background APK Download — Tải APK cập nhật chạy nền bằng Android Foreground Service | 📝 |

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

### Feature 34: Mobile Device, App Update & Mobile UI Parity ✅ COMPLETE

> **Design doc (consolidated)**: [feature-34-mobile-device-app-consolidated.md](design/feature-34-mobile-device-app-consolidated.md) — gộp 8 design doc gốc (feature-34…41 numbering cũ, đã xoá) thành một tài liệu duy nhất, verify lại với code hiện tại. Các mục con dưới đây giữ lại làm nhật ký implement chi tiết theo từng sub-feature (numbering `34.x` gốc — trước đây đánh số 35–41 độc lập, nay gộp lại làm sub-section của Feature 34 để giải phóng dải số 35+ cho các feature mới).

---

#### 34a. Admin quản lý thiết bị mobile ✅ COMPLETE
**Priority**: High | **Status**: ✅ Implemented (2026-08-30)

- [x] **34a.1** Nút **Thêm thiết bị** trên `MobileDeviceAdmin` — chọn user, hệ thống tự sinh `client_code` + `pairing_code`
  - `add_view()` thay form ModelAdmin chuẩn, route qua `issue_slot()` để giữ kiểm tra quota dưới row lock
  - Quota đầy → lỗi trên form, không phải 500
- [x] **34a.2** Action **Làm mới thiết bị** — reset slot về `UNCLAIMED` tại chỗ, giữ `client_code` và lịch sử
  - Sinh mã mới, xoá `device_id`/`hardware_hash`, gia hạn TTL, reset `claim_attempts`
  - Blacklist token máy cũ để app đăng xuất sạch
- [x] **34a.3** `verify_pairing_code()` khớp slot **theo mã** thay vì theo `created_at`
- [x] **34a.4** `claim_slot()` bọc `IntegrityError` thành `SlotError` (400 thay vì 500)
- [x] **34a.5** Sửa bug có sẵn: `issue_tokens_for_device()` ghi `OutstandingToken` trước khi gắn claim `device_id` → `blacklist_tokens_for_devices()` chưa bao giờ khớp (ảnh hưởng cả `revoke_slots`)
- [x] **34a.6** Nút "Làm mới thiết bị" trên change form kèm pop-up xác nhận, POST-only, ẩn với slot đã chết
- [x] **34a.7** Test T35-1…T35-21 (numbering test gốc, giữ nguyên) — 55/55 test backend xanh

> **Không có migration** — chỉ đổi giá trị trong cột đã có của `users_mobiledevice`

---

#### 34b. Quản lý phiên bản app & cập nhật trong app ✅ COMPLETE
**Priority**: High | **Status**: ✅ Implemented (2026-08-30)

- [x] **34b.0** 🔴 **Hotfix**: `INTERNET` chỉ có trong manifest debug → APK release chưa từng gọi được API. Thêm vào manifest `main`
- [x] **34b.1** Model `AppRelease` + migration — `version_code` là đơn vị so sánh duy nhất; `CheckConstraint` chặn `min_supported > version_code`
- [x] **34b.2** `GET /api/app/version/` (AllowAny) — trả verdict `BLOCKED` / `AVAILABLE` / `UP_TO_DATE`
- [x] **34b.3** `GET /api/app/ios/manifest.plist` — sinh động, ký lại URL IPA mỗi request
- [x] **34b.4** `AppReleaseAdmin` — sha256 + file_size tự tính, chặn publish lùi version, hiện phân bố phiên bản đang chạy
- [x] **34b.5** Flutter: kiểm tra lúc mở app + resume (throttle 6h), **không** móc vào login
- [x] **34b.6** Verdict dính — kiểm tra thất bại không mở khoá được máy đang bị chặn
- [x] **34b.7** Nút "Bỏ qua" ghi nhớ theo `version_code`, tự dọn bản ghi cũ
- [x] **34b.8** Android: tải bằng dio + verify sha256 theo stream + MethodChannel gọi trình cài đặt; iOS: `itms-services://`
- [x] **34b.9** Giữ file 3 bản mới nhất mỗi nền tảng (xoá file, giữ row) + command `prune_app_releases`
- [x] **34b.10** Sửa `LocalFirstSupabaseStorage.delete()` — trước đó xoá file chỉ xoá bản local, object trên Supabase còn mãi (ảnh hưởng mọi `FileField`)
- [x] **34b.11** Test — 29 backend (86/86 toàn suite) + 15 Flutter unit

> ⚠️ **Vận hành**: APK phải ký đúng keystore hiện tại (D1/D3). Mỗi lần build IPA phải export lại profile với UDID hiện hành (O1). Không bao giờ dùng lại một `version_code` đã publish.
> **Thay thế bởi 34c** — iOS chuyển sang TestFlight, Android đơn giản hoá còn 1 bản duy nhất.

---

#### 34c. Đơn giản hoá cập nhật app — chỉ APK, 1 bản duy nhất ✅ COMPLETE
**Priority**: High | **Status**: ✅ Implemented (2026-08-31)

- [x] **34c.1** `AppRelease` trở thành singleton (Android only, `platform` unique) — migration 0002 viết lại tại chỗ + seed 1 row
- [x] **34c.2** `version_code`/`version_name` tự đọc từ APK bằng `pyaxmlparser` trong `AppReleaseForm.clean_file()` — validate trước khi lưu, không nhập tay
- [x] **34c.3** Upload APK mới thành công → xoá file cũ trong `save_model()` (kể cả trên Supabase, tái dùng `LocalFirstSupabaseStorage.delete()`)
- [x] **34c.4** `GET /api/app/version/` rút gọn — không còn query param, không còn `min_supported_version_code`/`update_status`
- [x] **34c.5** Bỏ hẳn iOS OTA (`ios/manifest.plist`, `itms-services://`) — TestFlight thay thế toàn bộ
- [x] **34c.6** Bỏ hẳn mức "chặn cứng" — chỉ còn 1 modal nhắc, luôn đóng được
- [x] **34c.7** Xoá `release_pruning`, `prune_app_releases`, `version_spread`, `app_version.py` — không còn tác dụng
- [x] **34c.8** Mobile: `UpdateCubit.check()` bỏ qua trên iOS; `UpdateDecider` gộp về 1 hàm so sánh; bỏ `LastVerdict`/`BlockUpdate`
- [x] **34c.9** Giữ nguyên 100% luồng tải + verify sha256 + tự mở trình cài đặt Android (`AndroidInstaller`, `FileProvider`)
- [x] **34c.10** Test — 12 backend mới (76/76 toàn suite core+users) + 16 Flutter unit

> **Vận hành**: migration `0002_apprelease` được viết lại tại chỗ (không giữ lịch sử schema cũ) — chỉ an toàn vì dự án chưa lên production, mọi DB đã áp dụng migration cũ phải `migrate core 0001` trước khi pull code mới (§3.7).

---

#### 34d. Rút ngắn `pairing_code` từ 12 xuống 6 ký tự ✅ COMPLETE
**Priority**: Medium | **Status**: ✅ Implemented (2026-08-31)

- [x] **34d.1** `PAIRING_BODY_LENGTH` 12 → 6, chia nhóm 3-3 (`TT-XXX-XXX`) thay vì 4-4-4 — không đổi schema, không migration
- [x] **34d.2** `pairing_code_display()` (admin mask) cập nhật theo nhóm mới
- [x] **34d.3** Mobile: `PairingCodeFormatter` (`pairing_code_field.dart`) chia nhóm 3, hint text `XXX-XXX`
- [x] **34d.4** Mã 12 ký tự đã phát trước khi deploy vẫn verify được bình thường (`normalize_code()` so theo giá trị, không theo độ dài) — có test riêng khẳng định
- [x] **34d.5** Test — 2 test backend mới (78/78 toàn suite core+users) + 7 Flutter formatter test

> **Lý do**: rào chắn thật là auth-gate (phải đăng nhập đúng trước) + 5 lần thử sai + hết hạn 7 ngày, không phải độ dài mã — 6 ký tự (~30 bit) vẫn dư an toàn hàng tỷ lần so với ngưỡng cần.

---

#### 34e. Mobile PDF Reader — cuộn liên tục, giữ load theo chapter ✅ COMPLETE
**Priority**: Medium | **Status**: ✅ Implemented (2026-09-01)

- [x] **34e.1** `PdfView`/`PdfController` (paged, vuốt ngang) → `PdfViewPinch`/`PdfControllerPinch` (cuộn dọc liên tục + pinch-zoom) — cùng package `pdfx` đã dùng, không thêm dependency
- [x] **34e.2** Load PDF theo chapter (decrypt lazy per-chapter) giữ nguyên 100% — không đổi API/DRM
- [x] **34e.3** Nút "Chương tiếp theo"/"Chương trước" ở đúng ranh giới chapter — tìm chapter kế/trước theo `order` gần nhất (không giả định `order` liên tục 1..N)
- [x] **34e.4** Vá bug có sẵn: TOC mobile luôn rỗng (`chapters: const []` hard-code) — nay lấy từ `getBookDetail()` thật
- [x] **34e.5** Vá bug phát hiện khi implement: `PdfViewPinch` không có `didUpdateWidget`, đổi `controller` mà không đổi `key` khiến Flutter tái dùng State cũ → hiện nhầm nội dung chương trước. Fix: `key: ValueKey(_bloc.pdfController)`
- [x] **34e.6** Tách event `ChangePage` (điều hướng chủ động — slider/mũi tên, gọi `jumpToPage`) vs `PageScrolled` (viewer tự báo khi cuộn tay — không gọi `jumpToPage`, tránh giằng gesture)
- [x] **34e.7** UI polish theo phản hồi tay: top bar (nút TOC) nền đặc hơn thay vì mờ dần cả thanh; bottom bar (page indicator + mũi tên) thêm `SafeArea(minimum:...)` + padding, tránh dán sát vùng gesture-nav hệ điều hành

> **Đã test trên thiết bị Android thật** (build debug, backend local docker): cuộn, pinch-zoom, watermark, TOC, chuyển chương lần đầu (nội dung đúng) — xác nhận qua ảnh chụp màn hình trực tiếp trên máy.
> **Còn treo, chưa tự xác nhận lại**: trang đích chính xác sau khi chuyển chương (kỳ vọng về trang 1, code review đúng logic nhưng chưa re-test sạch do lỗi tọa độ ADB khi test tay); chưa có bloc test (module `books` mobile hiện chưa có tiền lệ test nào).
> **Superseded**: quyết định C3 trong `feature-20-mobile-app.md` ("Swipe = chuyển trang trong cùng chapter") — đã đánh dấu trong doc đó.

---

#### 34f. Mobile Video Detail — thumbnail bài học + header khoá học giống web ✅ COMPLETE
**Priority**: Medium | **Status**: ✅ Implemented (2026-09-02)

- [x] **34f.1** Thumbnail 72×42 trong `lesson_list_item.dart` (dữ liệu đã sẵn end-to-end, chỉ thiếu render) — dùng `CachedNetworkImage` đúng pattern `video_card.dart`
- [x] **34f.2** Header khoá học: giảng viên, badge trình độ (màu theo cấp), tag số bài học + tổng thời lượng, progress bar %, mô tả "Xem thêm"/"Thu gọn" — parse thêm 4 field backend đã có sẵn (`instructor`, `level`, `total_lessons`, `total_duration_seconds`) vào `VideoDetail`/`VideoDetailModel`
- [x] **34f.3** Thêm `getCourseProgress()` gọi `GET /api/videos/{slug}/progress/` (endpoint có sẵn, chưa ai dùng) — fetch song song với detail, lỗi không chặn nội dung chính
- [x] **34f.4** Bỏ `_PriceSection` hiển thị giá thường trực (kể cả khi đã mua) — gộp về 1 CTA duy nhất theo `canAccess`
- [x] **34f.5** Bỏ hero-image `SliverAppBar`, thay bằng back-link "‹ Khóa học" — theo yêu cầu trực tiếp của user, khớp 100% web (web cũng đã bỏ banner này)
- [x] **34f.6** Vá bug phát hiện khi test: `PdfViewPinch`-style bug tương tự không xảy ra ở đây, nhưng phát hiện bug khác — backend **chưa từng trả** `last_watched_lesson` trong response course-detail (field chết từ trước, mobile đọc nhầm), và mobile **chưa từng gọi** `POST .../progress/last-lesson/` để đánh dấu bài đang xem. Fix: `VideoPlayerBloc` gọi `setLastLesson()` fire-and-forget khi load bài; label CTA đổi sang dùng `progress.completedLessons > 0` (đúng, giống web) thay vì field chết; đích đến CTA gọi `getLastLessonOrder()` lazy lúc bấm (giống web `startOrContinue()`)
- [x] **34f.7** Refetch `LoadVideoDetail(forceRefresh: true)` khi quay lại từ player — Flutter Navigator giữ nguyên bloc/state khi pop, không tự remount như Vue Router (khác biệt kiến trúc điều hướng thật, không phải bug)

> **Đã test trên thiết bị Android thật + verify qua DB** (`UserCourseProgress.last_lesson`): mở bài 1 → quay lại → CTA vào đúng bài 1; mở bài 3 → quay lại → CTA vào đúng bài 3 (loại trừ trùng hợp fallback). Badge trình độ + tag số bài/thời lượng + thumbnail đã xác nhận đúng trên máy thật.
> **Còn treo**: label "Tiếp tục học" (cần hoàn thành ≥1 bài thật để test, chưa mô phỏng được qua ADB); dòng giảng viên trên khoá có data (chưa chụp được ảnh trực tiếp do lỗi tọa độ ADB, nhưng cùng pattern code đã xác nhận đúng ở phần tag).
> **Lưu ý rollout**: cache `videoDetail` cũ (trước khi có field mới) sẽ thiếu header đúng cho tới khi TTL hết hạn hoặc user pull-to-refresh — không phải bug, cần lưu ý khi test bản nâng cấp.

---

#### 34g. Mobile Book Detail — badge/CTA/tiến độ đọc giống web ✅ COMPLETE
**Priority**: Medium | **Status**: ✅ Implemented (2026-09-02)

- [x] **34g.1** Vá bug parse field không tồn tại: `isVipOnly` đọc `json['is_vip_only']` — backend không có field này, VIP là thuộc tính **user** (`user_type`) chứ không phải sách. Xoá `isVipOnly` khỏi `BookDetail` (chỉ phạm vi Detail — `Book` dùng cho `book_card.dart`/danh sách giữ nguyên, bug đó vẫn còn, ghi nhận follow-up ngoài phạm vi), lấy VIP qua `AuthCubit` (bloc inject thêm `AuthCubit`, cần chạy lại `build_runner` để regenerate DI config)
- [x] **34g.2** Thêm `isFree`, `smallCoverUrl` vào `BookDetail`/`BookDetailModel` (field backend có sẵn, chưa parse)
- [x] **34g.3** Badge row: Miễn phí/VIP/Đã mua (ưu tiên 1 trong 3) + Mới + category — trước đó chỉ có category chip
- [x] **34g.4** CTA gộp về 1 nút không điều kiện theo `hasPurchased` riêng (trước đó free/VIP-chưa-mua không có nút nào) — theo đúng `isUnlocked = isFree || isVip || hasPurchased`
- [x] **34g.5** Thêm `getReadingProgress()` vào `BookDetailBloc`, chỉ fetch khi sách đã unlock (giống web) — trước đó `book_detail_bloc.dart` chưa từng gọi, nhánh "Tiếp tục đọc" cũ dựa vào field chết (`reading_progress` không tồn tại trong response thật)
- [x] **34g.6** Badge "Trang X" + highlight viền vàng cho chương đang đọc dở trong `_ChapterListItem`, header đổi "Danh sách chương" → "Nội dung · N chương"
- [x] **34g.7** Refetch khi quay lại từ reader — áp cả 2 call-site (nút CTA + tap từng chương), theo đúng pattern 34f

> **Build sạch** (`flutter analyze` 0 lỗi, `flutter build apk` thành công) — chưa kịp test lại trên thiết bị thật (mất kết nối ADB giữa chừng, user chuyển sang tự chạy `flutter run`).
> **Quyết định đáng chú ý**: endpoint `GET /books/{slug}/progress/` luôn trả mặc định `{chapter_order:1, current_page:1}` khi chưa có tiến độ (không trả null/404) — không thể dùng "có giá trị hay không" để suy ra "đã đọc chưa" (cùng bẫy đã gặp ở 34f với last-lesson). Công thức dùng: `currentPage > 1 || có chương completed` — PO đã duyệt, chấp nhận edge case hiếm (đọc đúng hết trang 1 rồi thoát vẫn hiện "Đọc ngay").
- [x] **34g.8** Bỏ hero-image `SliverAppBar` full-viền → back-link "‹ Danh sách sách" + thumbnail nhỏ (80×110, bo góc) đặt cạnh title/author/badge — theo yêu cầu trực tiếp user sau khi so ảnh web thật (đảo quyết định v1, giống cách 34f đã làm với Video Detail)
- [x] **34g.9** Vá bug phát hiện khi test trên máy thật: `saveChapterProgress()` (mobile) **chưa từng gửi cờ `completed`** lên backend (`BookChapterProgressUpdateView` mặc định `False` nếu thiếu) — nên chương đọc xong không bao giờ hiện dấu ✓, dù `is_completed` đã parse đúng từ lâu. Fix: `book_reader_bloc.dart` tính `completed = currentPage >= totalPages` và gửi ở mọi lần lưu (không chỉ khi true, để cuộn lùi lại đúng un-mark) — xuyên suốt `saveChapterProgress` ở datasource/repository. **Lưu ý**: chỉ áp dụng cho lần lưu mới, không backfill dữ liệu `completed=False` đã lưu sai từ trước.
- [x] **34g.10** Chapter list: mỗi chương tách thành card riêng (bo góc, cách nhau 8px) thay vì list liền mạch — theo ảnh tham chiếu web
- [x] **34g.11** Dấu ✓ chương hoàn thành: màu đúng `--accent-gold` (không phải xanh lá như thử ban đầu), và bỏ nền tròn — chỉ dấu tick trơn, khớp đúng `CheckIcon.vue` thật bên web (stroke polyline, không có circle background)
- [x] **34g.12** Vá bug có sẵn (ảnh hưởng cả Video Detail 34f): `CustomScrollView` thiếu `physics: AlwaysScrollableScrollPhysics()` → pull-to-refresh không hoạt động khi nội dung ngắn hơn màn hình (không đủ để tạo overscroll) — đúng tình huống phổ biến (sách/khoá ít chương). Sửa cả 2 file.

> **Đã test trên thiết bị Android thật** (kể cả set/revert tạm `UserChapterProgress.completed=True` qua Django shell để xác nhận màu/style dấu tick, không để lại thay đổi dữ liệu): layout thumbnail nhỏ + badge + CTA + highlight chương đang đọc + card riêng biệt + dấu tick đúng màu/style — khớp 100% ảnh tham chiếu web.

---

### Feature 35: Background APK Download ✅ COMPLETE (test tay một phần)
**Priority**: Medium | **Status**: ✅ Implemented + partially verified on real device (2026-09-01)

- [x] **35.1** `ApkDownloadService.kt` (Foreground Service, `foregroundServiceType="dataSync"`) — tải APK bằng `HttpURLConnection` thuần, ghi `getExternalFilesDir()`, verify sha256, ghi trạng thái vào `SharedPreferences` riêng (`apk_download_state`)
- [x] **35.2** `DownloadNotifications.kt` — notification 3 trạng thái (đang tải % / tải xong bấm để cài / thất bại)
- [x] **35.3** `ApkInstaller.kt` — tách logic `FileProvider`/`Intent.ACTION_VIEW` khỏi `MainActivity`, dùng chung cho `MainActivity` và `InstallApkReceiver`
- [x] **35.4** `InstallApkReceiver.kt` (`BroadcastReceiver`) — mở system installer khi bấm notification "Tải xong" dù app đã bị kill, không cần Flutter engine sống
- [x] **35.5** `ApkDownloaderPlugin.kt` — MethodChannel `pro.huyenhoc.app/downloader` (`startDownload`, `getDownloadStatus`) + EventChannel `.../events` (progress/completed/failed)
- [x] **35.6** `MainActivity.kt` — thêm `hasNotificationPermission()`/`requestNotificationPermission()` (`ActivityCompat.requestPermissions()`, không thêm package `permission_handler`) trên channel `pro.huyenhoc.app/installer` có sẵn
- [x] **35.7** `AndroidManifest.xml` — 3 permission mới (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS`) + khai `<service>` + `<receiver exported="false">`
- [x] **35.8** `apk_downloader.dart` (Dart wrapper MethodChannel+EventChannel) + `installer.dart` thêm 2 method notification permission
- [x] **35.9** `update_cubit.dart` — `_downloadAndInstall()` gọi `ApkDownloader` thay vì Dio; `restoreDownloadState()` phục hồi state lúc app khởi động lại (gọi từ `main.dart`); `checkInstallPermission()` mới
- [x] **35.10** `update_view.dart` — chuyển `StatefulWidget` + `WidgetsBindingObserver`, ẩn nút "Cập nhật" (chỉ còn "Mở cài đặt") khi chưa có quyền cài APK, check lại quyền mỗi lần app resume
- [x] **35.11** Xoá `UpdateRepository.download()` + `refreshDownloadUrl()` (không còn caller — retry-with-fresh-URL không áp dụng khi Service tự tải, xem đánh đổi đã duyệt ở design doc §5.3)
- [x] **35.12** Viết lại `update_cubit_test.dart` cho kiến trúc event-driven mới — 18 test case (tổng 21/21 `test/features/update/` xanh)
- [x] **35.13** Vá bug phát hiện khi test tay trên thiết bị thật: `file_paths.xml` chỉ khai `cache-path` (đường dẫn cũ `getTemporaryDirectory()`) — `ApkDownloadService` ghi file vào `getExternalFilesDir()`, một root path khác chưa được `FileProvider` khai, nên `installApk()` crash với `IllegalArgumentException: Failed to find configured root`. Fix: đổi sang `<external-files-path name="apk" path="." />`, xoá `cache-path` không còn dùng

> **Design doc**: [feature-35-background-apk-download.md](design/feature-35-background-apk-download.md)
> **Đánh đổi đã chấp nhận**: hành vi cũ "signed URL hết hạn giữa chừng tự refresh + retry" (feature-36 §7.2) không còn — `ApkDownloadService` nhận 1 URL cố định lúc bắt đầu, không tự gọi API xin URL mới. Rủi ro thấp trong thực tế (Bunny CDN tải nhanh); user bấm "Cập nhật" lại là lấy URL mới từ đầu.
> **Đã test trên thiết bị Android thật** (A102SO, Android 12, 2026-09-01): T35-1, T35-3, T35-9, T35-12 PASS — tải chạy nền qua Foreground Service, notification thật hiện đúng (`channel=apk_download`), tải xong tự mở system installer, cài đặt thành công thật (verify `dumpsys package` lên đúng `versionCode` mới publish qua `AppRelease`/Bunny CDN thật).
> **Còn treo — chưa tự xác nhận**: T35-2 (cần máy Android 13+ để có prompt `POST_NOTIFICATIONS` từ chối được), T35-4, T35-6, T35-7, T35-8 (cần mô phỏng kill app/mất mạng/double-tap), T35-10/T35-11 (cần thu hồi quyền cài APK trên máy test, hiện đã cấp sẵn từ trước).

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
| Feature 34. Mobile Device, App Update & Mobile UI Parity | ✅ (gộp sub-feature 34a–34g, trước đây đánh số 35–41 độc lập) |
| Feature 35. Background APK Download | ✅ Code done, test tay một phần (T35-1/3/9/12 PASS trên Android 12 thật) |

---

*Last updated: 2026-09-01 (v1.8 — Renumber: Feature 35–41 cũ gộp thành sub-section 34a–34g của Feature 34, giải phóng số 35 cho Background APK Download design doc mới)*
