# Feature 37 — TranscriptChunk: Per-Chunk Transcript Storage

## 1. Mục tiêu

Thay thế việc merge tất cả chunks thành một string `raw_transcript` bằng cách lưu từng chunk riêng biệt trong model `TranscriptChunk`. Giải quyết các vấn đề hiện tại:

- Gemini trả về timestamp với nhiều format khác nhau giữa các chunk (`[HH:MM:SS]` vs `[MM:SS:cs]` vs `[MM:SS]`). Code hiện tại chỉ xử lý `[HH:MM:SS]` trong `_offset_transcript_timestamps`, dẫn đến mất offset cho các format khác.
- Không thể retry từng chunk riêng lẻ khi lỗi (phải chạy lại toàn bộ step 2b).
- Không có metadata per-chunk: không biết model nào được dùng, coverage ra sao, chunk nào có hallucination.
- `_verify_coverage` phải parse lại `raw_transcript` từ đầu thay vì tận dụng dữ liệu đã tính.

Sau feature này:
- Mỗi chunk được lưu với `ts_format`, `segments` (list `{start_secs, text}`) đã apply offset, `coverage`, `has_hallucination`, `model_used`.
- `raw_transcript` được rebuild từ `segments` (format chuẩn `[HH:MM:SS]`) — translation step nhận input nhất quán.
- `_verify_coverage` đọc `coverage` trực tiếp từ chunks thay vì re-parse text.
- Single-file flow (file nhỏ, không chunk) không bị ảnh hưởng — không tạo `TranscriptChunk`.

---

## 2. Phạm vi thay đổi (files affected)

| File | Action |
|------|--------|
| `src/backend/transcripts/models.py` | Thêm model `TranscriptChunk` |
| `src/backend/transcripts/migrations/0010_transcript_chunk.py` | Schema migration mới |
| `src/backend/transcripts/tasks.py` | Thêm `_parse_chunk_result`, sửa `_transcribe_one_chunk`, `_transcribe_chunked`, `_verify_coverage` |
| `src/backend/transcripts/admin.py` | Thêm `TranscriptChunkInline`, thêm vào `TranscriptJobAdmin.inlines` |

Không có thay đổi frontend. Không có thay đổi API. Không có data migration.

---

## 3. Database Schema

### 3.1 Model `TranscriptChunk` (mới)

Thêm vào `src/backend/transcripts/models.py` sau class `TranscriptJob`:

```python
class TsFormat(models.TextChoices):
    HMS = 'hms', '[HH:MM:SS] — hours:minutes:seconds'
    MSC = 'msc', '[MM:SS:cs] — minutes:seconds:centiseconds (third field ≥ 60)'
    MS  = 'ms',  '[MM:SS] — two-field fallback'
    UNKNOWN = '', 'Unknown / no timestamps detected'


class TranscriptChunk(models.Model):
    # --- Relations ---
    job = models.ForeignKey(
        TranscriptJob,
        on_delete=models.CASCADE,
        related_name='chunks',
        help_text='Parent TranscriptJob',
    )
    idx = models.PositiveSmallIntegerField(
        help_text='0-based chunk index within the job',
    )

    # --- Audio metadata ---
    offset_secs = models.PositiveIntegerField(
        help_text='Start offset of this chunk within the full audio, in seconds',
    )
    duration_secs = models.FloatField(
        help_text='Expected duration of this chunk in seconds (actual audio cut by ffmpeg)',
    )

    # --- Raw output from Gemini ---
    raw_text = models.TextField(
        blank=True, default='',
        help_text='Verbatim text returned by Gemini for this chunk, before any timestamp processing',
    )
    ts_format = models.CharField(
        max_length=10,
        choices=TsFormat.choices,
        default=TsFormat.UNKNOWN,
        blank=True,
        help_text='Timestamp format detected in raw_text',
    )

    # --- Parsed & normalised segments ---
    segments = models.JSONField(
        default=list,
        help_text=(
            'List of {"start_secs": float, "text": str} — '
            'timestamps already converted to absolute seconds (offset applied), '
            'hallucinated entries removed'
        ),
    )

    # --- Quality metadata ---
    model_used = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Gemini model that successfully returned this chunk (may differ from config if escalated)',
    )
    coverage = models.FloatField(
        null=True, blank=True,
        help_text=(
            'Ratio of last segment start_secs / duration_secs for this chunk. '
            'Null if no segments. Used for weighted coverage aggregation.'
        ),
    )
    has_hallucination = models.BooleanField(
        default=False,
        help_text='True if at least one timestamp was dropped by hallucination filter',
    )

    # --- Timestamps ---
    transcribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['job', 'idx']
        constraints = [
            models.UniqueConstraint(fields=['job', 'idx'], name='unique_transcriptchunk_job_idx'),
        ]
        indexes = [
            models.Index(fields=['job', 'idx'], name='idx_transcriptchunk_job_idx'),
        ]
        verbose_name = 'Transcript Chunk'
        verbose_name_plural = 'Transcript Chunks'

    def __str__(self):
        return f'Job {self.job_id} / chunk {self.idx} (+{self.offset_secs}s)'
```

**Lưu ý thiết kế:**
- `TsFormat` dùng `TextChoices` để tái sử dụng trong code và hiển thị trong admin.
- `segments` là `JSONField(default=list)` — không cần normalize schema ở DB level, parse xảy ra tại app layer.
- `coverage` nullable: chunk không có timestamp (Gemini trả về prose/silence) → `coverage=None`, `has_hallucination=False`.
- `raw_text` giữ nguyên để có thể debug hoặc re-parse nếu cần thay đổi logic sau này.

### 3.2 Migration

File: `src/backend/transcripts/migrations/0010_transcript_chunk.py`

```python
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('transcripts', '0009_update_transcript_prompt_v3'),
    ]

    operations = [
        migrations.CreateModel(
            name='TranscriptChunk',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job', models.ForeignKey(
                    help_text='Parent TranscriptJob',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='chunks',
                    to='transcripts.transcriptjob',
                )),
                ('idx', models.PositiveSmallIntegerField(
                    help_text='0-based chunk index within the job',
                )),
                ('offset_secs', models.PositiveIntegerField(
                    help_text='Start offset of this chunk within the full audio, in seconds',
                )),
                ('duration_secs', models.FloatField(
                    help_text='Expected duration of this chunk in seconds',
                )),
                ('raw_text', models.TextField(
                    blank=True, default='',
                    help_text='Verbatim text returned by Gemini for this chunk',
                )),
                ('ts_format', models.CharField(
                    blank=True, default='', max_length=10,
                    choices=[('hms', '[HH:MM:SS]'), ('msc', '[MM:SS:cs]'), ('ms', '[MM:SS]'), ('', 'Unknown')],
                    help_text='Timestamp format detected in raw_text',
                )),
                ('segments', models.JSONField(
                    default=list,
                    help_text='List of {"start_secs": float, "text": str}',
                )),
                ('model_used', models.CharField(
                    blank=True, default='', max_length=100,
                    help_text='Gemini model used for this chunk',
                )),
                ('coverage', models.FloatField(
                    null=True, blank=True,
                    help_text='last segment start_secs / duration_secs for this chunk',
                )),
                ('has_hallucination', models.BooleanField(
                    default=False,
                    help_text='True if at least one timestamp was dropped by hallucination filter',
                )),
                ('transcribed_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Transcript Chunk',
                'verbose_name_plural': 'Transcript Chunks',
                'ordering': ['job', 'idx'],
            },
        ),
        migrations.AddConstraint(
            model_name='transcriptchunk',
            constraint=models.UniqueConstraint(
                fields=['job', 'idx'],
                name='unique_transcriptchunk_job_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='transcriptchunk',
            index=models.Index(fields=['job', 'idx'], name='idx_transcriptchunk_job_idx'),
        ),
    ]
```

**Lưu ý:** Migration này chỉ là schema migration — không có data migration. Các `TranscriptJob` đã tồn tại sẽ không có `TranscriptChunk` records. Điều này chấp nhận được vì:
1. `_verify_coverage` có fallback về logic cũ khi không có chunks.
2. Nếu cần rebuild chunks cho job cũ, re-run step 2b là đủ.

---

## 4. Backend Changes

### 4.1 Hàm `_parse_chunk_result` (mới)

Thêm vào `tasks.py` sau hàm `_strip_hallucinated_timestamps`:

#### Mixed-format handling (edge case quan trọng)

Gemini đôi khi trả về **mixed format trong cùng một chunk** — ví dụ phần đầu dùng `[HH:MM:SS]`, phần cuối dùng `[MM:SS]`. `_parse_timestamps_to_seconds` chỉ detect một format cho cả chunk (format nào có nhiều timestamp hơn thắng), nên nếu chỉ dựa vào `ts_format` thì sẽ bỏ sót các dòng ở format thiểu số.

**Ví dụ thực tế từ transcript:**
```
[01:29:15]        ← hms, được detect là ts_format='hms'
已经发生了。
[03:08]           ← mm:ss — bị bỏ qua nếu chỉ check ts_format=='ms'
[04:26]           ← mm:ss — bị bỏ qua
```

**Giải pháp: per-line format detection với context guard**

Mỗi dòng được thử parse theo thứ tự ưu tiên:
1. Three-field `[A:B:C]` — luôn thử trước
   - Nếu `C < 60` và `B < 60`: `[HH:MM:SS]` → `A*3600 + B*60 + C`
   - Nếu `C >= 60`: `[MM:SS:cs]` → `A*60 + B` (ignore centiseconds)
2. Two-field `[A:B]` — fallback nếu three-field không match
   - Chỉ accept nếu `A < 60` và `B < 60` (đảm bảo là `[MM:SS]`, không phải `[HH:MM]` của video dài)
   - **Context guard**: chỉ accept nếu giá trị tính được (`A*60+B`) nằm trong `[prev_ts - 60, duration_secs * 1.05]` — tránh nhận nhầm số trang, footnote dạng `[12:34]`

`ts_format` trong field vẫn lưu format dominant (từ `_parse_timestamps_to_seconds`) để biết chunk này Gemini chủ yếu dùng format nào. Các dòng mixed-format được parse nhưng không thay đổi `ts_format`.

```python
def _parse_chunk_result(
    raw_text: str,
    offset_secs: int,
    duration_secs: float,
) -> dict:
    """Parse Gemini raw output for one chunk into normalised segments.

    Steps:
    1. Detect dominant ts_format using _parse_timestamps_to_seconds (for metadata).
    2. Parse each line with per-line format detection (handles mixed-format chunks).
       - Three-field [A:B:C]: hms or msc based on whether C >= 60.
       - Two-field [A:B]: accepted as [MM:SS] only when value fits within chunk duration
         and is plausibly sequential (context guard against false positives like footnotes).
    3. Filter hallucinated timestamps (> duration_secs * 1.05).
    4. Build segments list: [{"start_secs": float, "text": str}].
    5. Compute per-chunk coverage = last_segment_relative_ts / duration_secs.

    Returns dict:
        {
            "segments":          list[{"start_secs": float, "text": str}],
            "ts_format":         str,   # dominant format: 'hms' | 'msc' | 'ms' | ''
            "has_hallucination": bool,
            "coverage":          float | None,
        }
    """
    import re

    _, ts_format = _parse_timestamps_to_seconds(raw_text)
    limit = duration_secs * 1.05  # 5% tolerance

    segments: list[dict] = []
    has_hallucination = False
    current_ts_secs: float | None = None  # chunk-relative seconds of pending segment
    prev_ts_secs: float | None = None     # last successfully flushed chunk-relative ts

    three_pat = re.compile(r'^\[\s*(\d{1,3}):(\d{2}):(\d{2})\s*\](.*)', re.DOTALL)
    two_pat   = re.compile(r'^\[\s*(\d{1,3}):(\d{2})\s*\](.*)', re.DOTALL)

    def _try_parse_ts(line: str) -> 'tuple[float | None, str]':
        """Per-line timestamp extraction with mixed-format support.

        Returns (chunk_relative_secs, rest_text) or (None, original_line).
        """
        stripped = line.strip()

        # --- Three-field: [A:B:C] ---
        m3 = three_pat.match(stripped)
        if m3:
            a, b, c = int(m3.group(1)), int(m3.group(2)), int(m3.group(3))
            rest = m3.group(4).strip()
            if c >= 60:
                # [MM:SS:cs] — centiseconds in third field
                if b < 60:
                    return float(a * 60 + b), rest
            else:
                # [HH:MM:SS]
                if b < 60:
                    return float(a * 3600 + b * 60 + c), rest
            return None, line  # malformed (e.g. b >= 60)

        # --- Two-field fallback: [A:B] interpreted as [MM:SS] ---
        m2 = two_pat.match(stripped)
        if m2:
            mm, ss = int(m2.group(1)), int(m2.group(2))
            rest = m2.group(3).strip()
            if mm < 60 and ss < 60:
                ts = float(mm * 60 + ss)
                # Context guard: value must be within chunk duration
                # and not suspiciously far behind the last seen timestamp
                # (allow up to 60s backward for out-of-order edge case, but not more)
                lower = (prev_ts_secs - 60) if prev_ts_secs is not None else 0.0
                if lower <= ts <= limit:
                    return ts, rest

        return None, line

    pending_text_lines: list[str] = []

    def _flush_pending(ts_raw: float):
        """Flush pending text as a segment; apply offset and hallucination filter."""
        nonlocal has_hallucination, prev_ts_secs
        text_block = '\n'.join(pending_text_lines).strip()
        if ts_raw > limit:
            has_hallucination = True
            logger.warning(
                '_parse_chunk_result: dropping hallucinated ts=%.0fs (limit=%.0fs offset=%ds)',
                ts_raw, limit, offset_secs,
            )
            return
        segments.append({'start_secs': ts_raw + offset_secs, 'text': text_block})
        prev_ts_secs = ts_raw

    for line in raw_text.splitlines():
        ts_raw, rest = _try_parse_ts(line)
        if ts_raw is not None:
            if current_ts_secs is not None:
                _flush_pending(current_ts_secs)
            current_ts_secs = ts_raw
            pending_text_lines = [rest] if rest else []
        else:
            pending_text_lines.append(line)

    if current_ts_secs is not None:
        _flush_pending(current_ts_secs)

    coverage: float | None = None
    if segments:
        last_relative_ts = segments[-1]['start_secs'] - offset_secs
        coverage = round(last_relative_ts / duration_secs, 4) if duration_secs > 0 else None

    return {
        'segments':          segments,
        'ts_format':         ts_format,
        'has_hallucination': has_hallucination,
        'coverage':          coverage,
    }
```

**Tại sao không tái sử dụng `_strip_hallucinated_timestamps` trực tiếp?**

`_strip_hallucinated_timestamps` chỉ xử lý `[HH:MM:SS]` (regex `r'^\[\s*(\d{1,3}):(\d{2}):(\d{2})\s*\]'`) và trả về text string. Hàm mới cần:
- Xử lý cả 3 format (`hms`, `msc`, `ms`).
- Trả về structured segments thay vì raw text.
- Apply offset trong quá trình parse (thay vì pass qua `_offset_transcript_timestamps` sau).

Logic hallucination filter (threshold `duration_secs * 1.05`) được kế thừa nguyên vẹn.

**Tại sao không tái sử dụng `_offset_transcript_timestamps` trực tiếp?**

`_offset_transcript_timestamps` chỉ xử lý `[HH:MM:SS]` và trả về text. Việc apply offset được tích hợp vào `_parse_chunk_result` (cộng `offset_secs` vào `start_secs` ngay khi tạo segment) để tránh pass qua chuỗi text 2 lần.

### 4.2 `_transcribe_one_chunk` — thay đổi return type

**Hiện tại:** trả về `str` (raw text từ Gemini).

**Sau thay đổi:** trả về `dict`:

```python
def _transcribe_one_chunk(
    job_id: int,
    chunk: dict,
    idx: int,
    total: int,
    model: str,
    prompt: str,
) -> dict:
    """Upload one chunk, transcribe it, parse result into structured dict.

    Returns:
        {
            "raw_text":         str,
            "segments":         list[{"start_secs": float, "text": str}],
            "ts_format":        str,
            "model_used":       str,   # actual model that succeeded (may differ if escalated)
            "has_hallucination": bool,
            "coverage":         float | None,
        }
    """
```

Thay đổi bên trong hàm:
1. Giữ nguyên toàn bộ logic upload + `generate_content` + model escalation.
2. Thay `return response.text` bằng:
   ```python
   raw_text = response.text
   parsed = _parse_chunk_result(raw_text, chunk['offset_secs'], chunk['duration_secs'])
   return {
       'raw_text':          raw_text,
       'segments':          parsed['segments'],
       'ts_format':         parsed['ts_format'],
       'model_used':        m,          # m là biến loop từ models_to_try
       'has_hallucination': parsed['has_hallucination'],
       'coverage':          parsed['coverage'],
   }
   ```
3. Cập nhật log `'%d chars'` → `'%d chars, %d segments'`.

### 4.3 `_transcribe_chunked` — thay đổi lớn

**Signature không đổi:** `_transcribe_chunked(job_id, audio_path, model, prompt) -> str`

**Logic thay đổi:**

```python
def _transcribe_chunked(job_id: int, audio_path: str, model: str, prompt: str) -> str:
    """Split audio into chunks, transcribe each, bulk-create TranscriptChunk records.

    - Deletes all existing TranscriptChunk records for this job before creating new ones
      (ensures re-run step 2b gives clean state).
    - Bulk-creates TranscriptChunk after all chunks succeed.
    - Rebuilds raw_transcript from segments (normalised [HH:MM:SS] format).
    - Returns merged raw_transcript string (interface with task_transcribe_audio unchanged).
    """
    from .models import TranscriptChunk

    file_size_mb = os.path.getsize(audio_path) / 1024 / 1024
    chunks = _split_audio_into_chunks(audio_path, chunk_duration_secs=GEMINI_AUDIO_CHUNK_DURATION)
    total = len(chunks)
    logger.info('[job %s] chunked transcribe start — file=%.1fMB chunks=%d model=%s',
                job_id, file_size_mb, total, model)

    # Delete old chunks before creating new ones (idempotent re-run)
    deleted = TranscriptChunk.objects.filter(job_id=job_id).delete()
    if deleted[0]:
        logger.info('[job %s] deleted %d old TranscriptChunk records', job_id, deleted[0])

    chunk_results = []
    try:
        for idx, chunk in enumerate(chunks):
            result = _transcribe_one_chunk(job_id, chunk, idx, total, model, prompt)
            chunk_results.append((idx, chunk, result))
            os.remove(chunk['path'])
            logger.info('[job %s] chunk %d/%d done — %d segments model=%s hallucination=%s',
                        job_id, idx + 1, total, len(result['segments']),
                        result['model_used'], result['has_hallucination'])
    except Exception:
        leftovers = [c['path'] for c in chunks if os.path.exists(c['path'])]
        logger.warning('[job %s] error mid-chunked, cleaning up %d leftover file(s)', job_id, len(leftovers))
        for path in leftovers:
            try:
                os.remove(path)
            except OSError:
                pass
        raise

    # Bulk-create TranscriptChunk records
    chunk_objs = [
        TranscriptChunk(
            job_id=job_id,
            idx=idx,
            offset_secs=chunk['offset_secs'],
            duration_secs=chunk['duration_secs'],
            raw_text=result['raw_text'],
            ts_format=result['ts_format'],
            segments=result['segments'],
            model_used=result['model_used'],
            coverage=result['coverage'],
            has_hallucination=result['has_hallucination'],
        )
        for idx, chunk, result in chunk_results
    ]
    TranscriptChunk.objects.bulk_create(chunk_objs, batch_size=100)
    logger.info('[job %s] created %d TranscriptChunk records', job_id, len(chunk_objs))

    # Rebuild raw_transcript from segments
    raw_transcript = _build_raw_transcript_from_chunks(chunk_results)
    total_chars = len(raw_transcript)
    logger.info('[job %s] chunked transcribe done — %d chunks, %d total chars', job_id, total, total_chars)
    return raw_transcript
```

### 4.4 Hàm helper `_build_raw_transcript_from_chunks` (mới)

```python
def _build_raw_transcript_from_chunks(chunk_results: list) -> str:
    """Build raw_transcript string from list of (idx, chunk_meta, result_dict).

    Format per segment: "[HH:MM:SS]\\n{text}"
    Chunks separated by "\\n\\n".
    Timestamps normalised to HH:MM:SS using absolute start_secs.
    """
    def secs_to_hms(secs: float) -> str:
        total = int(secs)
        return f'{total // 3600:02d}:{(total % 3600) // 60:02d}:{total % 60:02d}'

    parts = []
    for idx, _chunk_meta, result in chunk_results:
        lines = []
        for seg in result['segments']:
            ts = secs_to_hms(seg['start_secs'])
            text = seg['text'].strip()
            lines.append(f'[{ts}]\n{text}')
        if lines:
            parts.append('\n'.join(lines))

    return '\n\n'.join(parts)
```

**Tại sao tách thành hàm riêng?**
Dễ test độc lập và dễ thay đổi format nếu cần sau này.

### 4.5 `_verify_coverage` — đọc từ chunks nếu có

```python
def _verify_coverage(job, job_id: int) -> None:
    """Compute transcript coverage ratio.

    Priority:
    1. If TranscriptChunk records exist for this job: compute weighted average coverage
       (weighted by duration_secs). Chunks with coverage=None are excluded from average
       but count toward total weight (penalises jobs with many empty chunks).
    2. Fallback (single-file flow or old jobs without chunks): parse raw_transcript text
       as before (existing logic, unchanged).

    Never raises — verification failure sets a warning but does not fail the job.
    """
    from .models import TranscriptChunk
    try:
        chunks = list(TranscriptChunk.objects.filter(job_id=job_id).order_by('idx'))

        if chunks:
            _verify_coverage_from_chunks(job, job_id, chunks)
        else:
            _verify_coverage_from_text(job, job_id)

    except Exception as exc:
        job.transcript_coverage = None
        job.step2b_warning = f'Coverage check error: {str(exc)[:200]}'
        logger.warning('_verify_coverage: job %s check failed: %s', job_id, exc)
```

**Tách thành 2 helper:**

```python
def _verify_coverage_from_chunks(job, job_id: int, chunks: list) -> None:
    """Compute coverage from TranscriptChunk records (weighted average by duration_secs)."""
    total_duration = sum(c.duration_secs for c in chunks)
    if total_duration <= 0:
        job.transcript_coverage = None
        job.step2b_warning = 'Cannot verify completeness: total chunk duration is zero.'
        return

    weighted_sum = sum(
        c.coverage * c.duration_secs
        for c in chunks
        if c.coverage is not None
    )
    # Chunks with coverage=None contribute 0 to weighted_sum but full duration_secs to total
    coverage = weighted_sum / total_duration
    coverage = round(coverage, 4)

    job.transcript_coverage = coverage
    if coverage < TRANSCRIPT_MIN_COVERAGE:
        n_hallucinated = sum(1 for c in chunks if c.has_hallucination)
        n_empty = sum(1 for c in chunks if c.coverage is None)
        job.step2b_warning = (
            f'Transcript may be incomplete: weighted coverage={coverage:.1%} '
            f'({n_hallucinated} chunk(s) with hallucination, {n_empty} chunk(s) with no timestamps). '
            f'Consider re-running Step 2b.'
        )
        logger.warning('_verify_coverage: job %s coverage=%.1f%% from chunks — possible truncation', job_id, coverage * 100)
    else:
        job.step2b_warning = ''


def _verify_coverage_from_text(job, job_id: int) -> None:
    """Compute coverage from raw_transcript text (fallback for single-file flow)."""
    audio_duration = get_audio_duration(job.audio_file_path)
    last_ts, ts_fmt = get_last_transcript_timestamp(job.raw_transcript)

    if last_ts is None or audio_duration <= 0:
        job.transcript_coverage = None
        job.step2b_warning = 'Cannot verify completeness: no timestamps found in transcript.'
        logger.warning('_verify_coverage: job %s — no timestamps', job_id)
        return

    coverage = last_ts / audio_duration
    if coverage > 1.5:
        job.transcript_coverage = None
        job.step2b_warning = (
            f'Cannot verify coverage: last timestamp {last_ts:.0f}s far exceeds '
            f'audio duration {audio_duration:.0f}s. Transcript may reference a longer source.'
        )
        logger.warning(
            '_verify_coverage: job %s last_ts=%ds >> audio=%ds (fmt=%s) — skipping',
            job_id, last_ts, audio_duration, ts_fmt,
        )
        return

    job.transcript_coverage = round(coverage, 4)
    if coverage < TRANSCRIPT_MIN_COVERAGE:
        job.step2b_warning = (
            f'Transcript may be incomplete: last timestamp {last_ts:.0f}s '
            f'vs audio {audio_duration:.0f}s (coverage={coverage:.1%}). '
            f'Consider re-running Step 2b.'
        )
        logger.warning('_verify_coverage: job %s coverage=%.1f%% — possible truncation', job_id, coverage * 100)
    else:
        job.step2b_warning = ''
```

**Lưu ý:** Hàm `_verify_coverage` gốc (hiện tại) được thay thế hoàn toàn bằng version mới ở trên. Logic trong `_verify_coverage_from_text` là bản copy không thay đổi của logic gốc — chỉ được tách ra thành hàm riêng.

### 4.6 Format `raw_transcript` rebuilt từ `segments`

Sau khi rebuild qua `_build_raw_transcript_from_chunks`:
```
[00:00:05]
<text line 1 of segment 0>
<text line 2 of segment 0>

[00:01:30]
<text of segment 1>

...

[00:45:12]
<text of last segment in chunk 0>

[00:45:45]
<first segment of chunk 1>
```

- Mỗi segment: `[HH:MM:SS]\n{text}` (normalize về HH:MM:SS sau khi đã apply offset).
- Chunks ngăn cách bằng `\n\n`.
- Translation step (`task_translate_transcript`) nhận `job.raw_transcript` — interface không thay đổi.

---

## 5. Admin Changes

### 5.1 `TranscriptChunkInline` (mới)

Thêm vào `admin.py` trước class `TranscriptJobAdmin`:

```python
class TranscriptChunkInline(admin.TabularInline):
    model           = TranscriptChunk
    extra           = 0
    can_delete      = False
    show_change_link = False
    ordering        = ['idx']

    fields = [
        'idx', 'offset_hms', 'duration_secs', 'ts_format',
        'model_used', 'coverage_pct', 'has_hallucination',
        'segment_count', 'char_count',
    ]
    readonly_fields = [
        'idx', 'offset_hms', 'duration_secs', 'ts_format',
        'model_used', 'coverage_pct', 'has_hallucination',
        'segment_count', 'char_count',
    ]

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='Offset')
    def offset_hms(self, obj):
        s = obj.offset_secs
        return f'{s // 3600:02d}:{(s % 3600) // 60:02d}:{s % 60:02d}'

    @admin.display(description='Coverage')
    def coverage_pct(self, obj):
        if obj.coverage is None:
            return format_html('<span style="color:#aaa">—</span>')
        pct = obj.coverage * 100
        color = '#4caf50' if pct >= 80 else '#e53935'
        return format_html(
            '<span style="color:{};font-weight:bold">{:.1f}%</span>', color, pct,
        )

    @admin.display(description='Segments')
    def segment_count(self, obj):
        return len(obj.segments) if obj.segments else 0

    @admin.display(description='Chars')
    def char_count(self, obj):
        return len(obj.raw_text)
```

**Lưu ý:** `TranscriptChunk` phải được imported trong `admin.py`:
```python
from .models import TranscriptConfig, TranscriptJob, TranscriptApiKey, TranscriptApiKeyUsage, TranscriptChunk
```

### 5.2 `TranscriptJobAdmin` — thêm `inlines`

Thêm `inlines = [TranscriptChunkInline]` vào class `TranscriptJobAdmin`:

```python
@admin.register(TranscriptJob)
class TranscriptJobAdmin(admin.ModelAdmin):
    # ... existing code ...
    inlines = [TranscriptChunkInline]
    # ... rest unchanged ...
```

Thêm sau dòng `ordering = ['-created_at']` (trước `actions`).

---

## 6. Trade-off & Edge Cases

### 6.1 Single-file vs chunked
`TranscriptChunk` chỉ được tạo trong flow chunked (`_transcribe_chunked`). Single-file flow (`_transcribe_single_file`) không tạo chunk records. `_verify_coverage` tự detect qua `TranscriptChunk.objects.filter(job_id=job_id).exists()` — nếu không có records, fall back về text-parse logic.

### 6.2 Re-run step 2b
`_transcribe_chunked` bắt đầu bằng `TranscriptChunk.objects.filter(job_id=job_id).delete()`. Lý do dùng DELETE + recreate thay vì UPDATE:
- Số lượng chunks có thể thay đổi nếu audio được re-download với độ dài khác.
- Tránh dirty state nếu re-run thất bại giữa chừng (idempotent).
- Không có FK reference từ model khác đến `TranscriptChunk`.

### 6.3 `ts_format` khác nhau giữa các chunks
Mỗi chunk có `ts_format` riêng. `_parse_chunk_result` detect format per-chunk qua `_parse_timestamps_to_seconds`. Không cần đồng nhất format giữa các chunks vì `raw_transcript` rebuilt từ `segments` luôn dùng `[HH:MM:SS]`.

### 6.4 Chunk không có timestamp (empty/prose response)
- `_parse_chunk_result` trả về `segments=[]`, `coverage=None`, `has_hallucination=False`.
- `TranscriptChunk` được tạo với `segments=[]`, `coverage=None`.
- `_verify_coverage_from_chunks`: chunk này không đóng góp vào `weighted_sum` nhưng góp `duration_secs` vào `total_duration` → coverage bị kéo xuống.
- Warning message nêu rõ số chunks không có timestamp.

### 6.5 Chunk parse lỗi (exception trong `_parse_chunk_result`)
- `_parse_chunk_result` không raise — nó luôn trả về dict hợp lệ (dù `segments=[]`).
- Exception chỉ xảy ra ở level `_transcribe_one_chunk` (Gemini call fail) → được xử lý bởi escalation logic sẵn có.

### 6.6 `bulk_create` performance
`batch_size=100` được chỉ định dù thực tế mỗi job chỉ có ~3–10 chunks (45 phút/chunk, video dài nhất ~5 giờ = ~7 chunks). Không có vấn đề performance.

### 6.7 Admin inline performance
`TranscriptChunkInline` load tất cả chunks khi mở TranscriptJob detail page. Với ~7 rows per job, không cần pagination.

---

## 7. File Changes Summary

| File | Action | Mô tả |
|------|--------|-------|
| `src/backend/transcripts/models.py` | Sửa | Thêm class `TsFormat` (TextChoices) + model `TranscriptChunk` |
| `src/backend/transcripts/migrations/0010_transcript_chunk.py` | Tạo | Schema migration — CreateModel TranscriptChunk (với UniqueConstraint trong options), AddIndex |
| `src/backend/transcripts/tasks.py` | Sửa | Thêm `_parse_chunk_result`, `_build_raw_transcript_from_chunks`, `_verify_coverage_from_chunks`, `_verify_coverage_from_text`; sửa `_transcribe_one_chunk` (return dict), `_transcribe_chunked` (delete+bulk_create), `_verify_coverage` (dispatch sang 2 helpers) |
| `src/backend/transcripts/admin.py` | Sửa | Import `TranscriptChunk`; thêm `TranscriptChunkInline`; thêm `inlines = [TranscriptChunkInline]` vào `TranscriptJobAdmin` |

---

## 8. Implementation Checklist

### models.py
- [ ] Thêm class `TsFormat(models.TextChoices)` với 4 choices: `hms`, `msc`, `ms`, `''`
- [ ] Thêm model `TranscriptChunk` với đầy đủ fields như thiết kế
- [ ] Thêm `Meta`: `ordering`, `constraints` (UniqueConstraint), `indexes`, `verbose_name`
- [ ] Thêm `__str__`

### migrations
- [ ] Tạo file `0010_transcript_chunk.py`
- [ ] `dependencies = [('transcripts', '0009_update_transcript_prompt_v3')]`
- [ ] `CreateModel` với tất cả fields
- [ ] `CreateModel` bao gồm `constraints = [UniqueConstraint(fields=['job', 'idx'], name='unique_transcriptchunk_job_idx')]` trong `options`
- [ ] `AddIndex` `idx_transcriptchunk_job_idx`
- [ ] **Lưu ý:** Chạy `makemigrations` thực tế để sinh migration đúng; không copy-paste migration từ design doc

### tasks.py
- [ ] Thêm hàm `_parse_chunk_result(raw_text, offset_secs, duration_secs) -> dict`
- [ ] Thêm hàm `_build_raw_transcript_from_chunks(chunk_results) -> str`
- [ ] Sửa `_transcribe_one_chunk`: return dict `{raw_text, segments, ts_format, model_used, has_hallucination, coverage}`
- [ ] Sửa `_transcribe_chunked`: DELETE old chunks → loop → bulk_create → `_build_raw_transcript_from_chunks`
- [ ] Thêm `_verify_coverage_from_chunks(job, job_id, chunks)` (weighted average)
- [ ] Thêm `_verify_coverage_from_text(job, job_id)` (extracted từ logic cũ, không thay đổi)
- [ ] Sửa `_verify_coverage`: dispatch sang `_verify_coverage_from_chunks` hoặc `_verify_coverage_from_text`
- [ ] Cập nhật import `TranscriptChunk` trong `_transcribe_chunked` và `_verify_coverage`

### admin.py
- [ ] Import `TranscriptChunk` trong dòng import models
- [ ] Thêm class `TranscriptChunkInline(admin.TabularInline)` với fields: `idx`, `offset_hms`, `duration_secs`, `ts_format`, `model_used`, `coverage_pct`, `has_hallucination`, `segment_count`, `char_count`
- [ ] Thêm `inlines = [TranscriptChunkInline]` vào `TranscriptJobAdmin`

### Verification (manual test)
- [ ] Chạy `makemigrations` và `migrate` — không có lỗi
- [ ] Queue một job với chunked audio (> 50MB) — verify `TranscriptChunk` records được tạo đúng số lượng
- [ ] Kiểm tra admin: mở TranscriptJob detail → thấy inline table với chunks
- [ ] Re-run step 2b — verify chunks cũ bị xóa, chunks mới được tạo
- [ ] Queue một job với small audio (< 50MB, single-file flow) — verify không có `TranscriptChunk` records, coverage vẫn tính đúng
- [ ] Kiểm tra `raw_transcript` rebuilt từ chunks có format `[HH:MM:SS]` nhất quán
