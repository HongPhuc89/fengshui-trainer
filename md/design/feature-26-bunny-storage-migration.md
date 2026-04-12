# Feature 26 — Bunny Storage Migration for Encrypted `.bin` Files

## Document Information
- **Feature**: Migrate public `.bin` files from Supabase Storage → Bunny CDN Storage
- **Version**: 1.1
- **Date**: 2026-04-07
- **Status**: 📝 Draft — Revised after PO Review (v1.0)

---

## 1. Tóm tắt

Chuyển việc lưu trữ và phân phối file `.bin` (PDF chương sách đã AES-256-GCM encrypt) từ **Supabase Storage** sang **Bunny CDN Storage Zone** để:

- **Giảm chi phí**: Bunny egress ~0.01 USD/GB (Asia), Supabase Storage egress đắt hơn đáng kể.
- **Tăng tốc độ tải**: Bunny CDN có PoP phủ khắp Đông Nam Á — latency thấp hơn.
- **Đơn giản hóa stack**: Loại bỏ hoàn toàn Supabase pre-signed URL cho file `.bin`; Bunny cấp URL trực tiếp/token.

Scope: **chỉ file `.bin`** (đường dẫn `encrypt_book/v{version}/{chapter_id}.bin`). Các file khác (cover image, PDF gốc, avatar, DB backup) **không thay đổi** — vẫn ở Supabase.

---

## 2. Phân tích

### 2.1 Hiện trạng

```
[Admin upload PDF] → BookChapter.save()
       ↓
[Celery task] encrypt_and_upload_chapter_pdf()
       ↓
Upload encrypt_book/v{v}/{id}.bin → Supabase S3 bucket (private)
       ↓
BookChapter.encrypted_cdn_url = "https://{ref}.supabase.co/storage/v1/object/{bucket}/encrypt_book/..."
       ↓
[Frontend GET /decrypt-key/] → Django generates boto3 presigned URL (1h TTL) → return file_url
       ↓
[Frontend] fetch file_url → Supabase S3 → decrypt in-browser
```

**Vấn đề cost của presigned URL Supabase**:
- Mỗi lần đọc chương = 1 request đến Supabase S3 + egress bandwidth.
- Supabase tính bandwidth egress theo plan, vượt free tier phát sinh phí.
- Pre-signed URL expire sau 1h → nếu user đọc > 1h phải gọi lại API.

### 2.2 Mục tiêu sau migration

```
[Celery task] encrypt_and_upload_chapter_pdf()
       ↓
Upload encrypt_book/v{v}/{id}.bin → Bunny Storage Zone (HTTP PUT)
       ↓
BookChapter.encrypted_cdn_url = "https://{zone}.b-cdn.net/encrypt_book/v{v}/{id}.bin"
       ↓
[Frontend GET /decrypt-key/] → Django returns encrypted_cdn_url as public CDN URL directly
       ↓
[Frontend] fetch public Bunny CDN URL → Bunny CDN Edge → decrypt in-browser
```

> **Lưu ý**: Không dùng Bunny Token Authentication — file `.bin` là ciphertext nên public URL không lộ content. Key/IV vẫn được gate bởi JWT + purchase check tại `/decrypt-key/`.

### 2.3 Các tầng bị ảnh hưởng

| Tầng | Thay đổi |
|------|---------|
| Backend — `books/services/pdf_encryption.py` | Thêm Bunny upload/URL helper; keep Supabase fallback |
| Backend — `books/tasks.py` | Upload `.bin` lên Bunny thay vì Supabase |
| Backend — `books/views.py` | `DecryptKeyView` trả Bunny token URL thay vì Supabase presigned |
| Backend — `books/management/commands/encrypt_chapters.py` | Tùy chọn `--target=bunny|supabase` (default: bunny) |
| Backend — `config/settings.py` | Thêm `BUNNY_STORAGE_*` settings |
| Backend — Migration script (management command) | Di chuyển file `.bin` hiện có từ Supabase → Bunny |
| Frontend | **Không thay đổi** — vẫn nhận `file_url` từ `/decrypt-key/` |

---

## 3. Đề xuất giải pháp

### 3.1 Bunny Storage Zone vs Bunny Stream

| | Bunny **Storage Zone** | Bunny **Stream** |
|---|---|---|
| Dùng cho | Static files (PDF, `.bin`, images) | Video transcoding + HLS delivery |
| API | HTTP PUT/GET + Storage API key | REST API tạo video entry |
| CDN | Cần gắn Pull Zone để CDN serve | Tích hợp sẵn CDN |
| Token auth | Bunny Token Authentication (HMAC-SHA256) | Bunny video token |

**Lựa chọn**: Bunny **Storage Zone** + Pull Zone (CDN), vì file `.bin` là static binary — không cần transcoding.

### 3.2 Cấu trúc Bunny Storage Zone

```
Storage Zone: thienthu-encrypted-books  (hoặc tên tùy chọn)
  └── encrypt_book/
        └── v{version}/
              └── {chapter_id}.bin

Pull Zone: thienthu-encrypted-books.b-cdn.net   (hostname tùy chỉnh)
  → public CDN URL: https://thienthu-encrypted-books.b-cdn.net/encrypt_book/v1/42.bin
```

**Bảo mật**: File `.bin` đã AES-256-GCM encrypt — **safe to expose as public CDN URL** vì không ai có thể đọc nội dung mà không có key. Không cần Bunny Token Authentication. Điều này đơn giản hóa đáng kể so với Supabase presigned URL.

> **Lý do bỏ Token Auth**: File `.bin` là ciphertext — public URL không lộ content. Key/IV chỉ trả khi user đã authenticate + có quyền mua (`/decrypt-key/`). Đây là thiết kế bảo mật hiện tại, và migration này không thay đổi threat model.

### 3.3 Settings mới (`config/settings.py`)

```python
# Bunny Storage Zone — cho encrypted .bin files
BUNNY_STORAGE_ZONE = env('BUNNY_STORAGE_ZONE', default='')           # e.g. "thienthu-encrypted-books"
BUNNY_STORAGE_API_KEY = env('BUNNY_STORAGE_API_KEY', default='')     # Storage Zone API key (password)
BUNNY_STORAGE_CDN_HOSTNAME = env('BUNNY_STORAGE_CDN_HOSTNAME', default='')  # e.g. "thienthu-books.b-cdn.net"
BUNNY_STORAGE_REGION = env('BUNNY_STORAGE_REGION', default='sg')     # de|ny|la|sg|syd|br|jh (default: Singapore — gần Việt Nam nhất)
```

> **Lưu ý**: `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY`, `BUNNY_CDN_HOSTNAME` (settings video Bunny Stream hiện có) **không thay đổi**.
>
> **Region mặc định**: `sg` (Singapore) thay vì `de` (Frankfurt) — user base SEA, latency thấp hơn đáng kể.

### 3.4 `books/services/pdf_encryption.py` — thêm Bunny helpers

Thêm các hàm:

```python
from django.core.exceptions import ImproperlyConfigured


def _bunny_storage_base_url(region: str) -> str:
    """
    Return regional Bunny Storage HTTP API base URL.

    Bunny region codes → API endpoint:
      de  (Frankfurt, default) → https://storage.bunnycdn.com
      ny  (New York)           → https://ny.storage.bunnycdn.com
      la  (Los Angeles)        → https://la.storage.bunnycdn.com
      sg  (Singapore)          → https://sg.storage.bunnycdn.com   ← recommended for SEA
      syd (Sydney)             → https://syd.storage.bunnycdn.com
      br  (São Paulo)          → https://br.storage.bunnycdn.com
      jh  (Johannesburg)       → https://jh.storage.bunnycdn.com
    """
    if region == 'de':
        return 'https://storage.bunnycdn.com'
    return f'https://{region}.storage.bunnycdn.com'


def upload_bin_to_bunny(chapter_id: int, version: int, data: bytes) -> None:
    """
    Upload encrypted .bin file to Bunny Storage Zone via HTTP PUT.

    The .bin file is AES-256-GCM ciphertext — safe to store in a public-accessible
    Storage Zone because without the key/IV (gated by /decrypt-key/ API) the bytes
    are meaningless.

    Raises:
        ImproperlyConfigured: if BUNNY_STORAGE_ZONE or BUNNY_STORAGE_API_KEY are not set.
        requests.HTTPError: on non-2xx response from Bunny Storage API.
    """
    zone = settings.BUNNY_STORAGE_ZONE
    api_key = settings.BUNNY_STORAGE_API_KEY
    if not zone or not api_key:
        raise ImproperlyConfigured(
            "BUNNY_STORAGE_ZONE and BUNNY_STORAGE_API_KEY must be set to upload .bin files."
        )

    region = getattr(settings, 'BUNNY_STORAGE_REGION', 'sg')
    base = _bunny_storage_base_url(region)
    path = encrypted_cdn_path(chapter_id, version)  # "encrypt_book/v{version}/{chapter_id}.bin"

    # PUT to Bunny Storage API: https://{region}.storage.bunnycdn.com/{zone}/{path}
    # Cache-Control: immutable because path includes version — re-encrypt bumps version → new path.
    resp = requests.put(
        f'{base}/{zone}/{path}',
        data=data,
        headers={
            'AccessKey': api_key,
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
        timeout=120,
    )
    resp.raise_for_status()


def build_bunny_cdn_url(chapter_id: int, version: int) -> str:
    """
    Return the public CDN URL for an encrypted .bin file served via Bunny Pull Zone.

    URL format: https://{BUNNY_STORAGE_CDN_HOSTNAME}/encrypt_book/v{version}/{chapter_id}.bin

    This URL is permanent and publicly accessible — the file content is encrypted
    (AES-256-GCM), so exposure without the decryption key is harmless.
    """
    path = encrypted_cdn_path(chapter_id, version)
    hostname = settings.BUNNY_STORAGE_CDN_HOSTNAME
    return f'https://{hostname}/{path}'
```

**Giữ nguyên** các hàm Supabase hiện tại (`get_s3_client`, `build_encrypted_cdn_url`, `get_presigned_encrypted_url`) — dùng cho rollback (`encrypt_chapters --target=supabase`) và các file khác (cover image, avatar) vẫn ở Supabase.

### 3.5 `books/tasks.py` — thay đổi upload target

**Hiện tại**:
```python
get_s3_client().put_object(
    Bucket=settings.SUPABASE_STORAGE_BUCKET,
    Key=cdn_path,
    Body=encrypted,
    ContentType="application/octet-stream",
    CacheControl="public, max-age=31536000, immutable",
)
BookChapter.objects.filter(pk=chapter_id).update(
    encrypted_cdn_url=build_encrypted_cdn_url(chapter_id, version),
)
```

**Sau migration**:
```python
from .services.pdf_encryption import upload_bin_to_bunny, build_bunny_cdn_url

upload_bin_to_bunny(chapter_id, version, encrypted)
BookChapter.objects.filter(pk=chapter_id).update(
    encrypted_cdn_url=build_bunny_cdn_url(chapter_id, version),
)
```

### 3.6 `books/views.py` — `DecryptKeyView`

**Hiện tại** — gọi `get_presigned_encrypted_url()` → Supabase presigned URL (1h TTL, boto3 call mỗi request).

**Sau migration** — `encrypted_cdn_url` đã là Bunny public CDN URL → trả trực tiếp:

```python
# views.py — DecryptKeyView.get()
if not chapter.encrypted_cdn_url:
    return Response({'detail': 'Chương đang được xử lý...'}, status=503)

key, iv = derive_chapter_key(chapter.id, version=chapter.encryption_version)
# encrypted_cdn_url now IS the public Bunny CDN URL — no presigned URL generation needed
return Response({
    'key_b64':  base64.b64encode(key).decode(),
    'iv_b64':   base64.b64encode(iv).decode(),
    'file_url': chapter.encrypted_cdn_url,
})
```

> **Loại bỏ** import `get_presigned_encrypted_url` từ view. View đơn giản hơn và không còn gọi boto3 mỗi request.

### 3.7 Migration management command: `migrate_bin_to_bunny`

```python
# books/management/commands/migrate_bin_to_bunny.py
"""
Migrate existing encrypted .bin files from Supabase → Bunny Storage Zone.

Usage:
    python manage.py migrate_bin_to_bunny
    python manage.py migrate_bin_to_bunny --dry-run
    python manage.py migrate_bin_to_bunny --chapter-ids 1,2,3
    python manage.py migrate_bin_to_bunny --force-reupload  # re-upload even if URL already Bunny

Steps for each chapter:
1. Read encrypted .bin from Supabase (via boto3 presigned download OR direct S3 get_object)
2. PUT to Bunny Storage Zone
3. Update BookChapter.encrypted_cdn_url → Bunny CDN URL
"""
```

**Logic (per-chapter, không abort toàn bộ nếu 1 chapter lỗi):**
1. Query `BookChapter.objects.filter(encrypted_cdn_url__isnull=False)` (chỉ những chapter đã encrypt).
2. Skip chapters đã có URL bắt đầu bằng `https://{BUNNY_STORAGE_CDN_HOSTNAME}/` (đã migrate).
3. Với mỗi chapter: wrap trong `try/except Exception` — log lỗi và `continue` sang chapter tiếp theo.
4. Download từ Supabase: `s3.get_object(Bucket=bucket, Key=encrypted_cdn_path(chapter.id, version))['Body'].read()`.
5. Upload lên Bunny: `upload_bin_to_bunny(chapter.id, version, data)`.
6. Update DB: `BookChapter.objects.filter(pk=chapter.id).update(encrypted_cdn_url=build_bunny_cdn_url(...))`.
7. Log kết quả từng chapter (`OK` / `SKIP` / `ERROR`). `--dry-run` in ra plan mà không thực thi.
8. In tổng kết cuối: `Migrated: X | Skipped: Y | Errors: Z`.

**Error handling chi tiết:**
- Nếu `s3.get_object()` fail (file không tồn tại trên Supabase): log `ERROR: chapter {id} — file not found on Supabase, will need re-encrypt`. Continue.
- Nếu `upload_bin_to_bunny()` fail: log HTTP status + message. Continue (DB không update, chapter giữ Supabase URL).
- Nếu DB update fail: log và continue (file đã lên Bunny, có thể re-chạy script để update DB).

### 3.8 Management command mới: `verify_bunny_config`

```
python manage.py verify_bunny_config
```

**Mục đích**: Kiểm tra toàn bộ cấu hình Bunny Storage trước khi chạy migration hoặc deploy lên production. Chạy được bất cứ lúc nào, không làm thay đổi dữ liệu.

**Các bước verify (theo thứ tự):**

| Step | Việc làm | Pass condition |
|------|----------|---------------|
| 1. Env vars | Kiểm tra 4 biến `BUNNY_STORAGE_*` đều được set (không empty) | Tất cả có giá trị |
| 2. Storage API | Upload file test nhỏ (`_verify_bunny_config_test.bin`, 16 bytes) lên Storage Zone | HTTP 201 |
| 3. CDN reachability | HTTP GET đến CDN URL của file test, check status 200 | HTTP 200 |
| 4. Storage delete | Xóa file test sau verify | HTTP 200 |
| 5. Region check | Log region đang dùng, cảnh báo nếu không phải `sg` (khuyến nghị cho SEA) | Warning only |

**Output mẫu (success):**
```
[OK] BUNNY_STORAGE_ZONE      = thienthu-encrypted-books
[OK] BUNNY_STORAGE_API_KEY   = ****** (set)
[OK] BUNNY_STORAGE_CDN_HOSTNAME = thienthu-books.b-cdn.net
[OK] BUNNY_STORAGE_REGION    = sg
[OK] Storage API upload test → HTTP 201
[OK] CDN reachability test   → HTTP 200 (latency: 42ms)
[OK] Storage API delete test → HTTP 200
[OK] Bunny Storage config is valid and ready.
```

**Output mẫu (failure):**
```
[OK] BUNNY_STORAGE_ZONE      = thienthu-encrypted-books
[FAIL] BUNNY_STORAGE_API_KEY = (not set)
[ERROR] Cannot proceed: missing required settings. Aborting.
```

**Implementation snippet:**

```python
# books/management/commands/verify_bunny_config.py

import time
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from books.services.pdf_encryption import _bunny_storage_base_url

TEST_FILE_NAME = '_verify_bunny_config_test.bin'
TEST_DATA = b'\x00' * 16  # 16 zero bytes — minimal payload


class Command(BaseCommand):
    help = "Verify Bunny Storage Zone credentials and CDN reachability."

    def handle(self, *args, **options):
        ok = True

        # Step 1 — env vars
        required = {
            'BUNNY_STORAGE_ZONE': getattr(settings, 'BUNNY_STORAGE_ZONE', ''),
            'BUNNY_STORAGE_API_KEY': getattr(settings, 'BUNNY_STORAGE_API_KEY', ''),
            'BUNNY_STORAGE_CDN_HOSTNAME': getattr(settings, 'BUNNY_STORAGE_CDN_HOSTNAME', ''),
            'BUNNY_STORAGE_REGION': getattr(settings, 'BUNNY_STORAGE_REGION', ''),
        }
        for key, val in required.items():
            display = '(not set)' if not val else ('******' if 'KEY' in key else val)
            if val:
                self.stdout.write(self.style.SUCCESS(f'[OK]   {key:<30} = {display}'))
            else:
                self.stdout.write(self.style.ERROR(f'[FAIL] {key:<30} = {display}'))
                ok = False

        if not ok:
            self.stdout.write(self.style.ERROR('[ERROR] Missing required settings. Aborting.'))
            return

        zone = settings.BUNNY_STORAGE_ZONE
        api_key = settings.BUNNY_STORAGE_API_KEY
        cdn_hostname = settings.BUNNY_STORAGE_CDN_HOSTNAME
        region = getattr(settings, 'BUNNY_STORAGE_REGION', 'sg')
        base = _bunny_storage_base_url(region)

        # Step 5 — region warning
        if region != 'sg':
            self.stdout.write(self.style.WARNING(
                f'[WARN] BUNNY_STORAGE_REGION={region!r} — "sg" (Singapore) is recommended for SEA users.'
            ))

        # Step 2 — upload test file
        upload_url = f'{base}/{zone}/{TEST_FILE_NAME}'
        try:
            resp = requests.put(
                upload_url,
                data=TEST_DATA,
                headers={'AccessKey': api_key, 'Content-Type': 'application/octet-stream'},
                timeout=15,
            )
            resp.raise_for_status()
            self.stdout.write(self.style.SUCCESS(f'[OK]   Storage API upload test  → HTTP {resp.status_code}'))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'[FAIL] Storage API upload test  → {exc}'))
            return

        # Step 3 — CDN reachability
        cdn_url = f'https://{cdn_hostname}/{TEST_FILE_NAME}'
        try:
            t0 = time.monotonic()
            resp = requests.get(cdn_url, timeout=15)
            latency_ms = int((time.monotonic() - t0) * 1000)
            resp.raise_for_status()
            self.stdout.write(self.style.SUCCESS(
                f'[OK]   CDN reachability test    → HTTP {resp.status_code} (latency: {latency_ms}ms)'
            ))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f'[WARN] CDN reachability test    → {exc} (CDN may need propagation time)'))

        # Step 4 — delete test file
        try:
            resp = requests.delete(
                upload_url,
                headers={'AccessKey': api_key},
                timeout=15,
            )
            resp.raise_for_status()
            self.stdout.write(self.style.SUCCESS(f'[OK]   Storage API delete test  → HTTP {resp.status_code}'))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f'[WARN] Delete test file failed  → {exc} (clean up manually)'))

        self.stdout.write(self.style.SUCCESS('[OK]   Bunny Storage config is valid and ready.'))
```

> **Lưu ý CDN step**: CDN propagation sau khi upload có thể mất 10–60s tùy PoP. Nếu CDN test fail nhưng Storage upload OK, đây là `[WARN]` (không phải `[ERROR]`) — config vẫn hợp lệ.

### 3.9 `encrypt_chapters` management command — cập nhật

Thêm `--target` option (default `bunny`):

```python
parser.add_argument('--target', choices=['bunny', 'supabase'], default='bunny',
                    help='Storage target for .bin upload (default: bunny)')
```

Upload theo target được chọn. Hữu ích khi cần debug hoặc rollback.

---

## 4. Trade-off & Lưu ý

### 4.1 Security

| Aspect | Supabase (hiện tại) | Bunny (sau) |
|--------|-------------------|-------------|
| File access | Private bucket + presigned URL (1h) | Public CDN URL |
| Content protection | URL expiry + file is encrypted | File is encrypted (AES-GCM) |
| Key distribution | Django API (JWT + purchase check) | Django API (JWT + purchase check — không đổi) |

**Đánh giá**: Việc chuyển `.bin` sang public URL **không giảm bảo mật** vì file đã encrypt AES-256-GCM. Không có key/IV (chỉ Django trả sau xác thực) → ciphertext vô nghĩa.

### 4.2 Cost

| Item | Supabase | Bunny |
|------|----------|-------|
| Storage | Free 1GB, $0.021/GB after | ~$0.01/GB/month |
| Egress (Á châu) | ~$0.09/GB (Supabase Pro) | ~$0.01/GB (Bunny, PoP SEA) |
| API calls | Boto3 per request (CPU) | Không có (static URL) |

Bunny egress **rẻ hơn ~9x** cho traffic Đông Nam Á.

### 4.3 Rollback

Nếu Bunny gặp sự cố:
- Chạy lại `encrypt_chapters --target=supabase` để re-upload lên Supabase và cập nhật URL về dạng cũ.
- Hoặc dùng `ChapterEncryptedFileView` (fallback endpoint hiện có) — serve file từ local VPS.

### 4.4 Edge cases

- **Chapter chưa có `encrypted_cdn_url`**: Task Celery đã handle, migration script skip.
- **Double upload**: Migration script check URL prefix để không upload lại file đã ở Bunny.
- **Bunny down trong upload**: `requests.HTTPError` → Celery retry (max 3 lần).
- **File `.bin` xóa trên Supabase trước khi migrate**: Migration script log warning, skip chapter đó — file sẽ được re-generate khi admin re-save chapter.

---

## 5. Thứ tự implement

```
Step 1 — Cấu hình Bunny (manual, ngoài code)
  1a. Tạo Storage Zone "thienthu-encrypted-books" trên Bunny dashboard
  1b. Gắn Pull Zone → lấy CDN hostname (e.g. thienthu-books.b-cdn.net)
  1c. Lấy Storage Zone API key (password)
  1d. Thêm vào .env: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY,
      BUNNY_STORAGE_CDN_HOSTNAME, BUNNY_STORAGE_REGION
  1e. Verify: python manage.py verify_bunny_config   ← phải pass trước khi tiếp tục

Step 2 — Backend code
  2a. config/settings.py — thêm 4 BUNNY_STORAGE_* settings
  2b. books/services/pdf_encryption.py — thêm Bunny upload helpers + _bunny_storage_base_url
  2c. books/tasks.py — đổi upload target sang Bunny
  2d. books/views.py — bỏ get_presigned_encrypted_url, dùng encrypted_cdn_url trực tiếp
  2e. books/management/commands/verify_bunny_config.py — verify command
  2f. books/management/commands/migrate_bin_to_bunny.py — migration script

Step 3 — Migration (production)
  3a. Deploy code mới
  3b. Chạy: python manage.py migrate_bin_to_bunny --dry-run  (kiểm tra plan)
  3c. Chạy: python manage.py migrate_bin_to_bunny  (thực thi)
  3d. Verify: một vài chapter đọc được bình thường, URL trong DB là Bunny CDN

Step 4 — Cleanup (optional, sau 1 tuần ổn định)
  4a. Xóa file .bin cũ trên Supabase bucket prefix encrypt_book/ (hoặc dùng find_orphan_s3_files)
```

---

## 6. Files cần tạo / sửa

| File | Action | Ghi chú |
|------|--------|---------|
| `src/backend/config/settings.py` | Sửa | Thêm 4 BUNNY_STORAGE_* env vars |
| `src/backend/books/services/pdf_encryption.py` | Sửa | Thêm `upload_bin_to_bunny`, `build_bunny_cdn_url`, `_bunny_storage_url` |
| `src/backend/books/tasks.py` | Sửa | Đổi upload sang Bunny, update `encrypted_cdn_url` |
| `src/backend/books/views.py` | Sửa | `DecryptKeyView` — bỏ presigned URL generation |
| `src/backend/books/management/commands/verify_bunny_config.py` | Tạo mới | Verify credentials + CDN reachability |
| `src/backend/books/management/commands/migrate_bin_to_bunny.py` | Tạo mới | Migration script |
| `src/backend/books/management/commands/encrypt_chapters.py` | Sửa | Thêm `--target` option |
| `src/backend/.env.example` | Sửa | Thêm 4 BUNNY_STORAGE_* vars |

**Không thay đổi**: Frontend, DB schema (không cần migration), Supabase config cho cover images/avatar/backup.

---

## 7. `.env.example` — các biến mới

```dotenv
# Bunny Storage Zone — encrypted .bin files (Feature 26)
# Tạo Storage Zone + Pull Zone tại: https://dash.bunny.net/storage
BUNNY_STORAGE_ZONE=thienthu-encrypted-books
BUNNY_STORAGE_API_KEY=your-storage-zone-password-here
BUNNY_STORAGE_CDN_HOSTNAME=thienthu-books.b-cdn.net
BUNNY_STORAGE_REGION=sg   # sg = Singapore (recommended for Vietnam/SEA users)
# Other regions: de (Frankfurt), ny (New York), la (LA), syd (Sydney), br (São Paulo), jh (Johannesburg)
```
