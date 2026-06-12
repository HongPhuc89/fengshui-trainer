"""
Management command: transcript_bulk_run

Run the full pipeline (step 1 → 2a → 2b → 3) for all TranscriptJobs with id > MIN_JOB_ID.
Steps that are already DONE/SKIPPED are skipped unless --force is given.
Each step only runs if the previous step succeeded.

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py transcript_bulk_run

Options:
    --force       Re-run all steps even if already DONE/SKIPPED
    --dry-run     Print which jobs/steps would run without executing
    --limit N     Process at most N jobs (default: MAX_JOBS constant, 0 = unlimited)
    --step1       Run only step 1  (download audio)
    --step2a      Run only step 2a (upload to Gemini)
    --step2b      Run only step 2b (transcribe)
    --step3       Run only step 3  (translate)
    (no step flags = run all steps in order)
"""

from django.core.management.base import BaseCommand

MIN_JOB_ID = 4   # only process jobs with id > this value
MAX_JOBS   = 10  # max jobs per run (0 = unlimited); override with --limit


class Command(BaseCommand):
    help = f'Run full transcript pipeline for all jobs with id > {MIN_JOB_ID}'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-run steps even if already DONE or SKIPPED',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would run without executing anything',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            metavar='N',
            help=f'Process at most N jobs (default: MAX_JOBS={MAX_JOBS}, 0 = unlimited)',
        )
        parser.add_argument('--step1',  action='store_true', help='Run only step 1 (download)')
        parser.add_argument('--step2a', action='store_true', help='Run only step 2a (upload)')
        parser.add_argument('--step2b', action='store_true', help='Run only step 2b (transcribe)')
        parser.add_argument('--step3',  action='store_true', help='Run only step 3 (translate)')

    def handle(self, *args, **options):
        from transcripts.models import TranscriptJob, StepStatus
        from transcripts.tasks import (
            task_download_audio,
            task_upload_to_gemini,
            task_transcribe_audio,
            task_translate_transcript,
        )

        force   = options['force']
        dry_run = options['dry_run']

        # Resolve effective limit: --limit overrides MAX_JOBS; 0 means unlimited
        cli_limit = options['limit']
        if cli_limit is not None:
            limit = cli_limit if cli_limit > 0 else None
        else:
            limit = MAX_JOBS if MAX_JOBS > 0 else None

        # Determine which steps to run (default: all)
        any_step_flag = options['step1'] or options['step2a'] or options['step2b'] or options['step3']
        run_step1  = options['step1']  or not any_step_flag
        run_step2a = options['step2a'] or not any_step_flag
        run_step2b = options['step2b'] or not any_step_flag
        run_step3  = options['step3']  or not any_step_flag

        qs = TranscriptJob.objects.filter(pk__gt=MIN_JOB_ID).order_by('pk')
        if limit:
            qs = qs[:limit]
        jobs = list(qs)
        if not jobs:
            self.stdout.write(self.style.WARNING(f'No jobs found with id > {MIN_JOB_ID}'))
            return

        limit_label = f', limit={limit}' if limit else ' (unlimited)'
        self.stdout.write(
            f'Found {len(jobs)} job(s) with id > {MIN_JOB_ID}{limit_label}'
            + (' [DRY RUN]' if dry_run else '')
            + (' [FORCE]' if force else '')
        )
        self.stdout.write('')

        done_count = 0
        skipped_count = 0
        failed_count = 0

        for job in jobs:
            header = f'Job #{job.pk} — {job.title[:60] or job.youtube_url[:60]}'
            self.stdout.write(self.style.MIGRATE_HEADING(header))

            job_failed = False

            # --- Step 1: Download ---
            if run_step1:
                already_done = job.step1_status in (StepStatus.DONE, StepStatus.SKIPPED)
                if already_done and not force:
                    self.stdout.write(f'  step1 : already {job.step1_status}, skipping')
                elif dry_run:
                    self.stdout.write(f'  step1 : would run (current={job.step1_status})')
                else:
                    if force:
                        job.step1_status = StepStatus.PENDING
                        job.step1_error  = ''
                        job.save(update_fields=['step1_status', 'step1_error', 'updated_at'])

                    self.stdout.write('  step1 : downloading...', ending=' ')
                    self.stdout.flush()
                    task_download_audio(job.pk)
                    job.refresh_from_db()

                    if job.step1_status == StepStatus.DONE:
                        self.stdout.write(self.style.SUCCESS('DONE'))
                        self.stdout.write(f'          audio: {job.audio_file}')
                    else:
                        self.stdout.write(self.style.ERROR('FAILED'))
                        self.stdout.write(f'          error: {job.step1_error[:300]}')
                        failed_count += 1
                        job_failed = True

            if job_failed:
                continue

            # --- Step 2a: Upload to Gemini ---
            if run_step2a:
                already_done = job.step2a_status in (StepStatus.DONE, StepStatus.SKIPPED)
                if already_done and not force:
                    self.stdout.write(f'  step2a: already {job.step2a_status}, skipping')
                elif dry_run:
                    self.stdout.write(f'  step2a: would run (current={job.step2a_status})')
                else:
                    if force:
                        job.step2a_status = StepStatus.PENDING
                        job.step2a_error  = ''
                        job.save(update_fields=['step2a_status', 'step2a_error', 'updated_at'])

                    self.stdout.write('  step2a: uploading to Gemini...', ending=' ')
                    self.stdout.flush()
                    task_upload_to_gemini(job.pk)
                    job.refresh_from_db()

                    if job.step2a_status in (StepStatus.DONE, StepStatus.SKIPPED):
                        self.stdout.write(self.style.SUCCESS(job.step2a_status))
                    else:
                        self.stdout.write(self.style.ERROR('FAILED'))
                        self.stdout.write(f'          error: {job.step2a_error[:300]}')
                        failed_count += 1
                        job_failed = True

            if job_failed:
                continue

            # --- Step 2b: Transcribe ---
            if run_step2b:
                already_done = job.step2b_status == StepStatus.DONE
                if already_done and not force:
                    self.stdout.write(f'  step2b: already DONE, skipping')
                elif dry_run:
                    self.stdout.write(f'  step2b: would run (current={job.step2b_status})')
                else:
                    if force:
                        job.step2b_status = StepStatus.PENDING
                        job.step2b_error  = ''
                        job.save(update_fields=['step2b_status', 'step2b_error', 'updated_at'])

                    self.stdout.write('  step2b: transcribing...', ending=' ')
                    self.stdout.flush()
                    task_transcribe_audio(job.pk)
                    job.refresh_from_db()

                    if job.step2b_status == StepStatus.DONE:
                        self.stdout.write(self.style.SUCCESS('DONE'))
                        preview = job.raw_transcript[:200].replace('\n', ' ')
                        self.stdout.write(f'          preview: {preview}...')
                    else:
                        self.stdout.write(self.style.ERROR('FAILED'))
                        self.stdout.write(f'          error: {job.step2b_error[:300]}')
                        failed_count += 1
                        job_failed = True

            if job_failed:
                continue

            # --- Step 3: Translate ---
            if run_step3:
                already_done = job.step3_status == StepStatus.DONE
                if already_done and not force:
                    self.stdout.write(f'  step3 : already DONE, skipping')
                elif dry_run:
                    self.stdout.write(f'  step3 : would run (current={job.step3_status})')
                else:
                    if force:
                        job.step3_status = StepStatus.PENDING
                        job.step3_error  = ''
                        job.save(update_fields=['step3_status', 'step3_error', 'updated_at'])

                    self.stdout.write('  step3 : translating...', ending=' ')
                    self.stdout.flush()
                    task_translate_transcript(job.pk)
                    job.refresh_from_db()

                    if job.step3_status == StepStatus.DONE:
                        self.stdout.write(self.style.SUCCESS('DONE'))
                    else:
                        self.stdout.write(self.style.ERROR('FAILED'))
                        self.stdout.write(f'          error: {job.step3_error[:300]}')
                        failed_count += 1
                        job_failed = True

            if not job_failed:
                done_count += 1
            self.stdout.write('')

        # --- Summary ---
        self.stdout.write('─' * 60)
        self.stdout.write(
            f'Summary: {done_count} OK, {skipped_count} skipped, {failed_count} failed'
            + (' (dry run — nothing executed)' if dry_run else '')
        )
