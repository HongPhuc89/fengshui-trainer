import hashlib

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from pyaxmlparser import APK

from users.models.base import BaseModel


class DatabaseBackupProxy(models.Model):
    """Unmanaged proxy model — no DB table. Used only to mount the admin backup page."""

    class Meta:
        managed = False
        verbose_name = "Database Backup"
        verbose_name_plural = "Database Backups"
        app_label = "core"


class AppRelease(BaseModel):
    """
    The single current Android build (feature-37). iOS updates go through
    TestFlight and are never tracked here.

    A singleton, not a history: `platform` is unique so the schema itself
    refuses a second row, and there is exactly one seeded by migration
    (feature-37 §3.1, §4). Uploading a new APK overwrites this row in place —
    version_code/version_name are never typed by hand, they are read straight
    out of the APK's own manifest (feature-37 §3.2).
    """

    PLATFORM_ANDROID = 'ANDROID'
    PLATFORM_CHOICES = [(PLATFORM_ANDROID, 'Android')]

    platform = models.CharField(
        max_length=10, choices=PLATFORM_CHOICES, default=PLATFORM_ANDROID, unique=True,
    )
    version_code = models.PositiveIntegerField(default=0, editable=False)
    version_name = models.CharField(max_length=32, default='0.0.0', editable=False)

    # Served from Bunny CDN, not Django storage (Supabase) — the APK is a
    # 60MB+ download onto a mobile connection, where Bunny's edge network is
    # materially faster than Supabase's. Fixed key per environment (not
    # per-version, unlike the PDF infographics in
    # videos/bunny_file_storage.py): AppRelease is a singleton, so there is
    # only ever one file to point at, and the env segment keeps a dev/staging
    # upload from overwriting the production APK on the same Bunny zone.
    bunny_key = models.CharField(max_length=255, blank=True, editable=False)
    file_size = models.BigIntegerField(default=0, editable=False)
    sha256 = models.CharField(max_length=64, blank=True, editable=False)

    release_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'App Release'
        verbose_name_plural = 'App Releases'

    def __str__(self):
        return f'{self.get_platform_display()} {self.version_name} ({self.version_code})'

    @classmethod
    def current(cls):
        """The one row, or None before it has ever been seeded/migrated."""
        return cls.objects.first()

    @staticmethod
    def apk_storage_key():
        """
        Bunny Storage key for the current environment's APK.

        Keyed by APP_ENV, not hardcoded to one path: production, staging and
        a developer's local Django all point at the same Bunny zone (shared
        credentials, see settings.BUNNY_STORAGE_*), so without this a local
        test upload would silently overwrite the real production APK.
        """
        return f'releases/{settings.APP_ENV}/huyenhoc.apk'

    @property
    def download_url(self):
        """Public Bunny CDN URL, or None if no APK has been published yet."""
        if not self.bunny_key:
            return None
        return f'https://{settings.BUNNY_STORAGE_CDN_HOSTNAME}/{self.bunny_key}'

    def read_version_from_apk(self, uploaded_file):
        """
        Parse version_code/version_name from the uploaded APK's own manifest,
        and reject anything that is not a real, newer build — before any write
        happens. Called from admin form validation (see admin.py), so a bad
        file never reaches storage or the database.

        pyaxmlparser(raw=True) needs the whole file in memory to parse the
        manifest anyway, so that same read is reused to compute sha256/size —
        no second pass over the upload.
        """
        uploaded_file.seek(0)
        data = uploaded_file.read()
        uploaded_file.seek(0)

        try:
            apk = APK(data, raw=True)
        except Exception as exc:
            raise ValidationError(f'Không đọc được file APK: {exc}')

        version_code, version_name = apk.version_code, apk.version_name
        if not version_code or not version_name:
            raise ValidationError('File APK không có thông tin version hợp lệ.')
        version_code = int(version_code)

        # Android itself refuses to install a lower versionCode over an
        # existing one, so publishing a non-increasing build only confuses —
        # there would be nothing for a device to actually upgrade to.
        if version_code <= self.version_code:
            raise ValidationError(
                f'versionCode trong file ({version_code}) phải lớn hơn bản đang '
                f'có ({self.version_code}).'
            )

        return version_code, version_name, hashlib.sha256(data).hexdigest(), len(data)
