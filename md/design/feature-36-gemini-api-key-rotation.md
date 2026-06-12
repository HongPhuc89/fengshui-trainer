# Feature 36 — Gemini API Key Pool & Per-Model Quota Rotation

## Document Information

- **Feature**: 36 — Gemini API Key Pool & Auto-Rotation (Per-Key Per-Model)
- **Version**: 2.1
- **Created**: 2026-06-12
- **Updated**: 2026-06-12
- **Status**: Draft — Pending PO Review
- **Author**: Technical Leader

---

## 1. Bối cảnh & Vấn đề

### 1.1 Vấn đề

Hiện tại hệ thống dùng **1 Gemini API key** hardcode trong `.env` (`GEMINI_API_KEY`). Free tier Gemini có quota giới hạn **per key per model**:

| Metric | Limit (free tier) |
|---|---|
| RPM | 5 requests/minute |
| TPM | 250K tokens/minute |
| RPD | 20 requests/day |

RPD=20 đặc biệt tight — với pipeline 4 bước, chỉ chạy được ~5 video/ngày/key.

### 1.2 Vấn đề với thiết kế per-key đơn giản

Nếu chỉ track quota theo key (không theo model):
- Key A: Flash 2.5 hết RPD (20/20), Flash 3.5 vẫn còn 16/20
- → Hệ thống block cả key A, bỏ phí 16 requests còn lại trên Flash 3.5

### 1.3 Giải pháp

Track quota theo **cặp (key, model)**. Mỗi lần gọi Gemini, chọn cặp (key, model) có quota tốt nhất (LRU + RPD còn). Khi nhận `429`, chỉ block đúng cặp đó — các cặp khác vẫn available.

---

## 2. Thiết kế Chi Tiết

### 2.1 Database — 2 Models

**`TranscriptApiKey`** — lưu key, encrypted:

```python
from fernet_fields import EncryptedCharField

class TranscriptApiKey(models.Model):
    label         = models.CharField(max_length=100,
                        help_text='Tên gợi nhớ, ví dụ: key-phuc-personal, key-work')
    api_key       = EncryptedCharField(max_length=200)  # encrypted at rest
    is_active     = models.BooleanField(default=True,
                        help_text='Disable để tạm ngưng key mà không xóa')
    request_count = models.PositiveIntegerField(default=0,
                        help_text='Tổng requests đã dùng mọi model (không reset)')
    last_used_at  = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Gemini API Key'
        verbose_name_plural = 'Gemini API Keys'
        ordering            = ['label']

    def __str__(self):
        return self.label
```

**`TranscriptApiKeyUsage`** — track quota per (key, model):

```python
class TranscriptApiKeyUsage(models.Model):
    api_key         = models.ForeignKey(
                          TranscriptApiKey, on_delete=models.CASCADE,
                          related_name='usages')
    model_name      = models.CharField(max_length=100,
                          help_text='e.g. gemini-2.5-flash, gemini-2.0-flash')
    rpd_count       = models.PositiveIntegerField(default=0,
                          help_text='Requests used today for this model')
    rpd_reset_at    = models.DateTimeField(
                          help_text='When rpd_count resets (midnight UTC)')
    exhausted_until = models.DateTimeField(null=True, blank=True,
                          help_text='Set on 429. Null = available.')

    class Meta:
        unique_together     = [('api_key', 'model_name')]
        verbose_name        = 'API Key Usage'
        verbose_name_plural = 'API Key Usages'

    def __str__(self):
        return f'{self.api_key.label} / {self.model_name}'
```

**Tại sao `EncryptedCharField`:**
- `cryptography` đã có trong `requirements.txt` — `django-fernet-fields` dùng đúng package này.
- Key value bảo vệ khỏi DB dump/leak (backup file, SQL injection read, pgAdmin).
- Transparent với code: đọc `obj.api_key` trả về plaintext bình thường.
- Dùng `settings.SECRET_KEY` để derive encryption key. Rotate bằng `FERNET_KEYS = [new, old]` trong settings.

**Fallback:** Giữ `GEMINI_API_KEY` trong `.env` — nếu DB trống, dùng env key.

### 2.2 Dependency mới

```
# requirements.txt — thêm 1 dòng
django-fernet-fields
```

### 2.3 Settings mới

```python
# settings.py
GEMINI_RPD_LIMIT = env.int('GEMINI_RPD_LIMIT', default=18)  # safe buffer dưới 20 (free tier)
```

### 2.4 Backend — Helpers trong `tasks.py`

**Helper `_next_midnight_utc()`:**

```python
from datetime import datetime, timezone as dt_tz, timedelta

def _next_midnight_utc() -> datetime:
    now = datetime.now(dt_tz.utc)
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
```

**Helper `_get_gemini_client(model_name)`** — chọn cặp (key, model) tốt nhất:

```python
def _get_gemini_client(model_name: str):
    """
    Pick best available (key, model) pair by:
    1. Auto-create usage rows for active keys that don't have one yet.
    2. Reset RPD counters for rows past their reset time.
    3. Filter: key is_active, not exhausted, rpd_count < GEMINI_RPD_LIMIT.
    4. Sort LRU (key.last_used_at asc).
    Returns (client, key_pk, usage_pk).
    Falls back to env GEMINI_API_KEY if no DB key available.
    Raises RuntimeError if nothing available.
    """
    from .models import TranscriptApiKey, TranscriptApiKeyUsage
    from django.utils import timezone
    from django.db import models as m
    import google.genai as genai

    now = timezone.now()
    rpd_limit = settings.GEMINI_RPD_LIMIT

    # Ensure usage rows exist for all active keys (bulk, not per-key loop)
    existing_key_ids = set(
        TranscriptApiKeyUsage.objects.filter(model_name=model_name)
        .values_list('api_key_id', flat=True)
    )
    new_rows = [
        TranscriptApiKeyUsage(
            api_key=key,
            model_name=model_name,
            rpd_reset_at=_next_midnight_utc(),
        )
        for key in TranscriptApiKey.objects.filter(is_active=True)
        if key.pk not in existing_key_ids
    ]
    if new_rows:
        TranscriptApiKeyUsage.objects.bulk_create(new_rows, ignore_conflicts=True)

    # Reset daily counters for rows past their reset time
    TranscriptApiKeyUsage.objects.filter(
        model_name=model_name,
        rpd_reset_at__lte=now,
    ).update(rpd_count=0, rpd_reset_at=_next_midnight_utc(), exhausted_until=None)

    # Pick best candidate
    usage = (
        TranscriptApiKeyUsage.objects
        .filter(api_key__is_active=True, model_name=model_name)
        .filter(m.Q(exhausted_until__isnull=True) | m.Q(exhausted_until__lte=now))
        .filter(rpd_count__lt=rpd_limit)
        .order_by('api_key__last_used_at')
        .select_related('api_key')
        .first()
    )

    if usage:
        TranscriptApiKeyUsage.objects.filter(pk=usage.pk).update(
            rpd_count=m.F('rpd_count') + 1,
        )
        TranscriptApiKey.objects.filter(pk=usage.api_key_id).update(
            last_used_at=now,
            request_count=m.F('request_count') + 1,
        )
        return genai.Client(api_key=usage.api_key.api_key), usage.api_key_id, usage.pk

    # Fallback to env key
    if settings.GEMINI_API_KEY:
        logger.warning(
            '_get_gemini_client: no DB key available for model=%s, falling back to env key', model_name
        )
        return genai.Client(api_key=settings.GEMINI_API_KEY), None, None

    raise RuntimeError(
        f'No Gemini API key available for model {model_name} — '
        f'all exhausted, RPD limit reached, or no env fallback.'
    )
```

**Helper `_mark_key_model_exhausted(usage_pk)`** — chỉ block đúng cặp (key, model) bị 429:

```python
def _mark_key_model_exhausted(usage_pk: int | None, retry_after_minutes: int = 60):
    """
    Mark (key, model) pair as exhausted for retry_after_minutes.
    Default 60 min: safe buffer covering RPM (1 min) and partial RPD window.
    Admin can reset manually. No-op if usage_pk is None (env fallback).
    """
    if usage_pk is None:
        return
    from .models import TranscriptApiKeyUsage
    from django.utils import timezone
    from datetime import timedelta

    TranscriptApiKeyUsage.objects.filter(pk=usage_pk).update(
        exhausted_until=timezone.now() + timedelta(minutes=retry_after_minutes)
    )
    logger.warning(
        '_mark_key_model_exhausted: usage pk=%s exhausted, retry after %d min',
        usage_pk, retry_after_minutes,
    )
```

### 2.5 Sửa 3 Tasks

**Pattern chung** (áp dụng cho `task_transcribe_audio` và `task_translate_transcript`):

```python
import google.api_core.exceptions

# config.model là model name từ TranscriptConfig (e.g. 'gemini-2.5-flash')
client, key_pk, usage_pk = _get_gemini_client(config.model)
try:
    response = client.models.generate_content(
        model=config.model,
        contents=[...],
    )
except google.api_core.exceptions.ResourceExhausted:
    _mark_key_model_exhausted(usage_pk)
    client, key_pk, usage_pk = _get_gemini_client(config.model)  # retry với cặp khác
    response = client.models.generate_content(
        model=config.model,
        contents=[...],
    )
```

**`task_upload_to_gemini`** — model name là constant vì File API không phụ thuộc generate model:

```python
GEMINI_FILE_API_MODEL = 'gemini-file-api'  # synthetic key để track file upload quota riêng

client, key_pk, usage_pk = _get_gemini_client(GEMINI_FILE_API_MODEL)
try:
    uploaded = client.files.upload(...)
except google.api_core.exceptions.ResourceExhausted:
    _mark_key_model_exhausted(usage_pk)
    client, key_pk, usage_pk = _get_gemini_client(GEMINI_FILE_API_MODEL)
    uploaded = client.files.upload(...)
```

Chỉ retry **1 lần** — nếu cặp thứ 2 cũng exhausted, `_get_gemini_client()` raise `RuntimeError` → `except Exception` ở task catch và `_fail_step()` như bình thường.

### 2.6 Admin

**`TranscriptApiKeyAdmin`** với inline usage table:

```python
class TranscriptApiKeyUsageInline(admin.TabularInline):
    model  = TranscriptApiKeyUsage
    extra  = 0
    fields = ['model_name', 'rpd_count', 'rpd_reset_at', 'usage_status']
    readonly_fields = ['model_name', 'rpd_count', 'rpd_reset_at', 'usage_status']

    @admin.display(description='Status')
    def usage_status(self, obj):
        from django.utils import timezone
        if obj.exhausted_until and obj.exhausted_until > timezone.now():
            until = obj.exhausted_until.strftime('%d/%m %H:%M')
            return format_html('<span style="color:#e53935">⛔ Until {}</span>', until)
        rpd_limit = settings.GEMINI_RPD_LIMIT
        if obj.rpd_count >= rpd_limit:
            return format_html('<span style="color:#f90">⚠ RPD limit ({}/{})</span>',
                               obj.rpd_count, rpd_limit)
        return format_html('<span style="color:#4caf50">✓ {}/{}</span>',
                           obj.rpd_count, rpd_limit)


@admin.register(TranscriptApiKey)
class TranscriptApiKeyAdmin(admin.ModelAdmin):
    list_display  = ['label', 'is_active', 'request_count', 'last_used_at', 'key_status']
    list_editable = ['is_active']
    search_fields = ['label']
    ordering      = ['label']
    inlines       = [TranscriptApiKeyUsageInline]
    actions       = ['action_reset_all_exhausted']

    readonly_fields = ['api_key_masked', 'request_count', 'last_used_at', 'created_at']
    fields = ['label', 'api_key', 'api_key_masked', 'is_active',
              'request_count', 'last_used_at', 'created_at']

    @admin.display(description='Status')
    def key_status(self, obj):
        if not obj.is_active:
            return format_html('<span style="color:#aaa">— Disabled</span>')
        return format_html('<span style="color:#4caf50;font-weight:bold">✓ Active</span>')

    @admin.display(description='API Key (masked)')
    def api_key_masked(self, obj):
        if not obj.api_key:
            return '—'
        return f'****{obj.api_key[-8:]}'

    @admin.action(description='Reset all exhausted_until for selected keys')
    def action_reset_all_exhausted(self, request, queryset):
        from .models import TranscriptApiKeyUsage
        updated = TranscriptApiKeyUsage.objects.filter(
            api_key__in=queryset
        ).update(exhausted_until=None)
        self.message_user(request, f'{updated} usage row(s) quota reset.')
```

**Admin list view trông như sau:**

```
TranscriptApiKey list:
  key-phuc-personal | Active | 42 reqs | last: 10:32 | ✓ Active
  key-work          | Active |  8 reqs | last: 09:15 | ✓ Active

TranscriptApiKey detail (inline usages):
  model_name          | rpd_count | rpd_reset_at    | Status
  gemini-2.5-flash    | 18/18     | 01/07 00:00 UTC | ⛔ Until 23:59
  gemini-3.5-flash    |  4/18     | 01/07 00:00 UTC | ✓ 4/18
  gemini-file-api     |  3/18     | 01/07 00:00 UTC | ✓ 3/18
```

---

## 3. Files Cần Sửa/Tạo

| File | Thay đổi |
|---|---|
| `src/backend/requirements.txt` | Thêm `django-fernet-fields` |
| `src/backend/transcripts/models.py` | Thêm 2 models: `TranscriptApiKey`, `TranscriptApiKeyUsage` |
| `src/backend/transcripts/tasks.py` | Thêm constant `GEMINI_FILE_API_MODEL`, 3 helpers; sửa 3 tasks |
| `src/backend/transcripts/admin.py` | Thêm `TranscriptApiKeyUsageInline`, `TranscriptApiKeyAdmin` |
| `src/backend/config/settings.py` | Thêm `GEMINI_RPD_LIMIT` |
| `src/backend/transcripts/migrations/000X_...py` | Migration tự động từ `makemigrations` |

### Onboarding sau deploy

Sau khi deploy, admin cần thực hiện **1 lần**:

1. Vào `/admin/transcripts/transcriptapikey/` → **Add API Key**
2. Label: `key-main` (hoặc tên gợi nhớ), paste giá trị `GEMINI_API_KEY` từ `.env`
3. Lưu → hệ thống tự tạo usage rows cho các model khi task chạy lần đầu
4. Tùy chọn: xóa hoặc giữ `GEMINI_API_KEY` trong `.env` (env key vẫn là fallback nếu DB trống)

Để add thêm key mới: lặp lại bước 1–3 với key khác.

---

## 4. Trade-off & Lưu Ý

| | |
|---|---|
| **Race condition nhỏ** | 2 Celery workers chọn cùng usage row. Dùng `update()` + `F()` — đủ tốt cho free tier (RPD=20, không cần `SELECT FOR UPDATE`). |
| **RPD buffer** | `GEMINI_RPD_LIMIT=18` thay vì 20 — buffer 2 requests phòng race condition. |
| **`exhausted_until` = 60 phút** | Safe buffer cho cả RPM và RPD partial window. Admin reset thủ công được. |
| **RPD reset midnight UTC** | Gemini free tier reset theo UTC. `_next_midnight_utc()` tính đúng. Nếu task chạy lúc 23:59 UTC, row mới tạo sẽ reset sau ~1 phút — không broken vì `rpd_count` của row mới luôn = 0. |
| **`GEMINI_FILE_API_MODEL`** | File upload API có quota riêng — dùng key synthetic `'gemini-file-api'` để track tách biệt với generate API. |
| **Encrypted field + SECRET_KEY** | Nếu `SECRET_KEY` thay đổi, key đã encrypt không đọc được — dùng `FERNET_KEYS = [new, old]` để rotate an toàn. |
| **Fallback env key** | `GEMINI_API_KEY` trong `.env` vẫn hoạt động — không cần migrate ngay. |

---

## 5. Test Plan

1. **Add 2 key vào DB** → pipeline chạy → `rpd_count` tăng theo đúng model, `request_count` tăng.
2. **LRU hoạt động:** Key ít dùng gần đây được chọn trước.
3. **Simulate 429 per model:** Set `exhausted_until` cho Flash 2.5 của key A → pipeline tự dùng Flash 2.5 của key B hoặc Flash 3.5 của key A.
4. **RPD limit:** Set `rpd_count=18` cho Flash 2.5 key A → pipeline tự skip, dùng key B.
5. **RPD auto-reset:** Set `rpd_reset_at` = quá khứ → lần gọi tiếp theo reset về 0.
6. **Reset exhausted:** Dùng action admin → `exhausted_until` = null cho tất cả usages của key đó.
7. **No key available:** Disable tất cả key + `rpd_count` đầy + xóa env key → task `FAILED` với error message rõ ràng.
8. **Masked display:** `api_key_masked` chỉ hiện `****xxxx` (8 ký tự cuối).
9. **Encrypted at rest:** Kiểm tra DB trực tiếp (`psql`) → `api_key` column là ciphertext.
10. **Inline usages:** Admin detail page hiển thị đúng status từng (key, model).
11. **File API quota tách biệt:** Upload 3 file → `gemini-file-api` `rpd_count=3`; `gemini-2.5-flash` `rpd_count` không thay đổi.
