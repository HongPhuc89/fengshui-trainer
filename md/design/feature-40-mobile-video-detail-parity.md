# Feature 40 — Mobile Video Detail: thumbnail bài học + header khoá học giống web

## Document Information
- **Feature**: Mobile Video course detail screen (Flutter, `src/mobile/`) đang thiếu 2 thứ mà bản web (`VideoDetailView.vue`) đã có: (1) ảnh thumbnail trong danh sách bài học (`lesson_list_item.dart` hiện chỉ có số thứ tự trong vòng tròn), (2) khối thông tin header (giảng viên, badge trình độ, số bài + tổng thời lượng, progress bar %, mô tả có nút "Xem thêm"). Bổ sung cả hai, bám sát pattern web.
- **Status**: **Approved — Stage 3 (implementing)**
- **Created**: 2026-09-01
- **Updated**: 2026-09-01
  - v2: Xử lý PO review v1 (Approve with minor fixes) — thêm snippet `_onPurchase` mang `progress` theo (§4.4), ghi chú rollback/rollout (§5), ghi chú permission endpoint progress (§4.3). PO xác nhận đồng ý cả 2 quyết định ở §5 (giữ hero-image; bỏ `_PriceSection` thường trực).
- **Related**: `feature-3-videos.md` (thiết kế module Video gốc), `feature-20-mobile-app.md` (kiến trúc Flutter tổng, F2 "Bám theo UI/UX web")

---

## 1. Tóm tắt

User đối chiếu 2 ảnh chụp: (a) danh sách bài học mobile không có thumbnail như web, (b) trang chi tiết khoá học mobile thiếu hẳn khối header thông tin (giảng viên, trình độ, tiến độ, mô tả) mà web đang có.

Khảo sát cho thấy **phần (1) thuần UI** — dữ liệu (`thumbnailUrl`) đã có sẵn end-to-end từ backend tới `LessonMeta` entity, `lesson_list_item.dart` chỉ đơn giản chưa render nó. **Phần (2) cần bổ sung dữ liệu**: backend đã có đủ field (`instructor`, `level`, `total_lessons`, `total_duration_seconds` trong `VideoCourseDetailSerializer`; endpoint riêng `GET /api/videos/{slug}/progress/` cho % tiến độ) nhưng mobile's `VideoDetail` entity/model chưa parse các field đó, và chưa có repository method gọi endpoint progress. Không cần đổi gì ở Backend/Database.

## 2. Phân tích

### Yêu cầu / ràng buộc
- Thumbnail bài học: ảnh 72×42 (tỷ lệ ~16:9 hơi rộng), fallback `small_thumbnail` → `thumbnail` → icon placeholder, giống hệt `LessonListTab.vue`.
- Header khoá học: title, giảng viên, badge trình độ (màu theo cấp: Cơ bản xanh lá / Trung cấp cam / Nâng cao đỏ), tag số bài học + tổng thời lượng, progress bar (chỉ hiện khi đã học ≥1 bài), nút CTA (Tiếp tục học / Bắt đầu học / Mở khoá), mô tả co giãn 3 dòng + nút "Xem thêm"/"Thu gọn" — đúng theo `VideoDetailView.vue`.
- Không đổi Backend/Database — mọi field cần thiết đã tồn tại.

### Các tầng liên quan
- **Backend (Django)**: Không đổi — chỉ tham chiếu field/endpoint có sẵn.
- **Mobile (Flutter)**: Domain entity (`VideoDetail`, thêm entity `CourseProgress` mới), data model (`VideoDetailModel.fromJson`), datasource + repository (thêm `getCourseProgress`), bloc (`VideoDetailBloc` fetch song song), 2 widget UI (`lesson_list_item.dart`, `video_detail_screen.dart`).

## 3. Hiện trạng — so sánh Web vs Mobile

| | Web | Mobile hiện tại |
|---|---|---|
| Thumbnail bài học | `LessonListTab.vue`: `<img>` 72×42, `object-fit: cover`, fallback `small_thumbnail`\|`thumbnail`\|icon placeholder | `lesson_list_item.dart:30-36`: chỉ `CircleAvatar` số thứ tự — `lesson.thumbnailUrl` (đã có trong `LessonMeta`, đã parse ở `LessonMetaModel.fromJson`) **chưa từng được đọc** |
| Cover-image hero | Không có — web bỏ hẳn banner lớn | `SliverAppBar` 220px với `CachedNetworkImage` hero (`video_detail_screen.dart:96-107`) |
| Giảng viên | `course.instructor` + chấm tím | Không hiển thị — field chưa có trong `VideoDetail` entity |
| Badge trình độ | `course.level` → map màu Cơ bản/Trung cấp/Nâng cao | Không có |
| Số bài + thời lượng | `course.total_lessons`, `course.total_duration_seconds` dạng tag có icon | Không có |
| Progress bar | `GET /api/videos/{slug}/progress/` riêng (`CourseProgressView`) → % + số bài hoàn thành | Không gọi endpoint này — không có progress bar |
| CTA | 1 nút duy nhất: canAccess → Tiếp tục/Bắt đầu học; else → Mở khoá với giá | 2 nhánh cứng (`hasPurchased && lastWatchedLessonSlug` / `hasPurchased only`) + `_PriceSection` hiển thị giá **luôn luôn**, kể cả khi đã mua |
| Mô tả | Clamp 3 dòng + nút "Xem thêm"/"Thu gọn" (toggle state) | Clamp cứng 4 dòng, `overflow: ellipsis`, không toggle được |

→ Phần thumbnail là fix UI đơn thuần (không đổi entity/API). Phần header cần bổ sung field + 1 API call mới, theo đúng pattern đã dùng ở feature-39 (`bookDetail` nullable, fetch song song, lỗi không chặn nội dung chính).

## 4. Đề xuất giải pháp

### 4.1 Thumbnail bài học (`lesson_list_item.dart`)

Giữ nguyên vòng tròn số thứ tự (affordance hiện có, không có lý do bỏ khi user không yêu cầu) nhưng thu nhỏ, thêm thumbnail ở giữa — bố cục mới: `[order nhỏ] [thumbnail 72×42] [title + duration, Expanded] [icon trạng thái: khoá/phát/hoàn thành]`. Thay `ListTile` bằng `Row` tự dựng (ListTile không đủ chỗ cho 2 leading-widget), giữ nguyên `trailing`-icon pattern hiện tại cho khoá/đang phát/hoàn thành (rõ ràng hơn kiểu web dùng icon thay số ở vị trí order — không cần đổi, hai cách truyền đạt cùng thông tin).

```dart
Row(
  children: [
    SizedBox(
      width: 24,
      child: Text('${lesson.order}', style: TextStyle(color: AppColors.textSecondary, fontSize: 11), textAlign: TextAlign.center),
    ),
    const SizedBox(width: 8),
    ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: lesson.thumbnailUrl != null
          ? CachedNetworkImage(
              imageUrl: lesson.thumbnailUrl!,
              width: 72, height: 42, fit: BoxFit.cover,
              placeholder: (_, __) => Container(width: 72, height: 42, color: AppColors.surfaceAlt),
              errorWidget: (_, __, ___) => _ThumbPlaceholder(),
            )
          : _ThumbPlaceholder(),
    ),
    const SizedBox(width: 12),
    Expanded(child: Column(...title + duration...)),
    ...trailing icon hiện tại...
  ],
)
```

`CachedNetworkImage` đã là dependency sẵn có (`pubspec.yaml`), đúng pattern đang dùng ở `video_card.dart:25-33` — không thêm package mới.

### 4.2 Domain & data layer (`video.dart`, `video_model.dart`)

Thêm field vào `VideoDetail`/`VideoDetailModel` (additive, parse trực tiếp từ field backend đã trả sẵn trong `VideoCourseDetailSerializer`):

```dart
class VideoDetail extends Equatable {
  ...
  final String? instructor;
  final String? level;              // 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  final int totalLessons;
  final int totalDurationSeconds;
}
```
```dart
// VideoDetailModel.fromJson — thêm 4 dòng parse
instructor: json['instructor'] as String?,
level: json['level'] as String?,
totalLessons: json['total_lessons'] as int? ?? 0,
totalDurationSeconds: json['total_duration_seconds'] as int? ?? 0,
```

Thêm entity mới `CourseProgress` (mirror `CourseProgressSerializer`):
```dart
class CourseProgress extends Equatable {
  final int progressPercent;
  final int completedLessons;
  final int totalLessons;
}
```

### 4.3 Repository + datasource — gọi `GET /api/videos/{slug}/progress/`

```dart
// videos_repository.dart (interface) — thêm 1 method
Future<Either<Failure, CourseProgress>> getCourseProgress(String slug);

// videos_remote_datasource.dart
Future<CourseProgressModel> getCourseProgress(String slug) async {
  final res = await _api.get('/videos/$slug/progress/');
  return CourseProgressModel.fromJson(res.data);
}
```
`CourseProgressView` yêu cầu `IsAuthenticated` (đã verify qua code) — không rủi ro vì app đòi login toàn bộ và `fold()` ở §4.4 đã xử lý lỗi graceful (token hết hạn/anonymous → `progress = null`, chỉ progress bar không hiện, không crash).

### 4.4 Bloc — fetch song song, lỗi progress không chặn nội dung chính

Theo đúng pattern đã dùng ở `book_reader_bloc._onLoadChapter` (feature-39, §4.3): 2 request chạy song song, progress là dữ liệu phụ trợ — lỗi progress chỉ làm progress bar không hiện, không chặn trang chi tiết:

```dart
Future<void> _onLoad(LoadVideoDetail event, Emitter<VideoDetailState> emit) async {
  emit(VideoDetailLoading());
  final progressFuture = _repository.getCourseProgress(event.slug); // song song
  final result = await _repository.getVideoDetail(event.slug, forceRefresh: event.forceRefresh);
  final progressResult = await progressFuture;
  final progress = progressResult.fold((_) => null, (p) => p);
  result.fold(
    (failure) => emit(VideoDetailError(failure.message)),
    (detail) => emit(VideoDetailLoaded(detail, progress: progress)),
  );
}
```
`progress` thêm làm field nullable vào cả 3 state có mang `detail` (`VideoDetailLoaded`, `VideoDetailPurchasing`, `VideoDetailPurchaseError`) — tái dùng qua chuỗi sự kiện mua/lỗi mua giống cách `LoadChapter` giữ `_bookDetail` ở feature-39 (bloc field, không refetch mỗi lần).

`_onPurchase` cũng phải mang `progress` hiện tại theo, không chỉ `_onLoad` — nếu bỏ sót, progress bar sẽ biến mất rồi hiện lại (flicker) trong lúc mua khoá:
```dart
Future<void> _onPurchase(PurchaseVideo event, Emitter<VideoDetailState> emit) async {
  final current = state;
  if (current is! VideoDetailLoaded) return;
  emit(VideoDetailPurchasing(current.detail, progress: current.progress)); // giữ progress, không reset về null
  final result = await _repository.purchaseVideo(event.slug);
  result.fold(
    (failure) => emit(VideoDetailPurchaseError(current.detail, failure.message, progress: current.progress)),
    (_) => add(LoadVideoDetail(event.slug)), // reload đầy đủ, tự fetch lại progress mới
  );
}
```

### 4.5 UI header (`video_detail_screen.dart`)

Bố cục mới theo đúng `VideoDetailView.vue` §template, **giữ nguyên `SliverAppBar` hero-image hiện có** (xem quyết định ở §5), thêm khối info bên dưới:

- Title (giữ nguyên).
- Giảng viên: `Row(chấm tím 7px + Text(detail.instructor))`, chỉ hiện nếu `instructor` không rỗng.
- Tags row: badge trình độ (map màu `LEVEL_MAP` giống web — Cơ bản `#66bb6a` / Trung cấp `#ffa726` / Nâng cao `#ef5350`), tag số bài học (icon `Icons.smart_display_outlined` + `totalLessons`), tag thời lượng (icon `Icons.access_time` + format `Xg Yp`/`Y phút`, cùng công thức `formatDuration()` bên web).
- Progress bar: chỉ hiện khi `progress != null && progress.completedLessons > 0` — `LinearProgressIndicator` màu gold + label `"X/Y bài · Z%"`.
- CTA: **gộp về 1 nhánh** thay vì 2 nhánh cứng hiện tại — `canAccess` (free/VIP/đã mua) → 1 nút "Tiếp tục học" (nếu có `lastWatchedLessonSlug`) / "Bắt đầu học" (nếu chưa); else → nút "Mở khoá với X LT" gọi `_showPurchase`. Bỏ `_PriceSection` hiển thị giá thường trực (xem §5).
- Mô tả: `AnimatedCrossFade` hoặc đơn giản `StatefulWidget` cục bộ với `bool _descExpanded`, clamp 3 dòng khi collapsed, nút "Xem thêm"/"Thu gọn" y hệt web.

## 5. Trade-off & quyết định cần PO xác nhận

- **Giữ `SliverAppBar` hero-image**: web đã bỏ hẳn banner lớn trong bản redesign này, nhưng user chỉ nói "bổ sung phần thông tin phía trên" (thêm, không nói bỏ ảnh bìa) — đề xuất **giữ nguyên hero-image mobile đang có**, chỉ thêm khối info bên dưới nó. Rủi ro thấp, không cần xác nhận nếu PO đồng ý; nêu ở đây để tránh hiểu nhầm là copy 100% pixel web.
- **Bỏ `_PriceSection` hiển thị giá thường trực**: hiện mobile luôn hiện giá/VIP-badge phía trên nút, kể cả khi đã mua (dư thừa). Web chỉ hiện giá khi CHƯA mua (gộp vào chính nút CTA "Mở khoá với X LT"). Đề xuất theo web — **cần PO xác nhận** vì đây là thay đổi hành vi hiển thị đã có, không phải thuần thêm mới.
- **Giữ order-number + thêm thumbnail** (không thay số bằng icon lock/play như web) — giữ affordance sẵn có, ít rủi ro hơn đổi hẳn cách hiển thị trạng thái. Nêu để PO xác nhận không muốn đổi luôn theo web.
- **Không cache riêng course-progress**: gọi lại mỗi lần vào trang (giống web — không thấy web cache progress). Nhất quán, đơn giản.
- **Test**: thêm test cho `VideoDetailModel.fromJson` (4 field mới) và bloc test cho nhánh progress lỗi không chặn `VideoDetailLoaded` — module `videos` cũng chưa có tiền lệ bloc test (giống tình trạng `books` ở feature-39), có thể defer nếu PO không yêu cầu.
- **Rollout & rollback**: thuần thay đổi client (mobile app), không có backend/DB đi kèm nên không có feature flag/kill-switch server — rollback là phát hành bản kế tiếp, chịu độ trễ duyệt app store (giống feature-39).

## 6. Bước tiếp theo

1. PO review & xác nhận 2 điểm ở §5 (bỏ `_PriceSection` thường trực; giữ hero-image).
2. Sau approve → Stage 3: `video.dart` (entity), `video_model.dart` (parse), `videos_repository.dart`/`videos_remote_datasource.dart` (thêm `getCourseProgress`), `video_detail_bloc.dart`/`_event.dart`/`_state.dart` (fetch song song), `lesson_list_item.dart` (thumbnail), `video_detail_screen.dart` (header UI mới).
