# Feature 34 — Transcript Chunked Translation (Video Dài 3+ Giờ)

## Document Information

- **Feature**: 34 — Chunked Transcription & Translation cho video dài
- **Version**: 2.0
- **Created**: 2026-06-12
- **Updated**: 2026-06-12
- **Status**: Draft — Pending PO Review
- **Author**: Technical Leader

---

## 1. Bối cảnh & Vấn đề

### 1.1 Lỗi quan sát được

Job #4 (video 3+ tiếng, file `童坤元奇门遁甲终身局---高级课程2.mp3`):

```
step2b: transcribing...
_fail_step: job 4 step2b FAILED:
500 INTERNAL. {'error': {'code': 500, 'message': 'An internal error has occurred.
Please retry or report in https://developers.generativeai.google/guide/troubleshooting',
'status': 'INTERNAL'}}
```

### 1.2 Root Cause

**Gemini API trả về 500 INTERNAL khi file audio quá lớn.**

File thực tế: **~112 MB**.

```
audio_file: transcripts/4/童坤元奇门遁甲终身局---高级課程2.mp3
file size: 117,515,132 bytes (~112 MB)
```

Khi Gemini nhận file quá lớn, server trả về HTTP 500 INTERNAL — không phải lỗi logic. **Không thể workaround bằng cách tăng timeout hay retry.**

**Dữ liệu thực tế từ các job đã chạy:**

| Job | File size | Kết quả step 2b |
|---|---|---|
| 1 | 12.2 MB | ✅ DONE |
| 2 | 21.2 MB | ✅ DONE |
| 3 | 34.3 MB | ✅ DONE |
| 4 | 112.1 MB | ❌ 500 INTERNAL |

Ngưỡng thực tế nằm đâu đó giữa **34 MB và 112 MB**. Google docs ghi 20 MB nhưng thực tế job 2 (21 MB) và job 3 (34 MB) đều chạy được — limit có thể phụ thuộc vào duration chứ không chỉ file size. Dùng **50 MB** làm ngưỡng split (conservative buffer).

### 1.3 Tại sao các phương án trước không áp dụng được

| Phương án đã xem xét | Lý do không khả thi |
|---|---|
| **Option A** — tăng `max_output_tokens=65536` | Chỉ fix bước translation (step 3), không giải quyết step 2b bị 500 |
| **Option D** — upgrade model (Flash → Pro) | Giới hạn file size là của File API, không phụ thuộc model |
| Tăng `soft_time_limit` | Lỗi xảy ra ngay lập tức (500), không phải timeout |
| Retry | 500 INTERNAL lặp lại với cùng file — không có tác dụng |

**Kết luận**: Bắt buộc phải tách file audio thành các chunk <20 MB trước khi upload lên Gemini.

---

## 2. Giải Pháp — Chunked Transcription + Translation

### Tổng quan

```
MP3 (112 MB, 3h)
   └─ ffmpeg split → chunk_01.mp3 (~18 MB, ~30 min)
                     chunk_02.mp3 (~18 MB, ~30 min)
                     ...
                     chunk_06.mp3 (~18 MB, ~30 min)
        ↓ (mỗi chunk)
   Gemini upload → transcribe (với timestamp offset) → ghép transcript
        ↓
   Gemini translate (Option A: max_output_tokens=65536)
        ↓
   translated_transcript lưu vào DB
```

### Tại sao ffmpeg?

- `ffmpeg` đã có trong Docker image (dùng cho `yt-dlp` audio extraction).
- Split theo thời gian (`-t 1800` = 30 phút/chunk) → đảm bảo file <20 MB.
- Không mất chất lượng audio (copy stream, không re-encode).

---

## 3. Chi Tiết Implement

### 3.1 Helper: Split MP3

```python
def _split_audio_into_chunks(audio_path: str, chunk_duration_secs: int = 2700) -> list[dict]:
    # chunk_duration_secs=2700 → ~45 min/chunk → ~45 MB at 128kbps, safely under 50 MB threshold
    """
    Split MP3 into chunks of chunk_duration_secs using ffmpeg.
    Returns list of {'path': str, 'offset_secs': int}.
    """
    import subprocess, json, os, tempfile

    # Get total duration via ffprobe
    probe = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', audio_path],
        capture_output=True, text=True, check=True,
    )
    duration = float(json.loads(probe.stdout)['format']['duration'])

    output_dir = os.path.dirname(audio_path)
    chunks = []
    offset = 0
    idx = 0

    while offset < duration:
        chunk_path = os.path.join(output_dir, f'chunk_{idx:03d}.mp3')
        subprocess.run(
            [
                'ffmpeg', '-y',
                '-i', audio_path,
                '-ss', str(offset),
                '-t', str(chunk_duration_secs),
                '-c', 'copy',           # no re-encode
                chunk_path,
            ],
            capture_output=True, check=True,
        )
        chunks.append({'path': chunk_path, 'offset_secs': int(offset)})
        offset += chunk_duration_secs
        idx += 1

    return chunks
```

### 3.2 Helper: Format Timestamp Offset

Transcript Gemini trả về dạng `[00:05:32] text...`. Cần cộng offset của chunk vào mỗi timestamp:

```python
import re

def _offset_transcript_timestamps(text: str, offset_secs: int) -> str:
    """Add chunk offset to every [HH:MM:SS] timestamp in transcript text."""
    if offset_secs == 0:
        return text

    def shift(match):
        h, m, s = int(match.group(1)), int(match.group(2)), int(match.group(3))
        total = h * 3600 + m * 60 + s + offset_secs
        return f'[{total // 3600:02d}:{(total % 3600) // 60:02d}:{total % 60:02d}]'

    return re.sub(r'\[(\d{2}):(\d{2}):(\d{2})\]', shift, text)
```

### 3.3 Sửa `task_transcribe_audio` (step 2b)

```python
@shared_task(bind=True, max_retries=0, soft_time_limit=3600)  # tăng từ 1800 → 3600 (1h)
def task_transcribe_audio(self, job_id: int):
    """Step 2b: Transcribe audio via Gemini. Splits into chunks if file > GEMINI_MAX_AUDIO_BYTES."""
    from .models import TranscriptJob, StepStatus
    import google.genai as genai

    ...  # get job, check step2a, set TRANSCRIBING status (không đổi)

    try:
        from .models import TranscriptConfig, ConfigType
        config = TranscriptConfig.get(ConfigType.TRANSCRIPT_PROMPT)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        audio_path = job.audio_file_path
        file_size = os.path.getsize(audio_path)

        if file_size <= GEMINI_AUDIO_SPLIT_THRESHOLD:
            # Short video: single upload + transcribe (existing flow)
            file_ref = client.files.get(name=job.gemini_file_name)
            response = client.models.generate_content(
                model=config.model,
                contents=[file_ref, config.value],
            )
            if not response.text:
                finish = _get_finish_reason(response)
                raise ValueError(f'Gemini returned empty transcript (finish_reason={finish})')
            job.raw_transcript = response.text
        else:
            # Long video: split → upload each chunk → transcribe → merge
            chunks = _split_audio_into_chunks(audio_path, chunk_duration_secs=2700)
            logger.info('task_transcribe_audio: job %s split into %d chunks', job_id, len(chunks))
            parts = []
            for idx, chunk in enumerate(chunks):
                logger.info('task_transcribe_audio: job %s chunk %d/%d', job_id, idx + 1, len(chunks))
                with open(chunk['path'], 'rb') as f:
                    uploaded = client.files.upload(
                        file=f,
                        config={'mime_type': 'audio/mpeg', 'display_name': f'job_{job_id}_chunk_{idx:03d}.mp3'},
                    )
                response = client.models.generate_content(
                    model=config.model,
                    contents=[uploaded, config.value],
                )
                if not response.text:
                    finish = _get_finish_reason(response)
                    raise ValueError(f'Gemini returned empty transcript for chunk {idx} (finish_reason={finish})')
                parts.append(_offset_transcript_timestamps(response.text, chunk['offset_secs']))
                # Clean up chunk file after use
                os.remove(chunk['path'])

            job.raw_transcript = '\n\n'.join(parts)

        job.step2b_status = StepStatus.DONE
        job.save(update_fields=['raw_transcript', 'step2b_status', 'updated_at'])
    except Exception as exc:
        _fail_step(job, 'step2b', str(exc))
```

### 3.4 Sửa `task_translate_transcript` (step 3)

Áp dụng **Option A** (tăng max_output_tokens) — đã implement ở v1.0. Không cần thay đổi thêm.

```python
from google.genai.types import GenerateContentConfig

response = client.models.generate_content(
    model=config.model,
    contents=[full_prompt],
    config=GenerateContentConfig(max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS),  # đã có
)
```

### 3.5 Constants cần thêm

```python
# tasks.py — module level
GEMINI_MAX_OUTPUT_TOKENS = 65536                    # đã có
GEMINI_AUDIO_SPLIT_THRESHOLD = 50 * 1024 * 1024    # 50 MB — conservative threshold based on observed data
GEMINI_AUDIO_CHUNK_DURATION = 2700                  # 45 min/chunk → ~45 MB at 128kbps
```

---

## 4. Bảng So Sánh Phương Án (Updated)

| Tiêu chí | ~~Option A~~ (không đủ) | Option B — Chunked Transcription |
|---|---|---|
| **File 112 MB (3h)** | ❌ 500 INTERNAL — không thể upload | ✅ Split thành ~4 chunk × ~45 min |
| **File ≤50 MB (≤1h)** | ✅ Single call, không đổi | ✅ Không split, dùng flow cũ |
| **Chính xác timestamp** | N/A | ✅ Offset được cộng vào mỗi chunk |
| **Chi phí API** | N/A | ✅ Tương đương (tổng audio giống nhau) |
| **Thời gian xử lý** | N/A | ⚠️ Tuyến tính: 4 chunk × ~3 phút = ~12 phút |
| **Độ phức tạp code** | — | Trung bình (2 helper functions) |
| **Files cần sửa** | — | 1 (`tasks.py`) |
| **Migration DB** | — | Không |

---

## 5. Test Plan

1. Re-run job #4 (file 112 MB) → expect log: `split into 4 chunks`, `chunk 1/4` ... `chunk 4/4`
2. Kiểm tra `raw_transcript`: timestamp đầu tiên `[00:00:xx]`, timestamp cuối cùng ~`[02:5x:xx]`
3. Kiểm tra chunk files bị cleanup (không còn `chunk_*.mp3` trong `transcripts/4/`)
4. Video ≤50 MB (jobs 1–3): vẫn dùng flow cũ (single upload) — không bị ảnh hưởng

---

## 6. Files Cần Sửa

| File | Thay đổi |
|---|---|
| `src/backend/transcripts/tasks.py` | Thêm `GEMINI_MAX_AUDIO_BYTES`, `_split_audio_into_chunks()`, `_offset_transcript_timestamps()`, sửa `task_transcribe_audio` (conditional split), tăng `soft_time_limit=3600` |
