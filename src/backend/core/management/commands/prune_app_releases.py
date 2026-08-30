"""Drop old release binaries, keeping the newest few per platform."""

from django.core.management.base import BaseCommand

from core.services.release_pruning import prune_all_platforms


class Command(BaseCommand):
    help = 'Delete the binaries of old app releases, keeping the newest N per platform.'

    def add_arguments(self, parser):
        parser.add_argument('--keep', type=int, default=None,
                            help='Override APP_RELEASE_KEEP_FILES.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would be pruned without deleting.')

    def handle(self, *args, **options):
        if options['dry_run']:
            from core.models import AppRelease
            from django.conf import settings
            keep = options['keep'] or settings.APP_RELEASE_KEEP_FILES
            for platform, label in AppRelease.PLATFORM_CHOICES:
                keepers = list(AppRelease.objects.filter(platform=platform)
                               .order_by('-version_code')
                               .values_list('version_code', flat=True)[:keep])
                stale = (AppRelease.objects.filter(platform=platform)
                         .exclude(version_code__in=keepers).exclude(file='')
                         .values_list('version_code', flat=True))
                self.stdout.write(f'{label}: giữ {keepers}, xoá file của {list(stale)}')
            return

        for platform, count in prune_all_platforms(options['keep']).items():
            self.stdout.write(self.style.SUCCESS(f'{platform}: đã xoá {count} file'))
