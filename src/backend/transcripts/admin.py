import logging
import os
import subprocess

from django.contrib import admin, messages
from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import format_html

from .models import TranscriptConfig, TranscriptJob
from .tasks import (
    task_download_audio, task_upload_to_gemini,
    task_transcribe_audio, task_translate_transcript,
)

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


@admin.register(TranscriptConfig)
class TranscriptConfigAdmin(admin.ModelAdmin):
    list_display  = ['type', 'model', 'updated_at']
    readonly_fields = ['type', 'updated_at']  # type cannot be changed after creation
    fields = ['type', 'model', 'value', 'updated_at']

    def has_add_permission(self, request):
        return False  # edit only — 2 rows already created via migration

    def has_delete_permission(self, request, obj=None):
        return False  # config rows must not be deleted


@admin.register(TranscriptJob)
class TranscriptJobAdmin(admin.ModelAdmin):

    change_list_template = 'admin/transcripts/transcriptjob_changelist.html'

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
        job = get_object_or_404(TranscriptJob, pk=job_id)  # noqa: F841
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

    def import_playlist_view(self, request):
        """
        GET  → form to enter playlist URL
        POST (step=fetch) → fetch video list from yt-dlp, show checkbox table
        POST (step=confirm) → create TranscriptJob for selected videos
        """
        context = {
            **self.admin_site.each_context(request),
            'title': 'Import from YouTube Playlist',
        }

        if request.method == 'GET':
            return TemplateResponse(request, 'admin/transcripts/import_playlist.html', context)

        step = request.POST.get('step')

        # --- Step fetch: retrieve video list ---
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

        # --- Step confirm: create jobs ---
        if step == 'confirm':
            playlist_url   = request.POST.get('playlist_url', '')
            selected_urls  = request.POST.getlist('selected_videos')
            selected_titles = {
                url: request.POST.get(f'title_{url}', '')
                for url in selected_urls
            }

            if not selected_urls:
                messages.warning(request, 'No videos selected.')
                return redirect('admin:transcripts_import_playlist')

            # Check for existing jobs to avoid duplicates
            existing_urls = set(
                TranscriptJob.objects.filter(youtube_url__in=selected_urls)
                .values_list('youtube_url', flat=True)
            )

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

    # --- Audio Player ---
    @admin.display(description='Audio Preview')
    def audio_player(self, obj):
        mode = obj.audio_serve_mode
        if mode == 'gemini':
            # Gemini file URI cannot be streamed directly in browser
            # Show local audio player if file exists, fallback to info message
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

    # --- Cleanup audio file on delete ---
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
