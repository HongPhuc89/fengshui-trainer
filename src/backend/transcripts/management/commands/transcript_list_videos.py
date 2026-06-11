"""
Management command: transcript_list_videos

Fetch video list from a YouTube URL (single video or playlist) using yt-dlp
and optionally create TranscriptJob records.

Usage:
    docker-compose -f docker/docker-compose.yml exec web \\
        python manage.py transcript_list_videos <url>

Options:
    --limit N     Max number of videos to list (default: 10)
    --create      Create TranscriptJob records for each video found
"""

import subprocess
from django.core.management.base import BaseCommand, CommandError


def fetch_video_list(url: str, limit: int) -> list[dict]:
    cmd = [
        'yt-dlp',
        '--flat-playlist',
        '--print', '%(webpage_url)s\t%(title)s',
        '--no-warnings',
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise CommandError(f'yt-dlp failed: {result.stderr[:500]}')

    videos = []
    for line in result.stdout.strip().splitlines():
        if '\t' not in line:
            continue
        video_url, title = line.split('\t', 1)
        videos.append({'url': video_url.strip(), 'title': title.strip()})
        if len(videos) >= limit:
            break
    return videos


class Command(BaseCommand):
    help = 'List videos from a YouTube URL; optionally create TranscriptJob records'

    def add_arguments(self, parser):
        parser.add_argument('url', help='YouTube video or playlist URL')
        parser.add_argument('--limit', type=int, default=200, help='Max videos to list (default: 200)')
        parser.add_argument('--create', action='store_true', help='Create TranscriptJob for each video')

    def handle(self, *args, **options):
        from transcripts.models import TranscriptJob

        url = options['url']
        self.stdout.write(f'Fetching from: {url}')

        videos = fetch_video_list(url, options['limit'])
        if not videos:
            self.stdout.write(self.style.WARNING('No videos found'))
            return

        self.stdout.write(f'\nFound {len(videos)} video(s):')
        for i, v in enumerate(videos, 1):
            self.stdout.write(f'  [{i}] {v["title"]}')
            self.stdout.write(f'       {v["url"]}')

        if not options['create']:
            self.stdout.write('\nTip: add --create to create TranscriptJob records')
            return

        self.stdout.write('')
        is_playlist = 'list=' in url or 'playlist' in url
        for v in videos:
            job, created = TranscriptJob.objects.get_or_create(
                youtube_url=v['url'],
                defaults={
                    'title': v['title'],
                    'playlist_url': url if is_playlist else '',
                },
            )
            tag = self.style.SUCCESS('CREATED') if created else 'EXISTS '
            self.stdout.write(f'  [{tag}] job #{job.pk} — {job.title[:60]}')
