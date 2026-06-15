# Feature 38 — Local Audio Upload for Transcript Pipeline

## Document Information

- **Feature**: 38 — Local Audio Upload
- **Version**: 1.2
- **Created**: 2026-06-15
- **Status**: ✅ Approved (v1.2) — PO Review Round 3
- **Author**: Technical Leader

---

## 1. Overview

`transcripts` app là **công cụ nội bộ cho admin** — hoàn toàn độc lập với hệ thống học tập (VideoLesson, BookChapter, TrainingSet). Mục đích duy nhất: giúp admin tạo tài liệu nghiên cứu (transcript + bản dịch tiếng Việt) từ audio bài giảng tiếng Trung.

Hiện tại pipeline chỉ nhận **YouTube URL** làm input (Step 1 dùng yt-dlp download MP3). Feature này thêm **source type thứ hai**: admin upload file audio trực tiếp (MP3/WAV/M4A). Pipeline từ Step 2a trở đi giữ nguyên hoàn toàn.

### So sánh 2 luồng

| | YouTube URL (hiện tại) | Local Audio Upload (mới) |
|---|---|---|
| Input | `youtube_url` | `uploaded_audio` (FileField) |
| Step 1 | yt-dlp download → `audio_file` | **Skip (SKIPPED)** — file đã có sẵn, copy path vào `audio_file` |
| Step 2a → Step 3 | Giữ nguyên | Giữ nguyên |
| Admin form | Nhập URL text | Chọn file upload |
| Output | Transcript + bản dịch lưu DB, admin tự dùng | Như nhau |

---

## 2. Phân tích

### 2.1 Thay đổi model tối thiểu

`TranscriptJob` cần phân biệt 2 loại source. Thêm:
1. `source_type` — enum `YOUTUBE` / `LOCAL_AUDIO`
2. `uploaded_audio` — FileField lưu file do admin upload (nullable, chỉ dùng khi `source_type=LOCAL_AUDIO`)

`youtube_url` hiện là `URLField(max_length=500)` không có `blank=True` — cần cho phép blank khi source là LOCAL_AUDIO.

### 2.2 Pipeline logic

Khi tạo job `LOCAL_AUDIO`:
- `step1_status = SKIPPED` ngay lập tức (không queue `task_download_audio`)
- `audio_file` = path của `uploaded_audio` (relative to `MEDIA_ROOT`)
- Pipeline bắt đầu từ `task_upload_to_gemini`

Không cần task mới. Chỉ thay đổi `save_model` trong admin.

### 2.3 File storage

File upload lưu tại: `transcripts/<job_pk>/audio.<ext>` (giống convention hiện tại của yt-dlp).

**Vấn đề**: Django `FileField` cần `pk` để build path, nhưng `pk` chỉ có sau `save()` lần đầu. Giải pháp: upload vào temp path `transcripts/uploads/<uuid>/audio.<ext>` (UUID subfolder để tránh collision khi nhiều admin upload đồng thời), sau đó `save_model` override move file sang `transcripts/<pk>/audio.<ext>`.

`upload_to` dùng callable với UUID:

```python
def _upload_to_temp(instance, filename):
    import uuid as _uuid
    ext = os.path.splitext(filename)[1].lower() or '.mp3'
    return f'transcripts/uploads/{_uuid.uuid4()}/audio{ext}'
```

Tên file gốc (`filename`) được lưu lại để dùng làm fallback `title` trước khi file bị move.

---

## 3. Database

### 3.1 Thay đổi `TranscriptJob`

```python
# src/backend/transcripts/models.py

class SourceType(models.TextChoices):
    YOUTUBE     = 'YOUTUBE',     'YouTube URL'
    LOCAL_AUDIO = 'LOCAL_AUDIO', 'Local Audio Upload'


class TranscriptJob(models.Model):
    # --- Source type (mới) ---
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.YOUTUBE,
    )

    # --- Input: YouTube ---
    youtube_url  = models.URLField(max_length=500, blank=True, default='')  # hiện tại KHÔNG có blank=True — migration 0010 cần AlterField
    playlist_url = models.URLField(max_length=500, blank=True, default='')

    # --- Input: Local Audio Upload (mới) ---
    uploaded_audio = models.FileField(
        upload_to=_upload_to_temp,  # callable — UUID subfolder tránh collision
        blank=True, null=True,
        help_text='Upload MP3/WAV/M4A. Chỉ dùng khi Source Type = LOCAL_AUDIO.',
    )

    # ... tất cả fields còn lại giữ nguyên
```

> **Lưu ý**: `youtube_url` trong code hiện tại là `URLField(max_length=500)` — **không có** `blank=True`. Migration `0010` **bắt buộc** phải có `AlterField` thêm `blank=True, default=''` (đã có trong §3.2 bên dưới).

### 3.2 Migration `0010_source_type_and_uploaded_audio.py`

> **Lưu ý**: Migration hiện tại dừng ở `0009`. Migration mới là `0010`.

```python
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('transcripts', '0009_update_transcript_prompt_v3'),
    ]
    operations = [
        migrations.AddField(
            model_name='transcriptjob',
            name='source_type',
            field=models.CharField(
                choices=[('YOUTUBE', 'YouTube URL'), ('LOCAL_AUDIO', 'Local Audio Upload')],
                default='YOUTUBE',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='transcriptjob',
            name='uploaded_audio',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to='transcripts/uploads/',  # callable resolved at runtime
                help_text='Upload MP3/WAV/M4A. Chỉ dùng khi Source Type = LOCAL_AUDIO.',
            ),
        ),
        migrations.AlterField(
            model_name='transcriptjob',
            name='youtube_url',
            field=models.URLField(blank=True, default='', max_length=500),
        ),
    ]
```

---

## 4. Backend — Admin

Toàn bộ thay đổi nằm trong `admin.py`. Không cần task mới, không cần view mới.

### 4.1 Form với JS ẩn/hiện field

Admin form cần ẩn `youtube_url` khi chọn `LOCAL_AUDIO` và ẩn `uploaded_audio` khi chọn `YOUTUBE`. Dùng JavaScript đơn giản inject qua `Media` class.

```python
# src/backend/transcripts/admin.py

class TranscriptJobForm(forms.ModelForm):
    class Meta:
        model = TranscriptJob
        fields = '__all__'

    class Media:
        js = ('admin/transcripts/source_type_toggle.js',)
```

File JS tạo tại `src/backend/static/admin/transcripts/source_type_toggle.js`:

```javascript
// Ẩn/hiện youtube_url / uploaded_audio dựa trên source_type
(function () {
  function toggle() {
    var sel = document.getElementById('id_source_type');
    if (!sel) return;
    var isLocal = sel.value === 'LOCAL_AUDIO';
    var ytRow  = document.querySelector('.field-youtube_url');
    var upRow  = document.querySelector('.field-uploaded_audio');
    if (ytRow)  ytRow.style.display  = isLocal ? 'none' : '';
    if (upRow)  upRow.style.display  = isLocal ? '' : 'none';
  }
  document.addEventListener('DOMContentLoaded', function () {
    var sel = document.getElementById('id_source_type');
    if (sel) { sel.addEventListener('change', toggle); toggle(); }
  });
})();
```

### 4.2 `save_model` override — xử lý LOCAL_AUDIO

```python
# src/backend/transcripts/admin.py

import os, shutil
from django.conf import settings

def save_model(self, request, obj, form, change):
    is_new = obj.pk is None
    super().save_model(request, obj, form, change)  # pk được gán sau đây

    if is_new:
        if obj.source_type == 'LOCAL_AUDIO':
            self._setup_local_audio_job(request, obj)
        else:
            # Luồng YouTube hiện tại — giữ nguyên
            pipeline = (
                task_download_audio.si(obj.pk)
                | task_upload_to_gemini.si(obj.pk)
                | task_transcribe_audio.si(obj.pk)
                | task_translate_transcript.si(obj.pk)
            )
            pipeline.delay()
            messages.info(request, f'Job {obj.pk}: Full pipeline queued.')

def _setup_local_audio_job(self, request, obj):
    """
    Khi source_type=LOCAL_AUDIO:
    1. Move uploaded file từ uploads/<uuid>/ → transcripts/<pk>/audio.<ext>
    2. Set audio_file path, step1_status=SKIPPED
    3. Queue pipeline từ step 2a
    """
    from .models import StepStatus
    import django.utils.timezone as tz

    if not obj.uploaded_audio:
        messages.error(request, f'Job {obj.pk}: No audio file uploaded.')
        return

    # Lấy tên file gốc TRƯỚC khi move (dùng làm title fallback)
    original_name = os.path.basename(obj.uploaded_audio.name)

    # Build destination path
    src_path  = obj.uploaded_audio.path
    ext       = os.path.splitext(original_name)[1].lower() or '.mp3'
    dest_dir  = os.path.join(settings.MEDIA_ROOT, 'transcripts', str(obj.pk))
    dest_name = f'audio{ext}'
    dest_path = os.path.join(dest_dir, dest_name)

    # Guard: kiểm tra file tồn tại trước khi move (tránh Django rename collision)
    if not os.path.exists(src_path):
        from .models import StepStatus as _SS
        obj.step1_status = _SS.FAILED
        obj.step1_error  = f'Uploaded file not found at path: {src_path}'
        obj.save(update_fields=['step1_status', 'step1_error'])
        messages.error(request, f'Job {obj.pk}: Uploaded file not found — job marked FAILED.')
        return

    os.makedirs(dest_dir, exist_ok=True)

    # Move với error handling — disk full, permission error, etc.
    try:
        shutil.move(src_path, dest_path)
    except Exception as exc:
        obj.step1_status = StepStatus.FAILED
        obj.step1_error  = f'File move failed: {exc}'
        obj.save(update_fields=['step1_status', 'step1_error'])
        messages.error(request, f'Job {obj.pk}: File move failed — {exc}')
        return

    # Update job fields
    relative_path = os.path.join('transcripts', str(obj.pk), dest_name)
    obj.audio_file        = relative_path
    obj.step1_status      = StepStatus.SKIPPED
    obj.step1_finished_at = tz.now()
    if not obj.title:
        # Dùng tên file gốc (original_name), không phải dest_name
        obj.title = os.path.splitext(original_name)[0][:500]
    obj.uploaded_audio = None  # clear FileField — file đã move sang audio_file
    obj.save(update_fields=[
        'audio_file', 'step1_status', 'step1_finished_at', 'title', 'uploaded_audio',
    ])

    # Queue pipeline từ step 2a (step 1 đã SKIPPED)
    pipeline = (
        task_upload_to_gemini.si(obj.pk)
        | task_transcribe_audio.si(obj.pk)
        | task_translate_transcript.si(obj.pk)
    )
    pipeline.delay()
    messages.info(request, f'Job {obj.pk}: Audio uploaded, pipeline from Step 2a queued.')
```

### 4.3 Fieldsets — tách YouTube / Local Audio

```python
fieldsets = [
    ('Job Info', {
        'fields': ['uuid', 'source_type', 'title'],
    }),
    ('Source: YouTube', {
        'fields': ['youtube_url', 'playlist_url'],
        'description': 'Điền khi Source Type = YOUTUBE',
    }),
    ('Source: Local Audio', {
        'fields': ['uploaded_audio'],
        'description': 'Upload file khi Source Type = LOCAL_AUDIO',
    }),
    ('Re-run Controls', {
        'fields': ['rerun_buttons'],
    }),
    # ... fieldsets còn lại giữ nguyên
]
```

### 4.4 `list_display` và `list_filter` — thêm source info

```python
list_display = [
    'id', 'title_short', 'source_badge', 'source_url_short',
    'step1_badge', 'step2a_badge', 'step2b_badge', 'step3_badge',
    'overall_badge', 'created_at',
]

list_filter = ['step1_status', 'step2b_status', 'step3_status', 'source_type']  # thêm source_type

@admin.display(description='Source')
def source_badge(self, obj):
    if obj.source_type == 'LOCAL_AUDIO':
        return format_html('<span style="color:#2196f3;font-weight:bold">📁 Local</span>')
    return format_html('<span style="color:#ff9800;font-weight:bold">▶ YouTube</span>')

@admin.display(description='URL / File')
def source_url_short(self, obj):
    # Thay thế youtube_url_short — hiển thị đúng cho cả 2 source type
    if obj.source_type == 'LOCAL_AUDIO':
        return format_html('<span style="color:#aaa">📁 local audio</span>')
    if obj.youtube_url:
        return format_html(
            '<a href="{}" target="_blank">{}</a>',
            obj.youtube_url, obj.youtube_url[:45],
        )
    return '—'
```

### 4.5 Validation trong form

Thêm `clean()` vào `TranscriptJobForm` để validate:

```python
class TranscriptJobForm(forms.ModelForm):
    # ...

    def clean(self):
        cleaned = super().clean()
        src = cleaned.get('source_type')
        if src == 'YOUTUBE' and not cleaned.get('youtube_url'):
            self.add_error('youtube_url', 'YouTube URL là bắt buộc khi Source Type = YOUTUBE.')
        if src == 'LOCAL_AUDIO' and not cleaned.get('uploaded_audio'):
            # Cho phép edit job đã tạo (uploaded_audio đã clear sau move)
            # Chỉ validate khi tạo mới (pk chưa có)
            if not self.instance.pk:
                self.add_error('uploaded_audio', 'Audio file là bắt buộc khi Source Type = LOCAL_AUDIO.')
        return cleaned
```

### 4.6 Sửa guard trong `task_upload_to_gemini` — `tasks.py`

Guard hiện tại chỉ chấp nhận `step1_status == DONE`, sẽ block LOCAL_AUDIO job (step1 = SKIPPED):

```python
# TRƯỚC (tasks.py hiện tại)
if job.step1_status != StepStatus.DONE or not job.audio_file:
    logger.error('task_upload_to_gemini: job %s step1 not done', job_id)
    return

# SAU — chấp nhận cả SKIPPED (LOCAL_AUDIO flow)
if job.step1_status not in (StepStatus.DONE, StepStatus.SKIPPED) or not job.audio_file:
    logger.error('task_upload_to_gemini: job %s step1 not done/skipped', job_id)
    return
```

Đây là thay đổi 1 dòng duy nhất trong `tasks.py`.

### 4.7 Sửa `audio_player` — MIME type theo extension

`audio_player` hiện tại hardcode `type="audio/mpeg"`. Với LOCAL_AUDIO có thể là WAV/M4A, cần detect từ extension:

```python
@admin.display(description='Audio Preview')
def audio_player(self, obj):
    _MIME_MAP = {'.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4'}

    def _audio_tag(url, audio_file=''):
        ext = os.path.splitext(audio_file)[1].lower() if audio_file else '.mp3'
        mime = _MIME_MAP.get(ext, 'audio/mpeg')
        return format_html(
            '<audio controls style="width:100%">'
            '<source src="{}" type="{}">'
            '</audio>', url, mime,
        )

    mode = obj.audio_serve_mode
    if mode == 'local':
        url = f'{settings.MEDIA_URL}{obj.audio_file}'
        return _audio_tag(url, obj.audio_file)
    if mode == 'gemini' and obj.audio_file:
        url = f'{settings.MEDIA_URL}{obj.audio_file}'
        return _audio_tag(url, obj.audio_file)
    # ... fallback logic giữ nguyên
```

### 4.8 Ẩn Re-run Step 1 button cho LOCAL_AUDIO job

`rerun_buttons` hiện show 4 buttons cho mọi job. LOCAL_AUDIO không có `youtube_url` — Step 1 sẽ crash yt-dlp nếu bị trigger. Ẩn button Step 1 khi `source_type == LOCAL_AUDIO`:

```python
@admin.display(description='Re-run Controls')
def rerun_buttons(self, obj):
    if not obj.pk:
        return '(save job first)'
    base = f'/admin/transcripts/transcriptjob/{obj.pk}/rerun'
    buttons = ''
    if obj.source_type != 'LOCAL_AUDIO':
        buttons += f'<a class="button" href="{base}/step1/" style="margin:4px">▶ Step 1 (Download)</a>'
    buttons += (
        f'<a class="button" href="{base}/step2a/" style="margin:4px">▶ Step 2a (Upload)</a>'
        f'<a class="button" href="{base}/step2b/" style="margin:4px">▶ Step 2b (Transcribe)</a>'
        f'<a class="button" href="{base}/step3/" style="margin:4px">▶ Step 3 (Translate)</a>'
    )
    return format_html(buttons)
```

---

## 5. Cleanup khi xóa job

`_delete_audio_file` hiện tại xóa `obj.audio_file_path`. Logic này **tự động xử lý cả LOCAL_AUDIO** vì sau `_setup_local_audio_job`, file đã được move sang `transcripts/<pk>/audio.<ext>` và `audio_file` đã set — không cần thay đổi gì.

`uploaded_audio` đã được set về `None` sau khi move → không có gì thừa trong `transcripts/uploads/`.

---

## 6. Trade-offs & Lưu ý

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Storage upload temp | `transcripts/uploads/` → move sang `transcripts/<pk>/` | `pk` chưa có lúc upload, move sau `save()` |
| `uploaded_audio` clear sau move | Set `None` sau khi move | Tránh duplicate storage; `audio_file` là source of truth |
| JS toggle | Vanilla JS, không dùng framework | Admin Django context, không có build tool |
| `OneToOneField` chunk migration | Không liên quan F38 | F37 TranscriptChunk là feature riêng |
| Format audio hỗ trợ | MP3/WAV/M4A (Gemini File API hỗ trợ) | Không cần convert — Gemini nhận trực tiếp |

### Giới hạn file size

File MP3 thực tế < 100MB. Set trong `settings.py`:
```python
FILE_UPLOAD_MAX_MEMORY_SIZE = 5_242_880      # 5 MB — force Django stream ra disk temp (không hold in memory)
DATA_UPLOAD_MAX_MEMORY_SIZE = 104_857_600    # 100 MB — max request size
```
Và Nginx config: `client_max_body_size 100m`.

### MIME type validation

Thêm validate MIME type trong `TranscriptJobForm.clean()`:
```python
if src == 'LOCAL_AUDIO' and cleaned.get('uploaded_audio'):
    audio = cleaned['uploaded_audio']
    allowed = {'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a',
               'audio/x-m4a', 'video/mp4'}
    if hasattr(audio, 'content_type') and audio.content_type not in allowed:
        self.add_error('uploaded_audio', f'Định dạng không hỗ trợ: {audio.content_type}. Dùng MP3/WAV/M4A.')
```

---

## 7. Files cần tạo / sửa

| File | Action |
|---|---|
| `src/backend/transcripts/models.py` | Thêm `SourceType`, `_upload_to_temp`, `source_type`, `uploaded_audio`; sửa `youtube_url` thành `blank=True` |
| `src/backend/transcripts/migrations/0010_source_type_and_uploaded_audio.py` | Tạo mới |
| `src/backend/transcripts/tasks.py` | Sửa 1 dòng guard trong `task_upload_to_gemini` (§4.6) |
| `src/backend/transcripts/admin.py` | Thêm `TranscriptJobForm`, sửa `save_model`, `_setup_local_audio_job`, `audio_player`, `rerun_buttons`, `fieldsets`, `list_display`, `list_filter`, `source_badge`, `source_url_short` |
| `src/backend/static/admin/transcripts/source_type_toggle.js` | Tạo mới |
| `docker/.env.example` | Thêm `DATA_UPLOAD_MAX_MEMORY_SIZE` note |

**Thay đổi nhỏ:**
- `src/backend/transcripts/tasks.py` — sửa 1 dòng guard trong `task_upload_to_gemini` (xem §4.6)

**Không có thay đổi:**
- Frontend — không liên quan
- API endpoints — không liên quan

---

## 8. Implementation Checklist

- [ ] **38.1** Thêm `SourceType` TextChoices và `_upload_to_temp` callable vào `models.py`
- [ ] **38.2** Thêm `source_type` CharField và `uploaded_audio` FileField (dùng `_upload_to_temp`) vào `TranscriptJob`
- [ ] **38.3** Sửa `youtube_url` thành `blank=True, default=''` (nếu chưa có)
- [ ] **38.4** Tạo migration `0010_source_type_and_uploaded_audio.py`
- [ ] **38.5** Chạy `makemigrations` + `migrate`
- [ ] **38.6** Tạo `src/backend/static/admin/transcripts/source_type_toggle.js`
- [ ] **38.7** Viết `TranscriptJobForm` với `clean()` validation (youtube_url bắt buộc khi YOUTUBE; uploaded_audio khi LOCAL_AUDIO + tạo mới; MIME type check)
- [ ] **38.8** Thêm `_setup_local_audio_job()` vào `TranscriptJobAdmin`: guard `os.path.exists`, try/except `shutil.move`, title fallback từ `original_name`, clear `uploaded_audio` sau move
- [ ] **38.9** Sửa `save_model` để branch YOUTUBE vs LOCAL_AUDIO
- [ ] **38.10** Sửa `fieldsets` — thêm fieldset "Source: YouTube" và "Source: Local Audio"
- [ ] **38.11** Thêm `source_badge` + `source_url_short` vào `list_display`; thêm `source_type` vào `list_filter`
- [ ] **38.12** Set `FILE_UPLOAD_MAX_MEMORY_SIZE=5MB` + `DATA_UPLOAD_MAX_MEMORY_SIZE=100MB` trong `settings.py`; thêm `client_max_body_size 100m` vào Nginx config
- [ ] **38.13** Test: upload file MP3 → verify step1=SKIPPED, audio_file set đúng, title = tên file gốc, pipeline 2a→3 chạy thành công
- [ ] **38.14** Test: tạo job YOUTUBE → verify pipeline 4 steps vẫn hoạt động bình thường (không regression)
- [ ] **38.15** Test: submit form YOUTUBE không có URL → verify validation error
- [ ] **38.16** Test: submit form LOCAL_AUDIO không có file → verify validation error
- [ ] **38.17** Sửa guard trong `task_upload_to_gemini` (`tasks.py`): `step1_status not in (DONE, SKIPPED)` thay vì `!= DONE`
- [ ] **38.18** Test: LOCAL_AUDIO job sau khi `gemini_file_valid=False` (>48h) → re-run step2a → verify upload lại + pipeline 2b→3 chạy thành công
- [ ] **38.19** Sửa `audio_player` trong `admin.py`: detect MIME type từ extension của `audio_file` (§4.7)
- [ ] **38.20** Sửa `rerun_buttons` trong `admin.py`: ẩn button "Step 1 (Download)" khi `source_type == LOCAL_AUDIO` (§4.8)
- [ ] **38.21** Sửa bulk action `action_rerun_download` trong `admin.py`: skip LOCAL_AUDIO jobs, hiển thị warning message nếu có job bị skip:
  ```python
  def action_rerun_download(self, request, queryset):
      skipped = queryset.filter(source_type='LOCAL_AUDIO').count()
      for job in queryset.exclude(source_type='LOCAL_AUDIO'):
          task_download_audio.delay(job.pk)
      if skipped:
          messages.warning(request, f'{skipped} LOCAL_AUDIO job(s) skipped — Step 1 not applicable.')
  ```

---

*End of Feature 38 Design Document v1.2*
