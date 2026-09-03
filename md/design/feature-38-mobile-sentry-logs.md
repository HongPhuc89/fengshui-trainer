# Feature 38 — Mobile Sentry Structured Logs (Parity with Web)

## Tóm tắt

Mobile (Flutter) hiện chỉ gửi lên Sentry **crash/exception events** (tự động, qua `SentryFlutter.init`) và performance traces — không có **structured Logs** (Sentry's Logs product: log lines truy vấn/lọc được, tách biệt với error events) như web đã có qua `src/frontend/src/services/sentry.service.js`.

Feature này: (1) bật Sentry Logs trên mobile (`options.enableLogs = true`), (2) tạo `SentryLogService` mirror `sentry.service.js`, và (3) wire vào các điểm tương đương web — login thành công, video load thành công/thất bại, PDF load thành công/thất bại, lỗi tải ảnh CDN (chọn lọc) — để có log/metric truy vấn được trên Sentry, không chỉ crash report khi có sự cố.

**Stack liên quan:** Mobile (Flutter) only. Không đổi backend/frontend/DB.

---

## Phân tích

### Hiện trạng: mobile vs web

| | Web (`src/frontend`) | Mobile (`src/mobile`) hiện tại |
|---|---|---|
| SDK | `@sentry/vue` / `@sentry/browser` ^10.43.0 | `sentry_flutter` ^9.28.0 |
| Init | `src/frontend/src/main.js:27` — `enableLogs: true` | `lib/main.dart:27-37` — không set `enableLogs` (mặc định `false`) |
| Structured logs | `sentry.service.js` gọi `Sentry.logger.info/error` tại login, video load, PDF load, image error | Không có — 0 usage của `Sentry.logger`/breadcrumb trong `lib/` |
| Custom metrics | `Sentry.metrics.count(...)` cùng chỗ với mỗi log | Không có |
| Crash/exception capture | Có (Sentry mặc định) | Có (Sentry mặc định) — không đổi |

### API Dart SDK đã verify (sentry-9.28.0, cài trong `~/.pub-cache`)

- `SentryOptions.enableLogs` (mặc định `false`) — bật structured Logs.
- `SentryOptions.enableMetrics` (mặc định **`true`**) — Metrics đã bật sẵn, không cần set thêm.
- `Sentry.logger` → `SentryLogger` với `trace/debug/info/warn/error/fatal(String body, {Map<String, SentryAttribute>? attributes})` — khớp 1:1 shape với web's `Sentry.logger.info(message, data)`.
- `Sentry.metrics` → `SentryMetrics.count(String name, int value, {Map<String, SentryAttribute>? attributes})` — khớp 1:1 web's `Sentry.metrics.count(name, value, { attributes })`.
- `SentryAttribute` là typed (`.string()`, `.int()`, `.bool()`, `.double()`, mảng tương ứng) — khác JS (plain object), nhưng tương đương về mặt dữ liệu.
- Khi SDK chưa init (`Sentry.init` chưa chạy, ví dụ trong unit test không setup Sentry), `Sentry.logger`/`Sentry.metrics` trả về `NoOpSentryLogger`/`NoOpSentryMetrics` — gọi an toàn, không throw. Không có unit test hiện tại cho các file sẽ sửa (`auth_repository_impl.dart`, `video_player_bloc.dart`, `book_reader_bloc.dart`) nên không có rủi ro test đỏ vì việc này, nhưng vẫn ghi nhận cho an toàn khi thêm test sau này.

### Điểm khác biệt không thể mirror 1:1: lỗi tải ảnh

Web's `trackImageLoadError` được gắn vào **một listener toàn cục** (`window`-level image error handler trong `main.js`) — bắt được lỗi của *mọi* `<img>` trên trang, không cần sửa từng component. Flutter không có hook tương đương cho `Image`/`CachedNetworkImage` toàn cục — mỗi widget dùng `CachedNetworkImage` phải tự khai `errorWidget` callback riêng.

Repo hiện có 5 chỗ dùng `CachedNetworkImage`. Phạm vi feature này chỉ instrument **2 chỗ giá trị cao nhất** (thumbnail xuất hiện nhiều nhất, đại diện tốt nhất cho lỗi CDN): `book_card.dart`, `video_card.dart`. 3 chỗ còn lại (`purchase_bottom_sheet.dart`, `book_detail_screen.dart`, `lesson_list_item.dart`) để ngoài phạm vi — có thể bổ sung sau nếu cần, xem §Trade-off.

---

## Đề xuất giải pháp

### 1. Bật Sentry Logs — `lib/main.dart`

```dart
await SentryFlutter.init(
  (options) {
    options.dsn = AppConfig.sentryDsn;
    options.sendDefaultPii = true;
    options.tracesSampleRate = 1.0;
    options.enableLogs = true; // NEW — bật Sentry Logs, khớp web (main.js:27)
  },
  appRunner: _runApp,
);
```

(`enableMetrics` đã mặc định `true` trong SDK — không cần set thêm dòng nào.)

### 2. `SentryLogService` mới — `lib/core/observability/sentry_log_service.dart`

Static-method utility, theo đúng pattern `ScreenGuard` (`lib/core/security/screen_guard.dart`) đã có trong repo: private constructor, toàn static method, gọi trực tiếp không cần đăng ký DI/`getIt`.

```dart
import 'package:sentry_flutter/sentry_flutter.dart';

/// Structured Sentry Logs + custom metrics — mirrors the web app's
/// sentry.service.js (feature-38 design doc, md/design/feature-38-mobile-sentry-logs.md).
///
/// Distinct from Sentry's automatic crash/exception capture (configured via
/// `options.dsn` in main.dart): these are explicit, queryable log lines and
/// counters for key product events, not error reports. Safe to call even if
/// Sentry failed to init (SDK falls back to no-op logger/metrics).
class SentryLogService {
  SentryLogService._();

  static void trackLogin(String email) {
    Sentry.logger.info(
      'User logged in',
      attributes: {'email': SentryAttribute.string(email)},
    );
    Sentry.metrics.count(
      'auth.login.success',
      1,
      attributes: {'email': SentryAttribute.string(email)},
    );
  }

  static void trackVideoLoad(String courseSlug, String lessonSlug) {
    final attrs = {
      'course_slug': SentryAttribute.string(courseSlug),
      'lesson_slug': SentryAttribute.string(lessonSlug),
    };
    Sentry.logger.info('Video load success', attributes: attrs);
    Sentry.metrics.count('video.load.success', 1, attributes: attrs);
  }

  static void trackVideoLoadError(
    String courseSlug,
    String lessonSlug,
    String reason,
  ) {
    Sentry.logger.error('Video load failed', attributes: {
      'course_slug': SentryAttribute.string(courseSlug),
      'lesson_slug': SentryAttribute.string(lessonSlug),
      'reason': SentryAttribute.string(reason),
    });
    Sentry.metrics.count('video.load.error', 1, attributes: {
      'course_slug': SentryAttribute.string(courseSlug),
      'lesson_slug': SentryAttribute.string(lessonSlug),
    });
  }

  static void trackPdfLoad(String bookSlug, int chapterOrder) {
    final attrs = {
      'book_slug': SentryAttribute.string(bookSlug),
      'chapter_order': SentryAttribute.int(chapterOrder),
    };
    Sentry.logger.info('PDF load success', attributes: attrs);
    Sentry.metrics.count('pdf.load.success', 1, attributes: attrs);
  }

  static void trackPdfLoadError(
    String bookSlug,
    int chapterOrder,
    String reason,
  ) {
    Sentry.logger.error('PDF load failed', attributes: {
      'book_slug': SentryAttribute.string(bookSlug),
      'chapter_order': SentryAttribute.int(chapterOrder),
      'reason': SentryAttribute.string(reason),
    });
    Sentry.metrics.count('pdf.load.error', 1, attributes: {
      'book_slug': SentryAttribute.string(bookSlug),
      'chapter_order': SentryAttribute.int(chapterOrder),
    });
  }

  static void trackImageLoadError(String url) {
    Sentry.logger.error(
      'CDN image load failed',
      attributes: {'url': SentryAttribute.string(url)},
    );
    Sentry.metrics.count(
      'image.load.error',
      1,
      attributes: {'url': SentryAttribute.string(url)},
    );
  }
}
```

### 3. Call site — bảng đối chiếu

| Sự kiện | File : dòng | Thay đổi |
|---|---|---|
| Login thành công | `lib/features/auth/data/repositories/auth_repository_impl.dart:36-44` | Sau `await _authCubit.setTokens(...)`, trước `return Right(user)` → `SentryLogService.trackLogin(user.email)` |
| Video load thành công | `lib/features/videos/presentation/bloc/video_player_bloc.dart:44-59` — nhánh `(lesson) { ... }` của `lessonResult.fold` | Trước `emit(VideoPlayerLoaded(...))` → `SentryLogService.trackVideoLoad(event.courseSlug, event.lessonSlug)` |
| Video load thất bại (fetch metadata) | `video_player_bloc.dart:43` — nhánh `(failure) => emit(VideoPlayerError(failure.message))` | Thêm `SentryLogService.trackVideoLoadError(event.courseSlug, event.lessonSlug, failure.message)` trước emit |
| Video init thất bại (CDN/network lúc `initialize()`) | `lib/features/videos/presentation/screens/video_player_screen.dart:92-101` — `catch (e)` sau `controller.initialize()` | Thêm `SentryLogService.trackVideoLoadError(widget.courseSlug, lesson.slug, e.toString())` trong catch, trước `setState` |
| Video lỗi playback-time (`hasError`) | `video_player_screen.dart:149-159` — listener `if (controller.value.hasError)` | Thêm `SentryLogService.trackVideoLoadError(widget.courseSlug, lesson.slug, controller.value.errorDescription ?? 'playback error')` trong nhánh `if (_playerError == null)` (log 1 lần, không lặp lại mỗi lần listener bắn) |
| PDF load thành công | `lib/features/books/presentation/bloc/book_reader_bloc.dart:96-106` — nhánh `(chapter) async { ... }` | Trước `emit(BookReaderLoaded(...))` → `SentryLogService.trackPdfLoad(event.bookSlug, chapter.order)` |
| PDF load thất bại (fetch chapter) | `book_reader_bloc.dart:67` — nhánh `(failure) async => emit(BookReaderError(...))` | Thêm `trackPdfLoadError(event.bookSlug, event.chapterOrder, failure.message)` |
| PDF load thất bại (network CDN) | `book_reader_bloc.dart:107-116` — `on DioException` | Thêm `trackPdfLoadError(event.bookSlug, event.chapterOrder, 'network error')` |
| PDF load thất bại (decrypt/format khác) | `book_reader_bloc.dart:117-119` — `catch (e)` | Thêm `trackPdfLoadError(event.bookSlug, event.chapterOrder, e.toString())` |
| Ảnh bìa sách lỗi | `lib/features/books/presentation/widgets/book_card.dart:44` — `errorWidget: (_, __, ___) => _placeholder()` | Đổi thành `errorWidget: (_, url, ___) { SentryLogService.trackImageLoadError(url); return _placeholder(); }` |
| Thumbnail video lỗi | `lib/features/videos/presentation/widgets/video_card.dart:29` — tương tự | Tương tự, dùng `url` từ callback |

---

## Trade-off & Lưu ý

| Điểm | Phân tích |
|---|---|
| **Metrics API có thật, không phải gap** | Dù Sentry đã sunset Metrics beta ở một số ngữ cảnh khác, SDK Dart 9.28.0 vẫn expose `Sentry.metrics.count` đầy đủ, mirror web 1:1. Không cần thoả hiệp bỏ phần metrics. |
| **Lỗi ảnh CDN — chỉ 2/5 chỗ** | Không có global image-error hook trong Flutter như web; chọn 2 widget traffic cao nhất (`book_card.dart`, `video_card.dart`) để giữ diff cân xứng với phạm vi feature. 3 chỗ còn lại có thể thêm sau bằng cùng pattern nếu cần — không phải rework. |
| **PII trong log attributes** | `email` trong `trackLogin` là **PII mới** thật sự — mobile hiện **không** gọi `Sentry.setUser()`/`configureScope()` ở đâu cả, nên crash report hiện tại chỉ có device id ngẫu nhiên + IP/geo tự động qua `sendDefaultPii` (xem issue `FENGSHUI-TRAINER-MOBILE-1`: `user: id:dff30c49...`, không có email); `sendDefaultPii` không tự động gắn email app-level. `trackLogin` sẽ là lần đầu tiên email thật rời app lên Sentry từ mobile. **Đã quyết định (PO, 2026-09-03): chấp nhận gửi email thật**, giống hệt web (`sentry.service.js` đã làm vậy), không cần mask/hash. |
| **`video.load.error`/`pdf.load.error` mới không có ở web** | Web's `sentry.service.js` không có case lỗi cho video/PDF (chỉ có success + `trackImageLoadError`). Mobile thêm case lỗi cho **cả hai** vì cùng một lý do: `video.load.error` gắn trực tiếp với Sentry issue `FENGSHUI-TRAINER-MOBILE-1` (video playback error) đã xử lý gần đây; `pdf.load.error` áp dụng cùng logic phòng ngừa — `book_reader_bloc.dart` có 3 nhánh lỗi CDN/network tương tự lúc tải chapter (fetch fail, `DioException`, decrypt/format lỗi), rất dễ gặp loại lỗi playback-time giống video (CDN gián đoạn khi app background) nếu không log lại sẽ khó debug khi có issue tương tự phát sinh trên PDF reader. Không đối xứng hoàn toàn với web nhưng có lý do rõ ràng, nêu ở đây để PO/tech review không hiểu nhầm là lệch phạm vi. |
| **Không có rollback/kill-switch tức thời cho `enableLogs`** | Khác web (deploy lại tức thì nếu volume/cost bất thường), tắt tính năng này trên mobile cần build + phát hành APK mới **và** user phải cập nhật — độ trễ rollback đáng kể hơn nhiều. Rủi ro được chấp nhận ở quy mô hiện tại (traffic login/video/PDF thấp, không đáng lo quota), không có remote-config kill-switch trong scope feature này. Nếu usage Sentry tăng bất thường sau khi deploy, xử lý bằng release fix (`enableLogs = false`) thay vì remote toggle. |
| **Không đổi hành vi capture crash hiện có** | Chỉ thêm 1 dòng `enableLogs = true` vào `main.dart`; không sửa `dsn`/`sendDefaultPii`/`tracesSampleRate` hiện tại. |
| **Chi phí/quota Sentry** | Mỗi log/metric call là 1 event gửi lên Sentry (SDK tự batch/flush). Tần suất các sự kiện này (login, mở 1 bài học/chương sách) thấp — không đáng lo về quota ở quy mô hiện tại, nhưng nên theo dõi Sentry usage dashboard vài ngày sau khi deploy. |
| **Không đổi DB/API contract** | Toàn bộ thay đổi nằm trong `src/mobile`, không đụng backend/frontend. |
| **Fire-and-forget, không `await`** | `SentryLogService` gọi `Sentry.logger.*`/`Sentry.metrics.count` đồng bộ, không await `FutureOr<void>` trả về — rủi ro rất nhỏ là log bị rớt nếu widget/isolate bị dispose ngay lập tức sau đó (ví dụ điều hướng đi ngay sau lỗi). Chấp nhận được vì đây chỉ là log phụ trợ, không phải luồng nghiệp vụ chính. |

---

## Bước Tiếp Theo (Implementation Order)

1. `lib/main.dart` — thêm `options.enableLogs = true`.
2. Tạo `lib/core/observability/sentry_log_service.dart` (nội dung ở §Đề xuất giải pháp mục 2).
3. Wire 9 call site ở bảng §3 — 6 file: `auth_repository_impl.dart`, `video_player_bloc.dart`, `video_player_screen.dart`, `book_reader_bloc.dart`, `book_card.dart`, `video_card.dart`.
4. `flutter analyze` (docker/local) — không có lỗi mới.
5. `flutter test` — xanh (không có test hiện tại phụ thuộc các nhánh code vừa sửa, nhưng chạy để chắc chắn).
6. Manual test trên thiết bị thật (theo cách đã dùng khi verify fix video-pause gần đây): login → xem 1 video → đọc 1 chương sách → (tuỳ chọn) ngắt mạng giữa chừng để trigger nhánh lỗi.

---

## Verification

- Sentry dashboard (org `scottfu89`, project `fengshui-trainer-mobile`) → **Explore → Logs** → filter theo message: `User logged in`, `Video load success`, `PDF load success`, và (khi trigger lỗi) `Video load failed`/`PDF load failed`/`CDN image load failed` — kiểm tra attributes (`course_slug`, `lesson_slug`, `book_slug`, `chapter_order`, `reason`, `url`) hiển thị đúng.
- Tab **Metrics** (hoặc Explore → Trace/Metrics tuỳ UI Sentry hiện tại) → thấy counter `auth.login.success`, `video.load.success`, `pdf.load.success`, `video.load.error`, `pdf.load.error`, `image.load.error` tăng đúng theo hành động test.
- `flutter analyze` + `flutter test` xanh.
- Xác nhận **không** có event/log nào lọt lên Sentry khi chạy với `env.dev.json`/`env.local.json` có `SENTRY_DSN` rỗng (SDK no-op) — tránh lặp lại tình huống nhầm lẫn dữ liệu test vào project thật.
