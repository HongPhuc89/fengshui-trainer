# Feature 34 — Mobile Device: bảng riêng, khoá 1 máy/user, đổi máy bằng mã kích hoạt Admin cấp

## Document Information
- **Feature**: Bảng `MobileDevice` riêng + endpoint login riêng + Client ID bền vững + đổi máy bắt buộc qua mã kích hoạt do admin cấp
- **Status**: Draft v9.1 — đã chốt kênh gửi mã và gộp bảng; sẵn sàng implement
- **Created**: 2026-08-27
- **Updated**: 2026-08-27
  - v2: tách endpoint mobile theo góp ý PO
  - v3: PO chốt không cho tự đổi máy — thay OTP self-rebind bằng `DeviceActivationKey`
  - v9.1: PO chốt — mã gửi **qua Zalo/điện thoại** (bỏ email tự động, §5.4); **gộp một bảng** vì mỗi slot chỉ một mã (§6.1); bỏ `mobile_enabled` (§6.2).
  - v9: **Ghép cặp bằng mã cấp trước** theo góp ý PO. Admin cấp slot thiết bị → sinh mã → user nhập một lần ở lần login đầu → các lần sau khớp `device_id`, không nhập lại. Slot chính là row `MobileDevice` trạng thái `UNCLAIMED`. Mã **không** lưu trên máy (§4.1). So sánh dứt điểm với mô hình duyệt-sau của v8 ở cuối §4.1.
  - v8: **Duyệt từng thiết bị (`PENDING` → `ACTIVE`)** theo góp ý PO. Login máy lạ tạo row `PENDING` kèm đầy đủ metadata và trả `client_code` — vá vòng luẩn quẩn "admin không biết duyệt cái gì" của v7. Hạn mức chuyển sang kiểm lúc duyệt. Bỏ `mobile_enabled` và `DeviceActivationKey` (§4.1, câu 12/14 §15).
  - v7: **Entitlement mobile theo user** — `User.mobile_enabled` (mặc định `False`) và `User.mobile_max_devices` (mặc định 1). Chạm hạn mức thì chặn login thay vì thay máy ngầm. Ba hệ quả: bind bỏ auto-revoke, bỏ partial unique index đổi sang row lock, tắt entitlement phải revoke device. Mã kích hoạt đổi vai trò thành đường bind nguyên tử khi đã ở max (§4.1).
  - v6.1: Chốt mô hình phân phối (Android APK tự ký, iOS **ad-hoc**) và bổ sung §4.5 — ràng buộc của ad-hoc, 4 quy tắc bảo vệ hardware anchor, hệ quả với auto-update và attestation.
  - v6: **Xử lý PO review v5** — 1 Critical: C5 (activate trên máy đã từng dùng vi phạm 2 constraint → 500), sinh ra từ chính bản vá C3. Sửa gốc bằng cổng chung `requires_activation()` cho cả hai endpoint (§7.4) + quy tắc "quay lại máy cũ giữ `client_code`" (§6.5). 4 Suggestion: cảnh báo `@transaction.atomic` (§7.7), dọn luồng device-reset đã chết (§7.15), thêm T36–T39, chủ sở hữu metric (§12).
  - v5: **Xử lý PO review v4** — 4 Critical: thứ tự revoke/save trong `bind_mobile_device` (§7.6), tách `verify`/`consume` để `attempts` không bị rollback (§7.5), chặn re-login máy đã bị thay thế (§4.2), sửa luồng register mobile (§7.8). 9 Suggestion: P6 (§7.14), metric (§12), `masked_key` (§8.2), bỏ `has_pending_key`, bổ sung helper còn thiếu, ghi chú `AbstractDevice` trong migration, logout giữ binding (§7.15), phạm vi in/out (§2.5), contract `authenticate_user` (§3.1).
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
| **P6** | `is_primary_bound` không bao giờ được set `True` → `DeviceStatusView` luôn trả `bound_device = null` | `views/profile.py:145` | 🟡 → giải ở **§7.14** |
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

- **R0** — *(v9)* Mobile **tắt mặc định**: tài khoản chưa được admin cấp slot thiết bị nào thì không dùng được app. Trạng thái mặc định này là hệ quả tự nhiên của mô hình cấp slot, không cần cờ `mobile_enabled` riêng.
- **R1** — Mỗi user có tối đa `mobile_max_devices` mobile device `ACTIVE` (mặc định **1**). Chạm hạn mức thì **không cho login** máy mới.
- **R2** — Mobile device có mã định danh ngắn, đọc được, tra cứu được trên Admin.
- **R3** — Đếm/giới hạn mobile **độc lập hoàn toàn** với web device.
- **R4** — Admin xem, tra cứu, **gỡ liên kết** mobile device, có audit log.
- **R5** — Web giữ nguyên hành vi hiện tại.
- **R6** — User **đăng nhập lại trên cùng máy vật lý luôn thành công**, kể cả sau khi logout, cài lại app, hoặc nâng cấp OS.
- **R7** — User **không có đường nào tự đổi sang máy khác**. Đổi máy **chỉ** bằng mã kích hoạt do admin cấp.

### 2.5 Phạm vi

**In scope**

| Hạng mục | Ghi chú |
|---|---|
| Bảng `MobileDevice` + `DeviceActivationKey` | §6 |
| `POST /api/auth/mobile/login/` và `/mobile/activate/` | §7.6, §7.7 |
| Bỏ 3 field device khỏi `RegisterSerializer` | §7.8 — sửa luồng đăng ký mobile |
| Blacklist token theo phạm vi device (1 dòng ở web serializer) | §7.9 |
| Claim `platform` trong JWT + chọn bảng khi xác thực | §7.10 |
| Geo (F33) chạy cho cả hai model | §7.11 |
| `bound_device` trong device-status trỏ vào mobile device | §7.14 — giải P6 |
| Admin: `MobileDeviceAdmin`, `DeviceActivationKeyAdmin`, 2 action, email cấp mã | §8 |
| Mobile: `DeviceService` + hardware anchor + `DeviceActivationScreen` | §9 |

**Tiền đề đã chốt** — không phải hạng mục thực thi, nhưng thiết kế dựa hẳn vào chúng: Android phân phối bằng **APK tự ký**, iOS bằng **ad-hoc (UDID)**. Bốn quy tắc bảo vệ hardware anchor ở §4.5 phải giữ suốt vòng đời sản phẩm, không chỉ trong release này.

**Out of scope** — cố ý không làm ở release này

| Hạng mục | Lý do |
|---|---|
| Đổi tên `UserDevice` → `WebDevice`, cho nó kế thừa `AbstractDevice` | Commit dọn dẹp riêng (§3.5) — không trộn thay đổi cơ học vào release đổi logic |
| Gỡ cột `UserDevice.is_primary_bound` (thành field chết sau §7.14) | Cùng commit dọn dẹp trên |
| Đưa `revoked_reason` lên `AbstractDevice` để web device cũng ghi được lý do revoke | Cùng commit dọn dẹp trên — hiện chỉ mobile cần |
| Device attestation thật (App Attest / Play Integrity) | Chỉ làm nếu số liệu cho thấy có lách bằng `hardware_hash` giả (§11) |
| Bất kỳ đường tự phục vụ đổi máy nào (OTP, cooldown, hạn mức/năm) | PO đã bác ở vòng review v3 — R7 |
| Thay đổi frontend web | Không cần (§10) |
| Thay đổi hạn mức web = 5 | Câu 7 §15 — chưa quyết, không chặn release |

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
    """
    Resolve credentials to a User, raising the same errors both login flows use.

    Keeps the three-way distinction the current web login makes, because they are
    not interchangeable to the person reading the message:
      - unknown email or wrong password -> "Invalid email or password."
      - correct password, is_active=False -> the "chờ admin kích hoạt" message
      - otherwise -> the authenticated User

    django.contrib.auth.authenticate() alone cannot express the middle case: it
    returns None for an inactive user, which would report a pending account as a
    wrong password and send the user to reset a password that was never wrong.
    """

def issue_tokens_for_device(user, device, platform: str) -> dict:
    """
    Mint an access/refresh pair carrying the device_id and platform claims.

    Both claims are required: device_id binds the session to one handset, platform
    tells DeviceJWTAuthentication which table to look it up in (see 7.10).
    """
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
| `DeviceJWTAuthentication` phải biết tra bảng nào | ~15 dòng | Thêm claim `platform` vào JWT (§7.10) |
| Geo (F33) phải chạy cho cả 2 model | ~20 dòng | `save_geo_to_device(device)` đã duck-typed sẵn (§7.11) |
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

Ở §3.2 tôi viết "cột `platform` biến mất". Nói vậy chưa đủ chính xác: `DeviceJWTAuthentication` vẫn phải biết token thuộc nền tảng nào để tra đúng bảng, nên discriminator **chuyển từ cột DB sang claim trong JWT** (§7.10).

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

Làm thành **commit dọn dẹp riêng sau khi feature này chạy ổn**: lúc đó mọi thay đổi trong diff đều là đổi tên, sai ở đâu thấy ngay. Trong lúc chờ, thêm docstring nói rõ `UserDevice` là web-only. *(Câu 6 §15.)*

---

## 4. Ba tình huống — chỉ một tình huống cần mã kích hoạt

> ⚠️ **Điểm quan trọng nhất của tài liệu này.** "Không cho đổi máy" **không** đồng nghĩa "mọi lần client ID thay đổi đều phải xin mã". Gộp cả ba tình huống dưới đây vào một chính sách thì mỗi lần user cài lại app hay đổi ROM là một ticket — feature sẽ tạo khối lượng công việc lớn hơn nhiều lần số ca đổi máy thật.

| | Tình huống | Client ID | Cùng máy vật lý? | Cần mã kích hoạt? |
|---|---|---|---|---|
| **S1** | Logout rồi login lại, chưa gỡ app | Không đổi | ✅ | ❌ Không |
| **S2** | Cài lại app / wipe app data / đổi ROM | **Bị mất** | ✅ | ❌ Không |
| **S3** | **Đổi sang điện thoại khác** | Khác thật | ❌ | ✅ **Có** |

### 4.1 Ghép cặp bằng mã do Admin cấp trước

Admin tạo sẵn một **slot thiết bị** cho user, hệ thống sinh mã ghép cặp. User nhập mã đúng một lần ở lần đăng nhập đầu; từ đó máy được ghi nhận và không phải nhập lại.

```
Admin: "Cấp slot thiết bị" cho user X
   └─ Sinh MobileDevice(status='UNCLAIMED', device_id=NULL, pairing_code='TT-4KM9-X7QP-2N5R')
        └─ Admin gửi mã cho user (cùng lúc gửi bản cài — xem 4.5)
             └─ User login lần đầu: email + mật khẩu + MÃ
                  └─ Server ghi device_id + hardware_hash vào slot, status='ACTIVE'
                       └─ Mọi lần sau: app gửi device_id → khớp → vào thẳng
```

#### Không lưu mã trên máy

Đề xuất ban đầu là "mã lưu ở máy để không phải nhập lại". **Không cần, và không nên.**

Cái làm cho lần sau không phải nhập lại là **binding phía server**: slot đã có `device_id` của máy này, nên login sau chỉ cần gửi `device_id` như thường lệ. Mã đã hết vai trò ngay khi ghép cặp xong.

Lưu lại thì được gì? Không gì cả — nhưng thêm một bí mật nằm trong app. Và nó cũng **không cứu được tình huống cài lại app**: mã sẽ nằm cùng chỗ với `device_id` trong secure storage, mất thì mất cả hai. Tình huống đó do `hardware_hash` xử lý (§4.3), không phải do mã.

⟹ App chỉ lưu `device_id` như hiện tại. Mã là thứ dùng một lần rồi quên.

#### Slot chính là row `MobileDevice`

Không tách thành model riêng. Admin cấp slot = tạo một `MobileDevice` chưa có chủ:

| Trạng thái | `device_id` | Ý nghĩa | Chiếm slot? |
|---|---|---|---|
| `UNCLAIMED` | `NULL` | Admin đã cấp, chờ user ghép cặp | ✅ |
| `ACTIVE` | đã điền | Đang dùng | ✅ |
| `REVOKED` | đã điền | Đã bị cắt | ❌ |
| `EXPIRED` | `NULL` | Slot cấp ra quá hạn mà không ai nhận | ❌ |

Mô hình tinh thần của admin khớp đúng với dữ liệu: *"tôi đã cấp cho user này một slot thiết bị"*. Và `mobile_max_devices` được enforce ngay lúc **cấp slot**, chứ không phải lúc login — admin không tạo được slot thứ hai khi hạn mức là 1.

> `UNCLAIMED` **chiếm slot** là điểm dễ bỏ sót. Không tính thì admin cấp 5 slot rồi user nhận cả 5, vượt hạn mức mà không đường nào chặn.

**Hệ quả lên `device_id`:** hiện `device_id` nằm ở `AbstractDevice` và `NOT NULL`. Slot chưa nhận thì chưa có giá trị đó, nên `device_id` phải chuyển xuống từng model con — web giữ `NOT NULL`, mobile cho `NULL` tới khi ghép cặp. `unique_together` đổi thành partial unique index `WHERE device_id IS NOT NULL`. Đây cũng là cách khai báo đúng hơn về mặt ngữ nghĩa: `device_id` của web là fingerprint trình duyệt, của mobile là UUID trong Keychain — hai thứ khác hẳn nhau.

#### Luồng login

```python
def validate(self, attrs):
    user = authenticate_user(attrs['email'].lower(), attrs['password'])
    hardware_hash = normalize_hardware_hash(attrs.get('hardware_hash'))

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        device, outcome = resolve_mobile_device(locked_user, attrs['device_id'], hardware_hash)

        # Known handset: the slot already carries this device_id (or its hardware
        # anchor). No code, ever again.
        if device is not None and device.status == 'ACTIVE':
            bind_mobile_device(locked_user, device, attrs, hardware_hash, request)
            return _session(locked_user, device, outcome)

        # Unknown handset: it may only take a slot an admin allocated for this user.
        code = attrs.get('pairing_code')
        if not code:
            raise MobileDeviceError(pairing_required_error(locked_user))
        slot = claim_slot(locked_user, code, attrs, hardware_hash, request)
        return _session(locked_user, slot, 'claimed')
```

`claim_slot()` tái dùng gần như nguyên vẹn `verify_activation_key()` / `consume_activation_key()` đã viết ở v6 — cùng ranh giới transaction, cùng bộ đếm số lần nhập sai, cùng `select_for_update`. Chi tiết ở §7.5, chỉ đổi chỗ ghi kết quả: thay vì tạo row mới thì điền `device_id` vào slot đang `UNCLAIMED`.

#### Response khi thiếu mã

```json
{
  "code": "PAIRING_CODE_REQUIRED",
  "detail": "Thiết bị này chưa được ghép cặp. Vui lòng nhập mã kích hoạt do quản trị viên cấp.",
  "has_unclaimed_slot": true,
  "support_email": "admin@huyenhoc.pro"
}
```

`has_unclaimed_slot` cho app biết nên hiện ô nhập mã (`true`) hay màn hình "liên hệ admin để được cấp" (`false`). Khác với `has_pending_key` đã bị bỏ ở v5: chỗ đó tiết lộ **đã cấp mã hay chưa** cho bất kỳ ai biết mật khẩu; chỗ này chỉ nói **có slot trống hay không**, mà user vốn đã biết vì chính họ đi xin.

#### So sánh với mô hình duyệt sau (v8)

| | **A — Duyệt sau** (v8) | **B — Cấp mã trước** (v9) ✅ |
|---|---|---|
| Thứ tự | User thử → bị từ chối → admin duyệt → thử lại | Admin cấp mã → user nhập → vào luôn |
| Số vòng của user | **2** lần đăng nhập, có một lần chờ ở giữa | **1** |
| Admin thấy gì khi quyết định | Metadata thật của máy (tên, model, IP, thành phố) | Chưa thấy gì — cấp quyền cho *người cầm mã* |
| Cái được cấp quyền | Một `device_id` cụ thể | Người giữ mã (bearer) |
| Cần truyền bí mật | Không | Có — qua email/Zalo/điện thoại |
| Khớp quy trình ad-hoc iOS | Thêm một vòng lên trên quy trình vốn đã thủ công | **Gộp chung**: gửi mã cùng lúc gửi bản cài |
| Hàng chờ admin | Có thể bị spam, cần TTL + giới hạn 1 row/user | Không có hàng chờ |

**Chọn B**, và lý do quyết định là §4.5: iOS phát hành ad-hoc nên admin **đã bắt buộc** phải làm việc thủ công với từng user — thu UDID, ký lại IPA, gửi bản cài. Gửi kèm mã ghép cặp trong đúng lần trao đổi đó tốn thêm 0 bước. Mô hình A thì thêm hẳn một vòng: cài → thử → hỏng → gọi lại → chờ → thử lại.

**Cái phải chấp nhận khi chọn B:** mã là bearer credential, ai cầm cũng dùng được. Bốn lớp hạn chế thiệt hại, giống lập luận đã dùng ở §5.2:

1. Gắn cứng một user — mã của người khác vô dụng
2. Vẫn phải có **mật khẩu** của chính tài khoản đó
3. Dùng một lần, hết hạn sau `DEVICE_ACTIVATION_KEY_TTL_DAYS`
4. Sai quá `DEVICE_ACTIVATION_MAX_ATTEMPTS` lần thì mã tự huỷ

Và điều A làm tốt hơn — admin nhìn thấy metadata thiết bị — thực ra **vẫn có**, chỉ là sau khi ghép cặp thay vì trước. Admin mở trang mobile device lên là thấy đủ tên máy, model, OS, IP, thành phố; nếu sai với thực tế thì gỡ liên kết. Mất mát thật sự nhỏ hơn vẻ ngoài.

### 4.2 S1 — Re-login cùng máy

Tra cứu theo `device_id` và **không lọc `status`**: row `REVOKED` của chính máy đó được tìm thấy và **reactivate**, thay vì tạo row mới. Nếu vô tình thêm `status='ACTIVE'` vào filter thì user bị admin gỡ liên kết sẽ không đăng nhập lại được trên **chính máy cũ** của mình.

Nhưng "tìm thấy row cũ" **không** đồng nghĩa "được vào". Phải phân biệt hai lý do một row rơi vào `REVOKED`:

| `revoked_reason` | Sinh ra khi | Đăng nhập lại trên máy đó |
|---|---|---|
| `ADMIN_UNBIND` | Admin cắt phiên bằng action `unbind_devices` | ✅ Được — user không còn máy nào ACTIVE |
| `REPLACED` | Máy khác đã thay thế nó qua mã kích hoạt | ❌ **Phải xin mã** — máy mới đang giữ liên kết |

Quy tắc thực thi trong `MobileLoginSerializer` là một điều kiện duy nhất, áp cho **mọi** kết quả tra cứu:

```python
def requires_activation(user, device) -> bool:
    active = user.mobile_devices.filter(status='ACTIVE').first()
    return active is not None and (device is None or active.pk != device.pk)
```

Hàm này là **cổng chung của cả hai endpoint mobile** (§7.4): `login` từ chối khi nó trả `True`, `activate` từ chối khi nó trả `False`. Viết một lần rồi gọi hai chỗ, thay vì mỗi endpoint tự kiểm tra — vì khi để lệch, chúng đã lệch thật (lỗi C5 ở vòng review thứ hai).

> ⚠️ **Đây là chỗ bản nháp v4 bị thủng.** Khi đó điều kiện chỉ được kiểm tra ở nhánh `outcome == 'new'`. Hệ quả: user đổi từ máy A sang máy B bằng mã, rồi mở lại app trên máy A — tra cứu tầng 1 vẫn khớp `device_id` của A, trả `'existing'`, và bind thẳng, revoke luôn máy B. **Không hỏi mã.** Hai người dùng chung tài khoản chỉ việc luân phiên đăng nhập, và R7 mất tác dụng ngay sau lần đổi máy đầu tiên.
>
> Điều kiện trên đóng lỗ hổng đó mà không phá S1: sau khi admin `unbind`, user **không còn** máy ACTIVE nào nên `active is None` và họ vào lại bình thường.

`revoked_reason` không tham gia quyết định (điều kiện trên đã đủ) nhưng được lưu để admin đọc được lịch sử: nhìn một row `REVOKED` là biết ngay nó bị cắt phiên hay bị thay máy.

### 4.3 S2 — Hardware anchor (giải quyết P8)

Bên cạnh `device_id` (UUID trong secure storage), mobile gửi thêm `hardware_hash` = SHA-256 của một định danh phần cứng **sống sót qua việc cài lại app**:

| Nền tảng | Nguồn | Sống sót reinstall? | Đổi khi nào |
|---|---|---|---|
| **Android** | `Settings.Secure.ANDROID_ID` | ✅ Có (từ API 26, scoped theo app signing key) | Factory reset, hoặc **đổi signing key** (§4.5 D1) |
| **iOS** | Keychain (`device_id` gốc) là chính; `identifierForVendor` là phụ | ✅ Keychain sống sót gỡ app | IDFV đổi khi gỡ hết app của vendor; `device_id` mất nếu **đổi bundle ID** (§4.5 D2) |

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
- Đổi app signing key (chuyển sang Play App Signing) làm `ANDROID_ID` đổi cho **toàn bộ** user Android → tất cả rơi vào S3 cùng lúc. Kênh phân phối đã chốt và bốn quy tắc bảo vệ anchor nằm ở **§4.5**.
- Một số ROM cũ trả `ANDROID_ID` null hoặc hằng số lỗi `9774d56d682e549c`. Backend **blacklist giá trị này**, coi như không có anchor — bỏ sót thì mọi máy dính lỗi nhận nhau là cùng một thiết bị.
- `hardware_hash` do client gửi nên **giả mạo được**. Chỉ dùng để *nới lỏng* (nhận ra máy cũ), không bao giờ để *cấp quyền*. Chống giả mạo thật cần Play Integrity / App Attest — mục "cân nhắc sau".

### 4.4 S3 — Đổi máy bằng mã kích hoạt (R7)

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

### 4.5 Mô hình phân phối và ảnh hưởng tới hardware anchor

Cả hai anchor ở §4.3 đều gắn với **danh tính ký app**, không phải với store. Vì vậy kênh phân phối quyết định anchor có ổn định hay không, và phải chốt trước khi code.

**Kênh đã chốt:** Android — APK tự ký, tự phân phối. iOS — **ad-hoc** (UDID).

| Nền tảng | Anchor gắn với | Với kênh đã chốt |
|---|---|---|
| Android | App signing key | ✅ Keystore của mình, cố định → `ANDROID_ID` **ổn định hơn cả bản Play** |
| iOS | Keychain access group = **Team ID + bundle ID** | ✅ Ad-hoc giữ nguyên cả hai → `device_id` sống qua mọi lần cài lại |

> Kênh **duy nhất** phá vỡ thiết kế là sideload tự ký kiểu AltStore/Sideloadly, nơi mỗi user ký bằng Apple ID của chính họ: Team ID đổi theo từng người, Keychain không đọc được, và với tài khoản free thì profile hết hạn sau 7 ngày. User sẽ phải xin mã kích hoạt **hằng tuần**. Đã loại kênh này.

#### Ba ràng buộc của ad-hoc cần biết trước

**1. Trần 100 thiết bị mỗi năm thành viên.** Provisioning profile ad-hoc chứa tối đa 100 iPhone (iPad tính riêng). Xoá UDID khỏi danh sách **không** trả lại slot cho tới kỳ gia hạn hằng năm — số slot chỉ giảm, không tăng, trong suốt một năm.

Cộng với R1 (1 user = 1 máy), điều này đặt trần cứng: **tối đa 100 user iOS**. Đây là giới hạn của mô hình phân phối, không phải của feature này, nhưng nó chặn trần tăng trưởng iOS nên PO cần biết (câu 10 §15).

**2. UDID phải đăng ký trước khi build.** Onboard một user iOS đã là quy trình thủ công: user gửi UDID → admin thêm vào portal → build/ký lại IPA → gửi cho user.

> Đáng chú ý: iOS **vốn đã** có một cổng kiểm soát thủ công theo từng thiết bị. Nhưng nó không thay thế được mã kích hoạt — UDID gate chỉ chặn *máy lạ cài được app*, không chặn *một tài khoản dùng trên hai máy đều đã đăng ký*. Android thì không có cổng nào tương đương. Mã kích hoạt vẫn là cơ chế duy nhất thực thi R1 trên cả hai nền tảng.

**3. Profile hết hạn sau 1 năm → cài lại hàng loạt, nhưng KHÔNG phải sự kiện S3.**

Khi profile hết hạn, app ngừng khởi động và toàn bộ user iOS phải cài lại bản IPA ký mới. Nhìn thì giống một đợt "đổi máy" hàng loạt, nhưng **không phải**: bản ký lại dùng cùng Team ID và cùng bundle ID, nên keychain access group không đổi và `device_id` vẫn đọc được. Toàn bộ rơi vào **S1**, đăng nhập bình thường, không ai cần mã.

> Ghi rõ điều này ở đây vì đến kỳ gia hạn sẽ có người hoảng và tưởng phải cấp mã hàng loạt. Không cần. Chỉ cần **không đổi bundle ID**.

#### Bốn việc phải giữ để anchor không gãy

| # | Quy tắc | Vi phạm thì sao |
|---|---|---|
| **D1** | **Không bao giờ đổi Android keystore.** Backup và lưu trữ như tài sản quan trọng nhất của dự án | `ANDROID_ID` đổi → **toàn bộ user Android** rơi vào S3 cùng lúc, phải cấp mã hàng loạt |
| **D2** | **Không bao giờ đổi iOS bundle ID**, kể cả khi sau này lên App Store | Keychain access group đổi → `device_id` mất trên **toàn bộ user iOS** |
| **D3** | **Không phát hành song song hai kênh** cho cùng một app (ví dụ vừa APK tự ký vừa bản Play) | User chuyển kênh có signing key khác → bị coi là đổi máy |
| **D4** | Nếu sau này lên Play với Play App Signing, coi đó là **sự kiện vận hành có kế hoạch** | Google ký bằng key khác → `ANDROID_ID` đổi một lần cho tất cả |

Bất đối xứng đáng lưu ý giữa hai nền tảng khi tính chuyện lên store về sau:

- **iOS ad-hoc → App Store: an toàn.** Cùng Apple Developer account nên Team ID không đổi; giữ nguyên bundle ID là keychain sống sót, không có đợt S3 nào.
- **Android APK tự ký → Play App Signing: có đợt S3.** Google ký lại bằng key khác. Phải chuẩn bị trước: hoặc dùng chính keystore hiện tại làm app signing key khi đăng ký Play (tránh được hoàn toàn), hoặc chấp nhận cấp mã hàng loạt một lần.

Phương án đầu tốt hơn nhiều và **quyết định được ngay hôm nay** bằng cách giữ keystore hiện tại đủ an toàn để sau này upload lên Play.

#### Hai hệ quả phụ của việc không qua store

**Không có auto-update.** §14 (REL) dự kiến "force-update qua remote config" — với APK/IPA trực tiếp thì phải tự làm màn hình "có bản mới, tải tại đây", và backend phải chịu client cũ lâu hơn. Riêng iOS ad-hoc, kỳ gia hạn hằng năm là dịp ép cập nhật tự nhiên.

**Phương án dự phòng attestation gần như mất trên Android.** Play Integrity trả `appRecognitionVerdict = UNRECOGNIZED_VERSION` cho app không phát hành qua Play, nên mục "cân nhắc sau" ở §11 chỉ còn dùng được tín hiệu device integrity, không dùng được tín hiệu app authenticity. iOS App Attest gắn với App ID nên về lý thuyết vẫn chạy với ad-hoc, nhưng **cần kiểm chứng thực tế trước khi tin**.

Điều này củng cố lập luận sẵn có ở §4.3: `hardware_hash` là tín hiệu để **nới lỏng**, không bao giờ để **cấp quyền**. Không có đường nâng cấp nó thành bằng chứng mạnh trong mô hình phân phối hiện tại.

---

## 5. Mã ghép cặp

### 5.1 Hai mã, hai vai trò khác nhau

Một slot mang **hai** mã, và không gộp được vì chúng khác nhau về bản chất:

| | `client_code` | `pairing_code` |
|---|---|---|
| Dạng | `MC-7F3A2B91` | `TT-4KM9-X7QP-2N5R` |
| Là gì | **Định danh** công khai | **Bí mật** dùng một lần |
| Vòng đời | Vĩnh viễn, bất biến | Hết tác dụng ngay khi ghép cặp xong |
| Ai thấy | User (màn hình Settings), admin, CSKH | Chỉ admin và user, trong lúc ghép cặp |
| Dùng để | Đối chiếu khi hỗ trợ: *"máy em mã MC-7F3A2B91"* | Chứng minh được quyền nhận slot |

Dùng chung một mã cho cả hai việc là sai: định danh phải hiện thường trực và lặp lại được, bí mật thì phải dùng một lần rồi thôi.

### 5.2 Định dạng `pairing_code`

```
TT-4KM9-X7QP-2N5R
│   └────────────┘
│   12 ký tự Base32 Crockford (bỏ I, L, O, U để không nhầm 0/O và 1/I/L)
└── prefix cố định "TT" (Thiên Thư)
```

Entropy 32¹² ≈ 1.15 × 10¹⁸ (~60 bit). Chia nhóm 4 và bỏ ký tự dễ nhầm là yêu cầu bắt buộc chứ không phải cho đẹp: **mã được đọc qua điện thoại hoặc gõ lại từ Zalo** (§5.4), nên nhầm `O` với `0` là chuyện sẽ xảy ra.

Server chuẩn hoá đầu vào trước khi so khớp: viết hoa, bỏ gạch nối và khoảng trắng, map `I`/`L` → `1`, `O` → `0`.

### 5.3 Lưu plaintext — và giờ là bắt buộc

Ở các bản trước đây là một đánh đổi. Với kênh gửi đã chốt ở §5.4 thì nó thành **yêu cầu chức năng**: admin phải mở mã ra đọc để dán vào Zalo hoặc đọc qua điện thoại. Lưu hash thì admin chỉ nhìn được mã **đúng một lần** lúc tạo, và mất là phải huỷ slot cấp lại.

Rủi ro vẫn được chặn bằng lập luận cũ: **mã không phải credential độc lập.** Nhận slot cần `email + mật khẩu + mã`. Ai có mã mà không có mật khẩu thì vô dụng; ai có mật khẩu thì đã vào được máy cũ rồi.

Kiểm soát bù lại:
- Chỉ hiện mã của slot **`UNCLAIMED`**. Slot đã nhận thì che `TT-4KM9-****-****` — mã đã hết tác dụng, hiện ra chỉ tổ rò rỉ.
- Cột mã chỉ mở cho user có permission `users.view_activation_key_secret`.

### 5.4 Kênh gửi: ngoài luồng, không gửi email tự động

**Admin tự gửi mã qua Zalo hoặc số điện thoại.** Hệ thống không gửi email.

Lý do khớp với §4.5: iOS phát hành ad-hoc nên admin **đã** phải liên hệ trực tiếp từng user để lấy UDID và gửi bản cài. Mã đi kèm trong đúng cuộc trao đổi đó. Thêm một email tự động vào giữa chỉ tạo thêm một kênh có thể rơi vào spam mà không rút ngắn được bước nào.

Hệ quả lên thiết kế:

| | Ảnh hưởng |
|---|---|
| Bỏ `send_activation_email()` và template `device_activation_key.html` | Bớt một phụ thuộc vào SMTP cho luồng này |
| Admin **phải** copy được mã dễ dàng | Cột mã trong admin có nút copy, không bắt bôi đen thủ công |
| Không có xác nhận đã gửi | TTL quan trọng hơn: slot không ai nhận sẽ tự hết hạn và **trả lại chỗ** trong hạn mức |
| Không có dấu vết gửi | `issued_by` + `issued_reason` là toàn bộ audit ta có. Nên bắt admin ghi lý do khi cấp |

### 5.5 Tham số cấu hình

| Tham số | Mặc định | Config key |
|---|---|---|
| Hạn nhận slot | 7 ngày | `DEVICE_PAIRING_TTL_DAYS` |
| Số lần nhập sai tối đa | 5 | `DEVICE_PAIRING_MAX_ATTEMPTS` |
| Throttle endpoint login mobile | 30 req/giờ/IP | scope `mobile_login` |

### 5.6 Vòng đời slot

```
[admin cấp slot] ──► UNCLAIMED ──(nhập đúng mã)──► ACTIVE ──(gỡ/tắt)──► REVOKED
                          │                                                │
                          ├──(quá expires_at)────► EXPIRED                 │
                          ├──(sai > 5 lần)───────► EXPIRED                 │
                          └──(admin huỷ)─────────► EXPIRED          (login lại cần
                                                                     slot mới)
```

`UNCLAIMED` và `ACTIVE` **chiếm chỗ** trong `mobile_max_devices`; `EXPIRED` và `REVOKED` thì không. Nhờ vậy một slot cấp nhầm rồi bỏ đó sẽ tự trả lại chỗ sau `DEVICE_PAIRING_TTL_DAYS` mà không cần ai dọn.

Cron `expire_mobile_slots` (Celery beat, hằng ngày) chuyển `UNCLAIMED` quá hạn sang `EXPIRED`. Logic nhận slot vẫn tự kiểm `expires_at` mỗi lần, nên không phụ thuộc cron chạy đúng giờ — cron chỉ để hạn mức được trả lại đúng lúc và danh sách admin sạch.

---

## 6. Database (PostgreSQL)

### 6.1 Bảng `users_mobiledevice` — một bảng, không tách key

Slot và thiết bị là **một thực thể ở hai giai đoạn**, nên nằm chung một bảng. Mỗi slot mang đúng một `pairing_code`, nên tách ra bảng riêng chỉ tạo quan hệ 1-1 vô nghĩa.

```python
class MobileDevice(AbstractDevice):
    # A device slot allocated by staff, then claimed by a handset.
    #
    # UNCLAIMED: staff created it, pairing_code issued, no handset yet.
    # ACTIVE:    a handset redeemed the code and is bound.
    # REVOKED:   was active, staff cut it off.
    # EXPIRED:   never claimed — the code timed out or was burnt by wrong tries.
    STATUS_CHOICES = [
        ('UNCLAIMED', 'Unclaimed'),
        ('ACTIVE', 'Active'),
        ('REVOKED', 'Revoked'),
        ('EXPIRED', 'Expired'),
    ]
    DEVICE_TYPE_CHOICES = [('IOS', 'iOS'), ('ANDROID', 'Android')]
    REVOKED_REASON_CHOICES = [
        ('ADMIN_UNBIND', 'Admin unbind'),
        ('REPLACED', 'Replaced by another handset'),
        ('MOBILE_DISABLED', 'Mobile access turned off'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mobile_devices')

    # Permanent public identity of the slot. Generated at creation from a random
    # seed (device_id does not exist yet) and never recomputed.
    client_code = models.CharField(max_length=16, unique=True)

    # One-time secret the user types to claim this slot. Kept after the claim for
    # audit; the admin UI masks it once status leaves UNCLAIMED.
    pairing_code = models.CharField(max_length=20, unique=True)

    # NULL until a handset claims the slot. Declared here rather than on
    # AbstractDevice because a web device always has one, and the two ids mean
    # different things: a browser fingerprint versus a Keychain UUID.
    device_id = models.CharField(max_length=255, null=True, blank=True)
    hardware_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    # Slot lifecycle
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='issued_mobile_slots')
    issued_reason = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField()
    claimed_at = models.DateTimeField(null=True, blank=True)
    claim_ip = models.GenericIPAddressField(null=True, blank=True)
    # Wrong-code attempts. The slot burns itself past the limit so a leaked
    # password cannot be used to grind through codes.
    claim_attempts = models.IntegerField(default=0)

    # Filled in at claim time from the handset
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES, blank=True)
    device_model = models.CharField(max_length=128, null=True, blank=True)
    os_version = models.CharField(max_length=64, null=True, blank=True)
    app_version = models.CharField(max_length=32, null=True, blank=True)

    bound_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=20, choices=REVOKED_REASON_CHOICES,
                                      null=True, blank=True)

    class Meta:
        verbose_name = 'Mobile Device'
        verbose_name_plural = 'Mobile Devices'
        ordering = ['-last_active']
        constraints = [
            # Only claimed slots carry a device_id, so the uniqueness has to be
            # conditional; a plain unique_together would collide on the NULLs in
            # every unclaimed slot on some backends.
            models.UniqueConstraint(
                fields=['user', 'device_id'],
                condition=Q(device_id__isnull=False),
                name='uniq_mobile_device_id_per_user',
            ),
            models.UniqueConstraint(
                fields=['user', 'hardware_hash'],
                condition=Q(hardware_hash__isnull=False),
                name='uniq_mobile_hardware_per_user',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_mobiledevice_user_status'),
            models.Index(fields=['status', 'expires_at'], name='idx_mobiledevice_expiry'),
        ]
```

Kế thừa từ `AbstractDevice`: `device_name`, `status`, `last_ip`, `last_active`, và 4 field `geo_*`. **`device_id` chuyển xuống model con** — xem chú thích trong code.

#### Hạn mức đếm ở đâu

`mobile_max_devices` tính trên các slot **đang chiếm chỗ**:

```python
OCCUPYING = ('UNCLAIMED', 'ACTIVE')
```

Kiểm ở **lúc admin cấp slot**, không phải lúc login — vì lúc login không còn gì để quyết định, slot có hay không có mà thôi:

```python
with transaction.atomic():
    # Row lock serialises count-then-create: two admins clicking at once would
    # otherwise both read the same count and both allocate.
    locked = User.objects.select_for_update().get(pk=user.pk)
    if locked.mobile_devices.filter(status__in=OCCUPYING).count() >= locked.mobile_max_devices:
        raise ValidationError('Đã dùng hết số thiết bị cho phép. Gỡ liên kết máy cũ trước.')
```

Không có partial unique index nào diễn đạt được "đếm không vượt N", nên khoá dòng `users_user` là cách đúng. Đổi lại, **mọi** đường tạo slot phải đi qua service này.

> `UNCLAIMED` chiếm chỗ là điểm dễ bỏ sót: không tính thì admin cấp 5 slot, user nhận cả 5, vượt hạn mức mà không đường nào chặn. Bù lại, slot không ai nhận sẽ `EXPIRED` sau `DEVICE_PAIRING_TTL_DAYS` và **tự trả lại chỗ**.

### 6.2 Thay đổi trên bảng cũ

**`users_userdevice`: không thêm cột nào.** Chỉ cập nhật docstring nói rõ đây là bảng web-only, và bỏ `MOBILE_IOS`/`MOBILE_ANDROID` khỏi `DEVICE_TYPE_CHOICES` (còn lại `WEB`).

> Nếu §2.3 đúng thì không có row nào mang device_type mobile, nên thu hẹp choices là an toàn. Nếu PO không xác nhận được, **giữ nguyên bộ choices** — đây là thay đổi làm đẹp, không đáng để đánh cược. *(Câu 1 §15.)*

**`users_user`: thêm một cột hạn mức** *(v9)*.

```sql
ALTER TABLE users_user
    ADD COLUMN mobile_max_devices SMALLINT NOT NULL DEFAULT 1;
```

```python
# How many mobile slots this user may hold at once (UNCLAIMED + ACTIVE).
# Reaching it blocks staff from allocating another, never silently replaces one.
mobile_max_devices = models.PositiveSmallIntegerField(default=1)
```

**Không có `mobile_enabled`.** Bản nháp v7 từng đề xuất cờ này, nhưng ở mô hình cấp slot thì "chưa được cấp slot nào" **đã là** trạng thái tắt — thêm cờ nữa là hai lớp duyệt cho cùng một việc. Sau migration không ai dùng được app cho tới khi admin cấp slot đầu tiên, và hiện production chưa có mobile device nào (§2.3) nên không ai mất quyền đang có.

*(Nếu sau này có cổng thương mại riêng — ví dụ chỉ VIP mới được dùng app — thì thêm lại cờ này là chuyện nhỏ, vì nó chặn ở tầng khác: ngăn admin cấp slot, chứ không ngăn login.)*

> v2 từng đề xuất `mobile_rebind_count` / `last_mobile_rebind_at`; v3 bỏ vì không còn self-service. Lịch sử đổi máy đọc từ `DeviceActivationKey` — giàu thông tin hơn (ai cấp, lý do gì, dùng lúc nào, từ IP nào).

**`AdminAuditLog.ACTION_CHOICES`**: thêm `('MOBILE_SLOT', 'Mobile Device Slot')` — ghi lại việc cấp slot, huỷ slot và nhận slot. Hiện chỉ có `DEVICE_RESET`, không phân biệt được "admin gỡ liên kết" với "admin cấp slot mới".

**Không còn bảng `users_deviceactivationkey`.** Mỗi slot mang đúng một mã, nên mã là cột của chính slot đó (§6.1). Đây là thay đổi so với bản nháp v3–v8.

### 6.3 Migration

Chỉ **một** file, `0009_mobile_device_and_activation_key.py`:

```python
operations = [
    migrations.CreateModel(name='MobileDevice', ...),   # slot + pairing code in one table
    migrations.AddField(model_name='user', name='mobile_max_devices', ...),
    migrations.AddConstraint(model_name='mobiledevice', constraint=...),  # x2
    migrations.AlterField(model_name='adminauditlog', name='action_category', ...),
    migrations.AlterField(model_name='userdevice', name='device_type', ...),  # WEB only
]
```

> `AbstractDevice` (§3.4) là abstract model nên **không sinh operation nào** — các cột nó khai báo xuất hiện thẳng trong `CreateModel(MobileDevice)`. Không có `CreateModel(AbstractDevice)`; nếu `makemigrations` sinh ra thì `Meta.abstract = True` đã bị quên.

```python
# phần còn lại giữ nguyên
```

**Không có data migration, không có backfill, không có dedupe** — vì production chưa có row mobile nào (§2.3). So với v3 (3 migration file, có bước dedupe revoke device của user thật, cần dry-run trên dump production và thông báo trước cho user), đây là khác biệt lớn về rủi ro vận hành.

**Rollback:** migration chỉ tạo bảng mới, `migrate users 0008` xoá sạch. Không có dữ liệu cũ nào bị đụng tới → rollback thực sự không mất gì, khác hẳn v3.

### 6.4 `client_code` định danh **máy vật lý**

| Tình huống | Row | `client_code` |
|---|---|---|
| S1, S2 — cùng máy vật lý | Dùng lại row cũ | **Giữ nguyên** |
| S3 — máy **chưa từng thấy**, dùng mã kích hoạt | **Row mới** | **Mã mới** |
| S3 — **quay lại máy đã từng dùng**, dùng mã kích hoạt | **Dùng lại row cũ** | **Giữ nguyên** |

> *(v7)* Bind **không** còn tự revoke máy khác. Slot chỉ được giải phóng bằng hành động tường minh: admin gỡ liên kết, admin tắt `mobile_enabled`, hoặc mã kích hoạt (revoke máy `last_active` cũ nhất). Xem §4.1.

> Dòng thứ ba là hệ quả bắt buộc của chính nguyên tắc "`client_code` định danh máy vật lý": cùng một chiếc điện thoại thì phải nhận lại đúng mã cũ, nếu không admin sẽ thấy một máy mang hai mã khác nhau — đúng thứ nguyên tắc này sinh ra để tránh. Nó cũng là ràng buộc kỹ thuật: tạo row mới cho máy cũ sẽ vi phạm `unique_together(user, device_id)` và `uniq_mobile_hardware_per_user` cùng lúc.

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
│   ├── mobile_device.py                  # resolve_mobile_device + requires_activation (new)
│   ├── activation.py                     # issue_key, verify_key, consume_key         (new)
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

`PLATFORM_*` ở v4 chỉ còn dùng làm **claim trong JWT** (§7.10), không còn là cột trong DB.

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

#### Cổng chung `requires_activation()` — một quy tắc, hai điểm gọi

Bản v5 để `mobile/login/` và `mobile/activate/` mỗi bên tự viết điều kiện kiểm tra, và chúng đã lệch nhau ngay lập tức: login chặn đúng, còn activate lại giả định "máy cần kích hoạt luôn là máy chưa từng thấy" — dẫn tới lỗi C5 (§7.7). Hai endpoint hỏi **cùng một câu hỏi nghiệp vụ** nên phải dùng chung một câu trả lời:

```python
def requires_activation(user, device) -> bool:
    """
    True when binding `device` would displace a DIFFERENT handset that is still
    bound — the one and only situation that needs a staff-issued key.

    Deliberately shared by both mobile endpoints so their gates cannot drift:
    whatever login refuses is exactly what activate accepts, and vice versa.
    `device is None` means a handset never seen before.
    """
    active = user.mobile_devices.filter(status='ACTIVE').first()
    return active is not None and (device is None or active.pk != device.pk)
```

| Endpoint | Dùng cổng thế nào |
|---|---|
| `mobile/login/` | `if requires_activation(...)` → **từ chối**, trả `ACTIVATION_REQUIRED` |
| `mobile/activate/` | `if not requires_activation(...)` → **từ chối**, trả `ALREADY_BOUND` và **không tiêu mã** |

Nhánh thứ hai quan trọng hơn vẻ ngoài của nó: nếu user gọi `activate` trong lúc đáng ra chỉ cần đăng nhập bình thường (ví dụ admin vừa `unbind` hết thiết bị), họ sẽ đốt mất một mã kích hoạt dùng một lần cho việc không cần đến nó — rồi lần đổi máy thật lại phải xin mã lần nữa.

### 7.5 `users/services/activation.py`

```python
class ActivationError(Exception):
    """Raised with a user-facing Vietnamese message when a code cannot be redeemed."""


def _generate_unique_key() -> str:
    """Draw a 12-character Crockford Base32 body until it is unused, then prefix it."""
    for _ in range(5):
        body = ''.join(secrets.choice(ACTIVATION_ALPHABET)
                       for _ in range(ACTIVATION_BODY_LENGTH))
        key = f'{ACTIVATION_PREFIX}-{body[0:4]}-{body[4:8]}-{body[8:12]}'
        if not DeviceActivationKey.objects.filter(key=key).exists():
            return key
    raise IntegrityError('Unable to allocate a unique activation key.')


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
```

#### Tách đôi: `verify` rồi mới `consume`

Ban đầu tài liệu này gộp cả hai vào một hàm `redeem_key()` chạy trong transaction của luồng activate. Cách đó **hỏng**: đường đi "mã sai" ghi `attempts += 1` rồi `raise` — mà `raise` bên trong `atomic()` làm rollback chính bản ghi vừa tăng, nên `attempts` vĩnh viễn bằng 0 và giới hạn 5 lần không tồn tại.

Nguyên tắc rút ra: **thao tác đếm số lần sai phải commit được kể cả khi request thất bại**, nên nó không được nằm chung transaction với thao tác ghi của đường đi thành công.

```python
def verify_activation_key(user, raw_key: str) -> DeviceActivationKey:
    """
    Check a code and record the attempt. Runs in its own transaction and must be
    called OUTSIDE the caller's write transaction.

    A wrong code raises after committing the incremented attempt counter. Counting
    inside the caller's atomic block would roll the counter back together with the
    failed request, leaving the lockout permanently disarmed.

    Returns the still-ISSUED key on success; consume_activation_key() marks it used.
    """
    normalized = normalize_key(raw_key)

    with transaction.atomic():
        key = (DeviceActivationKey.objects.select_for_update()
               .filter(user=user, status='ISSUED').first())

        if key is None:
            error = 'Chưa có mã kích hoạt cho tài khoản này. Vui lòng liên hệ admin.'
        elif timezone.now() >= key.expires_at:
            key.status = 'EXPIRED'
            key.save(update_fields=['status'])
            error = 'Mã kích hoạt đã hết hạn. Vui lòng liên hệ admin để được cấp mã mới.'
        elif normalize_key(key.key) != normalized:
            key.attempts += 1
            fields = ['attempts']
            if key.attempts >= settings.DEVICE_ACTIVATION_MAX_ATTEMPTS:
                key.status = 'REVOKED'
                key.revoked_at = timezone.now()
                fields += ['status', 'revoked_at']
                error = 'Nhập sai mã quá số lần cho phép. Vui lòng liên hệ admin để được cấp mã mới.'
            else:
                remaining = settings.DEVICE_ACTIVATION_MAX_ATTEMPTS - key.attempts
                error = f'Mã kích hoạt không đúng. Bạn còn {remaining} lần thử.'
            key.save(update_fields=fields)
        else:
            error = None
    # Transaction has committed here — the attempt counter is durable.

    if error:
        raise ActivationError(error)
    return key


def consume_activation_key(key, device, ip: str | None) -> None:
    """
    Mark a verified key as spent. Called INSIDE the bind transaction so the key and
    the device it created commit together, or neither does.

    Re-reads under a row lock: verify and consume are separate transactions, so a
    concurrent activation could have spent the key in between.
    """
    locked = (DeviceActivationKey.objects.select_for_update()
              .filter(pk=key.pk, status='ISSUED').first())
    if locked is None:
        raise ActivationError('Mã kích hoạt vừa được sử dụng. Vui lòng liên hệ admin.')

    locked.status = 'USED'
    locked.used_at = timezone.now()
    locked.used_device = device
    locked.used_ip = ip
    locked.save(update_fields=['status', 'used_at', 'used_device', 'used_ip'])
```

> **Vì sao vẫn cần `select_for_update()` ở cả hai hàm:** `verify` khoá để hai request đồng thời không cùng đọc một mã `ISSUED` và cùng đếm sai lệch; `consume` khoá lại lần nữa vì giữa `verify` và `consume` là hai transaction tách biệt — chỉ điều kiện `status='ISSUED'` trong `filter()` mới đảm bảo mã không bị tiêu hai lần.

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

        # Applies to EVERY outcome, not just 'new'. Checking only 'new' would let a
        # user whose old handset was replaced through an activation key simply log
        # back in on it: the old row still matches by device_id, and binding it
        # would silently revoke the current one. Two people could then alternate
        # handsets forever. Shared with the activate endpoint (7.4) so the two
        # gates cannot drift apart.
        if requires_activation(user, device):
            active = user.mobile_devices.filter(status='ACTIVE').first()
            raise serializers.ValidationError(_activation_required_error(active))

        if device is None:
            device = MobileDevice(user=user, device_id=attrs['device_id'])

        bind_mobile_device(user, device, attrs, hw, self.context['request'])
        update_last_login(None, user)
        return {'user': user, 'device': device, 'rebound': outcome == 'rebound',
                **issue_tokens_for_device(user, device, PLATFORM_MOBILE)}


def _activation_required_error(active) -> dict:
    """Body of the 400 that sends the client to the activation screen."""
    return {
        'code': 'ACTIVATION_REQUIRED',
        'detail': (f'Tài khoản đang liên kết với thiết bị khác (mã {active.client_code}). '
                   f'Vui lòng liên hệ admin để nhận mã kích hoạt cho thiết bị này.'),
        'bound_device': {
            'client_code': active.client_code,
            'device_name': active.device_name,
            'last_active': active.last_active.isoformat(),
        },
        'support_email': settings.SUPPORT_EMAIL,
    }
```

#### `bind_mobile_device()` — revoke trước, save sau

```python
@transaction.atomic
def bind_mobile_device(user, device, attrs, hardware_hash, request):
    """
    Make `device` the user's one active mobile handset.

    The outgoing device is stood down BEFORE the incoming one is saved:
    uniq_active_mobile_device_per_user rejects a second ACTIVE row, so saving
    first would raise IntegrityError on every real device change.
    """
    outgoing = user.mobile_devices.exclude(status='REVOKED')
    if device.pk:
        outgoing = outgoing.exclude(pk=device.pk)
    stale = list(outgoing.values_list('device_id', flat=True))

    if stale:
        user.mobile_devices.filter(device_id__in=stale).update(
            status='REVOKED', revoked_at=timezone.now(), revoked_reason='REPLACED')
        blacklist_tokens_for_devices(user, stale)

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
    device.revoked_at = None
    device.revoked_reason = None
    device.save()
```

> Cả hàm nằm trong một `atomic()`: nếu `device.save()` hỏng thì máy cũ không bị revoke oan, user vẫn dùng được máy đang có.
>
> Web session nằm ở bảng khác hoàn toàn nên không bị đụng — đây là điểm khác biệt so với hành vi hiện tại (P3).


#### Thay đổi v7 — cổng entitlement và hạn mức đếm được

`requires_activation()` của v6 trả lời câu "có máy **khác** đang giữ liên kết không". Với `mobile_max_devices` thì câu hỏi đổi thành "bind máy này có vượt hạn mức không", nên hàm được thay bằng một cổng ba bước:

```python
class MobileGateError(Exception):
    """Carries the response body for a refused mobile login."""
    def __init__(self, payload): self.payload = payload


def check_mobile_gate(locked_user, device) -> None:
    """
    Decide whether `device` may bind for this user. Call INSIDE the transaction
    that holds a row lock on the user, so the count cannot change underneath.

    `device is None` means a handset never seen before; an existing row — even a
    revoked one — already owns its slot and never re-pays for it.
    """
    if not locked_user.mobile_enabled:
        raise MobileGateError({
            'code': 'MOBILE_NOT_ENABLED',
            'detail': 'Tài khoản chưa được cấp quyền sử dụng ứng dụng di động. '
                      'Vui lòng liên hệ admin.',
            'support_email': settings.SUPPORT_EMAIL,
        })

    if device is not None and device.status == 'ACTIVE':
        return  # already holds a slot

    active = locked_user.mobile_devices.filter(status='ACTIVE')
    if active.count() >= locked_user.mobile_max_devices:
        raise MobileGateError(device_limit_error(locked_user, active))
```

> Điều kiện `device.status == 'ACTIVE'` mới là chỗ tinh tế. Một row `REVOKED` **không** đang giữ slot, nên máy cũ quay lại vẫn phải qua kiểm tra hạn mức như máy mới — đúng như vậy, vì slot của nó đã được giải phóng cho máy khác.

Login gọi cổng này bên trong khoá dòng:

```python
def validate(self, attrs):
    request = self.context['request']
    user = authenticate_user(attrs['email'].lower(), attrs['password'])
    hardware_hash = normalize_hardware_hash(attrs.get('hardware_hash'))

    with transaction.atomic():
        # Row lock serialises count-then-bind: two concurrent logins from two new
        # handsets would otherwise both read the same count and both bind.
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        device, outcome = resolve_mobile_device(locked_user, attrs['device_id'], hardware_hash)

        try:
            check_mobile_gate(locked_user, device)
        except MobileGateError as e:
            raise MobileDeviceError(e.payload)

        if device is None:
            device = MobileDevice(user=locked_user, device_id=attrs['device_id'])
        bind_mobile_device(locked_user, device, attrs, hardware_hash, request)
    ...
```

Và `bind_mobile_device()` **bỏ hẳn** đoạn revoke máy khác:

```python
def bind_mobile_device(user, device, attrs, hardware_hash, request):
    """
    Persist the row. Callers must already have passed check_mobile_gate().

    Unlike v6 this does NOT revoke the user's other handsets: with a real cap,
    being under it means the extra device is allowed, and being at it means the
    gate already refused. A slot is only ever freed explicitly (4.1).
    """
    device.device_type = 'IOS' if attrs['platform_os'] == 'ios' else 'ANDROID'
    ...
    device.status = 'ACTIVE'
    device.revoked_at = None
    device.revoked_reason = None
    device.save()
```

Luồng activate (§7.7) là chỗ **duy nhất** còn revoke tự động, và chỉ khi đang ở đúng hạn mức:

```python
# The code buys one slot: retire the least recently used handset so the rule is
# deterministic and explainable to the user, and correct when max > 1.
if active.count() >= locked_user.mobile_max_devices:
    oldest = active.order_by('last_active').first()
    oldest.status = 'REVOKED'
    oldest.revoked_at = timezone.now()
    oldest.revoked_reason = 'REPLACED'
    oldest.save(update_fields=['status', 'revoked_at', 'revoked_reason'])
    blacklist_tokens_for_devices(locked_user, [oldest.device_id])
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
  "support_email": "admin@huyenhoc.pro"
}
```

> **Không** trả mã kích hoạt trong response — trả thì bất kỳ ai có mật khẩu cũng lấy được mã và cơ chế mất hết tác dụng.
>
> Bản nháp trước có thêm cờ `has_pending_key` để app mở sẵn ô nhập mã. Đã **bỏ**: nó tiết lộ cho bất kỳ ai biết mật khẩu rằng admin đã cấp mã hay chưa, trong khi lợi ích UX gần như bằng không — màn hình kích hoạt luôn hiển thị ô nhập mã sẵn (§9.4).

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

Luồng gồm **hai giai đoạn tách biệt**, và ranh giới transaction giữa chúng là điều quan trọng nhất phải giữ đúng:

```python
def validate(self, attrs):
    request = self.context['request']
    user = authenticate_user(attrs['email'].lower(), attrs['password'])
    hw = normalize_hardware_hash(attrs.get('hardware_hash'))

    device, outcome = resolve_mobile_device(user, attrs['device_id'], hw)

    # Same gate as login, read the other way round (4.1). Refusing here keeps a
    # single-use key from being spent on a handset that could simply log in.
    if not requires_activation(user, device):
        raise serializers.ValidationError({
            'code': 'ALREADY_BOUND',
            'detail': 'Thiết bị này đăng nhập được bình thường, không cần mã kích hoạt.',
        })

    # Phase 1 — OUTSIDE any write transaction, so a wrong code still commits its
    # attempt counter (see 7.5). Raises ActivationError on failure.
    key = verify_activation_key(user, attrs['activation_key'])

    # Phase 2 — the key is good; bind the handset and spend the key atomically.
    with transaction.atomic():
        old = user.mobile_devices.filter(status='ACTIVE').first()

        # A handset this user has owned before keeps its original row and
        # client_code: the code identifies the physical device (6.5), so minting
        # a second one for the same phone would make the admin history unreadable
        # — and would collide with unique_together(user, device_id) anyway.
        if outcome == 'new':
            device = MobileDevice(user=user, device_id=attrs['device_id'])

        bind_mobile_device(user, device, attrs, hw, request)   # revokes `old` first
        consume_activation_key(key, device, get_client_ip(request))

        AdminAuditLog.objects.create(
            staff=key.issued_by, target_user=user,
            action_category='DEVICE_ACTIVATION',
            action_detail=f'User activated device {device.client_code} with key {key.key}',
            change_log={
                'before': {'client_code': old.client_code if old else None,
                           'device_name': old.device_name if old else None},
                'after': {'client_code': device.client_code,
                          'device_name': device.device_name,
                          'returning_handset': outcome != 'new'},
                'activation_key': key.key,
                'issued_by': key.issued_by.email if key.issued_by else None,
            },
            ip_address=get_client_ip(request),
        )

    update_last_login(None, user)
    return {'user': user, 'device': device,
            **issue_tokens_for_device(user, device, PLATFORM_MOBILE)}
```

> 🚨 **`MobileActivateView` KHÔNG được bọc `@transaction.atomic`.**
>
> `RegisterView.create()` — **cùng file `users/views/auth.py:49`** — có đúng decorator đó. Copy pattern sang đây sẽ kéo `verify_activation_key()` vào trong transaction của view, và lỗi C2 quay lại nguyên vẹn: mã sai làm rollback luôn `attempts`, giới hạn 5 lần biến mất mà không báo gì.
>
> Cùng lý do: `ATOMIC_REQUESTS` phải giữ `False` (hiện đang vậy — đã kiểm tra `config/settings.py`). Nếu sau này bật lên, luồng activate phải viết lại.
>
> T12 và T35 sẽ đỏ nếu ai đó vi phạm — nhưng chỉ khi chạy qua HTTP client thật (§13).

**Bốn điểm dễ làm sai, đã sửa qua hai vòng review:**

| | Bản nháp trước | Hiện tại |
|---|---|---|
| Đếm số lần nhập sai | Nằm trong transaction chung → `raise` rollback luôn `attempts` → giới hạn 5 lần **không tồn tại** | `verify_activation_key()` chạy transaction riêng, commit trước khi raise |
| Revoke máy cũ | Sau `device.save()` → hai row `ACTIVE` cùng lúc → **`IntegrityError`** ở happy path | `bind_mobile_device()` revoke trước, save sau (§7.6) |
| Điều kiện chặn | Login và activate mỗi bên tự viết → lệch nhau | Cùng gọi `requires_activation()` (§7.4) |
| Quay lại máy đã từng dùng | Luôn tạo row mới → vi phạm **cả** `unique_together(user, device_id)` **lẫn** `uniq_mobile_hardware_per_user` → **500** | Chỉ tạo row mới khi `outcome == 'new'`; máy cũ dùng lại row và giữ `client_code` |

`ActivationError` được `MobileActivateView` bắt và trả 400 với `{'code': 'ACTIVATION_FAILED', 'detail': str(e)}`.

Trả về giống login → user vào thẳng app, không phải đăng nhập lại lần nữa.

Throttle `ActivationRateThrottle` scope `device_activation`, 10 req/giờ/IP, kết hợp `attempts` trên chính key và entropy 60 bit của mã.

### 7.8 `RegisterSerializer` — bỏ ba field device (sửa C4)

Không có endpoint register riêng cho mobile. Thay vào đó, gỡ phần thừa ở serializer chung:

```python
class RegisterSerializer(serializers.ModelSerializer):
    """Register with email and password. Device binding happens at first login."""
    email = serializers.EmailField(required=True, write_only=True, allow_blank=False)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('email', 'password')      # device_id / device_type / device_name removed
```

**Lý do:** `RegisterSerializer.create()` hiện `pop()` cả ba field device rồi **vứt đi** — chúng không tạo `UserDevice`, không lưu ở đâu cả (device chỉ được tạo ở lần login đầu sau khi admin duyệt). Chúng là tàn dư từ thiết kế cũ, nhưng `device_type` lại là `ChoiceField(choices=UserDevice.DEVICE_TYPE_CHOICES)` và `required=True`, nên:

- App mobile gửi `device_type: 'ios'` → **400 ngay hôm nay**, đăng ký mobile không hoạt động.
- Sau khi §6.3 thu hẹp choices xuống chỉ còn `WEB`, kể cả app sửa gửi `MOBILE_IOS` cũng vẫn 400.

Bỏ hẳn ba field vừa mở đường cho mobile, vừa dọn nợ kỹ thuật.

**Web không bị ảnh hưởng:** `RegisterView.vue` vẫn gửi `device_id` / `device_type`, DRF bỏ qua field không khai báo. Không cần đổi frontend, không cần đổi app mobile.

> Test **T31** khoá hành vi này: register từ mobile payload (`device_type: 'ios'`) phải trả 201, và register từ web payload cũ cũng phải trả 201.

### 7.9 `users/serializers/auth.py` (web) — **toàn bộ thay đổi là 1 dòng**

`user.devices` giờ chỉ chứa web device, nên (1) và (3) ở §2.1 **đúng sẵn**. Chỉ còn (2):

```python
# Trước:
for token in OutstandingToken.objects.filter(user=user):
    BlacklistedToken.objects.get_or_create(token=token)

# Sau: blacklist đúng những device vừa bị revoke, không đụng token mobile
blacklist_tokens_for_devices(user, stale_device_ids)
```

*(Cần thêm 2 dòng thu thập `stale_device_ids` trước khi `update(status='REVOKED')`, vì `queryset.update()` không trả lại row đã sửa.)*

### 7.10 `users/authentication.py` — chọn bảng theo claim `platform`

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

> Nhánh fallback dựa hẳn vào dữ kiện §2.3. Nếu PO **không** xác nhận được rằng mobile chưa từng login thành công, phải đổi fallback thành "tra cả hai bảng" — an toàn hơn nhưng tốn thêm một query cho token cũ. *(Câu 1 §15.)*

### 7.11 Geo (feature-33) cho cả hai model

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

### 7.12 `users/services/tokens.py` — blacklist có phạm vi

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

### 7.13 Routes mới

```python
path('mobile/login/',    MobileLoginView.as_view(),    name='mobile_login'),
path('mobile/activate/', MobileActivateView.as_view(), name='mobile_activate'),
```

`POST /api/auth/login/` giữ nguyên cho web.

### 7.14 `GET /api/users/me/device-status/` — và lời giải cho P6

`bound_device` hiện luôn trả `null` vì `is_primary_bound` chưa từng được set `True` ở đâu (P6). v4 bỏ hẳn field đó khỏi `MobileDevice`, nên nếu không xử lý thì P6 sẽ nằm mãi trong bảng vấn đề mà không có lời giải.

**Quyết định: `bound_device` trỏ vào mobile device đang ACTIVE.** Đó vốn là ý nghĩa nghiệp vụ của "thiết bị đã liên kết" — web device không phải một binding, nó là 5 slot dùng xong bỏ.

```python
mobile = user.mobile_devices.filter(status='ACTIVE').first()
```

```json
{
  "is_device_locked": false,
  "last_device_reset": "2026-01-01T00:00:00Z",
  "can_reset_now": false,
  "next_reset_available_at": null,

  "bound_device": {
    "device_id": "9f3c1e2a-...-a91b",
    "device_type": "IOS",
    "device_name": "iPhone 15 Pro",
    "last_active": "2026-08-27T08:00:00Z"
  },

  "mobile_device": {
    "client_code": "MC-7F3A2B91",
    "device_name": "iPhone 15 Pro",
    "device_type": "IOS",
    "app_version": "1.4.2+31",
    "os_version": "iOS 17.4",
    "bound_at": "2026-08-01T10:20:30Z",
    "last_active": "2026-08-27T08:00:00Z"
  },

  "mobile_enabled": true,
  "mobile_max_devices": 1,
  "mobile_devices_count": 1,

  "web_devices_count": 3,
  "web_devices_quota": 5
}
```

- `mobile_enabled` / `mobile_max_devices` / `mobile_devices_count` cho app biết vì sao nó bị chặn mà không phải suy ra từ mã lỗi.
- `bound_device` **giữ nguyên shape cũ** (4 field) để client hiện tại không vỡ, nhưng từ nay có dữ liệu thật thay vì luôn `null`. **P6 được giải quyết.**
- `mobile_device` là dạng đầy đủ, có `client_code` cho app hiển thị ở Settings (§9.5). `null` khi user chưa từng đăng nhập mobile.
- `UserDevice.is_primary_bound` trở thành **field chết** — không code nào đọc nữa. Gỡ cột ở commit dọn dẹp cùng với việc đổi tên `WebDevice` (§3.5), không gỡ trong release này.
- `can_reset_now` / `next_reset_available_at` bị đóng băng — xem §7.15.

### 7.15 Dọn tàn dư của luồng "tự reset thiết bị" (S11)

Có một luồng tự phục vụ còn sót lại từ thiết kế cũ, và nó **mâu thuẫn trực tiếp với R7**:

| Nơi | Hiện trạng | Vấn đề |
|---|---|---|
| `DeviceStatusView` | Trả `can_reset_now` và `next_reset_available_at` (mốc `last_device_reset + 365 ngày`) | Quảng cáo một khả năng mà R7 **cấm** |
| `ApiEndpoints.deviceReset = '/users/me/device-reset/'` (mobile) | Route này **không tồn tại** ở backend — `users/urls.py` chỉ có `me/`, `me/avatar/`, `me/change-password/`, `me/device-status/` | App đang gọi vào **404** |
| `AuthBloc.DeviceResetRequested` → `AuthBlocDeviceResetSuccess` (mobile) | Luôn thất bại | State không bao giờ đạt tới |

Nói cách khác luồng này đã hỏng sẵn từ trước, chỉ là chưa ai để ý. Sau feature này nó còn sai về mặt chính sách, nên phải dọn dứt điểm thay vì để lại.

**Backend** — giữ field cho client cũ không vỡ, nhưng đóng băng giá trị:

```python
# The 365-day self-reset was removed with R7: a handset change now requires a
# staff-issued activation key (4.3). The two fields stay in the payload so older
# clients keep parsing it, but they can no longer report an available reset.
'can_reset_now': False,
'next_reset_available_at': None,
```

`User.last_device_reset` giữ nguyên trong DB — nó vẫn được `unbind_devices` ghi và là dữ liệu lịch sử có ích cho admin. Chỉ ngừng suy ra quyền reset từ nó.

**Mobile** — gỡ `ApiEndpoints.deviceReset`, `AuthRemoteDataSource.requestDeviceReset()`, event `DeviceResetRequested`, state `AuthBlocDeviceResetSuccess`, và mọi nút gọi tới chúng. Thay bằng `DeviceActivationScreen` (§9.4) là con đường đổi máy duy nhất.

> Đây là hạng mục **duy nhất** trong feature này có thể xoá đi thứ đang chạy. Vì luồng đang 404 nên rủi ro bằng 0, nhưng vẫn nên tách thành commit riêng để nếu có ai đó thực sự dựa vào nó thì revert được độc lập.

### 7.16 Logout **không** gỡ liên kết thiết bị

`LogoutView` hiện chỉ blacklist refresh token, không đụng tới device — và **phải giữ nguyên như vậy**.

Nếu logout cũng revoke `MobileDevice`, user đăng nhập lại trên chính máy mình sẽ rơi vào S3 và phải xin mã. Đăng xuất là thao tác hằng ngày; biến nó thành ticket CSKH là hỏng feature.

> Ghi rõ ở đây vì đây là chỗ rất dễ bị "sửa nhầm cho nhất quán" khi maintain: nhìn thấy `unbind_devices` revoke device, người sau dễ nghĩ logout cũng nên thế.

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

**Action 3 — quản lý entitlement** *(v7, trên `UserAdmin`)*:

| Action | Việc | Ghi chú |
|---|---|---|
| `enable_mobile_access` | `mobile_enabled = True` | Ghi `AdminAuditLog` category `MOBILE_ENTITLEMENT`. User đăng nhập app được ngay, không cần thao tác gì thêm |
| `disable_mobile_access` | `mobile_enabled = False` **và revoke mọi device đang ACTIVE** với `revoked_reason='MOBILE_DISABLED'` + blacklist token | Cắt phiên tức thì. Không revoke thì phiên hiện tại sống thêm tới 4 giờ (§4.1 hệ quả 3) |

`mobile_enabled` và `mobile_max_devices` cũng hiện trong fieldset "Quyền dùng ứng dụng di động" của `UserAdmin` để sửa từng user; `list_filter` thêm `mobile_enabled` để lọc nhanh ai đang được cấp quyền.

**Action 2 — `unbind_devices`** *(cắt phiên ngay, không cấp mã)*:

1. `status='REVOKED'`, `revoked_at=now()`, **`revoked_reason='ADMIN_UNBIND'`** — giá trị này là thứ phân biệt "cắt phiên" với "bị máy khác thay thế" khi admin đọc lịch sử (§4.2).
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

    def get_queryset(self, request):
        # ModelAdmin has no `request` attribute; masked_key() needs one to check
        # the permission, and get_queryset is the earliest per-request hook that
        # runs before the list columns are rendered.
        self.request = request
        return super().get_queryset(request).select_related('user', 'issued_by')

    @admin.display(description='Mã kích hoạt')
    def masked_key(self, obj):
        # Only a live code is worth reading, and only to staff cleared for it.
        staff = getattr(self, 'request', None)
        if (obj.status == 'ISSUED' and staff
                and staff.user.has_perm('users.view_activation_key_secret')):
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

`res/xml/backup_rules.xml` + `res/xml/data_extraction_rules.xml` loại trừ prefs `FlutterSecureStorage`. Thiếu bước này, restore backup sang máy mới mang theo client id cũ và user vào được máy mới **mà không cần mã** — thủng R7. Đối chiếu `hardware_hash` (§4.3) là lớp chặn thứ hai, nhưng chặn từ gốc vẫn tốt hơn.

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
- **Ô nhập luôn hiển thị**, không phụ thuộc việc user đã được cấp mã hay chưa. Bản nháp trước dùng cờ `has_pending_key` từ server để mở sẵn ô nhập; đã bỏ vì cờ đó tiết lộ cho bất kỳ ai biết mật khẩu rằng admin đã cấp mã hay chưa, đổi lại một lợi ích UX gần như bằng không.

### 9.5 Auth layer

- `ApiEndpoints.mobileLogin = '/auth/mobile/login/'`, `mobileActivate = '/auth/mobile/activate/'`.
- `AuthRemoteDataSource.login()` gửi `platform_os`, `hardware_hash`, `app_version`, `os_version`, `device_model`.
- `parseDioError()` xử lý `code == 'ACTIVATION_REQUIRED'` → `ActivationRequiredException(clientCode, deviceName, lastActive, supportEmail)`; `code == 'ACTIVATION_FAILED'` → hiện `detail` ngay dưới ô nhập mã (đó là thông báo còn bao nhiêu lần thử).
- `AuthBloc`: state `AuthBlocActivationRequired`, event `ActivationSubmitted` → gọi `/mobile/activate/` với credentials đang giữ từ lần login vừa thất bại.
- **Gỡ** `ApiEndpoints.deviceReset`, `requestDeviceReset()`, event `DeviceResetRequested`, state `AuthBlocDeviceResetSuccess` — endpoint đó không tồn tại ở backend và luồng tự reset đã bị R7 bãi bỏ (§7.15).

---

## 10. Frontend Web (Vue.js)

**Không thay đổi.** Web tiếp tục gọi `/api/auth/login/` với `device_type: 'WEB'`, quota 5, mã lỗi `DEVICE_LIMIT_REACHED`. Lợi ích gián tiếp: session web không còn bị đăng nhập mobile đá ra.

---

## 11. Trade-off & rủi ro

| Rủi ro | Đánh giá | Xử lý |
|---|---|---|
| **Mọi ca đổi máy đều thành ticket CSKH** | Hệ quả trực tiếp và cố ý của R7 | Hardware anchor (§4.3) loại S1/S2 khỏi luồng ticket — chỉ đổi máy thật mới cần mã. Cấp mã là 2 click + email tự gửi |
| **Không có admin ngoài giờ** → user kẹt qua đêm/cuối tuần | Trung bình | Cần PO quyết SLA cấp mã và ai trực. Vấn đề quy trình, không phải kỹ thuật |
| **Giả định "chưa có mobile device nào"** (§2.3) sai | Thấp nhưng ảnh hưởng thiết kế | Kiểm chứng bằng `SELECT count(*) FROM users_userdevice WHERE device_type LIKE 'MOBILE%'` trên production **trước** khi code. Nếu >0: thêm data migration chuyển row, và đổi fallback ở §7.10 thành tra cả hai bảng |
| **Token cũ không có claim `platform`** | Thấp | Fallback về `UserDevice` (§7.10) — đúng vì mobile chưa từng phát hành token nào. Tự hết sau khi refresh token cũ hết hạn |
| `hardware_hash` **giả mạo được** | Chấp nhận | Chỉ dùng để *nới lỏng*, không để *cấp quyền*. Chống giả mạo thật cần Play Integrity / App Attest |
| **Mất hoặc đổi Android keystore** → `ANDROID_ID` đổi hàng loạt | Thấp nhưng ảnh hưởng rộng nhất trong toàn feature | §4.5 D1: keystore là tài sản quan trọng nhất của dự án, phải backup ngoài máy dev. Nếu lên Play, dùng chính keystore này làm app signing key để tránh hẳn đợt S3 |
| **Đổi iOS bundle ID** khi chuyển ad-hoc → App Store | Thấp | §4.5 D2: giữ nguyên bundle ID thì Team ID không đổi, keychain sống sót, không có đợt S3 |
| **Trần 100 thiết bị/năm của ad-hoc** chặn trần user iOS | Trung bình — giới hạn của mô hình phân phối, không phải của feature | §4.5. Slot chỉ giảm trong một năm thành viên, xoá UDID không hoàn lại. PO cần biết trước khi đặt mục tiêu tăng trưởng iOS (câu 10 §15) |
| **Profile ad-hoc hết hạn hằng năm** → cài lại hàng loạt | Thấp | Cùng Team ID + bundle ID nên keychain sống sót → toàn bộ rơi vào **S1**, không ai cần mã. Ghi rõ ở §4.5 để đến kỳ gia hạn không ai hoảng |
| **Không qua store → không có auto-update** | Trung bình | §4.5: phải tự làm màn hình "có bản mới"; backend chịu client cũ lâu hơn. iOS có kỳ gia hạn hằng năm làm dịp ép cập nhật |
| ROM lỗi trả `ANDROID_ID` hằng số | Trung bình | `ANDROID_ID_DENYLIST` — bỏ sót thì mọi máy dính lỗi nhận nhau là cùng thiết bị |
| **Mã lưu plaintext** trong DB | Thấp (§5.2) | Vô dụng nếu không có mật khẩu; single-use; có hạn; che với staff không đủ quyền |
| Race hai request activate song song | Thấp | `select_for_update()` ở **cả** `verify_activation_key` lẫn `consume_activation_key` (§7.5) + partial unique index. `consume` lọc lại `status='ISSUED'` vì hai hàm nằm ở hai transaction |
| **Hai bảng device → field dùng chung lệch dần** | Trung bình, dài hạn — điểm yếu thật của phương án tách | `AbstractDevice` (§3.4) giữ 10 field chung ở một chỗ. Phần *hành vi* chung đã nằm ở service dùng chung (`services/auth.py`, `services/tokens.py`, `services/geo.py`). Còn *chính sách* thì hai bên **cố ý khác nhau** — lệch ở đó là đúng, không phải lỗi |
| Geo phải chạy cho 2 model | Thấp | §7.11 — `save_geo_to_device` đã duck-typed, chỉ sửa 3 chỗ hardcode |
| App mobile cũ vẫn gọi `/auth/login/` | App cũ **đang** hỏng sẵn (P1) → không phải regression | Force-update qua remote config; xem câu 2 §15 |
| Va chạm `client_code` (8 hex) | ~0.1% ở quy mô 10⁵ | Retry có salt + `UNIQUE` ở DB |
| `queryset.update()` bỏ qua `save()` → `revoked_at` không set | Bug tiềm ẩn khi maintain | Mọi chỗ revoke hàng loạt truyền `revoked_at` **và** `revoked_reason` tường minh; T34 bao phủ |
| **Ranh giới transaction giữa `verify` và `consume`** bị người sau gộp lại cho gọn, hoặc `MobileActivateView` bị bọc `@transaction.atomic` theo precedent của `RegisterView` | Trung bình — chính là lỗi C2 của bản nháp v4 | Docstring của cả hai hàm nói rõ hàm nào nằm trong/ngoài transaction; cảnh báo đậm ở §7.7; T12 và T35 sẽ đỏ nếu ai đó gộp |
| **Hai endpoint mobile lệch nhau về điều kiện chặn** | Trung bình — đã xảy ra thật (lỗi C5 ở vòng review thứ hai): vá đường login xong thì đường activate không xử lý nổi lưu lượng bị đẩy sang | Cổng chung `requires_activation()` (§7.4); T38 kiểm tra bảng chân trị, T30 và T36 là **cặp** login/activate của cùng một kịch bản |

### Cân nhắc sau (ngoài scope)

- **Cho `UserDevice` kế thừa `AbstractDevice` + đổi tên thành `WebDevice`** (§3.4, §3.5) — cùng một commit dọn dẹp riêng sau khi feature chạy ổn. Bắt buộc `makemigrations --dry-run` xác nhận migration rỗng.
- **Device attestation thật** — iOS DeviceCheck/App Attest, Android Play Integrity. **Mô hình phân phối đã chốt làm phương án này yếu đi đáng kể** (§4.5): Play Integrity trả `appRecognitionVerdict = UNRECOGNIZED_VERSION` cho APK không phát hành qua Play, nên chỉ còn dùng được tín hiệu device integrity, mất tín hiệu app authenticity. App Attest trên iOS ad-hoc về lý thuyết vẫn chạy nhưng cần kiểm chứng thực tế. Chỉ làm nếu số liệu cho thấy có tình trạng lách bằng `hardware_hash` giả.

### Rollback

Migration `0009` chỉ **tạo bảng mới** — `migrate users 0008` xoá sạch, không dữ liệu cũ nào bị đụng. Hai endpoint mobile là route mới, gỡ khỏi `urls_auth.py` là xong. Thay đổi duy nhất chạm vào code web (`blacklist_tokens_for_devices`) revert độc lập được.

---

## 12. Đo lường thành công

Feature này đánh đổi trải nghiệm user lấy khả năng kiểm soát, nên phải đo được cả hai phía. Không có số liệu thì khi ticket tăng sẽ không biết do chính sách chặt hay do hardware anchor không chạy.

| # | Chỉ số | Nguồn | Ngưỡng kỳ vọng | Ý nghĩa khi lệch |
|---|---|---|---|---|
| **M1** | **Tỷ lệ `rebound: true`** trên tổng login mobile | Log field `rebound` ở response §7.6 | Android: 3–10% (cài lại app là chuyện thường)<br>iOS: gần 0 (Keychain sống sót gỡ app) | **Gần 0 trên Android** = hardware anchor **không hoạt động** → mọi ca cài lại app biến thành ticket. Kiểm tra ngay `android_id` và backup rules (§9.3) |
| **M2** | Số mã kích hoạt cấp / tháng | `DeviceActivationKey` filter `created_at` | Tương đương số ca đổi máy thật | Tăng đột biến → M1 đang hỏng, hoặc có tình trạng share tài khoản |
| **M3** | Tỷ lệ mã cấp ra **được dùng** (`USED` / tổng cấp) | `DeviceActivationKey.status` | > 80% | Thấp → mã tới tay user không kịp (email vào spam, TTL 7 ngày quá ngắn), hoặc admin cấp thừa |
| **M4** | Thời gian trung bình từ `created_at` → `used_at` | `DeviceActivationKey` | < 24 giờ | Dài → luồng gửi mã có nút thắt; xem lại kênh gửi và SLA (câu 5 §15) |
| **M5** | Tỷ lệ login mobile thành công | Log `mobile/login/` theo status code | > 95% (loại trừ sai mật khẩu) | Thấp → còn lỗi ở luồng nhận diện thiết bị |
| **M6** | Số `ACTIVATION_REQUIRED` / tổng login mobile | Log status code + `code` | < 1% | Cao → chính sách đang chặn nhầm S1/S2 |
| **M7** | Số lần nhập sai mã (`attempts > 0`) | `DeviceActivationKey.attempts` | Thấp và tản mát | Tập trung vào vài user → dấu hiệu dò mã; kiểm tra throttle |

**M1 là chỉ số quan trọng nhất** — nó đo trực tiếp thứ quyết định feature này dễ chịu hay ngột ngạt. Nên có ngay từ tuần đầu sau release, trước khi kịp tích luỹ ticket.

| | Ai xem | Tần suất |
|---|---|---|
| M1, M5, M6 | Dev trực release | Hằng ngày trong 2 tuần đầu, sau đó hằng tuần |
| M2, M3, M4 | Người phụ trách CSKH | Hằng tuần |
| M7 | Dev | Hằng tháng, hoặc khi có cảnh báo throttle |

*(Cột "ai xem" cần PO chốt tên cụ thể — câu 9 §15.)*

Cách lấy tối thiểu, không cần hạ tầng mới: `logger.info` một dòng có cấu trúc ở `MobileLoginSerializer` (`outcome`, `platform_os`, `client_code`) và đếm bằng `grep`/log aggregator. M2–M4, M7 thì query thẳng `DeviceActivationKey` trong Django admin hoặc shell.

---

## 13. Test plan

### Backend — `users/tests/test_mobile_device.py`

| # | Test | Kỳ vọng |
|---|---|---|
| T1 | User có 5 web device ACTIVE, login mobile lần đầu | 200, tạo mobile device, **không** bị chặn bởi quota web |
| T2 | User có 1 mobile device ACTIVE, login từ device_id + hardware_hash khác | 400 `ACTIVATION_REQUIRED`, kèm `client_code` cũ và `support_email`; **không** có field nào tiết lộ đã cấp mã hay chưa |
| T3 | Login mobile khi đang có session web | Web device vẫn `ACTIVE`; refresh token web **không** bị blacklist; request web tiếp theo 200 |
| T4 | Login web khi đang có session mobile | Mobile device vẫn `ACTIVE` |
| **T5** | **S1** — logout rồi login lại cùng `device_id` | 200, `rebound: false`, **không** tạo row mới, `client_code` không đổi, **không** cần mã |
| **T6** | **S1'** — login lại sau khi admin `unbind` | 200, row cũ reactivate, **không** cần mã |
| **T7** | **S2** — `device_id` mới + `hardware_hash` cũ | 200, `rebound: true`, row cũ cập nhật `device_id`, `client_code` **giữ nguyên**, tổng row mobile vẫn 1 |
| **T8** | **P7** — `device_id` cũ + `hardware_hash` khác (clone) | 400 `ACTIVATION_REQUIRED` |
| T9 | `hardware_hash` trong `ANDROID_ID_DENYLIST` | Bị bỏ qua, xử lý như không có anchor |
| T10 | `hardware_hash` sai định dạng | `normalize_hardware_hash` trả `None`, không lỗi 500 |
| **T11** | **C1** — activate với mã đúng khi đang có máy ACTIVE | 200 (**không** `IntegrityError`), row mới `client_code` **mới**, row cũ `REVOKED` + `revoked_reason='REPLACED'` + token blacklist, key → `USED` với `used_device` đúng, `AdminAuditLog` ghi |
| **T12** | **C2** — activate với mã sai | 400, báo còn N lần, **không** row mới nào được tạo. Đọc lại `key.attempts` từ DB (query mới, không dùng object cũ trong bộ nhớ) → **phải bằng 1**. Đây là test khoá lỗi rollback-mất-attempts |
| **T13** | Nhập sai đủ 5 lần **qua 5 request HTTP riêng biệt** | `attempts` tăng dần 1→5 qua từng request, key → `REVOKED`, lần thứ 6 báo phải xin mã mới. Gọi 5 lần trong một test transaction sẽ **không** bắt được lỗi C2 |
| **T14** | Activate với mã đã `USED` | 400 — không có key `ISSUED` nào |
| **T15** | Activate với mã hết hạn | 400, key → `EXPIRED` |
| **T16** | Activate với mã của **user khác** | 400 — `verify_activation_key` filter theo `user`, mã không dùng chéo được |
| **T17** | Activate trên máy **đang là** device ACTIVE của user | 400 `ALREADY_BOUND`, mã **không** bị tiêu |
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
| **T30** | **C3 — test quan trọng nhất.** Máy A ACTIVE → activate máy B bằng mã → đăng nhập lại **máy A** (cùng `device_id`, cùng `hardware_hash`) | 400 `ACTIVATION_REQUIRED`. Máy B vẫn `ACTIVE`. Nếu test này pass mà login vẫn 200 thì R7 đã thủng |
| **T31** | **C4** — register bằng payload mobile (`device_type: 'ios'`) và bằng payload web cũ (`device_type: 'WEB'`) | Cả hai trả 201; không `UserDevice` nào được tạo |
| **T32** | **S1/P6** — `GET /me/device-status/` khi user có mobile device ACTIVE | `bound_device` **khác null** và khớp mobile device; `mobile_client` có `client_code` |
| **T33** | **S7** — logout rồi login lại trên cùng máy | 200, không cần mã, cùng `client_code` |
| **T34** | `revoked_reason` sau `unbind_devices` là `ADMIN_UNBIND`; sau activate là `REPLACED` | Đúng giá trị từng trường hợp |
| **T35** | `verify_activation_key` gọi **ngoài** transaction: mock cho phase 2 raise sau khi verify thành công | Key vẫn `ISSUED` (chưa `USED`), không row device nào được tạo |
| **T36** | **C5 — cặp đôi của T30.** Máy A ACTIVE → activate máy B bằng mã → máy A xin mã → **activate trên máy A** | 200 (**không** `IntegrityError`). Dùng lại **row A cũ** với `client_code` cũ; máy B thành `REVOKED/REPLACED`; tổng row mobile của user vẫn là **2**, không phải 3 |
| **T37** | Activate khi user **không** có device ACTIVE nào (admin vừa `unbind` hết) | 400 `ALREADY_BOUND`; mã **vẫn `ISSUED`**, không bị tiêu phí cho việc chỉ cần login thường |
| **T38** | `requires_activation()` — bảng chân trị: không device nào ACTIVE / chính device đó ACTIVE / device **khác** ACTIVE | `False` / `False` / `True`. Login và activate phải cho kết quả **ngược nhau** trên cùng đầu vào |
| **T39** | **S11** — `GET /me/device-status/` | `can_reset_now: false`, `next_reset_available_at: null` bất kể `last_device_reset` cũ tới đâu |
| **T40** | **v7** — login mobile khi `mobile_enabled = False` | 403 `MOBILE_NOT_ENABLED`; **không** row `MobileDevice` nào được tạo và `last_active` không đổi |
| **T41** | **v7** — bật `mobile_enabled`, login lần đầu | 200, tạo device, `mobile_devices_count = 1` |
| **T42** | **v7** — `max = 1`, đã có 1 máy ACTIVE, login máy thứ hai | 400 `MOBILE_DEVICE_LIMIT`, `bound_devices` là **mảng** 1 phần tử; máy cũ vẫn `ACTIVE` (**không** bị revoke ngầm) |
| **T43** | **v7** — `max = 2`, đã có 1 máy, login máy thứ hai | 200; **cả hai** máy `ACTIVE`; máy đầu không bị đụng |
| **T44** | **v7** — đang ở max, login lại trên **chính máy cũ** | 200 — S1 không tiêu slot (thứ tự bước 3 trước bước 4, §4.1) |
| **T45** | **v7** — đang ở max, máy cũ cài lại app (`hardware_hash` khớp) | 200, `rebound: true` — S2 cũng không tiêu slot |
| **T46** | **v7** — tắt `mobile_enabled` khi user đang có device ACTIVE | Device → `REVOKED/MOBILE_DISABLED`, token bị blacklist, request tiếp theo 401 |
| **T47** | **v7** — bật lại `mobile_enabled` rồi login trên máy cũ | 200, row cũ reactivate, `client_code` không đổi |
| **T48** | **v7 race** — hai request login song song từ hai máy mới, `max = 1` | Đúng **1** thành công, 1 trả `MOBILE_DEVICE_LIMIT`. Test này là lý do có row lock; không có nó cả hai cùng bind |
| **T49** | **v7** — activate khi đang ở max, `max = 2` | Máy `last_active` cũ nhất → `REVOKED/REPLACED`; máy còn lại **không** bị đụng |

### Mobile — `test/core/device/device_service_test.dart`

| # | Test | Kỳ vọng |
|---|---|---|
| M1 | `platformOs` trên iOS / Android | `ios` / `android` |
| M2 | `getDeviceId()` gọi 2 lần | Cùng giá trị, chỉ ghi secure storage 1 lần |
| M3 | `getHardwareHash()` khi platform trả null | Trả `null`, không throw |
| M4 | `getHardwareHash()` ổn định qua nhiều lần gọi | Cùng giá trị, đúng 64 hex |
| M5 | `parseDioError` với body `ACTIVATION_REQUIRED` | Throw `ActivationRequiredException` đủ field (`clientCode`, `deviceName`, `lastActive`, `supportEmail`) |
| M6 | Ô nhập mã: gõ `tt4km9x7qp2n5r` | Hiển thị `TT-4KM9-X7QP-2N5R`, gửi lên đúng định dạng |

---

## 14. Thứ tự triển khai

| Bước | Nội dung |
|---|---|
| **BE-0** | **Kiểm chứng §2.3 trên production**: `SELECT count(*) FROM users_userdevice WHERE device_type LIKE 'MOBILE%'`. Kết quả ≠ 0 thì quay lại §15 câu 1 trước khi code tiếp |
| **BE-1** | `constants.py`, `services/client_id.py`, `services/tokens.py`, `services/auth.py` + unit test |
| **BE-2** | `AbstractDevice` (§3.4) — **chỉ** `MobileDevice` kế thừa, không đụng `UserDevice`; model `MobileDevice`, `DeviceActivationKey`; `AdminAuditLog` thêm choice; migration `0009`. Chạy `makemigrations --dry-run` xác nhận không sinh `AlterField` nào cho `UserDevice` |
| **BE-3** | `services/mobile_device.py`; `services/activation.py` với **`verify_activation_key` tách khỏi `consume_activation_key`** (§7.5) + test T11–T20, T35. **T12 và T13 phải chạy qua HTTP client thật**, không gọi hàm trực tiếp — lỗi rollback-mất-`attempts` chỉ lộ khi có ranh giới transaction thật |
| **BE-4** | `serializers/mobile_auth.py`, `views/mobile_auth.py`, throttle, routes. **Cả hai endpoint gọi `requires_activation()`** (§7.4), không tự viết điều kiện. `MobileActivateView` **không** decorator `@transaction.atomic` (§7.7). Chạy T30, T36, T37, T38 ngay sau bước này — chúng phủ đúng cặp login/activate |
| **BE-5** | `authentication.py` platform claim + `DeviceTokenRefreshView` forward + test T22–T25 |
| **BE-6** | Sửa 1 dòng blacklist trong `serializers/auth.py` (web); **bỏ 3 field device khỏi `RegisterSerializer`** (§7.8) + chạy T29, T31 |
| **BE-7** | Geo cho 2 model: `signals.py`, `tasks.py`, `fetch_device_geo` + test T26 |
| **BE-8** | `MobileDeviceAdmin`, `DeviceActivationKeyAdmin`, inline trong `UserAdmin`, permission `view_activation_key_secret`, icon Jazzmin |
| **BE-9** | Email template + `_send_activation_email`; task `expire_activation_keys` + Celery beat |
| **BE-10** | `DeviceStatusView` — `bound_device` trỏ vào mobile device (§7.14, giải P6) + đóng băng `can_reset_now` (§7.15) + test T32, T39; log có cấu trúc cho M1 (§12); chạy T1–T49; cập nhật `md/core/api-specification.md`, `md/core/database-design.md` |
| **MB-1** | Dependency `android_id`, `package_info_plus`; `DeviceService`; Android backup rules |
| **MB-2** | Datasource đổi endpoint + payload; `ActivationRequiredException`; `AuthBloc` state/event |
| **MB-3** | `DeviceActivationScreen` + ô nhập mã có format |
| **MB-4** | Hiển thị `client_code` ở Settings; **gỡ luồng device-reset đã chết** (§7.15) ở commit riêng; test M1–M6 |
| **REL** | Deploy backend trước (bảng và endpoint mới không ảnh hưởng ai đang chạy), sau đó phát hành app kèm force-update |

---

## 15. Câu hỏi cần PO quyết

1. **Xác nhận production chưa có mobile device nào** (§2.3). Đây là giả định chống đỡ ba quyết định: migration không cần chuyển dữ liệu, fallback JWT ở §7.10, và việc thu hẹp `device_type` choices của `UserDevice`. Chạy `SELECT count(*) FROM users_userdevice WHERE device_type LIKE 'MOBILE%'` là biết. Nếu ≠ 0, tôi bổ sung data migration + đổi fallback thành tra cả hai bảng.
2. **S1/S2 có được miễn mã kích hoạt không?** — Đề xuất **có** (§4). Nếu PO muốn *mọi* thay đổi client id đều phải xin mã thì mỗi lần user cài lại app hay đổi ROM là một ticket, và số ticket sẽ lớn hơn nhiều lần số ca đổi máy thật.
3. **Lưu mã plaintext hay hash?** — Đề xuất plaintext (§5.2) để CSKH đọc lại được mã khi user làm mất. Hash thì admin chỉ xem được mã **một lần** lúc tạo.
4. **Hiệu lực của mã** — đề xuất 7 ngày, sai tối đa 5 lần. PO thấy hợp lý?
5. **Ai được cấp mã và SLA bao lâu?** — Mọi staff hay chỉ nhóm quyền riêng? Ngoài giờ hành chính / cuối tuần xử lý thế nào? Phần quy trình, không phải kỹ thuật, nhưng quyết định trải nghiệm thực tế của feature.
6. **Đổi tên `UserDevice` → `WebDevice` và cho nó kế thừa `AbstractDevice`?** — Đề xuất làm ở commit dọn dẹp riêng sau khi feature chạy ổn (§3.4, §3.5), không gộp vào release này.
7. **Quota web = 5** giữ nguyên hay điều chỉnh, khi đã tách khỏi mobile?
8. **Có gửi email tự động** kèm mã cho user không (đề xuất: có, tái dùng SMTP Resend của feature-32), hay admin tự gửi qua kênh khác?
9. **Chỉ số M1 (tỷ lệ `rebound`) có ai theo dõi không?** (§12) — nó là cảnh báo sớm duy nhất cho việc hardware anchor không hoạt động. Nếu không ai nhìn, ticket sẽ tăng dần mà không ai biết nguyên nhân.
10. **Trần 100 thiết bị iOS/năm của ad-hoc** (§4.5) — mục tiêu số user iOS trong 12 tháng tới là bao nhiêu? Nếu vượt 100 thì phải tính chuyện lên TestFlight hoặc App Store **trước** khi chạm trần, không phải sau. Đây là ràng buộc phân phối chứ không phải của feature, nhưng R1 (1 user = 1 máy) làm hai con số trùng nhau.
12. ✅ **Đã chốt** — gộp `DeviceActivationKey` vào `MobileDevice`. Mỗi slot mang đúng một mã nên hai bảng là tách đôi thứ vốn là một (§6.1).
15. ✅ **Đã chốt** — mã gửi **ngoài luồng qua Zalo / điện thoại**, hệ thống không gửi email. Hệ quả: bỏ template email, admin phải copy được mã dễ dàng, và TTL quan trọng hơn vì không có xác nhận đã gửi (§5.4).
12b. ~~Bỏ `DeviceActivationKey`?~~ (§4.1) — mã kích hoạt sinh ra để bịt khoảng trống "admin gỡ máy cũ rồi ai login trước cũng chiếm được slot". Mô hình duyệt `PENDING` bịt khoảng trống đó chặt hơn: admin duyệt **một `device_id` cụ thể**, không phải một quyền mà máy bất kỳ tiêu thụ được. Giữ cả hai là hai lớp duyệt cho cùng một việc. Bỏ được: 1 model, 1 endpoint, 1 màn hình app, template email, ~10 test.
14. ✅ **Đã chốt theo hệ quả của câu 12** — bỏ `mobile_enabled`; "chưa được cấp slot" đã là trạng thái tắt (§6.2).
12b. ~~Có giữ `DeviceActivationKey` không?~~ (§4.1 hệ quả 4) — giờ đã có `mobile_max_devices`, đường đơn giản hơn đã tồn tại: admin gỡ máy cũ, user đăng nhập máy mới. Mã kích hoạt vẫn đáng giữ vì nó đóng khoảng trống giữa hai bước đó — không có mã thì **ai đăng nhập trước cũng chiếm được slot**, kể cả người đang share tài khoản. Nếu PO chấp nhận rủi ro đó thì bỏ được hẳn một model, một endpoint, một màn hình và ~10 test.
13. **`mobile_max_devices` có bao giờ khác 1 không?** — nếu luôn là 1, tôi giữ lại partial unique index (mạnh hơn row lock) và biến field thành hằng số. Nếu có thể là 2+ thì phải bỏ index như §4.1 mô tả. Câu trả lời quyết định độ chắc của ràng buộc.
11. **Keystore Android đang backup ở đâu?** (§4.5 D1) — mất nó là mất khả năng cập nhật app **và** toàn bộ user Android rơi vào S3 cùng lúc. Nếu hiện chỉ nằm trên một máy dev thì nên xử lý trước khi release, không đợi sau.
