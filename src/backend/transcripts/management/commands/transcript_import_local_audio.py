"""
Management command: transcript_import_local_audio

Scan a local folder for audio files and optionally create TranscriptJob records
with source_type=LOCAL_AUDIO. Optionally attach a YouTube playlist URL.

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py transcript_import_local_audio /path/to/audio/folder

Options:
    --playlist-url URL    YouTube playlist URL to attach to all created jobs
    --create              Create TranscriptJob records for each audio file found
    --limit N             Max number of files to process (default: no limit)

Examples:
    # Dry-run: list files found
    python manage.py transcript_import_local_audio /media/audio/lesson1/

    # Create jobs with a playlist link
    python manage.py transcript_import_local_audio /media/audio/lesson1/ \\
        --playlist-url https://www.youtube.com/playlist?list=PLxxx \\
        --create
"""

import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


SUPPORTED_EXTS = {'.mp3', '.wav', '.m4a', '.ogg', '.flac'}

MIME_MAP = {
    '.mp3':  'audio/mpeg',
    '.wav':  'audio/wav',
    '.m4a':  'audio/mp4',
    '.ogg':  'audio/ogg',
    '.flac': 'audio/flac',
}


def scan_audio_files(folder: str, limit: int | None) -> list[dict]:
    """Return sorted list of audio files found directly inside folder."""
    if not os.path.isdir(folder):
        raise CommandError(f'Folder not found: {folder}')

    files = []
    for entry in sorted(os.scandir(folder), key=lambda e: e.name):
        if not entry.is_file():
            continue
        ext = os.path.splitext(entry.name)[1].lower()
        if ext not in SUPPORTED_EXTS:
            continue
        files.append({
            'path': entry.path,
            'name': entry.name,
            'title': os.path.splitext(entry.name)[0],
            'ext':   ext,
            'size':  entry.stat().st_size,
        })
        if limit and len(files) >= limit:
            break
    return files


def _copy_audio_to_media(src_path: str, job_pk: int, ext: str) -> str:
    """
    Copy audio file into MEDIA_ROOT/transcripts/<pk>/audio<ext>.
    Returns the relative path (relative to MEDIA_ROOT).
    """
    dest_dir  = os.path.join(settings.MEDIA_ROOT, 'transcripts', str(job_pk))
    dest_name = f'audio{ext}'
    dest_path = os.path.join(dest_dir, dest_name)
    os.makedirs(dest_dir, exist_ok=True)
    shutil.copy2(src_path, dest_path)
    return f'transcripts/{job_pk}/{dest_name}'


class Command(BaseCommand):
    help = 'Scan a local folder for audio files and create TranscriptJob records'

    def add_arguments(self, parser):
        parser.add_argument('folder', help='Path to folder containing audio files')
        parser.add_argument(
            '--playlist-url',
            default='',
            help='YouTube playlist URL to attach to all created jobs',
        )
        parser.add_argument(
            '--create',
            action='store_true',
            help='Create TranscriptJob records and copy files into media root',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Max number of files to process (default: all)',
        )

    def handle(self, **options):
        from transcripts.models import SourceType, StepStatus, TranscriptJob
        from transcripts.tasks import task_upload_to_gemini

        folder       = os.path.abspath(options['folder'])
        playlist_url = options['playlist_url'].strip()
        limit        = options['limit']

        self.stdout.write(f'Scanning folder: {folder}')
        if playlist_url:
            self.stdout.write(f'Playlist URL:    {playlist_url}')

        audio_files = scan_audio_files(folder, limit)

        if not audio_files:
            self.stdout.write(self.style.WARNING(
                f'No supported audio files found in {folder}\n'
                f'Supported extensions: {", ".join(sorted(SUPPORTED_EXTS))}'
            ))
            return

        self.stdout.write(f'\nFound {len(audio_files)} audio file(s):')
        for i, f in enumerate(audio_files, 1):
            size_mb = f['size'] / (1024 * 1024)
            self.stdout.write(f'  [{i:>3}] {f["name"]}  ({size_mb:.1f} MB)')

        if not options['create']:
            self.stdout.write('\nTip: add --create to create TranscriptJob records')
            return

        self.stdout.write('')
        created_count = 0
        skipped_count = 0

        for f in audio_files:
            # Check for existing job by title to avoid duplicates (best-effort)
            if TranscriptJob.objects.filter(
                source_type=SourceType.LOCAL_AUDIO,
                title=f['title'],
            ).exists():
                self.stdout.write(f'  [EXISTS ] {f["name"][:70]}')
                skipped_count += 1
                continue

            try:
                with transaction.atomic():
                    job = TranscriptJob.objects.create(
                        source_type  = SourceType.LOCAL_AUDIO,
                        title        = f['title'],
                        playlist_url = playlist_url,
                        step1_status = StepStatus.SKIPPED,
                    )
                    rel_path = _copy_audio_to_media(f['path'], job.pk, f['ext'])
                    job.audio_file = rel_path
                    job.save(update_fields=['audio_file', 'updated_at'])

                    job_pk = job.pk
                    # task_upload_to_gemini internally triggers step2b, which triggers step3
                    transaction.on_commit(lambda pk=job_pk: task_upload_to_gemini.delay(pk))
            except (OSError, shutil.Error) as exc:
                self.stdout.write(self.style.ERROR(
                    f'  [ERROR  ] {f["name"][:60]} — could not copy file: {exc}'
                ))
                continue

            self.stdout.write(
                f'  [{self.style.SUCCESS("CREATED")}] job #{job.pk} — {f["name"][:60]}'
            )
            created_count += 1

        self.stdout.write('')
        self.stdout.write(f'Done. Created: {created_count}, Skipped (exists): {skipped_count}')
