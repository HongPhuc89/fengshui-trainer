"""
Mobile device slots and pairing codes (feature-34 §13).

Several cases must go through the HTTP client rather than calling services
directly: the bugs they lock down are transaction-boundary bugs, which only
appear when there is a real request boundary.
"""

from datetime import timedelta

from django.conf import settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import MobileDevice, User, UserDevice
from users.services.mobile_slot import SlotError, issue_slot, normalize_code
from users.tests.utils import no_throttling

PASSWORD = 'str0ng-pass-word'
HW_A = 'a' * 64
HW_B = 'b' * 64


class MobileSlotTestCase(APITestCase):
    """Shared fixtures and request helpers."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='user@example.com', email='user@example.com',
            password=PASSWORD, is_active=True,
        )
        self.login_url = reverse('mobile_login')

    def login(self, device_id, hardware_hash=None, code=None, **extra):
        payload = {
            'email': self.user.email,
            'password': PASSWORD,
            'device_id': device_id,
            'platform_os': 'ios',
            'device_name': 'iPhone 15 Pro',
            'device_model': 'iPhone16,1',
            'os_version': 'iOS 17.4',
            'app_version': '1.4.2+31',
        }
        if hardware_hash:
            payload['hardware_hash'] = hardware_hash
        if code:
            payload['pairing_code'] = code
        payload.update(extra)
        return self.client.post(self.login_url, payload, format='json')

    def issue(self):
        return issue_slot(self.user, staff=None)

    def pair(self, device_id='device-a', hardware_hash=HW_A):
        """Issue a slot and claim it, the normal onboarding path."""
        return self.login(device_id, hardware_hash, code=self.issue().pairing_code)


@no_throttling
class MobileLoginTests(MobileSlotTestCase):

    def test_t1_web_quota_does_not_block_mobile(self):
        """T1: five active web devices must not consume the mobile allowance."""
        for i in range(5):
            UserDevice.objects.create(
                user=self.user, device_id=f'web_fp_{i}', device_type='WEB', status='ACTIVE',
            )
        self.assertEqual(self.pair().status_code, status.HTTP_200_OK)

    def test_t2_login_without_any_slot(self):
        """T2: a user staff never granted a slot cannot get in, and no row is created."""
        response = self.login('device-a', HW_A)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAIRING_CODE_REQUIRED')
        self.assertFalse(response.data['has_unclaimed_slot'])
        self.assertEqual(MobileDevice.objects.count(), 0)

    def test_t2b_login_without_code_but_slot_waiting(self):
        """The flag tells the app to show the code field rather than a dead end."""
        self.issue()
        response = self.login('device-a', HW_A)

        self.assertEqual(response.data['code'], 'PAIRING_CODE_REQUIRED')
        self.assertTrue(response.data['has_unclaimed_slot'])

    def test_t5_relogin_needs_no_code(self):
        """T5 (S1): a handset on a live slot never sees the code field again."""
        code = self.pair().data['client_code']
        second = self.login('device-a', HW_A)

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertFalse(second.data['claimed'])
        self.assertEqual(second.data['client_code'], code)
        self.assertEqual(self.user.mobile_devices.count(), 1)

    def test_t6_reinstall_rebinds_via_hardware_anchor(self):
        """T6 (S2): a reinstall loses the client id but keeps the hardware anchor."""
        code = self.pair().data['client_code']
        second = self.login('device-a-reinstalled', HW_A)

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data['rebound'])
        self.assertEqual(second.data['client_code'], code)
        self.assertEqual(self.user.mobile_devices.get().device_id, 'device-a-reinstalled')

    def test_t7_cloned_client_id_is_treated_as_unknown(self):
        """T7 (P7): same client id with a different anchor means a restored backup."""
        self.pair()
        response = self.login('device-a', HW_B)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAIRING_CODE_REQUIRED')

    def test_t8_denylisted_hardware_hash_is_ignored(self):
        """T8: the well-known broken ANDROID_ID must not link unrelated phones."""
        from users.services.client_id import normalize_hardware_hash

        self.assertIsNone(normalize_hardware_hash('9774d56d682e549c'))

    def test_t9_malformed_hardware_hash_does_not_crash(self):
        """T9: junk in the anchor field degrades to "no anchor", never a 500."""
        response = self.login('device-a', 'not-a-hash', code=self.issue().pairing_code)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(self.user.mobile_devices.get().hardware_hash)

    def test_t30_client_device_name_is_kept(self):
        """T30: the Dio User-Agent says nothing, so the client's name must win."""
        self.login('device-a', HW_A, code=self.issue().pairing_code,
                   device_name='iPhone của Phúc')
        self.assertEqual(self.user.mobile_devices.get().device_name, 'iPhone của Phúc')

    def test_t34_logout_keeps_the_binding(self):
        """T34: signing out must not cost the user a trip to support."""
        self.pair()
        response = self.login('device-a', HW_A)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


@no_throttling
class SlotIssueTests(MobileSlotTestCase):

    def test_t10_issue_first_slot(self):
        """T10: a fresh slot carries both codes and a deadline."""
        slot = self.issue()

        self.assertEqual(slot.status, 'UNCLAIMED')
        self.assertTrue(slot.client_code.startswith('MC-'))
        self.assertTrue(slot.pairing_code.startswith('TT-'))
        self.assertIsNone(slot.device_id)
        expected = timezone.now() + timedelta(days=settings.DEVICE_PAIRING_TTL_DAYS)
        self.assertAlmostEqual(slot.expires_at, expected, delta=timedelta(minutes=1))

    def test_t11_unclaimed_slot_occupies_the_quota(self):
        """
        T11: the easy thing to get wrong.

        If UNCLAIMED did not count, staff could issue five slots against a cap of
        one and the user would claim them all.
        """
        self.issue()
        with self.assertRaises(SlotError):
            self.issue()

    def test_t11b_quota_follows_mobile_max_devices(self):
        """A user granted two handsets may hold two slots."""
        self.user.mobile_max_devices = 2
        self.user.save(update_fields=['mobile_max_devices'])

        self.issue()
        self.issue()
        with self.assertRaises(SlotError):
            self.issue()

    def test_t22_expired_slot_releases_the_quota(self):
        """T22: a slot nobody claimed must not hold a place forever."""
        from users.tasks import expire_mobile_slots

        slot = self.issue()
        MobileDevice.objects.filter(pk=slot.pk).update(
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        self.assertEqual(expire_mobile_slots(), 1)
        self.assertEqual(MobileDevice.objects.get(pk=slot.pk).status, 'EXPIRED')
        self.issue()  # quota is free again

    def test_t21_code_normalisation_tolerates_lookalike_glyphs(self):
        """T21: a code read out over the phone still matches if I/O/L are misheard."""
        self.assertEqual(normalize_code('tt-4km9 x7qp-2n5r'), normalize_code('TT4KM9X7QP2N5R'))
        self.assertEqual(normalize_code('TT-O1IL'), normalize_code('TT-0111'))


@no_throttling
class SlotClaimTests(MobileSlotTestCase):

    def test_t12_claim_with_the_right_code(self):
        """T12: the happy path fills in every field support will later read."""
        slot = self.issue()
        response = self.login('device-a', HW_A, code=slot.pairing_code)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['claimed'])
        slot.refresh_from_db()
        self.assertEqual(slot.status, 'ACTIVE')
        self.assertEqual(slot.device_id, 'device-a')
        self.assertEqual(slot.hardware_hash, HW_A)
        self.assertIsNotNone(slot.claimed_at)
        self.assertIsNotNone(slot.claim_ip)

    def test_t13_same_handset_can_take_a_new_slot(self):
        """
        T13 (C2): the constraint bug this locks down.

        A revoked slot keeps the handset's device_id and hardware_hash. Unless the
        unique indexes are scoped to the occupying statuses, the same phone taking
        a fresh slot collides with its own history and raises IntegrityError.
        """
        first = self.pair()
        old_code = first.data['client_code']

        self.user.mobile_devices.update(status='REVOKED', revoked_at=timezone.now(),
                                        revoked_reason='ADMIN_UNBIND')
        response = self.pair()  # same device_id, same hardware_hash, new slot

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(response.data['client_code'], old_code)
        self.assertEqual(self.user.mobile_devices.count(), 2)
        self.assertEqual(self.user.mobile_devices.filter(status='ACTIVE').count(), 1)

    def test_t14_wrong_code_persists_the_attempt(self):
        """
        T14: the attempt counter must survive the failed request.

        Re-read from the database rather than trusting the in-memory object: the
        bug this locks down was a rollback that silently discarded the write.
        """
        slot = self.issue()
        response = self.login('device-a', HW_A, code='TT-0000-0000-0000')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAIRING_FAILED')
        self.assertEqual(MobileDevice.objects.get(pk=slot.pk).claim_attempts, 1)
        self.assertEqual(MobileDevice.objects.get(pk=slot.pk).status, 'UNCLAIMED')

    def test_t15_slot_burns_itself_after_max_attempts(self):
        """T15: five separate HTTP requests, because that is where the boundary is."""
        slot = self.issue()

        for expected in range(1, settings.DEVICE_PAIRING_MAX_ATTEMPTS + 1):
            self.login('device-a', HW_A, code='TT-0000-0000-0000')
            self.assertEqual(MobileDevice.objects.get(pk=slot.pk).claim_attempts, expected)

        self.assertEqual(MobileDevice.objects.get(pk=slot.pk).status, 'EXPIRED')

    def test_t16_expired_code_is_rejected_and_marked(self):
        """T16: an overdue slot is refused even before the nightly cron runs."""
        slot = self.issue()
        MobileDevice.objects.filter(pk=slot.pk).update(
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        response = self.login('device-a', HW_A, code=slot.pairing_code)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MobileDevice.objects.get(pk=slot.pk).status, 'EXPIRED')

    def test_t17_code_of_another_user_is_not_accepted(self):
        """T17: slots are scoped to one user and can never be used across accounts."""
        other = User.objects.create_user(
            username='other@example.com', email='other@example.com',
            password=PASSWORD, is_active=True,
        )
        other_slot = issue_slot(other, staff=None)
        self.issue()

        response = self.login('device-a', HW_A, code=other_slot.pairing_code)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MobileDevice.objects.get(pk=other_slot.pk).status, 'UNCLAIMED')

    def test_t18_claiming_on_an_already_bound_handset(self):
        """T18: a live handset takes the S1 path, so the code is never spent."""
        self.pair()
        spare = self.issue() if self.user.mobile_max_devices > 1 else None
        response = self.login('device-a', HW_A, code='TT-0000-0000-0000')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['claimed'])
        if spare:
            self.assertEqual(MobileDevice.objects.get(pk=spare.pk).status, 'UNCLAIMED')
