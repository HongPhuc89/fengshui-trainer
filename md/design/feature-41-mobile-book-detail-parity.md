# Feature 41 — Mobile Book Detail: badge/CTA/tiến độ đọc giống web

## Document Information
- **Feature**: Mobile Book Detail screen (Flutter, `src/mobile/`) thiếu nhiều thứ web (`BookDetailView.vue`) đã có: badge "Mới", CTA đọc bị gate sai (chỉ hiện khi đã mua, nhánh "đọc tiếp" chết vì thiếu data), danh sách chương thiếu badge "Trang X" + highlight chương đang đọc. Nguyên nhân gốc giống hệt feature-40 (Video course detail): field/endpoint backend đã có sẵn nhưng mobile chưa parse/gọi tới, cộng thêm 1 bug parse field không tồn tại (`is_vip_only`).
- **Status**: **Approved — Stage 3 (implementing)**
- **Created**: 2026-09-02
- **Updated**: 2026-09-02
  - v2: Xử lý PO review v1 (Approve with minor fixes). §3.1: verify phạm vi `isVipOnly` — cùng bug tồn tại độc lập ở `Book` (entity riêng, dùng cho `book_card.dart` màn danh sách), KHÔNG chung class với `BookDetail`. Quyết định: chỉ xoá `isVipOnly` khỏi `BookDetail` (đúng phạm vi feature này), giữ nguyên ở `Book` — bug ở màn danh sách vẫn còn, ghi nhận là follow-up ngoài phạm vi (đã note ở §4 Nice-to-have từ v1). §3.7: liệt kê rõ 2 call-site cần refetch-on-return — nút CTA và mỗi hàng chương trong danh sách (cả 2 đều điều hướng sang `BookReaderScreen`).
- **Related**: `feature-40-mobile-video-detail-parity.md` (cùng dạng gap, cùng pattern fix — fetch progress song song/nullable/không chặn, refetch khi quay lại từ reader do Flutter Navigator không tự remount)

---

## 1. Tóm tắt

User đối chiếu ảnh chụp web/thiết kế: Book Detail có cover, badge (VIP/Mới/category), tên tác giả, nút "Đọc ngay", và danh sách chương với badge "Trang X" trên chương đang đọc dở (highlight viền vàng) + dấu tick chương đã hoàn thành. Mobile hiện thiếu gần hết phần này.

Khảo sát cho thấy đây **không phải thiếu dữ liệu backend** — mọi field cần thiết (`is_free`, `is_new_release`, `small_cover`, `author`, `category`, endpoint `GET /api/books/{slug}/progress/`) đều đã có sẵn và có data thật trong DB (21 sách, đủ cover/author/category). Vấn đề nằm hoàn toàn ở phía mobile: chưa parse/gọi tới, và có 1 chỗ đọc nhầm field không tồn tại.

## 2. Phân tích

### Vấn đề cụ thể (đối chiếu code)

| # | Vấn đề | Vị trí | Nguyên nhân |
|---|---|---|---|
| 1 | Badge VIP luôn sai | `book_model.dart` — `isVipOnly: json['is_vip_only']` | Backend **không có** field này — `Book` model không có cột VIP riêng, VIP là thuộc tính của **user** (`user_type`), không phải của sách. Web đọc `authStore.user?.user_type === 'VIP'`, không đọc field trên book. |
| 2 | Không có badge "Mới" | `book_detail_screen.dart` | `isNewRelease` đã có trên entity + có data thật, nhưng màn hình không render |
| 3 | Không có badge "Miễn phí" | entity `Book`/`BookDetail` | `is_free` chưa được parse vào entity (backend có sẵn field) |
| 4 | CTA chỉ hiện khi `hasPurchased` | `book_detail_screen.dart:157-182` | Web: CTA hiện **không điều kiện** khi sách unlock (free \| VIP \| đã mua); mobile hiện bỏ sót case free/VIP-chưa-mua → **không có nút nào cả** |
| 5 | Nhánh "Tiếp tục đọc" chết | cùng chỗ trên | Phụ thuộc `lastReadChapterOrder`, parse từ `json['reading_progress']['chapter_order']` — key **không tồn tại** trong response thật (chỉ tồn tại trong cache tự-serialize nội bộ, không phải từ network) |
| 6 | Không có badge "Trang X" + highlight chương đang đọc | `_ChapterListItem` (288-349) | `book_detail_bloc.dart` **chưa từng gọi** `getReadingProgress` (dù plumbing đã có sẵn, đang dùng ở `book_reader_bloc.dart`) — không có data để so sánh chương nào đang đọc dở |
| 7 | Header "Danh sách chương" không có số lượng | `book_detail_screen.dart:194-201` | Web: `"Nội dung · N chương"` |
| 8 | Cover dùng `cover_image` thay vì `small_cover` | `book_detail_screen.dart` | Web ưu tiên `small_cover` (CDN WebP đã resize) → `cover_image` → fallback chữ cái đầu tên sách |

### Các tầng liên quan
- **Backend**: Không đổi — mọi field/endpoint cần thiết đã có sẵn (đã verify qua DB thật + đọc serializer).
- **Mobile**: Entity (`Book`/`BookDetail` +2 field `isFree`, sửa nguồn `isVipOnly`), model (parse thêm, bỏ đọc `is_vip_only`), bloc (gọi `getReadingProgress` song song, chỉ khi unlock — giống web), UI (`book_detail_screen.dart`: badge row, CTA gộp logic, chapter row có badge/highlight).

## 3. Đề xuất giải pháp

### 3.1 VIP: đọc từ user, không phải từ sách

```dart
// video_detail_screen.dart pattern KHÔNG áp dụng được nguyên xi ở đây vì VIP
// là thuộc tính SÁCH bên video (course.level tồn tại thật), nhưng bên Book
// VIP lại là thuộc tính USER — phải lấy qua AuthCubit, giống cách
// video_player_screen.dart đã đọc AuthCubit cho watermark.
final user = context.watch<AuthCubit>().state is AuthAuthenticated
    ? (context.watch<AuthCubit>().state as AuthAuthenticated).user
    : null;
final isVip = user?.userType == 'VIP';
final isUnlocked = detail.isFree || isVip || detail.hasPurchased;
```
Xoá hẳn field `isVipOnly` khỏi `Book`/`BookDetail` entity + bỏ dòng parse `json['is_vip_only']` (dead/sai, không phải chỉ để nguyên như cách feature-40 làm với `lastWatchedLessonSlug` — ở đây khác: field feature-40 để lại vì "vô hại, chỉ chết", còn field này **đang được dùng sai** để hiển thị badge/gate sai, phải xoá để không ai lỡ dùng lại nhầm).

### 3.2 Thêm `isFree` vào entity, badge row theo đúng thứ tự ưu tiên web

```dart
// Book/BookDetail — thêm field
final bool isFree;
```
```dart
// fromJson
isFree: json['is_free'] as bool? ?? false,
```
Badge row (Wrap, giống pattern feature-40 §4.5): ưu tiên 1 trong 3 — `isFree` → "Miễn phí"; `isVip` → "VIP"; `hasPurchased` → "Đã mua". Độc lập: `isNewRelease` → "Mới"; `category` → tên category. Tổng tối đa 3 badge/dòng như ảnh mẫu (trạng-thái-sách + Mới + category).

### 3.3 CTA — bỏ gate sai, theo đúng logic `isUnlocked` (không điều kiện theo `hasPurchased` riêng)

```dart
final isUnlocked = detail.isFree || isVip || detail.hasPurchased;
...
isUnlocked
  ? ElevatedButton.icon(
      label: Text(progress != null ? 'Đọc tiếp' : 'Đọc ngay'),
      onPressed: () => _openChapter(context, detail, targetOrder: progress?.chapterOrder ?? 1),
    )
  : ElevatedButton.icon(
      label: Text('Mở khoá với ${detail.priceLt} LT'),
      onPressed: () => _showPurchase(context, detail),
    )
```
`progress != null` (không phải `progress.currentPage > 1` hay tương tự) là đủ để phân biệt "đã từng đọc" vs "chưa đọc" — vì `BookReadingProgressView` **luôn trả về** `{chapter_order, current_page}` mặc định `{1,1}` khi chưa có row `UserChapterProgress` nào, KHÔNG trả `null`/404 (đã verify qua code, giống hệt cái bẫy đã gặp ở feature-40 với `CourseLastLessonView` — endpoint luôn có giá trị mặc định, không dùng "có giá trị hay không" để suy ra "đã đọc hay chưa"). **Phải dùng dấu hiệu khác**: `UserChapterProgress` có field `current_page`; nếu backend không trả thêm 1 cờ kiểu `has_progress`/`completed`, cách an toàn nhất là dựa vào **chapters[].isCompleted** — nếu có ≥1 chương `isCompleted=true` HOẶC `current_page > 1` (đã lật ít nhất qua trang 1) thì coi là "đã đọc", nêu rõ ở §4 để PO xác nhận vì đây là quyết định không có sẵn công thức 1-dòng như feature-40.

### 3.4 Bloc — fetch progress song song, chỉ khi sách đã unlock (giống web)

```dart
// book_detail_bloc.dart — mirror _onLoadChapter (feature-39) / _onLoad (feature-40)
Future<void> _onLoad(LoadBookDetail event, Emitter<BookDetailState> emit) async {
  emit(BookDetailLoading());
  final result = await _repository.getBookDetail(event.slug, forceRefresh: event.forceRefresh);
  result.fold(
    (failure) => emit(BookDetailError(failure.message)),
    (detail) async {
      ReadingProgress? progress;
      final isVip = /* đọc AuthCubit tại thời điểm gọi, xem §3.1 */;
      if (detail.isFree || isVip || detail.hasPurchased) {
        final progressResult = await _repository.getReadingProgress(event.slug);
        progress = progressResult.fold((_) => null, (p) => p);
      }
      emit(BookDetailLoaded(detail, progress: progress));
    },
  );
}
```
Web chỉ gọi progress `if (isUnlocked.value)` — mirror đúng để tránh gọi API thừa cho sách còn khoá (và tránh trường hợp lạ nếu endpoint yêu cầu quyền truy cập sách).

### 3.5 Chapter row — badge "Trang X" + highlight, dựa `progress.chapterOrder`

Sửa `_ChapterListItem` tại chỗ (KHÔNG tách file mới — nhất quán với cách feature-40 sửa `lesson_list_item.dart` tại chỗ thay vì viết lại):
```dart
final isCurrent = progress != null &&
    chapter.order == progress.chapterOrder &&
    chapter.canAccess &&
    !chapter.isCompleted; // web: currentProgress đang đọc dở, chưa hoàn thành
```
- `isCurrent == true` → nền tint vàng nhạt + viền trái vàng (`AppColors.primaryGold.withOpacity(0.08)`, giống `LessonListItem.isActive` ở feature-40) + badge nhỏ `"Trang ${progress.currentPage}"` cạnh tên chương + icon sách-mở thay icon mặc định.
- Giữ nguyên: lock icon khi `!canAccess`, checkmark khi `isCompleted`.
- Header đổi `"Danh sách chương"` → `"Nội dung · ${chapters.length} chương"`.

### 3.6 Cover — ưu tiên `small_cover`

```dart
// entity thêm field
final String? smallCoverUrl;
// screen
final coverUrl = detail.smallCoverUrl ?? detail.coverImageUrl;
```
Không bắt buộc fallback "chữ cái đầu" như web (khác biệt nhỏ, không quan trọng UX) — nêu ở §4 để PO xác nhận có cần làm y hệt không hay giữ nguyên placeholder màu hiện tại của mobile.

### 3.7 Refetch khi quay lại từ Reader

Áp dụng đúng pattern `_openLesson` ở feature-40 (§ "Refetches on return"): mọi điều hướng từ Book Detail sang `BookReaderScreen` (nút CTA + tap chương) phải `await context.push(...)` rồi `LoadBookDetail(slug, forceRefresh: true)` khi quay lại — nếu không, đọc xong quay lại vẫn thấy state cũ (Flutter Navigator giữ nguyên bloc khi pop, không tự remount như Vue Router).

## 4. Trade-off & quyết định cần PO xác nhận

- **§3.3 "đã đọc hay chưa"**: đề xuất dùng `progress.currentPage > 1 || chapters.any((c) => c.isCompleted)` làm điều kiện hiện "Đọc tiếp" thay vì "Đọc ngay" — vì endpoint progress luôn trả giá trị mặc định `{1,1}`, không phân biệt được "chưa đọc" vs "đang ở trang 1 chương 1 thật". Cần PO xác nhận công thức này chấp nhận được (rủi ro: user đọc xong đúng trang 1 rồi thoát ra — vẫn hiện "Đọc ngay" thay vì "Đọc tiếp", edge case hiếm, chấp nhận được).
- **§3.1 xoá `isVipOnly`**: khác cách xử lý field-chết ở feature-40 (giữ nguyên `lastWatchedLessonSlug` không xoá) — ở đây đề xuất **xoá hẳn** vì field đang bị dùng SAI (hiển thị badge/gate nhầm), không phải chỉ đơn thuần vô hại. Cần PO xác nhận đồng ý xoá thay vì giữ lại.
- **§3.6 fallback cover chữ-cái-đầu**: không bắt buộc làm giống web, giữ placeholder hiện tại — cần PO xác nhận có cần thêm không (nice-to-have, không quan trọng).
- **Rollout & rollback**: thuần thay đổi client, không backend/DB, không kill-switch — rollback là release bản kế tiếp (giống feature-39/40).
- **Cache**: `getBookDetail` đã có cache (`CacheTtl.list` tương tự Video) — cùng lưu ý rollout đã gặp ở feature-40: cache cũ từ trước khi có field `isFree`/bỏ `isVipOnly` sẽ thiếu badge đúng cho tới khi TTL hết hạn hoặc user pull-to-refresh. Không cần xử lý đặc biệt, chỉ cần biết trước khi test.
- **Test**: thêm test cho `BookDetailModel.fromJson` (field mới/bỏ field cũ) — module `books` mobile hiện chưa có tiền lệ bloc test (giống feature-39), có thể defer.

## 5. Bước tiếp theo

1. PO review & xác nhận 3 điểm ở §4 (công thức "đã đọc", xoá `isVipOnly`, fallback cover).
2. Sau approve → Stage 3: `book.dart` (entity: +`isFree`, +`smallCoverUrl`, xoá `isVipOnly`), `book_model.dart` (parse), `book_detail_bloc.dart`/`_event.dart`/`_state.dart` (fetch progress có điều kiện), `book_detail_screen.dart` (badge row, CTA gộp, header chapter list, refetch-on-return), `_ChapterListItem` (badge "Trang X" + highlight).
