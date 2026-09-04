# Feature 39 — Review Account: Mobile Pairing Bypass

## Tóm tắt

Apple App Review yêu cầu một tài khoản login sẵn (username/password) để reviewer tự kiểm tra app trên TestFlight/App Store, không thể thực hiện luồng "nhập pairing code do staff cấp" (feature-34) vì reviewer không có kênh liên hệ admin trong lúc review. Feature này gồm 2 phần:

1. **Backend:** thêm cờ trên `User` — `is_review_account` — đánh dấu các tài khoản dùng riêng cho mục đích review/demo: khi đăng nhập mobile, các user này **bỏ qua hoàn toàn** luồng pairing code/slot-quota (feature-34), login thành công ngay với chỉ email + password, không giới hạn thiết bị (không quan tâm `mobile_max_devices`). Vì `DeviceJWTAuthentication` bắt buộc mọi access token phải khớp một `MobileDevice(status='ACTIVE')` trong DB (áp dụng cho MỌI request, không riêng login), mỗi review account có sẵn **đúng một `MobileDevice` row cố định** — tạo tự động qua `ensure_review_device()` khi bật cờ trong Django admin, không qua API `verify_pairing_code`/`claim_slot`/quota check, `device_id` cố định không đổi theo máy thật Apple review dùng (chi tiết: mục Backend, "Vì sao vẫn cần 1 MobileDevice row").
2. **Mobile (Flutter):** sửa `LoginScreen` — hiện tại app **tự đoán trước** và hiện sẵn ô nhập pairing code ngay từ màn hình đầu tiên nếu máy chưa từng pair (`_offerPairingField`, `login_screen.dart:26-36`), trước cả khi gọi API. Hành vi này khiến Apple reviewer (máy mới, chưa từng login) thấy ô pairing code dù account của họ không cần — gây rối hình ảnh và có thể khiến reviewer tưởng cần nhập thêm thông tin. Đổi sang: ô pairing code **luôn ẩn mặc định**, chỉ hiện ra sau khi server trả lỗi `PAIRING_CODE_REQUIRED` (state `AuthBlocPairingRequired`) — tức con người dùng thật (không phải review account) vẫn đăng nhập bình thường, chỉ khác là mất thêm 1 lần submit (nhập email/pass → thấy lỗi cần code → nhập lại kèm code) thay vì thấy ô ngay từ đầu.

**Stack liên quan:** Backend (Django) + Mobile (Flutter). Không đổi Frontend (Vue)/DB ngoài 1 cột mới.

---

## Phân tích

### Yêu cầu / ràng buộc

- Chỉ áp dụng cho một số tài khoản được đánh dấu thủ công (qua Django admin), không phải toggle tự chọn của user thường.
- Không được ảnh hưởng tới luồng pairing hiện tại của user thường (feature-34) — đây là nhánh rẽ sớm, không sửa `resolve_mobile_device`/`mobile_slot.py`.
- Review account không cần audit trail chi tiết kiểu `AdminAuditLog` (không có "slot" nào được cấp/claim) — nhưng vẫn nên log ở mức info để phân biệt với login thường khi debug.
- Không giới hạn `mobile_max_devices` cho review account — Apple có thể review từ nhiều máy/nhiều lần re-install.
- Vẫn phải qua `authenticate_user()` bình thường (email + password đúng) — không bypass authentication, chỉ bypass **device pairing**.

### Các tầng liên quan

- **Database (PostgreSQL):** thêm 1 cột boolean trên bảng `users_user` — migration đơn giản, có default, không cần backfill.
- **Backend (Django):** thêm `ensure_review_device()` vào `services/mobile_slot.py`; rẽ nhánh trong `MobileLoginSerializer.validate()` trước khi gọi `resolve_mobile_device`; thêm field vào `User` model + wiring trong `UserAdmin.save_model()`.
- **Frontend (Vue):** không đổi.
- **Mobile (Flutter):** response shape (`user`, `device`, `rebound`, `claimed`, tokens) giữ nguyên với review account — `device` là `MobileDevice` cố định thật (không phải `None`), client không cần biết sự khác biệt. **UI login đổi hành vi cho mọi user**: bỏ đoán trước, chỉ hiện ô pairing code khi server yêu cầu.

---

## Đề xuất giải pháp

### Database (PostgreSQL)

Thêm field trên `User` (`src/backend/users/models/user.py`):

```python
class User(AbstractUser, BaseModel):
    ...
    # Feature-39: accounts used only for Apple/Google store review or internal
    # demo. Mobile login skips device pairing entirely for these — no
    # MobileDevice row is created, no slot/quota check, no pairing_code
    # required. Set manually via admin; never toggled by users themselves.
    is_review_account = models.BooleanField(default=False)
```

Migration: `python manage.py makemigrations users` (chạy trong docker theo project rule) — cột mới `BooleanField(default=False)`, không cần `RunPython` backfill vì default đã đúng cho toàn bộ user hiện có.

### Backend (Django)

**Vì sao vẫn cần 1 `MobileDevice` row (không thể "device=None"):**

`DeviceJWTAuthentication.get_validated_token()` (`users/authentication.py:13-23`) chạy trên **mọi** request có auth, không riêng lúc login — nó bắt buộc access token phải mang claim `device_id`, và claim đó phải khớp một `MobileDevice(status='ACTIVE')` trong DB:

```python
def get_validated_token(self, raw_token):
    token = super().get_validated_token(raw_token)
    device_id = token.get('device_id')
    if not device_id:
        raise InvalidToken('Token missing device binding.')
    ...
    if not model.objects.filter(user=user, device_id=device_id, status='ACTIVE').exists():
        raise InvalidToken('Device session has been revoked.')
```

Và `issue_tokens_for_device(user, device, platform)` (`services/auth.py:49-67`) đọc thẳng `device.device_id` không null-check — gọi với `device=None` crash `AttributeError` ngay tại bước mint token, không phải lúc dùng token.

Do đó **login trả 200 mà không có `MobileDevice` row hợp lệ là bất khả thi** với kiến trúc auth hiện tại — sửa `DeviceJWTAuthentication` để nó cũng bypass được cân nhắc nhưng **bị loại**: đó là lớp bảo mật dùng chung cho toàn bộ request có auth (web lẫn mobile), rủi ro cao hơn nhiều so với việc thêm một row dữ liệu. Giải pháp giữ nguyên tầng auth, chỉ đảm bảo mỗi review account có sẵn đúng một `MobileDevice` cố định — không đi qua `issue_slot`/`verify_pairing_code`/quota check (feature-34), nên vẫn giữ đúng tinh thần "không qua luồng pairing thủ công".

**1. Service function tạo device cố định** — thêm `ensure_review_device(user)` vào `src/backend/users/services/mobile_slot.py` (cùng module với `issue_slot()`, để dùng chung constant/pattern thay vì viết `get_or_create` trần trụi rải rác 2 nơi — admin và serializer fallback đều gọi đúng 1 hàm này, tránh lệch field):

```python
# Fixed forever: a real MobileDevice row satisfies DeviceJWTAuthentication's
# lookup (see mobile_auth.py._review_session) without ever going through
# issue_slot/verify_pairing_code — no admin has to hand a reviewer a code.
REVIEW_DEVICE_ID = 'review-fixed-device'
REVIEW_TTL_YEARS = 10


def ensure_review_device(user) -> MobileDevice:
    """
    Get or create the one standing MobileDevice for a review account.

    expires_at/pairing_code are NOT NULL on MobileDevice (feature-34 schema) even
    though this row never goes through the claim flow that normally sets them —
    both need a real value here or the insert violates the column constraint.
    client_code must fit max_length=16, so it cannot embed the UUID public_id;
    scoping by `user` in get_or_create is what keeps this row unique per
    reviewer, not the code's content.
    """
    return MobileDevice.objects.get_or_create(
        user=user,
        device_id=REVIEW_DEVICE_ID,
        defaults={
            'client_code': _generate_unique_pairing_code()[:16],
            'pairing_code': _generate_unique_pairing_code(),
            'status': 'ACTIVE',
            'device_name': 'Apple/Google Review',
            'issued_reason': 'Apple/Google store review account',
            'expires_at': timezone.now() + timedelta(days=365 * REVIEW_TTL_YEARS),
        },
    )[0]
```

`device_id` cố định (`REVIEW_DEVICE_ID`), không đổi theo máy thật Apple review dùng — vì `MobileLoginSerializer` sẽ không chạy `resolve_mobile_device`/`rebind_known_handset` cho review account (xem mục 2), nên máy thật nào gọi API cũng đều map về đúng row này, không tạo thêm row mới, không tốn thêm slot. `get_or_create` khoá theo `(user, device_id)` nên gọi nhiều lần (từ admin action lẫn từ fallback trong serializer) đều idempotent, không tạo trùng.

Gọi từ `UserAdmin.save_model()` — **chèn thêm vào cuối method hiện có**, không thay thế logic audit log `is_active` đang có (`admin.py:463-473`):

```python
def save_model(self, request, obj, form, change):
    is_active_changed = change and 'is_active' in form.changed_data
    super().save_model(request, obj, form, change)
    if is_active_changed:
        ...  # existing audit log block, unchanged
    if obj.is_review_account:
        ensure_review_device(obj)
```

Vì `is_review_account` hiếm khi bị tắt lại, gọi `ensure_review_device()` vô điều kiện mỗi lần save (không chỉ lần đầu bật) là an toàn nhờ `get_or_create` — không tạo row thừa, không cần theo dõi "đã tick lần đầu chưa".

**2. `MobileLoginSerializer.validate()`** (`src/backend/users/serializers/mobile_auth.py`) — thêm nhánh rẽ sớm ngay sau `authenticate_user`, trước khi đụng tới `resolve_mobile_device`/pairing:

```python
def validate(self, attrs):
    request = self.context['request']
    user = authenticate_user(attrs['email'].lower(), attrs['password'])

    if user.is_review_account:
        return self._review_session(user, request)

    hardware_hash = normalize_hardware_hash(attrs.get('hardware_hash'))
    device, outcome = resolve_mobile_device(user, attrs['device_id'], hardware_hash)
    ...  # existing flow unchanged

def _review_session(self, user, request) -> dict:
    """
    Feature-39: skip pairing entirely. ensure_review_device() is the same call
    UserAdmin.save_model() makes when the flag is set — calling it again here is
    a defensive fallback (e.g. the flag was flipped directly in the DB, bypassing
    admin), not the primary way the row gets created; get_or_create makes both
    call sites idempotent.
    """
    device = ensure_review_device(user)
    update_last_login(None, user)
    logger.info(
        'mobile_login outcome=review_account user=%s client_ip=%s',
        user.email, get_client_ip(request),
    )
    return {
        'user': user,
        'device': device,
        'rebound': False,
        'claimed': False,
        **issue_tokens_for_device(user, device, PLATFORM_MOBILE),
    }
```

**3. Admin** (`src/backend/users/admin.py`) — expose field `is_review_account` trong `UserAdmin` (list_display hoặc fieldset); wiring tạo `MobileDevice` cố định đặt trong `UserAdmin.save_model()` như mục 1 ở trên đã show.

**4. API response contract — trước và sau, cho cùng một input sai lệch:**

Trước feature này, `POST /api/auth/mobile/login/` với email/password **đúng** nhưng `device_id`/`hardware_hash` của máy **chưa từng pair** (chưa khớp slot nào) luôn trả **HTTP 400** với body:

```json
{
  "code": "PAIRING_CODE_REQUIRED",
  "detail": "Thiết bị này chưa được ghép cặp. Vui lòng nhập mã do quản trị viên cấp.",
  "has_unclaimed_slot": false,
  "support_email": "..."
}
```

(ném bởi `MobileDeviceError(pairing_required_error(user))` tại `mobile_auth.py:74`, xảy ra vì `resolve_mobile_device()` trả `(None, 'new')` và `attrs.get('pairing_code')` rỗng.)

**Sau feature này**, cùng request đó nhưng với `user.is_review_account=True` phải **không bao giờ** chạm code path trên — vì nhánh `if user.is_review_account: return self._review_session(...)` đặt **ngay đầu `validate()`, trước dòng gọi `resolve_mobile_device()`**. Response luôn là **HTTP 200** với `user`/tokens hợp lệ, bất kể `device_id`/`hardware_hash` client thật sự gửi lên là gì (máy mới, máy cũ, giá trị rỗng...) — vì các giá trị đó **không được ghi vào DB** trong nhánh review (khác với user thường, nơi `device_id` gửi lên luôn được lưu/so khớp). Token trả về mang claim `device_id` **cố định** (`REVIEW_DEVICE_ID = 'review-fixed-device'`, giống nhau cho mọi review account — không cần khác nhau vì token còn mang `user_id` riêng để phân biệt), không phải `device_id` thật của máy Apple dùng — do đó **request tiếp theo dùng access token đó** (VD `GET /api/videos/...`) cũng đi qua `DeviceJWTAuthentication` bình thường và trả 200, vì claim khớp đúng row `MobileDevice` cố định đã tạo sẵn cho account này (query trong `DeviceJWTAuthentication` luôn lọc thêm `user=user`, nên nhiều review account dùng cùng giá trị `device_id` không xung đột nhau).

Đây chính là điểm mấu chốt: thứ tự nhánh rẽ trong `validate()` phải đặt **trước** mọi logic pairing, không phải một `try/except` bọc quanh lỗi cũ — nếu implement sai bằng cách bắt `MobileDeviceError` rồi che đi, sẽ vẫn tốn 1 lần verify pairing code không cần thiết và dễ sót edge case (VD counter `claim_attempts` bị tính nhầm nếu code lỡ chạy qua `verify_pairing_code`).

Field `device_id` vẫn là `required=True` trên serializer (client mobile luôn gửi) nên không cần đổi validation ở tầng field — chỉ đổi luồng xử lý sau khi authenticate; giá trị client gửi bị bỏ qua có chủ đích trong nhánh review.

### Frontend (Vue)

Không thay đổi — review account chỉ đăng nhập qua mobile app, không qua web.

### Mobile (Flutter)

**Vấn đề hiện tại** (`src/mobile/lib/features/auth/presentation/screens/login_screen.dart:26-36`):

```dart
bool _offerPairingField = false;

@override
void initState() {
  super.initState();
  getIt<DeviceService>().hasPairedBefore().then((paired) {
    if (mounted) setState(() => _offerPairingField = !paired);
  });
}
```

`_offerPairingField` tự bật ô pairing code ngay khi mở màn login nếu máy local chưa từng pair thành công (`DeviceService.hasPairedBefore()` đọc cờ local, không hỏi server). Với máy Apple reviewer dùng để review (luôn là máy "chưa từng pair" trong mắt local storage) — ô pairing code sẽ hiện sẵn dù account của họ (`is_review_account=True`) không cần đến, gây rối hình ảnh ngay màn hình đầu tiên reviewer thấy.

**Thay đổi:** bỏ hẳn cơ chế đoán trước — ô pairing code luôn ẩn mặc định, chỉ hiện sau khi bloc nhận `AuthBlocPairingRequired` (tức server đã trả lỗi `PAIRING_CODE_REQUIRED`).

```dart
class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _pairingCodeController = TextEditingController();

  // initState() and _offerPairingField removed — the field only appears once
  // the server has actually asked for a code (feature-39: review accounts and
  // any already-paired handset must never see it pre-emptively).
  bool _obscurePassword = true;
  ...
```

Và trong `build()`, phần `BlocBuilder` render pairing field:

```dart
BlocBuilder<AuthBloc, AuthBlocState>(
  builder: (context, state) {
    final asked = state is AuthBlocPairingRequired;
    if (!asked) return const SizedBox.shrink();
    return PairingCodeField(
      controller: _pairingCodeController,
      hasUnclaimedSlot: state.hasUnclaimedSlot,
      enabled: true,
      errorText: state.errorMessage,
      supportEmail: state.supportEmail,
    );
  },
),
```

`DeviceService.hasPairedBefore()` không còn được gọi từ `LoginScreen` sau thay đổi này — cần kiểm tra xem hàm này còn được dùng ở nơi khác trong mobile codebase hay không; nếu không, có thể để nguyên trong `DeviceService` (không phải việc của feature này để dọn dẹp) hoặc xoá nếu rõ ràng orphan.

**Không đổi:** `PairingCodeField` widget, `AuthBloc`/`AuthBlocPairingRequired` state, `auth_repository_impl.dart` — pairing code vẫn hoạt động y hệt cho user thường, chỉ khác thời điểm field xuất hiện trên UI.

---

## Trade-off & lưu ý

- **Bảo mật:** review account vẫn phải qua `authenticate_user()` (email+password đúng, không bypass rate-limit/lockout hiện có nếu có) — chỉ bỏ qua device pairing, không bỏ qua authentication. Rủi ro duy nhất: nếu credential này lộ, ai cũng login được từ bất kỳ thiết bị nào không giới hạn — chấp nhận được vì đây là tài khoản demo dữ liệu giả lập/sandbox, không phải tài khoản user thật.
- **Vận hành:** khuyến nghị đặt password mạnh, random, lưu riêng (không dùng lại password của tài khoản thật khác), và cân nhắc set `subscription_end_date`/`user_type = VIP` xa vô thời hạn để reviewer thấy đầy đủ tính năng premium.
- **Không có khái niệm "nhiều thiết bị" cho review account** — mọi máy dùng chung đúng 1 `MobileDevice` row cố định, nên không audit được máy vật lý nào đã login (khác user thật, nơi mỗi máy có row riêng) — chấp nhận được vì mục đích chỉ là review/demo.
- **1 review account = 1 phiên đăng nhập "sống" tại một thời điểm theo nghĩa access token**, nhưng KHÔNG giới hạn số lần/số máy được login — vì `_review_session()` không chạy quota check (`taken >= mobile_max_devices`) của `issue_slot`. Nhiều máy Apple review cùng lúc vẫn login được, tất cả cùng map về 1 `MobileDevice` row, tokens độc lập nhau (JWT không bị thu hồi lẫn nhau).
- **Test:** cần unit test cho `MobileLoginSerializer` case `is_review_account=True`:
  - Login thành công (HTTP 200) không cần `pairing_code`, response có `device` là `MobileDevice` cố định (không phải `None`), token mang claim `device_id` đúng bằng `REVIEW_DEVICE_ID`.
  - **Quan trọng:** test riêng case gửi `device_id`/`hardware_hash` bất kỳ (giả lập máy Apple reviewer, giá trị random mỗi lần) — khẳng định (1) response không phải `MobileDeviceError`/`PAIRING_CODE_REQUIRED`, và (2) giá trị `device_id` gửi lên **không được ghi đè** vào `MobileDevice` row cố định (đọc lại row sau request, so sánh `device_id` vẫn là giá trị cố định ban đầu).
  - **Test tích hợp end-to-end quan trọng nhất** (điểm PO review phát hiện thiếu ở vòng trước): sau khi login thành công, dùng access token trả về gọi một API khác cần auth (VD bất kỳ endpoint `IsAuthenticated`) — phải trả 200, không phải 401 "Token missing device binding" hay "Device session has been revoked". Đây là test bắt buộc để xác nhận thiết kế thật sự hoạt động qua `DeviceJWTAuthentication`, không chỉ dừng ở bước login.
  - Test login nhiều lần liên tiếp (kể cả song song, giả lập nhiều máy) đều thành công và luôn tái sử dụng đúng 1 row, không tạo thêm `MobileDevice` mới mỗi lần.
  - Test case field `is_review_account` chưa có `MobileDevice` nào (VD set trực tiếp qua DB, bỏ qua admin action) vẫn login được — do lớp phòng thủ `ensure_review_device()` gọi lại trong `_review_session()`.
  - Test `ensure_review_device()` riêng: gọi 2 lần liên tiếp cho cùng user chỉ tạo 1 row (idempotent), row đó pass được validation đầy đủ của `MobileDevice` (không thiếu `expires_at`/`pairing_code`), và `client_code` không vượt `max_length=16`.
- **Hiển thị trong Django admin:** `MobileDeviceInline` (`admin.py:105-119`, readonly, `has_add_permission=False`) sẽ tự hiện row cố định này trên trang chi tiết user, y hệt mọi `MobileDevice` khác — không cần code thêm để hiện, nhưng vì `device_name='Apple/Google Review'` đã set rõ trong `ensure_review_device()` (mục Backend #1), staff xem trang user khác sẽ không nhầm đây là 1 thiết bị thật đang hoạt động bất thường.
- **Không đổi hành vi user thường (backend):** nhánh rẽ chỉ kích hoạt khi `is_review_account=True`, mặc định `False` cho toàn bộ user hiện có — không regression cho luồng pairing hiện tại.
- **Đổi hành vi UI cho MỌI user (mobile):** trước đây máy chưa từng pair thấy sẵn ô pairing code (tiết kiệm 1 round-trip); sau thay đổi, mọi user lần đầu (kể cả user thường, không chỉ review account) đều phải submit email/pass trước, thấy lỗi, rồi mới nhập lại kèm code. Đây là đánh đổi UX chấp nhận được để tránh reviewer bối rối, nhưng cần thông báo trước cho user thật nếu có kênh support hay hỏi về việc này.

## Bước tiếp theo

1. Migration thêm `is_review_account` trên `User`.
2. Thêm `ensure_review_device()` (+ `REVIEW_DEVICE_ID`, `REVIEW_TTL_YEARS`) vào `services/mobile_slot.py`, kèm test riêng cho hàm này (idempotent, không thiếu field bắt buộc, `client_code` hợp lệ độ dài).
3. Sửa `UserAdmin` — expose field `is_review_account`; chèn gọi `ensure_review_device(obj)` vào cuối `save_model()` hiện có (không thay thế audit log block).
4. Sửa `MobileLoginSerializer.validate()` + thêm `_review_session()` gọi `ensure_review_device()`.
5. Viết test cho nhánh review account trong `test_mobile_auth.py` (hoặc file test tương ứng) — đặc biệt test tích hợp "login xong dùng token gọi API khác vẫn 200" đã nêu ở Trade-off.
6. Sửa `login_screen.dart` — bỏ `_offerPairingField`/`initState`, đổi điều kiện render `PairingCodeField` chỉ dựa vào `AuthBlocPairingRequired`. Kiểm tra `DeviceService.hasPairedBefore()` còn dùng ở đâu khác không.
7. Chạy `flutter test` liên quan `login_screen`/`auth_bloc` nếu có, cập nhật nếu test cũ assert theo hành vi đoán trước.
8. Sau khi merge: tạo 1 user qua Django admin, tick `is_review_account` (tự sinh `MobileDevice` cố định qua `ensure_review_device()`), set password mạnh, set `user_type=VIP` + `subscription_end_date` xa — dùng credential này điền vào App Store Connect Sign-In Information.
