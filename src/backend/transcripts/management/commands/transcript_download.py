"""
Management command: transcript_download

Step 1 — Download audio from YouTube via yt-dlp for one or more TranscriptJobs.
Runs synchronously (no Celery needed).

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py transcript_download --job-ids 1,2,3

Options:
    --job-ids 1,2,3   Job IDs to process (required)
    --force           Re-download even if step1 is already DONE
"""

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Step 1: Download audio for TranscriptJob(s) synchronously'

    def add_arguments(self, parser):
        parser.add_argument('--job-ids', required=True, help='Comma-separated job IDs')
        parser.add_argument('--force', action='store_true', help='Re-run even if already DONE')

    def handle(self, *args, **options):
        from transcripts.models import TranscriptJob, StepStatus
        from transcripts.tasks import task_download_audio

        job_ids = [int(i.strip()) for i in options['job_ids'].split(',')]
        jobs = list(TranscriptJob.objects.filter(pk__in=job_ids))
        if not jobs:
            raise CommandError('No jobs found')

        for job in jobs:
            header = f'Job #{job.pk} — {job.title[:60] or job.youtube_url}'

            if job.step1_status == StepStatus.DONE and not options['force']:
                self.stdout.write(f'{header}')
                self.stdout.write(f'  step1: already DONE, skipping (use --force to re-run)')
                continue

            if options['force']:
                job.step1_status = StepStatus.PENDING
                job.step1_error = ''
                job.save(update_fields=['step1_status', 'step1_error', 'updated_at'])

            self.stdout.write(f'{header}')
            self.stdout.write(f'  step1: downloading...', ending=' ')
            self.stdout.flush()

            task_download_audio(job.pk)
            job.refresh_from_db()

            if job.step1_status == StepStatus.DONE:
                self.stdout.write(self.style.SUCCESS('DONE'))
                self.stdout.write(f'  audio_file: {job.audio_file}')
                self.stdout.write(f'  title:      {job.title}')
            else:
                self.stdout.write(self.style.ERROR('FAILED'))
                self.stdout.write(f'  error: {job.step1_error[:400]}')
