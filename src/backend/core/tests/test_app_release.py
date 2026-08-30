"""App release and version endpoints (feature-36 §9)."""

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AppRelease
from core.services.app_version import parse_version_code
from users.models import MobileDevice, User

PASSWORD = 'str0ng-pass-word'


def make_release(platform='ANDROID', version_code=12, min_supported=8,
                 published=True, name='1.2.0'):
    suffix = 'apk' if platform == 'ANDROID' else 'ipa'
    return AppRelease.objects.create(
        platform=platform,
        version_code=version_code,
        version_name=name,
        min_supported_version_code=min_supported,
        file=SimpleUploadedFile(f'huyenhoc-{version_code}.{suffix}', b'PK\x03\x04payload'),
        is_published=published,
    )


class AppVersionEndpointTests(APITestCase):
    """GET /api/app/version/ (feature-36 §6.1)."""

    def setUp(self):
        self.url = reverse('app_version')

    def get(self, **params):
        return self.client.get(self.url, {'platform': 'android', **params})

    def test_t36_1_no_release_published(self):
        """T36-1: an empty table must not disturb anyone."""
        self.assertEqual(self.get().status_code, status.HTTP_204_NO_CONTENT)

    def test_t36_2_client_below_the_floor_is_blocked(self):
        make_release()
        self.assertEqual(self.get(version_code=7).data['update_status'], 'BLOCKED')

    def test_t36_3_client_between_floor_and_latest_is_nudged(self):
        make_release()
        self.assertEqual(self.get(version_code=9).data['update_status'], 'AVAILABLE')

    def test_t36_4_client_on_the_latest_is_up_to_date(self):
        make_release()
        self.assertEqual(self.get(version_code=12).data['update_status'], 'UP_TO_DATE')

    def test_t36_5_without_version_code_the_numbers_are_still_returned(self):
        """T36-5: the client can decide for itself if it did not send its version."""
        make_release()
        data = self.get().data

        self.assertIsNone(data['update_status'])
        self.assertEqual(data['version_code'], 12)
        self.assertEqual(data['min_supported_version_code'], 8)

    def test_t36_6_only_the_highest_published_release_is_served(self):
        make_release(version_code=11, name='1.1.0')
        make_release(version_code=12, name='1.2.0')
        make_release(version_code=13, name='1.3.0', published=False)

        self.assertEqual(self.get().data['version_code'], 12)

    def test_t36_12_endpoint_needs_no_auth(self):
        """T36-12: a blocked app has no token, so auth would be a deadlock."""
        make_release()
        self.assertEqual(self.get(version_code=9).status_code, status.HTTP_200_OK)

    def test_t36_18_bad_platform_is_a_400(self):
        for value in ('', 'windows'):
            with self.subTest(platform=value):
                response = self.client.get(self.url, {'platform': value})
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_t36_19_unpublishing_falls_back_to_the_previous_release(self):
        """T36-19: the only lever that helps clients who have not updated yet."""
        make_release(version_code=11, name='1.1.0')
        latest = make_release(version_code=12, name='1.2.0')

        AppRelease.objects.filter(pk=latest.pk).update(is_published=False)

        self.assertEqual(self.get().data['version_code'], 11)

    def test_t36_16_ios_hands_the_install_to_the_os(self):
        make_release(platform='IOS', name='1.2.0')
        data = self.client.get(self.url, {'platform': 'ios', 'version_code': 9}).data

        self.assertTrue(data['download_url'].startswith('itms-services://'))
        self.assertIn('/api/app/ios/manifest.plist', data['download_url'])
        self.assertIsNone(data['sha256'])


class IosManifestTests(APITestCase):
    """GET /api/app/ios/manifest.plist (feature-36 §6.2)."""

    def test_t36_15_manifest_is_xml_with_the_right_bundle_id(self):
        """T36-15: a wrong bundle id installs a second app instead of updating."""
        make_release(platform='IOS', name='1.2.0')

        response = self.client.get(reverse('app_ios_manifest'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/xml')
        body = response.content.decode()
        self.assertIn('<string>pro.huyenhoc.app</string>', body)
        self.assertIn('<string>1.2.0</string>', body)
        self.assertIn('software-package', body)

    def test_manifest_404s_when_nothing_is_published(self):
        self.assertEqual(self.client.get(reverse('app_ios_manifest')).status_code,
                         status.HTTP_404_NOT_FOUND)


class AppReleaseModelTests(APITestCase):
    """Schema and form guards (feature-36 §4.2, §5.1)."""

    def test_t36_7_floor_above_ceiling_is_refused_by_the_database(self):
        """T36-7: the costliest failure mode, so it is blocked at the schema."""
        with self.assertRaises(IntegrityError), transaction.atomic():
            AppRelease.objects.create(
                platform='ANDROID', version_code=10, version_name='1.0.0',
                min_supported_version_code=11,
            )

    def test_t36_8_duplicate_version_code_per_platform(self):
        make_release(version_code=12)
        with self.assertRaises(IntegrityError), transaction.atomic():
            make_release(version_code=12, name='1.2.1')

    def test_same_version_code_on_the_other_platform_is_fine(self):
        make_release(platform='ANDROID', version_code=12)
        make_release(platform='IOS', version_code=12)
        self.assertEqual(AppRelease.objects.count(), 2)

    def test_t36_14_publishing_below_the_current_release_is_refused(self):
        """T36-14: Android would refuse to install it anyway."""
        make_release(version_code=12)
        older = make_release(version_code=11, name='1.1.0', published=False)

        older.is_published = True
        with self.assertRaises(ValidationError) as ctx:
            older.full_clean()
        self.assertIn('version_code', ctx.exception.error_dict)

    def test_clean_rejects_a_file_with_the_wrong_extension(self):
        release = AppRelease(
            platform='ANDROID', version_code=12, version_name='1.2.0',
            file=SimpleUploadedFile('build.ipa', b'PK'),
        )
        with self.assertRaises(ValidationError) as ctx:
            release.full_clean()
        self.assertIn('file', ctx.exception.error_dict)

    def test_current_for_ignores_drafts_and_other_platforms(self):
        make_release(platform='ANDROID', version_code=12)
        make_release(platform='IOS', version_code=20)

        self.assertEqual(AppRelease.current_for('ANDROID').version_code, 12)


class ParseVersionCodeTests(APITestCase):
    """T36-17: one parser for both shapes the clients send."""

    def test_accepts_both_forms_and_refuses_the_rest(self):
        cases = [('1.0.0+7', 7), ('7', 7), (7, 7), ('', None),
                 ('abc', None), (None, None), ('1.0.0+', None), ('-3', None)]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(parse_version_code(raw), expected)


class VersionSpreadTests(APITestCase):
    """T36-20: the numbers an admin needs before raising the floor."""

    def test_counts_only_live_handsets_of_that_platform(self):
        from core.services.version_spread import version_spread

        user = User.objects.create_user(
            username='u@example.com', email='u@example.com',
            password=PASSWORD, is_active=True,
        )
        common = dict(user=user, expires_at='2030-01-01T00:00:00Z')
        MobileDevice.objects.create(client_code='C1', pairing_code='TT-1', status='ACTIVE',
                                    device_type='ANDROID', app_version='1.0.0+1', **common)
        MobileDevice.objects.create(client_code='C2', pairing_code='TT-2', status='ACTIVE',
                                    device_type='ANDROID', app_version='1.0.0+1', **common)
        MobileDevice.objects.create(client_code='C3', pairing_code='TT-3', status='ACTIVE',
                                    device_type='ANDROID', app_version='1.1.0+4', **common)
        MobileDevice.objects.create(client_code='C4', pairing_code='TT-4', status='REVOKED',
                                    device_type='ANDROID', app_version='1.0.0+1', **common)
        MobileDevice.objects.create(client_code='C5', pairing_code='TT-5', status='ACTIVE',
                                    device_type='IOS', app_version='1.0.0+1', **common)

        rows = {r['app_version']: r['handsets'] for r in version_spread('ANDROID')}

        self.assertEqual(rows, {'1.0.0+1': 2, '1.1.0+4': 1})
