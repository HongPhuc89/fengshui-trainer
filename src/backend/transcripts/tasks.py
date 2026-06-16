import logging
import os
import subprocess
from datetime import datetime, timezone as dt_tz, timedelta

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_MAX_OUTPUT_TOKENS    = 65536
GEMINI_FILE_API_MODEL       = 'gemini-file-api'  # synthetic name to track file upload quota separately
TRANSCRIPT_MIN_COVERAGE     = 0.85               # warn if transcript covers < 85% of audio duration
TRANSCRIPT_ESCALATION_MODEL = 'gemini-3-flash-preview'  # model to retry step 2b when coverage is low

# Model fallback order for transcription: tried in sequence when primary model fails.
# Order: primary (from config) → 3.0-flash → 3-flash-preview → 3.0-flash-lite
# gemini-3.5-flash excluded — high failure rate in practice.
TRANSCRIBE_FALLBACK_MODELS = [
    'gemini-3.0-flash',
    'gemini-3-flash-preview',
    'gemini-3.0-flash-lite',
]


def get_audio_duration(audio_path: str) -> float:
    """Return audio duration in seconds via ffprobe."""
    import json
    probe = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', audio_path],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(probe.stdout)['format']['duration'])


def _parse_timestamps_to_seconds(text: str) -> 'tuple[list[float], str]':
    """Extract all valid timestamps from transcript text, return (sorted_seconds_list, format_tag).

    Detects format automatically:
    - [HH:MM:SS] / [ HH:MM:SS ] — standard (most transcripts)
    - [MM:SS:cs] — centiseconds in third field (third field ≥ 60)
    - [MM:SS]    — two-field fallback (some short clips)
    """
    import re

    three = re.findall(r'\[\s*(\d{1,3}):(\d{2}):(\d{2})\s*\]', text)
    two   = re.findall(r'\[\s*(\d{1,3}):(\d{2})\s*\]', text)

    three_vals: list[float] = []
    three_fmt = 'hms'
    if three:
        has_invalid_s = any(int(s) >= 60 for _, _, s in three)
        if has_invalid_s:
            three_fmt = 'msc'
            for m_str, s_str, _ in three:
                m, s = int(m_str), int(s_str)
                if s < 60:
                    three_vals.append(float(m * 60 + s))
        else:
            for h_str, m_str, s_str in three:
                h, m, s = int(h_str), int(m_str), int(s_str)
                if m < 60 and s < 60:
                    three_vals.append(float(h * 3600 + m * 60 + s))

    two_vals: list[float] = []
    if two:
        for m_str, s_str in two:
            m, s = int(m_str), int(s_str)
            if m < 60 and s < 60:
                two_vals.append(float(m * 60 + s))

    # Prefer whichever format has more timestamps; 3-field wins on tie.
    if three_vals and (not two_vals or len(three_vals) >= len(two_vals)):
        return sorted(three_vals), three_fmt
    if two_vals:
        return sorted(two_vals), 'ms'
    return [], ''


def get_last_transcript_timestamp(text: str) -> 'tuple[float, str] | tuple[None, None]':
    """Return (seconds, format) for the effective last timestamp in the transcript, or (None, None).

    Uses the 95th-percentile value instead of the raw maximum to filter out hallucinated
    timestamps that Gemini occasionally appends at the end (e.g. [08:58:58] after [00:08:54]
    in a 9-minute clip).  With ≥ 10 timestamps the p95 value is a stable estimate of where
    the transcript actually ends; with fewer timestamps the max is used directly.
    """
    secs, fmt = _parse_timestamps_to_seconds(text)
    if not secs:
        return None, None

    if len(secs) >= 10:
        # p95: take the value at the 95th percentile to discard outlier jumps at the tail
        idx = int(len(secs) * 0.95)
        return secs[idx], fmt
    return secs[-1], fmt


def _next_midnight_utc() -> datetime:
    now = datetime.now(dt_tz.utc)
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def _get_gemini_client(model_name: str, no_env_fallback: bool = False):
    """
    Pick best available (key, model) pair:
    1. Bulk-create usage rows for active keys missing one for this model.
    2. Reset RPD counters for rows past their reset time.
    3. Filter: key is_active, not exhausted, rpd_count < GEMINI_RPD_LIMIT.
    4. Sort LRU (key.last_used_at asc, nulls first).
    Returns (client, key_pk, usage_pk).
    Falls back to settings.GEMINI_API_KEY if no DB key available (unless no_env_fallback=True).
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

    # Fallback to env key (skipped when caller wants DB-only selection)
    if not no_env_fallback and settings.GEMINI_API_KEY:
        logger.warning(
            '_get_gemini_client: no DB key for model=%s, falling back to env GEMINI_API_KEY',
            model_name,
        )
        return genai.Client(api_key=settings.GEMINI_API_KEY), None, None

    raise RuntimeError(
        f'No Gemini API key available for model {model_name} — '
        f'all exhausted, RPD limit reached, or no env fallback.'
    )


def _has_db_key_for_model(model_name: str) -> bool:
    """Return True if at least one active, non-exhausted DB key exists for model_name."""
    from .models import TranscriptApiKey, TranscriptApiKeyUsage
    from django.utils import timezone
    from django.db import models as m

    now = timezone.now()
    rpd_limit = settings.GEMINI_RPD_LIMIT
    active_key_ids = set(TranscriptApiKey.objects.filter(is_active=True).values_list('pk', flat=True))
    if not active_key_ids:
        return False
    return TranscriptApiKeyUsage.objects.filter(
        api_key_id__in=active_key_ids,
        model_name=model_name,
        rpd_count__lt=rpd_limit,
    ).filter(
        m.Q(exhausted_until__isnull=True) | m.Q(exhausted_until__lte=now)
    ).exists()


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
    from django.utils import timezone
    setattr(job, f'{step}_status', StepStatus.FAILED)
    setattr(job, f'{step}_error', error_msg[:5000])
    setattr(job, f'{step}_finished_at', timezone.now())
    job.save(update_fields=[f'{step}_status', f'{step}_error', f'{step}_finished_at', 'updated_at'])
    logger.error('_fail_step: job %s %s FAILED: %s', job.pk, step, error_msg[:200])


@shared_task(bind=True, max_retries=0, soft_time_limit=600)
def task_download_audio(self, job_id: int):
    """Step 1: Download audio from YouTube via yt-dlp, save as MP3."""
    from .models import TranscriptJob, StepStatus
    from django.utils import timezone

    try:
        job = TranscriptJob.objects.get(pk=job_id)
    except TranscriptJob.DoesNotExist:
        return

    job.step1_status = StepStatus.PROCESSING
    job.step1_error = ''
    job.step1_started_at = timezone.now()
    job.step1_finished_at = None
    job.save(update_fields=['step1_status', 'step1_error', 'step1_started_at', 'step1_finished_at', 'updated_at'])

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
        job.step1_finished_at = timezone.now()
        job.save(update_fields=['audio_file', 'title', 'step1_status', 'step1_finished_at', 'updated_at'])

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

    # Gemini file still valid — no need to re-upload, but still queue step 2b
    if job.gemini_file_valid:
        now = timezone.now()
        job.step2a_status = StepStatus.SKIPPED
        job.step2a_started_at = now
        job.step2a_finished_at = now
        job.save(update_fields=['step2a_status', 'step2a_started_at', 'step2a_finished_at', 'updated_at'])
        task_transcribe_audio.apply_async(args=[job_id])
        logger.info('task_upload_to_gemini: job %s — file still valid, skipped upload, queued step 2b', job_id)
        return

    if job.step1_status not in (StepStatus.DONE, StepStatus.SKIPPED) or not job.audio_file:
        logger.error('task_upload_to_gemini: job %s step1 not done or skipped', job_id)
        return

    job.step2a_status = StepStatus.UPLOADING
    job.step2a_error = ''
    job.step2a_started_at = timezone.now()
    job.step2a_finished_at = None
    job.save(update_fields=['step2a_status', 'step2a_error', 'step2a_started_at', 'step2a_finished_at', 'updated_at'])

    key_pk = None
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
        job.step2a_finished_at = timezone.now()
        job.save(update_fields=[
            'gemini_file_uri', 'gemini_file_name', 'gemini_uploaded_at',
            'gemini_api_key_id', 'step2a_status', 'step2a_finished_at', 'updated_at',
        ])
        task_transcribe_audio.apply_async(args=[job_id])
        logger.info('task_upload_to_gemini: job %s — queued step 2b', job_id)
    except Exception as exc:
        logger.error('task_upload_to_gemini: job %s key_pk=%s FAILED: %s', job_id, key_pk, exc)
        _fail_step(job, 'step2a', str(exc))


def _get_finish_reason(response) -> str:
    return getattr(response.candidates[0], 'finish_reason', 'unknown') if response.candidates else 'no candidates'


def _transcribe_single_file(job, model: str, prompt: str) -> str:
    """Transcribe a single audio file already uploaded to Gemini (step 2a).

    Attempt order:
      1. config model + pinned key from step 2a
         - 429 → rotate key, same model
         - 500 / empty → escalate to TRANSCRIBE_FALLBACK_MODELS in order
      2..N. fallback model + fresh key (same key-retry logic)
    Raises if all attempts fail.
    """
    from google.genai.errors import ClientError as GeminiClientError

    models_to_try = [model] + TRANSCRIBE_FALLBACK_MODELS
    last_exc = None

    logger.info('[job %s] single-file transcribe start — file=%s models=%s',
                job.pk, job.gemini_file_name, models_to_try)

    # The upload key owns the Gemini file — must use it for files.get() throughout.
    upload_client, _upload_key_pk, _upload_usage_pk = _get_gemini_client_for_job(job)

    for attempt, m in enumerate(models_to_try):
        try:
            if attempt == 0:
                client, key_pk, usage_pk = upload_client, _upload_key_pk, _upload_usage_pk
            else:
                client, key_pk, usage_pk = _get_gemini_client(m)
            logger.info('[job %s] attempt %d/%d model=%s key_pk=%s — calling generate_content',
                        job.pk, attempt + 1, len(models_to_try), m, key_pk)
            # Always use upload_client to fetch the file — only the owning key has access
            file_ref = upload_client.files.get(name=job.gemini_file_name)
            try:
                response = client.models.generate_content(model=m, contents=[file_ref, prompt])
            except GeminiClientError as exc:
                if exc.code != 429:
                    raise
                logger.warning('[job %s] attempt %d 429 quota model=%s key_pk=%s — rotating key',
                               job.pk, attempt + 1, m, key_pk)
                _mark_key_model_exhausted(usage_pk)
                client, key_pk, usage_pk = _get_gemini_client(m)
                logger.info('[job %s] attempt %d retrying model=%s key_pk=%s',
                            job.pk, attempt + 1, m, key_pk)
                # Still use upload_client for files.get — rotated key cannot access the file
                file_ref = upload_client.files.get(name=job.gemini_file_name)
                response = client.models.generate_content(model=m, contents=[file_ref, prompt])

            if not response.text:
                raise ValueError(f'empty response (finish_reason={_get_finish_reason(response)})')
            logger.info('[job %s] attempt %d OK model=%s key_pk=%s — %d chars',
                        job.pk, attempt + 1, m, key_pk, len(response.text))
            return response.text

        except Exception as exc:
            last_exc = exc
            logger.warning('[job %s] attempt %d FAILED model=%s key_pk=%s — %s',
                           job.pk, attempt + 1, m, key_pk, exc)

    raise RuntimeError(f'All transcription attempts failed for single file: {last_exc}')


def _verify_coverage(job, job_id: int) -> None:
    """Compute transcript coverage from raw_transcript text and set job fields.

    Never raises — errors set a warning without failing the job.
    Caller is responsible for saving job fields.
    """
    try:
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
    except Exception as exc:
        job.transcript_coverage = None
        job.step2b_warning = f'Coverage check error: {str(exc)[:200]}'
        logger.warning('_verify_coverage: job %s check failed: %s', job_id, exc)


@shared_task(bind=True, max_retries=0, soft_time_limit=1800)  # 30 minutes max
def task_transcribe_audio(self, job_id: int, model_override: 'str | None' = None):
    """Step 2b: Transcribe Chinese audio via Gemini, save raw_transcript.

    Always attempts Gemini single-file upload. If Gemini rejects (e.g. file too large),
    the task fails normally — admin can then edit raw_transcript manually and trigger Step 3.
    model_override: if given, use this model instead of TranscriptConfig.model.
    """
    from .models import TranscriptJob, StepStatus, TranscriptConfig, ConfigType
    from django.utils import timezone as tz

    try:
        job = TranscriptJob.objects.get(pk=job_id)
    except TranscriptJob.DoesNotExist:
        return

    if job.step2a_status not in (StepStatus.DONE, StepStatus.SKIPPED) or not job.gemini_file_uri:
        logger.error('task_transcribe_audio: job %s step2a not done', job_id)
        return

    job.step2b_status = StepStatus.TRANSCRIBING
    job.step2b_error = ''
    job.step2b_started_at = tz.now()
    job.step2b_finished_at = None
    job.save(update_fields=['step2b_status', 'step2b_error', 'step2b_started_at', 'step2b_finished_at', 'updated_at'])

    try:
        config = TranscriptConfig.get(ConfigType.TRANSCRIPT_PROMPT)
        model = model_override or config.model

        job.raw_transcript = _transcribe_single_file(job, model, config.value)
        _verify_coverage(job, job_id)

        job.step2b_status = StepStatus.DONE
        job.step2b_finished_at = tz.now()
        job.step2b_model = model_override or ''
        job.save(update_fields=[
            'raw_transcript', 'step2b_status', 'step2b_finished_at', 'step2b_model',
            'transcript_coverage', 'step2b_warning', 'updated_at',
        ])

        coverage_ok = job.transcript_coverage is not None and job.transcript_coverage >= TRANSCRIPT_MIN_COVERAGE
        if coverage_ok:
            task_translate_transcript.apply_async(args=[job_id])
            logger.info('task_transcribe_audio: job %s coverage OK — queued step 3', job_id)
        elif job.step2b_model != TRANSCRIPT_ESCALATION_MODEL:
            logger.warning(
                'task_transcribe_audio: job %s coverage=%s — escalating to %s',
                job_id, job.transcript_coverage, TRANSCRIPT_ESCALATION_MODEL,
            )
            task_transcribe_audio.apply_async(args=[job_id], kwargs={'model_override': TRANSCRIPT_ESCALATION_MODEL})
        else:
            logger.warning(
                'task_transcribe_audio: job %s coverage=%s after escalation — giving up',
                job_id, job.transcript_coverage,
            )
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

    from django.utils import timezone as tz3
    job.step3_status = StepStatus.TRANSLATING
    job.step3_error = ''
    job.step3_started_at = tz3.now()
    job.step3_finished_at = None
    job.save(update_fields=['step3_status', 'step3_error', 'step3_started_at', 'step3_finished_at', 'updated_at'])

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
        job.step3_finished_at = tz3.now()
        job.save(update_fields=['translated_transcript', 'step3_status', 'step3_finished_at', 'updated_at'])
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
