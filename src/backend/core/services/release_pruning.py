"""Keeping only the newest few release binaries (feature-36 §5.2)."""

import logging

from django.conf import settings

from ..models import AppRelease

logger = logging.getLogger(__name__)


def prune_release_files(platform: str, keep: int | None = None) -> int:
    """
    Drop the binary of every build but the newest `keep` ones. Returns how many.

    Deletes the FILE, never the ROW. The row carries the history an admin needs
    — which version_code has been used, when, with what notes — and the
    (platform, version_code) constraint is what stops a number being reused.
    Deleting rows to save disk would trade a real safeguard for bytes.

    Rolling back does not need the old binary either: §5.1 established that the
    only way back is building a higher version_code from the old source, not
    re-serving an old APK.
    """
    keep = settings.APP_RELEASE_KEEP_FILES if keep is None else keep

    newest = list(
        AppRelease.objects.filter(platform=platform)
        .order_by('-version_code')
        .values_list('pk', flat=True)[:keep]
    )
    # Belt and braces: the build clients are being sent right now keeps its file
    # even if someone unpublished everything above it.
    current = AppRelease.current_for(platform)
    if current is not None:
        newest.append(current.pk)

    stale = (AppRelease.objects
             .filter(platform=platform)
             .exclude(pk__in=newest)
             .exclude(file=''))

    pruned = 0
    for release in stale:
        name = release.file.name
        release.file.delete(save=False)
        release.file = ''
        release.save(update_fields=['file', 'updated_at'])
        logger.info('Pruned release binary %s (%s %s)', name, platform, release.version_code)
        pruned += 1
    return pruned


def prune_all_platforms(keep: int | None = None) -> dict[str, int]:
    return {
        platform: prune_release_files(platform, keep)
        for platform, _ in AppRelease.PLATFORM_CHOICES
    }
