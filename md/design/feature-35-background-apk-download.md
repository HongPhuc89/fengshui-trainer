# Feature 35 — Tải APK cập nhật chạy nền bằng Android Foreground Service

## Document Information
- **Feature**: Chuyển luồng tải APK cập nhật (feature-36/37) từ tải trong process app (Dio, bị Android kill khi app vào background/bị đóng) sang Android Foreground Service — tải tiếp tục khi user rời app, có notification tiến độ.
- **Status**: ❌ REVERTED (2026-09-01) — Foreground Service (`dataSync`) bị hệ điều hành tự dừng ("Stop FGS timeout") sau 6–13 giây kể từ `startForeground()`, tái hiện trên **3 thiết bị/emulator khác nhau**: Android 12 thật (crash cài do bug FileProvider, đã fix, nhưng sau đó lộ ra vấn đề timeout này ở lần test kỹ hơn), Android 15 emulator, Android 16 emulator — và quan trọng nhất, **Android 13 thật** (Samsung SM-N985F), loại trừ hoàn toàn giả thuyết "chỉ là quirk môi trường test/emulator". Đã thử: đo timing chính xác (`startForeground()` luôn hoàn thành <10ms, không phải do gọi trễ), set `data_sync_fgs_timeout_duration` tường minh về 6h, tắt hẳn compat flag `FGS_INTRODUCE_TIME_LIMITS` — timeout vẫn xảy ra. Không tìm ra nguyên nhân gốc trong thời gian hợp lý; quyết định **rollback toàn bộ Foreground Service**, quay về luồng `Dio()` tải trong Dart isolate (như trước feature-35), chỉ giữ lại cải thiện UX độc lập (`checkInstallPermission()` + `WidgetsBindingObserver`) và thêm cảnh báo "không đóng ứng dụng khi đang tải" để giảm nhẹ vấn đề gốc. Xem §9 "Quyết định rollback" để biết chi tiết đầy đủ.
- **Created**: 2026-09-01
- **Related**: `feature-36-app-version-update.md`, `feature-37-simplify-apk-update.md` (đã gộp vào `feature-34-mobile-device-app-consolidated.md` §3), và thay đổi vừa làm cùng đợt: APK release chuyển sang Bunny CDN (`core/models.py` `AppRelease.bunny_key`, `core/admin.py` `upload_bytes_to_bunny`) để tăng tốc độ tải — feature này giải quyết vấn đề **khác**: tải bị huỷ giữa chừng khi thoát app, không phải tốc độ.

---

## 1. Tóm tắt

User báo: tải APK cập nhật bị huỷ ("bị kill") khi thoát app giữa lúc đang tải. Nguyên nhân: `UpdateCubit._downloadAndInstall()` (`update_cubit.dart`) gọi `UpdateRepository.download()` — một `Dio().download()` chạy hoàn toàn trong tiến trình Dart của app. Android không có nghĩa vụ giữ tiến trình nền của một app thường (chưa khai Foreground Service) sống quá vài giây sau khi app rời foreground; hệ thống kill theo áp lực bộ nhớ hoặc theo policy Doze/App Standby, và toàn bộ isolate Dart (kể cả `Dio` request đang chạy) chết theo.

**Giải pháp**: chuyển việc tải file (không phải toàn bộ luồng update) sang một **Android Foreground Service** viết bằng Kotlin, chạy độc lập với `FlutterActivity`. Service hiện thông báo tiến độ tải (kiểu Android tự có sẵn cho download), tự tải bằng `HttpURLConnection`/`OkHttp` thuần Android, và báo kết quả về Dart qua `EventChannel` khi Flutter còn sống, hoặc broadcast + notification "Tải xong, bấm để cài" khi Flutter đã bị kill.

**Phạm vi**: chỉ Android. iOS dùng TestFlight (feature-37 §3.5), `UpdateCubit.check()` đã return sớm trên iOS — không đổi gì ở nhánh đó.

---

## 2. Phân tích

### 2.1 Luồng hiện tại và điểm gãy

```
UpdateCubit._downloadAndInstall()
  └─ Dio().download(url, path)          ← chạy trong Dart isolate của app
       └─ user thoát app / vuốt kill / OS kill vì thiếu RAM
            └─ isolate chết → download dừng giữa chừng, không resume
                 └─ user mở lại app → thấy lại "Tải xuống" từ đầu (0%)
```

Việc chuyển APK sang Bunny CDN (đã làm) giảm đáng kể *thời gian phơi nhiễm* (file tải nhanh hơn nên khoảng thời gian user có thể thoát app giữa chừng ngắn hơn), nhưng không loại bỏ được vấn đề — mạng chậm hoặc app bị OS kill ngay khi vào background vẫn xảy ra.

### 2.2 Yêu cầu

- **R1**: Tải APK tiếp tục chạy dù user rời app (background) hoặc vuốt kill app khỏi recents.
- **R2**: User thấy tiến độ tải qua notification hệ thống (khớp kỳ vọng chuẩn Android cho một download).
- **R3**: Khi tải xong, notification chuyển thành "Tải xong — bấm để cài", bấm vào mở thẳng system installer — không bắt buộc phải mở lại app trước.
- **R4**: Nếu Flutter còn đang mở app lúc tải xong, `UpdateCubit` vẫn nhận được tiến độ/kết quả để cập nhật UI trong app (không bắt buộc user phải ra ngoài xem notification).
- **R5**: Không tải lại từ đầu một cách vô ích — nếu file đã tải xong và sha256 khớp, dùng lại (hành vi này **đã có** ở `_downloadAndInstall`, giữ nguyên).
- **R6**: Không yêu cầu quyền mới ngoài mức cần thiết tối thiểu (notification permission trên Android 13+).

### 2.3 Ràng buộc kỹ thuật quan trọng — `foregroundServiceType` (Android 14+)

`flutter.targetSdkVersion` hiện tại theo Flutter 3.38.7 nhắm Android 15 (API 35). Từ Android 14 (API 34), **mọi** Foreground Service bắt buộc khai `android:foregroundServiceType` trong manifest, và hệ thống áp giới hạn theo từng loại. Loại phù hợp nhất cho việc tải file là **`dataSync`**:

| Type | Phù hợp? | Lý do |
|---|---|---|
| `dataSync` | ✅ Chọn | Đúng mô tả: "tải/đồng bộ dữ liệu app cần, không phải do user yêu cầu trực tiếp qua UI hệ thống" |
| `specialUse` | Cân nhắc dự phòng | Dùng nếu Google Play Console (không áp dụng — app tự phân phối) hoặc review sau này bắt bẻ `dataSync`; hiện chưa cần |

Android 14 giới hạn thời lượng chạy nền của `dataSync` service khi app ở background lâu (khoảng 6 giờ cộng dồn/ngày theo tài liệu Android) — với một file APK (~65MB qua Bunny CDN, tải xong trong vài phút ở mạng bình thường), giới hạn này không phải vấn đề thực tế.

### 2.4 Quyền cần thêm

| Quyền | Bắt buộc từ | Mục đích |
|---|---|---|
| `FOREGROUND_SERVICE` | Luôn cần khi dùng Foreground Service | Khai báo chạy Foreground Service |
| `FOREGROUND_SERVICE_DATA_SYNC` | Android 14 (API 34)+ | Đi kèm bắt buộc với `foregroundServiceType="dataSync"` |
| `POST_NOTIFICATIONS` | Android 13 (API 33)+ | Hiện notification tiến độ — phải **runtime request**, không tự động có |

`POST_NOTIFICATIONS` là quyền **runtime** (giống camera/location), khác các quyền hiện có của app (`INTERNET`, `REQUEST_INSTALL_PACKAGES` là install-time). Cần một bước xin quyền trước khi bắt đầu tải — xem §5.3.

---

## 3. Kiến trúc

### 3.1 Vì sao Service thuần Kotlin, không dùng package Flutter (`flutter_local_notifications`, `flutter_downloader`,...)

Cùng lý do đã ghi trong `installer.dart` cho `AndroidInstaller`: nhu cầu ở đây hẹp và cụ thể (1 service, 1 loại notification, tải 1 file), trong khi các package OTA/download phổ biến kéo theo dependency nặng, API tổng quát hơn mức cần, và **quan trọng nhất**: chúng vẫn chạy trong Dart isolate hoặc plugin registration gắn với `FlutterEngine` — không tự động giải quyết được việc "sống sót khi Activity/Engine bị huỷ" trừ khi bản thân chúng cũng dùng Foreground Service ở tầng native, auto ẩn dưới API. Viết trực tiếp bằng Kotlin cho ta kiểm soát đầy đủ vòng đời, và tái dùng được ngay `FileProvider` + luồng `installApk()` đã có trong `MainActivity.kt`.

### 3.2 Luồng end-to-end

```
UpdateCubit.startUpdate(info)
  └─ xin quyền POST_NOTIFICATIONS nếu Android 13+ và chưa cấp (§5.3)
       └─ gọi MethodChannel 'pro.huyenhoc.app/downloader' → startDownload(url, sha256, versionCode)
            └─ ApkDownloadService (Foreground Service) khởi động
                 ├─ startForeground() ngay lập tức với notification "Đang tải bản cập nhật… 0%"
                 ├─ Tải qua HttpURLConnection, ghi thẳng vào file trong getExternalFilesDir()
                 │    (không phải cache app Flutter — Service không phụ thuộc Flutter engine còn sống)
                 ├─ Mỗi lần nhận đủ ngưỡng byte (ví dụ mỗi 1%), update notification progress
                 │    VÀ gửi event qua EventChannel nếu có listener (app đang mở)
                 ├─ Verify sha256 khi tải xong
                 ├─ Thành công:
                 │    ├─ notification chuyển "Tải xong — bấm để cài", PendingIntent → installApk()
                 │    └─ gửi event 'completed' qua EventChannel nếu app đang mở
                 ├─ Thất bại (mạng đứt, sha256 sai):
                 │    ├─ notification "Tải thất bại — bấm để thử lại"
                 │    └─ gửi event 'failed' qua EventChannel nếu app đang mở
                 └─ stopForeground() + stopSelf() sau khi xong (thành công hay thất bại)
```

### 3.3 Vì sao EventChannel thay vì chỉ MethodChannel

`MethodChannel` là request/response một chiều theo lời gọi từ Dart. Tiến độ tải là một **stream** sự kiện phát từ native, không do Dart chủ động hỏi — đúng use case của `EventChannel` (`Stream<dynamic>` phía Dart). `UpdateCubit` subscribe stream này khi `startUpdate()` được gọi, và **phải xử lý được trường hợp Service đã tự chạy xong trước khi có listener** (app bị đóng lúc tải, mở lại sau khi xong) — xem §3.4.

### 3.4 Đồng bộ trạng thái khi app không có mặt lúc tải xong

Đây là ca khó nhất và **phải thiết kế đúng ngay từ đầu**, không phải chi tiết implement sau:

- Nếu app bị kill trong lúc tải, EventChannel stream chết theo Flutter engine — không có gì nhận sự kiện `completed`/`failed` phía Dart.
- Khi user mở lại app, `UpdateCubit` đang ở state cũ (`DownloadPhase.downloading` từ trước khi bị kill, hoặc `idle` nếu process Dart hoàn toàn mới) — **không tự động biết** Service đã tải xong file rồi.

**Giải pháp**: Service ghi trạng thái cuối cùng (`idle` | `downloading` | `completed:<path>` | `failed:<reason>`) vào `SharedPreferences` (native, đọc được cả từ Kotlin lẫn Dart qua plugin `shared_preferences` đã dùng sẵn — kiểm tra §8) mỗi khi trạng thái đổi. Khi `UpdateCubit` khởi tạo lại (`main.dart` → `configureDependencies()` → `UpdateCubit` constructor, hoặc lần đầu `check()` chạy), nó **hỏi trạng thái hiện tại qua MethodChannel `getDownloadStatus()`** trước khi giả định `idle`. Nếu trạng thái là `completed:<path>` và file tồn tại + sha256 khớp version đang chờ cài, `UpdateCubit` nhảy thẳng tới `DownloadPhase.ready` mà không tải lại — đúng R5.

### 3.5 File tải về nằm ở đâu

`getTemporaryDirectory()` (Flutter, ánh xạ `context.cacheDir`) **không** dùng được cho Service — nó là API của `path_provider`, chỉ hoạt động trong Dart runtime có Flutter engine. Service (Kotlin thuần) ghi file vào `context.getExternalFilesDir(null)` (app-specific external storage, không cần quyền `WRITE_EXTERNAL_STORAGE` từ Android 10+, tự dọn khi gỡ app) — path này Dart đọc lại được qua `path_provider`'s `getExternalStorageDirectory()` hoặc đơn giản hơn: Service trả path tuyệt đối qua MethodChannel/EventChannel, Dart không cần tự suy ra.

---

## 4. Backend (Django)

**Không có thay đổi backend nào cho feature này.** `GET /api/app/version/` và `AppRelease` (đã chuyển sang Bunny CDN) giữ nguyên contract — Service Android gọi thẳng `download_url` đã có, không qua API mới.

---

## 5. Mobile (Flutter + Kotlin)

### 5.1 File mới

| File | Vai trò |
|---|---|
| `android/app/src/main/kotlin/pro/huyenhoc/app/ApkDownloadService.kt` | Foreground Service — tải file, quản lý notification, ghi trạng thái |
| `android/app/src/main/kotlin/pro/huyenhoc/app/DownloadNotifications.kt` | Helper tạo `NotificationChannel` + `Notification.Builder` (tách khỏi Service cho gọn) |
| `android/app/src/main/kotlin/pro/huyenhoc/app/ApkInstaller.kt` | Object top-level chứa logic `FileProvider` + `Intent.ACTION_VIEW` để mở system installer — dùng chung cho `MainActivity` và `InstallApkReceiver` (§5.4) |
| `android/app/src/main/kotlin/pro/huyenhoc/app/InstallApkReceiver.kt` | `BroadcastReceiver` — nhận tap trên notification "Tải xong" khi app đã bị kill, gọi `ApkInstaller.install()` trực tiếp (§5.4) |
| `android/app/src/main/kotlin/pro/huyenhoc/app/ApkDownloaderPlugin.kt` | Đăng ký MethodChannel `pro.huyenhoc.app/downloader` (`startDownload`, `getDownloadStatus`) + EventChannel `pro.huyenhoc.app/downloader/events` (tiến độ/kết quả) — object singleton vì `ApkDownloadService` (chạy trên thread riêng, không có Activity context) là nơi gọi `emitProgress`/`emitCompleted`/`emitFailed` (§3.2, §3.3) |
| `lib/core/update/apk_downloader.dart` | Wrapper Dart cho MethodChannel + EventChannel mới, thay thế phần gọi `UpdateRepository.download()` trong `UpdateCubit` |

### 5.2 File sửa

| File | Thay đổi |
|---|---|
| `android/app/src/main/AndroidManifest.xml` | Thêm 3 permission (§2.4) + khai `<service>` với `foregroundServiceType="dataSync"` + khai `<receiver>` cho `InstallApkReceiver` (§5.4) |
| `android/app/src/main/kotlin/pro/huyenhoc/app/MainActivity.kt` | `installApk()` gọi `ApkInstaller.install(this, path)` thay vì logic `FileProvider` inline (§5.4) |
| `lib/features/update/presentation/update_cubit.dart` | `_downloadAndInstall()` gọi `ApkDownloader` thay vì `UpdateRepository.download()` trực tiếp; đọc trạng thái tồn dư lúc khởi tạo (§3.4); thêm `checkInstallPermission()` (§5.5) |
| `lib/features/update/data/update_repository.dart` | Bỏ method `download()` (chuyển trách nhiệm sang `ApkDownloader`) — `fetch()`/`currentVersionCode()` giữ nguyên; `refreshDownloadUrl()` cũng bỏ (không còn caller — retry-with-fresh-URL không áp dụng cho Service, §5.3) |
| `lib/features/update/presentation/update_view.dart` | Gọi `checkInstallPermission()` khi dialog mở; `_actions()` chỉ hiện nút "Mở cài đặt" (ẩn "Cập nhật") khi `needsInstallPermission == true` (§5.5) |
| `lib/core/update/installer.dart` (`AndroidInstaller`) | Thêm `hasNotificationPermission()`/`requestNotificationPermission()` — wrapper cho 2 method mới trên `MethodChannel pro.huyenhoc.app/installer` (§5.3) |
| `lib/main.dart` | Thêm `unawaited(getIt<UpdateCubit>().restoreDownloadState())` cạnh `check()` hiện có — phục hồi trạng thái Service lúc khởi động app (§3.4) |

### 5.3 Xin quyền `POST_NOTIFICATIONS`

Thời điểm hỏi: **ngay trước khi bấm "Cập nhật"** (trong `startUpdate()`), không hỏi sớm hơn (lúc app mở) — đúng nguyên tắc xin quyền đúng lúc cần (contextual permission), và tránh một prompt permission ngay từ màn hình đầu tiên gây khó chịu.

Nếu user từ chối: **vẫn cho tải**, chỉ là không có notification tiến độ (Service vẫn chạy Foreground bình thường — Android không bắt buộc phải có quyền notification để *chạy* Foreground Service, chỉ bắt buộc để *hiển thị* notification; thiếu quyền thì `NotificationManager.notify()` no-op âm thầm, không throw). `EventChannel` vẫn hoạt động nếu app đang mở, nên UI trong app vẫn thấy tiến độ dù không có notification hệ thống.

**Cơ chế xin quyền (chốt lúc implement, doc không nêu rõ trước đó)**: dùng thêm 2 method mới trên `MethodChannel` thuần `pro.huyenhoc.app/installer` đã có (`hasNotificationPermission`, `requestNotificationPermission`, cài bằng `ActivityCompat.requestPermissions()` trong `MainActivity.kt`) — không thêm package `permission_handler`, nhất quán với cách dự án đã xử lý install permission (`canRequestInstall`/`installApk`) cho một nhu cầu hẹp tương tự.

**Đánh đổi đã chấp nhận (PO-approved)**: hành vi cũ "signed URL hết hạn giữa chừng thì tự refresh và retry 1 lần" (feature-36 §7.2) không còn — `ApkDownloadService` nhận 1 URL cố định lúc `startDownload()` và không tự gọi API để xin URL mới. Nếu hết hạn giữa chừng, download báo `failed`; user bấm "Cập nhật" lại sẽ lấy URL mới từ đầu. Rủi ro thấp trong thực tế (APK qua Bunny CDN tải nhanh, TTL signed URL thường đủ dài) — không implement retry-with-fresh-URL ở Service cho v1.

### 5.4 Không đổi `AndroidInstaller`, nhưng tách `installApk()` khỏi `MainActivity`

`canInstall()`, `openInstallSettings()`, `install()` (phía Dart, `AndroidInstaller`) giữ nguyên 100%. Phía Kotlin, logic `installApk()` hiện là `private fun` của `MainActivity` — không gọi được khi app đã bị kill (không có `MainActivity`/Flutter engine nào đang sống để nhận `MethodChannel` call).

**Cách xử lý**: tách thân hàm `installApk()` (dựng `FileProvider.getUriForFile()` + `Intent.ACTION_VIEW`) thành một object top-level dùng chung — `ApkInstaller.install(context, path)` (file mới `android/app/src/main/kotlin/pro/huyenhoc/app/ApkInstaller.kt`) — gọi được từ cả hai nơi:

- `MainActivity.installApk()` (app đang mở, qua `MethodChannel`) — gọi `ApkInstaller.install(this, path)` thay vì logic inline.
- `InstallApkReceiver` (file mới, `BroadcastReceiver`) — nhận khi user bấm notification "Tải xong" lúc app **đã bị kill**. Dùng `BroadcastReceiver` chứ không phải `Activity` trung gian: không cần khởi động Flutter engine chỉ để mở installer, `startActivity(installIntent)` gọi được thẳng từ `onReceive()` với `Context` của receiver (kèm `FLAG_ACTIVITY_NEW_TASK`, cùng cách `installApk()` hiện tại đã làm). `PendingIntent` trong `ApkDownloadService` cho notification "Tải xong" trỏ tới `InstallApkReceiver` này (`PendingIntent.getBroadcast()`), kèm `path` file trong `extras`.
- Cả hai case tái dùng đúng 1 logic `FileProvider` — không lặp code, không có nhánh nào bỏ sót cờ `FLAG_GRANT_READ_URI_PERMISSION`.

`InstallApkReceiver` cần khai trong `AndroidManifest.xml` (`<receiver android:exported="false">` — chỉ nhận từ `PendingIntent` nội bộ app, không mở cho app khác gọi).

### 5.5 UI dialog cập nhật (`UpdateView`) — ẩn nút "Cập nhật" khi chưa có quyền cài APK

**Vấn đề hiện tại**: `UpdateView._actions()` (`update_view.dart` dòng 74-82) luôn hiện đồng thời cả nút "Mở cài đặt" (khi `needsInstallPermission == true`) **và** nút "Cập nhật" (`FilledButton`, luôn hiện). Bấm "Cập nhật" khi chưa có quyền chắc chắn bị chặn ngay ở `_downloadAndInstall()` (`update_cubit.dart` dòng 108) — hiện chỉ show `error` message, không ẩn nút. Ngoài ra `needsInstallPermission` mặc định `false` và chỉ được set `true` **sau khi** đã bấm "Cập nhật" một lần và bị chặn — nghĩa là lần đầu mở dialog, user vẫn thấy nút "Cập nhật" dù thực tế chưa có quyền, phải bấm hụt một lần mới đổi nút.

**Thay đổi**:

1. `UpdateCubit` thêm hàm `checkInstallPermission()` — gọi `_installer.canInstall()`, `emit` cập nhật `needsInstallPermission` (không đổi `phase`, không tải gì).
2. `UpdateView` chuyển từ `StatelessWidget` sang `StatefulWidget` (`_UpdateViewState` triển khai `WidgetsBindingObserver`). Lý do phải dùng lifecycle observer chứ không chỉ gọi 1 lần: dialog là `AlertDialog` hiển thị qua `showDialog` — khi user rời sang system Settings để cấp quyền (`openInstallSettings()`) rồi bấm Back quay lại app, dialog Flutter **không bị pop và không tự rebuild**, vẫn đứng yên ở state cũ. Không có tín hiệu nào khác (không phải `initState` lần 2, không phải navigation event) báo cho dialog biết là nên hỏi lại quyền — chỉ có app quay lại foreground (`AppLifecycleState.resumed`) là tín hiệu đúng thời điểm.
   - `initState()`: gọi `WidgetsBinding.instance.addObserver(this)` + gọi `checkInstallPermission()` lần đầu (qua `addPostFrameCallback` vì cần `context.read<UpdateCubit>()`).
   - `didChangeAppLifecycleState(state)`: khi `state == AppLifecycleState.resumed`, gọi lại `checkInstallPermission()` — bắt đúng case user vừa quay lại từ Settings.
   - `dispose()`: gọi `WidgetsBinding.instance.removeObserver(this)`.
3. `_actions()` đổi điều kiện: khi `state.needsInstallPermission == true`, **chỉ** hiện nút "Mở cài đặt" (không hiện nút "Cập nhật" `FilledButton` nữa).
4. Nút "Bỏ qua" giữ nguyên, luôn hiện trong mọi trường hợp (không đổi hành vi skip).

> **Không đổi** message lỗi hiện có (`'Cần cho phép cài đặt từ nguồn này, sau đó bấm Cập nhật lại.'`) — với UI mới, message này sẽ hiện kèm nút "Mở cài đặt" duy nhất, không cần sửa text vì vẫn đúng ngữ cảnh (user cấp quyền xong quay lại, `needsInstallPermission` về `false`, nút "Cập nhật" xuất hiện lại bình thường).

---

## 6. Trade-off & rủi ro

| Rủi ro | Mức độ | Xử lý |
|---|---|---|
| Android 14 giới hạn tổng thời lượng `dataSync` service/ngày (~6h) nếu app không foreground | Thấp | Một lần tải APK chỉ mất vài phút; không tích luỹ đủ để chạm giới hạn trong thực tế |
| Một số OEM (Xiaomi/MIUI, Oppo/ColorOS...) có battery-optimization riêng ngoài chuẩn AOSP, có thể vẫn kill Foreground Service | Trung bình, không loại bỏ hoàn toàn được | Đây là giới hạn thực tế của Android fragmentation, không phải lỗi thiết kế — đã là cải thiện lớn so với hiện tại (0% khả năng sống sót background) |
| Thêm quyền `POST_NOTIFICATIONS` → thêm 1 prompt hệ thống | Thấp | Chỉ hỏi khi bấm cập nhật (contextual), có thể từ chối mà tải vẫn chạy (§5.3) |
| `SharedPreferences` đọc/ghi giữa Kotlin thuần và Flutter plugin `shared_preferences` phải cùng file `.xml` | Trung bình — lỗi tinh vi nếu sai tên file | `shared_preferences` Android plugin dùng file mặc định `FlutterSharedPreferences`; Service Kotlin phải `getSharedPreferences("FlutterSharedPreferences", MODE_PRIVATE)` với đúng tên và tiền tố key (`flutter.` prefix) nếu muốn Dart đọc lại qua plugin — **hoặc đơn giản hơn, dùng riêng file SharedPreferences của Service** (`getSharedPreferences("apk_download_state", ...)`) và chỉ đọc nó qua MethodChannel `getDownloadStatus()` (như đã thiết kế ở §3.4), không qua Dart plugin — tránh hoàn toàn cạm bẫy tên file/prefix này |
| File APK nằm ở `getExternalFilesDir()` thay vì cache Flutter cũ | Thấp | Không ảnh hưởng người dùng; dọn file cũ khi tải bản mới đè lên, giống hành vi hiện tại |

**Quyết định gỡ khỏi bảng trên** (chốt trong thiết kế, không để lại như "cân nhắc"): dùng file `SharedPreferences` **riêng** cho trạng thái download, đọc duy nhất qua MethodChannel — không cố chia sẻ trực tiếp với plugin `shared_preferences` phía Dart.

### 6.1 Bug tìm thấy khi test tay (2026-09-01) — đã fix

Test tay lần đầu trên thiết bị thật (Android 12) crash ngay khi Service báo `completed` và `UpdateCubit` gọi `installer.install(path)`:

```
PlatformException(error, Failed to find configured root that contains
/storage/emulated/0/Android/data/pro.huyenhoc.app/files/huyenhoc-6.apk, ...)
  at androidx.core.content.FileProvider$SimplePathStrategy.getUriForFile
  at pro.huyenhoc.app.ApkInstaller.install(ApkInstaller.kt:22)
```

**Nguyên nhân**: `android/app/src/main/res/xml/file_paths.xml` chỉ khai `<cache-path name="apk" path="." />` — đúng cho luồng cũ (`getTemporaryDirectory()`, ánh xạ `cacheDir`), nhưng `ApkDownloadService` (mới, §3.5) ghi file vào `context.getExternalFilesDir(null)`, một root path khác mà `FileProvider` chưa được khai để nhận diện. Bỏ sót khi implement — §3.5 đã mô tả đúng nơi lưu file nhưng không có mục riêng nhắc cập nhật `file_paths.xml` theo.

**Fix**: đổi `file_paths.xml` sang `<external-files-path name="apk" path="." />`, khớp đúng `getExternalFilesDir()`. Không còn ai dùng `cache-path` (luồng cũ đã xoá hoàn toàn khỏi `UpdateCubit`) nên xoá luôn, không giữ cả hai.

**Verify sau fix**: test lại trên cùng thiết bị — tải xong → notification "Tải xong" → tự mở system installer → cài đặt thành công → `dumpsys package pro.huyenhoc.app` xác nhận lên đúng `versionCode` mới.

---

## 7. Test plan

| # | Kịch bản | Kỳ vọng | Kết quả (2026-09-01, Android 12 thật) |
|---|---|---|---|
| T35-1 | Bấm "Cập nhật", cấp quyền notification, thoát app ngay | Notification tiến độ tiếp tục chạy, tăng % đều | ✅ PASS — notification `channel=apk_download` xác nhận qua `dumpsys notification`, progress bar trong app tăng đều (12%...) |
| T35-2 | Bấm "Cập nhật", **từ chối** quyền notification | Tải vẫn chạy (verify qua file xuất hiện đúng size cuối), không có notification | ⏳ Chưa test — máy Android 12 không có runtime permission này để từ chối, cần máy Android 13+ |
| T35-3 | Tải xong khi app đang mở | `UpdateCubit` nhận event `completed` qua EventChannel, UI chuyển `DownloadPhase.ready` không cần thoát app | ✅ PASS — tự mở system installer ngay khi app đang mở, không cần thao tác thêm |
| T35-4 | Tải xong khi app đã bị kill, mở lại app | `UpdateCubit` gọi `getDownloadStatus()` lúc khởi tạo, thấy `completed`, nhảy thẳng `DownloadPhase.ready`, không tải lại | ⏳ Chưa test |
| T35-5 | Bấm vào notification "Tải xong" khi app đã bị kill | `InstallApkReceiver` mở thẳng system installer qua `ApkInstaller.install()`, không cần mở app trước (§5.4) | ⏳ Chưa test riêng (đã xác nhận gián tiếp: `contentIntent` là đúng `PendingIntent.getBroadcast()` trỏ `InstallApkReceiver` qua `dumpsys notification`, nhưng chưa test tay bấm khi app bị kill hẳn) |
| T35-6 | Ngắt mạng giữa chừng | Notification chuyển "Tải thất bại", event `failed` nếu app đang mở | ⏳ Chưa test |
| T35-7 | sha256 tải về không khớp | Xử lý giống T35-6 (không cài file hỏng) | ⏳ Chưa test |
| T35-8 | Bấm "Cập nhật" lần 2 khi Service đang chạy dở (chưa xong lần 1) | Không khởi động Service thứ hai chồng lấn — `startService` với cùng Intent action phải idempotent hoặc Dart chặn double-tap | ⏳ Chưa test |
| T35-9 | Android 12 trở xuống (không cần `POST_NOTIFICATIONS`) | Notification hiện bình thường không cần xin quyền | ✅ PASS — notification hiện đúng trên Android 12, không có prompt xin quyền |
| T35-10 | Mở dialog cập nhật lần đầu, **chưa** cấp quyền cài "Install unknown apps" | Dialog chỉ hiện nút "Bỏ qua" + "Mở cài đặt" — **không** hiện nút "Cập nhật" (§5.5) | ⏳ Chưa test — máy test đã có sẵn quyền cài từ trước, cần thu hồi quyền để test lại |
| T35-11 | Từ T35-10, bấm "Mở cài đặt" → cấp quyền → quay lại app | Nút "Cập nhật" xuất hiện lại, `needsInstallPermission` về `false` | ⏳ Chưa test (phụ thuộc T35-10) |
| T35-12 | Mở dialog cập nhật khi **đã** có sẵn quyền cài apk (cấp từ trước) | Dialog hiện nút "Cập nhật" ngay từ đầu, không hiện "Mở cài đặt" | ✅ PASS |

> **Bổ sung ngoài test plan gốc**: xác nhận cài đặt thành công thật — `dumpsys package pro.huyenhoc.app` sau khi cài báo đúng `versionCode=6`, `versionName=1.0.4` (bản test build), khớp với `AppRelease` vừa publish qua đúng logic `AppReleaseForm`/`save_model()` (upload thật lên Bunny CDN, `BUNNY_USE_LOCAL_FALLBACK=True`).

---

## 8. Câu hỏi cần PO/verify trước khi code

1. ~~`shared_preferences` package đã có trong `pubspec.yaml` chưa?~~ **Đã verify: không có.** Dự án dùng `flutter_secure_storage` cho local state (`DeviceService`), không dùng `shared_preferences`. Không rủi ro xung đột file — Service dùng `SharedPreferences` riêng của nó (`getSharedPreferences("apk_download_state", ...)`, thuần Android, không qua plugin Flutter nào), đọc lại chỉ qua MethodChannel `getDownloadStatus()` như đã chốt ở §6.
2. **Icon/màu cho notification tiến độ** — dùng icon app hiện có (`ic_launcher`) hay cần thiết kế icon riêng dạng monochrome cho status bar (khuyến nghị Android, nhưng không bắt buộc)?
3. **Text hiển thị** trên notification — cần bản dịch tiếng Việt chính thức ("Đang tải bản cập nhật Huyền Học Pro…") để khớp giọng văn app, hay tự soạn theo mẫu trên là đủ?
4. **Có cần nút "Huỷ" trên notification tiến độ không?** (R1-R6 hiện chưa yêu cầu huỷ giữa chừng — nếu cần, thêm `PendingIntent` cho action huỷ gọi `stopService()`, kéo theo phải dọn file dở dang.)

---

## 9. Bước tiếp theo (kế hoạch gốc, sau khi PO duyệt — xem §10 cho kết quả thật)

1. `AndroidManifest.xml` — thêm permission + khai `<service>` + khai `<receiver>` cho `InstallApkReceiver` (§5.4)
2. `ApkDownloadService.kt` + `DownloadNotifications.kt`
3. `ApkInstaller.kt` (tách logic `FileProvider`/`Intent.ACTION_VIEW` dùng chung) + `InstallApkReceiver.kt` (§5.4)
4. Sửa `MainActivity.installApk()` gọi `ApkInstaller.install()` thay vì logic inline (§5.4)
5. `lib/core/update/apk_downloader.dart` (MethodChannel + EventChannel wrapper)
6. Sửa `update_cubit.dart` — gọi `ApkDownloader`, đọc `getDownloadStatus()` lúc khởi tạo, thêm `checkInstallPermission()` (§5.5)
7. Sửa `update_view.dart` — `WidgetsBindingObserver` gọi lại `checkInstallPermission()` khi `AppLifecycleState.resumed`, ẩn nút "Cập nhật" khi `needsInstallPermission == true` (§5.5)
8. Xoá `UpdateRepository.download()` (không còn ai gọi)
9. Test T35-1 → T35-12 trên thiết bị thật (Foreground Service không test được đầy đủ qua unit test — cần test tay theo bảng §7)

---

## 10. Quyết định rollback (2026-09-01) — Foreground Service bị loại bỏ

### 10.1 Những gì đã implement và verify đúng thiết kế

Toàn bộ §9 đã code xong và unit test xanh (21/21). Test tay trên **Android 12 thật** (điện thoại vật lý đầu tiên) cho kết quả tốt ban đầu:

- Tải chạy nền qua Foreground Service, notification thật hiện đúng, tải xong tự mở system installer, **cài đặt thành công thật** (verify `dumpsys package` lên đúng `versionCode` mới).
- Một bug tìm thấy và fix ngay: `file_paths.xml` chưa khai `external-files-path` cho `getExternalFilesDir()` — `FileProvider` crash khi cài. Fix xong, verify lại cài thành công.
- T35-10, T35-11 (ẩn/hiện nút "Cập nhật" theo quyền cài đặt) hoạt động đúng thiết kế trên cả 2 emulator dùng để test tiếp theo.

### 10.2 Bug thật phát hiện khi mở rộng test sang emulator và thiết bị Android 13

Test tiếp T35-2 (từ chối `POST_NOTIFICATIONS`, cần Android 13+) trên **emulator Android 16 (API 36)**: download bắt đầu đúng, nhưng Android tự dừng Foreground Service sau khoảng 6–7 giây kể từ lúc bấm "Cập nhật", với log hệ thống:

```
ActivityManager: Stop FGS timeout: ServiceRecord{... pro.huyenhoc.app/.ApkDownloadService ...}
ForegroundServiceTypeLoggerModule: FGS stop call for: <uid> has no types!
```

**Các giả thuyết đã kiểm chứng và loại trừ, theo thứ tự**:

1. **`startForeground()` gọi trễ** — đo timing chính xác bằng `System.currentTimeMillis()` ở cả `onCreate()` và trước/sau `startForeground()`: luôn hoàn thành trong **dưới 10ms** kể từ khi `onStartCommand()` bắt đầu. Không phải nguyên nhân.
2. **Overload `startForeground()` 2 tham số không truyền `foregroundServiceType` tường minh** — đổi sang `ServiceCompat.startForeground(this, id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)`. Timeout vẫn xảy ra, cùng khoảng thời gian.
3. **`data_sync_fgs_timeout_duration` bị rút ngắn trên emulator để test nhanh** (một pattern có thật của Android testing framework) — set tường minh về `21600000` (6h) qua `adb shell device_config put`. Timeout vẫn xảy ra sau ~10s, không phải 6h.
4. **Compat flag `FGS_INTRODUCE_TIME_LIMITS` tự bật do targetSdk 36** — tắt hẳn qua `adb shell am compat disable FGS_INTRODUCE_TIME_LIMITS pro.huyenhoc.app`. Timeout vẫn xảy ra.
5. **Chỉ là quirk của emulator/Android 16 preview** — tạo AVD mới Android 15 (API 35, bản chính thức, không phải preview): **cùng lỗi, timeout ~12s**.
6. **Chỉ là quirk của toàn bộ môi trường emulator, không xảy ra trên thiết bị thật** — test trên **Samsung SM-N985F, Android 13 thật** (không phải cùng máy Android 12 đã test thành công trước đó): **cùng lỗi tái hiện**, download bị dừng giữa chừng, báo "Tải bản cập nhật thất bại".

Tái hiện được trên 3/4 môi trường test (2 emulator + 1 thiết bị Android 13 thật), không tái hiện chỉ trên chiếc Android 12 thật ban đầu — không đủ để kết luận nguyên nhân gốc trong thời gian hợp lý. Không loại trừ được khả năng đây là hành vi thật của `dataSync` Foreground Service trên một lớp thiết bị/Android version rộng mà tài liệu chính thức của Google (giới hạn 6 giờ/24h) không mô tả đúng — có thể có một ngưỡng ngắn hạn khác (theo process state, theo OEM, hoặc theo cách Foreground Service được start từ ngữ cảnh cụ thể của app này) chưa được xác định.

### 10.3 Quyết định

**Rollback toàn bộ cơ chế Foreground Service.** Rủi ro production quá cao để release: user bấm "Cập nhật" trên phần lớn thiết bị thử nghiệm sẽ thấy tải thất bại sau vài giây, tệ hơn hẳn hành vi cũ (Dio trong Dart isolate, dù có nhược điểm bị hủy khi thoát app, nhưng **luôn hoàn thành nếu user ở lại trong app**).

**Đã xóa hoàn toàn**: `ApkDownloadService.kt`, `ApkDownloaderPlugin.kt`, `DownloadNotifications.kt`, `InstallApkReceiver.kt`, 3 permission (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS`), khai báo `<service>`/`<receiver>` trong manifest, `apk_downloader.dart`. Khôi phục `file_paths.xml` về `cache-path` (khớp `getTemporaryDirectory()`).

**Đã khôi phục nguyên trạng**: `UpdateRepository.download()`/`refreshDownloadUrl()` (Dio), `UpdateCubit._downloadAndInstall()` luồng cũ (tải trong Dart isolate, verify sha256, cài qua `AndroidInstaller`), `MainActivity.kt` (chỉ còn `installApk`/`canRequestInstall`/`openInstallSettings`, không có notification permission methods).

**Đã giữ lại** (cải thiện độc lập, không phụ thuộc Foreground Service, đã verify hoạt động đúng trên cả 2 loại môi trường): `checkInstallPermission()` + `UpdateView` chuyển `StatefulWidget`/`WidgetsBindingObserver` — ẩn nút "Cập nhật" khi chưa có quyền cài APK, tự cập nhật lại khi app resume từ Settings. `ApkInstaller.kt` (tách logic `FileProvider` khỏi `MainActivity`, dùng lại được, không có rủi ro gì).

**Đã thêm mới theo yêu cầu**: dòng cảnh báo trong `UpdateView` khi đang tải — *"Vui lòng không đóng ứng dụng cho đến khi tải xong."* — nhắc trực tiếp user về nhược điểm đã biết của cơ chế Dio, thay vì cố gắng giải quyết nó bằng native code rủi ro cao.

### 10.4 Thay đổi phụ phát hiện trong lúc test (ngoài phạm vi Foreground Service)

Khi verify lại luồng Dio trên thiết bị thật, phát hiện `AppRelease.apk_storage_key()` (feature-37, code cũ) dùng **key cố định** (`releases/{APP_ENV}/huyenhoc.apk`) cho mọi version — khi publish nhiều lần liên tiếp trong lúc test, CDN Bunny phục vụ **file cũ dù đã purge cache thành công** (`purge_cdn_url()` trả `True`, upload trả `201`, nhưng file thực tế trên CDN vẫn là bản trước đó nhiều phút sau). Việc này khiến app tải về đúng file nhưng sha256 không khớp DB, báo "File tải về không toàn vẹn" sai — không phải bug của feature-35, nhưng chặn hẳn việc verify.

**Fix (đồng ý bởi user, không cần design doc riêng vì đơn giản)**: `apk_storage_key()` nhận thêm `version_code`, trả về path riêng theo version (`releases/{APP_ENV}/huyenhoc-{version_code}.apk`) — mỗi version một URL riêng biệt, không bao giờ bị CDN cache đè lẫn nhau, không cần purge nữa. `AppReleaseAdmin.save_model()` xóa file version cũ trên Bunny (`delete_pdf_from_bunny(old_bunny_key)`) sau khi lưu version mới thành công, tránh rác tích lũy vĩnh viễn trên Storage. Cập nhật 2 test trong `test_app_release.py` (`test_t37_4`, `test_t37_5`) theo hành vi mới — 12/12 test `core` pass.

**Tiện thể fix**: `core/migrations/0003_remove_apprelease_file_apprelease_bunny_key.py` có 1 dòng `migrations.â1(...)` bị lỗi encoding (từ trước, không phải do phiên làm việc này), chặn hoàn toàn `python manage.py test` chạy được — sửa lại đúng thành `migrations.RemoveField(...)`.

### 10.5 Bài học / khuyến nghị nếu quay lại hướng Foreground Service trong tương lai

- Không tin tưởng test trên 1 thiết bị/emulator duy nhất cho hành vi lifecycle Foreground Service — bắt buộc test trên ≥3 môi trường (bao gồm ít nhất 1 thiết bị thật targetSdk cao) trước khi coi là ổn định.
- Cân nhắc `foregroundServiceType="specialUse"` thay vì `dataSync` nếu thử lại — dự phòng đã ghi trong §2.3 nhưng chưa test.
- Đo lường timeout thật bằng `Service.onTimeout(int, int)` (API mới của Android 15) thay vì suy luận qua log `ActivityManager`, để biết chính xác lý do hệ thống đưa ra khi dừng Service.
