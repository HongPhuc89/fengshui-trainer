"""
Management command: backfill transcript_coverage and step2b_warning for existing DONE jobs.

Usage:
    python manage.py transcript_backfill_coverage
    python manage.py transcript_backfill_coverage --dry-run
    python manage.py transcript_backfill_coverage --job-ids 1 2 5
"""
import logging

from django.core.management.base import BaseCommand

from transcripts.models import StepStatus, TranscriptJob
from transcripts.tasks import (
    TRANSCRIPT_MIN_COVERAGE,
    get_audio_duration,
    get_last_transcript_timestamp,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill transcript_coverage and step2b_warning for existing DONE jobs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print what would be updated without saving to DB',
        )
        parser.add_argument(
            '--job-ids', nargs='+', type=int,
            help='Only process specific job IDs (default: all eligible jobs). Note: still skips jobs that already have transcript_coverage set.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        job_ids = options.get('job_ids')

        qs = TranscriptJob.objects.filter(
            step2b_status=StepStatus.DONE,
            raw_transcript__gt='',
            transcript_coverage__isnull=True,
        ).order_by('id')

        if job_ids:
            qs = qs.filter(pk__in=job_ids)

        total = qs.count()
        self.stdout.write(f'Found {total} jobs to process. dry_run={dry_run}')

        ok_count = warn_count = err_count = 0

        for job in qs.iterator():
            audio_path = job.audio_file_path
            try:
                if not audio_path:
                    raise FileNotFoundError('audio_file_path is None')

                audio_duration = get_audio_duration(audio_path)
                last_ts, _fmt = get_last_transcript_timestamp(job.raw_transcript)

                if last_ts is not None and audio_duration > 0:
                    coverage = last_ts / audio_duration
                    if coverage > 1.5:
                        job.transcript_coverage = None
                        job.step2b_warning = (
                            f'Cannot verify coverage: last timestamp {last_ts:.0f}s far exceeds '
                            f'audio duration {audio_duration:.0f}s. Transcript may reference a longer source.'
                        )
                        err_count += 1
                    elif coverage < TRANSCRIPT_MIN_COVERAGE:
                        job.transcript_coverage = round(coverage, 4)
                        job.step2b_warning = (
                            f'Transcript may be incomplete: last timestamp {last_ts:.0f}s '
                            f'vs audio {audio_duration:.0f}s (coverage={coverage:.1%}). '
                            f'Consider re-running Step 2b.'
                        )
                        warn_count += 1
                    else:
                        job.transcript_coverage = round(coverage, 4)
                        job.step2b_warning = ''
                        ok_count += 1
                else:
                    job.transcript_coverage = None
                    job.step2b_warning = 'Cannot verify completeness: no timestamps found in transcript.'
                    err_count += 1

            except Exception as exc:
                job.transcript_coverage = None
                job.step2b_warning = f'Coverage check error: {str(exc)[:200]}'
                err_count += 1

            if job.transcript_coverage is not None and job.transcript_coverage >= TRANSCRIPT_MIN_COVERAGE:
                status = f'OK ({job.transcript_coverage:.1%})'
            elif job.transcript_coverage is not None:
                status = f'WARN ({job.transcript_coverage:.1%})'
            else:
                status = f'ERR: {job.step2b_warning[:80]}'

            self.stdout.write(f'  Job {job.pk}: {status}')

            if not dry_run:
                job.save(update_fields=['transcript_coverage', 'step2b_warning', 'updated_at'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. ok={ok_count} warn={warn_count} err={err_count} '
                f'({"dry-run, no changes saved" if dry_run else "saved"})'
            )
        )
