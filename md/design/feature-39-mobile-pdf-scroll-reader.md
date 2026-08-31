# Feature 39 — Mobile PDF Reader: chuyển sang cuộn liên tục (continuous scroll), giữ nguyên load theo chapter

## Document Information
- **Feature**: Đổi cách đọc PDF trên mobile (Flutter, `src/mobile/`) từ **lật trang rời rạc bằng vuốt ngang** (`pdfx.PdfView`, `scrollDirection: horizontal`, `pageSnapping: true`) sang **cuộn dọc liên tục** (`pdfx.PdfViewPinch`, cuộn + pinch-zoom), đồng thời giữ nguyên kiến trúc **load PDF theo từng chapter** (decrypt lazy, không tải cả cuốn sách một lần) như hiện tại. Nhân tiện vá 1 bug có sẵn (TOC mobile luôn rỗng) vì nó nằm ngay trên đường đi của thay đổi.
- **Status**: **Approved — Stage 3 (implementing)**
- **Created**: 2026-08-31
- **Updated**: 2026-09-01
  - v2: Xử lý PO review v1 (Approve with minor fixes) — bỏ code block field mâu thuẫn ở §4.2 (chỉ giữ getter), thêm ghi chú rollback/rollout ở §5. Không đổi quyết định kỹ thuật nào. PO xác nhận đồng ý §4.2 (nút cố định qua ranh giới chapter) và §5 (bỏ nút zoom, dựa pinch).
- **Related**: `feature-20-mobile-app.md` (kiến trúc Flutter tổng, quyết định C3 "Swipe = chuyển trang trong cùng chapter" — bị thay thế bởi feature này), `feature-16-pdf-reader-v1.md` (thiết kế PDF reader bản web, dùng làm tham chiếu UX), `feature-18-encrypt-pdf-file.md` (luồng decrypt PDF theo chapter, không đổi)

---

## 1. Tóm tắt

Yêu cầu: cho phép cuộn qua từng trang PDF trên mobile (thay vì vuốt lật từng trang rời rạc), và xác nhận việc load PDF theo từng chapter (lazy, không tải nguyên cuốn) vẫn được giữ — tham khảo cách bản web đang làm.

Giải pháp: thay widget `PdfView` (renderer paged, đã có sẵn trong `pdfx: ^2.9.2` đang dùng) bằng `PdfViewPinch` (cùng package, không thêm dependency) — widget này render các trang nối tiếp nhau theo trục dọc, cuộn mượt như một tài liệu dài, kèm pinch-to-zoom built-in. Kiến trúc load-theo-chapter (fetch `decrypt-key` + `encrypted-file` cho từng chapter riêng, decrypt AES-256-GCM trong bộ nhớ, không cache PDF đã giải mã ra đĩa) **giữ nguyên 100%** — chỉ đổi widget hiển thị + cách phát hiện "hết trang trong chapter" từ sự kiện vuốt sang sự kiện cuộn.

Ranh giới chapter **không cuộn xuyên qua được** (giống hệt hành vi web — web cũng không auto-scroll sang chapter kế tiếp, chuyển chapter luôn là một hành động rời: bấm nút/TOC). Khi cuộn tới trang cuối của chapter, hiện nút "Chương tiếp theo" cố định ở đáy màn hình; bấm vào mới decrypt và load chapter kế. Lý do giữ ranh giới rõ thay vì auto-stitch nhiều PDF liền mạch: xem §4.4.

## 2. Phân tích

### Yêu cầu / ràng buộc
- Đổi UX đọc: cuộn dọc thay vì vuốt ngang lật trang.
- Giữ nguyên: load PDF theo chapter (không đổi API, không đổi luồng decrypt/DRM).
- Không được phá vỡ: watermark overlay, DRM blur khi app background, screenshot prevention, lưu reading progress, TOC, chuyển chapter qua TOC.
- Không thêm package mới — `pdfx` đã có sẵn `PdfViewPinch` cho đúng nhu cầu này.

### Các tầng liên quan
Đây là thay đổi **chỉ ở mobile app (Flutter)** — không đổi Backend (Django) hay Database (Postgres), API chapter/decrypt-key/progress giữ nguyên như bản web đang dùng.

## 3. Hiện trạng — so sánh Web vs Mobile

| | Web (`BookReaderView.vue`) | Mobile hiện tại (`book_reader_screen.dart`) |
|---|---|---|
| Cách xem trang | 1 trang/lần trên `<canvas>`, chuyển trang qua nút/phím/vuốt (không cuộn) | 1 trang/lần, `PdfView` `pageSnapping: true` — vuốt ngang lật cả trang |
| Load PDF | Theo chapter: `booksService.getChapter()` → `loadEncryptedPdf()` decrypt trong RAM (`usePdfDecryption.js`) | Theo chapter: `_repository.getChapter()` → `_pdfDecryption.decrypt()` — **giống hệt cơ chế web**, đã đúng theo yêu cầu "load theo chapter" |
| Qua ranh giới chapter | `prevPage()`/`nextPage()`: hết trang chapter hiện tại → tự `loadChapter(order±1)` | **Không có** — `ChangePage` trong `book_reader_bloc.dart:90-102` chỉ đổi trang trong chapter đang mở, không có logic sang chapter kế/trước |
| TOC | Danh sách chapter thật từ `book.chapters` | **Bug có sẵn**: `book_reader_screen.dart:199-200` truyền `chapters: const []` (hard-code rỗng) — `getBookDetail()` chưa từng được gọi trong reader flow, TOC mobile không bao giờ hiển thị chapter nào |
| Progress toàn sách | Thanh progress % tổng hợp tất cả chapter (`bookProgressPercent`, kéo-thả seek qua nhiều chapter) | Chỉ có slider trong phạm vi chapter hiện tại (`ReaderBottomBar`), không có % toàn sách |

→ Cơ chế "load theo chapter" mobile **đã đúng như web sẵn rồi** (không cần sửa phần decrypt/fetch). Cái thiếu là (a) cách hiển thị (paged → scroll) và (b) hành vi qua ranh giới chapter + TOC thật, để khớp trải nghiệm web.

## 4. Đề xuất giải pháp

### 4.1 Đổi widget hiển thị: `PdfView` → `PdfViewPinch`

`pdfx: ^2.8.0` (pubspec) hiện resolve về `2.9.2` (pubspec.lock), package này có sẵn 2 viewer:
- `PdfView` + `PdfController` — đang dùng, phân trang rời rạc (`scrollDirection: horizontal`, `pageSnapping: true` mặc định).
- `PdfViewPinch` + `PdfControllerPinch` — cuộn liên tục theo trục dọc (`scrollDirection: Axis.vertical` mặc định), có pinch-to-zoom tích hợp (`minScale`/`maxScale`), `onPageChanged(page)` báo trang đang ở giữa viewport, và API `jumpToPage()` / `animateToPage()` / `nextPage()` / `previousPage()` tương thích với cách bottom bar hiện đang gọi (`bloc.add(ChangePage(...))` → `pdfController?.jumpToPage(event.page)`).

Không cần thêm dependency, không cần đổi `pubspec.yaml`.

**`book_reader_bloc.dart`**
```dart
// Trước
PdfController? pdfController;
...
pdfController = PdfController(
  document: PdfDocument.openData(pdfBytes),
  initialPage: startPage,
);

// Sau
PdfControllerPinch? pdfController;
...
pdfController = PdfControllerPinch(
  document: PdfDocument.openData(pdfBytes),
  initialPage: startPage,
);
```
`jumpToPage()` giữ nguyên tên gọi ở `_onChangePage` — không đổi logic lưu progress (`_progressTimer`).

**`book_reader_screen.dart`**
```dart
// Trước
child: PdfView(controller: _bloc.pdfController!)

// Sau
child: PdfViewPinch(
  controller: _bloc.pdfController!,
  onPageChanged: (page) => _bloc.add(ChangePage(page)),
  minScale: 1.0,
  maxScale: 4.0,
)
```
- Bỏ `onHorizontalDragEnd` (vuốt ngang lật trang) khỏi `GestureDetector` bọc ngoài — cuộn/pinch giờ do chính `PdfViewPinch` (dùng `InteractiveViewer` nội bộ) xử lý. Giữ `onTap: _toggleControls` để ẩn/hiện top/bottom bar — tap và pan/scale là hai gesture recognizer khác nhau trong Flutter gesture arena nên không xung đột.
- `onPageChanged` chỉ nên bắn `ChangePage` khi giá trị thực sự đổi so với `state.currentPage` (so sánh trước khi `bloc.add`) để tránh việc `emit` liên tục lúc đang cuộn giữa 2 trang gây rebuild dư thừa — thêm guard này trong `_onChangePage` (bloc) thay vì trong UI, cùng chỗ đang có logic hiện tại.

### 4.2 Qua ranh giới chapter: nút cố định, không auto-stitch

Trạng thái đầu/cuối chapter **không lưu thành field riêng** — tính bằng getter trong `BookReaderLoaded`, dựa trực tiếp trên `currentPage`/`totalPages` đã có sẵn:
```dart
bool get isFirstPageOfChapter => currentPage <= 1;
bool get isLastPageOfChapter => currentPage >= totalPages;
```

`ReaderBottomBar` thêm 1 hàng nút xuất hiện khi `currentPage == totalPages` (giống nút "Chương tiếp theo" ở cuối trang web) và khi `currentPage == 1 && chapter.order > 1` (nút "Chương trước", hiếm khi cần vì user thường TOC ngược, nhưng để đối xứng với `prevPage()` bên web):
```dart
if (currentPage >= totalPages && hasNextChapter)
  FilledButton.icon(
    onPressed: () => bloc.add(LoadChapter(bookSlug: bookSlug, chapterOrder: chapter.order + 1)),
    icon: const Icon(Icons.arrow_downward),
    label: const Text('Chương tiếp theo'),
  )
```
`hasNextChapter`/`hasPrevChapter` **không** so `chapter.order` với độ dài mảng `bookDetail.chapters` — `order` chỉ ràng buộc `unique_together` trong model (`books/models.py:115,131`), không đảm bảo liên tục 1..N (có thể có khoảng hở nếu admin xoá chapter giữa). Thay vào đó tìm **chapter có `order` gần nhất** lớn hơn/nhỏ hơn order hiện tại trong `bookDetail.chapters` (getter `nextChapterOrder`/`prevChapterOrder` trong `BookReaderLoaded`, xem §4.3) — vá đúng luôn tại đây, không lặp lại kiểu so sánh `order+1`/độ-dài-mảng mà web đang dùng (`BookReaderView.vue:96`, latent bug có sẵn, không thuộc scope sửa ở web trong feature này). Cần `BookDetail` trong bloc state (xem §4.3).

`LoadChapter` khi gọi kiểu này truyền `startPage: 1` tường minh (giống `nextPage()` bên web luôn `loadChapter(nextOrder, 1)`); chiều ngược lại (chapter trước) truyền `startPage: <trang cuối chapter trước>` — nhưng vì mobile decrypt-per-chapter không biết trước `page_count` chapter trước khi chưa load, dùng field `pageCount` sẵn có trong `BookChapterMeta` (từ `BookDetail.chapters`, không cần load lại PDF) để tính trang đích, giống `prevChapter?.page_count ?? 1` bên web (`BookReaderView.vue:305`).

### 4.3 Vá bug TOC rỗng — cần cho §4.2 và đúng với web

`book_reader_bloc.dart` hiện chỉ gọi `getChapter()`. Bổ sung gọi `getBookDetail(bookSlug)` **một lần** khi mở reader (song song với `getChapter` đầu tiên, giống `Promise.allSettled` bên web `BookReaderView.vue:109-112`), lưu `BookDetail` vào state để:
- `TocPanel` nhận `chapters: state.bookDetail.chapters` thay vì `const []` (fix bug).
- Tính `hasNextChapter`/`hasPrevChapter` và trang đích khi lùi chapter (§4.2).
- (Tuỳ chọn, không bắt buộc để khớp yêu cầu chính) tính % tiến độ toàn sách như web nếu PO muốn thanh progress mobile cũng tổng hợp nhiều chapter thay vì chỉ trong chapter hiện tại — nêu ở §6, không làm trong scope này trừ khi PO yêu cầu.

```dart
// book_reader_state.dart
class BookReaderLoaded extends BookReaderState {
  final BookDetail bookDetail;   // mới — nguồn cho TOC + điều hướng chapter
  final BookChapterContent chapter;
  ...
}
```
`_onLoadChapter` gọi `getBookDetail()` chỉ khi `state.bookDetail == null` (lần đầu) hoặc giữ nguyên `bookDetail` đã có qua các lần đổi chapter tiếp theo (`copyWith`) — không gọi lại API mỗi lần chuyển chapter.

### 4.4 Vì sao không auto-stitch cuộn xuyên chapter

Cân nhắc phương án "cuộn mượt xuyên luôn sang chapter kế, người dùng không cảm nhận ranh giới" (infinite scroll thật sự). Không chọn cho bản này vì:
- `PdfViewPinch` sở hữu 1 `PdfDocument` duy nhất; để nối 2 chapter liền mạch phải tự dựng scroll view ghép nhiều `PdfViewPinch`/`PdfControllerPinch` (mỗi chapter 1 document đã decrypt) trong một `CustomScrollView` — phức tạp hơn hẳn, và bản web (nguồn tham chiếu theo yêu cầu) **cũng không làm vậy** — web dừng cứng ở ranh giới chapter và gọi `loadChapter()` mới.
- Giữ decrypt-per-chapter tuần tự (không decrypt trước chapter kế trong lúc user còn đọc chapter hiện tại) an toàn hơn cho DRM: không giữ đồng thời PDF đã giải mã của nhiều chapter trong RAM.
- Nếu sau này PO muốn trải nghiệm liền mạch hơn, có thể làm bước 2: prefetch + decrypt chapter kế ở background khi còn cách trang cuối ~2 trang, để bấm "Chương tiếp theo" không phải chờ decrypt — không đổi kiến trúc hiển thị, chỉ thêm prefetch. Không làm trong scope này.

## 5. Trade-off & lưu ý

- **Đổi hành vi vuốt**: vuốt ngang lật trang (C3 trong feature-20) bị thay bằng cuộn dọc + pinch-zoom — đây chính là thay đổi user yêu cầu, cần note lại quyết định C3 cũ trong feature-20 coi như **superseded bởi feature-39** khi doc này được duyệt.
- **Zoom**: `PdfViewPinch` có pinch-to-zoom built-in, khác model zoom-step cố định bên web (`ZOOM_STEPS`). Không cần nút zoom +/- riêng trên mobile vì pinch là gesture tự nhiên hơn trên touch — đề xuất **không** thêm nút zoom bottom bar để giữ UI gọn, chỉ dựa vào pinch. Nêu rõ để PO xác nhận, vì đây là điểm lệch có chủ đích so với web.
- **`onPageChanged` trong lúc cuộn**: có thể bắn nhiều lần khi user cuộn nhanh qua nhiều trang — đã có debounce sẵn qua `_progressTimer` (1s) khi lưu progress lên server nên không tăng tải API, chỉ cần đảm bảo `emit` state không rebuild dư (xem §4.1 guard).
- **Watermark/DRM overlay**: `WatermarkOverlay`/`BlurOverlay` là `Positioned.fill` độc lập, không phụ thuộc widget PDF bên dưới — không cần sửa gì khi đổi `PdfView` → `PdfViewPinch`.
- **Test**: cần test bloc mới cho case chuyển chapter qua `LoadChapter(startPage: N)` khi lùi chapter (trang đích = `pageCount` chapter trước, lấy từ `BookDetail.chapters`, không phải load PDF trước để biết). Test TOC hiển thị đúng danh sách chapter thay vì rỗng.
- **Không xung đột gesture cuộn**: tách riêng 2 event — `PageScrolled` (bắn từ `onPageChanged` của `PdfViewPinch` khi user tự cuộn, chỉ cập nhật state + lên lịch lưu progress, **không** gọi `pdfController.jumpToPage()`) và `ChangePage` (giữ nguyên cho slider/nút mũi tên trong `ReaderBottomBar`, gọi `jumpToPage()` để nhảy trang chủ động). Nếu dùng chung 1 event, gọi `jumpToPage()` ngay trong lúc `onPageChanged` báo về do chính user đang cuộn tay sẽ khiến `PdfViewPinch` tự "giằng" lại với gesture đang cuộn — quyết định tách này là chi tiết implementation (Stage 3), không đổi kiến trúc tổng ở §4.1.
- **Rollout & rollback**: đây là thay đổi thuần client (mobile app), không có backend/DB đi kèm nên **không có feature flag hay kill-switch phía server** để tắt nhanh nếu phát hiện lỗi sau khi lên store — rollback thực chất là phát hành bản kế tiếp, chịu độ trễ duyệt app store (không tức thời như revert 1 API). Cần test kỹ trên cả iOS/Android trước khi submit release, đặc biệt case chapter bị khoá (`can_access = false`, §4.3) khi bấm "Chương tiếp theo" — luồng lỗi `BookReaderError` đã có sẵn xử lý, chỉ cần verify hiển thị đúng thay vì treo màn hình loading.

## 6. Ngoài phạm vi (không làm trong feature này, nêu để PO cân nhắc)

- Progress bar tổng hợp % toàn sách (nhiều chapter) như web — mobile hiện chỉ có slider trong chapter.
- Prefetch/decrypt chapter kế ở background trước khi user chạm ranh giới (giảm thời gian chờ khi bấm "Chương tiếp theo").
- Đồng bộ lại quyết định C3 trong `feature-20-mobile-app.md` §"Quyết định đã confirm" sau khi feature này được duyệt.

## 7. Bước tiếp theo

1. PO review & xác nhận quyết định §4.2 (nút cố định qua chapter, không auto-stitch) và §5 (bỏ nút zoom, dựa pinch).
2. Sau approve → Stage 3: sửa `book_reader_bloc.dart`, `book_reader_event.dart`/`book_reader_state.dart`, `book_reader_screen.dart`, `reader_bars.dart` (`ReaderBottomBar` thêm nút chuyển chapter, `TocPanel` nhận chapters thật).
3. Cập nhật `feature-20-mobile-app.md` — đánh dấu quyết định C3 cũ là superseded, trỏ sang feature-39.
