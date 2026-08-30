# Feature 36 — Quản lý phiên bản app mobile và cập nhật trong app

## Document Information
- **Feature**: Server giữ bản phát hành mới nhất cho từng nền tảng; app so `versionCode`, thấp hơn thì tải bản mới về cài. Hai mức: nhắc (bỏ qua được) và chặn (`min_supported_version_code`).
- **Status**: **v5 — Implemented (Stage 3, 2026-08-30)**. 77/77 test backend + 15 test Flutter xanh.
- **Created**: 2026-08-30
- **Updated**: 2026-08-30
  - v5: Implement xong. Prerequisite §2 (`INTERNET`) làm cùng đợt thay vì tách riêng — không có nó thì không test được gì trên bản release. Xác minh lại bằng build release: manifest giờ có `INTERNET`, `REQUEST_INSTALL_PACKAGES` và `FileProvider`.
  - v4: Bỏ cổng chặn ở mobile login; dồn toàn bộ việc kiểm tra về sự kiện mở app/resume (§6.3, §7.5). Bù bằng **verdict dính** lưu local để một lần gọi hỏng không mở khoá máy đang bị chặn. T36-9…T36-11 đổi, thêm T36-25…T36-27.
  - v3: "Để sau" (hoãn 24 giờ) đổi thành "Bỏ qua" ghi nhớ **theo `version_code`** — §7.6, §7.7 mới, T36-21…T36-24.
  - v2: **Xử lý PO review v1** — 3 Critical (C1 lùi bản phát hành, C2 UDID iOS, C3 phân bố phiên bản) và 4 Suggestion. Chốt 5 quyết định ở §11.
- **Related**: `feature-34-mobile-client-id.md` (§4.5 mô hình phân phối, quy tắc D1–D4), `feature-35-admin-refresh-device.md`

---

## 1. Tóm tắt

App phát hành ngoài store (Android APK tự ký, iOS ad-hoc), nên **không có auto-update**. Feature-34 §4.5 đã ghi trước điều này: *"phải tự làm màn hình 'có bản mới, tải tại đây', và backend phải chịu client cũ lâu hơn"*. Hôm nay backend hoàn toàn không biết ngoài kia đang chạy bản nào, và không có cách nào ép ai cập nhật.

Feature 36 dựng ba mảnh:

1. **Một bảng `AppRelease`** — admin upload APK/IPA, khai `version_code`, `version_name`, `min_supported_version_code`, ghi chú, rồi publish.
2. **`GET /api/app/version/`** — app hỏi, server trả verdict: `UP_TO_DATE` / `AVAILABLE` / `BLOCKED` kèm link tải.
3. **Kiểm tra khi mở app và khi resume** — một chỗ duy nhất, không móc vào login (§6.3). Verdict gần nhất được lưu local nên một lần gọi hỏng không mở khoá được máy đang bị chặn.

Android tải APK rồi gọi trình cài đặt hệ thống. iOS ad-hoc dùng OTA `itms-services://` với `manifest.plist` **sinh động** từ backend.

> **⚠️ Có một việc phải sửa trước khi feature này chạy được — xem §2.** Bản release hiện tại không có quyền `INTERNET`.

---

## 2. Chặn trước: APK release không có quyền `INTERNET`

Kiểm chứng bằng cách build thật `flutter build apk --release` rồi đọc manifest đã merge (`build/app/intermediates/packaged_manifests/release/.../AndroidManifest.xml`):

```
android:name="android.permission.ACCESS_NETWORK_STATE"
android:name="android.permission.WAKE_LOCK"
```

Không có `android.permission.INTERNET`. Nó chỉ được khai trong `android/app/src/debug/AndroidManifest.xml` — file đó **chỉ merge vào build debug**, kèm sẵn comment giải thích rằng nó ở đó cho Flutter tooling. Không plugin nào trong dependency hiện tại khai `INTERNET` để merge hộ (chỉ `amplitude_flutter`, `firebase_analytics`, `google_mobile_ads` có khai, và không cái nào được dùng).

**Hệ quả:** bản release không gọi được bất kỳ API nào — login hỏng ngay từ request đầu. Chưa ai phát hiện vì từ trước tới nay chỉ cài bản debug lên máy (bản debug được merge `INTERNET` từ manifest debug).

**Sửa** — thêm vào `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

Đây là **prerequisite của feature-36**, không phải một phần của nó: feature này toàn bộ xoay quanh việc tải một file qua mạng trên bản release. Nhưng nó cũng độc lập nghiêm trọng hơn nhiều so với feature-36, nên có thể tách ra sửa và phát hành ngay.

---

## 3. Phân tích hiện trạng

### 3.1 Những mảnh đã có sẵn

| Mảnh | Trạng thái |
|---|---|
| `pubspec.yaml` `version: 1.0.0+1` | Nguồn sự thật duy nhất. `android/app/build.gradle.kts` lấy `versionCode = flutter.versionCode`, `ios/Runner/Info.plist` lấy `CFBundleVersion = $(FLUTTER_BUILD_NUMBER)`. **Cùng một con số cho cả hai nền tảng.** |
| `DeviceService.getMeta()` | Đã tính `appVersion: '${packageInfo.version}+${packageInfo.buildNumber}'` |
| `MobileLoginSerializer.app_version` | Đã nhận và lưu vào `MobileDevice.app_version` mỗi lần login |
| `LocalFirstSupabaseStorage` | `FileField` tự upload lên Supabase, `.url()` trả presigned URL hạn 1h (`SUPABASE_URL_EXPIRY`) |
| `dio`, `crypto`, `hive_flutter` | Đã là dependency — đủ để tải, verify hash, và nhớ lần kiểm tra cuối |
| Bundle id / applicationId | `pro.huyenhoc.app` trên **cả hai** nền tảng |
| `_FengShuiAppState` | Đã `implements WidgetsBindingObserver` với `didChangeAppLifecycleState` — sẵn hook cho resume |

Nói cách khác: backend đã *nhận* được phiên bản của mọi client từ feature-34, chỉ chưa *làm gì* với nó.

### 3.2 Ràng buộc từ mô hình phân phối

Feature-34 §4.5 chốt: Android APK tự ký, iOS ad-hoc. Bốn quy tắc D1–D4 vẫn ràng buộc feature này:

- **D1/D3** — APK server phát phải ký bằng **đúng keystore hiện tại**. Ký khác key thì Android từ chối cài đè, và nếu user gỡ đi cài lại thì `ANDROID_ID` đổi → toàn bộ rơi vào S3, phải cấp lại mã ghép cặp hàng loạt. Đây là rủi ro vận hành lớn nhất của feature này.
- **D2** — iOS giữ nguyên bundle id, nếu không `device_id` trong keychain mất.
- Ad-hoc chỉ cài được lên máy đã đăng ký UDID (trần 100 máy/năm). OTA không phá được giới hạn này — nó chỉ bỏ được bước "gửi file IPA qua AirDrop/email".

### 3.3 Yêu cầu

- **R1** — Admin publish một bản mới bằng thao tác upload + điền form, không cần deploy code.
- **R2** — App biết có bản mới trong vòng một lần mở app.
- **R3** — Server tuyên bố được ngưỡng client tối thiểu (đổi API contract, vá lỗi bảo mật). Cưỡng chế nằm ở client — xem §6.3 để biết chính xác điều này bảo đảm được gì và không bảo đảm được gì.
- **R4** — Không bao giờ để user kẹt: đã chặn thì phải luôn có đường tải bản mới ngay tại màn hình chặn.
- **R5** — File tải về phải verify được toàn vẹn trước khi cài.

### 3.4 Phạm vi

**Trong phạm vi**: model + admin + 2 endpoint; kiểm tra lúc mở app/resume kèm verdict dính; màn hình cập nhật trên Flutter; Android download + install; iOS OTA `itms-services`.

**Ngoài phạm vi**: cài im lặng (không thể — xem §7.3); delta/patch update; phân phối theo nhóm (staged rollout); web frontend (không đụng).

---

## 4. Quyết định thiết kế

### 4.1 So sánh bằng `versionCode` (int), không bằng chuỗi semver

`app_version` hiện là chuỗi `"1.0.0+1"`. So sánh chuỗi là sai (`"1.10.0" < "1.9.0"`), và tự viết bộ so semver là thừa.

**Chọn: `version_code` (số nguyên tăng dần) là đơn vị so sánh duy nhất.** `version_name` chỉ để hiển thị.

Lý do nó đúng chứ không chỉ tiện:
- Đây chính là `versionCode` của Android và `CFBundleVersion` của iOS — cả hai đã là số nguyên đơn điệu do nền tảng định nghĩa.
- Cả hai đều sinh ra từ **cùng một** con số sau dấu `+` trong `pubspec.yaml`, nên không có chuyện hai nền tảng lệch nhau.
- Android **tự** từ chối cài APK có `versionCode` thấp hơn bản đang cài. Chính sách của ta khớp với hành vi hệ điều hành thay vì đánh nhau với nó.

**Parse phía client phải phòng thủ.** `PackageInfo.buildNumber` là `String`. Nếu `int.tryParse` trả `null` (build cấu hình sai, hoặc bản cũ nào đó), quy tắc là **bỏ qua việc chặn, chỉ nhắc**. Không xác định được phiên bản mà lại chặn thì sẽ khoá toàn bộ user ra ngoài app vì một lỗi parse — hướng sai an toàn hơn nhiều là cho vào.

### 4.2 Một trường cho cả hai mức, không phải hai cờ

Phương án đầu tiên là có `is_mandatory` (bản này bắt buộc) **và** `min_supported_version_code`. Hai thứ đó chồng nhau và sẽ mâu thuẫn được.

**Chọn: chỉ `min_supported_version_code` trên chính bản phát hành.** Verdict suy ra hoàn toàn từ đó:

```
client_code < min_supported_version_code   → BLOCKED     (màn hình chặn, không tắt được)
client_code < version_code                 → AVAILABLE   (nhắc, bỏ qua được)
còn lại                                    → UP_TO_DATE
```

Muốn một bản là bắt buộc thì đặt `min_supported_version_code = version_code`. Một trường, không có trạng thái dư.

**Ràng buộc bắt buộc phải có:** `min_supported_version_code <= version_code`, cưỡng chế bằng `CheckConstraint`. Nếu đặt ngược, mọi client kể cả bản mới nhất đều `BLOCKED` và **không có bản nào để cập nhật lên** — cả tập user bị khoá cứng, chỉ cứu được bằng cách sửa DB. Đây là cách hỏng đắt nhất của feature này nên phải chặn ở tầng schema, không phải ở tầng form.

### 4.3 iOS: sinh `manifest.plist` động, không lưu tĩnh

OTA của iOS cần một `manifest.plist` trên HTTPS, bên trong có URL trỏ tới file IPA. Nếu sinh plist tĩnh lúc upload và nhét presigned URL vào, **plist chết sau 1 giờ** (`SUPABASE_URL_EXPIRY`).

**Chọn: một endpoint Django render plist mỗi lần được gọi**, ký URL IPA tươi ngay tại thời điểm đó. `itms-services://` thì trỏ vào endpoint cố định của mình. Hết vấn đề hạn dùng, và không phải lưu thêm file nào.

### 4.4 Endpoint kiểm tra phiên bản để `AllowAny`

Có vẻ ngược, nhưng bắt buộc: app kiểm tra phiên bản **trước khi user đăng nhập**, lúc vừa mở app (§7.5), nên chưa có token nào để gửi kèm. Đòi auth là màn hình chặn không bao giờ lấy được link tải — vi phạm thẳng R4.

Response không chứa dữ liệu người dùng. Cái lộ ra là link tải APK/IPA — và đó không phải bí mật đáng bảo vệ: APK chỉ là client rỗng, toàn bộ nội dung vẫn nằm sau auth và sau DRM; còn IPA thì chỉ cài được lên máy đã có UDID trong provisioning profile. Xem thêm §9 và câu hỏi 2 §11.

---

## 5. Database (PostgreSQL)

Một bảng mới trong app `core` (nơi đã chứa tiện ích vận hành như backup).

```python
class AppRelease(BaseModel):
    """
    One published build of the mobile app (feature-36 §5).

    version_code is the only value compared: it is the buildNumber from
    pubspec.yaml, which becomes Android versionCode and iOS CFBundleVersion, so
    both platforms are already numbering from the same source.
    """
    PLATFORM_CHOICES = [('ANDROID', 'Android'), ('IOS', 'iOS')]

    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)
    version_code = models.PositiveIntegerField()
    version_name = models.CharField(max_length=32)

    # Clients below this are refused a session and shown a screen they cannot
    # dismiss. Equal to version_code makes this release mandatory.
    min_supported_version_code = models.PositiveIntegerField(default=0)

    file = models.FileField(upload_to='releases/')
    file_size = models.BigIntegerField(default=0)
    sha256 = models.CharField(max_length=64, blank=True)

    release_notes = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'App Release'
        ordering = ['platform', '-version_code']
        constraints = [
            models.UniqueConstraint(
                fields=['platform', 'version_code'],
                name='uniq_app_release_version_per_platform',
            ),
            # A floor above the ceiling would block every client with nothing to
            # upgrade to — recoverable only by editing the database.
            models.CheckConstraint(
                condition=models.Q(min_supported_version_code__lte=models.F('version_code')),
                name='app_release_floor_below_ceiling',
            ),
        ]
        indexes = [
            models.Index(fields=['platform', 'is_published', '-version_code'],
                         name='idx_apprelease_lookup'),
        ]
```

**Migration**: một migration schema, không có data migration. Rollback = `migrate core <prev>`, không mất dữ liệu nào đang dùng.

### 5.1 Lùi một bản phát hành hỏng — ràng buộc phản trực giác nhất của feature này

Publish bản 12, phát hiện lỗi nặng. Bỏ `is_published` **không cứu được ai đã cập nhật**: endpoint quay về trả bản 11, nhưng Android từ chối cài `versionCode` thấp hơn bản đang có, nên máy đã lên 12 vẫn ở 12. iOS cũng vậy.

| Việc | Tác dụng thật |
|---|---|
| Bỏ `is_published` của bản 12 | Chặn **người chưa cập nhật**. Không đụng tới người đã cập nhật. |
| Hạ `min_supported_version_code` | Gỡ màn hình chặn, nếu bản hỏng đang chặn nhầm ai đó. |
| **Build bản 13 mang code của bản 11** | **Đường ra duy nhất** cho máy đã lên 12. |

Hai quy tắc rút ra, phải tuân thủ tuyệt đối:

- **Không bao giờ tái sử dụng một `version_code` đã publish.** Sửa lỗi thì tăng số, không sửa tại chỗ. `UniqueConstraint(platform, version_code)` cưỡng chế phần này ở tầng DB, nhưng thói quen mới là thứ giữ cho nó không bị lách bằng cách xoá row rồi tạo lại.
- **Bản hỏng vẫn giữ trong bảng, chỉ bỏ publish.** Xoá row là mất luôn dấu vết bản nào đã ra ngoài kia.

**Bản "hiện hành"** của một nền tảng = row `is_published=True` có `version_code` lớn nhất. Không có cờ `is_current` riêng — một cờ như vậy sẽ cần cưỡng chế "chỉ một true mỗi platform", trong khi `max(version_code)` đã cho kết quả tương đương mà không thêm trạng thái.

---

## 6. Backend (Django)

### 6.1 `GET /api/app/version/`

```
GET /api/app/version/?platform=android&version_code=7
```

`AllowAny` (§4.4). `version_code` tuỳ chọn — thiếu thì server bỏ trống `update_status` và client tự so.

```json
{
  "platform": "ANDROID",
  "version_code": 12,
  "version_name": "1.2.0",
  "min_supported_version_code": 8,
  "update_status": "BLOCKED",
  "release_notes": "Sửa lỗi phát video HLS...",
  "download_url": "https://<supabase>/releases/huyenhoc-12.apk?X-Amz-...",
  "file_size": 61865984,
  "sha256": "9f2b...",
  "install_hint": null
}
```

- **Android** — `download_url` là presigned URL của APK.
- **iOS** — `download_url` là `itms-services://?action=download-manifest&url=<HTTPS URL của §6.2>`, và `sha256`/`file_size` để `null` (app không tự tải, hệ điều hành tải).

`update_status` do **server** tính chứ không để client tự suy: chính sách nằm một chỗ, và server có cơ hội log phiên bản nào đang ngoài kia. Client vẫn nhận đủ ba con số để tự quyết nếu response thiếu trường.

Không có bản published nào cho nền tảng đó → `204 No Content`. App coi như `UP_TO_DATE`. Đây là trạng thái hôm nay (bảng rỗng), nên bật feature lên không làm phiền ai.

`platform` thiếu hoặc không thuộc `{android, ios}` → `400` với `{'detail': 'platform không hợp lệ.'}`. `version_code` không parse được số → bỏ qua, coi như không truyền (§4.1: không xác định được thì không chặn).

**Một chỗ parse duy nhất.** Endpoint nhận `?version_code=` dạng int, còn `MobileDevice.app_version` lưu dạng `"1.0.0+7"` và `version_spread()` (§6.4) phải đọc được nó. Cùng một khái niệm nên cùng một helper trong `core/services/app_version.py`:

```python
def parse_version_code(raw) -> int | None:
    """Pull the build number out of either form the clients send.

    Returns None when it cannot be determined; every caller must then skip
    enforcement rather than guess (feature-36 §4.1).
    """
```

### 6.2 `GET /api/app/ios/manifest.plist`

`AllowAny`, `Content-Type: text/xml`. iOS tự gọi endpoint này — **không phải app gọi**, nên không thể gắn header `Authorization`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict><key>items</key><array><dict>
  <key>assets</key><array><dict>
    <key>kind</key><string>software-package</string>
    <key>url</key><string>{{ ipa_url }}</string>
  </dict></array>
  <key>metadata</key><dict>
    <key>bundle-identifier</key><string>pro.huyenhoc.app</string>
    <key>bundle-version</key><string>{{ version_name }}</string>
    <key>kind</key><string>software</string>
    <key>title</key><string>Huyền Học</string>
  </dict>
</dict></array></dict></plist>
```

`{{ ipa_url }}` ký lại mỗi request (§4.3). Bundle id lấy đúng `pro.huyenhoc.app` như trong `Runner.xcodeproj` — **sai bundle id thì iOS cài xong ra một app thứ hai** thay vì cập nhật app cũ, và D2 vỡ.

> **Phải kiểm chứng trên máy thật:** iOS yêu cầu URL trong plist là HTTPS có cert hợp lệ, và một số phiên bản iOS chỉ chấp nhận `itms-services://` khi mở từ Safari. Nếu `url_launcher` không mở được trực tiếp, phương án dự phòng là mở một trang web nhỏ có sẵn nút, cũng do backend render.

### 6.3 Không chặn ở login — chỉ kiểm lúc mở app

Bản v1 của doc gắn thêm một cổng vào `MobileLoginSerializer.validate()`, trả `400 APP_UPDATE_REQUIRED` khi `app_version` dưới ngưỡng. **Bỏ.** Toàn bộ việc kiểm tra dồn về một chỗ: sự kiện mở app (§7.5).

Lý do bỏ: login không phải chỗ của việc này. `MobileLoginSerializer` đã gánh xác thực, ghép cặp thiết bị, kiểm hạn mức và cấp token; thêm chính sách phiên bản vào đó là buộc một serializer vốn đã đông việc phải biết thêm về bảng `AppRelease`. Và về mặt user, bị chặn *sau khi* gõ xong email + mật khẩu thì tệ hơn hẳn bị chặn ngay lúc mở app, trước khi kịp gõ gì.

**Cái mất:** `min_supported_version_code` không còn được server cưỡng chế. Nó trở thành quy tắc do client tự thi hành — một client không chạy được bước kiểm tra (mất mạng, request lỗi, APK bị sửa) vẫn đăng nhập được bình thường. R3 xuống thành *best-effort*.

**Bù lại bằng verdict dính** (§7.5): verdict gần nhất được lưu local; kiểm tra thất bại thì app **giữ nguyên verdict cũ** thay vì mặc định cho qua. Nghĩa là đã một lần bị `BLOCKED` thì tắt mạng cũng không thoát ra được. Cách này chặn được tình huống thật sự cần lo — user vô tình offline — và không chặn được kẻ cố tình sửa APK, mà kẻ đó thì server-side gate cũng chỉ chặn được đúng một request.

Muốn khôi phục cổng server sau này thì rẻ: `enforce_min_app_version()` gọi ngay sau `authenticate_user()`, khoảng mười dòng. Ghi vào backlog §11.

### 6.4 Admin

`AppReleaseAdmin` với `list_display = (platform, version_code, version_name, min_supported_version_code, is_published, created_at)`.

`sha256` và `file_size` **tính lúc save**, không cho nhập tay — nhập tay là mời gọi sai. Đọc file theo chunk để không nạp 60MB vào RAM.

`clean()` chặn ba thứ form-level (schema đã chặn cái nguy hiểm nhất ở §4.2):

1. Publish một `version_code` thấp hơn bản đang published của cùng nền tảng → Android sẽ từ chối cài, publish chỉ tạo nhầm lẫn.
2. File Android không kết thúc bằng `.apk`, file iOS không `.ipa`.
3. `is_published=True` mà chưa có file.

#### Phân bố phiên bản đang chạy — điều kiện để đặt ngưỡng chặn cho an toàn

Đặt `min_supported_version_code` mà không biết ngoài kia đang chạy bản nào là khoá user một cách mù, và chỉ biết khi họ gọi điện. Dữ liệu **đã có sẵn**: `MobileDevice.app_version` được `apply_handset_metadata()` ghi lại ở **mọi** lần login, cả đường claim lẫn đường rebind, nên nó luôn tươi.

Hai việc nhỏ, dùng dữ liệu có sẵn, không thêm bảng:

1. `MobileDeviceAdmin` thêm `app_version` vào `list_display` và `list_filter` — tra nhanh "còn ai ở bản cũ".
2. Form `AppRelease` hiện một bảng đếm ngay cạnh ô `min_supported_version_code`:

```python
def version_spread(platform):
    """How many live handsets sit on each app_version, newest first.

    Reads MobileDevice.app_version, which every login refreshes, so this is the
    only view an admin has of what raising the floor would actually cut off.
    """
    return (MobileDevice.objects
            .filter(status='ACTIVE', device_type=platform)
            .values('app_version')
            .annotate(handsets=Count('id'))
            .order_by('-app_version'))
```

Hiển thị dạng `1.0.0+1 — 12 máy / 1.1.0+4 — 37 máy`. Admin nhìn một cái là biết nâng ngưỡng lên 4 thì cắt mất 12 máy.

**Kiểm tra chữ ký APK — không tự động hoá.** Cám dỗ là verify signing cert của APK vừa upload để cưỡng chế D1/D3. Bỏ, vì phải thêm `apksigner`/JDK vào image chỉ để làm một việc mà Android đã tự làm ở phía máy user (từ chối cài đè khi khác key). Thay vào đó ghi cảnh báo ngay trên form. Xem câu hỏi 3 §11.

---

## 7. Mobile (Flutter)

### 7.1 Android — manifest

```xml
<uses-permission android:name="android.permission.INTERNET"/>            <!-- §2 -->
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>
```

`REQUEST_INSTALL_PACKAGES` bị Google Play hạn chế gắt, nhưng ta **không phát hành qua Play** nên không vướng chính sách đó. (Nếu sau này lên Play theo D4, đây là một trong những thứ phải gỡ.)

Thêm `FileProvider` — từ Android 7 mà đưa `file://` URI cho app khác thì `FileUriExposedException`:

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data android:name="android.support.FILE_PROVIDER_PATHS"
               android:resource="@xml/file_paths"/>
</provider>
```

`res/xml/file_paths.xml` khai `<cache-path name="apk" path="."/>` — khớp với `getTemporaryDirectory()` của `path_provider` (trên Android chính là `cacheDir`).

### 7.2 Tải và verify

`dio` đã có sẵn `download()` với `onReceiveProgress` → thanh tiến trình. Tải xong tính SHA-256 bằng `crypto` (đã có) **theo stream**, không đọc cả 60MB vào bộ nhớ:

```dart
final digest = await file.openRead().transform(sha256).first;
if (digest.toString() != expected) { /* xoá file, báo lỗi, không cài */ }
```

**sha256 ở đây bảo vệ cái gì.** Nó bắt được file tải hỏng/đứt giữa chừng, và bắt được trường hợp file trên bucket bị thay mà DB không đổi. Nó **không** phải bằng chứng xác thực: app lấy cả hash lẫn file từ cùng một server, server bị chiếm thì cả hai cùng đổi. Bằng chứng xác thực thật trên Android là **chữ ký APK** — hệ điều hành từ chối cài đè bản ký bằng key khác (D1/D3). Ghi rõ để không ai nhầm sha256 là lớp bảo mật chính.

**URL tải có hạn 1 giờ.** APK 59MB trên mạng yếu hoàn toàn có thể vượt mốc đó. Khi tải hỏng, **không retry cùng URL** — gọi lại `/api/app/version/` lấy URL mới rồi thử lại. Retry một presigned URL đã hết hạn thì lần nào cũng hỏng, và thông báo lỗi sẽ đổ oan cho mạng của user.

Dependency mới cần thêm: `path_provider` (khai tường minh, hiện chỉ có gián tiếp), `url_launcher` (cho iOS §7.4).

### 7.3 Gọi trình cài đặt — và giới hạn không vượt qua được

**Không có cài im lặng.** Cài ngầm cần app là device owner hoặc app hệ thống. Với APK tự phát hành thì luồng bắt buộc là:

1. App kiểm `packageManager.canRequestPackageInstalls()`.
2. Chưa được cấp → mở `Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES` cho user bật "Cho phép từ nguồn này". **Chỉ cần làm một lần.**
3. `Intent.ACTION_VIEW` với `FileProvider` URI, mime `application/vnd.android.package-archive`, kèm `FLAG_GRANT_READ_URI_PERMISSION`.
4. User bấm "Cài đặt" trên hộp thoại hệ thống.

Nghĩa là "tự động cập nhật" thực tế là **tự động tải + mở sẵn hộp thoại cài**. Nói rõ trong UI để user không tưởng app treo.

Dùng **MethodChannel tự viết** (~40 dòng Kotlin) thay vì thêm package OTA của bên thứ ba: chỉ cần đúng hai lệnh gọi (`canRequestPackageInstalls`, bắn intent), trong khi các package OTA còn kéo theo cả tầng download riêng trùng với `dio` đang dùng.

### 7.4 iOS

Không tải, không verify hash — hệ điều hành làm hết. App chỉ mở:

```dart
launchUrl(Uri.parse(downloadUrl), mode: LaunchMode.externalApplication);
```

với `downloadUrl` là `itms-services://...` do §6.1 trả về. iOS hiện hộp thoại "…muốn cài đặt Huyền Học", cài xong đè lên app cũ (cùng bundle id → D2 giữ nguyên, `device_id` trong keychain sống).

#### ⚠️ Cập nhật iOS có thể làm hỏng một app đang chạy tốt

IPA ad-hoc **nhúng danh sách UDID tại thời điểm build**. User được onboard *sau* khi bản IPA mới nhất được build sẽ không có UDID trong đó. Máy họ đang chạy app bình thường (cài từ bản IPA cũ có UDID của họ), nhưng cài bản mới lên là app **ngừng dùng được**.

Cập nhật làm mọi thứ tệ đi là kịch bản tệ nhất có thể, và nó vi phạm thẳng R4. Hai quy tắc bắt buộc:

- **O1 — Mỗi lần build IPA phải export lại provisioning profile với danh sách UDID hiện hành**, không dùng lại profile cũ. Đây là bước thủ công, phải nằm trong checklist phát hành iOS.
- **O2 — `min_supported_version_code` của iOS để `0`** cho tới khi O1 thành thói quen có kiểm chứng. Nghĩa là iOS chỉ *nhắc*, không *chặn*. Android không dính vấn đề này nên chặn được ngay.

Ngoài ra, máy chưa từng có UDID trong bất kỳ profile nào thì cài xong cũng không mở được — đó là giới hạn của ad-hoc, không phải lỗi của luồng này.

### 7.5 Kiểm tra lúc nào

Chỉ một nguồn kích hoạt: **vòng đời app**. Không móc vào login (§6.3).

- **Lúc mở app**, sau `configureDependencies()`, **không chặn** `runApp()` — mạng chậm không được làm app đứng ở màn hình trắng. Gọi bất đồng bộ, có kết quả thì mới hiện.
- **Lúc resume**, tận dụng `didChangeAppLifecycleState` đã có sẵn trong `_FengShuiAppState`, nhưng **chỉ khi đã quá 6 giờ** kể từ lần kiểm cuối. Không có tiết chế này thì mỗi lần chuyển app là một request.

#### Verdict dính — điều kiện để bỏ được cổng ở login

Vì đây giờ là chỗ kiểm duy nhất, kết quả kiểm phải **sống sót qua một lần gọi hỏng**. Lưu verdict gần nhất trong Hive cùng box với mốc 6 giờ và bản ghi skip (§7.7):

```dart
/// The last verdict the server gave, kept so a failed check cannot silently
/// downgrade a BLOCKED client back to usable. Without this, turning off the
/// network would be enough to walk past the block (feature-36 §6.3).
class LastVerdict {
  final int minSupportedVersionCode;
  final int latestVersionCode;
  final DateTime at;
}
```

Quy tắc khi kiểm tra thất bại:

| Verdict đã lưu | Hành vi |
|---|---|
| `BLOCKED` | **Vẫn chặn.** Màn chặn hiện, kèm nút thử lại. |
| `AVAILABLE` / `UP_TO_DATE` | Cho dùng bình thường, im lặng. |
| Chưa có gì | Cho dùng bình thường — lần cài đầu, chưa từng nói chuyện với server. |

Verdict chỉ được **nới ra** bởi một response thành công. Không có đường nào để một lỗi mạng biến `BLOCKED` thành cho qua.

### 7.6 Hai màn hình

| | Nhắc (`AVAILABLE`) | Chặn (`BLOCKED`) |
|---|---|---|
| Dạng | Dialog | Route toàn màn, chặn `back` |
| Nút | "Cập nhật" + "Bỏ qua" | Chỉ "Cập nhật" |
| Bỏ qua | Được — im hẳn với **bản đó**, xem §7.7 | Không |
| Nội dung | `version_name` + `release_notes` | Thêm câu giải thích vì sao buộc phải cập nhật |

### 7.7 "Bỏ qua" ghi nhớ theo phiên bản, không theo thời gian

Phương án đầu là hoãn theo thời gian (im 24 giờ). Bỏ, vì nó hỏi lại **cùng một bản** mỗi ngày cho tới khi user chịu thua — phiền mà không thuyết phục thêm được ai. Bấm "Bỏ qua" nghĩa là "tôi đã xem bản này và không muốn", nên thứ cần nhớ là **bản nào bị bỏ qua**, không phải bỏ qua lúc mấy giờ.

Lưu trong Hive, cùng box với mốc kiểm tra 6 giờ ở §7.5:

```dart
/// Skips are keyed by version_code, not by time: a time-based snooze re-asks
/// about the same build every day, which nags without persuading. Count and
/// timestamp are kept so a later release can escalate on repeat skippers
/// without another schema change.
class SkipRecord {
  final int versionCode;
  final int count;          // tăng nếu user bỏ qua lại sau khi app hỏi lại
  final DateTime lastAt;
}
```

Quy tắc hiện dialog nhắc:

```
BLOCKED                              → luôn hiện, không có nút Bỏ qua
AVAILABLE và version_code đã bị skip → không hiện
AVAILABLE, chưa skip                 → hiện
```

Ba hệ quả cần biết trước:

- **User có thể ngồi mãi ở bản cũ.** Đó là chủ ý: đường ép nằm ở `min_supported_version_code` (§4.2), không nằm ở việc làm phiền. Cần ép thì publish với ngưỡng chặn, dialog nhắc không phải chỗ để gây áp lực.
- **Bản ghi là local, mất khi gỡ app hoặc xoá dữ liệu.** Chấp nhận — mất thì cùng lắm hỏi lại một lần.
- **Chỉ giữ bản ghi của các `version_code` ≥ bản đang cài.** Dọn các bản cũ hơn mỗi lần kiểm tra, nếu không box sẽ phình theo từng lần phát hành.

Không gửi lịch sử skip lên server ở v1. Số liệu đó chỉ hữu ích khi muốn biết "bao nhiêu người đang từ chối", mà câu hỏi đó đã trả lời được bằng `version_spread()` ở §6.4 — dữ liệu thật (ai đang chạy bản nào) tốt hơn dữ liệu ý định (ai bấm bỏ qua).

Trạng thái trong lúc tải: tiến trình %, và **lỗi phải nói rõ làm gì tiếp** — mất mạng thì cho thử lại, sai hash thì tải lại, thiếu quyền cài thì có nút mở thẳng màn hình cài đặt.

---

## 8. Bảo mật

| Rủi ro | Xử lý |
|---|---|
| Cài phải APK giả | Android từ chối APK ký khác key với bản đang cài (D1/D3). sha256 chỉ bắt lỗi toàn vẹn — §7.2. |
| Link tải công khai | APK/IPA không chứa bí mật; nội dung nằm sau auth + DRM. IPA còn bị chặn thêm bởi UDID. Xem câu hỏi 2 §11. |
| Cấu hình sai khoá cả tập user | `CheckConstraint` ở §4.2 chặn `min > version_code` ngay tại schema. |
| Parse phiên bản lỗi → chặn nhầm | Không parse được thì **không chặn** (§4.1, §6.3). |
| `REQUEST_INSTALL_PACKAGES` bị lạm dụng | Chỉ bắn intent với file app tự tải về cache của chính nó, đã verify hash. |
| Endpoint version bị spam | Trả JSON tĩnh, rẻ. Thêm throttle scope riêng nếu cần — xem câu hỏi 4. |

---

## 9. Test plan

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| T36-1 | Chưa có release nào cho platform | `204`, app coi như UP_TO_DATE |
| T36-2 | `version_code=7`, published 12, min 8 | `update_status='BLOCKED'` |
| T36-3 | `version_code=9`, published 12, min 8 | `AVAILABLE` |
| T36-4 | `version_code=12`, published 12 | `UP_TO_DATE` |
| T36-5 | Không truyền `version_code` | 200, `update_status=None`, vẫn đủ ba con số |
| T36-6 | Chỉ lấy bản `is_published=True`, `version_code` lớn nhất | Bản nháp và bản cũ bị bỏ qua |
| T36-7 | `min_supported > version_code` | `IntegrityError` từ `CheckConstraint` |
| T36-8 | `(platform, version_code)` trùng | `IntegrityError` |
| T36-9 | Login với `app_version='1.0.0+7'` khi min là 8 | **200** — login không còn kiểm phiên bản (§6.3) |
| T36-10 | `MobileLoginSerializer` sau thay đổi | Không import gì từ `AppRelease`; test hồi quy feature-34/35 vẫn xanh |
| T36-11 | Kiểm tra thất bại, verdict đã lưu là `BLOCKED` | App **vẫn chặn** |
| T36-12 | Endpoint version không cần auth | 200 khi không gửi `Authorization` |
| T36-13 | Admin upload APK | `sha256` và `file_size` tự tính đúng |
| T36-14 | Admin publish `version_code` thấp hơn bản published | `ValidationError` trên form |
| T36-15 | `manifest.plist` cho iOS | `Content-Type` xml, đúng bundle id, `url` là https |
| T36-16 | iOS response | `download_url` bắt đầu bằng `itms-services://` |
| T36-17 | `parse_version_code` với `'1.0.0+7'`, `'7'`, `''`, `'abc'`, `None` | `7`, `7`, `None`, `None`, `None` |
| T36-18 | `platform` thiếu / không hợp lệ | `400` |
| T36-19 | Bỏ `is_published` của bản mới nhất | Endpoint quay về trả bản published kế trước (§5.1) |
| T36-20 | `version_spread()` | Đếm đúng số máy theo từng `app_version`, chỉ tính `status='ACTIVE'` |
| T36-21 | Bỏ qua bản 12, mở lại app | Dialog **không** hiện |
| T36-22 | Bỏ qua bản 12, server publish bản 13 | Dialog hiện lại |
| T36-23 | Bỏ qua bản 12, sau đó bản 12 thành `BLOCKED` | Màn chặn vẫn hiện — skip không thắng được ngưỡng chặn |
| T36-24 | Dọn bản ghi skip cũ hơn bản đang cài | Box không phình sau nhiều lần phát hành |
| T36-25 | Kiểm tra thất bại, verdict đã lưu là `AVAILABLE` | Cho dùng bình thường, không hiện gì |
| T36-26 | Cài lần đầu, chưa có verdict, kiểm tra thất bại | Cho dùng bình thường |
| T36-27 | Đang `BLOCKED`, server hạ `min_supported` | Response thành công nới verdict ra, app dùng được lại |

Luồng tải + cài trên Android và OTA iOS **phải test tay trên máy thật** — không mock được trình cài đặt hệ thống.

---

## 10. Files thay đổi

| File | Thay đổi |
|---|---|
| `src/mobile/android/app/src/main/AndroidManifest.xml` | **§2 prerequisite** — `INTERNET`; thêm `REQUEST_INSTALL_PACKAGES` + `FileProvider` |
| `src/mobile/android/app/src/main/res/xml/file_paths.xml` | Mới |
| `src/mobile/android/app/src/main/kotlin/.../MainActivity.kt` | MethodChannel gọi trình cài đặt |
| `src/backend/core/models.py` | `AppRelease` |
| `src/backend/core/migrations/00XX_app_release.py` | Mới, schema |
| `src/backend/core/admin.py` | `AppReleaseAdmin` |
| `src/backend/core/serializers.py`, `views_app.py`, `urls_app.py` | Mới — 2 endpoint |
| `src/backend/templates/app/manifest.plist` | Mới |
| `src/backend/config/urls.py` | `path('api/app/', include('core.urls_app'))` |
| `src/backend/core/services/app_version.py` | `parse_version_code()` — dùng bởi endpoint §6.1 |
| `src/backend/users/admin.py` | `MobileDeviceAdmin`: `app_version` vào `list_display` + `list_filter` (C3) |
| `src/backend/core/services/version_spread.py` | Đếm số máy theo `app_version`, hiện trên form `AppRelease` (C3) |
| `src/backend/core/tests/test_app_release.py` | T36-1…T36-20 |
| `src/mobile/lib/features/update/...` | Service, cubit, 2 màn hình |
| `src/mobile/pubspec.yaml` | `path_provider`, `url_launcher` |

---

## 11. Quyết định của PO (Stage 2, 2026-08-30)

Doc đã qua PO review. Kết luận: **Approve with minor fixes** — C1–C3 và S1–S4 đã áp dụng.

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | §2 — tách hotfix `INTERNET` | ✅ **Tách, ưu tiên cao nhất.** Đây không phải một phần của feature-36 mà là "app release chưa từng chạy được". Sửa và phát hành độc lập, không chờ. |
| 2 | §4.4 — endpoint `AllowAny` | ✅ **Giữ `AllowAny`, không thêm token.** Đòi auth là tạo thế kẹt (R4). APK không chứa bí mật; IPA còn bị chặn bởi UDID. |
| 3 | §6.4 — verify chữ ký APK lúc upload | ❌ **Không.** Android đã tự từ chối ở phía user; thêm JDK/`apksigner` vào image backend chỉ để làm lại việc OS đã làm. Ghi cảnh báo trên form là đủ. |
| 4 | §7.5 — nhịp kiểm tra 6 giờ | ✅ **Giữ.** Cộng với cổng chặn ở login thì độ trễ đã đủ ngắn. |
| 5 | iOS cùng đợt với Android | 🟡 **Giữ iOS trong phạm vi, nhưng `min_supported_version_code` của iOS để `0`** cho tới khi quy trình UDID (O1, §7.4) thành thói quen có kiểm chứng. iOS chỉ *nhắc*, không *chặn*. |

### Điểm đã sửa theo review

| Mã | Nội dung | Chỗ sửa |
|---|---|---|
| C1 | Thiếu kế hoạch lùi một bản phát hành hỏng — bỏ `is_published` không cứu được ai đã cập nhật | §5.1 mới |
| C2 | iOS: cài bản mới có thể **làm hỏng** app đang chạy tốt nếu IPA build trước khi user được thêm UDID | §7.4 — quy tắc O1, O2 |
| C3 | Admin đặt ngưỡng chặn mà không biết ngoài kia chạy bản nào | §6.4 — `version_spread()` + `app_version` vào admin filter |
| S1 | Presigned URL 1h có thể chết giữa chừng khi tải 59MB | §7.2 — lấy URL mới rồi thử lại, không retry URL cũ |
| S2 | Hai đường parse phiên bản | §6.1 — gom về `parse_version_code()` |
| S3 | Thiếu mã lỗi cho `platform` sai | §6.1 |
| S4 | Mốc 24h chưa nói lưu ở đâu | §7.6 |

### Backlog (không làm ở feature này)

- Khôi phục cổng chặn phía server ở `mobile/login/` nếu R3 cần cưỡng chế thật (§6.3, ~10 dòng).
- Kiểm tra magic bytes `PK` của file upload (N1).
- Staged rollout theo nhóm user.
- Delta/patch update.
