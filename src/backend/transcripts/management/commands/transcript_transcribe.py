"""
Management command: transcript_transcribe

Step 2a + 2b — Upload MP3 to Gemini File API then transcribe Chinese audio.
Runs synchronously (no Celery needed).

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py transcript_transcribe --job-ids 1,2,3

Options:
    --job-ids 1,2,3    Job IDs to process (required)
    --skip-upload      Skip step 2a (use existing gemini_file_uri)
    --force            Re-run even if already DONE
"""

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Step 2a+2b: Upload to Gemini and transcribe for TranscriptJob(s)'

    def add_arguments(self, parser):
        parser.add_argument('--job-ids', required=True, help='Comma-separated job IDs')
        parser.add_argument('--skip-upload', action='store_true', help='Skip step 2a upload')
        parser.add_argument('--force', action='store_true', help='Re-run even if already DONE')

    def handle(self, *args, **options):
        from transcripts.models import TranscriptJob, StepStatus
        from transcripts.tasks import task_upload_to_gemini, task_transcribe_audio

        job_ids = [int(i.strip()) for i in options['job_ids'].split(',')]
        jobs = list(TranscriptJob.objects.filter(pk__in=job_ids))
        if not jobs:
            raise CommandError('No jobs found')

        for job in jobs:
            header = f'Job #{job.pk} — {job.title[:60] or job.youtube_url}'
            self.stdout.write(header)

            # --- Step 2a: Upload ---
            if options['skip_upload']:
                self.stdout.write('  step2a: skipped (--skip-upload)')
            elif job.step2a_status in (StepStatus.DONE, StepStatus.SKIPPED) and not options['force']:
                self.stdout.write(f'  step2a: already {job.step2a_status}, skipping')
            else:
                if options['force']:
                    job.step2a_status = StepStatus.PENDING
                    job.step2a_error = ''
                    job.save(update_fields=['step2a_status', 'step2a_error', 'updated_at'])

                self.stdout.write('  step2a: uploading to Gemini...', ending=' ')
                self.stdout.flush()
                task_upload_to_gemini(job.pk)
                job.refresh_from_db()

                if job.step2a_status in (StepStatus.DONE, StepStatus.SKIPPED):
                    self.stdout.write(self.style.SUCCESS(job.step2a_status))
                    self.stdout.write(f'  gemini_file_uri:  {job.gemini_file_uri[:80]}')
                    self.stdout.write(f'  gemini_file_name: {job.gemini_file_name}')
                else:
                    self.stdout.write(self.style.ERROR('FAILED'))
                    self.stdout.write(f'  error: {job.step2a_error[:400]}')
                    continue

            # --- Step 2b: Transcribe ---
            if job.step2b_status == StepStatus.DONE and not options['force']:
                self.stdout.write(f'  step2b: already DONE, skipping')
            else:
                if options['force']:
                    job.step2b_status = StepStatus.PENDING
                    job.step2b_error = ''
                    job.save(update_fields=['step2b_status', 'step2b_error', 'updated_at'])

                self.stdout.write('  step2b: transcribing...', ending=' ')
                self.stdout.flush()
                task_transcribe_audio(job.pk)
                job.refresh_from_db()

                if job.step2b_status == StepStatus.DONE:
                    self.stdout.write(self.style.SUCCESS('DONE'))
                    preview = job.raw_transcript[:300].replace('\n', ' ')
                    self.stdout.write(f'  preview: {preview}...')
                else:
                    self.stdout.write(self.style.ERROR('FAILED'))
                    self.stdout.write(f'  error: {job.step2b_error[:400]}')
