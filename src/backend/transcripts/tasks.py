import logging
import os
import subprocess
from datetime import datetime, timezone as dt_tz, timedelta

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_MAX_OUTPUT_TOKENS     = 65536
GEMINI_FILE_API_MODEL        = 'gemini-file-api'  # synthetic name to track file upload quota separately
GEMINI_AUDIO_SPLIT_THRESHOLD = 50 * 1024 * 1024   # 50 MB — split audio into chunks above this size
GEMINI_AUDIO_CHUNK_DURATION  = 2700                # 45 min/chunk → ~45 MB at 128kbps


def _split_audio_into_chunks(audio_path: str, chunk_duration_secs: int = 2700) -> list:
    """Split MP3 into chunks of chunk_duration_secs using ffmpeg. Returns list of {path, offset_secs}."""
    import json
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
            ['ffmpeg', '-y', '-i', audio_path, '-ss', str(offset),
             '-t', str(chunk_duration_secs), '-c', 'copy', chunk_path],
            capture_output=True, check=True,
        )
        chunks.append({'path': chunk_path, 'offset_secs': int(offset)})
        offset += chunk_duration_secs
        idx += 1
    return chunks


def _offset_transcript_timestamps(text: str, offset_secs: int) -> str:
    """Add chunk offset to every [HH:MM:SS] timestamp in transcript text."""
    import re
    if offset_secs == 0:
        return text

    def shift(match):
        h, m, s = int(match.group(1)), int(match.group(2)), int(match.group(3))
        total = h * 3600 + m * 60 + s + offset_secs
        return f'[{total // 3600:02d}:{(total % 3600) // 60:02d}:{total % 60:02d}]'

    return re.sub(r'\[(\d{2}):(\d{2}):(\d{2})\]', shift, text)


def _next_midnight_utc() -> datetime:
    now = datetime.now(dt_tz.utc)
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def _get_gemini_client(model_name: str):
    """
    Pick best available (key, model) pair:
    1. Bulk-create usage rows for active keys missing one for this model.
    2. Reset RPD counters for rows past their reset time.
    3. Filter: key is_active, not exhausted, rpd_count < GEMINI_RPD_LIMIT.
    4. Sort LRU (key.last_used_at asc, nulls first).
    Returns (client, key_pk, usage_pk).
    Falls back to settings.GEMINI_API_KEY if no DB key available.
    Raises RuntimeError if nothing available.
    """
    from .models import TranscriptApiKey, TranscriptApiKeyUsage
    from django.utils import timezone
    from django.db import models as m
    import google.genai as genai

    now = timezone.now()
    rpd_limit = settings.GEMINI_RPD_LIMIT

    # Bulk-create missing usage rows (2 queries, not N)
    existing_key_ids = set(
        TranscriptApiKeyUsage.objects.filter(model_name=model_name)
        .values_list('api_key_id', flat=True)
    )
    new_rows = [
        TranscriptApiKeyUsage(
            api_key_id=key_id,
            model_name=model_name,
            rpd_reset_at=_next_midnight_utc(),
        )
        for key_id in TranscriptApiKey.objects.filter(is_active=True)
            .exclude(pk__in=existing_key_ids)
            .values_list('pk', flat=True)
    ]
    if new_rows:
        TranscriptApiKeyUsage.objects.bulk_create(new_rows, ignore_conflicts=True)

    # Reset daily counters for rows past their reset time
    TranscriptApiKeyUsage.objects.filter(
        model_name=model_name,
        rpd_reset_at__lte=now,
    ).update(rpd_count=0, rpd_reset_at=_next_midnight_utc(), exhausted_until=None)

    # Pick best candidate (LRU, not exhausted, under RPD limit)
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
            '_get_gemini_client: no DB key for model=%s, falling back to env GEMINI_API_KEY',
            model_name,
        )
        return genai.Client(api_key=settings.GEMINI_API_KEY), None, None

    raise RuntimeError(
        f'No Gemini API key available for model {model_name} — '
        f'all exhausted, RPD limit reached, or no env fallback.'
    )


def _get_gemini_client_for_job(job) -> tuple:
    """
    Return (client, key_pk, None) using the key pinned to this job (job.gemini_api_key_id).
    Falls back to _get_gemini_client(GEMINI_FILE_API_MODEL) if no key is pinned.
    Used by step 2b to ensure it accesses files uploaded by step 2a with the same key.
    """
    import google.genai as genai
    if job.gemini_api_key_id:
        from .models import TranscriptApiKey
        try:
            key_obj = TranscriptApiKey.objects.get(pk=job.gemini_api_key_id, is_active=True)
            return genai.Client(api_key=key_obj.api_key), key_obj.pk, None
        except TranscriptApiKey.DoesNotExist:
            logger.warning(
                '_get_gemini_client_for_job: pinned key pk=%s not found/inactive, falling back',
                job.gemini_api_key_id,
            )
    return _get_gemini_client(GEMINI_FILE_API_MODEL)


def _mark_key_model_exhausted(usage_pk: 'int | None', retry_after_minutes: int = 60):
    """
    Mark a (key, model) usage row as exhausted for retry_after_minutes.
    No-op if usage_pk is None (env fallback key has no DB row).
    """
    if usage_pk is None:
        return
    from .models import TranscriptApiKeyUsage
    from django.utils import timezone

    TranscriptApiKeyUsage.objects.filter(pk=usage_pk).update(
        exhausted_until=timezone.now() + timedelta(minutes=retry_after_minutes),
    )
    logger.warning(
        '_mark_key_model_exhausted: usage pk=%s exhausted for %d min', usage_pk, retry_after_minutes,
    )


def _fail_step(job, step: str, error_msg: str):
    """Helper to mark a step as FAILED and save error message."""
    from .models import StepStatus
    setattr(job, f'{step}_status', StepStatus.FAILED)
    setattr(job, f'{step}_error', error_msg[:5000])
    job.save(update_fields=[f'{step}_status', f'{step}_error', 'updated_at'])
    logger.error('_fail_step: job %s %s FAILED: %s', job.pk, step, error_msg[:200])


@shared_task(bind=True, max_retries=0, soft_time_limit=600)
def task_download_audio(self, job_id: int):
    """Step 1: Download audio from YouTube via yt-dlp, save as MP3."""
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
        # Fetch title without downloading
        title_result = subprocess.run(
            ['yt-dlp', '--no-playlist', '--print', 'title', '--no-warnings', job.youtube_url],
            capture_output=True, text=True, timeout=60, check=True,
        )
        title = title_result.stdout.strip().splitlines()[0] if title_result.stdout.strip() else ''
        safe_title = ''.join(c if c.isalnum() or c in ' -_.' else '_' for c in title).strip() or 'audio'
        filename = f'{safe_title[:100]}.mp3'
        final_path = os.path.join(output_dir, filename)

        # Download audio directly to the final filename
        subprocess.run(
            [
                'yt-dlp',
                '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
                '--output', final_path.replace('.mp3', '.%(ext)s'),
                '--no-playlist',
                '--no-warnings',
                job.youtube_url,
            ],
            capture_output=True, text=True, timeout=600, check=True,
        )

        relative_path = os.path.join('transcripts', str(job_id), filename)
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


@shared_task(bind=True, max_retries=0, soft_time_limit=300)
def task_upload_to_gemini(self, job_id: int):
    """Step 2a: Upload MP3 to Gemini File API, save gemini_file_uri + gemini_uploaded_at."""
    from .models import TranscriptJob, StepStatus
    from django.utils import timezone
    from google.genai.errors import ClientError as GeminiClientError

    try:
        job = TranscriptJob.objects.get(pk=job_id)
    except TranscriptJob.DoesNotExist:
        return

    # Skip if file_uri is still valid (re-run doesn't need to re-upload)
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
        client, key_pk, usage_pk = _get_gemini_client(GEMINI_FILE_API_MODEL)
        try:
            # Open file as bytes to avoid ASCII encoding issues with non-ASCII filenames
            with open(job.audio_file_path, 'rb') as f:
                uploaded = client.files.upload(
                    file=f,
                    config={
                        'mime_type': 'audio/mpeg',
                        'display_name': f'job_{job_id}.mp3',
                    },
                )
        except GeminiClientError as _quota_exc:
            if _quota_exc.code != 429:
                raise
            _mark_key_model_exhausted(usage_pk)
            client, key_pk, usage_pk = _get_gemini_client(GEMINI_FILE_API_MODEL)
            with open(job.audio_file_path, 'rb') as f:
                uploaded = client.files.upload(
                    file=f,
                    config={
                        'mime_type': 'audio/mpeg',
                        'display_name': f'job_{job_id}.mp3',
                    },
                )
        job.gemini_file_uri    = uploaded.uri
        job.gemini_file_name   = uploaded.name
        job.gemini_uploaded_at = timezone.now()
        job.gemini_api_key_id  = key_pk  # step 2b must reuse this key to access the uploaded file
        job.step2a_status = StepStatus.DONE
        job.save(update_fields=[
            'gemini_file_uri', 'gemini_file_name', 'gemini_uploaded_at',
            'gemini_api_key_id', 'step2a_status', 'updated_at',
        ])
    except Exception as exc:
        _fail_step(job, 'step2a', str(exc))


@shared_task(bind=True, max_retries=0, soft_time_limit=1800)  # 30 minutes max
def task_transcribe_audio(self, job_id: int, model_override: 'str | None' = None):
    """Step 2b: Transcribe Chinese audio via Gemini generate_content, save raw_transcript.

    model_override: if given, use this model instead of TranscriptConfig.model.
    """
    from .models import TranscriptJob, StepStatus

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
        from google.genai.errors import ClientError as GeminiClientError
        config = TranscriptConfig.get(ConfigType.TRANSCRIPT_PROMPT)
        model = model_override or config.model

        audio_path = job.audio_file_path
        file_size = os.path.getsize(audio_path)

        if file_size <= GEMINI_AUDIO_SPLIT_THRESHOLD:
            # Must use the same key that uploaded the file in step 2a
            client, _key_pk, usage_pk = _get_gemini_client_for_job(job)
            file_ref = client.files.get(name=job.gemini_file_name)
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[file_ref, config.value],
                )
            except GeminiClientError as _quota_exc:
                if _quota_exc.code != 429:
                    raise
                _mark_key_model_exhausted(usage_pk)
                client, _key_pk, usage_pk = _get_gemini_client(model)
                file_ref = client.files.get(name=job.gemini_file_name)
                response = client.models.generate_content(
                    model=model,
                    contents=[file_ref, config.value],
                )
            if not response.text:
                finish = getattr(response.candidates[0], 'finish_reason', 'unknown') if response.candidates else 'no candidates'
                raise ValueError(f'Gemini returned empty transcript (finish_reason={finish})')
            job.raw_transcript = response.text
        else:
            chunks = _split_audio_into_chunks(audio_path, chunk_duration_secs=GEMINI_AUDIO_CHUNK_DURATION)
            logger.info('task_transcribe_audio: job %s split into %d chunks', job_id, len(chunks))
            parts = []
            for idx, chunk in enumerate(chunks):
                logger.info('task_transcribe_audio: job %s chunk %d/%d', job_id, idx + 1, len(chunks))
                client, _key_pk, usage_pk = _get_gemini_client(model)
                with open(chunk['path'], 'rb') as f:
                    uploaded = client.files.upload(
                        file=f,
                        config={'mime_type': 'audio/mpeg', 'display_name': f'job_{job_id}_chunk_{idx:03d}.mp3'},
                    )
                try:
                    response = client.models.generate_content(
                        model=model,
                        contents=[uploaded, config.value],
                    )
                except GeminiClientError as _quota_exc:
                    if _quota_exc.code != 429:
                        raise
                    _mark_key_model_exhausted(usage_pk)
                    client, _key_pk, usage_pk = _get_gemini_client(model)
                    response = client.models.generate_content(
                        model=model,
                        contents=[uploaded, config.value],
                    )
                if not response.text:
                    finish = getattr(response.candidates[0], 'finish_reason', 'unknown') if response.candidates else 'no candidates'
                    raise ValueError(f'Gemini returned empty transcript for chunk {idx} (finish_reason={finish})')
                parts.append(_offset_transcript_timestamps(response.text, chunk['offset_secs']))
                os.remove(chunk['path'])

            job.raw_transcript = '\n\n'.join(parts)

        job.step2b_status = StepStatus.DONE
        job.save(update_fields=['raw_transcript', 'step2b_status', 'updated_at'])
    except Exception as exc:
        _fail_step(job, 'step2b', str(exc))


@shared_task(bind=True, max_retries=0, soft_time_limit=600,
             rate_limit=None)  # rate_limit set dynamically from settings in apps.py
def task_translate_transcript(self, job_id: int, model_override: 'str | None' = None):
    """Step 3: Translate Chinese raw_transcript to Vietnamese via Gemini.

    model_override: if given, use this model instead of TranscriptConfig.model.
    """
    from .models import TranscriptJob, StepStatus
    from google.genai.types import GenerateContentConfig

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
        from google.genai.errors import ClientError as GeminiClientError
        config = TranscriptConfig.get(ConfigType.TRANSLATE_PROMPT)
        model = model_override or config.model

        full_prompt = (
            config.value
            + '\n\n---\n\nNội dung cần dịch:\n\n'
            + job.raw_transcript
        )
        client, _key_pk, usage_pk = _get_gemini_client(model)
        try:
            response = client.models.generate_content(
                model=model,
                contents=[full_prompt],
                config=GenerateContentConfig(max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS),
            )
        except GeminiClientError as _quota_exc:
            if _quota_exc.code != 429:
                raise
            _mark_key_model_exhausted(usage_pk)
            client, _key_pk, usage_pk = _get_gemini_client(model)
            response = client.models.generate_content(
                model=model,
                contents=[full_prompt],
                config=GenerateContentConfig(max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS),
            )
        job.translated_transcript = response.text
        job.step3_status = StepStatus.DONE
        job.save(update_fields=['translated_transcript', 'step3_status', 'updated_at'])
    except Exception as exc:
        _fail_step(job, 'step3', str(exc))


@shared_task
def task_cleanup_old_audio():
    """
    Celery beat periodic task: runs daily at 3AM.
    Deletes MP3 files for jobs older than 15 days to free disk space.
    """
    from .models import TranscriptJob
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=15)
    old_jobs = TranscriptJob.objects.filter(
        created_at__lt=cutoff,
        audio_file__gt='',  # only jobs that still have a file
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
                os.rmdir(output_dir)  # only deletes if directory is empty
            except OSError:
                pass  # directory not empty or doesn't exist, skip
        job.audio_file = ''
        job.save(update_fields=['audio_file', 'updated_at'])

    logger.info('task_cleanup_old_audio: deleted %d MP3 files', deleted_count)
