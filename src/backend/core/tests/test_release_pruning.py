"""Release binary retention (feature-36 §5.2)."""

from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from core.models import AppRelease
from core.services.release_pruning import prune_all_platforms, prune_release_files


def make(platform='ANDROID', version_code=1, published=True):
    suffix = 'apk' if platform == 'ANDROID' else 'ipa'
    return AppRelease.objects.create(
        platform=platform,
        version_code=version_code,
        version_name=f'1.0.{version_code}',
        min_supported_version_code=0,
        file=SimpleUploadedFile(f'build-{platform}-{version_code}.{suffix}', b'PK\x03\x04'),
        is_published=published,
    )


@override_settings(APP_RELEASE_KEEP_FILES=3)
class PruneReleaseFilesTests(APITestCase):

    def has_file(self, release):
        return bool(AppRelease.objects.get(pk=release.pk).file)

    def test_keeps_the_newest_three_and_drops_the_rest(self):
        builds = [make(version_code=code) for code in range(1, 6)]

        pruned = prune_release_files('ANDROID')

        self.assertEqual(pruned, 2)
        self.assertFalse(self.has_file(builds[0]))   # 1
        self.assertFalse(self.has_file(builds[1]))   # 2
        for kept in builds[2:]:
            self.assertTrue(self.has_file(kept))

    def test_rows_survive_so_history_and_the_unique_guard_survive(self):
        """Deleting rows would let a version_code be reused — see §5.1."""
        old = make(version_code=1)
        for code in range(2, 6):
            make(version_code=code)

        prune_release_files('ANDROID')

        old.refresh_from_db()
        self.assertEqual(AppRelease.objects.filter(platform='ANDROID').count(), 5)
        self.assertEqual(old.version_code, 1)
        self.assertEqual(old.sha256, '')  # never set in this fixture, but the row is intact
        self.assertEqual(old.version_name, '1.0.1')

    def test_the_served_build_keeps_its_file_even_if_newer_drafts_outrank_it(self):
        """
        The build clients are being sent right now must stay downloadable.

        Four unpublished drafts above it would otherwise push the only published
        release out of the newest-three window.
        """
        published = make(version_code=1, published=True)
        for code in range(2, 6):
            make(version_code=code, published=False)

        prune_release_files('ANDROID')

        self.assertTrue(self.has_file(published))

    def test_platforms_are_counted_separately(self):
        android = [make('ANDROID', code) for code in range(1, 5)]
        ios = [make('IOS', code) for code in range(1, 5)]

        prune_all_platforms()

        self.assertFalse(self.has_file(android[0]))
        self.assertFalse(self.has_file(ios[0]))
        self.assertTrue(self.has_file(android[1]))
        self.assertTrue(self.has_file(ios[1]))

    def test_running_twice_changes_nothing_the_second_time(self):
        for code in range(1, 6):
            make(version_code=code)

        self.assertEqual(prune_release_files('ANDROID'), 2)
        self.assertEqual(prune_release_files('ANDROID'), 0)

    def test_nothing_to_prune_below_the_threshold(self):
        for code in range(1, 4):
            make(version_code=code)

        self.assertEqual(prune_release_files('ANDROID'), 0)

    def test_a_pruned_release_cannot_be_republished(self):
        """clean() already refuses publishing without a file — keep it that way."""
        from django.core.exceptions import ValidationError

        old = make(version_code=1)
        for code in range(2, 6):
            make(version_code=code)
        prune_release_files('ANDROID')

        old.refresh_from_db()
        old.is_published = True
        with self.assertRaises(ValidationError):
            old.full_clean()


class StorageDeleteTests(APITestCase):
    """FileSystemStorage.delete() alone would orphan the Supabase object."""

    @patch('config.storage.LocalFirstSupabaseStorage._is_configured', return_value=True)
    @patch('config.storage.LocalFirstSupabaseStorage._s3_client')
    def test_delete_also_removes_the_remote_object(self, s3, _configured):
        release = make(version_code=1)
        name = release.file.name

        release.file.delete(save=False)

        s3.return_value.delete_object.assert_called_once()
        self.assertEqual(s3.return_value.delete_object.call_args.kwargs['Key'], name)

    @patch('config.storage.LocalFirstSupabaseStorage._is_configured', return_value=True)
    @patch('config.storage.LocalFirstSupabaseStorage._s3_client')
    def test_a_remote_failure_does_not_block_the_local_delete(self, s3, _configured):
        from django.core.files.storage import default_storage

        s3.return_value.delete_object.side_effect = RuntimeError('supabase down')
        release = make(version_code=1)
        name = release.file.name

        release.file.delete(save=False)

        # An orphan in the bucket is better than a file the app still lists but
        # cannot serve, so the local delete goes ahead regardless.
        self.assertFalse(release.file)
        self.assertFalse(default_storage.exists(name))
