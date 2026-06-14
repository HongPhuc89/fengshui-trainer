# Feature 35 — Transcript Completeness Verification

## Document Information

- **Feature**: 35 — Transcript Completeness Verification
- **Version**: 1.4
- **Created**: 2026-06-12
- **Updated**: 2026-06-14
- **Status**: Draft — Pending PO Review
- **Author**: Technical Leader

---

## 1. Bối cảnh & Vấn đề

### 1.1 Vấn đề

Gemini có thể bị context limit và trả về transcript **bị cắt ngắn** — nhưng vẫn có `response.text` (không empty). Pipeline hiện tại không phát hiện được trường hợp này: job sẽ được đánh dấu `step2b_status = DONE` dù transcript chỉ cover 30% nội dung audio.

**Ví dụ thực tế:** Video 3 tiếng, Gemini chỉ transcribe được 47 phút đầu → admin nhìn thấy `DONE` nhưng transcript thiếu 80%.

### 1.2 Root Cause

- Gemini có giới hạn output tokens (context window output). Khi transcript quá dài, model dừng lại giữa chừng mà không báo lỗi rõ ràng.
- Code hiện tại chỉ check `if not response.text` — không đủ để phát hiện transcript bị cắt.
- `finish_reason` của Gemini có thể trả về `MAX_TOKENS` khi bị cut-off, nhưng hiện tại không được kiểm tra.

### 1.3 Ground Truth Sẵn Có

- `ffprobe` đã có trong Docker image (dùng cho chunked transcription ở Feature 34).
- Audio duration là ground truth chính xác và đáng tin cậy.
- Transcript Gemini trả về có format timestamp `[HH:MM:SS]` — có thể parse để lấy timestamp cuối cùng.

---

## 2. Giải Pháp

### Tổng quan

So sánh **timestamp cuối cùng trong transcript** với **duration thực tế của audio** (từ `ffprobe`). Nếu coverage < 90%, đánh dấu warning. Admin thấy ngay trong list view và có thể re-run step 2b.

```
audio_duration (ffprobe)      →  ground truth
last_timestamp (from transcript) →  actual coverage

coverage_ratio = last_timestamp / audio_duration
  ≥ 0.90  → OK
  < 0.90  → WARNING (transcript incomplete)
```

**Tolerance 10%:** Gemini thường không transcript đến giây cuối (trailing silence, nhạc nền). Thiếu <10% là acceptable.

### Scope

- **Backend only** — không có user-facing UI.
- **Admin Django** — thêm coverage % vào list view và detail page.
- **Không auto-retry** — warning không fail job; admin tự quyết định re-run.

---

## 3. Chi Tiết Implement

### 3.1 Database — Thêm 2 Fields vào `TranscriptJob`

```python
# models.py — TranscriptJob

transcript_coverage = models.FloatField(
    null=True, blank=True,
    help_text='Ratio of last transcript timestamp / audio duration (0.0–1.0). Null if not verified.'
)
step2b_warning = models.TextField(
    blank=True, default='',
    help_text='Warning message if transcript appears incomplete. Does not fail the job.'
)
```

**Migration:** Tạo migration mới với `makemigrations`.

### 3.2 Backend — 2 Helper Functions trong `tasks.py`

**Helper 1: Lấy audio duration**

```python
def get_audio_duration(audio_path: str) -> float:
    """Return audio duration in seconds via ffprobe."""
    import json
    probe = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', audio_path],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(probe.stdout)['format']['duration'])
```

**Helper 2: Parse timestamp cuối trong transcript**

```python
import re

def get_last_transcript_timestamp(text: str) -> float | None:
    """Return the last [HH:MM:SS] timestamp in transcript as total seconds, or None."""
    matches = re.findall(r'\[(\d{2}):(\d{2}):(\d{2})\]', text)
    if not matches:
        return None
    h, m, s = matches[-1]
    return int(h) * 3600 + int(m) * 60 + int(s)
```

**Constant cần thêm:**

```python
TRANSCRIPT_MIN_COVERAGE = 0.90  # warn if transcript covers < 90% of audio duration
```

### 3.3 Backend — Sửa `task_transcribe_audio` (step 2b)

Thêm verify block **sau khi gán `job.raw_transcript`**, trước khi `job.save()`:

```python
# Sau khi gán raw_transcript (cả single-file và chunked flow)

audio_path = job.audio_file_path
try:
    audio_duration = get_audio_duration(audio_path)
    last_ts = get_last_transcript_timestamp(job.raw_transcript)

    if last_ts is not None and audio_duration > 0:
        coverage = last_ts / audio_duration
        job.transcript_coverage = round(coverage, 4)
        if coverage < TRANSCRIPT_MIN_COVERAGE:
            job.step2b_warning = (
                f'Transcript may be incomplete: last timestamp {last_ts:.0f}s '
                f'vs audio {audio_duration:.0f}s (coverage={coverage:.1%}). '
                f'Consider re-running Step 2b.'
            )
            logger.warning(
                'task_transcribe_audio: job %s coverage=%.1f%% — possible truncation',
                job_id, coverage * 100,
            )
        else:
            job.step2b_warning = ''
    else:
        job.transcript_coverage = None
        job.step2b_warning = 'Cannot verify completeness: no [HH:MM:SS] timestamps found in transcript.'
        logger.warning('task_transcribe_audio: job %s — no timestamps to verify coverage', job_id)

except Exception as exc:
    # Verification failure must not fail the job
    job.transcript_coverage = None
    job.step2b_warning = f'Coverage check error: {str(exc)[:200]}'
    logger.warning('task_transcribe_audio: job %s coverage check failed: %s', job_id, exc)

job.step2b_status = StepStatus.DONE
job.save(update_fields=[
    'raw_transcript', 'step2b_status',
    'transcript_coverage', 'step2b_warning', 'updated_at',
])
```

**Lưu ý quan trọng:** `try/except` bao quanh toàn bộ verify block — lỗi verification **không được fail job** vì transcript đã có, chỉ là không verify được.

### 3.4 Admin — Hiển thị Coverage

**List view** — thêm `coverage_badge` vào `list_display`:

```python
list_display = [
    'id', 'title_short', 'youtube_url_short',
    'step1_badge', 'step2a_badge', 'step2b_badge', 'step3_badge',
    'overall_badge', 'coverage_badge', 'created_at',  # thêm coverage_badge
]

@admin.display(description='Coverage')
def coverage_badge(self, obj):
    if obj.transcript_coverage is None:
        return format_html('<span style="color:#aaa">—</span>')
    pct = obj.transcript_coverage * 100
    color = '#4caf50' if pct >= 90 else '#e53935'
    return format_html(
        '<span style="color:{};font-weight:bold">{:.1f}%</span>',
        color, pct,
    )
```

**Detail page** — thêm `transcript_coverage`, `step2b_warning_display` vào fieldset Step 2b:

```python
readonly_fields = [
    ...
    'step2b_status', 'step2b_error_display',
    'transcript_coverage_display', 'step2b_warning_display',  # thêm 2 fields
    'raw_transcript_display',
    ...
]

fieldsets = [
    ...
    ('Step 2b — Transcribe (Chinese)', {
        'fields': [
            'step2b_status', 'step2b_error_display',
            'transcript_coverage_display', 'step2b_warning_display',  # thêm
            'raw_transcript_display',
        ],
        'classes': ['collapse'],
    }),
    ...
]

@admin.display(description='Transcript Coverage')
def transcript_coverage_display(self, obj):
    if obj.transcript_coverage is None:
        return '—'
    pct = obj.transcript_coverage * 100
    color = '#4caf50' if pct >= 90 else '#e53935'
    return format_html(
        '<span style="color:{};font-weight:bold;font-size:16px">{:.1f}%</span>'
        ' <span style="color:#aaa;font-size:12px">(≥90% = OK, <90% = incomplete)</span>',
        color, pct,
    )

@admin.display(description='Step 2b Warning')
def step2b_warning_display(self, obj):
    if not obj.step2b_warning:
        return '—'
    return format_html(
        '<span style="color:#f90;font-weight:bold">⚠ {}</span>',
        obj.step2b_warning,
    )
```

---

## 3.5 Batch Job — Backfill Existing Jobs

### Mục đích

Sau khi migrate và deploy, tất cả `TranscriptJob` hiện tại sẽ có `transcript_coverage = NULL` và `step2b_warning = ''`. Batch job này tính toán và điền lại 2 fields đó cho toàn bộ jobs đã `DONE` mà **chưa có coverage**.

### Phạm vi

- Chỉ process jobs có `step2b_status = DONE` **và** `raw_transcript` không rỗng **và** `transcript_coverage IS NULL`.
- Không recompute jobs đã có coverage (idempotent — có thể chạy lại nhiều lần an toàn).
- Không chạy Gemini — chỉ đọc `raw_transcript` từ DB và `audio_file` từ disk (ffprobe).
- Nếu audio file đã expired (> 15 ngày), ghi warning nhưng **không fail** — set `step2b_warning = 'Coverage check error: ...'`.

### Implementation — Management Command

Tạo file mới: `src/backend/transcripts/management/commands/transcript_backfill_coverage.py`

```python
"""
Management command: backfill transcript_coverage and step2b_warning for existing DONE jobs.

Usage:
    python manage.py transcript_backfill_coverage
    python manage.py transcript_backfill_coverage --dry-run
    python manage.py transcript_backfill_coverage --job-ids 1 2 5
"""
import logging
from django.core.management.base import BaseCommand
from transcripts.models import TranscriptJob, StepStatus
from transcripts.tasks import (
    get_audio_duration,
    get_last_transcript_timestamp,
    TRANSCRIPT_MIN_COVERAGE,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill transcript_coverage and step2b_warning for existing DONE jobs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print what would be updated without saving to DB',
        )
        parser.add_argument(
            '--job-ids', nargs='+', type=int,
            help='Only process specific job IDs (default: all eligible jobs)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        job_ids = options.get('job_ids')

        qs = TranscriptJob.objects.filter(
            step2b_status=StepStatus.DONE,
            raw_transcript__gt='',
            transcript_coverage__isnull=True,
        ).order_by('id')

        if job_ids:
            qs = qs.filter(pk__in=job_ids)

        total = qs.count()
        self.stdout.write(f'Found {total} jobs to process. dry_run={dry_run}')

        ok_count = warn_count = err_count = 0

        for job in qs.iterator():
            audio_path = job.audio_file_path
            try:
                if not audio_path:
                    raise FileNotFoundError('audio_file_path is None')

                audio_duration = get_audio_duration(audio_path)
                last_ts = get_last_transcript_timestamp(job.raw_transcript)

                if last_ts is not None and audio_duration > 0:
                    coverage = last_ts / audio_duration
                    job.transcript_coverage = round(coverage, 4)
                    if coverage < TRANSCRIPT_MIN_COVERAGE:
                        job.step2b_warning = (
                            f'Transcript may be incomplete: last timestamp {last_ts:.0f}s '
                            f'vs audio {audio_duration:.0f}s (coverage={coverage:.1%}). '
                            f'Consider re-running Step 2b.'
                        )
                        warn_count += 1
                    else:
                        job.step2b_warning = ''
                        ok_count += 1
                else:
                    job.transcript_coverage = None
                    job.step2b_warning = 'Cannot verify completeness: no [HH:MM:SS] timestamps found in transcript.'
                    err_count += 1

            except Exception as exc:
                job.transcript_coverage = None
                job.step2b_warning = f'Coverage check error: {str(exc)[:200]}'
                err_count += 1

            status = (
                f'OK ({job.transcript_coverage:.1%})' if job.transcript_coverage is not None and job.transcript_coverage >= TRANSCRIPT_MIN_COVERAGE
                else f'WARN ({job.transcript_coverage:.1%})' if job.transcript_coverage is not None
                else f'ERR: {job.step2b_warning[:80]}'
            )
            self.stdout.write(f'  Job {job.pk}: {status}')

            if not dry_run:
                job.save(update_fields=['transcript_coverage', 'step2b_warning', 'updated_at'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. ok={ok_count} warn={warn_count} err={err_count} '
                f'({"dry-run, no changes saved" if dry_run else "saved"})'
            )
        )
```

### Cách chạy

```bash
# Preview (không ghi DB)
docker-compose -f docker/docker-compose.yml exec web \
    python manage.py transcript_backfill_coverage --dry-run

# Chạy thật (tất cả jobs eligible)
docker-compose -f docker/docker-compose.yml exec web \
    python manage.py transcript_backfill_coverage

# Chỉ một số job ID cụ thể
docker-compose -f docker/docker-compose.yml exec web \
    python manage.py transcript_backfill_coverage --job-ids 1 3 7
```

### Luồng xử lý

```
TranscriptJob (step2b_status=DONE, transcript_coverage=NULL)
  │
  ├── audio_file_path exists? ──No──→ step2b_warning = 'Coverage check error: ...'
  │
  ├── ffprobe → audio_duration
  │
  ├── parse last [HH:MM:SS] in raw_transcript → last_ts
  │
  ├── last_ts is None? ──Yes──→ step2b_warning = 'Cannot verify...'
  │
  ├── coverage = last_ts / audio_duration
  │
  ├── coverage >= 0.90? ──Yes──→ transcript_coverage = value, step2b_warning = ''
  │
  └── coverage < 0.90? ──Yes──→ transcript_coverage = value, step2b_warning = 'Incomplete...'
```

### Lưu ý

| | |
|---|---|
| **Idempotent** | `transcript_coverage__isnull=True` guard — chạy lại không recompute jobs đã có coverage. |
| **Audio expired** | Jobs > 15 ngày thường không còn audio file → err_count tăng, warning ghi "Coverage check error: audio_file_path is None". Không fail command. |
| **Không cần Celery** | Command này chạy inline trong web container, không dispatch Celery task. |
| **`get_audio_duration` và `get_last_transcript_timestamp`** | Import từ `tasks.py` — tên public (bỏ underscore prefix theo quyết định ở phần 3.6). |

### 3.6 Refactor — Export helpers ra khỏi `tasks.py`

Để management command có thể import 2 helper functions, cần di chuyển chúng vào module riêng hoặc giữ trong `tasks.py` nhưng export ra ngoài (không private).

**Phương án chọn:** Giữ trong `tasks.py`, bỏ underscore prefix → đổi tên thành `get_audio_duration` và `get_last_transcript_timestamp`. Cũng rename `TRANSCRIPT_MIN_COVERAGE` thành public constant (không cần underscore vì constant dùng cho import).

```python
# tasks.py — rename:
# _get_audio_duration        → get_audio_duration
# _get_last_transcript_timestamp → get_last_transcript_timestamp
# Thêm mới:
TRANSCRIPT_MIN_COVERAGE = 0.90
```

Tất cả call-sites trong `task_transcribe_audio` cũng cập nhật theo tên mới.

---

## 4. Files Cần Sửa/Tạo

| File | Thay đổi |
|---|---|
| `src/backend/transcripts/models.py` | Thêm 2 fields: `transcript_coverage`, `step2b_warning` |
| `src/backend/transcripts/tasks.py` | Thêm constant `TRANSCRIPT_MIN_COVERAGE`, rename 2 helpers thành public (`get_audio_duration`, `get_last_transcript_timestamp`), verify block trong `task_transcribe_audio` |
| `src/backend/transcripts/admin.py` | Thêm `coverage_badge` (list), `transcript_coverage_display` + `step2b_warning_display` (detail) |
| `src/backend/transcripts/migrations/000X_...py` | Migration tự động từ `makemigrations` |
| `src/backend/transcripts/management/commands/transcript_backfill_coverage.py` | **Mới** — Batch job backfill `transcript_coverage` + `step2b_warning` cho jobs cũ |

---

## 5. Trade-off & Lưu Ý

| | |
|---|---|
| **Không auto-retry** | Warning không fail job. Admin tự quyết re-run step 2b. Lý do: trailing silence hoặc nhạc nền cuối video có thể làm coverage < 100% dù transcript đầy đủ. |
| **Tolerance 10% có thể chỉnh** | `TRANSCRIPT_MIN_COVERAGE = 0.90` là constant, dễ điều chỉnh nếu cần. |
| **Timestamp format** | Chỉ hoạt động với `[HH:MM:SS]`. Nếu thay đổi format prompt → cần update regex. |
| **ffprobe phải có** | Đã có trong Docker image (Feature 34 dùng). Không cần cài thêm. |
| **Verify failure không fail job** | `try/except` bao toàn bộ verify block — lỗi ffprobe hay parse chỉ set `step2b_warning`, không throw. |
| **Coverage check sau chunked merge** | Check trên `raw_transcript` đã merged → coverage toàn video. Không cần check từng chunk. |
| **audio_file có thể đã bị cleanup** | Nếu job cũ (>15 ngày), `audio_file_path` = None → ffprobe fail → `except` xử lý gracefully. |

---

## 6. Test Plan

### 6.1 Task `task_transcribe_audio` (step 2b — forward path)

1. **Video ngắn (<50 MB, jobs 1–3):** Chạy lại step 2b → coverage hiển thị ≥ 90% (xanh).
2. **Video dài (job 4, 112 MB):** Sau khi chunked transcription xong → coverage ≥ 90%.
3. **Simulate truncation:** Tạo transcript giả chỉ có timestamp đến 30% duration → admin thấy coverage đỏ + warning message.
4. **No timestamps:** Transcript không có `[HH:MM:SS]` → warning "Cannot verify completeness".
5. **Audio file expired:** Job cũ bị cleanup audio → `step2b_warning` = "Coverage check error: ..." nhưng job vẫn `DONE`.
6. **Admin list view:** `coverage_badge` hiển thị đúng màu xanh/đỏ/dash.
7. **Admin detail page:** `transcript_coverage_display` và `step2b_warning_display` hiển thị đúng trong fieldset Step 2b.

### 6.2 Batch Job `transcript_backfill_coverage`

8. **Dry-run:** Chạy `--dry-run` → output in ra trạng thái từng job, không có gì thay đổi trong DB (`transcript_coverage` vẫn NULL sau khi chạy).
9. **Backfill all eligible:** Sau migration, chạy command không có flag → tất cả jobs có `step2b_status=DONE` và `transcript_coverage=NULL` được fill. Kiểm tra DB: không còn row nào với `transcript_coverage IS NULL AND step2b_status=DONE`.
10. **Idempotent:** Chạy lại lần 2 → "Found 0 jobs to process." (không reprocess jobs đã có coverage).
11. **Specific job IDs:** `--job-ids 1 3` → chỉ jobs 1 và 3 được xử lý.
12. **Audio expired jobs:** Job cũ (> 15 ngày, audio đã bị xóa) → `step2b_warning = 'Coverage check error: ...'`, `transcript_coverage = NULL`. Command exit 0, không crash.
13. **Mixed batch:** Batch gồm jobs: OK coverage, WARN coverage, no timestamps, audio expired → output summary đúng (`ok=N warn=M err=K`).
