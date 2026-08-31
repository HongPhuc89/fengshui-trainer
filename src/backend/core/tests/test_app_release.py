"""AppRelease singleton, admin upload flow, and version endpoint (feature-37)."""

from unittest.mock import MagicMock, patch

from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AppRelease
from users.models import User

PASSWORD = 'str0ng-pass-word'


def fake_apk(version_code=13, version_name='1.3.0'):
    """A stand-in for pyaxmlparser.APK — a real APK binary is not worth
    fixturing just to exercise the two attributes read_version_from_apk uses."""
    apk = MagicMock()
    apk.version_code = version_code
    apk.version_name = version_name
    return apk


def make_release(version_code=12, name='1.2.0'):
    """
    The one AppRelease row is seeded by migration 0002 (feature-37 §4) — tests
    update it in place. Creating a second row would trip the unique
    constraint on `platform` exactly like it should in production.
    """
    release = AppRelease.objects.get(platform=AppRelease.PLATFORM_ANDROID)
    release.version_code = version_code
    release.version_name = name
    release.sha256 = 'deadbeef'
    release.file_size = 42
    release.file = SimpleUploadedFile(f'huyenhoc-{version_code}.apk', b'PK\x03\x04payload')
    release.save()
    return release


class AppVersionEndpointTests(APITestCase):
    """GET /api/app/version/ (feature-37 §5.2)."""

    def setUp(self):
        self.url = reverse('app_version')

    def test_t37_8_seeded_row_without_a_file_is_204(self):
        """T37-8: the migration-seeded row has no file yet — behaves like nothing published."""
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_204_NO_CONTENT)

    def test_t37_9_published_release_fields(self):
        make_release()
        data = self.client.get(self.url).data

        self.assertEqual(data['version_code'], 12)
        self.assertEqual(data['version_name'], '1.2.0')
        self.assertTrue(data['download_url'])
        self.assertEqual(data['sha256'], 'deadbeef')
        self.assertEqual(data['file_size'], 42)
        for dropped in ('platform', 'min_supported_version_code', 'update_status'):
            self.assertNotIn(dropped, data)

    def test_t37_10_endpoint_needs_no_auth(self):
        """T37-10: a client checking for updates before login has no token to send."""
        make_release()
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)


class AppReleaseSingletonTests(APITestCase):
    """DB-level guarantee that only one row can ever exist (feature-37 §3.1)."""

    def test_t37_7_second_row_refused_by_the_database(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            AppRelease.objects.create(platform=AppRelease.PLATFORM_ANDROID)

    def test_current_returns_the_seeded_row(self):
        self.assertIsNotNone(AppRelease.current())
        self.assertEqual(AppRelease.current().platform, AppRelease.PLATFORM_ANDROID)


class ReadVersionFromApkTests(APITestCase):
    """AppRelease.read_version_from_apk — parse + validate before any write (feature-37 §3.2)."""

    def setUp(self):
        self.release = AppRelease.objects.get(platform=AppRelease.PLATFORM_ANDROID)

    def test_t37_1_valid_apk_returns_detected_fields(self):
        payload = b'fake apk bytes'
        with patch('core.models.APK', return_value=fake_apk(13, '1.3.0')):
            version_code, version_name, sha256, size = self.release.read_version_from_apk(
                SimpleUploadedFile('huyenhoc.apk', payload))

        self.assertEqual((version_code, version_name), (13, '1.3.0'))
        self.assertEqual(size, len(payload))
        self.assertTrue(sha256)

    def test_t37_2_non_increasing_version_code_is_refused(self):
        self.release.version_code = 12
        with patch('core.models.APK', return_value=fake_apk(12, '1.2.0')):
            with self.assertRaises(ValidationError):
                self.release.read_version_from_apk(SimpleUploadedFile('huyenhoc.apk', b'x'))

    def test_t37_3_unparseable_file_is_refused(self):
        with patch('core.models.APK', side_effect=Exception('bad zip')):
            with self.assertRaises(ValidationError):
                self.release.read_version_from_apk(SimpleUploadedFile('not-an-apk.txt', b'nope'))

    def test_apk_missing_version_info_is_refused(self):
        with patch('core.models.APK', return_value=fake_apk(None, None)):
            with self.assertRaises(ValidationError):
                self.release.read_version_from_apk(SimpleUploadedFile('huyenhoc.apk', b'x'))


class AppReleaseAdminUploadTests(APITestCase):
    """
    Exercises the real admin change view: form validation via clean_file(),
    auto-detected version fields, and deleting the old file only once the new
    one has actually been saved (feature-37 §3.3).
    """

    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='admin@example.com', email='admin@example.com', password=PASSWORD,
        )
        self.client.force_login(self.admin_user)
        self.release = make_release(version_code=10, name='1.0.0')
        self.url = reverse('admin:core_apprelease_change', args=[self.release.pk])

    def _post(self, file):
        return self.client.post(self.url, {
            'platform': AppRelease.PLATFORM_ANDROID,
            'file': file,
            'release_notes': '',
            '_continue': '',
        })

    def test_t37_4_uploading_a_newer_apk_replaces_and_deletes_the_old_file(self):
        old_name = self.release.file.name

        with patch('core.models.APK', return_value=fake_apk(11, '1.1.0')):
            self._post(SimpleUploadedFile('huyenhoc-11.apk', b'new payload'))

        self.release.refresh_from_db()
        self.assertEqual(self.release.version_code, 11)
        self.assertEqual(self.release.version_name, '1.1.0')
        self.assertNotEqual(self.release.file.name, old_name)
        self.assertFalse(default_storage.exists(old_name))

    def test_t37_5_invalid_apk_keeps_the_previous_file_untouched(self):
        old_name = self.release.file.name

        with patch('core.models.APK', side_effect=Exception('bad zip')):
            self._post(SimpleUploadedFile('broken.apk', b'garbage'))

        self.release.refresh_from_db()
        self.assertEqual(self.release.version_code, 10)
        self.assertEqual(self.release.file.name, old_name)
        self.assertTrue(default_storage.exists(old_name))

    def test_t37_6_add_view_is_hidden_once_the_singleton_exists(self):
        response = self.client.get(reverse('admin:core_apprelease_add'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
