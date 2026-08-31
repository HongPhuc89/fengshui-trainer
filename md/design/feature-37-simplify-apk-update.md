# Feature 37 — Đơn giản hoá cập nhật app: chỉ APK, giữ 1 bản duy nhất, tự đọc version từ file

## Document Information
- **Feature**: Thay thế phần lớn thiết kế của feature-36. Server không còn quản lý nhiều bản phát hành, không còn iOS OTA, không còn ngưỡng chặn bắt buộc. Chỉ còn **một** `AppRelease` (Android) — upload APK mới thì `version_code`/`version_name` tự đọc từ file bằng `pyaxmlparser`, file cũ bị xoá ngay khi file mới lưu thành công.
- **Status**: **v2 — Implemented (Stage 3, 2026-08-31)**. 12 test backend mới xanh (76/76 toàn suite `core`+`users`) + 16 test Flutter xanh.
- **Created**: 2026-08-31
- **Updated**: 2026-08-31
  - v2: Xử lý PO review v1 — 1 Critical (quy trình migration an toàn, §3.7) và 3 Suggestion (`apps.get_model` trong data migration, cập nhật `md/TASKS.md`, ghi rõ `has_delete_permission`). Migration đã unapply/apply lại trên DB local theo đúng §3.7 (đã đơn giản hoá vì chưa có production — xem ghi chú trong §3.7).
- **Related**: `feature-36-app-version-update.md` (feature này thay thế phần lớn — xem §2 để biết chính xác cái gì còn giữ, cái gì bỏ). Tham khảo thiết kế đã chạy thật ở dự án chị em `pmp-trainer` (`src/backend/core/models.py`, `admin.py`, `serializers.py`, `views.py`) — mô hình singleton + `pyaxmlparser(raw=True)` + xoá file cũ trong `save_model` lấy gần như nguyên khối từ đó.

---

## 1. Tóm tắt

Feature-36 mới chạy được từ hôm qua (30/8) và làm khá đầy đủ: 2 nền tảng, lịch sử nhiều bản phát hành (giữ file 3 bản mới nhất), 2 mức chính sách (nhắc/chặn cứng qua `min_supported_version_code`), iOS OTA qua `itms-services://` với `manifest.plist` sinh động.

Yêu cầu hôm nay đảo ngược phần lớn độ phức tạp đó:

1. **iOS chuyển hẳn sang TestFlight** — Apple tự lo phân phối và nhắc cập nhật. App không còn kiểm tra, không còn tải, không còn màn hình gì cho iOS trong luồng này nữa.
2. **Android chỉ giữ đúng 1 bản** — không còn lịch sử, không còn "3 bản mới nhất", không còn `is_published`. Model trở thành **singleton**: đúng 1 row, upload APK mới là ghi đè bản hiện tại.
3. **`version_code`/`version_name` không nhập tay** — đọc trực tiếp từ file APK bằng `pyaxmlparser>=0.3.30` lúc admin upload, validate luôn (APK đọc được, `version_code` phải cao hơn bản đang có) trước khi lưu bất cứ thứ gì.
4. **Xoá file cũ ngay sau khi file mới lưu thành công** — không giữ lịch sử binary, giảm dung lượng bucket.
5. **Bỏ hẳn mức "chặn cứng"** — không còn `min_supported_version_code`, không còn màn hình không tắt được. Chỉ còn một modal nhắc, luôn có thể đóng/bỏ qua.
6. **Luồng tải + verify sha256 + tự mở trình cài đặt hệ thống trên Android giữ nguyên 100%** — đây là phần đã build và chạy tốt ở feature-36, không đụng vào (`AndroidInstaller`, `FileProvider`, quyền `REQUEST_INSTALL_PACKAGES`).
7. **Migration cũ (`0002_apprelease.py`) viết lại tại chỗ**, không giữ lịch sử schema cũ — xem rủi ro ở §11.

---

## 2. Phạm vi thay đổi so với feature-36

| Phần | Giữ nguyên | Bỏ | Sửa |
|---|---|---|---|
| Model `AppRelease` | `file`, `file_size`, `sha256`, `release_notes` | `platform` (nhiều lựa chọn) → còn 1 lựa chọn cố định, `is_published`, `min_supported_version_code`, `UniqueConstraint`/`CheckConstraint` cũ | `version_code`/`version_name` chuyển thành **tự tính, `editable=False`** |
| Admin | Tính `sha256`/`file_size` lúc save | `AppReleaseAdmin.clean()` cũ (downgrade theo `is_published`), hiển thị `version_spread_display` | Thêm `AppReleaseForm.clean_apk_file()` đọc `pyaxmlparser`; `save_model` xoá file cũ |
| Endpoint `GET /api/app/version/` | `AllowAny`, `204` khi chưa có bản nào | Query param `platform`, `version_code`; field `min_supported_version_code`, `update_status` | Response chỉ còn version_code/version_name/release_notes/download_url/file_size/sha256 |
| Endpoint iOS | — | **Xoá hẳn**: `ios_manifest`, `templates/app/manifest.plist`, route trong `urls_app.py` | — |
| Pruning nhiều bản | — | **Xoá hẳn**: `release_pruning.py`, `prune_app_releases` command, test, setting `APP_RELEASE_KEEP_FILES` | — |
| `version_spread()` / `MobileDeviceAdmin` filter | `app_version` trong `list_display`/`list_filter` (không liên quan, giữ nguyên) | `core/services/version_spread.py` (chỉ phục vụ quyết định ngưỡng chặn — hết tác dụng) | — |
| `core/services/app_version.py` | — | **Xoá hẳn** (`parse_version_code`, `resolve_status`, `PLATFORM_BY_PARAM` — không còn ai gọi) | — |
| Mobile: tải + verify sha256 + gọi trình cài Android | Toàn bộ `AndroidInstaller`, `installer.dart`, `MainActivity.kt`, `FileProvider`, `AndroidManifest.xml` quyền | — | — |
| Mobile: domain/state | `UpdateStore.shouldCheck/markChecked/isSkipped/skip` (nhịp 6h + bỏ qua theo version) | `BlockUpdate`, `LastVerdict`, `writeVerdict`/`readVerdict`, nhánh `blocking` trong `UpdateGate`/`UpdateView` | `AppVersionInfo` bỏ `minSupportedVersionCode`/`status`; `UpdateDecider` còn 1 hàm so sánh |
| Mobile: iOS | — | Nhánh `Platform.isIOS` trong `startUpdate` (`launchUrl` itms-services) | `UpdateCubit.check()` return sớm nếu `Platform.isIOS` |
| Migration | — | `0002_apprelease.py` cũ | Viết lại tại chỗ + data migration seed 1 row |

---

## 3. Quyết định thiết kế

### 3.1 Singleton bằng `platform` unique, seed sẵn 1 row qua migration

Thay vì "cho add lần đầu rồi khoá add", seed thẳng **đúng 1 row** (`platform='ANDROID'`, `version_code=0`, `file` rỗng) bằng data migration. `platform` giữ `unique=True` — DB tự chối mọi row thứ hai, không cần suy luận gì thêm. `has_add_permission` luôn `False`: admin không bao giờ thấy nút "Thêm", chỉ có đúng 1 dòng để bấm vào sửa.

> Đây là pattern lấy trực tiếp từ `pmp-trainer/core/models.py` — 1 row per platform, `unique=True` trên `platform`, comment "managed via fixtures/migration".
>
> **Có sửa một lỗi nhỏ so với bản gốc bên đó**: code tham khảo viết
> `return not AppVersion.objects.filter(...).exists() or super().has_add_permission(request)` —
> vế `or super()` gần như luôn `True` với user có quyền thêm, nên trên thực tế **không chặn được add lần hai**. Bản ở đây bỏ hẳn nhánh `or`, chỉ `return not AppRelease.objects.exists()`.

Giữ `platform` (1 lựa chọn duy nhất `ANDROID`) thay vì xoá hẳn field: không tốn gì thêm, và nếu sau này có nền tảng thứ hai cần tự quản (ví dụ APK cho một kênh phân phối khác ngoài Play), chỉ cần thêm choice + bỏ `unique=True` — không phải thiết kế lại từ đầu.

### 3.2 `version_code`/`version_name` đọc từ APK bằng `pyaxmlparser`, validate trước khi ghi gì cả

`pyaxmlparser.APK(data, raw=True)` nhận thẳng **bytes** trong RAM — không cần ghi file tạm ra đĩa như cách làm cũ. Vì vậy đọc toàn bộ file 1 lần, dùng chung cho cả pyaxmlparser lẫn tính `sha256`/`file_size`:

```python
# core/models.py
from pyaxmlparser import APK

class AppRelease(BaseModel):
    def read_version_from_apk(self, uploaded_file):
        """
        Parse version_code/version_name from the uploaded APK's manifest, and
        reject anything that isn't a real, newer build — before any write
        happens. Runs inside form validation (see admin.py), so a bad file
        never reaches storage or the database.
        """
        uploaded_file.seek(0)
        data = uploaded_file.read()
        uploaded_file.seek(0)

        try:
            apk = APK(data, raw=True)
        except Exception as exc:
            raise ValidationError(f'Không đọc được file APK: {exc}')

        version_code, version_name = apk.version_code, apk.version_name
        if not version_code or not version_name:
            raise ValidationError('File APK không có thông tin version hợp lệ.')
        version_code = int(version_code)

        # Android tự chối cài đè versionCode thấp hơn — publish một bản không
        # tăng số chỉ tạo nhầm lẫn (không có gì để nâng lên).
        if version_code <= self.version_code:
            raise ValidationError(
                f'versionCode trong file ({version_code}) phải lớn hơn bản đang '
                f'có ({self.version_code}).'
            )

        return version_code, version_name, hashlib.sha256(data).hexdigest(), len(data)
```

Đọc cả file vào RAM một lần là **chấp nhận được ở đây dù feature-36 từng cố tránh** (đọc theo chunk để không nạp 60MB vào bộ nhớ): `pyaxmlparser` với `raw=True` đằng nào cũng cần toàn bộ bytes để parse ZIP/manifest, nên tối ưu "không nạp hết vào RAM" đã mất ý nghĩa — tận dụng luôn lượt đọc đó để tính hash thay vì đọc file hai lần.

### 3.3 Validate trong `ModelForm.clean_apk_file()`, không phải `save_model()`

Đặt trong `clean_apk_file()` để lỗi hiện ra như lỗi field bình thường trên form admin (Django tự dừng transaction, không lưu gì) — không phải để `save_model()` raise rồi vỡ ra lỗi 500. Kết quả detect được gắn tạm vào `form._detected_version` (không gắn thẳng vào `self.instance` trong `clean()`, để `save_model()` chủ động áp lại — cùng pattern với `pmp-trainer`):

```python
# core/admin.py
class AppReleaseForm(forms.ModelForm):
    class Meta:
        model = AppRelease
        fields = ['platform', 'file', 'release_notes']

    def clean_file(self):
        file = self.cleaned_data['file']
        if 'file' in self.changed_data:
            self._detected = self.instance.read_version_from_apk(file)
        return file


@admin.register(AppRelease)
class AppReleaseAdmin(admin.ModelAdmin):
    form = AppReleaseForm
    list_display = ['platform', 'version_name', 'version_code', 'updated_at']
    readonly_fields = ['version_code', 'version_name', 'sha256', 'file_size', 'updated_at']
    fields = ['platform', 'file', 'release_notes', 'version_name', 'version_code',
              'sha256', 'file_size', 'updated_at']

    def has_add_permission(self, request):
        return not AppRelease.objects.exists()  # xem §3.1 — luôn False sau khi seed

    # has_delete_permission KHÔNG override — giữ mặc định True. Xoá row singleton
    # qua admin là hành vi hợp lệ (vd. gỡ hẳn bản phát hành hiện tại), và tự phục
    # hồi được: has_add_permission ở trên tính động theo exists(), nên xoá xong
    # vẫn add lại được bình thường (PO review v1, Suggestion).

    def save_model(self, request, obj, form, change):
        detected = getattr(form, '_detected', None)
        old_file = None
        if detected:
            obj.version_code, obj.version_name, obj.sha256, obj.file_size = detected
            old_file = AppRelease.objects.get(pk=obj.pk).file or None

        super().save_model(request, obj, form, change)

        # Chỉ xoá bản cũ SAU KHI obj.save() ở trên chạy xong không lỗi — đúng
        # yêu cầu "xoá file cũ nếu upload thành công". delete() gọi vào
        # LocalFirstSupabaseStorage nên xoá luôn object trên Supabase (feature-36 §5.2).
        if old_file and old_file.name != obj.file.name:
            old_file.delete(save=False)

        if detected:
            self.message_user(
                request,
                f'Đã publish version {obj.version_name} ({obj.version_code}). '
                f'File bản trước đã bị xoá.',
            )
```

### 3.4 Bỏ hẳn mức "chặn cứng"

Yêu cầu chỉ nói tới một modal "tải và cài đặt" khi có bản mới hơn — không còn khái niệm bắt buộc. Bỏ `min_supported_version_code`, `BLOCKED`, và toàn bộ cơ chế "verdict dính" (`LastVerdict`) mà feature-36 dựng riêng để bảo vệ trạng thái `BLOCKED` qua một lần kiểm tra lỗi mạng — không còn gì cần bảo vệ vì không còn trạng thái chặn.

**Hệ quả cần ghi nhận**: không còn cách ép ai đó cập nhật (kể cả vá lỗi bảo mật khẩn). Đường ép duy nhất còn lại là ngoài band — thông báo user chủ động, hoặc (nếu thật sự cần) quay lại thêm field này sau. Ghi vào backlog §12.

### 3.5 Bỏ hẳn iOS OTA — TestFlight thay thế toàn bộ

Xoá endpoint `ios/manifest.plist`, template, và nhánh build `itms-services://` link. Trên mobile, `UpdateCubit.check()` return ngay nếu `Platform.isIOS` — không gọi API, không có state, không có dialog nào trên iOS trong luồng này nữa. TestFlight tự thông báo và tự cài, ngoài phạm vi app.

### 3.6 Endpoint không còn nhận query param nào

Vì chỉ còn 1 platform và server không còn tính "status" (không còn chính sách để tập trung — phép so sánh chỉ còn client thực hiện, y hệt `AppVersionInfo.statusFor` cũ nhưng giờ là **duy nhất** đường tính), endpoint không cần `platform` lẫn `version_code` trong query string nữa:

```
GET /api/app/version/
```

trả thẳng bản hiện tại (hoặc `204` nếu row seed chưa từng được upload file). Client tự so `version_code` server trả với `PackageInfo.buildNumber` của máy.

### 3.7 Migration: viết lại tại chỗ, không giữ lịch sử schema cũ

`0002_apprelease.py` chưa có gì phụ thuộc (`grep` xác nhận không migration nào khác reference nó). Viết lại y hệt file đó với schema mới, cộng một `RunPython` seed đúng 1 row `platform='ANDROID'`. **Cảnh báo rủi ro ở §11** — cần xác nhận trước khi làm.

#### Quy trình áp dụng — vì sao không thể chỉ đổi nội dung file rồi `migrate` bình thường

Bảng `django_migrations` chỉ ghi nhận migration đã áp dụng theo **tên** (`app` + `name`), **không theo nội dung**. Nếu `core.0002_apprelease` đã từng `migrate` trên một DB, chỉ thay nội dung file giữ nguyên tên thì Django sẽ thấy "đã áp dụng rồi" và **bỏ qua hoàn toàn** — bảng vẫn giữ schema cũ trong khi `models.py` mới mô tả schema khác hẳn → query vào `AppRelease` lỗi ngay (`column does not exist`).

**Quyết định (đã xác nhận với PO — dự án chưa lên production, chỉ có DB local)**: rủi ro này không áp dụng vì chưa có môi trường staging/production nào đã chạy `0002_apprelease` cũ, chỉ cần xử lý trên (các) DB local đang dùng để dev. Quy trình rút gọn:

1. Trên từng DB local đã chạy `0002_apprelease` cũ: `docker-compose -f docker/docker-compose.yml exec web python manage.py migrate core 0001` (drop bảng `AppRelease` theo schema cũ).
2. Viết lại `0002_apprelease.py` với schema mới + `RunPython` seed.
3. `docker-compose -f docker/docker-compose.yml exec web python manage.py migrate` — tạo bảng theo schema mới, seed singleton row.

Nếu sau này dự án đã có staging/production chạy migration này, quy trình phải quay lại làm đầy đủ theo từng môi trường (không tái dùng tên migration một khi đã áp dụng trên môi trường có dữ liệu thật cần giữ) — ghi vào backlog vận hành, không phải việc của feature này.

---

## 4. Database (PostgreSQL)

```python
# core/models.py
class AppRelease(BaseModel):
    """
    Singleton — đúng một row, seed sẵn bởi migration (feature-37 §3.1). Upload
    APK mới là ghi đè bản hiện tại; version_code/version_name luôn đọc từ
    chính file APK, không bao giờ nhập tay (feature-37 §3.2).
    """

    PLATFORM_ANDROID = 'ANDROID'
    PLATFORM_CHOICES = [(PLATFORM_ANDROID, 'Android')]

    platform = models.CharField(
        max_length=10, choices=PLATFORM_CHOICES, default=PLATFORM_ANDROID, unique=True,
    )
    version_code = models.PositiveIntegerField(default=0, editable=False)
    version_name = models.CharField(max_length=32, default='0.0.0', editable=False)
    file = models.FileField(upload_to='releases/', null=True, blank=True)
    file_size = models.BigIntegerField(default=0, editable=False)
    sha256 = models.CharField(max_length=64, blank=True, editable=False)
    release_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'App Release'
        verbose_name_plural = 'App Releases'

    def __str__(self):
        return f'{self.get_platform_display()} {self.version_name} ({self.version_code})'

    @classmethod
    def current(cls):
        return cls.objects.first()

    def read_version_from_apk(self, uploaded_file):
        ...  # §3.2
```

**Migration** (`0002_apprelease.py`, viết lại tại chỗ):

```python
class Migration(migrations.Migration):
    dependencies = [('core', '0001_initial')]

    operations = [
        migrations.CreateModel(
            name='AppRelease',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('public_id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('platform', models.CharField(choices=[('ANDROID', 'Android')], default='ANDROID',
                                               max_length=10, unique=True)),
                ('version_code', models.PositiveIntegerField(default=0, editable=False)),
                ('version_name', models.CharField(default='0.0.0', editable=False, max_length=32)),
                ('file', models.FileField(blank=True, null=True, upload_to='releases/')),
                ('file_size', models.BigIntegerField(default=0, editable=False)),
                ('sha256', models.CharField(blank=True, editable=False, max_length=64)),
                ('release_notes', models.TextField(blank=True)),
            ],
            options={'verbose_name': 'App Release', 'verbose_name_plural': 'App Releases'},
        ),
        migrations.RunPython(seed_singleton, migrations.RunPython.noop),
    ]
```

`seed_singleton` tạo đúng 1 row `AppRelease(platform='ANDROID')` bằng historical model — để `has_add_permission` (§3.1) luôn `False` ngay từ lúc deploy.

> **PO review v1, Suggestion**: `seed_singleton` phải lấy model qua `apps.get_model('core', 'AppRelease')` (tham số `apps` mà Django truyền vào `RunPython`), **không** `from core.models import AppRelease` trực tiếp — import thẳng model hiện tại là lỗi kinh điển trong migration, sẽ vỡ nếu model tiếp tục đổi ở migration sau mà seed function đã "đông cứng" schema tại thời điểm viết.

---

## 5. Backend (Django)

### 5.1 Dependency

`requirements.txt`: thêm `pyaxmlparser>=0.3.30`. Pure Python (không cần JDK/`apksigner` như phương án "verify chữ ký" mà feature-36 từng cân nhắc rồi bỏ) — chỉ đọc `AndroidManifest.xml` nhị phân bên trong ZIP của APK. Pin bản cụ thể trong `requirements-lock.txt` theo quy ước hiện có của repo.

### 5.2 `GET /api/app/version/` (§3.6)

```python
# core/serializers.py
class AppReleaseSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = AppRelease
        fields = ['version_code', 'version_name', 'release_notes',
                  'download_url', 'file_size', 'sha256']

    def get_download_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


# core/views_app.py
class AppVersionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        release = AppRelease.current()
        if release is None or not release.file:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(AppReleaseSerializer(release, context={'request': request}).data)
```

`urls_app.py` chỉ còn 1 route (`version/`) — xoá route `ios/manifest.plist`.

### 5.3 Admin

Đầy đủ ở §3.3.

### 5.4 Files xoá hẳn

| File | Lý do |
|---|---|
| `core/services/release_pruning.py` | Chỉ có 1 bản, không còn gì để prune |
| `core/management/commands/prune_app_releases.py` | Không còn tác dụng |
| `core/tests/test_release_pruning.py` | Test của code đã xoá |
| `core/services/app_version.py` | `parse_version_code`/`resolve_status` không còn ai gọi — client tự so |
| `core/services/version_spread.py` | Chỉ phục vụ quyết định đặt `min_supported_version_code` — field đó đã bỏ |
| `templates/app/manifest.plist` | iOS OTA đã bỏ |
| Setting `APP_RELEASE_KEEP_FILES` | Không còn pruning |

`ios_manifest` (view) và route tương ứng cũng xoá khỏi `views_app.py`/`urls_app.py`.

---

## 6. Mobile (Flutter)

### 6.1 Chỉ chạy trên Android

```dart
// update_cubit.dart
Future<void> check({bool force = true}) async {
  if (Platform.isIOS) return; // TestFlight lo hết — feature-37 §3.5
  if (!force && !_store.shouldCheck()) return;
  ...
}
```

`startUpdate()` bỏ hẳn nhánh `if (Platform.isIOS) { launchUrl(...) }` — không còn đường nào tạo ra `download_url` dạng `itms-services://` nữa nên nhánh đó chết hoàn toàn, xoá cho gọn.

### 6.2 Domain model đơn giản hoá

`update_models.dart`:
- `AppVersionInfo` bỏ `minSupportedVersionCode`, `status`, hàm `statusFor()`.
- `UpdateDecision` chỉ còn `NoUpdate` / `NudgeUpdate` — xoá `BlockUpdate`.
- Xoá hẳn class `LastVerdict`.

`update_decider.dart` — gộp về đúng một hàm so sánh:

```dart
class UpdateDecider {
  const UpdateDecider();

  UpdateDecision decide({
    required AppVersionInfo info,
    required int? clientVersionCode,
    required bool isSkipped,
  }) {
    if (clientVersionCode == null) return const NoUpdate();
    if (clientVersionCode >= info.versionCode) return const NoUpdate();
    if (isSkipped) return const NoUpdate();
    return NudgeUpdate(info);
  }
}
```

Xoá `fromServer`/`fromStoredVerdict` — không còn verdict nào cần "dính" qua lỗi mạng (§3.4). Kiểm tra thất bại thì im lặng giữ nguyên state hiện tại, thử lại ở lần kiểm kế tiếp (mở app / resume sau 6h — nhịp này giữ nguyên).

### 6.3 `UpdateStore`

Xoá `_verdictKey`, `writeVerdict()`, `readVerdict()`. Giữ nguyên `shouldCheck()`/`markChecked()` (nhịp 6h) và `isSkipped()`/`skip()` (bỏ qua theo `version_code`, dọn bản ghi cũ hơn bản đang chạy) — hai cái này không liên quan gì tới cơ chế chặn, vẫn còn tác dụng với modal nhắc.

### 6.4 `UpdateGate` / `UpdateView`

Bỏ case `BlockUpdate` trong `_present()` (cùng với `PopScope(canPop: false, ...)`). Chỉ còn:

```dart
switch (decision) {
  case NudgeUpdate(:final info):
    ...
    await showDialog<void>(context: context, builder: (_) => UpdateView(info: info));
  case NoUpdate():
    break;
}
```

`UpdateView` bỏ tham số `blocking` — luôn có 2 nút "Bỏ qua"/"Cập nhật". Giữ nguyên toàn bộ phần hiển thị tiến trình tải, lỗi, nút "Mở cài đặt" khi thiếu quyền — đó là phần cài đặt Android, không liên quan tới chặn.

### 6.5 `UpdateRepository`

```dart
Future<AppVersionInfo?> fetch() async {
  final response = await _api.get<Map<String, dynamic>>('/app/version/');
  if (response.statusCode == HttpStatus.noContent || response.data == null) return null;
  return AppVersionInfo.fromJson(response.data!);
}
```

Bỏ tham số `platform`/`version_code` khỏi query — endpoint không còn nhận (§3.6). `download()`, `refreshDownloadUrl()` giữ nguyên.

### 6.6 Không đổi — luồng tải + verify + cài Android

`AndroidInstaller` (`installer.dart`), `MainActivity.kt` (MethodChannel `canRequestInstall`/`installApk`), `FileProvider` + `file_paths.xml`, quyền `REQUEST_INSTALL_PACKAGES`/`INTERNET` trong `AndroidManifest.xml`, sha256 verify theo stream trong `UpdateCubit._downloadAndInstall` — **giữ nguyên 100%** theo quyết định đã chốt (§0, câu hỏi PO).

---

## 7. Bảo mật

| Rủi ro | Xử lý |
|---|---|
| File upload không phải APK hợp lệ | `pyaxmlparser.APK()` raise exception → `ValidationError` trên form, không lưu gì (§3.2, §3.3) |
| APK giả mạo | Không đổi so với feature-36: Android tự chối cài đè APK ký khác key; sha256 chỉ bắt lỗi toàn vẹn tải, không phải bằng chứng xác thực |
| Link tải công khai (`AllowAny`) | Không đổi: APK không chứa bí mật, nội dung nằm sau auth + DRM |
| Downgrade `version_code` | Chặn ở `read_version_from_apk()` — phải cao hơn bản đang có mới cho lưu (§3.2) |
| Publish nhầm version_code/version_name | Không còn khả năng — hai field này không nhập tay được nữa (`editable=False`, tự đọc từ file) |

---

## 8. Test plan

### Backend — mới

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| T37-1 | Upload APK hợp lệ lần đầu | `version_code`/`version_name`/`sha256`/`file_size` tự set đúng theo nội dung APK |
| T37-2 | Upload APK có `version_code` ≤ bản hiện tại | `ValidationError` trên field `file`, không lưu |
| T37-3 | Upload file không phải APK (vd. text file) | `ValidationError`, không lưu |
| T37-4 | Upload APK mới thành công (version_code cao hơn) | File cũ bị xoá khỏi storage (kể cả Supabase), row vẫn còn đúng 1 |
| T37-5 | Upload APK mới **thất bại** validate | File cũ **không bị đụng tới** |
| T37-6 | `has_add_permission` sau khi migration chạy | Luôn `False` |
| T37-7 | Cố tạo thêm 1 `AppRelease` row thứ hai qua ORM trực tiếp | `IntegrityError` (unique `platform`) |
| T37-8 | `GET /api/app/version/` khi row seed chưa có file | `204` |
| T37-9 | `GET /api/app/version/` sau khi có bản publish | `200`, đủ field, không có `platform`/`min_supported_version_code`/`update_status` |
| T37-10 | Endpoint không cần `Authorization` | `200`/`204` không kèm token |

### Backend — xoá cùng file bị xoá
`test_release_pruning.py` (toàn bộ), phần test liên quan `platform`, `min_supported_version_code`, `is_published`, iOS trong `test_app_release.py` — viết lại file này cho khớp model mới.

### Mobile

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| T37-11 | `clientVersionCode < info.versionCode`, chưa skip | `NudgeUpdate` |
| T37-12 | Đã skip đúng version đó | `NoUpdate` |
| T37-13 | `clientVersionCode >= info.versionCode` | `NoUpdate` |
| T37-14 | `check()` gọi trên `Platform.isIOS` | Không gọi API, không emit gì khác `NoUpdate` mặc định |
| T37-15 | Kiểm tra lỗi mạng | Giữ nguyên state trước đó (không còn "verdict dính" để test riêng) |

Viết lại `update_decider_test.dart`, `update_cubit_test.dart` cho khớp API mới; `update_store_test.dart` bỏ phần test `writeVerdict`/`readVerdict`.

Luồng tải + cài Android **vẫn phải test tay trên máy thật** như feature-36 đã ghi — không đổi gì ở lớp này nên không cần test lại từ đầu, chỉ hồi quy nhanh.

---

## 9. Files thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/requirements.txt`, `requirements-lock.txt` | Thêm `pyaxmlparser>=0.3.30` |
| `src/backend/core/models.py` | Viết lại `AppRelease` (§4) |
| `src/backend/core/migrations/0002_apprelease.py` | Viết lại tại chỗ + seed row (§4) |
| `src/backend/core/admin.py` | Viết lại `AppReleaseForm`/`AppReleaseAdmin` (§3.3) |
| `src/backend/core/serializers.py` | `AppReleaseSerializer` mới |
| `src/backend/core/views_app.py` | Viết lại `AppVersionView`, xoá `ios_manifest` |
| `src/backend/core/urls_app.py` | Xoá route `ios/manifest.plist` |
| `src/backend/core/services/app_version.py` | **Xoá** |
| `src/backend/core/services/release_pruning.py` | **Xoá** |
| `src/backend/core/services/version_spread.py` | **Xoá** |
| `src/backend/core/management/commands/prune_app_releases.py` | **Xoá** |
| `src/backend/templates/app/manifest.plist` | **Xoá** |
| `src/backend/config/settings.py` | Xoá `APP_RELEASE_KEEP_FILES` |
| `src/backend/core/tests/test_app_release.py` | Viết lại theo model mới |
| `src/backend/core/tests/test_release_pruning.py` | **Xoá** |
| `src/mobile/lib/features/update/domain/update_models.dart` | Bỏ `BlockUpdate`, `LastVerdict`, field/hàm liên quan chặn |
| `src/mobile/lib/features/update/domain/update_decider.dart` | Gộp về 1 hàm `decide()` |
| `src/mobile/lib/features/update/data/update_store.dart` | Xoá `writeVerdict`/`readVerdict` |
| `src/mobile/lib/features/update/data/update_repository.dart` | Bỏ query param `platform`/`version_code` |
| `src/mobile/lib/features/update/presentation/update_cubit.dart` | `check()` return sớm trên iOS; bỏ nhánh iOS trong `startUpdate()` |
| `src/mobile/lib/features/update/presentation/update_gate.dart` | Bỏ case `BlockUpdate`/`PopScope` |
| `src/mobile/lib/features/update/presentation/update_view.dart` | Bỏ tham số `blocking` |
| `src/mobile/test/features/update/*.dart` | Cập nhật theo API mới |
| `md/TASKS.md` | Thêm mục Feature 37, link design doc, ghi chú thay thế phần lớn feature-36 (PO review v1, Suggestion) |

**Không đổi**: `src/mobile/lib/core/update/installer.dart`, `MainActivity.kt`, `AndroidManifest.xml`, `file_paths.xml`, `MobileDeviceAdmin` (`app_version` filter — giữ, không liên quan).

---

## 10. Trade-off & lưu ý

- **Không còn cách ép cập nhật.** Chấp nhận theo yêu cầu (§3.4). Nếu sau này cần vá bảo mật khẩn cấp, phải thêm lại cơ chế chặn — không phải việc của feature này.
- **Không còn lịch sử phát hành.** Muốn biết "bản trước là gì" phải tra ngoài band (git tag, ghi chú thủ công) — bảng DB không giữ nữa.
- **Đọc cả file APK vào RAM để parse + hash** (§3.2) — chấp nhận được vì `pyaxmlparser(raw=True)` đằng nào cũng cần vậy; với APK ~60-160MB, RAM của worker Django xử lý request upload này cần đủ dư (không phải vấn đề mới — request body vốn đã phải chứa cả file).

---

## 11. Rủi ro cần PO xác nhận trước khi implement

1. **Xoá/viết lại migration `0002_apprelease.py`** đồng nghĩa **mất toàn bộ dữ liệu `AppRelease` hiện có** (kể cả file trên storage nếu không dọn tay) khi migrate lại từ đầu trên một DB đã từng chạy migration cũ. Feature-36 mới xong hôm 30/8 (hôm qua) nên khả năng cao **chưa có bản phát hành thật nào ngoài dữ liệu test** — nhưng cần xác nhận: môi trường nào (dev/staging/production) đã áp dụng `0002_apprelease.py`, và có APK/IPA thật nào đang được client dùng cần giữ lại thông tin không.
   - ✅ **Đã xử lý (v2)**: quy trình unapply → đổi file → apply lại được ghi cụ thể ở §3.7. Người implement phải chạy `showmigrations core` trên từng môi trường trước khi đổi file, theo đúng thứ tự đó.
2. **Bỏ hẳn `min_supported_version_code`** — xác nhận lại là chấp nhận đánh đổi này (đã hỏi và có câu trả lời ở đầu phiên, nhắc lại ở đây để PO duyệt chính thức cùng doc).
3. **iOS bỏ hoàn toàn khỏi luồng này** — xác nhận app hiện tại (hoặc bản sắp submit) đã/sẽ có trên TestFlight, không còn máy nào phụ thuộc vào luồng ad-hoc `itms-services://` cũ.

---

## 12. Backlog (không làm ở feature này)

- Khôi phục ngưỡng chặn bắt buộc nếu về sau cần ép vá bảo mật khẩn.
- Giữ lịch sử phát hành nếu nhu cầu audit "ai đang chạy bản nào" quay lại.
