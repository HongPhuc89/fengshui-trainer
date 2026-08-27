# Feature 34 — Mobile Device: bảng riêng, khoá 1 máy/user, đổi máy bằng mã kích hoạt Admin cấp

## Document Information
- **Feature**: Bảng `MobileDevice` riêng + endpoint login riêng + Client ID bền vững + đổi máy bắt buộc qua mã kích hoạt do admin cấp
- **Status**: Draft v4 — chờ PO review
- **Created**: 2026-08-27
- **Updated**: 2026-08-27
  - v2: tách endpoint mobile theo góp ý PO
  - v3: PO chốt không cho tự đổi máy — thay OTP self-rebind bằng `DeviceActivationKey`
  - v4: **PO đề xuất tách bảng riêng — chấp nhận.** Bổ sung §3.3 (lập luận dài hạn, tách khỏi chi phí chuyển đổi) và §3.4 (`AbstractDevice`). Bỏ `platform` discriminator, bỏ proxy model, tạo bảng `users_mobiledevice` độc lập. Xem §3.2 để biết vì sao kết luận đổi so với v1–v3.
- **Related**: `feature-1-auth.md`, `feature-20-mobile-app.md`, `feature-32-forgot-password-otp.md`, `feature-33-device-geo-location.md`

---

## 1. Tóm tắt

Mobile và web đang dùng chung endpoint login, chung bảng `users_userdevice`, chung hạn mức `MAX_DEVICES = 5`, và chung cơ chế "login mới revoke tất cả device cũ". Hệ quả: mở web trên vài trình duyệt là hết quota nên app mobile không đăng nhập được; đăng nhập mobile thì văng session web và ngược lại.

Giải pháp v4:

1. **Bảng riêng `users_mobiledevice`** — mobile và web là hai thực thể độc lập. `users_userdevice` trở thành bảng web-only, `user.devices` tự động chỉ còn web device.
2. **Endpoint riêng** — `POST /api/auth/mobile/login/`, `POST /api/auth/mobile/activate/`.
3. **Khoá 1 user = 1 mobile device**, enforce ở tầng DB bằng partial unique index đơn giản.
4. **Đổi máy bắt buộc qua mã kích hoạt** — model `DeviceActivationKey`, admin cấp mã `TT-4KM9-X7QP-2N5R`. Không có đường tự phục vụ nào.
5. **Định danh bền vững** — client ID neo vào hardware anchor, nên **cài lại app / cập nhật OS không bị coi là đổi máy** và không cần xin mã.

Web frontend **không cần sửa gì**. Web serializer chỉ còn **1 dòng** phải sửa (xem §3.2).

---

## 2. Phân tích hiện trạng

### 2.1 Luồng hiện tại

`users/serializers/auth.py::CustomLoginSerializer.validate()`:

```python
current_device_key = normalize_device_key(current_device_id)
key_match = Q(device_id=current_device_key) | Q(device_id__startswith=f"{current_device_key}_")
device = user.devices.filter(key_match).first()

if device is None and user.devices.count() >= MAX_DEVICES:      # (1)
    raise ValidationError(...)

for token in OutstandingToken.objects.filter(user=user):        # (2)
    BlacklistedToken.objects.get_or_create(token=token)

user.devices.exclude(key_match).update(status='REVOKED')        # (3)
```

### 2.2 Các vấn đề đã xác định

| # | Vấn đề | Vị trí | Mức độ |
|---|---|---|---|
| **P1** | Mobile gửi `device_type` = `"ios"` / `"android"`, backend chỉ chấp nhận `MOBILE_IOS` / `MOBILE_ANDROID` / `WEB` → **login mobile trả 400 ngay tại `ChoiceField`** | `device_service.dart:28` vs `models/device.py:11` | 🔴 Blocker |
| **P2** | `user.devices.count()` đếm **tất cả** device kể cả WEB → user hết slot vì trình duyệt, mobile bị chặn | `auth.py` dòng (1) | 🔴 Đúng vấn đề PO nêu |
| **P3** | Login bất kỳ platform nào cũng revoke **toàn bộ** device khác + blacklist **toàn bộ** refresh token → mobile đá web, web đá mobile | `auth.py` dòng (2)(3) | 🔴 |
| **P4** | `normalize_device_key()` cắt theo `_` lấy 2 segment đầu — nguy hiểm nếu mobile dùng ID có `_` | `users/utils.py:16` | 🟠 |
| **P5** | `device_name` client gửi **bị ghi đè** bởi `parse_device_name(User-Agent)`. Dio gửi UA `Dart/3.x` → admin thấy `"Browser / Unknown OS"` | `auth.py` | 🟠 |
| **P6** | `is_primary_bound` không bao giờ được set `True` → `DeviceStatusView` luôn trả `bound_device = null` | `views/profile.py:145` | 🟡 |
| **P7** | Android Auto Backup và iCloud Keychain sync sẽ **clone client id** sang máy thứ hai | `device_service.dart` | 🟠 |
| **P8** | Gỡ/cài lại app trên Android xoá secure storage → client id mới → bị tính là **máy mới** | `device_service.dart` | 🔴 |

### 2.3 Dữ kiện quyết định: production **chưa có** mobile device nào

Kiểm chứng trong repo:

```bash
$ git log -S "MOBILE_IOS" --oneline -- src/mobile
(không có kết quả — code mobile chưa từng chứa MOBILE_IOS)

$ grep device_type src/backend/users/migrations/0001_initial.py
choices=[('MOBILE_IOS', 'iOS'), ('MOBILE_ANDROID', 'Android'), ('WEB', 'Web')]
(bộ choices chưa từng đổi kể từ migration đầu tiên)
```

`RegisterSerializer` thì loại bỏ hoàn toàn field device. Vậy con đường duy nhất tạo row mobile là login — và login **luôn** 400 vì P1.

⟹ **`users_userdevice` trên production chỉ chứa row WEB.** Đây là dữ kiện then chốt: nó biến việc tách bảng từ "migration chuyển dữ liệu giữa hai bảng" thành "tạo bảng mới, không có gì để chuyển". *(Cần PO xác nhận — câu 1 §14.)*

### 2.4 Yêu cầu nghiệp vụ

- **R1** — Mỗi user có tối đa **1 mobile device ACTIVE** tại một thời điểm.
- **R2** — Mobile device có mã định danh ngắn, đọc được, tra cứu được trên Admin.
- **R3** — Đếm/giới hạn mobile **độc lập hoàn toàn** với web device.
- **R4** — Admin xem, tra cứu, **gỡ liên kết** mobile device, có audit log.
- **R5** — Web giữ nguyên hành vi hiện tại.
- **R6** — User **đăng nhập lại trên cùng máy vật lý luôn thành công**, kể cả sau khi logout, cài lại app, hoặc nâng cấp OS.
- **R7** — User **không có đường nào tự đổi sang máy khác**. Đổi máy **chỉ** bằng mã kích hoạt do admin cấp.

---

## 3. Quyết định kiến trúc

### 3.1 Tách endpoint login riêng cho mobile — **Có**

| Thành phần | Web | Mobile |
|---|---|---|
| Endpoint | `POST /api/auth/login/` | `POST /api/auth/mobile/login/` + `mobile/activate/` |
| Serializer | `CustomLoginSerializer` | `MobileLoginSerializer`, `MobileActivateSerializer` |
| Throttle | `LoginRateThrottle` | `MobileLoginRateThrottle`, `ActivationRateThrottle` |
| Mã lỗi | `DEVICE_LIMIT_REACHED` | `ACTIVATION_REQUIRED` |
| Quota | 5 | 1 |

Phần dùng chung rút vào `users/services/auth.py`:

```python
def authenticate_user(email: str, password: str):
    """Resolve credentials to a User, raising the same errors both login flows use."""

def issue_tokens_for_device(user, device, platform: str) -> dict:
    """Mint an access/refresh pair carrying the device_id and platform claims."""
```

### 3.2 Bảng riêng hay chung bảng? — **Bảng riêng** ✅

**Kết luận này ngược với v1–v3.** Ở v1 tôi chọn chung bảng, và lý do khi đó đúng với v1 nhưng không còn đúng với v4: khi đó mobile và web dùng **chung endpoint login**, và mobile chỉ thêm 2–3 cột. Đến v4, mobile đã có **endpoint riêng, mã kích hoạt riêng, hardware anchor riêng, 6 cột riêng**. Bối cảnh đổi thì kết luận phải đổi theo.

#### Điều làm tôi đổi ý — `user.devices` tự sạch

Nếu mobile ở bảng riêng, `user.devices` (related_name của `UserDevice`) **tự động chỉ còn web device**. Ba dòng hỏng ở §2.1 trở thành:

| Dòng | Chung bảng (v3) | **Bảng riêng (v4)** |
|---|---|---|
| (1) `user.devices.count() >= MAX_DEVICES` | Phải thêm `.filter(platform='WEB')` | ✅ **Đúng sẵn, không sửa gì** |
| (3) `user.devices.exclude(key_match).update(REVOKED)` | Phải thêm `.filter(platform='WEB')` | ✅ **Đúng sẵn, không sửa gì** |
| (2) `OutstandingToken.objects.filter(user=user)` blacklist tất cả | Phải scope theo device | ⚠️ Vẫn phải scope |

**Số dòng phải sửa trên code login web đang chạy production: từ 3 xuống còn 1.** Và dòng còn lại thì phương án nào cũng phải sửa. Đây là lập luận mạnh nhất, mạnh hơn mọi lập luận về sự sạch sẽ của schema.

#### Schema sạch hơn — những thứ **biến mất**

| Ở v3 (chung bảng) | Ở v4 (bảng riêng) |
|---|---|
| Cột `platform` discriminator | ❌ Không cần |
| `CheckConstraint(mobile_client_requires_client_code)` | ❌ `client_code` thành `NOT NULL` tự nhiên |
| `UniqueConstraint(..., condition=Q(platform='MOBILE', status='ACTIVE'))` | ✅ `condition=Q(status='ACTIVE')` — gọn hơn |
| `UniqueConstraint(..., condition=Q(platform='MOBILE', hardware_hash__isnull=False))` | ✅ Bỏ mệnh đề `platform` |
| Proxy model `MobileClient` + `MobileClientManager` | ❌ Đăng ký `MobileDevice` thẳng vào admin |
| Map `DEVICE_TYPE_PLATFORM`, dict `DEVICE_QUOTA` | ❌ Không cần |
| Tham số `normalize_device_key(platform=...)` | ❌ Mobile không gọi hàm này → **P4 biến mất khỏi thiết kế** |
| 6 cột NULL trên mọi row web (`client_code`, `hardware_hash`, `app_version`, `os_version`, `device_model`, `bound_at`) | ❌ Không tồn tại ở bảng web |
| Cột `user_agent`, `is_primary_bound` vô nghĩa với mobile | ❌ Không tồn tại ở bảng mobile |
| `DeviceActivationKey.used_device` trỏ vào bảng lẫn lộn 2 loại | ✅ Trỏ thẳng `MobileDevice` |

#### Chi phí thật của việc tách

| Hạng mục | Chi phí | Ghi chú |
|---|---|---|
| **Migration dữ liệu** | ~0 | §2.3: production chưa có row mobile nào. Chỉ `CreateModel` |
| **Foreign key phải sửa** | **0** | `grep` toàn repo: **không có FK nào** trỏ tới `UserDevice` |
| `DeviceJWTAuthentication` phải biết tra bảng nào | ~15 dòng | Thêm claim `platform` vào JWT (§7.9) |
| Geo (F33) phải chạy cho cả 2 model | ~20 dòng | `save_geo_to_device(device)` đã duck-typed sẵn (§7.10) |
| Số file chạm tới | 10 | Cùng con số với phương án chung bảng |

#### Bảng so sánh cuối

| | **Chung bảng** (v3) | **Bảng riêng** (v4) ✅ |
|---|---|---|
| Dòng phải sửa ở login web | 3 | **1** |
| Constraint có mệnh đề điều kiện thừa | 3 | 0 |
| Cột NULL vô nghĩa | 6 trên mỗi row web | 0 |
| Migration dữ liệu | Backfill + dedupe | **Không có gì để chuyển** |
| Code thêm | 0 | ~35 dòng (JWT claim + geo) |
| Đọc schema hiểu ngay 2 chính sách khác nhau | ❌ | ✅ |

**Chọn bảng riêng.** ~35 dòng thêm vào là cái giá rẻ để đổi lấy: bớt 2 lần chạm vào code login web đang chạy, bỏ hết constraint điều kiện, và không phải viết migration chuyển dữ liệu.

> ⚠️ **Lưu ý về bản chất các con số trên:** ba dòng đầu bảng (dòng phải sửa, migration, rollback) là **chi phí chuyển đổi một lần**, không phải chi phí dài hạn. Chúng đúng, nhưng không phải lý do chính để chọn tách. Lý do dài hạn nằm ở §3.3.

### 3.3 Lập luận dài hạn: vì sao tách vẫn đúng kể cả khi bỏ qua chi phí chuyển đổi

Giả sử migration chuyển dữ liệu là miễn phí và web serializer không phải sửa dòng nào — phương án nào tốt hơn về dài hạn? Vẫn là tách, vì bốn lý do dưới đây, xếp theo sức nặng.

#### 3.3.1 Chung bảng khiến lỗi P2 **có thể tái sinh mãi mãi**

`user.devices.count()` đếm nhầm cả mobile — đó chính là P2, lỗi đang gây ra feature này. Chung bảng thì ta sửa nó bằng cách thêm `.filter(platform='WEB')` vào **những chỗ đang biết**. Nhưng `user.devices` vẫn tiếp tục là một related manager trả về cả hai loại. Bất kỳ ai sau này viết:

```python
if user.devices.count() >= MAX_DEVICES:      # quên filter → P2 quay lại
if user.devices.filter(status='ACTIVE').exists():
user.devices.update(status='REVOKED')        # revoke nhầm cả mobile → P3 quay lại
```

đều tạo lại đúng lớp bug đó. Không compiler, không type checker, không test nào bắt được — vì câu lệnh **hợp lệ**, chỉ trả về sai tập dữ liệu. Lỗi chỉ lộ khi có user dùng cả hai nền tảng.

Tách bảng thì `user.devices` **về mặt định nghĩa** chỉ chứa web, `user.mobile_devices` chỉ chứa mobile. Viết sai là truy vấn sai model — sai ngay và sai to.

> Đây là khác biệt giữa *sửa một lỗi* và *loại bỏ khả năng phát sinh lỗi đó*. Với code sống nhiều năm qua tay nhiều người, cái thứ hai đáng giá hơn nhiều.

#### 3.3.2 Hai thực thể đang **phân kỳ**, không hội tụ

Nhìn quỹ đạo qua bốn phiên bản của chính tài liệu này:

| Phiên bản | Phần riêng của mobile |
|---|---|
| v1 | 2 cột (`client_code`, metadata) |
| v3 | 6 cột + bảng `DeviceActivationKey` + hardware anchor |
| v4 | 7 cột + endpoint riêng + luồng auth riêng |

Những thứ đã thấy trong roadmap chỉ làm khoảng cách rộng thêm: FCM push token, biometric unlock, App Attest / Play Integrity, offline license, force-update theo `app_version` — **toàn bộ mobile-only**. Phía web thì WebAuthn, cookie session, fingerprint thế hệ mới — **toàn bộ web-only**.

Bảng chung mà >60% cột là đặc thù nền tảng thì không còn là một thực thể; nó là hai thực thể mặc chung một cái áo. Và tỷ lệ đó chỉ tăng.

#### 3.3.3 Constraint điều kiện là thuế bảo trì cộng dồn

Chung bảng thì **mọi** constraint liên quan mobile phải mang theo mệnh đề `platform='MOBILE'`:

```python
UniqueConstraint(fields=['user'], condition=Q(platform='MOBILE', status='ACTIVE'))
UniqueConstraint(fields=['user','hardware_hash'], condition=Q(platform='MOBILE', hardware_hash__isnull=False))
CheckConstraint(check=~Q(platform='MOBILE') | Q(client_code__isnull=False))
```

Mỗi constraint mới trong tương lai phải nhớ thêm mệnh đề đó. Quên một lần → ràng buộc âm thầm áp sai lên cả row web. Ngoài ra `client_code` buộc phải `NULL`-able (vì web không có), nên tính toàn vẹn phải mô phỏng bằng `CheckConstraint` thay vì để `NOT NULL` làm đúng việc của nó.

Tách bảng thì constraint nói đúng nghĩa của nó, `client_code` là `NOT NULL` thật, `CheckConstraint` biến mất.

#### 3.3.4 Vòng đời và chính sách lưu trữ đối lập

| | Web device | Mobile device |
|---|---|---|
| Vòng đời | Ngắn, dùng xong bỏ | Một liên kết dài hạn |
| Tần suất tạo | Cao (đổi trình duyệt, xoá site data) | Rất thấp |
| Hạn mức | 5 | 1 |
| Ai đổi được | User tự do | Chỉ staff |
| Giữ lịch sử | Có thể dọn định kỳ | **Phải giữ vĩnh viễn** (audit đổi máy) |

Chính sách retention đối lập là dấu hiệu rõ của hai thực thể. Chung bảng thì mọi job dọn dẹp trong tương lai đều phải mang mệnh đề loại trừ mobile — lại đúng lớp bug ở §3.3.1.

#### 3.3.5 Tính bất đối xứng của quyết định

- **Chung bảng bây giờ → tách sau**: phải chuyển dữ liệu thật giữa hai bảng, đổi FK `DeviceActivationKey.used_device` đang trỏ vào bảng chung, và rà lại mọi truy vấn `user.devices` đã viết trong lúc chờ.
- **Tách bây giờ → gộp sau**: cũng cần migration, nhưng chỉ làm nếu hai bên hội tụ — mà §3.3.2 cho thấy chúng đang đi ngược lại.

Nói cách khác, **giá trị quyền chọn "tách" giảm dần theo thời gian**: hôm nay tách gần như miễn phí (§2.3 — chưa có row mobile nào), mỗi tháng trôi qua nó đắt thêm.

#### 3.3.6 Phản biện công bằng: discriminator **không biến mất**, nó chuyển chỗ

Ở §3.2 tôi viết "cột `platform` biến mất". Nói vậy chưa đủ chính xác: `DeviceJWTAuthentication` vẫn phải biết token thuộc nền tảng nào để tra đúng bảng, nên discriminator **chuyển từ cột DB sang claim trong JWT** (§7.9).

Nhưng đây không phải hoà. Khác biệt nằm ở **cách hệ thống hỏng khi ai đó quên nó**:

| | Discriminator là cột DB | Discriminator là claim JWT |
|---|---|---|
| Quên xử lý | Truy vấn trả **sai tập dữ liệu**, không báo lỗi | Xác thực **thất bại ngay**, test đỏ |
| Số chỗ phải nhớ | Mọi queryset chạm `user.devices` — không giới hạn | Đúng **hai** chỗ: phát hành token, verify token |
| Ai phát hiện | User, sau nhiều tuần | CI, sau vài phút |

Chuyển một điểm-dễ-quên từ nơi hỏng-âm-thầm sang nơi hỏng-ồn-ào là cải thiện thật, không phải đổi chỗ cho có.

#### 3.3.7 Điểm yếu thật của tách bảng — và cách xử lý

| Điểm yếu | Mức độ | Xử lý |
|---|---|---|
| Field dùng chung khai báo hai lần → **lệch dần** theo thời gian | Thật, và là điểm yếu đáng kể nhất | `AbstractDevice` — §3.4 |
| Truy vấn "tất cả thiết bị của user X" cần 2 query | Nhỏ | Helper `all_devices(user)` gộp kết quả; admin đã có 2 trang riêng nên thực tế ít cần |
| Hành vi chung (geo, revoke, blacklist) viết hai lần | Thật | Đã nằm sẵn ở service dùng chung: `services/geo.py` (duck-typed), `services/tokens.py` (chạy trên `device_id`, không phụ thuộc model) |
| Sau này thêm desktop app | Nhỏ | Desktop giống mobile hơn giống web (binding dài hạn) → kế thừa `AbstractDevice`, không viết lại |

### 3.4 `AbstractDevice` — trả lời cho điểm yếu "lệch dần"

Nguy cơ lớn nhất của tách bảng là hai model dùng chung ~10 field mà khai báo ở hai chỗ, rồi theo thời gian lệch nhau (một bên đổi `max_length`, bên kia quên). Giải pháp chuẩn của Django: **abstract base model**.

```python
class AbstractDevice(BaseModel):
    # Fields and behaviour shared by every kind of bound device.
    #
    # Concrete subclasses declare their own `user` FK so each keeps a
    # related_name that reads correctly (`user.devices` for web,
    # `user.mobile_devices` for mobile) — the one thing that must NOT be shared.
    STATUS_CHOICES = [('ACTIVE', 'Active'), ('REVOKED', 'Revoked')]

    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    last_ip = models.GenericIPAddressField(null=True, blank=True)
    last_active = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    # Geo location derived from last_ip (feature-33). save_geo_to_device() is
    # written against exactly these four fields, so it works on any subclass.
    geo_city = models.CharField(max_length=100, null=True, blank=True)
    geo_region = models.CharField(max_length=100, null=True, blank=True)
    geo_country_code = models.CharField(max_length=2, null=True, blank=True)
    geo_fetched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.status == 'REVOKED' and self.revoked_at is None:
            self.revoked_at = timezone.now()
        return super().save(*args, **kwargs)
```

Phân bổ field sau khi có base:

| | `AbstractDevice` | `MobileDevice` thêm | `UserDevice` thêm |
|---|---|---|---|
| Số field | 10 | 7 | 2 |
| Nội dung | `device_id`, `device_name`, `status`, `last_ip`, `last_active`, `revoked_at`, 4 × `geo_*` | `client_code`, `hardware_hash`, `device_type`, `device_model`, `os_version`, `app_version`, `bound_at` | `user_agent`, `is_primary_bound` |

Tỷ lệ 10 chung / 9 riêng cho thấy abstract base có giá trị thật — không phải trừu tượng hoá cho có. Nó cũng làm `save_geo_to_device()` có một kiểu dữ liệu rõ ràng để dựa vào, thay vì duck-typing ngầm.

**Quan trọng: `user` FK KHÔNG nằm trong base.** Django cho phép `related_name='%(class)ss'` ở abstract base, nhưng như vậy `user.devices` hiện tại sẽ đổi thành `user.userdevices` — phá code web đang chạy. Khai báo `user` ở từng model con tốn 2 dòng lặp, đổi lại giữ nguyên `related_name='devices'` cho web và đặt `'mobile_devices'` cho mobile.

#### Thứ tự áp dụng — không làm cùng lúc

Cho `UserDevice` kế thừa `AbstractDevice` là **thay đổi định nghĩa model web đang chạy production**. Django so sánh tập field kết quả nên về lý thuyết sinh migration rỗng, nhưng chỉ một khác biệt nhỏ về thuộc tính field cũng đẻ ra `AlterField` ngoài ý muốn.

| Giai đoạn | Việc | Rủi ro |
|---|---|---|
| **Release này** | Tạo `AbstractDevice`; **chỉ** `MobileDevice` kế thừa. `UserDevice` không đụng tới | Bằng 0 với web |
| **Commit dọn dẹp sau** | `UserDevice` kế thừa `AbstractDevice` + đổi tên thành `WebDevice` (§3.5). Bắt buộc chạy `makemigrations --dry-run` và xác nhận **không** sinh `AlterField` nào | Cô lập, diff toàn thay đổi cơ học |

Cách này lấy được lợi ích dài hạn của abstract base mà không đưa thêm rủi ro nào vào release đã thay đổi nhiều thứ về logic thiết bị.

### 3.5 Có nên đổi tên `UserDevice` thành `WebDevice`?

Sau khi tách, `UserDevice` chỉ còn chứa web device nên tên hiện tại hơi lệch nghĩa.

**Đề xuất: không đổi tên trong release này.** `migrations.RenameModel` thì rẻ (không có FK nào), nhưng phải sửa chuỗi tham chiếu ở `admin.py`, `settings.py` (icon Jazzmin `"users.UserDevice"`), `serializers/auth.py`, `authentication.py`, `tasks.py`, `signals.py`, `views/profile.py`, `management/commands/fetch_device_geo.py`. Nếu sót một chỗ, lỗi sẽ lẫn vào giữa một release đã thay đổi nhiều thứ về logic thiết bị — rất khó khoanh vùng.

Làm thành **commit dọn dẹp riêng sau khi feature này chạy ổn**: lúc đó mọi thay đổi trong diff đều là đổi tên, sai ở đâu thấy ngay. Trong lúc chờ, thêm docstring nói rõ `UserDevice` là web-only. *(Câu 6 §14.)*

---

## 4. Ba tình huống — chỉ một tình huống cần mã kích hoạt

> ⚠️ **Điểm quan trọng nhất của tài liệu này.** "Không cho đổi máy" **không** đồng nghĩa "mọi lần client ID thay đổi đều phải xin mã". Gộp cả ba tình huống dưới đây vào một chính sách thì mỗi lần user cài lại app hay đổi ROM là một ticket — feature sẽ tạo khối lượng công việc lớn hơn nhiều lần số ca đổi máy thật.

| | Tình huống | Client ID | Cùng máy vật lý? | Cần mã kích hoạt? |
|---|---|---|---|---|
| **S1** | Logout rồi login lại, chưa gỡ app | Không đổi | ✅ | ❌ Không |
| **S2** | Cài lại app / wipe app data / đổi ROM | **Bị mất** | ✅ | ❌ Không |
| **S3** | **Đổi sang điện thoại khác** | Khác thật | ❌ | ✅ **Có** |

### 4.1 S1 — Re-login cùng máy

Tra cứu theo `device_id` và **không lọc `status`**: row `REVOKED` của chính máy đó được tìm thấy và **reactivate**, thay vì tạo row mới. Phải viết rõ trong serializer — nếu vô tình thêm `status='ACTIVE'` vào filter thì user bị admin gỡ liên kết sẽ không đăng nhập lại được trên **chính máy cũ** của mình.

### 4.2 S2 — Hardware anchor (giải quyết P8)

Bên cạnh `device_id` (UUID trong secure storage), mobile gửi thêm `hardware_hash` = SHA-256 của một định danh phần cứng **sống sót qua việc cài lại app**:

| Nền tảng | Nguồn | Sống sót reinstall? | Đổi khi nào |
|---|---|---|---|
| **Android** | `Settings.Secure.ANDROID_ID` | ✅ Có (từ API 26, scoped theo app signing key) | Factory reset, hoặc **đổi signing key** |
| **iOS** | Keychain (`device_id` gốc) là chính; `identifierForVendor` là phụ | ✅ Keychain sống sót gỡ app | IDFV đổi khi gỡ hết app của vendor |

> ⚠️ **Đã kiểm chứng trong `.pub-cache`:** `device_info_plus` (repo pin `10.1.2`) **không** expose `ANDROID_ID`. Field `AndroidDeviceInfo.id` là `Build.ID` — mã bản build của ROM, **giống nhau trên mọi máy cùng ROM**, tuyệt đối không dùng làm định danh. `serialNumber` trả `"unknown"` từ Android 10 nếu không có quyền đặc quyền.
> → Phải thêm package **`android_id: ^0.4.0`** (hoặc `MethodChannel` ~15 dòng). `identifierForVendor` đã có sẵn trong `IosDeviceInfo`.

**Tra cứu 3 tầng khi mobile login:**

```
1. Khớp device_id  (kể cả row REVOKED)  ──► cùng client, cùng máy       → S1: cho vào
2. Miss → khớp hardware_hash cùng user  ──► cùng máy, mất secure store  → S2: cho vào
        └─ ghi đè device_id mới vào row cũ, GIỮ NGUYÊN client_code
3. Miss cả hai                          ──► máy khác                    → S3: CHẶN
```

**Lợi ích bảo mật phụ (chống P7):** trên iOS, restore backup sang máy mới **có** mang theo Keychain (client_id giống) nhưng IDFV thì **khác**. `device_id` khớp mà `hardware_hash` lệch → dấu hiệu client id bị clone sang máy khác → xử lý như **máy mới** (S3, phải xin mã). Không có tín hiệu này thì hai máy vật lý dùng chung một client ID mà hệ thống không biết — đúng thứ chính sách khoá thiết bị muốn chặn.

**Giới hạn phải chấp nhận:**
- Đổi app signing key (chuyển sang Play App Signing) làm `ANDROID_ID` đổi cho **toàn bộ** user Android → tất cả rơi vào S3 cùng lúc. Phải ghi vào runbook vận hành.
- Một số ROM cũ trả `ANDROID_ID` null hoặc hằng số lỗi `9774d56d682e549c`. Backend **blacklist giá trị này**, coi như không có anchor — bỏ sót thì mọi máy dính lỗi nhận nhau là cùng một thiết bị.
- `hardware_hash` do client gửi nên **giả mạo được**. Chỉ dùng để *nới lỏng* (nhận ra máy cũ), không bao giờ để *cấp quyền*. Chống giả mạo thật cần Play Integrity / App Attest — mục "cân nhắc sau".

### 4.3 S3 — Đổi máy bằng mã kích hoạt (R7)

```
User login trên máy mới
   └─ 400 ACTIVATION_REQUIRED, kèm client_code của máy đang giữ liên kết
        └─ App hiện màn hình khoá + ô nhập MÃ KÍCH HOẠT
             ├─ User liên hệ admin (hotline / email / Zalo)
             └─ Admin: Django Admin → action "Cấp mã kích hoạt thiết bị"
                  ├─ Sinh DeviceActivationKey, hiện mã 1 lần cho admin
                  └─ (tuỳ chọn) tự gửi email chứa mã cho user
                       └─ User nhập mã → POST /api/auth/mobile/activate/
                            └─ Verify credentials + mã
                               revoke máy cũ + blacklist token cũ
                               bind máy mới (client_code MỚI)
                               mã → USED, ghi AdminAuditLog
                               trả access/refresh → user vào app
```

**Không có bất kỳ đường tự phục vụ nào.** Mã chỉ do staff sinh từ Django Admin.

---

## 5. Thiết kế mã kích hoạt

### 5.1 Định dạng

```
TT-4KM9-X7QP-2N5R
│   └────────────┘
│   12 ký tự Base32 Crockford (bỏ I, L, O, U để không nhầm 0/O và 1/I/L)
└── prefix cố định "TT" (Thiên Thư)
```

- Entropy 32¹² ≈ 1.15 × 10¹⁸ (~60 bit) — dò mù bất khả thi.
- Chia nhóm 4 ký tự: đọc qua điện thoại được, gõ tay ít sai.
- Chuẩn hoá đầu vào: viết hoa, bỏ khoảng trắng và gạch nối, map `I→1`, `L→1`, `O→0` trước khi so khớp.

### 5.2 Lưu plaintext hay hash?

| | Lưu **hash** (như `PasswordResetOTP`) | **Lưu plaintext** ✅ |
|---|---|---|
| DB bị lộ | Mã vô dụng | Mã lộ theo |
| Admin xem lại mã | ❌ Chỉ **một lần** lúc tạo | ✅ Xem lại bất cứ lúc nào |
| User gọi lại "em làm mất mã" | Phải sinh mã mới | Đọc lại mã cũ |

**Chọn plaintext**, vì: **mã kích hoạt không phải credential độc lập.** Endpoint activate yêu cầu `email + password + mã`. Kẻ có mã mà không có mật khẩu thì không làm được gì; kẻ có mật khẩu thì đã đăng nhập được trên máy cũ rồi. Mã là **yếu tố thứ hai gắn cứng với một user**, dùng một lần, có hạn.

Bù bằng kiểm soát truy cập: cột mã chỉ hiện với user có permission `users.view_activation_key_secret`; mã đã `USED`/`REVOKED`/`EXPIRED` hiện dạng che `TT-4KM9-****-****`.

*Nếu PO ưu tiên bảo mật hơn tiện lợi, chuyển sang hash chỉ là đổi `services/activation.py`. Xem câu 3 §14.*

### 5.3 Tham số cấu hình

| Tham số | Mặc định | Config key |
|---|---|---|
| Hiệu lực của mã | 7 ngày | `DEVICE_ACTIVATION_KEY_TTL_DAYS` |
| Số lần nhập sai tối đa | 5 | `DEVICE_ACTIVATION_MAX_ATTEMPTS` |
| Throttle endpoint activate | 10 req/giờ/IP | scope `device_activation` |

### 5.4 Vòng đời

```
      ┌──────────────────────────────────────────────┐
      │                                              │
[admin cấp] ──► ISSUED ──► (nhập đúng) ──► USED      │
                  │                                  │
                  ├──► (quá expires_at) ──► EXPIRED  │
                  ├──► (sai > 5 lần) ─────► REVOKED ─┘ (phải xin mã mới)
                  └──► (admin cấp mã mới / thu hồi) ► REVOKED
```

Cron `expire_activation_keys` (Celery beat, hằng ngày) chuyển `ISSUED` quá hạn sang `EXPIRED` — chỉ để danh sách admin sạch; `is_valid` đã tự kiểm `expires_at` nên logic không phụ thuộc cron.

---

## 6. Database (PostgreSQL)

### 6.1 Bảng mới `users_mobiledevice`

`src/backend/users/models/mobile_device.py` — kế thừa `AbstractDevice` (§3.4), chỉ khai báo phần riêng của mobile:

```python
class MobileDevice(AbstractDevice):
    # A user's bound mobile handset. One ACTIVE row per user, enforced in the database.
    #
    # Separate from UserDevice on purpose: the two share ten columns (declared in
    # AbstractDevice) but no policy. Web devices are cheap and plentiful (quota 5,
    # identified by a volatile browser fingerprint); a mobile device is a single
    # long-lived binding that only staff can move to another handset.
    DEVICE_TYPE_CHOICES = [('IOS', 'iOS'), ('ANDROID', 'Android')]

    # Declared here rather than on the base so the related_name reads correctly
    # and `user.devices` keeps meaning "web devices" for existing code.
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mobile_devices')

    # Short, speakable identifier for support. Generated once, never recomputed:
    # device_id can change in place when a client re-binds after a reinstall.
    client_code = models.CharField(max_length=16, unique=True)

    # SHA-256 of a hardware anchor (ANDROID_ID / identifierForVendor). Lets a
    # reinstalled app be recognised as the same handset instead of a new one.
    hardware_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES)
    device_model = models.CharField(max_length=128, null=True, blank=True)
    os_version = models.CharField(max_length=64, null=True, blank=True)
    app_version = models.CharField(max_length=32, null=True, blank=True)
    bound_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Mobile Device'
        verbose_name_plural = 'Mobile Devices'
        ordering = ['-last_active']
        unique_together = ['user', 'device_id']
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(status='ACTIVE'),
                name='uniq_active_mobile_device_per_user',
            ),
            models.UniqueConstraint(
                fields=['user', 'hardware_hash'],
                condition=Q(hardware_hash__isnull=False),
                name='uniq_mobile_hardware_per_user',
            ),
        ]

    def __str__(self):
        return f'{self.client_code} — {self.device_name or self.device_id} ({self.user.email})'

    def save(self, *args, **kwargs):
        if not self.client_code:
            self.client_code = generate_client_code(self.device_id)
        if not self.bound_at:
            self.bound_at = timezone.now()
        return super().save(*args, **kwargs)   # AbstractDevice.save() stamps revoked_at
```

Kế thừa từ `AbstractDevice`: `device_id`, `device_name`, `status`, `last_ip`, `last_active`, `revoked_at`, và 4 field `geo_*`.

So với v3 (chung bảng): **không có** `platform`, `user_agent`, `is_primary_bound`; `client_code` là `NOT NULL` nên không cần `CheckConstraint`; hai `UniqueConstraint` mất mệnh đề `platform='MOBILE'`.

> `revoked_at` được set trong `save()` nên sẽ **không chạy** với `queryset.update()`. Mọi chỗ revoke hàng loạt phải truyền `revoked_at` tường minh.

### 6.2 Bảng mới `users_deviceactivationkey`

`src/backend/users/models/activation.py`:

```python
class DeviceActivationKey(BaseModel):
    """
    A single-use code, issued by staff, that lets one user bind a new mobile device.

    This is the only path through which a user can move to a different handset —
    there is deliberately no self-service alternative.
    """
    STATUS_CHOICES = [
        ('ISSUED', 'Issued'), ('USED', 'Used'),
        ('REVOKED', 'Revoked'), ('EXPIRED', 'Expired'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activation_keys')
    key = models.CharField(max_length=20, unique=True, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ISSUED')

    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                  related_name='issued_activation_keys')
    issued_reason = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField()

    used_at = models.DateTimeField(null=True, blank=True)
    used_device = models.ForeignKey(MobileDevice, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='+')
    used_ip = models.GenericIPAddressField(null=True, blank=True)

    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                   related_name='revoked_activation_keys')

    # Wrong-code attempts. The key self-revokes past the limit so a leaked user
    # account cannot be used to grind through codes.
    attempts = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Device Activation Key'
        verbose_name_plural = 'Device Activation Keys'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user'], condition=Q(status='ISSUED'),
                name='uniq_issued_activation_key_per_user',
            ),
        ]

    @property
    def is_valid(self) -> bool:
        return self.status == 'ISSUED' and timezone.now() < self.expires_at
```

`uniq_issued_activation_key_per_user` — mỗi user chỉ có **một** mã còn hiệu lực; cấp mã mới tự revoke mã cũ. Không bao giờ có chuyện CSKH nhìn hai mã mà không biết mã nào đúng.

`used_device` trỏ thẳng `MobileDevice` — ở phương án chung bảng thì FK này trỏ vào bảng lẫn lộn hai loại thực thể.

### 6.3 Thay đổi trên bảng cũ

**`users_userdevice`: không thêm cột nào.** Chỉ cập nhật docstring nói rõ đây là bảng web-only, và bỏ `MOBILE_IOS`/`MOBILE_ANDROID` khỏi `DEVICE_TYPE_CHOICES` (còn lại `WEB`).

> Nếu §2.3 đúng thì không có row nào mang device_type mobile, nên thu hẹp choices là an toàn. Nếu PO không xác nhận được, **giữ nguyên bộ choices** — đây là thay đổi làm đẹp, không đáng để đánh cược. *(Câu 1 §14.)*

**`users_user`: không thêm cột nào.** v2 từng đề xuất `mobile_rebind_count` / `last_mobile_rebind_at`; v3 bỏ vì không còn self-service. Lịch sử đổi máy đọc từ `DeviceActivationKey` — giàu thông tin hơn (ai cấp, lý do gì, dùng lúc nào, từ IP nào).

**`AdminAuditLog.ACTION_CHOICES`**: thêm `('DEVICE_ACTIVATION', 'Device Activation Key')`. Hiện chỉ có `DEVICE_RESET`, không phân biệt được "admin gỡ liên kết" với "user đổi máy bằng mã".

### 6.4 Migration

Chỉ **một** file, `0009_mobile_device_and_activation_key.py`:

```python
operations = [
    migrations.CreateModel(name='MobileDevice', ...),
    migrations.CreateModel(name='DeviceActivationKey', ...),
    migrations.AddConstraint(model_name='mobiledevice', constraint=...),  # x2
    migrations.AddConstraint(model_name='deviceactivationkey', constraint=...),
    migrations.AlterField(model_name='adminauditlog', name='action_category', ...),
    migrations.AlterField(model_name='userdevice', name='device_type', ...),  # WEB only
]
```

**Không có data migration, không có backfill, không có dedupe** — vì production chưa có row mobile nào (§2.3). So với v3 (3 migration file, có bước dedupe revoke device của user thật, cần dry-run trên dump production và thông báo trước cho user), đây là khác biệt lớn về rủi ro vận hành.

**Rollback:** migration chỉ tạo bảng mới, `migrate users 0008` xoá sạch. Không có dữ liệu cũ nào bị đụng tới → rollback thực sự không mất gì, khác hẳn v3.

### 6.5 `client_code` định danh **máy vật lý**

| Tình huống | Row | `client_code` |
|---|---|---|
| S1, S2 (cùng máy vật lý) | Dùng lại row cũ | **Giữ nguyên** |
| S3 (máy mới, dùng mã kích hoạt) | **Row mới** | **Mã mới** |

Row cũ ở lại `status='REVOKED'`. Admin nhìn một user sẽ thấy chuỗi `MC-7F3A2B91 (REVOKED) → MC-A1B2C3D4 (ACTIVE)` cùng mã kích hoạt của từng lần chuyển — đúng tinh thần "quản lý cẩn thận trên admin". Giữ nguyên `client_code` khi đổi máy thì admin mất khả năng phân biệt máy này với máy trước.

Hệ quả: `client_code` **không được dẫn xuất lại** ở bất kỳ đâu — sinh đúng một lần lúc tạo row rồi bất biến, vì `device_id` có thể thay đổi tại chỗ ở S2.

---

## 7. Backend (Django)

### 7.1 Cấu trúc file

```
src/backend/users/
├── constants.py                          # activation alphabet, denylist, quota      (new)
├── models/
│   ├── device_base.py                    # AbstractDevice (shared fields, §3.4)      (new)
│   ├── mobile_device.py                  # MobileDevice(AbstractDevice)              (new)
│   ├── activation.py                     # DeviceActivationKey                       (new)
│   ├── device.py                         # docstring web-only, thu hẹp choices       (modify)
│   ├── audit.py                          # + DEVICE_ACTIVATION choice                (modify)
│   └── __init__.py                       # export 2 model mới                        (modify)
├── services/
│   ├── auth.py                           # authenticate_user, issue_tokens_for_device (new)
│   ├── client_id.py                      # generate_client_code, normalize_hardware   (new)
│   ├── mobile_device.py                  # resolve_mobile_device — tra cứu 3 tầng     (new)
│   ├── activation.py                     # issue_key, redeem_key, normalize_key       (new)
│   └── tokens.py                         # blacklist_tokens_for_devices               (new)
├── serializers/
│   ├── mobile_auth.py                    # MobileLogin + MobileActivate               (new)
│   └── auth.py                           # web: CHỈ sửa 1 dòng blacklist              (modify)
├── views/mobile_auth.py                  # MobileLoginView, MobileActivateView        (new)
├── authentication.py                     # platform claim → chọn bảng                 (modify)
├── views/auth.py                          # DeviceTokenRefreshView forward platform   (modify)
├── throttles.py                          # MobileLogin + Activation throttle          (modify)
├── urls_auth.py                          # 2 route mới                                (modify)
├── signals.py                            # geo cho cả 2 model                         (modify)
├── tasks.py                              # trigger_geo_fetch nhận model label         (modify)
├── views/profile.py                      # device-status trả mobile_device            (modify)
├── admin.py                              # MobileDeviceAdmin, ActivationKeyAdmin      (modify)
├── templates/emails/device_activation_key.html                                        (new)
└── management/commands/fetch_device_geo.py  # loop cả 2 model                         (modify)
```

### 7.2 `users/constants.py`

```python
# Android returns this well-known broken constant on some old ROMs; treating it as
# a real hardware anchor would make every affected phone look like the same device.
ANDROID_ID_DENYLIST = {'9774d56d682e549c', '0000000000000000'}

# Base32 Crockford minus I, L, O, U — the characters people misread over the phone.
ACTIVATION_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
ACTIVATION_PREFIX = 'TT'
ACTIVATION_BODY_LENGTH = 12

PLATFORM_MOBILE = 'MOBILE'
PLATFORM_WEB = 'WEB'
```

`PLATFORM_*` ở v4 chỉ còn dùng làm **claim trong JWT** (§7.9), không còn là cột trong DB.

### 7.3 `users/services/client_id.py`

```python
def generate_client_code(seed: str) -> str:
    """
    Build a short, human-readable identifier for a mobile device: MC-7F3A2B91.

    Called exactly once, when the row is created. The code must never be
    recomputed afterwards: device_id can change in place when a client re-binds
    after a reinstall, and support workflows depend on the code being stable.
    """
    from ..models import MobileDevice

    for attempt in range(_MAX_ATTEMPTS):
        salt = '' if attempt == 0 else secrets.token_hex(4)
        digest = hashlib.sha256(f'{seed}{salt}'.encode()).hexdigest()
        code = f'MC-{digest[:8].upper()}'
        if not MobileDevice.objects.filter(client_code=code).exists():
            return code

    raise IntegrityError('Unable to allocate a unique client_code.')


def normalize_hardware_hash(raw: str | None) -> str | None:
    """
    Validate a client-supplied hardware anchor.

    Returns None for anything unusable so the caller falls back to treating the
    login as a brand-new device. The value is a trust hint for relaxing the device
    check, never an authorisation input.
    """
    value = (raw or '').strip().lower()
    if len(value) != 64 or not all(c in '0123456789abcdef' for c in value):
        return None
    if value in ANDROID_ID_DENYLIST:
        return None
    return value
```

### 7.4 `users/services/mobile_device.py` — tra cứu 3 tầng

```python
def resolve_mobile_device(user, device_id: str, hardware_hash: str | None):
    """
    Find the mobile device row this login belongs to.

    Returns (device, outcome) where outcome is one of:
      'existing'  — same client id; a plain re-login, revoked rows included.
      'rebound'   — client id was lost (app reinstall) but the hardware anchor
                    matches, so this is the same physical device: adopt the new
                    device_id in place and keep client_code untouched.
      'new'       — neither matched; a different handset, so the caller must
                    demand an activation key.

    Status is deliberately not filtered: a revoked row for this very device must
    be reactivated rather than duplicated, otherwise logging back in after an
    admin unbind would look like a device change and need a key.
    """
    owned = user.mobile_devices.all()

    device = owned.filter(device_id=device_id).first()
    if device is not None:
        # A matching client id with a different anchor means the id was cloned
        # onto another handset (restored backup / synced Keychain). Not the same
        # device — fall through so an activation key is required.
        if hardware_hash and device.hardware_hash and device.hardware_hash != hardware_hash:
            return None, 'new'
        return device, 'existing'

    if hardware_hash:
        device = owned.filter(hardware_hash=hardware_hash).first()
        if device is not None:
            device.device_id = device_id       # client_code stays as it was
            return device, 'rebound'

    return None, 'new'
```

### 7.5 `users/services/activation.py`

```python
def normalize_key(raw: str) -> str:
    """
    Canonicalise a code typed by a user.

    Uppercases, strips separators, and folds the characters the alphabet excludes
    onto their look-alikes (I/L -> 1, O -> 0), so a code read out over the phone
    still matches when the listener picks the wrong glyph.
    """
    s = (raw or '').upper().replace('-', '').replace(' ', '')
    s = s.replace('I', '1').replace('L', '1').replace('O', '0')
    return s[len(ACTIVATION_PREFIX):] if s.startswith(ACTIVATION_PREFIX) else s


def issue_key(user, staff, reason: str = '', notify_email: bool = True) -> DeviceActivationKey:
    """
    Issue a single-use activation code, revoking any code still outstanding so
    support is never looking at two live codes for the same person.
    """
    with transaction.atomic():
        DeviceActivationKey.objects.filter(user=user, status='ISSUED').update(
            status='REVOKED', revoked_at=timezone.now(), revoked_by=staff)

        key = DeviceActivationKey.objects.create(
            user=user, key=_generate_unique_key(), issued_by=staff,
            issued_reason=reason,
            expires_at=timezone.now() + timedelta(days=settings.DEVICE_ACTIVATION_KEY_TTL_DAYS),
        )

    if notify_email and user.email:
        _send_activation_email(user, key)
    return key


def redeem_key(user, raw_key: str, device, ip: str | None) -> DeviceActivationKey:
    """
    Consume an activation code so `device` may become the user's mobile device.

    The row is locked for update: two concurrent activations must not both see an
    ISSUED code and each bind a handset.
    """
    normalized = normalize_key(raw_key)

    with transaction.atomic():
        key = (DeviceActivationKey.objects.select_for_update()
               .filter(user=user, status='ISSUED').first())

        if key is None:
            raise ActivationError('Chưa có mã kích hoạt cho tài khoản này. Vui lòng liên hệ admin.')

        if timezone.now() >= key.expires_at:
            key.status = 'EXPIRED'
            key.save(update_fields=['status'])
            raise ActivationError('Mã kích hoạt đã hết hạn. Vui lòng liên hệ admin để được cấp mã mới.')

        if normalize_key(key.key) != normalized:
            key.attempts += 1
            if key.attempts >= settings.DEVICE_ACTIVATION_MAX_ATTEMPTS:
                key.status = 'REVOKED'
                key.revoked_at = timezone.now()
                key.save(update_fields=['attempts', 'status', 'revoked_at'])
                raise ActivationError('Nhập sai mã quá số lần cho phép. Vui lòng liên hệ admin để được cấp mã mới.')
            key.save(update_fields=['attempts'])
            remaining = settings.DEVICE_ACTIVATION_MAX_ATTEMPTS - key.attempts
            raise ActivationError(f'Mã kích hoạt không đúng. Bạn còn {remaining} lần thử.')

        key.status = 'USED'
        key.used_at = timezone.now()
        key.used_device = device
        key.used_ip = ip
        key.save(update_fields=['status', 'used_at', 'used_device', 'used_ip'])
        return key
```

> `select_for_update()` là **bắt buộc**, không phải tối ưu hoá: thiếu nó thì hai request activate song song đều đọc được mã `ISSUED` và cùng bind, phá R1 trước khi partial unique index kịp chặn.

### 7.6 `POST /api/auth/mobile/login/`

```python
class MobileLoginSerializer(serializers.Serializer):
    """
    Mobile login. Separate from CustomLoginSerializer so the mobile policy
    (one active device, hardware-anchored identity, admin-issued device changes)
    never has to branch inside the web login path.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    device_id = serializers.CharField(required=True, write_only=True, max_length=255)
    device_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    platform_os = serializers.ChoiceField(required=True, write_only=True,
                                          choices=['ios', 'android'])
    hardware_hash = serializers.CharField(required=False, write_only=True, allow_blank=True)
    app_version = serializers.CharField(required=False, write_only=True, allow_blank=True)
    os_version = serializers.CharField(required=False, write_only=True, allow_blank=True)
    device_model = serializers.CharField(required=False, write_only=True, allow_blank=True)

    def validate(self, attrs):
        user = authenticate_user(attrs['email'].lower(), attrs['password'])
        hw = normalize_hardware_hash(attrs.get('hardware_hash'))
        device, outcome = resolve_mobile_device(user, attrs['device_id'], hw)

        if outcome == 'new':
            active = user.mobile_devices.filter(status='ACTIVE').first()
            if active is not None:
                # Changing handset is staff-gated: send the client to the
                # activation screen instead of binding.
                raise serializers.ValidationError(_activation_required_error(user, active))
            device = MobileDevice(user=user, device_id=attrs['device_id'])

        bind_mobile_device(device, attrs, hw, self.context['request'])
        update_last_login(None, user)
        return {'user': user, 'device': device,
                **issue_tokens_for_device(user, device, PLATFORM_MOBILE)}
```

`bind_mobile_device()` (dùng chung với luồng activate):

```python
def bind_mobile_device(device, attrs, hardware_hash, request):
    """Persist the row and revoke every other mobile device of this user."""
    device.device_type = 'IOS' if attrs['platform_os'] == 'ios' else 'ANDROID'
    # device_name comes from the client: the Dio User-Agent ("Dart/3.x") tells us
    # nothing, so parse_device_name() is deliberately not used here.
    device.device_name = attrs.get('device_name') or attrs.get('device_model') or 'Mobile'
    device.hardware_hash = hardware_hash or device.hardware_hash
    device.app_version = attrs.get('app_version') or None
    device.os_version = attrs.get('os_version') or None
    device.device_model = attrs.get('device_model') or None
    device.last_ip = get_client_ip(request)
    device.status = 'ACTIVE'
    device.save()

    # Web sessions live in a different table entirely and are untouched.
    stale = list(
        device.user.mobile_devices.exclude(pk=device.pk)
        .exclude(status='REVOKED').values_list('device_id', flat=True)
    )
    if stale:
        device.user.mobile_devices.filter(device_id__in=stale).update(
            status='REVOKED', revoked_at=timezone.now())
        blacklist_tokens_for_devices(device.user, stale)
```

**Response 200:**

```json
{
  "user": { "...": "..." },
  "access": "...",
  "refresh": "...",
  "client_code": "MC-7F3A2B91",
  "rebound": false
}
```

**Response 400 khi là máy khác:**

```json
{
  "code": "ACTIVATION_REQUIRED",
  "detail": "Tài khoản đang liên kết với thiết bị khác (mã MC-7F3A2B91). Vui lòng liên hệ admin để nhận mã kích hoạt cho thiết bị này.",
  "bound_device": {
    "client_code": "MC-7F3A2B91",
    "device_name": "iPhone 15 Pro",
    "last_active": "2026-08-26T09:12:44Z"
  },
  "support_email": "admin@huyenhoc.pro",
  "has_pending_key": false
}
```

`has_pending_key: true` khi user đã được cấp mã còn hiệu lực → app mở thẳng ô nhập mã. **Không** trả mã trong response — trả thì bất kỳ ai có mật khẩu cũng lấy được mã và cơ chế mất hết tác dụng.

### 7.7 `POST /api/auth/mobile/activate/`

Nhận **credentials**, không phải access token — user chưa đăng nhập được nên chưa có token.

```json
{
  "email": "a@b.com", "password": "***",
  "activation_key": "TT-4KM9-X7QP-2N5R",
  "device_id": "9f3c1e2a-...-a91b", "platform_os": "ios",
  "hardware_hash": "3a7f...", "device_name": "iPhone 15 Pro",
  "app_version": "1.4.2+31", "os_version": "iOS 17.4", "device_model": "iPhone16,1"
}
```

```python
with transaction.atomic():
    user = authenticate_user(email, password)
    hw = normalize_hardware_hash(attrs.get('hardware_hash'))

    device, outcome = resolve_mobile_device(user, attrs['device_id'], hw)
    if outcome != 'new':
        # Already this user's handset — no key needs to be spent on it.
        raise serializers.ValidationError({
            'code': 'ALREADY_BOUND',
            'detail': 'Thiết bị này đã được liên kết. Vui lòng đăng nhập bình thường.',
        })

    old = user.mobile_devices.filter(status='ACTIVE').first()
    device = MobileDevice(user=user, device_id=attrs['device_id'])  # new row, new client_code
    bind_mobile_device(device, attrs, hw, request)                  # revokes `old` + its tokens
    key = redeem_key(user, attrs['activation_key'], device, get_client_ip(request))

    AdminAuditLog.objects.create(
        staff=key.issued_by, target_user=user,
        action_category='DEVICE_ACTIVATION',
        action_detail=f'User activated new device {device.client_code} with key {key.key}',
        change_log={
            'before': {'client_code': old.client_code if old else None,
                       'device_name': old.device_name if old else None},
            'after': {'client_code': device.client_code, 'device_name': device.device_name},
            'activation_key': key.key,
            'issued_by': key.issued_by.email if key.issued_by else None,
        },
        ip_address=get_client_ip(request),
    )
```

Thứ tự `bind` trước rồi `redeem` sau là có chủ ý: `redeem_key` cần `device.pk` để ghi `used_device`. Cả hai trong cùng transaction nên mã sai sẽ rollback toàn bộ — không có tình huống máy mới đã bind mà mã chưa bị tiêu.

Trả về giống login → user vào thẳng app, không phải đăng nhập lại lần nữa.

Throttle `ActivationRateThrottle` scope `device_activation`, 10 req/giờ/IP, kết hợp `attempts` trên chính key và entropy 60 bit.

### 7.8 `users/serializers/auth.py` (web) — **toàn bộ thay đổi là 1 dòng**

`user.devices` giờ chỉ chứa web device, nên (1) và (3) ở §2.1 **đúng sẵn**. Chỉ còn (2):

```python
# Trước:
for token in OutstandingToken.objects.filter(user=user):
    BlacklistedToken.objects.get_or_create(token=token)

# Sau: blacklist đúng những device vừa bị revoke, không đụng token mobile
blacklist_tokens_for_devices(user, stale_device_ids)
```

*(Cần thêm 2 dòng thu thập `stale_device_ids` trước khi `update(status='REVOKED')`, vì `queryset.update()` không trả lại row đã sửa.)*

### 7.9 `users/authentication.py` — chọn bảng theo claim `platform`

```python
class DeviceJWTAuthentication(JWTAuthentication):
    """
    Reject access tokens whose device has been revoked (e.g. another device
    logged in and kicked this one out, or staff unbound it).
    """

    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        device_id = token.get('device_id')
        if not device_id:
            raise InvalidToken('Token missing device binding.')

        user = self.get_user(token)
        model = self._device_model(token)
        if not model.objects.filter(user=user, device_id=device_id, status='ACTIVE').exists():
            raise InvalidToken('Device session has been revoked.')
        return token

    @staticmethod
    def _device_model(token):
        from .models import MobileDevice, UserDevice
        # Tokens minted before this release carry no platform claim. They can only
        # be web tokens: mobile login has never succeeded (device_type mismatch),
        # so no mobile token has ever been issued. This branch falls away once
        # every pre-release refresh token has expired.
        return MobileDevice if token.get('platform') == PLATFORM_MOBILE else UserDevice
```

`DeviceTokenRefreshView` phải forward cả hai claim, nếu không access token mới sẽ tra nhầm bảng:

```python
access = refresh.access_token
if device_id:
    access['device_id'] = device_id
if refresh.get('platform'):
    access['platform'] = refresh['platform']
```

> Nhánh fallback dựa hẳn vào dữ kiện §2.3. Nếu PO **không** xác nhận được rằng mobile chưa từng login thành công, phải đổi fallback thành "tra cả hai bảng" — an toàn hơn nhưng tốn thêm một query cho token cũ. *(Câu 1 §14.)*

### 7.10 Geo (feature-33) cho cả hai model

`save_geo_to_device(device)` trong `services/geo.py` **đã duck-typed sẵn** — chỉ đọc `last_ip` và ghi `geo_*`, không tham chiếu `UserDevice`. Không cần sửa gì.

Chỉ ba chỗ đang hardcode model:

```python
# signals.py — một receiver, hai sender
@receiver(post_save, sender=UserDevice)
@receiver(post_save, sender=MobileDevice)
def on_device_created(sender, instance, created, **kwargs):
    """Trigger async geo fetch when a new device of either kind is registered."""
    if created and instance.last_ip:
        trigger_geo_fetch(sender._meta.label, instance.pk)


# tasks.py — nhận model label thay vì giả định UserDevice
def fetch_and_save_device_geo(model_label: str, pk: int) -> None:
    from django.apps import apps
    device = apps.get_model(model_label).objects.get(pk=pk)
    save_geo_to_device(device)


def backfill_device_geo():
    for model in (UserDevice, MobileDevice):
        ...  # same loop as today


# management/commands/fetch_device_geo.py — thêm --model web|mobile|all (mặc định all)
```

### 7.11 `users/services/tokens.py` — blacklist có phạm vi

```python
def blacklist_tokens_for_devices(user, device_ids: list[str]) -> int:
    """
    Blacklist only the refresh tokens bound to the given devices.

    Login used to blacklist every outstanding token of the user, which signed the
    user out of every platform at once. Scoping by the token's device_id claim
    keeps a mobile login from killing the web session.
    """
    if not device_ids:
        return 0

    targets = set(device_ids)
    count = 0
    for token in OutstandingToken.objects.filter(user=user):
        try:
            claims = jwt.decode(token.token, options={'verify_signature': False})
        except jwt.PyJWTError:
            continue
        if claims.get('device_id') in targets:
            _, created = BlacklistedToken.objects.get_or_create(token=token)
            count += int(created)
    return count
```

> **Phòng thủ nhiều lớp:** kể cả khi một refresh token lọt lưới, `DeviceJWTAuthentication` vẫn kiểm tra `status == 'ACTIVE'` ở **mọi** request, và `DeviceTokenRefreshView` copy nguyên claim sang access token mới. Máy bị revoke thì không dùng tiếp được.
>
> Decode không verify chữ ký an toàn ở đây: token lấy từ chính bảng `OutstandingToken` của hệ thống, chỉ dùng để **so khớp** rồi blacklist — không có quyết định cấp quyền nào dựa trên claim đó.

### 7.12 Routes mới

```python
path('mobile/login/',    MobileLoginView.as_view(),    name='mobile_login'),
path('mobile/activate/', MobileActivateView.as_view(), name='mobile_activate'),
```

`POST /api/auth/login/` giữ nguyên cho web.

### 7.13 `GET /api/users/me/device-status/`

Giữ nguyên field cũ, bổ sung:

```json
{
  "is_device_locked": false,
  "bound_device": { "...": "giữ nguyên" },
  "last_device_reset": "2026-01-01T00:00:00Z",
  "mobile_device": {
    "client_code": "MC-7F3A2B91",
    "device_name": "iPhone 15 Pro",
    "device_type": "IOS",
    "app_version": "1.4.2+31",
    "os_version": "iOS 17.4",
    "bound_at": "2026-08-01T10:20:30Z",
    "last_active": "2026-08-27T08:00:00Z"
  },
  "web_devices_count": 3,
  "web_devices_quota": 5
}
```

---

## 8. Django Admin (R2, R4)

### 8.1 `MobileDeviceAdmin` — model thật, không phải proxy

```python
@admin.register(MobileDevice)
class MobileDeviceAdmin(admin.ModelAdmin):
    list_display = ('client_code', 'user_email', 'device_name', 'device_type',
                    'os_version', 'app_version', 'geo_city', 'status', 'last_active')
    list_filter = ('status', 'device_type', 'geo_country_code')
    search_fields = ('client_code', 'device_id', 'hardware_hash', 'device_model',
                     'user__email', 'user__username', 'user__phone_number')
    readonly_fields = ('user', 'client_code', 'device_id', 'hardware_hash',
                       'device_type', 'device_name', 'device_model', 'os_version',
                       'app_version', 'last_ip', 'geo_city', 'geo_region',
                       'geo_country_code', 'geo_fetched_at', 'bound_at',
                       'revoked_at', 'last_active')
    ordering = ('-last_active',)
    actions = ['issue_activation_keys', 'unbind_devices']

    def has_add_permission(self, request):
        # A mobile device exists only as the result of a real device login.
        return False

    def has_delete_permission(self, request, obj=None):
        # Revoking preserves the audit trail; deleting destroys it.
        return False

    @admin.display(description='User', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
```

**Action 1 — `issue_activation_keys`** *(thao tác chính, dùng hằng ngày)*:

1. `issue_key(user, staff=request.user, reason=..., notify_email=True)`.
2. Hiện mã trong `message_user` để admin copy:
   `"MC-7F3A2B91 (user@mail.com) → mã kích hoạt: TT-4KM9-X7QP-2N5R (hết hạn 03/09/2026). Đã gửi email cho user."`
3. Mã `ISSUED` cũ của user tự chuyển `REVOKED`.
4. Ghi `AdminAuditLog(action_category='DEVICE_ACTIVATION')`.

> Action này **không** đồng thời gỡ liên kết máy cũ. Máy cũ chỉ bị revoke khi user thực sự dùng mã trên máy mới. Gỡ ngay lúc cấp mã thì user mất quyền dùng app trong lúc chờ — trong khi có thể họ chưa mua máy mới, hoặc gọi hỏi rồi thôi.

**Action 2 — `unbind_devices`** *(cắt phiên ngay, không cấp mã)*:

1. `status='REVOKED'`, `revoked_at=now()`.
2. `blacklist_tokens_for_devices(user, [device_id])` → app đăng xuất ngay.
3. Ghi `AdminAuditLog(action_category='DEVICE_RESET')`.
4. Sau đó user đăng nhập lại **trên chính máy cũ** vẫn được (S1). Dùng khi cần cắt phiên khẩn cấp, không phải khi đổi máy.

### 8.2 `DeviceActivationKeyAdmin`

```python
@admin.register(DeviceActivationKey)
class DeviceActivationKeyAdmin(admin.ModelAdmin):
    list_display = ('masked_key', 'user_email', 'status', 'issued_by',
                    'expires_at', 'used_at', 'attempts', 'created_at')
    list_filter = ('status',)
    search_fields = ('key', 'user__email', 'user__username', 'issued_reason')
    readonly_fields = ('key', 'user', 'issued_by', 'used_at', 'used_device',
                       'used_ip', 'revoked_at', 'revoked_by', 'attempts')
    ordering = ('-created_at',)
    actions = ['revoke_keys']

    def has_add_permission(self, request):
        # Codes are issued from the user/device page so they are always tied to a
        # concrete support case, never created free-standing.
        return False

    @admin.display(description='Mã kích hoạt')
    def masked_key(self, obj):
        # Only a live code is worth reading, and only to staff cleared for it.
        if obj.status == 'ISSUED' and self.request.user.has_perm('users.view_activation_key_secret'):
            return obj.key
        return f'{obj.key[:7]}-****-****'
```

Trang này là **lịch sử đổi máy** toàn hệ thống: ai cấp, cho ai, lý do gì, dùng lúc nào, từ IP nào, máy nào. Filter `status='USED'` cho ra danh sách mọi lần đổi máy đã diễn ra.

### 8.3 `UserAdmin`

- `MobileDeviceInline` (readonly, `extra=0`, `can_delete=False`) — mobile device ACTIVE hiện ngay trong trang chi tiết User.
- `ActivationKeyInline` (readonly) — lịch sử mã của user đó.
- Action `issue_activation_keys` gắn cả vào `UserAdmin`, để cấp mã được khi user **chưa có** mobile device nào.
- `settings.py` Jazzmin: thêm icon cho `users.MobileDevice` (`fas fa-mobile-alt`) và `users.DeviceActivationKey` (`fas fa-key`); đổi icon `users.UserDevice` sang `fas fa-desktop` cho khỏi nhầm.

### 8.4 Email gửi user

Template `templates/emails/device_activation_key.html`, gửi qua `EmailMessage` với `content_subtype = 'html'` — cùng cách `_send_otp_email()` của feature-32, dùng lại SMTP Resend đã cấu hình. Nội dung: mã, hạn dùng, hướng dẫn nhập ở đâu trong app, cảnh báo không chia sẻ mã.

---

## 9. Mobile (Flutter)

### 9.1 Dependency mới

```yaml
dependencies:
  android_id: ^0.4.0          # Settings.Secure.ANDROID_ID — device_info_plus does not expose it
  package_info_plus: ^8.0.0   # app_version
```

### 9.2 `lib/core/device/device_service.dart`

```dart
@singleton
class DeviceService {
  static const _deviceIdKey = 'device_stable_id';

  // Keep the identifier device-local: an iCloud-synced Keychain entry or a
  // restored Android backup would hand the same client id to a second phone.
  static const _iosOptions = IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device_only,
    synchronizable: false,
  );
  static const _androidOptions = AndroidOptions(
    encryptedSharedPreferences: true,
    resetOnError: true,
  );

  /// Sent as `platform_os` to /auth/mobile/login/.
  String get platformOs => Platform.isIOS ? 'ios' : 'android';

  /// Stable, opaque client id, generated once and kept in Keychain / Keystore.
  Future<String> getDeviceId() async {
    final stored = await _secureStorage.read(
      key: _deviceIdKey, iOptions: _iosOptions, aOptions: _androidOptions);
    if (stored != null && stored.isNotEmpty) return stored;

    final newId = const Uuid().v4();
    await _secureStorage.write(
      key: _deviceIdKey, value: newId,
      iOptions: _iosOptions, aOptions: _androidOptions);
    return newId;
  }

  /// Hardware anchor that outlives an app reinstall, so a user who reinstalls is
  /// recognised as the same device instead of being sent to ask for a code.
  /// Returns null when the platform value is missing or known-broken.
  Future<String?> getHardwareHash() async {
    final raw = Platform.isIOS
        ? (await _deviceInfo.iosInfo).identifierForVendor
        : await const AndroidId().getId();
    if (raw == null || raw.isEmpty) return null;
    return sha256.convert(utf8.encode(raw)).toString();
  }
}
```

Thay đổi: `platformOs` khớp endpoint mới (**P1**); `getHardwareHash()` mới (**P8**, và giảm mạnh số ca phải xin mã); `IOSOptions(synchronizable: false)` chặn iCloud Keychain clone (**P7**); `resetOnError: true` để app không chết cứng khi keystore hỏng sau restore.

### 9.3 Android manifest — loại secure storage khỏi Auto Backup

```xml
<application
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:fullBackupContent="@xml/backup_rules">
```

`res/xml/backup_rules.xml` + `res/xml/data_extraction_rules.xml` loại trừ prefs `FlutterSecureStorage`. Thiếu bước này, restore backup sang máy mới mang theo client id cũ và user vào được máy mới **mà không cần mã** — thủng R7. Đối chiếu `hardware_hash` (§4.2) là lớp chặn thứ hai, nhưng chặn từ gốc vẫn tốt hơn.

### 9.4 Màn hình mới `DeviceActivationScreen`

```
┌─────────────────────────────────────┐
│   🔒  Thiết bị chưa được kích hoạt   │
│                                     │
│  Tài khoản đang liên kết với:        │
│    iPhone 15 Pro                    │
│    Mã: MC-7F3A2B91                  │
│    Hoạt động: 26/08/2026 09:12      │
│                                     │
│  Để dùng trên thiết bị này, bạn cần │
│  mã kích hoạt từ quản trị viên.     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  TT- ____ - ____ - ____       │  │
│  └───────────────────────────────┘  │
│         [ Kích hoạt thiết bị ]      │
│                                     │
│  Chưa có mã?                        │
│  📧 admin@huyenhoc.pro   📋 Copy    │
└─────────────────────────────────────┘
```

- Ô nhập tự chèn `-` sau mỗi 4 ký tự, tự viết hoa, chỉ nhận ký tự trong alphabet.
- Nút copy email hỗ trợ + copy `client_code` máy hiện tại (user gửi admin để đối chiếu).
- `has_pending_key: true` → ô nhập mở sẵn; `false` → nhấn mạnh phần liên hệ admin.

### 9.5 Auth layer

- `ApiEndpoints.mobileLogin = '/auth/mobile/login/'`, `mobileActivate = '/auth/mobile/activate/'`.
- `AuthRemoteDataSource.login()` gửi `platform_os`, `hardware_hash`, `app_version`, `os_version`, `device_model`.
- `parseDioError()` xử lý `code == 'ACTIVATION_REQUIRED'` → `ActivationRequiredException(clientCode, deviceName, lastActive, hasPendingKey, supportEmail)`.
- `AuthBloc`: state `AuthBlocActivationRequired`, event `ActivationSubmitted` → gọi `/mobile/activate/` với credentials đang giữ từ lần login vừa thất bại.

---

## 10. Frontend Web (Vue.js)

**Không thay đổi.** Web tiếp tục gọi `/api/auth/login/` với `device_type: 'WEB'`, quota 5, mã lỗi `DEVICE_LIMIT_REACHED`. Lợi ích gián tiếp: session web không còn bị đăng nhập mobile đá ra.

---

## 11. Trade-off & rủi ro

| Rủi ro | Đánh giá | Xử lý |
|---|---|---|
| **Mọi ca đổi máy đều thành ticket CSKH** | Hệ quả trực tiếp và cố ý của R7 | Hardware anchor (§4.2) loại S1/S2 khỏi luồng ticket — chỉ đổi máy thật mới cần mã. Cấp mã là 2 click + email tự gửi |
| **Không có admin ngoài giờ** → user kẹt qua đêm/cuối tuần | Trung bình | Cần PO quyết SLA cấp mã và ai trực. Vấn đề quy trình, không phải kỹ thuật |
| **Giả định "chưa có mobile device nào"** (§2.3) sai | Thấp nhưng ảnh hưởng thiết kế | Kiểm chứng bằng `SELECT count(*) FROM users_userdevice WHERE device_type LIKE 'MOBILE%'` trên production **trước** khi code. Nếu >0: thêm data migration chuyển row, và đổi fallback ở §7.9 thành tra cả hai bảng |
| **Token cũ không có claim `platform`** | Thấp | Fallback về `UserDevice` (§7.9) — đúng vì mobile chưa từng phát hành token nào. Tự hết sau khi refresh token cũ hết hạn |
| `hardware_hash` **giả mạo được** | Chấp nhận | Chỉ dùng để *nới lỏng*, không để *cấp quyền*. Chống giả mạo thật cần Play Integrity / App Attest |
| **Đổi app signing key** làm `ANDROID_ID` đổi hàng loạt | Thấp nhưng ảnh hưởng rộng | Runbook: chuyển Play App Signing thì toàn bộ user Android rơi vào S3 — phải cấp mã hàng loạt hoặc tạm nới chính sách |
| ROM lỗi trả `ANDROID_ID` hằng số | Trung bình | `ANDROID_ID_DENYLIST` — bỏ sót thì mọi máy dính lỗi nhận nhau là cùng thiết bị |
| **Mã lưu plaintext** trong DB | Thấp (§5.2) | Vô dụng nếu không có mật khẩu; single-use; có hạn; che với staff không đủ quyền |
| Race hai request activate song song | Thấp | `select_for_update()` trong `redeem_key` + partial unique index |
| **Hai bảng device → field dùng chung lệch dần** | Trung bình, dài hạn — điểm yếu thật của phương án tách | `AbstractDevice` (§3.4) giữ 10 field chung ở một chỗ. Phần *hành vi* chung đã nằm ở service dùng chung (`services/auth.py`, `services/tokens.py`, `services/geo.py`). Còn *chính sách* thì hai bên **cố ý khác nhau** — lệch ở đó là đúng, không phải lỗi |
| Geo phải chạy cho 2 model | Thấp | §7.10 — `save_geo_to_device` đã duck-typed, chỉ sửa 3 chỗ hardcode |
| App mobile cũ vẫn gọi `/auth/login/` | App cũ **đang** hỏng sẵn (P1) → không phải regression | Force-update qua remote config; xem câu 2 §14 |
| Va chạm `client_code` (8 hex) | ~0.1% ở quy mô 10⁵ | Retry có salt + `UNIQUE` ở DB |
| `queryset.update()` bỏ qua `save()` → `revoked_at` không set | Bug tiềm ẩn khi maintain | Mọi chỗ revoke hàng loạt truyền `revoked_at` tường minh; có test bao phủ |

### Cân nhắc sau (ngoài scope)

- **Cho `UserDevice` kế thừa `AbstractDevice` + đổi tên thành `WebDevice`** (§3.4, §3.5) — cùng một commit dọn dẹp riêng sau khi feature chạy ổn. Bắt buộc `makemigrations --dry-run` xác nhận migration rỗng.
- **Device attestation thật** — iOS DeviceCheck/App Attest, Android Play Integrity cho định danh do OS bảo chứng, sống sót factory reset, không giả mạo được. Lời giải triệt để cho `hardware_hash`, nhưng cần backend gọi API Apple/Google. Chỉ làm nếu số liệu cho thấy có tình trạng lách bằng `hardware_hash` giả.

### Rollback

Migration `0009` chỉ **tạo bảng mới** — `migrate users 0008` xoá sạch, không dữ liệu cũ nào bị đụng. Hai endpoint mobile là route mới, gỡ khỏi `urls_auth.py` là xong. Thay đổi duy nhất chạm vào code web (`blacklist_tokens_for_devices`) revert độc lập được.

---

## 12. Test plan

### Backend — `users/tests/test_mobile_device.py`

| # | Test | Kỳ vọng |
|---|---|---|
| T1 | User có 5 web device ACTIVE, login mobile lần đầu | 200, tạo mobile device, **không** bị chặn bởi quota web |
| T2 | User có 1 mobile device ACTIVE, login từ device_id + hardware_hash khác | 400 `ACTIVATION_REQUIRED`, kèm `client_code` cũ, `has_pending_key: false` |
| T3 | Login mobile khi đang có session web | Web device vẫn `ACTIVE`; refresh token web **không** bị blacklist; request web tiếp theo 200 |
| T4 | Login web khi đang có session mobile | Mobile device vẫn `ACTIVE` |
| **T5** | **S1** — logout rồi login lại cùng `device_id` | 200, `rebound: false`, **không** tạo row mới, `client_code` không đổi, **không** cần mã |
| **T6** | **S1'** — login lại sau khi admin `unbind` | 200, row cũ reactivate, **không** cần mã |
| **T7** | **S2** — `device_id` mới + `hardware_hash` cũ | 200, `rebound: true`, row cũ cập nhật `device_id`, `client_code` **giữ nguyên**, tổng row mobile vẫn 1 |
| **T8** | **P7** — `device_id` cũ + `hardware_hash` khác (clone) | 400 `ACTIVATION_REQUIRED` |
| T9 | `hardware_hash` trong `ANDROID_ID_DENYLIST` | Bị bỏ qua, xử lý như không có anchor |
| T10 | `hardware_hash` sai định dạng | `normalize_hardware_hash` trả `None`, không lỗi 500 |
| **T11** | Activate với mã đúng | 200, row mới `client_code` **mới**, row cũ `REVOKED` + token blacklist, key → `USED` với `used_device` đúng, `AdminAuditLog` ghi |
| **T12** | Activate với mã sai | 400, `attempts` +1, báo còn N lần, **không** row mới nào được tạo (rollback) |
| **T13** | Nhập sai đủ 5 lần | Key → `REVOKED`, lần thứ 6 báo phải xin mã mới |
| **T14** | Activate với mã đã `USED` | 400 — không có key `ISSUED` nào |
| **T15** | Activate với mã hết hạn | 400, key → `EXPIRED` |
| **T16** | Activate với mã của **user khác** | 400 — `redeem_key` filter theo `user`, mã không dùng chéo được |
| **T17** | Activate trên máy **đã** là device của user | 400 `ALREADY_BOUND`, mã **không** bị tiêu |
| **T18** | `issue_key` khi đang có mã `ISSUED` | Mã cũ → `REVOKED`, chỉ còn đúng 1 mã `ISSUED` |
| **T19** | Hai request activate song song cùng một mã | Đúng 1 thành công (`select_for_update`), 1 trả 400 |
| **T20** | `normalize_key('tt-4km9 x7qp-2n5r')` và biến thể có `I`/`O`/`L` | Khớp cùng một mã |
| T21 | Hai request login mobile đồng thời, 2 device_id khác nhau | Đúng 1 row ACTIVE (partial unique index) |
| **T22** | **JWT**: access token mobile (`platform: MOBILE`) sau khi device bị revoke | 401 |
| **T23** | **JWT**: access token web (`platform: WEB`) khi mobile device cùng `device_id` bị revoke | 200 — tra đúng bảng, không nhầm chéo |
| **T24** | **JWT**: token cũ **không có** claim `platform` | Tra `UserDevice`, hành vi y như trước feature này |
| **T25** | **JWT**: refresh token mobile → access token mới | Giữ nguyên cả `device_id` lẫn `platform` |
| **T26** | Geo: tạo `MobileDevice` có `last_ip` | Signal chạy, `geo_*` được điền |
| T27 | Admin action `unbind_devices` | Device `REVOKED`, token blacklist, `AdminAuditLog` ghi |
| T28 | `device_name` client gửi được giữ nguyên | Không bị `parse_device_name` ghi đè |
| **T29** | **Regression**: toàn bộ test login web hiện có | Pass không sửa gì |

### Mobile — `test/core/device/device_service_test.dart`

| # | Test | Kỳ vọng |
|---|---|---|
| M1 | `platformOs` trên iOS / Android | `ios` / `android` |
| M2 | `getDeviceId()` gọi 2 lần | Cùng giá trị, chỉ ghi secure storage 1 lần |
| M3 | `getHardwareHash()` khi platform trả null | Trả `null`, không throw |
| M4 | `getHardwareHash()` ổn định qua nhiều lần gọi | Cùng giá trị, đúng 64 hex |
| M5 | `parseDioError` với body `ACTIVATION_REQUIRED` | Throw `ActivationRequiredException` đủ field |
| M6 | Ô nhập mã: gõ `tt4km9x7qp2n5r` | Hiển thị `TT-4KM9-X7QP-2N5R`, gửi lên đúng định dạng |

---

## 13. Thứ tự triển khai

| Bước | Nội dung |
|---|---|
| **BE-0** | **Kiểm chứng §2.3 trên production**: `SELECT count(*) FROM users_userdevice WHERE device_type LIKE 'MOBILE%'`. Kết quả ≠ 0 thì quay lại §14 câu 1 trước khi code tiếp |
| **BE-1** | `constants.py`, `services/client_id.py`, `services/tokens.py`, `services/auth.py` + unit test |
| **BE-2** | `AbstractDevice` (§3.4) — **chỉ** `MobileDevice` kế thừa, không đụng `UserDevice`; model `MobileDevice`, `DeviceActivationKey`; `AdminAuditLog` thêm choice; migration `0009`. Chạy `makemigrations --dry-run` xác nhận không sinh `AlterField` nào cho `UserDevice` |
| **BE-3** | `services/mobile_device.py`, `services/activation.py` + test T11–T20 |
| **BE-4** | `serializers/mobile_auth.py`, `views/mobile_auth.py`, throttle, routes |
| **BE-5** | `authentication.py` platform claim + `DeviceTokenRefreshView` forward + test T22–T25 |
| **BE-6** | Sửa 1 dòng blacklist trong `serializers/auth.py` (web) + chạy T29 |
| **BE-7** | Geo cho 2 model: `signals.py`, `tasks.py`, `fetch_device_geo` + test T26 |
| **BE-8** | `MobileDeviceAdmin`, `DeviceActivationKeyAdmin`, inline trong `UserAdmin`, permission `view_activation_key_secret`, icon Jazzmin |
| **BE-9** | Email template + `_send_activation_email`; task `expire_activation_keys` + Celery beat |
| **BE-10** | `DeviceStatusView`; test T1–T29; cập nhật `md/core/api-specification.md`, `md/core/database-design.md` |
| **MB-1** | Dependency `android_id`, `package_info_plus`; `DeviceService`; Android backup rules |
| **MB-2** | Datasource đổi endpoint + payload; `ActivationRequiredException`; `AuthBloc` state/event |
| **MB-3** | `DeviceActivationScreen` + ô nhập mã có format |
| **MB-4** | Hiển thị `client_code` ở Settings; test M1–M6 |
| **REL** | Deploy backend trước (bảng và endpoint mới không ảnh hưởng ai đang chạy), sau đó phát hành app kèm force-update |

---

## 14. Câu hỏi cần PO quyết

1. **Xác nhận production chưa có mobile device nào** (§2.3). Đây là giả định chống đỡ ba quyết định: migration không cần chuyển dữ liệu, fallback JWT ở §7.9, và việc thu hẹp `device_type` choices của `UserDevice`. Chạy `SELECT count(*) FROM users_userdevice WHERE device_type LIKE 'MOBILE%'` là biết. Nếu ≠ 0, tôi bổ sung data migration + đổi fallback thành tra cả hai bảng.
2. **S1/S2 có được miễn mã kích hoạt không?** — Đề xuất **có** (§4). Nếu PO muốn *mọi* thay đổi client id đều phải xin mã thì mỗi lần user cài lại app hay đổi ROM là một ticket, và số ticket sẽ lớn hơn nhiều lần số ca đổi máy thật.
3. **Lưu mã plaintext hay hash?** — Đề xuất plaintext (§5.2) để CSKH đọc lại được mã khi user làm mất. Hash thì admin chỉ xem được mã **một lần** lúc tạo.
4. **Hiệu lực của mã** — đề xuất 7 ngày, sai tối đa 5 lần. PO thấy hợp lý?
5. **Ai được cấp mã và SLA bao lâu?** — Mọi staff hay chỉ nhóm quyền riêng? Ngoài giờ hành chính / cuối tuần xử lý thế nào? Phần quy trình, không phải kỹ thuật, nhưng quyết định trải nghiệm thực tế của feature.
6. **Đổi tên `UserDevice` → `WebDevice` và cho nó kế thừa `AbstractDevice`?** — Đề xuất làm ở commit dọn dẹp riêng sau khi feature chạy ổn (§3.4, §3.5), không gộp vào release này.
7. **Quota web = 5** giữ nguyên hay điều chỉnh, khi đã tách khỏi mobile?
8. **Có gửi email tự động** kèm mã cho user không (đề xuất: có, tái dùng SMTP Resend của feature-32), hay admin tự gửi qua kênh khác?
