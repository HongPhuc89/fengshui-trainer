"""
Management command: renumber_video_files

Renumber video files in a folder sequentially (1., 2., 3., ...) following
natural filename order, replacing any existing leading number prefix.

    1. Quan trọng- củng cố kiến thức -1.mp4   →  1. Quan trọng- củng cố kiến thức -1.mp4
    1. Quan trọng- củng cố kiến thức -2.mp4   →  2. Quan trọng- củng cố kiến thức -2.mp4
    2. Tượng ý nâng cao thực chiến-1.mp4      →  5. Tượng ý nâng cao thực chiến-1.mp4

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py renumber_video_files <folder> [--ext mp4] [--dry-run]
"""

import re
import uuid
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

_PREFIX_RE = re.compile(r'^\d+\s*[.\-_)]\s*')


def _natural_key(name: str):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r'(\d+)', name)]


def build_plan(names: list[str]) -> list[tuple[str, str]]:
    ordered = sorted(names, key=_natural_key)
    return [(n, f'{i}. {_PREFIX_RE.sub("", n)}') for i, n in enumerate(ordered, 1)]


class Command(BaseCommand):
    help = 'Renumber video files in a folder sequentially (1., 2., ...) in natural name order.'

    def add_arguments(self, parser):
        parser.add_argument('folder', help='Folder containing the video files.')
        parser.add_argument('--ext', default='mp4', help='File extension to process (default: mp4).')
        parser.add_argument('--dry-run', action='store_true', help='Print the plan without renaming.')

    def handle(self, *args, **options):
        folder = Path(options['folder'])
        if not folder.is_dir():
            raise CommandError(f'Not a directory: {folder}')

        ext = '.' + options['ext'].lstrip('.').lower()
        names = [p.name for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ext]
        if not names:
            raise CommandError(f'No *{ext} files in {folder}')

        plan = [(old, new) for old, new in build_plan(names) if old != new]
        for old, new in plan:
            self.stdout.write(f'{old}  →  {new}')
        if not plan:
            self.stdout.write('Nothing to rename.')
            return
        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f'Dry run: {len(plan)} file(s) would be renamed.'))
            return

        # Two-phase rename so a target name never collides with a not-yet-renamed source.
        tmp = [(folder / old, folder / f'.renumber-{uuid.uuid4().hex}{ext}', folder / new) for old, new in plan]
        for src, mid, _ in tmp:
            src.rename(mid)
        for _, mid, dst in tmp:
            mid.rename(dst)

        self.stdout.write(self.style.SUCCESS(f'Renamed {len(plan)} file(s).'))
