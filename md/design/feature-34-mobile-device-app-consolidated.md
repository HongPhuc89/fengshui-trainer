# Feature 34–41 — Mobile Device, App Update & Mobile UI Parity (Consolidated Reference)

## Document Information

- **Loại tài liệu**: Consolidated technical reference — gộp 8 design doc gốc (feature-34 → feature-41) thành một tài liệu duy nhất, đã verify lại với code hiện tại.
- **Phạm vi**: Toàn bộ hệ thống mobile device/pairing (F34, F35, F38), app version & update (F36, F37), và 3 feature UI parity mobile-vs-web (F39 PDF reader, F40 video detail, F41 book detail).
- **Trạng thái**: Tất cả 8 feature đều **✅ Implemented**. Tài liệu này mô tả **trạng thái cuối cùng sau khi implement**, không phải lịch sử từng phiên bản thiết kế.
- **Ngày tổng hợp**: 2026-09-02
- **Nguồn gốc**: Gộp từ 8 design doc gốc (`feature-34-mobile-client-id.md` đến `feature-41-mobile-book-detail-parity.md`, đã xoá sau khi gộp). Tài liệu này **thay thế hoàn toàn** 8 doc gốc — lịch sử revision/PO review chi tiết từng vòng không còn được lưu riêng, chỉ còn trạng thái cuối cùng sau implement.
- **Đã verify với code** (2026-09-02): model `MobileDevice`, `AppRelease`, `PdfViewPinch`, field `isVipOnly` (giữ ở `Book`, đã xoá khỏi `BookDetail`), `setLastLesson` fire-and-forget — khớp 100% với mô tả trong các design doc gốc.

---

## 1. Tóm tắt tổng quan

Tám feature này kể một câu chuyện liền mạch, bắt đầu từ một sự cố: **mobile và web dùng chung endpoint login, chung bảng device, chung hạn mức 5 thiết bị** — mở vài tab trình duyệt là hết quota, mobile không đăng nhập được.

1. **F34** dựng lại nền móng: tách hẳn `MobileDevice` khỏi `UserDevice` (web), khoá cứng **1 máy/user**, và bắt buộc đổi máy phải qua **mã ghép cặp do admin cấp trước** — không có đường tự phục vụ nào.
2. **F35** trang bị công cụ vận hành cho nền móng đó: admin cấp slot mới ngay từ danh sách thiết bị (không phải vòng qua trang User), và **làm mới thiết bị tại chỗ** khi user đổi máy — giữ nguyên `client_code`/lịch sử thay vì sinh row rác mỗi lần đổi máy.
3. **F36** giải quyết một vấn đề khác hẳn nhưng cùng hệ sinh thái: app phát hành ngoài store (APK tự ký + iOS ad-hoc) nên **không có auto-update** — dựng cơ chế kiểm tra phiên bản + tải + cài, hai mức nhắc/chặn.
4. **F37** chỉ một ngày sau, đảo ngược phần lớn độ phức tạp của F36: **iOS chuyển hẳn sang TestFlight**, Android **chỉ giữ đúng 1 bản** (không còn lịch sử nhiều version), bỏ hẳn mức chặn cứng.
5. **F38** tinh chỉnh lại mã ghép cặp của F34: rút từ 12 xuống **6 ký tự** vì rào chắn thật (auth-gate + giới hạn số lần thử + TTL) không phụ thuộc độ dài mã.
6. **F39, F40, F41** là ba đợt rà soát mobile-vs-web riêng biệt (PDF reader, video detail, book detail) — cùng một mẫu hình: **dữ liệu/API backend đã có sẵn, mobile chỉ chưa dùng tới**, cộng với vài bug tiềm ẩn bị phát hiện giữa chừng (TOC rỗng, field `last_watched_lesson` chết, field `is_vip_only` không tồn tại).

---

## 2. Kiến trúc Mobile Device & Pairing (F34 + F35 + F38)

### 2.1 Bảng riêng, không dùng chung với web

`MobileDevice` là bảng độc lập hoàn toàn với `UserDevice` (web), kế thừa `AbstractDevice` (fields dùng chung: `device_name`, `status`, `last_ip`, `last_active`, `revoked_at`, 4 field `geo_*`). `device_id` **không** nằm trong base — mỗi model con khai báo riêng vì web luôn có giá trị còn slot mobile thì `NULL` cho tới khi được ghép cặp.

Lý do tách bảng thay vì thêm cột `platform` discriminator vào bảng chung: `user.devices` (related manager) tự động chỉ còn chứa web device, nên các bug lớp "quên filter theo platform" (đếm nhầm quota, revoke nhầm thiết bị) **không thể tái sinh** — viết sai là truy vấn sai hẳn model, không phải truy vấn đúng model nhưng sai tập dữ liệu.

```python
class MobileDevice(AbstractDevice):
    STATUS_CHOICES = [('UNCLAIMED', ...), ('ACTIVE', ...), ('REVOKED', ...), ('EXPIRED', ...)]
    OCCUPYING = ('UNCLAIMED', 'ACTIVE')   # statuses chiếm chỗ trong mobile_max_devices

    user = models.ForeignKey(User, related_name='mobile_devices', ...)
    client_code = models.CharField(max_length=16, unique=True)     # định danh SLOT, bất biến
    pairing_code = models.CharField(max_length=20, unique=True)    # bí mật dùng 1 lần
    device_id = models.CharField(null=True, blank=True)            # NULL cho tới khi claim
    hardware_hash = models.CharField(null=True, blank=True, db_index=True)
    issued_by, issued_reason, expires_at, claimed_at, claim_ip, claim_attempts
    device_type, device_model, os_version, app_version
    bound_at, revoked_at, revoked_reason
```

`User.mobile_max_devices` (mặc định **1**) giới hạn số slot `OCCUPYING` — kiểm ở **lúc admin cấp slot**, dưới row lock (`select_for_update`), không phải lúc login.

### 2.2 Vòng đời một slot

```
[admin cấp slot] → UNCLAIMED → (nhập đúng mã) → ACTIVE → (gỡ/tắt) → REVOKED
                       │                                                │
                       ├── (quá TTL 7 ngày) ──────────────► EXPIRED    │
                       ├── (sai > 5 lần) ─────────────────► EXPIRED    │
                       └── (admin huỷ) ───────────────────► EXPIRED   (login lại cần slot mới)
```

`UNCLAIMED` **chiếm chỗ** cùng `ACTIVE` — nếu không tính thì admin cấp 5 slot, user nhận cả 5, vượt hạn mức không cách nào chặn. `REVOKED`/`EXPIRED` **không bao giờ hồi sinh** — mọi lần đổi máy sau khi slot đã đóng đều cần slot mới (trừ trường hợp "làm mới" ở §2.4, giữ nguyên slot).

### 2.3 Nhận diện thiết bị — tra cứu 3 tầng, chỉ 1 tình huống cần mã

| | Tình huống | Client ID | Cùng máy vật lý? | Cần mã? |
|---|---|---|---|---|
| S1 | Logout rồi login lại | Không đổi | ✅ | ❌ |
| S2 | Cài lại app / wipe data / đổi ROM | Bị mất | ✅ | ❌ |
| S3 | Đổi sang điện thoại khác | Khác thật | ❌ | ✅ |

Bên cạnh `device_id` (UUID lưu secure storage), mobile gửi thêm `hardware_hash` = SHA-256 của định danh phần cứng sống sót qua cài lại app (`ANDROID_ID` trên Android — cần package `android_id` vì `device_info_plus` không expose; Keychain/`identifierForVendor` trên iOS).

```
1. Khớp device_id ──► slot ACTIVE          ──► S1: vào thẳng, không cần mã
                  └─► slot REVOKED/EXPIRED ──► máy quen nhưng slot đã đóng → cần mã
2. Miss → khớp hardware_hash ──► slot ACTIVE ──► S2: vào, ghi device_id mới, GIỮ client_code
                             └─► slot đã đóng ──► cần mã
3. Miss cả hai ──► máy lạ (S3) ──► cần mã
```

`hardware_hash` chỉ dùng để **nới lỏng** (nhận ra máy cũ), không bao giờ để **cấp quyền** — giá trị do client gửi nên giả mạo được.

### 2.4 Admin tooling — 3 action trên `MobileDeviceAdmin`

| Action | Ý nghĩa | Slot sau đó | Tốn quota? | `client_code` |
|---|---|---|---|---|
| **Thêm thiết bị** (nút Add, `issue_slot()`) | Cấp slot mới cho user | `UNCLAIMED` mới | Có | Mã mới sinh |
| **Làm mới thiết bị** (`refresh_slot()`) | "User này đổi máy, cấp lại chỗ cũ" | `ACTIVE`/`UNCLAIMED` → `UNCLAIMED` **tại chỗ** | Không (vẫn chiếm chỗ cũ) | **Giữ nguyên** |
| **Gỡ liên kết** (`revoke_slots`, có từ F34) | "Cắt quyền hẳn" | → `REVOKED` (chết) | Trả chỗ về | Ngừng dùng |

**Nút Add** (`add_view()` override, không dùng `ModelForm` chuẩn): form chọn user (autocomplete) + lý do cấp → route qua `issue_slot()` để giữ kiểm tra quota dưới row lock → mã hiện trong `django.contrib.messages` để admin copy gửi qua Zalo/điện thoại.

**Làm mới thiết bị**: reset `device_id`/`hardware_hash`/toàn bộ metadata máy cũ về `NULL` (snapshot vào `AdminAuditLog.change_log` trước khi xoá), sinh `pairing_code` mới, gia hạn `expires_at`, reset `claim_attempts = 0`, và **blacklist token của máy cũ** (quyết định PO: có blacklist — không blacklist thì token cũ vẫn chết ngay ở request kế tiếp do `DeviceJWTAuthentication` kiểm `status=='ACTIVE'`, nhưng app sẽ kẹt ở lỗi khó hiểu thay vì đăng xuất sạch về màn hình login). Có cả **bulk action** (changelist) và **nút trên change form** (kèm popup xác nhận `<dialog>`).

Bug đã vá cùng lúc: `verify_pairing_code()` trước đây chọn slot `UNCLAIMED` **cũ nhất** theo `created_at` rồi so mã — với user có >1 slot chờ (do refresh sinh ra), việc này khiến slot đúng không bao giờ claim được và slot sai bị đốt hết lượt oan. Sửa: duyệt tất cả slot `UNCLAIMED` của user, so mã trên từng slot, chỉ slot khớp mới được claim.

### 2.5 Định dạng `pairing_code` hiện tại

Sau F38: **`TT-XXX-XXX`** (6 ký tự thân mã, chia 2 nhóm 3, Base32 Crockford bỏ I/L/O/U) — không phải `TT-XXXX-XXXX-XXXX` (12 ký tự) như F34 thiết kế ban đầu. Rào chắn thật nằm ở auth-gate (phải đăng nhập đúng email/password trước) + `DEVICE_PAIRING_MAX_ATTEMPTS=5` + `DEVICE_PAIRING_TTL_DAYS=7`, không phải độ dài mã — 6 ký tự (~30 bit) vẫn dư an toàn nhiều bậc so với ngưỡng cần. Mã 12 ký tự phát trước khi rút ngắn vẫn verify đúng (so khớp theo giá trị, không theo độ dài) — không cần migration.

`client_code` (dạng `MC-XXXXXXXX`) là **định danh của slot**, không phải của máy vật lý — bất biến trong vòng đời một slot, đổi khi slot được cấp lại (issue), giữ nguyên khi slot được làm mới (refresh) hoặc máy cũ login lại (rebind qua hardware_hash).

---

## 3. App Version & Update (F36 → F37)

> F37 chạy chỉ một ngày sau F36 và thay thế phần lớn thiết kế của nó. Phần này mô tả **trạng thái cuối** (sau F37) — không mô tả lại đầy đủ F36 rồi liệt kê thay đổi, chỉ nói rõ cái gì đã bị bỏ.

### 3.1 Trạng thái hiện tại

Model `AppRelease` là **singleton** — đúng 1 row (Android only, `platform` unique, DB tự chối row thứ hai). Admin không có nút "Thêm" (`has_add_permission` luôn `False`), chỉ có đúng 1 dòng để sửa. Upload APK mới là **ghi đè** bản hiện tại: `version_code`/`version_name` **tự đọc từ file APK** bằng `pyaxmlparser(raw=True)` ngay trong `clean_file()` của form — validate (APK đọc được, `version_code` phải cao hơn bản đang có) **trước khi lưu bất cứ thứ gì**. File cũ bị xoá ngay sau khi file mới lưu thành công (kể cả object trên Supabase).

```python
class AppRelease(BaseModel):
    platform = CharField(choices=[('ANDROID', 'Android')], default='ANDROID', unique=True)
    version_code = PositiveIntegerField(default=0, editable=False)   # đọc từ APK, không nhập tay
    version_name = CharField(max_length=32, default='0.0.0', editable=False)
    file = FileField(upload_to='releases/', null=True, blank=True)
    file_size, sha256                                                 # tự tính lúc upload
    release_notes = TextField(blank=True)
```

`GET /api/app/version/` (`AllowAny`, không nhận query param) trả thẳng bản hiện tại hoặc `204` nếu chưa có file. Client tự so `version_code` server trả với `PackageInfo.buildNumber` của máy — server không còn tính "status" (`BLOCKED`/`AVAILABLE`/`UP_TO_DATE`) như F36 từng làm.

### 3.2 Những gì từ F36 đã bị bỏ hẳn

| Đã bỏ | Lý do |
|---|---|
| **iOS OTA** (`itms-services://`, `manifest.plist` sinh động) | TestFlight thay thế toàn bộ — `UpdateCubit.check()` return ngay nếu `Platform.isIOS`, không gọi API |
| **Mức "chặn cứng"** (`min_supported_version_code`, verdict `BLOCKED`, "verdict dính" `LastVerdict`) | Không còn cách ép ai cập nhật — chỉ còn 1 modal nhắc, luôn đóng được. Đây là đánh đổi có chủ đích: cần vá bảo mật khẩn thì phải khôi phục cơ chế này (backlog) |
| **Lịch sử nhiều bản phát hành** (`is_published`, giữ file 3 bản mới nhất) | Chỉ còn đúng 1 bản — không còn "lùi bản", không còn pruning |
| `release_pruning.py`, `prune_app_releases` command, `version_spread.py`, `app_version.py` (`parse_version_code`) | Không còn tác dụng khi chỉ có 1 bản duy nhất |
| Query param `platform`/`version_code` trên endpoint | Chỉ còn 1 platform, 1 bản — không cần tham số |

Luồng **tải + verify sha256 (theo stream) + tự mở trình cài đặt hệ thống Android** (`AndroidInstaller`, `FileProvider`, quyền `REQUEST_INSTALL_PACKAGES`) giữ nguyên 100% từ F36 — đây là phần đã chạy tốt, không đụng vào.

### 3.3 Ghi chú vận hành quan trọng

- **`0002_apprelease.py` đã được viết lại tại chỗ**, không giữ lịch sử schema cũ của F36. Chỉ an toàn vì dự án chưa lên production — **mọi DB đã từng chạy migration cũ phải `migrate core 0001` trước khi pull code mới**, nếu không Django sẽ nghĩ migration "đã áp dụng" (theo tên) trong khi schema thực tế khác hẳn.
- **Không bao giờ tái sử dụng một `version_code` đã publish** — nguyên tắc kế thừa từ F36, vẫn đúng ở F37 dù không còn `UniqueConstraint` bắt buộc (chỉ còn 1 row nên không cần constraint đó nữa, nhưng thói quen vẫn phải giữ để tránh Android từ chối cài đè).
- Prerequisite đã vá cùng đợt F36: `AndroidManifest.xml` **main** (không chỉ debug) phải có quyền `INTERNET` — bản release trước đó chưa từng gọi được API nào.

---

## 4. Mobile UI Parity — PDF Reader, Video Detail, Book Detail (F39, F40, F41)

Ba feature này chia sẻ một mẫu hình chung: **backend đã có sẵn field/endpoint, mobile chỉ chưa parse/gọi tới** — không đổi API, không đổi schema. Cả ba đều theo pattern: fetch dữ liệu phụ trợ **song song** với dữ liệu chính, lỗi ở phần phụ trợ **không chặn** nội dung chính; và **refetch khi quay lại từ màn hình con** (Flutter Navigator giữ nguyên bloc/state khi pop — khác Vue Router tự remount).

### 4.1 F39 — PDF Reader: cuộn liên tục, giữ nguyên load theo chapter

Đổi widget `PdfView` (paged, vuốt ngang) → `PdfViewPinch` (cuộn dọc liên tục + pinch-zoom built-in) — cùng package `pdfx` đã dùng, không thêm dependency. Kiến trúc **load PDF theo chapter** (decrypt lazy trong RAM, không cache PDF giải mã ra đĩa) giữ nguyên 100% — chỉ đổi cách hiển thị.

Ranh giới chapter **không cuộn xuyên qua được**, khớp hành vi web: hết trang → hiện nút "Chương tiếp theo"/"Chương trước" cố định, bấm mới decrypt/load chapter kế. Tìm chapter kế/trước theo **`order` gần nhất** (không giả định liên tục 1..N, vì admin có thể xoá chapter giữa gây khoảng hở).

Hai sự kiện tách riêng để tránh giằng gesture: `PageScrolled` (viewer tự báo khi cuộn tay, không gọi `jumpToPage`) vs `ChangePage` (điều hướng chủ động — slider/nút, có gọi `jumpToPage`).

Bug đã vá cùng đợt: TOC mobile luôn rỗng (`chapters: const []` hard-code) — nay lấy từ `getBookDetail()` gọi song song lúc mở reader.

**Đã test trên thiết bị Android thật**: cuộn, pinch-zoom, watermark, TOC, chuyển chapter — xác nhận đúng. Quyết định C3 trong `feature-20-mobile-app.md` ("Swipe = chuyển trang trong cùng chapter") đã được đánh dấu superseded.

### 4.2 F40 — Video Detail: thumbnail bài học + header khoá học giống web

Hai phần bổ sung:
1. **Thumbnail 72×42** trong danh sách bài học — dữ liệu đã sẵn end-to-end (`LessonMeta.thumbnailUrl`), chỉ thiếu render (dùng `CachedNetworkImage`, pattern có sẵn từ `video_card.dart`).
2. **Header khoá học**: giảng viên, badge trình độ (màu theo cấp), tag số bài + tổng thời lượng, progress bar %, mô tả có "Xem thêm"/"Thu gọn" — parse thêm 4 field backend đã có sẵn (`instructor`, `level`, `total_lessons`, `total_duration_seconds`) + gọi thêm `GET /api/videos/{slug}/progress/` (endpoint có sẵn, trước đó chưa ai dùng).

Đã bỏ hero-image `SliverAppBar`, thay bằng back-link "‹ Khóa học" — khớp 100% web (web cũng đã bỏ banner này). CTA gộp về 1 nút duy nhất theo `canAccess`, bỏ `_PriceSection` hiển thị giá thường trực kể cả khi đã mua.

**Bug phát hiện khi test trên máy thật**: backend chưa từng trả `last_watched_lesson` trong response course-detail (field chết từ trước), và mobile chưa từng gọi `POST .../progress/last-lesson/` để đánh dấu bài đang xem. Fix: `VideoPlayerBloc` gọi `setLastLesson()` fire-and-forget khi load bài (mirror web `.catch(() => {})`); label CTA đổi sang dùng `progress.completedLessons > 0` (đúng, giống web) thay vì field chết; đích đến CTA gọi `getLastLessonOrder()` lazy lúc bấm.

Đã verify qua DB (`UserCourseProgress.last_lesson`) + thiết bị thật: mở bài 1 → quay lại → CTA vào đúng bài 1; mở bài 3 → tương tự đúng bài 3 (loại trừ trùng hợp fallback).

### 4.3 F41 — Book Detail: badge/CTA/tiến độ đọc giống web

Cùng dạng gap với F40, cộng thêm một bug parse field không tồn tại:

- **Bug đã vá**: `isVipOnly` đọc `json['is_vip_only']` — backend **không có** field này (VIP là thuộc tính **user**, không phải sách). Đã xoá `isVipOnly` khỏi `BookDetail` (lấy VIP qua `AuthCubit` thay thế). **Field `isVipOnly` vẫn còn nguyên trên entity `Book`** (dùng cho `book_card.dart`/danh sách) — đây là bug tồn tại độc lập, PO xác nhận nằm ngoài phạm vi F41, ghi nhận là follow-up chưa xử lý. *(Đã verify với code hiện tại: đúng như mô tả — `Book.isVipOnly` vẫn tồn tại, `BookDetail.isVipOnly` đã bị xoá.)*
- Thêm `isFree`, `smallCoverUrl` vào `BookDetail` (field backend có sẵn, chưa parse).
- Badge row: Miễn phí/VIP/Đã mua (ưu tiên 1 trong 3) + Mới + category.
- CTA gộp về 1 nút không điều kiện theo `isUnlocked = isFree || isVip || hasPurchased`.
- Thêm `getReadingProgress()` vào bloc, **chỉ fetch khi sách đã unlock** (giống web) — trước đó bloc chưa từng gọi endpoint này.
- Badge "Trang X" + highlight viền vàng cho chương đang đọc dở; mỗi chương tách thành card riêng (bo góc, cách nhau 8px) thay vì list liền mạch.
- Bỏ hero-image `SliverAppBar` → back-link "‹ Danh sách sách" + thumbnail nhỏ (80×110) cạnh title/author/badge — cùng pattern F40 áp dụng cho Video Detail.

**Quyết định đáng chú ý** (PO đã duyệt): endpoint `GET /books/{slug}/progress/` luôn trả mặc định `{chapter_order:1, current_page:1}` khi chưa có tiến độ (không trả null/404) — không thể dùng "có giá trị hay không" để suy ra "đã đọc chưa" (cùng bẫy đã gặp ở F40 với last-lesson). Công thức dùng: `currentPage > 1 || có chương completed` — chấp nhận edge case hiếm (đọc đúng hết trang 1 rồi thoát vẫn hiện "Đọc ngay").

**Bug thứ hai phát hiện khi test trên máy thật**: `saveChapterProgress()` (mobile) chưa từng gửi cờ `completed` lên backend, nên chương đọc xong không bao giờ hiện dấu ✓ dù `is_completed` đã parse đúng từ lâu. Fix: tính `completed = currentPage >= totalPages` và gửi ở mọi lần lưu (không chỉ khi true, để cuộn lùi lại đúng un-mark). Chỉ áp dụng cho lần lưu mới, không backfill dữ liệu sai từ trước.

Chapter list: mỗi chương tách thành card riêng (bo góc, cách nhau 8px) thay vì list liền mạch. Dấu ✓ chương hoàn thành sửa lại đúng màu `--accent-gold` (không phải xanh lá như thử ban đầu) và bỏ nền tròn — chỉ dấu tick trơn, khớp đúng `CheckIcon.vue` thật bên web (stroke polyline, không có circle background).

**Bug thứ ba** (ảnh hưởng cả F40 Video Detail): `CustomScrollView` thiếu `physics: AlwaysScrollableScrollPhysics()` → pull-to-refresh không hoạt động khi nội dung ngắn hơn màn hình (không đủ tạo overscroll) — đúng tình huống phổ biến (sách/khoá ít chương). Sửa cả 2 file.

**Đã test trên thiết bị Android thật** (kể cả set/revert tạm `UserChapterProgress.completed=True` qua Django shell để xác nhận màu/style dấu tick, không để lại thay đổi dữ liệu): layout thumbnail nhỏ + badge + CTA + highlight chương đang đọc + card riêng biệt + dấu tick đúng màu/style — khớp 100% ảnh tham chiếu web.

---

## 5. Bảng tổng hợp trạng thái

| # | Feature | Trạng thái | Ngày implement | Test coverage |
|---|---|---|---|---|
| 34 | Mobile Device: bảng riêng, khoá 1 máy/user | ✅ Nền móng (không tách riêng test) | 2026-08-27 (design) | Gộp trong test của F35 |
| 35 | Admin thêm/làm mới slot thiết bị | ✅ Implemented | 2026-08-30 | 55/55 backend xanh (T35-1…T35-21) |
| 36 | Quản lý phiên bản app (đa nền tảng, nhiều bản) | ⚠️ Superseded phần lớn bởi F37 | 2026-08-30 | 86/86 backend + 15 Flutter (tại thời điểm đó) |
| 37 | Đơn giản hoá cập nhật app (Android-only, 1 bản) | ✅ Implemented | 2026-08-31 | 12 backend mới (76/76 core+users) + 16 Flutter |
| 38 | Rút ngắn pairing_code 12→6 ký tự | ✅ Implemented | 2026-08-31 | 2 backend mới (78/78 core+users) + 7 Flutter |
| 39 | Mobile PDF Reader — cuộn liên tục | ✅ Implemented, đã test máy thật | 2026-09-01 | Test tay trên Android thật; chưa có bloc test (module `books` mobile chưa có tiền lệ) |
| 40 | Mobile Video Detail parity | ✅ Implemented, đã test máy thật + verify DB | 2026-09-02 | Test tay + verify `UserCourseProgress.last_lesson` qua DB |
| 41 | Mobile Book Detail parity | ✅ Implemented, đã test máy thật | 2026-09-02 | Test tay trên Android thật, khớp ảnh tham chiếu web |

---

## 6. Vấn đề tồn đọng đã biết (còn đúng tại thời điểm 2026-09-02)

- **F41 — `isVipOnly` vẫn còn trên entity `Book`** (list/card, khác `BookDetail`): badge VIP trên danh sách sách vẫn có thể sai vì đọc field `is_vip_only` không tồn tại ở backend. PO đã xác nhận đây là follow-up ngoài phạm vi F41, **chưa có feature nào xử lý**. *(Verify 2026-09-02: đúng, field vẫn tồn tại trong `book.dart`.)*
- **F37 — Không còn cách ép user cập nhật app**, kể cả khi cần vá lỗi bảo mật khẩn cấp. Đường ép duy nhất còn lại là ngoài band (liên hệ trực tiếp). Ghi trong backlog F37: khôi phục field `min_supported_version_code` nếu nhu cầu này quay lại.
- **F39 — Trang đích chính xác sau khi chuyển chapter** (kỳ vọng về trang 1) — code review đúng logic nhưng tại thời điểm viết design doc chưa re-test sạch do lỗi tọa độ ADB khi test tay. Chưa xác nhận việc này đã được test lại hay chưa trong các lần chạy sau (không thấy note bổ sung trong TASKS.md).
- **F40 — Label "Tiếp tục học"** cần hoàn thành ≥1 bài thật để test — tại thời điểm viết doc gốc, một số trường hợp (dòng giảng viên trên khoá có data) chưa chụp được ảnh trực tiếp do lỗi tọa độ ADB, dù cùng pattern code đã xác nhận đúng ở phần khác.
- **Cache rollout note (F40 & F41)**: cache `videoDetail`/`bookDetail` cũ (trước khi có field mới) sẽ thiếu header/badge đúng cho tới khi TTL hết hạn hoặc user pull-to-refresh — không phải bug, chỉ cần lưu ý khi test bản nâng cấp.

---

## 7. Ghi chú vận hành quan trọng (không bao giờ được vi phạm)

| # | Quy tắc | Hậu quả nếu vi phạm |
|---|---|---|
| D1 | **Không bao giờ đổi Android keystore** | `ANDROID_ID` đổi → toàn bộ user Android rơi vào "máy lạ" (S3) cùng lúc, phải cấp mã ghép cặp hàng loạt |
| D2 | **Không bao giờ đổi iOS bundle ID** | Keychain access group đổi → `device_id` mất trên toàn bộ user iOS |
| D3 | **Không phát hành song song hai kênh phân phối** cho cùng một app | User chuyển kênh có signing key khác → bị hệ thống coi là đổi máy |
| D4 | Lên Play Store với Play App Signing sau này = **sự kiện vận hành có kế hoạch**, không phải nâng cấp thường | Google ký lại bằng key khác → `ANDROID_ID` đổi một lần cho tất cả — phải chuẩn bị trước (dùng chính keystore hiện tại làm app signing key khi đăng ký Play) |
| — | **Không bao giờ tái sử dụng một `version_code` đã publish** | Android từ chối cài đè version thấp hơn; sửa lỗi bản phát hành hỏng phải build version cao hơn, không sửa tại chỗ |
| — | Migration `core/0002_apprelease.py` **đã bị viết lại tại chỗ** (F37), không giữ lịch sử schema F36 | Mọi DB local/staging từng chạy migration F36 cũ **phải** `migrate core 0001` trước khi pull code có F37, nếu không Django coi migration "đã áp dụng" trong khi schema thực tế sai lệch |
| — | Trần **100 thiết bị/năm thành viên** cho iOS ad-hoc (nếu còn dùng — đã chuyển sang TestFlight ở F37) | Xoá UDID khỏi danh sách không trả lại slot cho tới kỳ gia hạn hằng năm |
| — | Mỗi lần build IPA (nếu quay lại dùng ad-hoc) phải **export lại provisioning profile với UDID hiện hành** | User được onboard sau khi build mới nhất sẽ không cài được — cập nhật có thể làm hỏng một app đang chạy tốt |

---

## 8. Tài liệu tham khảo

8 design doc gốc (feature-34 → feature-41) đã được gộp vào tài liệu này và **xoá khỏi `md/design/`** để tránh trùng lặp nguồn sự thật. Lịch sử quyết định/PO review chi tiết từng vòng của các feature này có thể tra lại qua `git log -- md/design/feature-3[4-9]-*.md md/design/feature-4[0-1]-*.md` nếu cần.
