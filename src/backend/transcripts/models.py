import os
import uuid
from django.db import models
from .fields import EncryptedCharField


class SourceType(models.TextChoices):
    YOUTUBE     = 'YOUTUBE',     'YouTube URL'
    LOCAL_AUDIO = 'LOCAL_AUDIO', 'Local Audio Upload'


def _upload_to_temp(instance, filename):
    """Upload to a UUID-named temp folder; final path is set in admin save_model."""
    ext = os.path.splitext(filename)[1].lower() or '.audio'
    return f'transcripts/uploads/{uuid.uuid4()}/audio{ext}'


class TranscriptApiKey(models.Model):
    label         = models.CharField(max_length=100,
                        help_text='Display name, e.g. key-phuc-personal, key-work')
    api_key       = EncryptedCharField(max_length=200)
    is_active     = models.BooleanField(default=True,
                        help_text='Disable to pause key without deleting it')
    request_count = models.PositiveIntegerField(default=0,
                        help_text='Total requests used across all models (never resets)')
    last_used_at  = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Gemini API Key'
        verbose_name_plural = 'Gemini API Keys'
        ordering            = ['label']

    def __str__(self):
        return self.label


class TranscriptApiKeyUsage(models.Model):
    api_key         = models.ForeignKey(
                          TranscriptApiKey, on_delete=models.CASCADE,
                          related_name='usages')
    model_name      = models.CharField(max_length=100,
                          help_text='e.g. gemini-2.5-flash, gemini-file-api')
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


class GeminiModel(models.TextChoices):
    FLASH_35 = 'gemini-3.5-flash', 'Gemini 3.5 Flash'
    FLASH_30 = 'gemini-3-flash-preview', 'Gemini 3 Flash'
    FLASH_25 = 'gemini-2.5-flash', 'Gemini 2.5 Flash'
    FLASH_20 = 'gemini-2.0-flash', 'Gemini 2.0 Flash'
    PRO_25   = 'gemini-2.5-pro',   'Gemini 2.5 Pro'


class ConfigType(models.TextChoices):
    TRANSCRIPT_PROMPT = 'TRANSCRIPT_PROMPT', 'Transcript Prompt (Step 2b)'
    TRANSLATE_PROMPT  = 'TRANSLATE_PROMPT',  'Translate Prompt (Step 3)'


class StepStatus(models.TextChoices):
    PENDING      = 'PENDING',      'Pending'
    PROCESSING   = 'PROCESSING',   'Processing'    # step 1 download
    UPLOADING    = 'UPLOADING',    'Uploading'     # step 2a upload to Gemini
    TRANSCRIBING = 'TRANSCRIBING', 'Transcribing'  # step 2b generate transcript
    TRANSLATING  = 'TRANSLATING',  'Translating'   # step 3 translate
    DONE         = 'DONE',         'Done'
    FAILED       = 'FAILED',       'Failed'
    SKIPPED      = 'SKIPPED',      'Skipped'


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
        """Shortcut to get config by type, raises DoesNotExist if not found."""
        return cls.objects.get(type=config_type)


class TranscriptJob(models.Model):
    # --- Identity ---
    id   = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    # --- Input ---
    source_type    = models.CharField(
                         max_length=20, choices=SourceType.choices, default=SourceType.YOUTUBE)
    youtube_url    = models.URLField(max_length=500, blank=True, default='')
    uploaded_audio = models.FileField(
                         upload_to=_upload_to_temp, null=True, blank=True,
                         help_text='Upload an audio file (MP3/WAV/M4A, max 100 MB)')
    playlist_url   = models.URLField(max_length=500, blank=True, default='')  # source playlist if any
    title          = models.CharField(max_length=500, blank=True, default='')

    # --- Step 1: Download ---
    audio_file        = models.CharField(max_length=500, blank=True, default='')  # relative path under MEDIA_ROOT
    step1_status      = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step1_error       = models.TextField(blank=True, default='')
    step1_started_at  = models.DateTimeField(null=True, blank=True)
    step1_finished_at = models.DateTimeField(null=True, blank=True)

    # --- Step 2a: Upload to Gemini File API ---
    gemini_file_uri    = models.CharField(max_length=500, blank=True, default='')  # file URI from Gemini
    gemini_file_name   = models.CharField(max_length=200, blank=True, default='')  # Gemini file name (for delete/get)
    gemini_uploaded_at = models.DateTimeField(null=True, blank=True)               # to calculate 48h expiry
    gemini_api_key     = models.ForeignKey(                                         # key used to upload — step 2b must reuse it
                             'TranscriptApiKey', null=True, blank=True,
                             on_delete=models.SET_NULL, related_name='+')
    step2a_status      = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step2a_error       = models.TextField(blank=True, default='')
    step2a_started_at  = models.DateTimeField(null=True, blank=True)
    step2a_finished_at = models.DateTimeField(null=True, blank=True)

    # --- Step 2b: Transcribe (Chinese) ---
    raw_transcript      = models.TextField(blank=True, default='')  # Chinese + [HH:MM:SS] timestamps
    step2b_status       = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step2b_error        = models.TextField(blank=True, default='')
    step2b_started_at   = models.DateTimeField(null=True, blank=True)
    step2b_finished_at  = models.DateTimeField(null=True, blank=True)
    step2b_model        = models.CharField(max_length=100, blank=True, default='',
                              help_text='Gemini model used for last step 2b run')
    transcript_coverage = models.FloatField(
        null=True, blank=True,
        help_text='Ratio of last transcript timestamp / audio duration (0.0–1.0). Null if not verified.'
    )
    step2b_warning = models.TextField(
        blank=True, default='',
        help_text='Warning message if transcript appears incomplete. Does not fail the job.'
    )

    # --- Step 3: Translate (Vietnamese) ---
    translated_transcript = models.TextField(blank=True, default='')
    step3_status          = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step3_error           = models.TextField(blank=True, default='')
    step3_started_at      = models.DateTimeField(null=True, blank=True)
    step3_finished_at     = models.DateTimeField(null=True, blank=True)

    # --- Timestamps ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Transcript Job'
        verbose_name_plural = 'Transcript Jobs'
        indexes = [
            models.Index(fields=['uuid'], name='idx_transcriptjob_uuid'),
            models.Index(fields=['step1_status'], name='idx_transcriptjob_step1'),
            models.Index(fields=['-created_at'], name='idx_transcriptjob_created'),
        ]

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
        if any(s in (
            StepStatus.PROCESSING, StepStatus.UPLOADING,
            StepStatus.TRANSCRIBING, StepStatus.TRANSLATING,
        ) for s in statuses):
            return 'PROCESSING'
        return 'PENDING'

    @property
    def audio_file_path(self) -> 'str | None':
        if not self.audio_file:
            return None
        from django.conf import settings
        import os
        return os.path.join(settings.MEDIA_ROOT, self.audio_file)

    @property
    def gemini_file_valid(self) -> bool:
        """True if Gemini file is still within 48h since upload."""
        if not self.gemini_uploaded_at or not self.gemini_file_uri:
            return False
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() < self.gemini_uploaded_at + timedelta(hours=48)

    @property
    def audio_serve_mode(self) -> str:
        """
        Returns how to serve audio preview:
        - 'gemini'  : use gemini_file_uri (< 48h)
        - 'local'   : use /media/ local   (48h – 15 days)
        - 'expired' : file has been deleted (> 15 days)
        """
        from django.utils import timezone
        from datetime import timedelta
        if not self.created_at:
            return 'expired'
        age = timezone.now() - self.created_at
        if age <= timedelta(hours=48) and self.gemini_file_valid:
            return 'gemini'
        if age <= timedelta(days=15) and self.audio_file:
            return 'local'
        return 'expired'
