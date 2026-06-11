"""
Management command: transcript_translate

Step 3 — Translate raw_transcript (Chinese) to Vietnamese via Gemini.
Runs synchronously (no Celery needed).

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py transcript_translate --job-ids 1,2,3

Options:
    --job-ids 1,2,3   Job IDs to process (required)
    --force           Re-translate even if already DONE
    --show-full       Print full translated_transcript instead of preview
"""

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Step 3: Translate raw_transcript to Vietnamese for TranscriptJob(s)'

    def add_arguments(self, parser):
        parser.add_argument('--job-ids', required=True, help='Comma-separated job IDs')
        parser.add_argument('--force', action='store_true', help='Re-run even if already DONE')
        parser.add_argument('--show-full', action='store_true', help='Print the full translation')

    def handle(self, *args, **options):
        from transcripts.models import TranscriptJob, StepStatus
        from transcripts.tasks import task_translate_transcript

        job_ids = [int(i.strip()) for i in options['job_ids'].split(',')]
        jobs = list(TranscriptJob.objects.filter(pk__in=job_ids))
        if not jobs:
            raise CommandError('No jobs found')

        for job in jobs:
            header = f'Job #{job.pk} — {job.title[:60] or job.youtube_url}'
            self.stdout.write(header)

            if not job.raw_transcript:
                self.stdout.write(self.style.WARNING('  step3: no raw_transcript — run step 2b first'))
                continue

            if job.step3_status == StepStatus.DONE and not options['force']:
                self.stdout.write(f'  step3: already DONE, skipping (use --force to re-translate)')
                if options['show_full']:
                    self.stdout.write(job.translated_transcript)
                else:
                    preview = job.translated_transcript[:300].replace('\n', ' ')
                    self.stdout.write(f'  preview: {preview}...')
                continue

            if options['force']:
                job.step3_status = StepStatus.PENDING
                job.step3_error = ''
                job.save(update_fields=['step3_status', 'step3_error', 'updated_at'])

            self.stdout.write('  step3: translating...', ending=' ')
            self.stdout.flush()

            task_translate_transcript(job.pk)
            job.refresh_from_db()

            if job.step3_status == StepStatus.DONE:
                self.stdout.write(self.style.SUCCESS('DONE'))
                if options['show_full']:
                    self.stdout.write(job.translated_transcript)
                else:
                    preview = job.translated_transcript[:300].replace('\n', ' ')
                    self.stdout.write(f'  preview: {preview}...')
            else:
                self.stdout.write(self.style.ERROR('FAILED'))
                self.stdout.write(f'  error: {job.step3_error[:400]}')
