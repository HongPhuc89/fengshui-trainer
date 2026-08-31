# Feature 38 — Rút ngắn `pairing_code` từ 12 xuống 6 ký tự

## Document Information
- **Feature**: `pairing_code` (feature-34 §5.2) đổi từ 12 ký tự thân mã (`TT-XXXX-XXXX-XXXX`, ~60 bit) xuống còn **6 ký tự, chia 2 nhóm 3** (`TT-XXX-XXX`, ~30 bit). Không đổi schema, không cần migration.
- **Status**: **v2 — Implemented (Stage 3, 2026-08-31)**. 2 test backend mới xanh (78/78 toàn suite `core`+`users`) + 7 test Flutter xanh.
- **Created**: 2026-08-31
- **Updated**: 2026-08-31
  - v2: Xử lý PO review v1 — 3 Suggestion (ghi chú rollout hỗn hợp §3.3, ghi chú mask mã cũ §4.1, thêm living docs vào §7). Không đổi quyết định kỹ thuật nào.
- **Related**: `feature-34-mobile-client-id.md` (§5.2 định dạng gốc), `feature-35-admin-refresh-device.md` (nơi mã được reissue khi đổi máy)

---

## 1. Tóm tắt

`pairing_code` hiện tại dài 17 ký tự hiển thị (`TT-4KM9-X7QP-2N5R`), mang ~60 bit entropy. Con số đó được chọn cho một mối đe doạ mà mã này **không thực sự phải chống**: nó chỉ được kiểm tra sau khi user đã đăng nhập đúng email/password (field trong `MobileLoginSerializer`, không phải endpoint công khai), và đã có sẵn `DEVICE_PAIRING_MAX_ATTEMPTS=5` lần sai + `DEVICE_PAIRING_TTL_DAYS=7` ngày hết hạn. Rào chắn thật nằm ở đó, không nằm ở độ dài mã.

User quyết định rút xuống **6 ký tự** (lý do: quy mô user hiện tại nhỏ). Chọn cách chia **3-3** thay vì giữ nhịp 4-4-4 cũ — xem §4.1.

**Không cần migration**: `pairing_code = CharField(max_length=20, unique=True)` đã dư chỗ cho chuỗi ngắn hơn, và các mã 12 ký tự đã phát trước khi deploy vẫn xác thực bình thường vì `normalize_code()` so khớp theo giá trị, không ràng buộc độ dài (§4.3).

---

## 2. Phân tích hiện trạng — mọi chỗ hard-code định dạng cũ

| Vị trí | Hiện tại | Vì sao phải sửa |
|---|---|---|
| `users/constants.py` | `PAIRING_BODY_LENGTH = 12` | Nguồn duy nhất định độ dài thân mã |
| `users/services/mobile_slot.py::_generate_unique_pairing_code()` | `code = f'{PREFIX}-{body[0:4]}-{body[4:8]}-{body[8:12]}'` | Chia nhóm 4-4-4 gắn cứng trong code |
| `users/admin.py::pairing_code_display()` | `f'{obj.pairing_code[:7]}-****-****'` | Cắt chuỗi giả định 2+1+4=7 ký tự đầu + 2 nhóm ẩn phía sau |
| `mobile/lib/features/auth/presentation/widgets/pairing_code_field.dart::PairingCodeFormatter` | `_bodyLength = 12`, chia nhóm 4 khi gõ | Formatter phía client phải khớp với server, nếu không user gõ đủ 12 ký tự mà ô nhập vẫn tiếp tục nhận |
| `pairing_code_field.dart` (UI) | `hintText: 'XXXX-XXXX-XXXX'` | Gợi ý sai định dạng mới |
| `users/tests/test_mobile_device.py` | ví dụ `'tt-4km9 x7qp-2n5r'`, `body.startswith('TT')` check trên 12 ký tự | Cần ví dụ khớp định dạng mới; test bất biến (không bắt đầu bằng prefix) vẫn đúng logic, chỉ đổi ví dụ |
| `mobile/test/features/auth/pairing_code_formatter_test.dart` | assert nhóm 4, dừng ở 12 ký tự | Viết lại theo nhóm 3, dừng ở 6 ký tự |

`normalize_code()` (backend) và phần fold ký tự dễ nhầm trong `PairingCodeFormatter` (mobile) **không đổi** — cả hai đều không phụ thuộc độ dài, chỉ transform từng ký tự.

---

## 3. Quyết định thiết kế

### 3.1 Chia nhóm 3-3, không giữ nhịp 4 cũ

6 ký tự chia làm một nhóm duy nhất (`XXXXXX`) thì khó đọc rời qua điện thoại; chia 3-3 (`XXX-XXX`) giữ được lý do ban đầu của việc chia nhóm — mã này **được đọc qua điện thoại hoặc gõ lại từ Zalo** (feature-34 §5.2) — mà không kéo dài thêm. Không chọn 2-2-2 vì ba nhóm ngắn nhìn rối hơn hai nhóm vừa, và không có lý do gì để giữ đúng số nhóm cũ khi tổng độ dài đã đổi hẳn.

### 3.2 Entropy 6 ký tự vẫn dư an toàn so với rào chắn thật

```
32^6 ≈ 1.07 × 10⁹ tổ hợp (~30 bit)
```

- **Brute-force**: attacker đã phải đăng nhập đúng email/password trước khi chạm tới bước này, và chỉ có `DEVICE_PAIRING_MAX_ATTEMPTS=5` lần thử trước khi khoá. Xác suất đoán trúng trong 5 lần: `5 / 1.07×10⁹ ≈ 4.7×10⁻⁹` — thấp hơn nhiều so với việc đoán trúng password.
- **Va chạm khi sinh mã** (`unique=True` trên toàn bộ lịch sử, không chỉ mã đang active — kể cả mã đã claim vẫn giữ nguyên trong bảng): theo nghịch lý sinh nhật, phải phát tới hơn **~30.000 mã** mới có 50% khả năng đụng một lần — và đụng chỉ khiến `_generate_unique_pairing_code()` thử lại (đã có sẵn vòng lặp `_MAX_CODE_ATTEMPTS`), không phải lỗi bảo mật. Với quy mô user hiện tại, con số 30.000 mã phát ra (kể cả tính cả các lần reissue theo feature-35) là một chân trời rất xa.

### 3.3 Không cần migration — mã cũ đã phát vẫn dùng được

`normalize_code()` không kiểm tra độ dài, chỉ chuẩn hoá ký tự (viết hoa, bỏ dấu gạch/khoảng trắng, fold I/L/O) rồi so **bằng chuỗi** với `slot.pairing_code` đã lưu. Một slot `UNCLAIMED` được phát ra *trước* khi deploy (12 ký tự) vẫn verify đúng sau khi deploy — code sinh mới chỉ ảnh hưởng tới slot phát ra *sau* đó. Rollout không cần dừng dịch vụ, không cần backfill.

`max_length=20` trên field đã dư cho cả định dạng cũ (17 ký tự) lẫn mới (10 ký tự: `TT-XXX-XXX`), nên schema không đổi.

**App cũ nhận mã mới trong lúc rollout — vô hại.** App mobile chưa cập nhật vẫn dùng `PairingCodeFormatter` nhóm-4 cũ; gõ một mã 6 ký tự vào đó sẽ hiển thị gạch nhóm sai (`4KM7-X2` thay vì `4KM-7X2`), nhưng giá trị gửi lên server không đổi vì cả hai phía đều strip dấu `-` trước khi so/gửi (`normalize_code()` phía server, `.replaceAll('-', ...)`-tương đương phía client). Chỉ là hiển thị lệch tạm thời cho tới khi app cập nhật, không phải lỗi chức năng (PO review v1, Suggestion).

---

## 4. Đề xuất giải pháp

### 4.1 Backend (Django)

`users/constants.py`:
```python
PAIRING_BODY_LENGTH = 6  # was 12 — feature-38
```

`users/services/mobile_slot.py`:
```python
def _generate_unique_pairing_code() -> str:
    for _ in range(_MAX_CODE_ATTEMPTS):
        body = ''.join(secrets.choice(PAIRING_ALPHABET) for _ in range(PAIRING_BODY_LENGTH))
        if body.startswith(PAIRING_PREFIX):
            continue
        code = f'{PAIRING_PREFIX}-{body[0:3]}-{body[3:6]}'
        if not MobileDevice.objects.filter(pairing_code=code).exists():
            return code
    raise IntegrityError('Unable to allocate a unique pairing code.')
```

`users/admin.py` — mask logic phải khớp nhóm mới (2 prefix + 1 dash + 3 ký tự nhóm đầu = 6 ký tự hiển thị thật, phần còn lại ẩn):
```python
@admin.display(description='Mã ghép cặp')
def pairing_code_display(self, obj):
    request = getattr(self, 'request', None)
    if (obj.status == 'UNCLAIMED' and request
            and request.user.has_perm('users.view_activation_key_secret')):
        return format_html('<code style="user-select:all">{}</code>', obj.pairing_code)
    return f'{obj.pairing_code[:6]}-***'
```

> **Mã cũ (12 ký tự) còn tồn đọng ngay sau deploy** sẽ hiển thị hơi lạ qua công thức trên — `"TT-4KM9-..."[:6]` cắt vào giữa nhóm đầu, ra `TT-4KM-***` (mất ký tự thứ 4 của nhóm cũ). Không lộ thêm thông tin (che nhiều hơn, không phải ít hơn) và tự hết trong tối đa 7 ngày khi slot đó hết hạn (`DEVICE_PAIRING_TTL_DAYS`) — cosmetic, không phải bug (PO review v1, Suggestion).

### 4.2 Mobile (Flutter)

`pairing_code_field.dart`:
```dart
class PairingCodeFormatter extends TextInputFormatter {
  static const _alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  static const _prefix = 'TT';
  static const _bodyLength = 6;   // was 12

  @override
  TextEditingValue formatEditUpdate(TextEditingValue _, TextEditingValue next) {
    var raw = next.text.toUpperCase()
        .replaceAll('I', '1').replaceAll('L', '1').replaceAll('O', '0')
        .split('').where(_alphabet.contains).join();

    if (raw.startsWith(_prefix)) raw = raw.substring(_prefix.length);
    raw = raw.length > _bodyLength ? raw.substring(0, _bodyLength) : raw;

    final groups = <String>[];
    for (var i = 0; i < raw.length; i += 3) {          // was += 4
      groups.add(raw.substring(i, i + 3 > raw.length ? raw.length : i + 3));
    }
    final text = groups.join('-');
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}
```

`hintText: 'XXX-XXX'` thay cho `'XXXX-XXXX-XXXX'`. `prefixText: 'TT-'` giữ nguyên.

---

## 5. Test plan

| Vị trí | Thay đổi |
|---|---|
| `test_generated_body_never_starts_with_the_prefix` | Không đổi logic — vẫn generate 200 mã, assert không bắt đầu bằng `TT` |
| `test_t21_code_normalisation_tolerates_lookalike_glyphs` | Đổi ví dụ sang 6 ký tự, ví dụ `normalize_code('tt-4km 9x7')` == `normalize_code('TT4KM9X7')` |
| Mới: `test_generated_code_is_six_characters_grouped_3_3` | Assert `_generate_unique_pairing_code()` khớp regex `^TT-[A-Z0-9]{3}-[A-Z0-9]{3}$`, không chứa I/L/O/U |
| Mới: mã cũ (12 ký tự, tạo thủ công qua `MobileDevice.objects.create(pairing_code='TT-4KM9-X7QP-2N5R', ...)`) vẫn `verify_pairing_code()` đúng | Xác nhận §3.3 — rollout không cần migrate dữ liệu cũ |
| `pairing_code_formatter_test.dart` | Viết lại toàn bộ ví dụ theo nhóm 3 / dừng ở 6 ký tự (xem bảng §2) |
| Mới: `pairing_code_display` khi ẩn mã | Assert `'TT-4KM-***'` cho mã `'TT-4KM-X7Q'`, không lộ nhóm thứ hai |

---

## 6. Trade-off & lưu ý

- **Entropy giảm từ 60 bit xuống 30 bit** — chấp nhận được vì phân tích §3.2 cho thấy rào chắn thật (auth-gate + 5 lần thử + hết hạn 7 ngày) không phụ thuộc độ dài mã; 30 bit vẫn dư nhiều bậc độ lớn so với ngưỡng cần thiết.
- **Nếu sau này user tăng mạnh (ví dụ hàng trăm nghìn) và tốc độ reissue cao**, nên xem lại — nhưng đó là quyết định của thời điểm đó, không phải bây giờ. Ghi vào backlog.
- **Không có đường lùi cho mã đã phát ở định dạng cũ**: sau deploy, mã 12 ký tự cũ vẫn hoạt động bình thường (§3.3) nên không cần đường lùi.

---

## 7. Bước tiếp theo

- File cần sửa: `users/constants.py`, `users/services/mobile_slot.py`, `users/admin.py`, `users/tests/test_mobile_device.py`, `mobile/lib/features/auth/presentation/widgets/pairing_code_field.dart`, `mobile/test/features/auth/pairing_code_formatter_test.dart`.
- Living docs cần cập nhật ví dụ (không phải doc lịch sử — `feature-34-mobile-client-id.md` giữ nguyên): `md/core/api-specification.md:893`, `md/core/database-design.md:113` (PO review v1, Suggestion).
- Không có file DB migration.
- Chờ PO review trước khi implement.
