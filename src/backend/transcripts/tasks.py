import logging
import os
import subprocess

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


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
    import google.genai as genai

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
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        # Open file as bytes to avoid ASCII encoding issues with non-ASCII filenames
        with open(job.audio_file_path, 'rb') as f:
            uploaded = client.files.upload(
                file=f,
                config={
                    'mime_type': 'audio/mpeg',
                    'display_name': f'job_{job_id}.mp3',
                },
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


@shared_task(bind=True, max_retries=0, soft_time_limit=1800)  # 30 minutes max
def task_transcribe_audio(self, job_id: int):
    """Step 2b: Transcribe Chinese audio via Gemini generate_content, save raw_transcript."""
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
            model=config.model,  # enum from TranscriptConfig, not user-typed
            contents=[file_ref, config.value],
        )
        job.raw_transcript = response.text
        job.step2b_status = StepStatus.DONE
        job.save(update_fields=['raw_transcript', 'step2b_status', 'updated_at'])
    except Exception as exc:
        _fail_step(job, 'step2b', str(exc))


@shared_task(bind=True, max_retries=0, soft_time_limit=600,
             rate_limit=None)  # rate_limit set dynamically from settings in apps.py
def task_translate_transcript(self, job_id: int):
    """Step 3: Translate Chinese raw_transcript to Vietnamese via Gemini."""
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
            model=config.model,  # enum from TranscriptConfig
            contents=[full_prompt],
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
