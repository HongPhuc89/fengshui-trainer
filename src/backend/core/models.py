from django.core.exceptions import ValidationError
from django.db import models

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
    One published build of the mobile app (feature-36 §5).

    version_code is the only value ever compared: it is the buildNumber from
    pubspec.yaml, which becomes Android versionCode and iOS CFBundleVersion, so
    both platforms already number from the same source. version_name is display
    only — comparing semver strings is how "1.10.0 < 1.9.0" bugs happen.
    """

    PLATFORM_ANDROID = 'ANDROID'
    PLATFORM_IOS = 'IOS'
    PLATFORM_CHOICES = [(PLATFORM_ANDROID, 'Android'), (PLATFORM_IOS, 'iOS')]

    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)
    version_code = models.PositiveIntegerField(
        help_text='Số sau dấu + trong pubspec.yaml (buildNumber). Chỉ tăng, không dùng lại.',
    )
    version_name = models.CharField(
        max_length=32, help_text='Ví dụ 1.2.0. Chỉ để hiển thị, không dùng để so sánh.',
    )
    min_supported_version_code = models.PositiveIntegerField(
        default=0,
        help_text='Client thấp hơn số này bị chặn. Bằng version_code = bản này bắt buộc.',
    )

    file = models.FileField(upload_to='releases/', help_text='APK cho Android, IPA cho iOS.')
    file_size = models.BigIntegerField(default=0)
    sha256 = models.CharField(max_length=64, blank=True)

    release_notes = models.TextField(blank=True)
    is_published = models.BooleanField(
        default=False, help_text='Chỉ bản đã publish mới được endpoint trả về.',
    )

    class Meta:
        verbose_name = 'App Release'
        verbose_name_plural = 'App Releases'
        ordering = ['platform', '-version_code']
        constraints = [
            models.UniqueConstraint(
                fields=['platform', 'version_code'],
                name='uniq_app_release_version_per_platform',
            ),
            # A floor above the ceiling blocks every client with nothing to
            # upgrade to — recoverable only by editing the database, so it is
            # refused at the schema and not merely on the form.
            models.CheckConstraint(
                condition=models.Q(min_supported_version_code__lte=models.F('version_code')),
                name='app_release_floor_below_ceiling',
            ),
        ]
        indexes = [
            models.Index(fields=['platform', 'is_published', '-version_code'],
                         name='idx_apprelease_lookup'),
        ]

    def __str__(self):
        return f'{self.get_platform_display()} {self.version_name} ({self.version_code})'

    @classmethod
    def current_for(cls, platform):
        """
        The release clients should be on: highest published version_code.

        No is_current flag: such a flag would need enforcing "only one true per
        platform", and max(version_code) already answers the same question.
        """
        return cls.objects.filter(platform=platform, is_published=True).order_by(
            '-version_code',
        ).first()

    def clean(self):
        if self.min_supported_version_code > self.version_code:
            raise ValidationError({
                'min_supported_version_code':
                    'Ngưỡng chặn không được cao hơn version_code của chính bản này — '
                    'mọi client sẽ bị chặn mà không có bản nào để nâng lên.',
            })

        expected = '.apk' if self.platform == self.PLATFORM_ANDROID else '.ipa'
        if self.file and not self.file.name.lower().endswith(expected):
            raise ValidationError({'file': f'File cho {self.get_platform_display()} phải là {expected}.'})

        if self.is_published and not self.file:
            raise ValidationError({'is_published': 'Chưa có file thì chưa publish được.'})

        if self.is_published:
            self._reject_downgrade()

    def _reject_downgrade(self):
        """Android refuses to install a lower versionCode, so publishing one only confuses."""
        newer = (AppRelease.objects
                 .filter(platform=self.platform, is_published=True,
                         version_code__gt=self.version_code)
                 .exclude(pk=self.pk)
                 .order_by('-version_code')
                 .first())
        if newer:
            raise ValidationError({
                'version_code':
                    f'Đã có bản {newer.version_code} được publish. Thiết bị không cài đè được '
                    f'bản thấp hơn — muốn lùi thì phát hành một version_code cao hơn '
                    f'mang code cũ (feature-36 §5.1).',
            })
