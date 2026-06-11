import uuid
from django.db import models


class GeminiModel(models.TextChoices):
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
    youtube_url  = models.URLField(max_length=500)
    playlist_url = models.URLField(max_length=500, blank=True, default='')  # source playlist if any
    title        = models.CharField(max_length=500, blank=True, default='')

    # --- Step 1: Download ---
    audio_file   = models.CharField(max_length=500, blank=True, default='')  # relative path under MEDIA_ROOT
    step1_status = models.CharField(max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING)
    step1_error  = models.TextField(blank=True, default='')

    # --- Step 2a: Upload to Gemini File API ---
    gemini_file_uri    = models.CharField(max_length=500, blank=True, default='')  # file URI from Gemini
    gemini_file_name   = models.CharField(max_length=200, blank=True, default='')  # Gemini file name (for delete/get)
    gemini_uploaded_at = models.DateTimeField(null=True, blank=True)               # to calculate 48h expiry
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
