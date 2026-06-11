# Feature 33 — YouTube Transcript Pipeline

## Document Information

- **Feature**: 33 — YouTube Transcript Pipeline (Admin Tool)
- **Version**: 2.2
- **Created**: 2026-06-11
- **Status**: Draft — Pending PO Review
- **Author**: Technical Leader

---

## 1. Overview

Admin tool độc lập cho phép admin nhập YouTube URL (single video hoặc playlist) và thực hiện pipeline 4 bước:

1. **Step 1** — Download MP3 từ YouTube (yt-dlp + FFmpeg), lưu `/media/transcripts/<job_id>/audio.mp3`
2. **Step 2a** — Upload MP3 lên Gemini File API, lưu `gemini_file_uri` (nhanh, tách riêng)
3. **Step 2b** — Transcribe audio tiếng Trung → text có timestamp `[HH:MM:SS]` (blocking, Celery worker chờ)
4. **Step 3** — Dịch raw transcript tiếng Trung → tiếng Việt chuyên ngành Kỳ Môn/Phong Thủy (Gemini)

Feature này **hoàn toàn độc lập** — không gắn với `VideoLesson`, `BookChapter`, hay bất kỳ content model nào. Output là transcript text để admin sử dụng tự do.

### Audio file lifecycle

| Thời gian kể từ lúc tạo job | Hành vi audio preview |
|---|---|
| 0 → 48h | Stream từ Gemini File URI (file còn hiệu lực trên Gemini) |
| 48h → 15 ngày | Stream từ `/media/transcripts/<job_id>/audio.mp3` (local) |
| > 15 ngày | File MP3 bị xóa tự động (Celery periodic task), audio preview ẩn |

---

## 2. App Structure

### Lý do tạo app mới `transcripts`

| Tiêu chí | Đặt trong `videos` | Tạo app mới `transcripts` |
|---|---|---|
| Domain boundary | Videos = nội dung khóa học, transcript = admin tool | Rõ ràng, không lẫn lộn |
| Model coupling | `TranscriptJob` không có FK tới `VideoLesson` | Không có circular dependency |
| Admin registration | Phải đặt cùng `VideoAdmin` | Admin class riêng, dễ maintain |
| Mở rộng sau | Khó tách sau khi gắn | Có thể thêm source khác (upload file, v.v.) |

**Kết luận**: Tạo app mới `transcripts`.

### Cấu trúc file

```
src/backend/transcripts/
├── __init__.py
├── apps.py
├── models.py
├── admin.py
├── tasks.py
└── migrations/
    ├── 0001_initial.py
    └── 0002_transcriptconfig_default_data.py
```

---

## 3. Model `TranscriptConfig` + `TranscriptJob`

### 3.1 `TranscriptConfig` — Singleton per type

```python
# transcripts/models.py

class GeminiModel(models.TextChoices):
    FLASH_25 = 'gemini-2.5-flash', 'Gemini 2.5 Flash'
    FLASH_20 = 'gemini-2.0-flash', 'Gemini 2.0 Flash'
    PRO_25   = 'gemini-2.5-pro',   'Gemini 2.5 Pro'


class ConfigType(models.TextChoices):
    TRANSCRIPT_PROMPT = 'TRANSCRIPT_PROMPT', 'Transcript Prompt (Step 2b)'
    TRANSLATE_PROMPT  = 'TRANSLATE_PROMPT',  'Translate Prompt (Step 3)'


class TranscriptConfig(models.Model):
    type  = models.CharField(max_length=50, choices=ConfigType.choices, unique=True)
    value = models.TextField(help_text='System prompt gửi lên Gemini')
    model = models.CharField(
        max_length=100, choices=GeminiModel.choices, default=GeminiModel.FLASH_25
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Transcript Config'
        verbose_name_plural = 'Transcript Configs'

    def __str__(self):
        return f'{self.type} ({self.model})'

    @classmethod
    def get(cls, config_type: str) -> 'TranscriptConfig':
        """Shortcut để lấy config theo type, raise nếu không tìm thấy."""
        return cls.objects.get(type=config_type)
```

### 3.2 Data migration — 2 default rows

```python
# transcripts/migrations/0002_transcriptconfig_default_data.py

from django.db import migrations

TRANSCRIPT_PROMPT_DEFAULT = """
Bạn là chuyên gia nhận dạng giọng nói tiếng Trung Quốc (Mandarin).
Nhiệm vụ: Transcribe toàn bộ nội dung audio thành văn bản tiếng Trung, kèm timestamp theo định dạng [HH:MM:SS].

Yêu cầu:
- Mỗi đoạn transcript bắt đầu bằng timestamp [HH:MM:SS] trên dòng riêng
- Giữ nguyên các thuật ngữ Hán Nôm và thuật ngữ chuyên ngành
- Không dịch, không giải thích — chỉ transcribe
- Không bỏ sót nội dung dù người nói nói nhanh
- Nếu không nghe rõ một từ, dùng [...] để đánh dấu

Ví dụ output:
[00:00:05]
今天我们来讲奇门遁甲的基础知识。

[00:01:23]
首先我们要了解八门，分别是休门、生门、伤门...
""".strip()

TRANSLATE_PROMPT_DEFAULT = """
**Đóng vai:** Bạn là một chuyên gia dịch thuật tiếng Trung cao cấp, đồng thời có hiểu biết sâu rộng về các bộ môn Huyền học, Phong thủy, Mệnh lý và đặc biệt là Kỳ Môn Độn Giáp.

**Nhiệm vụ:** Dịch chi tiết nội dung transcript (phụ đề) của video từ tiếng Trung sang tiếng Việt một cách chính xác, tự nhiên và dễ hiểu nhất.

**Yêu cầu cụ thể về nội dung và định dạng:**

1. **Câu mở đầu:** Luôn bắt đầu bằng câu: *"Dưới đây là bản dịch chi tiết nội dung của video về [Tóm tắt tên chủ đề của video] được trình bày theo dạng phụ đề kèm mốc thời gian:"*

2. **Định dạng mốc thời gian:** Giữ lại các mốc thời gian và in đậm chúng ở đầu mỗi đoạn. Định dạng chuẩn: **[00:00:00]**.

3. **Xử lý câu từ (Gộp câu):** Transcript gốc thường bị cắt vụn thành các dòng ngắn không trọn nghĩa. ĐỪNG dịch thô từng dòng lẻ tẻ. Hãy đọc hiểu ngữ cảnh, gộp các câu ngắn lại với nhau để tạo thành các đoạn văn, câu văn hoàn chỉnh, súc tích và liền mạch về mặt ý nghĩa.

4. **Dịch chuẩn thuật ngữ:** Đảm bảo dịch chính xác các thuật ngữ chuyên ngành (ví dụ: Bát Môn, Cửu Tinh, Bát Thần, các cách cục như Ất gia Canh, Không Vong, Phục Ngâm...). Không dịch word-by-word (word-for-word) các từ này.

5. **Thêm chú thích làm rõ:** Nếu diễn giả sử dụng tiếng lóng, từ địa phương, hoặc các khái niệm trừu tượng, hãy dịch thoáng ý và có thể thêm chú thích ngắn gọn trong ngoặc đơn () để người đọc dễ hình dung.

6. **Giọng văn:** Giữ nguyên giọng điệu giảng dạy của một người Thầy (xưng Thầy - gọi các bạn/mọi người/học viên), truyền đạt kiến thức mạch lạc, chuyên nghiệp nhưng vẫn gần gũi.

Dưới đây là dữ liệu transcript cần dịch:
""".strip()


def create_default_configs(apps, schema_editor):
    TranscriptConfig = apps.get_model('transcripts', 'TranscriptConfig')
    TranscriptConfig.objects.get_or_create(
        type='TRANSCRIPT_PROMPT',
        defaults={
            'value': TRANSCRIPT_PROMPT_DEFAULT,
            'model': 'gemini-2.5-flash',
        },
    )
    TranscriptConfig.objects.get_or_create(
        type='TRANSLATE_PROMPT',
        defaults={
            'value': TRANSLATE_PROMPT_DEFAULT,
            'model': 'gemini-2.5-flash',
        },
    )


def delete_default_configs(apps, schema_editor):
    TranscriptConfig = apps.get_model('transcripts', 'TranscriptConfig')
    TranscriptConfig.objects.filter(
        type__in=['TRANSCRIPT_PROMPT', 'TRANSLATE_PROMPT']
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('transcripts', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(create_default_configs, delete_default_configs),
    ]
```

### 3.3 Cách tasks đọc config

```python
# Trong task_transcribe_audio và task_translate_transcript

from .models import TranscriptConfig, ConfigType

config = TranscriptConfig.get(ConfigType.TRANSCRIPT_PROMPT)
prompt = config.value
model  = config.model  # enum — không cho admin tự gõ

# Per-job không có gemini_model field nữa — model hoàn toàn từ TranscriptConfig
```

---

## 4. Model `TranscriptJob`

### Schema đầy đủ

```python
# transcripts/models.py

import uuid
from django.db import models


class StepStatus(models.TextChoices):
    PENDING      = 'PENDING',      'Pending'
    PROCESSING   = 'PROCESSING',   'Processing'   # step 1 download
    UPLOADING    = 'UPLOADING',    'Uploading'    # step 2a upload to Gemini
    TRANSCRIBING = 'TRANSCRIBING', 'Transcribing' # step 2b generate transcript
    TRANSLATING  = 'TRANSLATING',  'Translating'  # step 3 translate
    DONE         = 'DONE',         'Done'
    FAILED       = 'FAILED',       'Failed'
    SKIPPED      = 'SKIPPED',      'Skipped'


class TranscriptJob(models.Model):
    # --- Identity ---
    id   = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    # --- Input ---
    youtube_url    = models.URLField(max_length=500)
    playlist_url   = models.URLField(max_length=500, blank=True, default='')  # source playlist nếu có
    title          = models.CharField(max_length=500, blank=True, default='')

    # --- Step 1: Download ---
    audio_file   = models.CharField(max_length=500, blank=True, default='')  # relative path dưới MEDIA_ROOT
    step1_status = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step1_error  = models.TextField(blank=True, default='')

    # --- Step 2a: Upload to Gemini File API ---
    gemini_file_uri    = models.CharField(max_length=500, blank=True, default='')  # file URI từ Gemini
    gemini_file_name   = models.CharField(max_length=200, blank=True, default='')  # Gemini file name (để delete/get)
    gemini_uploaded_at = models.DateTimeField(null=True, blank=True)               # để tính 48h expiry
    step2a_status      = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step2a_error       = models.TextField(blank=True, default='')

    # --- Step 2b: Transcribe (Chinese) ---
    raw_transcript = models.TextField(blank=True, default='')  # Chinese + [HH:MM:SS] timestamps
    step2b_status  = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step2b_error   = models.TextField(blank=True, default='')

    # --- Step 3: Translate (Vietnamese) ---
    translated_transcript = models.TextField(blank=True, default='')
    step3_status          = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step3_error           = models.TextField(blank=True, default='')

    # --- Timestamps ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Transcript Job'
        verbose_name_plural = 'Transcript Jobs'

    def __str__(self):
        title = self.title or self.youtube_url
        return f'[{self.id}] {title[:60]}'

    @property
    def overall_status(self) -> str:
        statuses = [self.step1_status, self.step2a_status, self.step2b_status, self.step3_status]
        if any(s == StepStatus.FAILED for s in statuses):
            return 'FAILED'
        if all(s in (StepStatus.DONE, StepStatus.SKIPPED) for s in statuses):
            return 'DONE'
        if any(s in (StepStatus.PROCESSING, StepStatus.UPLOADING, StepStatus.TRANSCRIBING, StepStatus.TRANSLATING) for s in statuses):
            return 'PROCESSING'
        return 'PENDING'

    @property
    def audio_file_path(self) -> str | None:
        if not self.audio_file:
            return None
        from django.conf import settings
        import os
        return os.path.join(settings.MEDIA_ROOT, self.audio_file)

    @property
    def gemini_file_valid(self) -> bool:
        """True nếu Gemini file còn trong 48h kể từ lúc upload."""
        if not self.gemini_uploaded_at or not self.gemini_file_uri:
            return False
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() < self.gemini_uploaded_at + timedelta(hours=48)

    @property
    def audio_serve_mode(self) -> str:
        """
        Trả về cách serve audio preview:
        - 'gemini'  : dùng gemini_file_uri  (< 48h)
        - 'local'   : dùng /media/ local    (48h – 15 ngày)
        - 'expired' : file đã bị xóa        (> 15 ngày)
        """
        from django.utils import timezone
        from datetime import timedelta
        age = timezone.now() - self.created_at
        if age <= timedelta(hours=48) and self.gemini_file_valid:
            return 'gemini'
        if age <= timedelta(days=15) and self.audio_file:
            return 'local'
        return 'expired'
```

### Database indexes

```sql
CREATE INDEX idx_transcriptjob_uuid     ON transcripts_transcriptjob(uuid);
CREATE INDEX idx_transcriptjob_step1    ON transcripts_transcriptjob(step1_status);
CREATE INDEX idx_transcriptjob_created  ON transcripts_transcriptjob(created_at DESC);
```

---

## 4. Celery Tasks

### 4.1 Tổng quan 4 tasks

```
task_download_audio(job_id)        → Step 1: yt-dlp download MP3
task_upload_to_gemini(job_id)      → Step 2a: upload file lên Gemini File API
task_transcribe_audio(job_id)      → Step 2b: generate_content → raw transcript (blocking ~5-15 phút)
task_translate_transcript(job_id)  → Step 3: generate_content → bản dịch VI
```

Chain khi tạo mới:
```python
pipeline = (
    task_download_audio.si(job_id)
    | task_upload_to_gemini.si(job_id)
    | task_transcribe_audio.si(job_id)
    | task_translate_transcript.si(job_id)
)
pipeline.delay()
```

> **Lưu ý**: Dùng `.si()` (immutable signature) thay vì `.s()` để Celery không tự động truyền return value của task trước làm argument đầu tiên của task sau. Mỗi task nhận `job_id` trực tiếp từ `.si(job_id)`, không phụ thuộc vào return value của task trước.

Re-run từng step độc lập:
```python
task_download_audio.delay(job_id)       # re-run step 1
task_upload_to_gemini.delay(job_id)     # re-run step 2a (re-upload nếu URI hết hạn)
task_transcribe_audio.delay(job_id)     # re-run step 2b (dùng file_uri hiện có nếu còn hiệu lực)
task_translate_transcript.delay(job_id) # re-run step 3 (dùng raw_transcript hiện có)
```

### 4.2 `task_download_audio`

```python
@shared_task(bind=True, max_retries=0, soft_time_limit=600)
def task_download_audio(self, job_id: int):
    from .models import TranscriptJob, StepStatus
    try:
        job = TranscriptJob.objects.get(pk=job_id)
    except TranscriptJob.DoesNotExist:
        return

    job.step1_status = StepStatus.PROCESSING
    job.step1_error = ''
    job.save(update_fields=['step1_status', 'step1_error', 'updated_at'])

    output_dir = os.path.join(settings.MEDIA_ROOT, 'transcripts', str(job_id))
    os.makedirs(output_dir, exist_ok=True)
    output_template = os.path.join(output_dir, 'audio.%(ext)s')

    try:
        result = subprocess.run(
            [
                'yt-dlp',
                '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
                '--output', output_template,
                '--print', 'title',
                '--no-playlist',
                job.youtube_url,
            ],
            capture_output=True, text=True, timeout=600, check=True,
        )
        title = result.stdout.strip().splitlines()[0] if result.stdout.strip() else ''
        relative_path = os.path.join('transcripts', str(job_id), 'audio.mp3')

        job.audio_file = relative_path
        job.title = title[:500]
        job.step1_status = StepStatus.DONE
        job.save(update_fields=['audio_file', 'title', 'step1_status', 'updated_at'])

    except subprocess.TimeoutExpired:
        _fail_step(job, 'step1', 'Download timed out after 10 minutes')
    except subprocess.CalledProcessError as exc:
        _fail_step(job, 'step1', f'yt-dlp error (exit {exc.returncode}): {exc.stderr[:1000]}')
    except Exception as exc:
        _fail_step(job, 'step1', str(exc))
```

### 4.3 `task_upload_to_gemini`

```python
@shared_task(bind=True, max_retries=0, soft_time_limit=300)
def task_upload_to_gemini(self, job_id: int):
    from .models import TranscriptJob, StepStatus
    from django.utils import timezone
    import google.genai as genai

    try:
        job = TranscriptJob.objects.get(pk=job_id)
    except TranscriptJob.DoesNotExist:
        return

    # Skip nếu file_uri còn hiệu lực (re-run không cần upload lại)
    if job.gemini_file_valid:
        job.step2a_status = StepStatus.SKIPPED
        job.save(update_fields=['step2a_status', 'updated_at'])
        return

    if job.step1_status != StepStatus.DONE or not job.audio_file:
        logger.error('task_upload_to_gemini: job %s step1 not done', job_id)
        return

    job.step2a_status = StepStatus.UPLOADING
    job.step2a_error = ''
    job.save(update_fields=['step2a_status', 'step2a_error', 'updated_at'])

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        uploaded = client.files.upload(
            file=job.audio_file_path,
            config={'mime_type': 'audio/mpeg'},
        )
        job.gemini_file_uri  = uploaded.uri
        job.gemini_file_name = uploaded.name
        job.gemini_uploaded_at = timezone.now()
        job.step2a_status = StepStatus.DONE
        job.save(update_fields=[
            'gemini_file_uri', 'gemini_file_name', 'gemini_uploaded_at',
            'step2a_status', 'updated_at',
        ])
    except Exception as exc:
        _fail_step(job, 'step2a', str(exc))
```

### 4.4 `task_transcribe_audio`

```python
@shared_task(bind=True, max_retries=0, soft_time_limit=1800)  # 30 phút max
def task_transcribe_audio(self, job_id: int):
    from .models import TranscriptJob, StepStatus
    import google.genai as genai

    try:
        job = TranscriptJob.objects.get(pk=job_id)
    except TranscriptJob.DoesNotExist:
        return

    if job.step2a_status not in (StepStatus.DONE, StepStatus.SKIPPED) or not job.gemini_file_uri:
        logger.error('task_transcribe_audio: job %s step2a not done', job_id)
        return

    job.step2b_status = StepStatus.TRANSCRIBING
    job.step2b_error = ''
    job.save(update_fields=['step2b_status', 'step2b_error', 'updated_at'])

    try:
        from .models import TranscriptConfig, ConfigType
        config = TranscriptConfig.get(ConfigType.TRANSCRIPT_PROMPT)

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        file_ref = client.files.get(name=job.gemini_file_name)

        response = client.models.generate_content(
            model=config.model,  # enum từ TranscriptConfig, không cho tự gõ
            contents=[file_ref, config.value],
        )
        job.raw_transcript = response.text
        job.step2b_status = StepStatus.DONE
        job.save(update_fields=['raw_transcript', 'step2b_status', 'updated_at'])
    except Exception as exc:
        _fail_step(job, 'step2b', str(exc))
```

### 4.5 `task_translate_transcript`

```python
@shared_task(bind=True, max_retries=0, soft_time_limit=600,
             rate_limit=None)  # rate_limit set dynamically từ settings
def task_translate_transcript(self, job_id: int):
    from .models import TranscriptJob, StepStatus
    import google.genai as genai

    try:
        job = TranscriptJob.objects.get(pk=job_id)
    except TranscriptJob.DoesNotExist:
        return

    if job.step2b_status != StepStatus.DONE or not job.raw_transcript:
        logger.error('task_translate_transcript: job %s step2b not done', job_id)
        return

    job.step3_status = StepStatus.TRANSLATING
    job.step3_error = ''
    job.save(update_fields=['step3_status', 'step3_error', 'updated_at'])

    try:
        from .models import TranscriptConfig, ConfigType
        config = TranscriptConfig.get(ConfigType.TRANSLATE_PROMPT)

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        full_prompt = (
            config.value
            + '\n\n---\n\nNội dung cần dịch:\n\n'
            + job.raw_transcript
        )
        response = client.models.generate_content(
            model=config.model,  # enum từ TranscriptConfig
            contents=[full_prompt],
        )
        job.translated_transcript = response.text
        job.step3_status = StepStatus.DONE
        job.save(update_fields=['translated_transcript', 'step3_status', 'updated_at'])
    except Exception as exc:
        _fail_step(job, 'step3', str(exc))


def _fail_step(job, step: str, error_msg: str):
    from .models import StepStatus
    setattr(job, f'{step}_status', StepStatus.FAILED)
    setattr(job, f'{step}_error', error_msg[:5000])
    job.save(update_fields=[f'{step}_status', f'{step}_error', 'updated_at'])
    logger.error('_fail_step: job %s %s FAILED: %s', job.pk, step, error_msg[:200])
```

### 4.6 Dynamic rate limit từ settings

```python
# transcripts/apps.py
from django.apps import AppConfig

class TranscriptsConfig(AppConfig):
    name = 'transcripts'

    def ready(self):
        from django.conf import settings
        rpm = getattr(settings, 'GEMINI_RPM_LIMIT', 0)
        if rpm:
            from .tasks import task_transcribe_audio, task_translate_transcript
            task_transcribe_audio.rate_limit = f'{rpm}/m'
            task_translate_transcript.rate_limit = f'{rpm}/m'
```

### 4.7 Periodic task — xóa MP3 cũ hơn 15 ngày

```python
# transcripts/tasks.py

@shared_task
def task_cleanup_old_audio():
    """
    Celery beat periodic task: chạy hàng ngày.
    Xóa file MP3 của jobs cũ hơn 15 ngày để giải phóng disk.
    """
    from .models import TranscriptJob
    from django.utils import timezone
    from datetime import timedelta
    import os

    cutoff = timezone.now() - timedelta(days=15)
    old_jobs = TranscriptJob.objects.filter(
        created_at__lt=cutoff,
        audio_file__gt='',  # chỉ job còn file
    )
    deleted_count = 0
    for job in old_jobs:
        path = job.audio_file_path
        if path and os.path.exists(path):
            os.remove(path)
            deleted_count += 1
            # Remove empty directory
            output_dir = os.path.dirname(path)
            try:
                os.rmdir(output_dir)  # chỉ xóa nếu thư mục rỗng
            except OSError:
                pass  # thư mục không rỗng hoặc không tồn tại, bỏ qua
        job.audio_file = ''
        job.save(update_fields=['audio_file', 'updated_at'])

    logger.info('task_cleanup_old_audio: deleted %d MP3 files', deleted_count)
```

Thêm vào Celery Beat schedule trong `config/settings.py`:

```python
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # ... existing schedules ...
    'cleanup-old-transcript-audio': {
        'task': 'transcripts.tasks.task_cleanup_old_audio',
        'schedule': crontab(hour=3, minute=0),  # 3AM hàng ngày
    },
}
```

---

## 5. Django Admin

### 5.1 `TranscriptJobAdmin`

```python
# transcripts/admin.py

import os
from django.contrib import admin
from django.utils.html import format_html
from django.urls import path, reverse
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.conf import settings
from .models import TranscriptJob
from .tasks import (
    task_download_audio, task_upload_to_gemini,
    task_transcribe_audio, task_translate_transcript,
)

import logging
logger = logging.getLogger(__name__)

STATUS_COLORS = {
    'PENDING':      '#aaa',
    'PROCESSING':   '#f90',
    'UPLOADING':    '#ff9800',
    'TRANSCRIBING': '#ff9800',
    'TRANSLATING':  '#ff9800',
    'DONE':         '#4caf50',
    'FAILED':       '#e53935',
    'SKIPPED':      '#2196f3',
}

def _badge(status):
    color = STATUS_COLORS.get(status, '#aaa')
    return format_html(
        '<span style="color:{};font-weight:bold">{}</span>', color, status
    )


@admin.register(TranscriptJob)
class TranscriptJobAdmin(admin.ModelAdmin):

    list_display = [
        'id', 'title_short', 'youtube_url_short',
        'step1_badge', 'step2a_badge', 'step2b_badge', 'step3_badge',
        'overall_badge', 'created_at',
    ]
    list_filter  = ['step1_status', 'step2b_status', 'step3_status']
    search_fields = ['youtube_url', 'title', 'playlist_url']
    ordering     = ['-created_at']
    actions      = [
        'action_rerun_download', 'action_rerun_upload',
        'action_rerun_transcribe', 'action_rerun_translate',
    ]

    readonly_fields = [
        'uuid', 'title', 'playlist_url', 'audio_file',
        'gemini_file_uri', 'gemini_file_name', 'gemini_uploaded_at',
        'gemini_file_badge',
        'step1_status', 'step1_error_display',
        'step2a_status', 'step2a_error_display',
        'raw_transcript_display',
        'step2b_status', 'step2b_error_display',
        'translated_transcript_display',
        'step3_status', 'step3_error_display',
        'overall_badge', 'created_at', 'updated_at',
        'rerun_buttons', 'audio_player',
    ]

    fieldsets = [
        ('Job Info', {
            'fields': ['uuid', 'youtube_url', 'playlist_url', 'title'],
        }),
        ('Re-run Controls', {
            'fields': ['rerun_buttons'],
        }),
        ('Audio Preview', {
            'fields': ['audio_player'],
        }),
        ('Step 1 — Download', {
            'fields': ['step1_status', 'audio_file', 'step1_error_display'],
        }),
        ('Step 2a — Upload to Gemini', {
            'fields': [
                'step2a_status', 'step2a_error_display',
                'gemini_file_uri', 'gemini_file_name',
                'gemini_uploaded_at', 'gemini_file_badge',
            ],
            'classes': ['collapse'],
        }),
        ('Step 2b — Transcribe (Chinese)', {
            'fields': ['step2b_status', 'step2b_error_display', 'raw_transcript_display'],
            'classes': ['collapse'],
        }),
        ('Step 3 — Translate (Vietnamese)', {
            'fields': ['step3_status', 'step3_error_display', 'translated_transcript_display'],
        }),
        ('Metadata', {
            'fields': ['overall_badge', 'created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    # --- Custom URLs ---
    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:job_id>/rerun/<str:step>/',
                self.admin_site.admin_view(self.rerun_step_view),
                name='transcripts_rerun_step',
            ),
            path(
                'import-playlist/',
                self.admin_site.admin_view(self.import_playlist_view),
                name='transcripts_import_playlist',
            ),
        ]
        return custom + urls

    def rerun_step_view(self, request, job_id, step):
        job = get_object_or_404(TranscriptJob, pk=job_id)
        task_map = {
            'step1':  task_download_audio,
            'step2a': task_upload_to_gemini,
            'step2b': task_transcribe_audio,
            'step3':  task_translate_transcript,
        }
        task = task_map.get(step)
        if task:
            task.delay(job_id)
            messages.success(request, f'Job {job_id}: {step} queued.')
        else:
            messages.error(request, f'Invalid step: {step}')
        return redirect('admin:transcripts_transcriptjob_change', job_id)

    # --- Audio Player ---
    @admin.display(description='Audio Preview')
    def audio_player(self, obj):
        mode = obj.audio_serve_mode
        if mode == 'gemini':
            # Gemini file URI không stream trực tiếp qua browser
            # Hiển thị link local nếu file còn, fallback thông báo
            if obj.audio_file:
                url = f'{settings.MEDIA_URL}{obj.audio_file}'
                return format_html(
                    '<audio controls style="width:100%">'
                    '<source src="{}" type="audio/mpeg">'
                    '</audio>'
                    '<small style="color:#aaa">Gemini file valid until 48h • Serving from local</small>',
                    url,
                )
            return format_html(
                '<small style="color:#2196f3">Gemini file URI valid (< 48h) — local file still available</small>'
            )
        if mode == 'local':
            url = f'{settings.MEDIA_URL}{obj.audio_file}'
            return format_html(
                '<audio controls style="width:100%">'
                '<source src="{}" type="audio/mpeg">'
                '</audio>',
                url,
            )
        return format_html('<small style="color:#aaa">Audio file expired (> 15 days) — deleted</small>')

    # --- Gemini file badge ---
    @admin.display(description='Gemini File Status')
    def gemini_file_badge(self, obj):
        if not obj.gemini_file_uri:
            return '—'
        if obj.gemini_file_valid:
            return format_html('<span style="color:#4caf50;font-weight:bold">✓ Valid (< 48h)</span>')
        return format_html('<span style="color:#aaa">✗ Expired (> 48h) — re-run Step 2a to re-upload</span>')

    # --- List display helpers ---
    @admin.display(description='Title')
    def title_short(self, obj):
        return (obj.title or '(no title)')[:50]

    @admin.display(description='URL')
    def youtube_url_short(self, obj):
        return format_html(
            '<a href="{}" target="_blank">{}</a>',
            obj.youtube_url, obj.youtube_url[:45],
        )

    @admin.display(description='S1')
    def step1_badge(self, obj): return _badge(obj.step1_status)

    @admin.display(description='S2a')
    def step2a_badge(self, obj): return _badge(obj.step2a_status)

    @admin.display(description='S2b')
    def step2b_badge(self, obj): return _badge(obj.step2b_status)

    @admin.display(description='S3')
    def step3_badge(self, obj): return _badge(obj.step3_status)

    @admin.display(description='Overall')
    def overall_badge(self, obj): return _badge(obj.overall_status)

    # --- Error displays ---
    def _error_field(self, error_text):
        if not error_text:
            return '—'
        return format_html(
            '<pre style="white-space:pre-wrap;color:#e53935;font-size:12px">{}</pre>',
            error_text,
        )

    @admin.display(description='Step 1 Error')
    def step1_error_display(self, obj): return self._error_field(obj.step1_error)

    @admin.display(description='Step 2a Error')
    def step2a_error_display(self, obj): return self._error_field(obj.step2a_error)

    @admin.display(description='Step 2b Error')
    def step2b_error_display(self, obj): return self._error_field(obj.step2b_error)

    @admin.display(description='Step 3 Error')
    def step3_error_display(self, obj): return self._error_field(obj.step3_error)

    # --- Transcript displays ---
    def _transcript_field(self, text, max_height='400px'):
        if not text:
            return '—'
        return format_html(
            '<pre style="white-space:pre-wrap;max-height:{};overflow-y:auto;'
            'font-family:monospace;font-size:13px;line-height:1.6">{}</pre>',
            max_height, text,
        )

    @admin.display(description='Raw Transcript (Chinese)')
    def raw_transcript_display(self, obj):
        return self._transcript_field(obj.raw_transcript)

    @admin.display(description='Translated Transcript (Vietnamese)')
    def translated_transcript_display(self, obj):
        return self._transcript_field(obj.translated_transcript, max_height='600px')

    # --- Re-run buttons on detail page ---
    @admin.display(description='Re-run Controls')
    def rerun_buttons(self, obj):
        if not obj.pk:
            return '(save job first)'
        base = f'/admin/transcripts/transcriptjob/{obj.pk}/rerun'
        return format_html(
            '<a class="button" href="{}/step1/" style="margin:4px">▶ Step 1 (Download)</a>'
            '<a class="button" href="{}/step2a/" style="margin:4px">▶ Step 2a (Upload)</a>'
            '<a class="button" href="{}/step2b/" style="margin:4px">▶ Step 2b (Transcribe)</a>'
            '<a class="button" href="{}/step3/" style="margin:4px">▶ Step 3 (Translate)</a>',
            base, base, base, base,
        )

    # --- Bulk actions ---
    @admin.action(description='▶ Re-run Step 1 (Download)')
    def action_rerun_download(self, request, queryset):
        for job in queryset:
            task_download_audio.delay(job.pk)
        self.message_user(request, f'{queryset.count()} download task(s) queued.')

    @admin.action(description='▶ Re-run Step 2a (Upload to Gemini)')
    def action_rerun_upload(self, request, queryset):
        for job in queryset:
            task_upload_to_gemini.delay(job.pk)
        self.message_user(request, f'{queryset.count()} upload task(s) queued.')

    @admin.action(description='▶ Re-run Step 2b (Transcribe)')
    def action_rerun_transcribe(self, request, queryset):
        for job in queryset:
            task_transcribe_audio.delay(job.pk)
        self.message_user(request, f'{queryset.count()} transcribe task(s) queued.')

    @admin.action(description='▶ Re-run Step 3 (Translate)')
    def action_rerun_translate(self, request, queryset):
        for job in queryset:
            task_translate_transcript.delay(job.pk)
        self.message_user(request, f'{queryset.count()} translate task(s) queued.')

    # --- Auto-start pipeline on create ---
    def save_model(self, request, obj, form, change):
        is_new = obj.pk is None
        super().save_model(request, obj, form, change)
        if is_new:
            pipeline = (
                task_download_audio.si(obj.pk)
                | task_upload_to_gemini.si(obj.pk)
                | task_transcribe_audio.si(obj.pk)
                | task_translate_transcript.si(obj.pk)
            )
            pipeline.delay()
            messages.info(request, f'Job {obj.pk}: Full pipeline queued.')

    # --- Cleanup on delete ---
    def _delete_audio_file(self, job):
        if job.audio_file:
            path = job.audio_file_path
            if path and os.path.exists(path):
                os.remove(path)
                try:
                    os.rmdir(os.path.dirname(path))
                except OSError:
                    pass

    def delete_model(self, request, obj):
        self._delete_audio_file(obj)
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for job in queryset:
            self._delete_audio_file(job)
        super().delete_queryset(request, queryset)
```

### 5.2 Playlist Import View

Custom view tại `/admin/transcripts/import-playlist/`:

```python
# transcripts/admin.py (tiếp theo)

import subprocess
from django.views.decorators.http import require_http_methods
from django.template.response import TemplateResponse


def import_playlist_view(self, request):
    """
    GET  → form nhập playlist URL
    POST (step=fetch) → fetch video list từ yt-dlp, hiển thị checkbox
    POST (step=confirm) → tạo TranscriptJob cho các video được chọn
    """
    context = {
        **self.admin_site.each_context(request),
        'title': 'Import from YouTube Playlist',
    }

    if request.method == 'GET':
        return TemplateResponse(request, 'admin/transcripts/import_playlist.html', context)

    step = request.POST.get('step')

    # --- Step fetch: lấy danh sách video ---
    if step == 'fetch':
        playlist_url = request.POST.get('playlist_url', '').strip()
        if not playlist_url:
            messages.error(request, 'Please enter a playlist URL.')
            return TemplateResponse(request, 'admin/transcripts/import_playlist.html', context)

        try:
            result = subprocess.run(
                [
                    'yt-dlp',
                    '--flat-playlist',
                    '--print', '%(url)s\t%(title)s',
                    '--no-warnings',
                    playlist_url,
                ],
                capture_output=True, text=True, timeout=60, check=True,
            )
            videos = []
            for line in result.stdout.strip().splitlines():
                parts = line.split('\t', 1)
                if len(parts) == 2:
                    videos.append({'url': parts[0], 'title': parts[1]})
                elif len(parts) == 1:
                    videos.append({'url': parts[0], 'title': ''})

            context.update({
                'playlist_url': playlist_url,
                'videos': videos,
                'step': 'confirm',
            })
            return TemplateResponse(request, 'admin/transcripts/import_playlist.html', context)

        except subprocess.TimeoutExpired:
            messages.error(request, 'Fetching playlist timed out. Try again.')
        except subprocess.CalledProcessError as exc:
            messages.error(request, f'yt-dlp error: {exc.stderr[:500]}')
        except Exception as exc:
            messages.error(request, str(exc))

        return TemplateResponse(request, 'admin/transcripts/import_playlist.html', context)

    # --- Step confirm: tạo jobs ---
    if step == 'confirm':
        playlist_url = request.POST.get('playlist_url', '')
        selected_urls   = request.POST.getlist('selected_videos')
        selected_titles = {
            url: request.POST.get(f'title_{url}', '')
            for url in selected_urls
        }

        if not selected_urls:
            messages.warning(request, 'No videos selected.')
            return redirect('admin:transcripts_import_playlist')

        # Check existing jobs
        existing_urls = set(
            TranscriptJob.objects.filter(youtube_url__in=selected_urls)
            .values_list('youtube_url', flat=True)
        )
        duplicate_count = len(existing_urls)

        created = 0
        skipped = 0
        for url in selected_urls:
            if url in existing_urls:
                skipped += 1
                continue
            job = TranscriptJob.objects.create(
                youtube_url=url,
                playlist_url=playlist_url,
                title=selected_titles.get(url, '')[:500],
            )
            pipeline = (
                task_download_audio.si(job.pk)
                | task_upload_to_gemini.si(job.pk)
                | task_transcribe_audio.si(job.pk)
                | task_translate_transcript.si(job.pk)
            )
            pipeline.delay()
            created += 1

        if skipped:
            messages.warning(request, f'{skipped} video(s) skipped — job already exists.')
        messages.success(request, f'{created} job(s) created and queued.')
        return redirect('admin:transcripts_transcriptjob_changelist')

    return TemplateResponse(request, 'admin/transcripts/import_playlist.html', context)
```

### 5.3 Template playlist import

```html
<!-- templates/admin/transcripts/import_playlist.html -->
{% extends "admin/base_site.html" %}
{% block content %}
<h1>Import from YouTube Playlist</h1>

{% if not step %}
<!-- Step 1: nhập URL -->
<form method="post">
  {% csrf_token %}
  <input type="hidden" name="step" value="fetch">
  <div style="margin-bottom:16px">
    <label><b>Playlist URL:</b></label><br>
    <input type="url" name="playlist_url" style="width:500px;padding:6px"
           placeholder="https://www.youtube.com/playlist?list=...">
  </div>
  <button type="submit" class="button default">Fetch Video List</button>
</form>

{% elif step == 'confirm' %}
<!-- Step 2: chọn video -->
<form method="post">
  {% csrf_token %}
  <input type="hidden" name="step" value="confirm">
  <input type="hidden" name="playlist_url" value="{{ playlist_url }}">

  <p>Found <b>{{ videos|length }}</b> videos. Select videos to import:</p>

  <div style="margin-bottom:12px">
    <a href="#" onclick="document.querySelectorAll('input[name=selected_videos]').forEach(c=>c.checked=true);return false">
      Select All
    </a> |
    <a href="#" onclick="document.querySelectorAll('input[name=selected_videos]').forEach(c=>c.checked=false);return false">
      Deselect All
    </a>
  </div>

  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr>
        <th style="width:40px;padding:8px;border-bottom:1px solid #ddd">✓</th>
        <th style="padding:8px;border-bottom:1px solid #ddd;text-align:left">#</th>
        <th style="padding:8px;border-bottom:1px solid #ddd;text-align:left">Title</th>
        <th style="padding:8px;border-bottom:1px solid #ddd;text-align:left">URL</th>
      </tr>
    </thead>
    <tbody>
      {% for video in videos %}
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">
          <input type="checkbox" name="selected_videos" value="{{ video.url }}" checked>
          <input type="hidden" name="title_{{ video.url }}" value="{{ video.title }}">
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee">{{ forloop.counter }}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">{{ video.title|default:"(no title)" }}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">
          <a href="{{ video.url }}" target="_blank">{{ video.url|truncatechars:60 }}</a>
        </td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  <div style="margin-top:16px">
    <button type="submit" class="button default">Create Jobs for Selected Videos</button>
    <a href="{% url 'admin:transcripts_import_playlist' %}" style="margin-left:16px">← Back</a>
  </div>
</form>
{% endif %}
{% endblock %}
```

### 5.4 Link "Import Playlist" trên changelist

```python
# Trong TranscriptJobAdmin
change_list_template = 'admin/transcripts/transcriptjob_changelist.html'
```

Thêm template:

```html
<!-- templates/admin/transcripts/transcriptjob_changelist.html -->
{% extends "admin/change_list.html" %}
{% block object-tools-items %}
  <li>
    <a href="{% url 'admin:transcripts_import_playlist' %}"
       class="addlink">
      Import from Playlist
    </a>
  </li>
  {{ block.super }}
{% endblock %}
```

---

## 6. Settings

Prompts và model **không còn trong settings** — được quản lý qua `TranscriptConfig` model (DB), edit trực tiếp trong Django admin.

```python
# config/settings.py

# --- Gemini / Transcript Pipeline ---
GEMINI_API_KEY   = env('GEMINI_API_KEY', default='')
GEMINI_RPM_LIMIT = env.int('GEMINI_RPM_LIMIT', default=8)  # 0 = unlimited (Pay-as-you-go)
```

### `.env` / `.env.example`

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_RPM_LIMIT=8
# Set GEMINI_RPM_LIMIT=0 for Pay-as-you-go (no throttle)
```

### `TranscriptConfigAdmin` — admin edit prompt + model

```python
@admin.register(TranscriptConfig)
class TranscriptConfigAdmin(admin.ModelAdmin):
    list_display  = ['type', 'model', 'updated_at']
    readonly_fields = ['type', 'updated_at']  # type không cho đổi sau khi tạo
    fields = ['type', 'model', 'value', 'updated_at']

    def has_add_permission(self, request):
        return False  # chỉ edit, không thêm row mới (2 rows đã tạo qua migration)

    def has_delete_permission(self, request, obj=None):
        return False  # không xóa config
```

---

## 7. Dependencies

### `requirements.txt` — thêm 2 dòng

```
yt-dlp
google-genai
```

> **Lưu ý**: `google-genai` là Google Gen AI SDK mới, dùng `genai.Client` API. Khác với `google-generativeai` cũ.

### Infrastructure

- **FFmpeg**: Đã có sẵn trong Dockerfile (xác nhận từ review code). Không cần thay đổi.
- **Production native**: Đảm bảo `MEDIA_ROOT` trong `settings.py` trỏ đến persistent path trên VPS (ví dụ `/var/www/thienthu/media`), và Nginx config `location /media/` serve static files từ path đó.
- **Celery Beat**: Cần đảm bảo `celery beat` đang chạy trên production để periodic task dọn MP3 hoạt động.

### Celery Queue (production recommendation)

Assign transcripts tasks vào dedicated queue `transcripts` để tránh long-running tasks (step 2b có thể 5–15 phút) block các task ngắn khác:

```python
# config/settings.py
CELERY_TASK_ROUTES = {
    'transcripts.tasks.*': {'queue': 'transcripts'},
}
```

Khởi động worker với: `celery -A config worker -Q transcripts,default`

---

## 8. Error Handling

| Scenario | Behavior |
|---|---|
| YouTube URL invalid / private | yt-dlp CalledProcessError → step1 FAILED |
| yt-dlp timeout (> 10 phút) | TimeoutExpired → step1 FAILED |
| Gemini file expired khi re-run step2b | Guard check `gemini_file_valid` → log warning, admin re-run step2a trước |
| Gemini API rate limit 429 | Exception caught → step FAILED, admin re-run sau |
| Disk full | OSError → step1 FAILED |
| Task timeout > 30 phút (step2b) | `SoftTimeLimitExceeded` → step2b FAILED |
| Playlist fetch fail | Error message trong admin view, không tạo job nào |

---

## 9. Audio Lifecycle — Chi tiết

```
Job created
    │
    ├─ 0h ──────── 48h: gemini_file_valid = True
    │                   audio_serve_mode = 'gemini' (serve từ /media/ local)
    │                   badge: "✓ Valid (< 48h)"
    │
    ├─ 48h ─────── 15 ngày: gemini_file_valid = False, audio_file exists
    │                        audio_serve_mode = 'local'
    │                        badge: "✗ Expired (> 48h) — re-run Step 2a to re-upload"
    │
    └─ > 15 ngày: task_cleanup_old_audio chạy lúc 3AM
                  audio_file bị xóa khỏi disk
                  audio_serve_mode = 'expired'
                  badge: "Audio file expired (> 15 days) — deleted"
```

> **Lưu ý**: `audio_serve_mode = 'gemini'` trong design này vẫn serve audio từ `/media/` local vì Gemini file URI không stream trực tiếp qua browser. Badge chỉ để admin biết file còn trên Gemini (dùng để re-run step2b không cần upload lại).

---

## 10. Implementation Checklist

### App & Model
- [ ] **33.1** Tạo app `src/backend/transcripts/` (`__init__.py`, `apps.py`, `models.py`, `admin.py`, `tasks.py`)
- [ ] **33.2** Viết enums `GeminiModel`, `ConfigType`, `StepStatus` (TextChoices)
- [ ] **33.3** Viết model `TranscriptConfig` (type unique, value TextField, model enum)
- [ ] **33.4** Viết model `TranscriptJob` với đầy đủ fields (bao gồm `playlist_url`, `gemini_file_uri`, `gemini_file_name`, `gemini_uploaded_at`, `step2a_*`) — **không có `gemini_model` field**
- [ ] **33.5** Thêm properties vào `TranscriptJob`: `overall_status`, `audio_file_path`, `gemini_file_valid`, `audio_serve_mode`
- [ ] **33.6** Viết migration `0001_initial.py` (tạo cả 2 tables)
- [ ] **33.7** Viết data migration `0002_transcriptconfig_default_data.py` — tạo 2 rows mặc định (`TRANSCRIPT_PROMPT`, `TRANSLATE_PROMPT`) với `get_or_create`
- [ ] **33.8** Thêm `'transcripts'` vào `INSTALLED_APPS`
- [ ] **33.9** Chạy `makemigrations` + `migrate`

### Celery Tasks
- [ ] **33.10** `task_download_audio` — yt-dlp subprocess, lưu audio_file + title, step1 status
- [ ] **33.11** `task_upload_to_gemini` — skip nếu file_uri còn hiệu lực, upload MP3 lên File API, lưu gemini_file_uri + gemini_uploaded_at
- [ ] **33.12** `task_transcribe_audio` — `soft_time_limit=1800`, guard step2a, `client.files.get` + `generate_content`, lưu raw_transcript
- [ ] **33.13** `task_translate_transcript` — guard step2b, generate_content với translate prompt, lưu translated_transcript
- [ ] **33.14** `_fail_step` helper
- [ ] **33.15** `task_cleanup_old_audio` — xóa MP3 > 15 ngày, xóa thư mục rỗng, clear audio_file field
- [ ] **33.16** Dynamic rate limit trong `TranscriptsConfig.ready()` từ `GEMINI_RPM_LIMIT`
- [ ] **33.17** Thêm `cleanup-old-transcript-audio` vào `CELERY_BEAT_SCHEDULE`
- [ ] **33.18** Thêm `CELERY_TASK_ROUTES` để route `transcripts.tasks.*` vào queue `transcripts`
- [ ] **33.19** Verify chain dùng `.si()` (immutable signature) ở tất cả chỗ tạo pipeline
- [ ] **33.20** _(reserved)_

### Settings
- [ ] **33.21** Thêm `GEMINI_API_KEY` và `GEMINI_RPM_LIMIT` vào `config/settings.py` (chỉ 2 env vars — không còn hardcode prompts)
- [ ] **33.22** Thêm `GEMINI_API_KEY` và `GEMINI_RPM_LIMIT` vào `docker/.env` và `docker/.env.example`

### Admin
- [ ] **33.23** `TranscriptConfigAdmin` — readonly `type`, edit `model` (enum dropdown) + `value` (textarea), disable add/delete
- [ ] **33.24** `TranscriptJobAdmin` — list display với 4 step badges, fieldsets, readonly fields
- [ ] **33.25** `audio_player` — `<audio>` tag với logic `audio_serve_mode`
- [ ] **33.26** `gemini_file_badge` — valid/expired indicator
- [ ] **33.27** `rerun_buttons` — 4 nút Re-run trên detail page
- [ ] **33.28** Custom URL `/<job_id>/rerun/<step>/` → trigger task
- [ ] **33.29** 4 bulk actions (rerun download/upload/transcribe/translate)
- [ ] **33.30** `save_model` override — auto-start full pipeline khi tạo mới
- [ ] **33.31** `delete_model` + `delete_queryset` override — xóa MP3 + thư mục rỗng khi xóa job
- [ ] **33.32** `change_list_template` + template `transcriptjob_changelist.html` — link "Import from Playlist" trên changelist

### Playlist Import
- [ ] **33.33** Custom URL `/admin/transcripts/import-playlist/`
- [ ] **33.34** `import_playlist_view` — GET form + POST step=fetch (yt-dlp --flat-playlist) + POST step=confirm (tạo jobs, skip duplicates)
- [ ] **33.35** Template `templates/admin/transcripts/import_playlist.html` — form + checkbox table
- [ ] **33.36** Duplicate check trước khi tạo job: skip nếu `youtube_url` đã tồn tại, hiển thị warning message

### Dependencies
- [ ] **33.37** Thêm `yt-dlp` và `google-genai` vào `requirements.txt`
- [ ] **33.38** Rebuild docker image (dev) hoặc `pip install` trên VPS (production)

### Verification
- [ ] **33.39** Test single video: tạo job → verify 4 steps DONE
- [ ] **33.40** Kiểm tra audio player hoạt động trong admin
- [ ] **33.41** Re-run step2b: verify không upload lại (step2a SKIPPED)
- [ ] **33.42** Re-run step3: verify không transcribe lại
- [ ] **33.43** Test playlist import: fetch → chọn 2-3 video → confirm → verify jobs tạo đúng
- [ ] **33.44** Test duplicate: import cùng playlist 2 lần → verify duplicate bị skip với warning
- [ ] **33.45** Test rate limit: `GEMINI_RPM_LIMIT=2`, import 5 video → verify throttle hoạt động
- [ ] **33.46** Test cleanup: job giả > 15 ngày → chạy `task_cleanup_old_audio` → verify file + thư mục xóa
- [ ] **33.47** Test URL invalid → verify step1 FAILED, error message đúng

---

## 11. Trade-offs & Notes

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Gemini calls | 2 calls riêng (transcript + dịch) | Re-run từng step độc lập |
| Step 2 tách 2a + 2b | Upload riêng, generate riêng | Re-upload khi URI hết hạn, không cần re-transcribe |
| Prompt + model | `TranscriptConfig` DB, edit qua admin | Thay đổi không cần redeploy, admin tự tune |
| Model per-job | Không có — model từ `TranscriptConfig` enum | Kiểm soát tập trung, tránh nhầm model |
| Audio storage | `/media/` local | Đủ cho admin tool nội bộ, tránh phức tạp cloud storage |
| Audio lifetime | 15 ngày rồi xóa | Tiết kiệm disk, transcript đã lưu DB là đủ |
| Rate limit | Dynamic từ env | Tự động chuyển Free/Pay-as-you-go không cần redeploy |
| audio_file field | CharField (path) | Đơn giản hơn FileField cho use case internal tool |
| Playlist UI | Custom admin view (Option A) | UX rõ ràng, preview trước khi tạo job |

---

*End of Feature 33 Design Document v2.2*
