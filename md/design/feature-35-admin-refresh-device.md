# Feature 35 — Admin quản lý thiết bị: thêm slot theo user và làm mới slot khi đổi máy

## Document Information
- **Feature**: Hai việc trên `MobileDeviceAdmin` — (1) nút **Thêm thiết bị**: chọn user, hệ thống tự sinh mã ghép cặp; (2) action **Làm mới thiết bị**: reset slot về `UNCLAIMED` tại chỗ, giữ `client_code` và lịch sử, sinh mã mới, xoá ràng buộc phần cứng.
- **Status**: **v5 — Implemented (Stage 3, 2026-08-30)**. 55/55 test backend xanh.
- **Created**: 2026-08-30
- **Updated**: 2026-08-30
  - v5: Bổ sung **§6.5** — nút "Làm mới thiết bị" ngay trên change form kèm pop-up xác nhận, thay vì chỉ có bulk action ở changelist. Kéo theo T35-17…T35-21.
  - v4: Implement xong. Phát sinh một sửa ngoài §10: §4.2(d) — `issue_tokens_for_device()` ghi `OutstandingToken` trước khi gắn claim `device_id`, khiến `blacklist_tokens_for_devices()` chưa bao giờ khớp được gì (ảnh hưởng cả `revoke_slots` có sẵn). T35-6 điều chỉnh theo hành vi thật của `resolve_mobile_device`.
  - v3: **Xử lý PO review v2** — 3 Critical (C1 snippet gán `None` vào field `NOT NULL`, C2 `_serialise()` thiếu định nghĩa khiến `JSONField` ném `TypeError`, C3 T35-6 không có code xử lý) và 4 Suggestion. Chốt 6 quyết định ở §11, trong đó **§4.2 đổi sang CÓ blacklist token**.
  - v2: bổ sung **§6.4 Thêm thiết bị từ admin** theo yêu cầu — nút Add trên `MobileDevice` với form chọn user, thay cho việc phải sang danh sách User chạy bulk action. Kéo theo P5/R6, phạm vi, T35-13…T35-16.
- **Related**: `feature-34-mobile-client-id.md` (§4.1 ghép cặp, §5.6 vòng đời slot, §7.5 verify/claim), `feature-33-device-geo-location.md`

---

## 1. Tóm tắt

Feature này gom hai việc còn thiếu ở màn hình quản lý thiết bị trong admin.

### Việc 1 — Thêm thiết bị (§6.3)

Danh sách `MobileDevice` hiện **không có nút Add** (`has_add_permission` trả `False`). Muốn cấp slot, admin phải sang danh sách **User**, tick user, rồi chạy bulk action "Cấp slot thiết bị mới" — không ai đoán ra được. Feature 35 bật lại nút Add với một form riêng: **chọn user → hệ thống tự sinh `client_code` + `pairing_code` và hiện mã ra cho admin copy**. Form vẫn đi qua `issue_slot()` nên hạn mức `mobile_max_devices` vẫn được kiểm.

### Việc 2 — Làm mới thiết bị (§3–§4)

Hiện tại khi user đổi máy, admin phải làm **hai bước huỷ diệt**: `revoke_slots` (slot chết vĩnh viễn, trạng thái `REVOKED`) rồi `issue_slot` (tạo row mới, `client_code` mới). Mỗi lần đổi máy sinh thêm một row rác và một mã định danh mới, nên không thể trả lời câu hỏi "máy của anh A đã đổi mấy lần" nếu không tự nối các row lại bằng mắt.

Feature 35 thêm action thứ ba — **"Làm mới thiết bị"** — reset slot **tại chỗ**:

| Trường | Trước | Sau refresh |
|---|---|---|
| `client_code` | `TT-XXXX...` | **giữ nguyên** |
| `pairing_code` | mã cũ (đã dùng) | **mã mới** |
| `status` | `ACTIVE` | `UNCLAIMED` |
| `device_id`, `hardware_hash` | của máy cũ | `NULL` |
| `expires_at` | quá khứ / cũ | `now + DEVICE_PAIRING_TTL_DAYS` |
| `claim_attempts` | 0..5 | `0` |

Slot trở thành **danh tính của user**, không còn là danh tính của một chiếc điện thoại. Đổi máy = làm mới slot cũ, không tốn quota `mobile_max_devices`, không sinh row mới.

**Hai phát hiện phải đọc trước khi duyệt** — §4.1 (`verify_pairing_code` hiện chỉ xét slot cũ nhất, refresh sẽ kích hoạt bug này) và §4.2 (lựa chọn "không blacklist token cũ" trên thực tế không đạt được điều PO muốn, và làm app mobile kẹt ở trạng thái lỗi thay vì quay về màn hình đăng nhập).

---

## 2. Phân tích hiện trạng

### 2.1 Luồng đổi máy hôm nay

```
User đổi điện thoại
  └─> Login máy mới → resolve_mobile_device() → 'new'  (device_id lạ, hardware_hash lạ)
        └─> 400 PAIRING_CODE_REQUIRED
  └─> User gọi admin
        ├─ Bước 1: revoke_slots  → slot cũ ACTIVE → REVOKED, token bị blacklist
        └─ Bước 2: issue_slot    → row MỚI, client_code MỚI, pairing_code MỚI
  └─> Admin đọc mã mới qua Zalo → user nhập → claim_slot() → ACTIVE
```

Chi tiết đáng chú ý: `revoke_slots` phải chạy **trước** `issue_slot`, vì `issue_slot` đếm `status__in=OCCUPYING` và với `mobile_max_devices=1` thì slot `ACTIVE` cũ đang chiếm chỗ. Admin làm ngược thứ tự sẽ nhận `SlotError` "Đã dùng hết 1 thiết bị cho phép".

### 2.2 Vấn đề

| # | Vấn đề | Hệ quả |
|---|---|---|
| P1 | Đổi máy sinh row mới + `client_code` mới | `client_code` được thiết kế là "định danh vĩnh viễn của slot" (feature-34 §6.4), nhưng thực tế nó chết theo mỗi lần đổi máy. Hỗ trợ không tra được lịch sử theo một mã duy nhất. |
| P2 | Hai bước, đúng thứ tự, nếu sai thì lỗi | Thao tác admin dễ sai; thông báo lỗi không nói rõ "hãy revoke trước". |
| P3 | Bảng phình theo số lần đổi máy | Mỗi user đổi máy N lần → N+1 row, N row `REVOKED` không bao giờ dùng lại. |
| P4 | Không có đường "cấp lại mã" cho slot `UNCLAIMED` đã cháy | Slot bị `EXPIRED` do user nhập sai 5 lần thì chỉ còn cách revoke + issue, dù chưa có máy nào bind. |
| P5 | Danh sách `MobileDevice` không có nút Add | Cấp slot chỉ làm được từ danh sách **User** bằng bulk action. Admin đang đứng ở màn hình thiết bị phải đổi màn hình, tick đúng user, tìm đúng action trong dropdown. Không khám phá được, và sai chỗ về mặt nghiệp vụ: đối tượng đang tạo là *thiết bị*, không phải *user*. |

### 2.3 Yêu cầu nghiệp vụ

- **R1** — Admin reset một slot về trạng thái "chờ ghép cặp" bằng **một** thao tác.
- **R2** — `client_code` sống xuyên suốt các lần đổi máy của cùng một slot.
- **R3** — Không tốn thêm quota `mobile_max_devices` (slot vẫn là slot cũ, vẫn chiếm đúng 1 chỗ).
- **R4** — Vẫn phải nhập mã ghép cặp trên máy mới: refresh **không** mở đường đăng nhập tự do bằng email + password.
- **R5** — Toàn bộ thao tác ghi `AdminAuditLog`, kèm snapshot máy cũ để tra ngược.
- **R6** — Thêm thiết bị ngay từ danh sách `MobileDevice`: chọn user, hệ thống tự sinh mã, hiện mã ra để admin copy. Vẫn phải chặn khi user đã hết hạn mức.

### 2.4 Phạm vi

**Trong phạm vi**
- Service `refresh_slot()` trong `users/services/mobile_slot.py`.
- Action `refresh_slots` trên `MobileDeviceAdmin` (list `MobileDevice`).
- **Nút Add trên `MobileDeviceAdmin`** — form chọn user, route qua `issue_slot()` (§6.4), kèm template `admin/users/mobiledevice/issue_slot.html`.
- Sửa `verify_pairing_code()` để chọn slot **theo mã** thay vì theo `created_at` (§4.1).
- Test cho cả ba.

**Ngoài phạm vi**
- Không đổi API mobile: `POST /api/auth/mobile/login/` giữ nguyên contract.
- Không sửa app Flutter (app đã có sẵn ô "Mã ghép cặp" khi backend trả `PAIRING_CODE_REQUIRED`).
- Không thêm action lên `UserAdmin` — refresh cần chọn **đúng một slot**, mà `UserAdmin` chỉ chọn được user. `MobileDeviceInline` trên trang user đã hiển thị `client_code` để admin nhảy sang danh sách `MobileDevice`.

---

## 3. Quyết định thiết kế

### 3.1 Ngữ nghĩa của refresh — PO đã chốt

Ba phương án đã cân nhắc:

| PA | Mô tả | Kết luận |
|---|---|---|
| A | Giữ slot, **giữ mã cũ** — user nhập lại chính mã cũ trên máy mới | Loại. Mã đã đi qua Zalo một lần và có thể còn nằm trong lịch sử chat; tái sử dụng biến mã một-lần thành mật khẩu vĩnh viễn. |
| **B** | **Giữ slot, sinh mã mới** | ✅ **Chọn.** Giữ `client_code` + lịch sử (R2), vẫn là mã một-lần (R4). Admin phải đọc mã mới cho user — chấp nhận được vì đằng nào cũng phải liên lạc để biết user đổi máy. |
| C | Bỏ mã, máy kế tiếp login tự bind | Loại. Vi phạm R4: lộ password = lộ luôn quyền truy cập, xoá sạch lớp phòng thủ mà feature-34 dựng lên. |

### 3.2 So sánh với `revoke_slots` — vì sao không gộp làm một

Hai action giải quyết hai ý định khác nhau, và **không** nên gộp:

| | `revoke_slots` (có sẵn) | `refresh_slots` (mới) |
|---|---|---|
| Ý định | "Cắt quyền của thiết bị này" | "User này đổi máy, cấp lại chỗ cũ" |
| Slot sau đó | `REVOKED` / `EXPIRED` — chết | `UNCLAIMED` — sống, chờ máy mới |
| Quota | Trả chỗ về (không còn `OCCUPYING`) | **Vẫn chiếm chỗ** |
| `client_code` | Ngừng dùng | Tiếp tục sống |

Trường hợp "thu hồi thật" (user hết hạn gói, tài khoản bị khoá) vẫn phải dùng `revoke_slots`. Refresh mà không có ai claim thì slot vẫn ăn quota — đó là điểm khác biệt quan trọng, và cũng là lý do action phải có mô tả rõ trong admin.

### 3.3 Trường nào xoá, trường nào giữ

Sau refresh, row mang trạng thái `UNCLAIMED` nhưng vẫn còn metadata của **máy cũ** (`device_name = "A102SO (Android 12)"`, `geo_city`, `last_ip`...). Nếu giữ nguyên, danh sách admin hiển thị một slot "chưa ghép cặp" nhưng lại có tên máy — gây hiểu nhầm.

**Quyết định:** snapshot toàn bộ metadata máy cũ vào `AdminAuditLog.change_log`, rồi **xoá** khỏi row.

```python
# Cleared: the row now describes a slot waiting for a handset, so any leftover
# handset detail would describe a phone that no longer holds it.
BINDING_FIELDS = ('device_id', 'hardware_hash')
HANDSET_FIELDS = ('device_type', 'device_name', 'device_model', 'os_version',
                  'app_version', 'last_ip', 'geo_city', 'geo_region',
                  'geo_country_code', 'geo_fetched_at', 'claimed_at', 'claim_ip',
                  'bound_at')
```

Giữ nguyên: `client_code` (R2), `user`, `issued_by`, `issued_reason`, `created_at`.

`last_active` **không giữ được**: `AbstractDevice.last_active` khai báo `auto_now=True` nên mọi `save()` đều đẩy nó về hiện tại — kể cả `save()` của refresh. Sau refresh, `last_active` phản ánh thời điểm admin bấm nút, **không** phải lần cuối máy cũ hoạt động. Giá trị cũ được giữ lại trong `AdminAuditLog.change_log['before']`, nên vẫn tra được; danh sách admin thì không còn đọc được nữa. Chấp nhận — đổi `auto_now` thành `auto_now_add` + cập nhật thủ công là thay đổi lan sang cả `UserDevice`, không đáng cho feature này.

### 3.4 Refresh áp dụng cho trạng thái nào

Chỉ cho phép trên `OCCUPYING = ('UNCLAIMED', 'ACTIVE')`:

- `ACTIVE` → ca chính: đổi máy.
- `UNCLAIMED` → ca phụ hữu ích (P4): cấp lại mã cho slot mà user nhập sai/mất mã, hoặc gia hạn slot sắp hết TTL. Không tốn quota vì slot vốn đã chiếm chỗ.
- `REVOKED` / `EXPIRED` → **bỏ qua, báo lỗi**. Hồi sinh một slot không còn `OCCUPYING` là cấp thêm quota qua cửa sau, vượt mặt `issue_slot`. Ai cần thêm chỗ thì dùng `issue_slot` để đi qua đúng cổng kiểm quota.

---

## 4. Hai vấn đề kỹ thuật phải xử lý cùng feature này

### 4.1 `verify_pairing_code` chỉ xét slot `UNCLAIMED` **cũ nhất** — refresh sẽ kích hoạt bug này

Code hiện tại (`users/services/mobile_slot.py`):

```python
slot = (
    MobileDevice.objects.select_for_update()
    .filter(user=user, status='UNCLAIMED')
    .order_by('created_at')
    .first()
)
error = _check_slot(slot, normalized)
```

Slot được chọn **theo thứ tự tạo**, rồi mã người dùng nhập được so với **đúng slot đó**. Hôm nay việc này chưa lộ vì `mobile_max_devices` mặc định là 1 nên hầu như không ai có hai slot `UNCLAIMED` cùng lúc.

Refresh phá vỡ giả định đó. Với user `mobile_max_devices = 2`:

```
Slot B: created_at = 01/06, vừa được REFRESH  → UNCLAIMED, mã mới TT-AAAA-...
Slot A: created_at = 20/08, vừa được ISSUE    → UNCLAIMED, mã     TT-BBBB-...

User nhập TT-BBBB-... (mã của A, admin vừa đọc cho họ)
  → order_by('created_at').first() trả về B   (B tạo trước)
  → so mã: TT-BBBB ≠ TT-AAAA → SAI
  → B.claim_attempts += 1
```

Hệ quả: user **không bao giờ** claim được slot A, và sau 5 lần thử thì **slot B tự cháy thành `EXPIRED`** dù user chưa từng nhập sai mã của B. Một thao tác admin đúng đắn lại phá hỏng một slot khác.

**Sửa: chọn slot theo mã, không theo thứ tự.**

```python
def verify_pairing_code(user, raw_code: str) -> MobileDevice:
    """
    Check a pairing code and record the attempt. Runs in its own transaction and
    MUST be called outside the caller's write transaction.

    Matches on the code across every unclaimed slot, not on creation order: a
    refreshed slot keeps its original created_at, so ordering would hand back a
    slot the user is not holding a code for (feature-35 §4.1).
    """
    normalized = normalize_code(raw_code)

    with transaction.atomic():
        candidates = list(
            MobileDevice.objects.select_for_update()
            .filter(user=user, status='UNCLAIMED')
            .order_by('created_at')
        )
        slot, error = _match_slot(candidates, normalized)

    if error:
        raise SlotError(error)
    return slot


def _match_slot(candidates, normalized: str):
    """Find the slot this code opens, persisting expiry and attempt changes."""
    if not candidates:
        return None, 'Chưa có slot thiết bị nào được cấp cho tài khoản này. Vui lòng liên hệ admin.'

    now = timezone.now()
    live = []
    for slot in candidates:
        if now >= slot.expires_at:
            slot.status = 'EXPIRED'
            slot.save(update_fields=['status'])
        else:
            live.append(slot)

    if not live:
        return None, 'Mã đã hết hạn. Vui lòng liên hệ admin để được cấp mã mới.'

    for slot in live:
        if normalize_code(slot.pairing_code) == normalized:
            return slot, None

    # No slot opens with this code. Every live slot is a candidate the attempt
    # could have been aimed at, so each one burns a try — counting on just one of
    # them would leave the others open to grinding with a stolen password.
    remaining = []
    for slot in live:
        slot.claim_attempts += 1
        fields = ['claim_attempts']
        if slot.claim_attempts >= settings.DEVICE_PAIRING_MAX_ATTEMPTS:
            slot.status = 'EXPIRED'
            fields.append('status')
            # min(remaining) below would hide this from the user entirely when a
            # sibling slot still has tries left, so leave a trace (PO review S1).
            logger.warning('Pairing slot %s burnt out after %s wrong attempts',
                           slot.client_code, slot.claim_attempts)
        else:
            remaining.append(settings.DEVICE_PAIRING_MAX_ATTEMPTS - slot.claim_attempts)
        slot.save(update_fields=fields)

    if not remaining:
        return None, 'Nhập sai mã quá số lần cho phép. Vui lòng liên hệ admin để được cấp mã mới.'
    return None, f'Mã không đúng. Bạn còn {min(remaining)} lần thử.'
```

`_check_slot` cũ bị thay bằng `_match_slot`. Ngữ nghĩa với **một** slot `UNCLAIMED` giữ nguyên 100%, nên T14/T15/T16 hiện có vẫn phải xanh không sửa.

> **Đánh đổi đã cân nhắc:** nhập sai một lần sẽ trừ lượt của *mọi* slot `UNCLAIMED` của user đó. Với `mobile_max_devices = 1` (mặc định) không có gì đổi. Phương án rẻ hơn — cấm refresh khi user đang có slot `UNCLAIMED` khác — được cân nhắc và loại: nó để nguyên bug cho `issue_slot` gọi hai lần, vốn đã tạo được hai slot `UNCLAIMED` từ trước feature này.

### 4.2 Token của máy cũ — lựa chọn "để sống đến khi hết hạn" không đạt được điều PO muốn

PO chọn **không** blacklist. Ba dữ kiện làm lựa chọn này không cho ra kết quả như tên gọi của nó:

**(a) Phiên cũ chết ngay lập tức, dù có blacklist hay không.**

`DeviceJWTAuthentication.get_validated_token` (`users/authentication.py`) kiểm tra mọi request:

```python
if not model.objects.filter(user=user, device_id=device_id, status='ACTIVE').exists():
    raise InvalidToken('Device session has been revoked.')
```

Sau refresh, `device_id = NULL` và `status = 'UNCLAIMED'` → điều kiện sai → **mọi request từ máy cũ trả 401 ngay từ request kế tiếp**. Không có kịch bản nào mà máy cũ "dùng tiếp đến khi token hết hạn".

**(b) Không blacklist làm app mobile kẹt ở trạng thái lỗi thay vì quay về màn hình đăng nhập.**

Interceptor của app (`src/mobile/lib/core/api/api_client.dart:37-72`):

```
401 → gọi /auth/refresh/ → thành công? → retry request gốc
                          → thất bại?   → clearAuth()  (về màn hình login)
```

`DeviceTokenRefreshView` (`users/views/auth.py:18`) **không** kiểm tra trạng thái device — nó chỉ validate refresh token và blacklist. Nên:

| | `/auth/refresh/` | Kết quả trên app |
|---|---|---|
| **Có** blacklist | 401 | `clearAuth()` → app về màn hình đăng nhập kèm ô nhập mã. ✅ Đúng điều ta muốn. |
| **Không** blacklist | 200, cấp access token mới | Retry request gốc → **401 lần nữa** → `handler.next(error)`, **không** `clearAuth()`. App vẫn tưởng mình đã đăng nhập, mọi màn hình báo lỗi, user không hiểu chuyện gì. ❌ |

Nói cách khác, bỏ blacklist không giữ được phiên cũ — nó chỉ làm app **hỏng một cách khó hiểu** thay vì đăng xuất sạch sẽ.

**(c) Refresh token chưa blacklist có thể sống lại tới 90 ngày.**

`REFRESH_TOKEN_LIFETIME = timedelta(days=90)` (`config/settings.py:286`). Token cũ nằm im (vô hại) suốt thời gian slot `UNCLAIMED`, nhưng nếu **chính chiếc máy đó** claim lại slot bằng mã mới — đúng kịch bản phổ biến nhất của refresh, user cài lại app trên cùng máy, `ANDROID_ID` không đổi → `device_id` được ghi lại y hệt → `status` về `ACTIVE` → **token tiền-refresh hoạt động trở lại**. Một token mà admin tưởng đã thu hồi tự hồi sinh.

#### (d) Phát hiện lúc implement: `blacklist_tokens_for_devices()` chưa bao giờ chạy được

T35-7 fail ngay lần chạy đầu: `/auth/refresh/` vẫn trả 200 sau khi refresh slot. Nguyên nhân nằm ở `issue_tokens_for_device()` (`users/services/auth.py`):

```python
refresh = RefreshToken.for_user(user)   # OutstandingToken được ghi Ở ĐÂY, chưa có claim
refresh['device_id'] = device.device_id  # claim chỉ gắn vào bản in-memory
refresh['platform'] = platform
```

`BlacklistMixin.for_user()` ghi `token=str(token)` xuống `OutstandingToken` **trước** khi hai claim được gắn. Bản lưu trong DB vì thế không có `device_id`, mà `blacklist_tokens_for_devices()` lại match đúng claim đó:

```python
if claims.get('device_id') in targets:   # luôn None → không bao giờ khớp
```

Hệ quả: **`revoke_slots` cũng chưa bao giờ blacklist được gì** kể từ feature-34 — đúng chế độ hỏng đã mô tả ở (b), chỉ là đang xảy ra trên action cũ. Rotation không dính lỗi này vì `TokenRefreshSerializer` gọi `outstand()` sau khi claim đã nằm sẵn trong payload.

**Sửa** (`users/services/auth.py`, ngoài danh sách file ở §10 nhưng bắt buộc, nếu không §4.2 không đạt được):

```python
OutstandingToken.objects.filter(jti=refresh[api_settings.JTI_CLAIM]).update(
    token=str(refresh),
)
```

T35-7 canh cả hai đường: `/api/users/me/` phải 401 (do `DeviceJWTAuthentication`) **và** `/api/auth/refresh/` phải 401 (do blacklist).

#### Đề xuất

Gọi `blacklist_tokens_for_devices(slot.user, [slot.device_id])` trước khi xoá `device_id`, **giống hệt** `revoke_slots` đang làm — một dòng, đã có sẵn helper, đã có sẵn test pattern.

> **Cần PO quyết ở Stage 2.** Design này viết theo phương án **có blacklist** (§6.1) vì (b) là lỗi UX thấy được ngay trên app. Nếu PO vẫn giữ quyết định không blacklist, phải bổ sung vào phạm vi: sửa interceptor app Flutter để `clearAuth()` khi request retry vẫn 401, và chấp nhận rủi ro (c). Chi phí của nhánh đó lớn hơn nhánh blacklist.

---

## 5. Database (PostgreSQL)

**Không có migration.** Feature này chỉ đổi giá trị trong các cột đã có của `users_mobiledevice`.

Hai unique constraint hiện tại được scope theo `OCCUPYING` (feature-34 §6.1):

```python
UniqueConstraint(fields=['user', 'device_id'],
                 condition=Q(device_id__isnull=False, status__in=OCCUPYING_STATUSES),
                 name='uniq_mobile_device_id_per_user')
UniqueConstraint(fields=['user', 'hardware_hash'], ...)
```

Refresh đặt `device_id = NULL` nên row rơi ra khỏi cả hai constraint (`device_id__isnull=False` sai). Khi máy mới claim, `device_id` mới được ghi vào — không đụng row nào khác vì row cũ chính là row này. **Không có nguy cơ vi phạm constraint.**

Trường hợp cần để ý: user có slot #1 `ACTIVE` trên máy X và refresh slot #2, rồi lại claim slot #2 **bằng chính máy X**. Lúc đó `(user, device_id=X)` xuất hiện ở hai row cùng `OCCUPYING` → `IntegrityError`. Chặn constraint là hành vi **đúng** (một máy không giữ hai slot của cùng user), nhưng để nguyên thì lỗi nổ ra dưới dạng **500** ở `claim_slot()`.

**Phải bọc lại thành lỗi có nghĩa** (PO review C3):

```python
# users/services/mobile_slot.py — trong claim_slot(), quanh locked.save()
try:
    locked.save()
except IntegrityError:
    # uniq_mobile_device_id_per_user / uniq_mobile_hardware_per_user: this
    # handset already holds another live slot of the same user. The constraint
    # is right to refuse; only the 500 is wrong.
    raise SlotError(
        'Máy này đang dùng một slot khác của chính tài khoản bạn. '
        'Vui lòng liên hệ admin để gỡ liên kết slot cũ trước.'
    )
```

`SlotError` đã được `MobileLoginView.post()` bắt và trả `400 PAIRING_FAILED`, nên không cần đụng view. T35-6 trong §9 canh đúng đường này.

---

## 6. Backend (Django)

### 6.1 Service — `users/services/mobile_slot.py`

```python
# Cleared on refresh: the row goes back to describing a slot that is waiting for
# a handset, so any leftover handset detail would describe a phone that no
# longer holds it. Snapshotted into the audit log first (feature-35 §3.3).
#
# Split by nullability, not by meaning: device_type is CharField(blank=True) with
# null=False, so clearing it to None would violate NOT NULL (feature-35 §6.1 C1).
_NULLABLE_HANDSET_FIELDS = (
    'device_id', 'hardware_hash', 'device_name', 'device_model', 'os_version',
    'app_version', 'last_ip', 'geo_city', 'geo_region', 'geo_country_code',
    'geo_fetched_at', 'claimed_at', 'claim_ip', 'bound_at',
)
_BLANK_HANDSET_FIELDS = ('device_type',)
_HANDSET_FIELDS = _NULLABLE_HANDSET_FIELDS + _BLANK_HANDSET_FIELDS


def _serialise(value):
    """
    Make a field value safe for AdminAuditLog.change_log.

    change_log is a plain JSONField with no encoder=DjangoJSONEncoder, so a
    datetime would raise TypeError on save. Everything that is not a JSON
    primitive goes in as its string form (feature-35 §6.1 C2).
    """
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def refresh_slot(slot) -> dict:
    """
    Reset an occupied slot back to UNCLAIMED so a different handset can take it.

    Keeps client_code and the row itself: the slot is the user's identity, not
    the phone's, so a device change must not fragment the history into a new row
    (feature-35 §3.1).

    Takes no staff argument: issued_by records who allocated the slot and must
    survive a refresh, and the audit row is written by the caller the way
    revoke_slots already does it.

    Returns the snapshot of the handset that was released, for the audit log.
    """
    if slot.status not in MobileDevice.OCCUPYING:
        raise SlotError(
            f'Slot {slot.client_code} đang ở trạng thái {slot.status}, không làm mới được. '
            f'Dùng "Cấp slot thiết bị mới" nếu cần thêm chỗ.'
        )

    with transaction.atomic():
        locked = MobileDevice.objects.select_for_update().get(pk=slot.pk)
        before = {f: _serialise(getattr(locked, f)) for f in _HANDSET_FIELDS}
        before['status'] = locked.status
        before['pairing_code'] = locked.pairing_code

        # Blacklist BEFORE clearing device_id — the helper matches outstanding
        # tokens on that exact claim, so clearing first would find nothing.
        if locked.status == 'ACTIVE' and locked.device_id:
            blacklist_tokens_for_devices(locked.user, [locked.device_id])

        for field in _NULLABLE_HANDSET_FIELDS:
            setattr(locked, field, None)
        for field in _BLANK_HANDSET_FIELDS:
            setattr(locked, field, '')
        locked.status = 'UNCLAIMED'
        locked.pairing_code = _generate_unique_pairing_code()
        locked.expires_at = timezone.now() + timedelta(days=settings.DEVICE_PAIRING_TTL_DAYS)
        locked.claim_attempts = 0
        locked.save()

    return before
```

Ghi chú:
- Field được tách theo **nullability** chứ không theo ý nghĩa: `device_type` là `CharField(blank=True)` với `null=False`, gán `None` sẽ vi phạm NOT NULL. T35-9 canh đúng chỗ này.
- `_serialise()` bắt buộc phải có: `AdminAuditLog.change_log` là `JSONField` **không** khai báo `encoder=DjangoJSONEncoder`, mà snapshot có `claimed_at` / `bound_at` / `geo_fetched_at` là `datetime`. `issue_slot` và `revoke_slots` hiện có né được vì chỉ nhét string; đây là chỗ đầu tiên dump cả cụm field.
- Row lock (`select_for_update`) để hai admin bấm cùng lúc không cùng mint hai mã.

### 6.2 Admin action — `users/admin.py`

Thêm vào `MobileDeviceAdmin.actions`:

```python
actions = ['issue_slot', 'refresh_slots', 'revoke_slots']

@admin.action(description='Làm mới thiết bị (giữ slot, cấp mã mới)')
def refresh_slots(self, request, queryset):
    """
    Release the handset but keep the slot, so a device change does not cost a
    new row or a new client_code.

    The new code goes out of band like issue_slot's, so the message has to carry
    it in a form the admin can copy in one go.
    """
    for slot in queryset.select_related('user'):
        try:
            before = refresh_slot(slot)
        except SlotError as exc:
            self.message_user(request, f'{slot.client_code}: {exc}', level=messages.ERROR)
            continue

        slot.refresh_from_db()
        AdminAuditLog.objects.create(
            staff=request.user,
            target_user=slot.user,
            action_category='DEVICE_RESET',
            action_detail=f'Admin refreshed mobile slot {slot.client_code}',
            change_log={'before': before,
                        'after': {'status': 'UNCLAIMED',
                                  'pairing_code': slot.pairing_code,
                                  'expires_at': slot.expires_at.isoformat()}},
            ip_address=_get_client_ip(request),
        )
        self.message_user(
            request,
            format_html(
                '{} → slot <strong>{}</strong> đã làm mới, mã mới '
                '<code style="user-select:all">{}</code> (hết hạn {}). '
                'Máy cũ đã bị đăng xuất.',
                slot.user.email, slot.client_code, slot.pairing_code,
                slot.expires_at.strftime('%d/%m/%Y'),
            ),
        )
```

Quyền: `MobileDeviceAdmin` đã yêu cầu `users.change_mobiledevice` cho action. Mã mới hiển thị trong message — nhất quán với `issue_slot`, vốn cũng in mã thẳng ra message. `pairing_code_display` trên list vẫn che mã theo `users.view_activation_key_secret`, và sau refresh slot ở `UNCLAIMED` nên staff có quyền sẽ đọc lại được mã trên list.

### 6.3 Thêm thiết bị từ admin (R6, P5)

#### Vì sao không dùng ModelForm chuẩn của Django

Bật `has_add_permission` rồi để Django tự lo là cách rẻ nhất, nhưng sai bản chất: "thêm thiết bị" **không phải** lưu các field của form xuống một row. Nó là một lời gọi service — `issue_slot()` sinh `client_code`, sinh `pairing_code` không trùng, và **đếm quota dưới row lock**:

```python
with transaction.atomic():
    locked = User.objects.select_for_update().get(pk=user.pk)
    taken = locked.mobile_devices.filter(status__in=MobileDevice.OCCUPYING).count()
    if taken >= locked.mobile_max_devices:
        raise SlotError(...)
```

Một `ModelForm.save()` thường sẽ bỏ qua cả ba. Đã cân nhắc phương án giữ form chuẩn rồi override `save_model()` để gọi `issue_slot()` — loại, vì `save_model()` nhận vào một `obj` Django đã dựng sẵn nhưng `issue_slot()` lại **tự tạo row của nó**, nên phải vá `obj.pk` cho luồng redirect của Django chạy được; và `SlotError` ném ra ở tầng đó thì đã quá muộn để hiện thành lỗi trên form, chỉ còn cách trả 500.

**Chọn: thay hẳn `add_view()`.** Nút Add và URL `admin:users_mobiledevice_add` vẫn là của Django nên trông vẫn native, nhưng thân view là của mình. Cùng pattern với `import_questions` / `grant_book_view` đang có trong repo.

#### Form

```python
class MobileDeviceIssueForm(forms.Form):
    """
    Add form for MobileDeviceAdmin.

    A plain Form, not a ModelForm: the row is created by issue_slot(), which
    fills client_code, pairing_code and expires_at itself. Nothing the admin
    types maps onto a column except issued_reason.
    """

    user = forms.ModelChoiceField(
        queryset=User.objects.order_by('email'),
        label='Người dùng',
        widget=AutocompleteSelect(MobileDevice._meta.get_field('user'), admin.site),
    )
    issued_reason = forms.CharField(
        label='Lý do cấp', max_length=255, required=False,
        help_text='Ví dụ: "user đổi sang iPhone", "cấp máy thứ 2 theo hợp đồng".',
    )

    def clean_user(self):
        """
        Pre-check the quota so a full user gets a form error instead of a 500.

        NOT authoritative — issue_slot() re-counts under a row lock. This only
        buys a readable message in the common, uncontended case.
        """
        user = self.cleaned_data['user']
        taken = user.mobile_devices.filter(status__in=MobileDevice.OCCUPYING).count()
        if taken >= user.mobile_max_devices:
            raise forms.ValidationError(
                f'{user.email} đã dùng hết {user.mobile_max_devices} thiết bị cho phép. '
                f'Nếu user đổi máy: làm mới hoặc gỡ liên kết slot cũ. '
                f'Nếu user được phép dùng thêm máy: nâng "mobile_max_devices" ở trang User.'
            )
        return user
```

`AutocompleteSelect` dùng được vì `UserAdmin.search_fields` đã khai báo (`admin.py:252`); phải thêm `autocomplete_fields = ['user']` trên `MobileDeviceAdmin` vì `AutocompleteJsonView` kiểm tra field có nằm trong `autocomplete_fields` của admin gọi nó.

> **Verify lúc implement (PO review S4):** `user` đang nằm trong `readonly_fields` của `MobileDeviceAdmin`. Chạy `manage.py check` sau khi thêm `autocomplete_fields`; nếu Django báo lỗi system check hoặc endpoint autocomplete không đăng ký, fallback về `ModelChoiceField` thường với `queryset=User.objects.order_by('email')` — số lượng user hiện chưa lớn tới mức bắt buộc phải autocomplete.

#### View

Bỏ hẳn override `has_add_permission` hiện có (đang trả `False`) để rơi về mặc định
`users.add_mobiledevice` của Django. Comment giải thích chuyển vào docstring của
`add_view` — vẫn là chỗ duy nhất tạo được slot, chỉ là không còn chặn ở tầng quyền.

```python
def add_view(self, request, form_url='', extra_context=None):
    """
    Replace the ModelAdmin add form: allocating a slot is a service call, not a
    row edit (feature-35 §6.3).

    Routing add through issue_slot() is what lets has_add_permission go back to
    the Django default: the locked quota count and the code generation still run,
    so a slot is still never created by a plain form save.
    """
    if not self.has_add_permission(request):
        raise PermissionDenied

    form = MobileDeviceIssueForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        try:
            slot = issue_slot(
                form.cleaned_data['user'],
                staff=request.user,
                reason=form.cleaned_data['issued_reason'] or 'Issued from Mobile Device admin',
            )
        except SlotError as exc:
            # Lost the race with a concurrent issue: clean_user() passed but the
            # locked re-count inside issue_slot() did not.
            form.add_error('user', str(exc))
        else:
            self._log_issue(request, slot)
            self.message_user(
                request,
                format_html(
                    '{} → slot <strong>{}</strong>, mã <code style="user-select:all">{}</code> '
                    '(hết hạn {})',
                    slot.user.email, slot.client_code, slot.pairing_code,
                    slot.expires_at.strftime('%d/%m/%Y'),
                ),
            )
            return redirect(reverse('admin:users_mobiledevice_changelist'))

    context = {
        **self.admin_site.each_context(request),
        'title': 'Cấp slot thiết bị mới',
        'form': form,
        'opts': self.model._meta,
    }
    return TemplateResponse(request, 'admin/users/mobiledevice/issue_slot.html', context)
```

`_log_issue()` là phần ghi `AdminAuditLog` đang nằm inline trong `IssueSlotMixin.issue_slot`; tách ra thành helper dùng chung cho cả bulk action lẫn view mới, để hai đường cấp slot không ghi audit lệch nhau.

#### Template

`src/backend/templates/admin/users/mobiledevice/issue_slot.html`, `{% extends "admin/base_site.html" %}` như `import_questions.html` — form một cột, nút "Cấp slot", link huỷ về changelist. `{{ form.media }}` bắt buộc phải có, nếu không widget autocomplete (select2) không load được JS.

#### Mã hiển thị ở đâu

Mã mới hiện trong `django.contrib.messages` sau khi redirect — giống hệt bulk action `issue_slot` hiện tại. Slot vừa tạo ở trạng thái `UNCLAIMED` nên `pairing_code_display` trên changelist cũng hiện mã đầy đủ cho staff có quyền `users.view_activation_key_secret`; staff không có quyền đó vẫn đọc được mã trong message. Đây là hành vi **đã tồn tại** của bulk action, feature này không siết cũng không nới — xem câu hỏi 5 ở §11.

#### Không đụng tới inline

`MobileDeviceInline.has_add_permission` vẫn trả `False`. Inline add sẽ lưu thẳng row qua formset, bỏ qua `issue_slot()` — đúng cái mà §6.3 vừa lập luận là phải tránh.

### 6.4 Không đổi API

`MobileLoginSerializer` không sửa. Sau refresh, máy cũ hoặc máy mới đều rơi vào nhánh `'new'` của `resolve_mobile_device()` (vì `device_id` và `hardware_hash` đã `NULL`) → `pairing_required_error(user)` → app hiện ô nhập mã. Đúng luồng có sẵn.

---

### 6.5 Nút "Làm mới thiết bị" trên change form

Bulk action chỉ xuất hiện ở changelist. Admin đang mở đúng một slot ở
`/admin/users/mobiledevice/<pk>/change/` phải quay ra danh sách, tick lại đúng dòng đó,
rồi tìm action trong dropdown — cùng kiểu ma sát như P5.

**Ba mảnh:**

1. `get_urls()` thêm `<int:pk>/refresh-slot/` → `refresh_slot_view`, **POST-only**. GET
   redirect về change form mà không đổi gì: một link prefetch hoặc F5 không được phép
   reset thiết bị của user.
2. `change_view()` đưa `refresh_slot_url` vào `extra_context` **chỉ khi** slot còn
   `OCCUPYING`. Slot `REVOKED`/`EXPIRED` không hiện nút, vì bấm vào cũng chỉ dội lại
   guard trong `refresh_slot()`.
3. `change_form_template = 'admin/users/mobiledevice/change_form.html'` — khối nút nằm
   trong `{% block after_related_objects %}`, cùng pattern với
   `admin/users/user/change_form.html` đang có.

**Pop-up xác nhận** dùng `<dialog>` gốc của trình duyệt, không thêm thư viện. Nội dung
liệt kê đúng bốn hệ quả để admin không bấm nhầm:

- Máy đang dùng bị đăng xuất ngay (chỉ hiện khi slot `ACTIVE`).
- Mã ghép cặp hiện tại hết hiệu lực, sinh mã mới.
- Phải gửi mã mới cho user thì họ mới đăng nhập lại được.
- Mã slot và lịch sử giữ nguyên; slot vẫn chiếm một chỗ trong hạn mức.

Fallback về `window.confirm()` nếu `showModal` không dùng được.

**Quyền:** `has_change_permission`. Staff chỉ có `view_mobiledevice` nhận 403 —
xem T35-21.

`refresh_slot_view` và action `refresh_slots` dùng chung `_refresh_one()`, nên audit log
và message của hai đường đi giống hệt nhau.

## 7. Luồng end-to-end

### 7.1 Cấp slot cho user mới

```
1. Admin: MobileDevice list → nút "Thêm Mobile Device"
2. Form: chọn user (autocomplete theo email) + lý do cấp → Cấp slot
3. Server: clean_user() kiểm quota → issue_slot() kiểm lại dưới row lock
        → row mới UNCLAIMED, client_code + pairing_code sinh tự động
        → AdminAuditLog (MOBILE_SLOT)
4. Redirect về changelist, message hiện mã: TT-XXXX-XXXX-XXXX (hết hạn dd/mm/yyyy)
5. Admin copy mã, đọc qua Zalo → user nhập ở lần login đầu → claim_slot() → ACTIVE
```

Nếu user đã hết `mobile_max_devices`, bước 3 dừng ngay ở form với lỗi gắn vào field `user` — admin biết phải làm mới hoặc gỡ liên kết slot cũ trước, không phải đoán.

### 7.2 User đổi máy

```
1. User: "em đổi điện thoại rồi"
2. Admin: MobileDevice list → lọc theo email → chọn slot ACTIVE
        → action "Làm mới thiết bị"
3. Server: blacklist token máy cũ
        → device_id/hardware_hash/metadata → NULL
        → status ACTIVE → UNCLAIMED
        → pairing_code mới, expires_at = now + 7d, claim_attempts = 0
        → AdminAuditLog (DEVICE_RESET) kèm snapshot máy cũ
4. Admin: copy mã mới từ message, đọc qua Zalo
5. Máy cũ (nếu còn bật): request kế tiếp 401 → /auth/refresh/ 401 → app clearAuth()
        → về màn hình đăng nhập
6. Máy mới: login → 400 PAIRING_CODE_REQUIRED → user nhập mã
        → verify_pairing_code() khớp theo mã (§4.1) → claim_slot()
        → status ACTIVE, client_code Y NGUYÊN như trước
```

Bước 6 giữ nguyên `client_code` chính là điều R2 yêu cầu: tra `TT-DH2S-...` trong admin thấy đủ lịch sử của user đó qua mọi lần đổi máy, đọc được từ `AdminAuditLog`.

---

## 8. Bảo mật

| Rủi ro | Xử lý |
|---|---|
| Refresh trở thành đường vòng cấp thêm quota | Chỉ cho phép trên `OCCUPYING` (§3.4); `REVOKED`/`EXPIRED` bị từ chối. Slot refresh vẫn chiếm chỗ. |
| Mã cũ đã lộ qua Zalo bị dùng lại | Luôn mint mã mới (§3.1 PA B). |
| Brute-force mã bằng password đã lộ | `claim_attempts` reset về 0 mỗi lần refresh — đây là **nới lỏng có chủ đích** (slot mới, mã mới, đếm lại từ đầu), vẫn còn `MobileLoginRateThrottle` chặn tần suất. |
| Token máy cũ | Blacklist (§4.2) — **chờ PO xác nhận**. |
| Staff không có quyền đọc mã vẫn thấy mã trong message | Giống `issue_slot` hiện tại. Nếu PO muốn siết, thêm `has_perm('users.view_activation_key_secret')` cho cả hai action — nằm ngoài phạm vi feature này. |

---

## 9. Test plan

File: `src/backend/users/tests/test_mobile_device.py` (nối vào các class có sẵn).

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| T35-1 | Refresh slot `ACTIVE` | `status='UNCLAIMED'`, `device_id is None`, `hardware_hash is None`, `client_code` **không đổi**, `pairing_code` **đổi**, `claim_attempts == 0`, `expires_at > now` |
| T35-2 | Refresh slot `UNCLAIMED` đã cháy 4 lượt | `claim_attempts == 0`, mã mới, không lỗi |
| T35-3 | Refresh slot `REVOKED` | `SlotError`, row không đổi |
| T35-4 | Refresh không tốn quota | User `mobile_max_devices=1`, refresh xong `issue_slot` vẫn ném `SlotError` (slot cũ còn chiếm chỗ) |
| T35-5 | Máy mới claim slot đã refresh | `client_code` sau claim == `client_code` trước refresh |
| T35-6 | Cùng một máy claim slot #2 khi đang giữ slot #1 `ACTIVE` | Trả lỗi có nghĩa cho user, **không** 500 (§5) |
| T35-7 | Token máy cũ sau refresh | Request bằng access token cũ → 401; `/auth/refresh/` bằng refresh token cũ → 401 |
| T35-8 | Audit log | Một `AdminAuditLog` `DEVICE_RESET`, `change_log['before']['device_id']` == device_id máy cũ |
| T35-9 | `device_type` là `blank=True, null=False` | Refresh không ném `IntegrityError` (gán `''` chứ không phải `None`) |
| **T35-10** | **Hai slot `UNCLAIMED`, nhập mã của slot mới hơn** | Claim **đúng** slot đó; `claim_attempts` của slot kia **không** tăng (§4.1) |
| **T35-11** | **Hai slot `UNCLAIMED`, nhập mã sai hoàn toàn** | Cả hai `claim_attempts` +1; message báo số lượt còn lại nhỏ nhất |
| T35-12 | Hồi quy: một slot `UNCLAIMED`, mã sai | T14/T15/T16 hiện có vẫn xanh, không sửa test |
| T35-13 | POST `admin:users_mobiledevice_add` với user còn chỗ | 302 về changelist; tạo đúng 1 row `UNCLAIMED`; `client_code` và `pairing_code` khác rỗng; message chứa `pairing_code` |
| T35-14 | POST add với user **đã hết** `mobile_max_devices` | 200 (render lại form), lỗi gắn vào field `user`, **không** tạo row |
| T35-15 | GET add bằng staff không có `users.add_mobiledevice` | `PermissionDenied` (403) |
| T35-16 | Add ghi audit | Một `AdminAuditLog` `MOBILE_SLOT`, `change_log['after']['client_code']` khớp slot vừa tạo; cùng shape với audit của bulk action `issue_slot` |
| T35-17 | Change form của slot `OCCUPYING` | Hiện nút + URL `refresh-slot` |
| T35-18 | Change form của slot `REVOKED` | **Không** hiện URL `refresh-slot` |
| T35-19 | POST `refresh-slot` | Redirect về change form; slot về `UNCLAIMED`, mã đổi, có `AdminAuditLog` `DEVICE_RESET` |
| T35-20 | GET `refresh-slot` | Redirect, **không** đổi gì — mã ghép cặp giữ nguyên |
| T35-21 | POST bằng staff chỉ có `view_mobiledevice` | 403, slot không đổi |

---

## 10. Files thay đổi

| File | Thay đổi |
|---|---|
| `src/backend/users/services/mobile_slot.py` | Thêm `refresh_slot()`, `_HANDSET_FIELDS`; thay `_check_slot()` bằng `_match_slot()`; sửa `verify_pairing_code()` |
| `src/backend/users/admin.py` | Thêm `MobileDeviceIssueForm`; `MobileDeviceAdmin`: `actions` thêm `refresh_slots`, `autocomplete_fields = ['user']`, bỏ override `has_add_permission`, thêm `add_view()`; tách `_log_issue()` khỏi `IssueSlotMixin.issue_slot`; import `refresh_slot`, `AutocompleteSelect`, `PermissionDenied`, `TemplateResponse` |
| `src/backend/templates/admin/users/mobiledevice/issue_slot.html` | **Mới** — form cấp slot |
| `src/backend/templates/admin/users/mobiledevice/change_form.html` | **Mới** — nút "Làm mới thiết bị" + `<dialog>` xác nhận (§6.5) |
| `src/backend/users/services/auth.py` | `issue_tokens_for_device()` đồng bộ lại `OutstandingToken.token` sau khi gắn claim — xem §4.2(d). Ngoài dự kiến ban đầu, nhưng không có nó thì blacklist không chạy |
| `src/backend/users/tests/test_mobile_device.py` | T35-1 … T35-21 |
| `md/TASKS.md` | Ghi Feature 35 |

**Không** có migration. **Không** đổi app Flutter. **Không** đổi API contract.

---

## 11. Quyết định của PO (Stage 2, 2026-08-30)

Doc đã qua PO review. Kết luận: **Approve with minor fixes** — C1–C3 và S1–S4 đã áp dụng vào doc này.

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | §4.2 — blacklist token máy cũ khi refresh | ✅ **CÓ blacklist.** PO rút lại lựa chọn ban đầu: bằng chứng (a) cho thấy phiên cũ chết ngay bất kể làm gì, nên "để token sống" không tồn tại như một lựa chọn; (b) cho thấy bỏ blacklist chỉ đổi lấy một app hỏng khó hiểu. |
| 2 | §4.1 — trừ lượt trên mọi slot `UNCLAIMED` | ✅ **Đồng ý**, kèm `logger.warning` khi một slot bị đốt (S1). |
| 3 | §3.4 — TTL sau refresh | ✅ **Giữ `DEVICE_PAIRING_TTL_DAYS` = 7 ngày.** Không thêm tham số thứ hai. |
| 4 | §2.4 — nút refresh trong `MobileDeviceInline` | ❌ **Không làm v1.** Có nút Add rồi thì đường đi đã đủ ngắn; chờ phản hồi thật từ admin. |
| 5 | §6.3 — ai được đọc mã ghép cặp | ✅ **Giữ nguyên v1.** Siết lại sẽ chặn chính người vừa cấp slot đọc mã họ vừa tạo. Ghi backlog: xem lại `view_activation_key_secret` có còn đúng mục đích không. |
| 6 | §6.3 — giữ bulk action `issue_slot` trên `UserAdmin` | ✅ **Giữ.** Cấp hàng loạt vẫn cần. |

### Điểm đã sửa theo review

| Mã | Nội dung | Chỗ sửa |
|---|---|---|
| C1 | Snippet `refresh_slot` gán `None` cho `device_type` (`null=False`) → `IntegrityError` | §6.1 — tách `_NULLABLE_HANDSET_FIELDS` / `_BLANK_HANDSET_FIELDS` |
| C2 | `_serialise()` được gọi nhưng không định nghĩa; `change_log` là `JSONField` không có `DjangoJSONEncoder` → `TypeError` khi dump `datetime` | §6.1 — thêm định nghĩa `_serialise()` |
| C3 | T35-6 yêu cầu "không 500" nhưng §6 không có code xử lý | §5 — bọc `IntegrityError` thành `SlotError` trong `claim_slot()` |
| S1 | Slot bị đốt âm thầm khi slot khác còn lượt | §4.1 — `logger.warning` |
| S2 | Message hết quota thiếu lời khuyên nâng `mobile_max_devices` | §6.3 — sửa `clean_user()` |
| S3 | §6.3 và §10 mâu thuẫn về `has_add_permission` | §6.3 — bỏ hẳn override |
| S4 | `autocomplete_fields` + `readonly_fields` cần verify | §6.3 — thêm ghi chú verify + fallback |

### Backlog (không làm ở feature này)

- Cột "số lần đổi máy" trên changelist `MobileDevice`, đếm từ `AdminAuditLog` (N1).
- Xem lại phạm vi quyền `users.view_activation_key_secret`.
- `UserAdmin` có dòng `actions = None` chết ngay trên `actions = ['issue_slot']` (`admin.py:256-258`) — dọn khi tiện.
