from django.apps import AppConfig


class TranscriptsConfig(AppConfig):
    name = 'transcripts'
    verbose_name = 'Transcripts'

    def ready(self):
        from django.conf import settings
        rpm = getattr(settings, 'GEMINI_RPM_LIMIT', 0)
        if rpm:
            from .tasks import task_transcribe_audio, task_translate_transcript
            task_transcribe_audio.rate_limit = f'{rpm}/m'
            task_translate_transcript.rate_limit = f'{rpm}/m'
