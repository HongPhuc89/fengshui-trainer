"""How many handsets sit on each app version (feature-36 §6.4)."""

from django.db.models import Count

from users.models import MobileDevice

DEVICE_TYPE_BY_PLATFORM = {'ANDROID': 'ANDROID', 'IOS': 'IOS'}


def version_spread(platform: str):
    """
    Count live handsets per app_version, newest first.

    Reads MobileDevice.app_version, which apply_handset_metadata() refreshes on
    every login (claim and rebind alike), so this is the only view an admin has
    of what raising the floor would actually cut off. Without it the threshold
    is set blind.
    """
    return list(
        MobileDevice.objects
        .filter(status='ACTIVE', device_type=DEVICE_TYPE_BY_PLATFORM.get(platform, ''))
        .exclude(app_version__isnull=True)
        .exclude(app_version='')
        .values('app_version')
        .annotate(handsets=Count('id'))
        .order_by('-app_version')
    )
