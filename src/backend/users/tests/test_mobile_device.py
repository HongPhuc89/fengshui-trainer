"""
Tests for mobile device binding and activation keys (feature-34 §13).

Several cases must go through the HTTP client rather than calling services
directly: the bugs they lock down are transaction-boundary bugs, which only
appear when there is a real request boundary.
"""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import DeviceActivationKey, MobileDevice, User, UserDevice
from users.services.activation import issue_key
from users.services.mobile_device import requires_activation
from users.tests.utils import no_throttling

PASSWORD = 'str0ng-pass-word'
HW_A = 'a' * 64
HW_B = 'b' * 64


class MobileAuthTestCase(APITestCase):
    """Shared fixtures and request helpers for the mobile auth flows."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='user@example.com', email='user@example.com',
            password=PASSWORD, is_active=True,
        )
        self.login_url = reverse('mobile_login')
        self.activate_url = reverse('mobile_activate')

    def _payload(self, device_id, hardware_hash=None, **extra):
        payload = {
            'email': self.user.email,
            'password': PASSWORD,
            'device_id': device_id,
            'platform_os': 'ios',
            'device_name': 'iPhone 15 Pro',
            'app_version': '1.4.2+31',
            'os_version': 'iOS 17.4',
            'device_model': 'iPhone16,1',
        }
        if hardware_hash:
            payload['hardware_hash'] = hardware_hash
        payload.update(extra)
        return payload

    def login(self, device_id, hardware_hash=None, **extra):
        return self.client.post(self.login_url, self._payload(device_id, hardware_hash, **extra), format='json')

    def activate(self, device_id, key, hardware_hash=None, **extra):
        payload = self._payload(device_id, hardware_hash, **extra)
        payload['activation_key'] = key
        return self.client.post(self.activate_url, payload, format='json')

    def issue(self):
        return issue_key(self.user, staff=None, notify_email=False)


@no_throttling
class MobileLoginTests(MobileAuthTestCase):

    def test_t1_web_quota_does_not_block_mobile(self):
        """T1: five active web devices must not consume the mobile allowance."""
        for i in range(5):
            UserDevice.objects.create(
                user=self.user, device_id=f'web_fp_{i}', device_type='WEB', status='ACTIVE',
            )
        response = self.login('device-a', HW_A)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.user.mobile_devices.count(), 1)

    def test_t2_second_handset_requires_activation(self):
        """T2: a different handset is refused and told which device holds the binding."""
        self.login('device-a', HW_A)
        response = self.login('device-b', HW_B)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'ACTIVATION_REQUIRED')
        self.assertIn('client_code', response.data['bound_device'])
        # The payload must not reveal whether a code has already been issued.
        self.assertNotIn('has_pending_key', response.data)

    def test_t5_relogin_same_device_keeps_row_and_code(self):
        """T5 (S1): logging in again on the same handset is not a device change."""
        first = self.login('device-a', HW_A)
        code = first.data['client_code']

        second = self.login('device-a', HW_A)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertFalse(second.data['rebound'])
        self.assertEqual(second.data['client_code'], code)
        self.assertEqual(self.user.mobile_devices.count(), 1)

    def test_t6_relogin_after_admin_unbind(self):
        """T6: an admin unbind must not cost the user an activation key."""
        self.login('device-a', HW_A)
        self.user.mobile_devices.update(
            status='REVOKED', revoked_at=timezone.now(), revoked_reason='ADMIN_UNBIND',
        )
        response = self.login('device-a', HW_A)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.user.mobile_devices.count(), 1)
        self.assertEqual(self.user.mobile_devices.first().status, 'ACTIVE')

    def test_t7_reinstall_rebinds_via_hardware_anchor(self):
        """T7 (S2): a reinstall loses the client id but keeps the hardware anchor."""
        first = self.login('device-a', HW_A)
        code = first.data['client_code']

        second = self.login('device-a-reinstalled', HW_A)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data['rebound'])
        self.assertEqual(second.data['client_code'], code)
        self.assertEqual(self.user.mobile_devices.count(), 1)
        self.assertEqual(self.user.mobile_devices.first().device_id, 'device-a-reinstalled')

    def test_t8_cloned_client_id_is_treated_as_new_handset(self):
        """T8 (P7): same client id with a different anchor means a restored backup."""
        self.login('device-a', HW_A)
        response = self.login('device-a', HW_B)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'ACTIVATION_REQUIRED')

    def test_t9_denylisted_hardware_hash_is_ignored(self):
        """T9: the well-known broken ANDROID_ID must not link unrelated phones."""
        from users.services.client_id import normalize_hardware_hash

        self.assertIsNone(normalize_hardware_hash('9774d56d682e549c'))

    def test_t10_malformed_hardware_hash_does_not_crash(self):
        """T10: junk in the anchor field degrades to "no anchor", never a 500."""
        response = self.login('device-a', 'not-a-hash')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(self.user.mobile_devices.first().hardware_hash)

    def test_t28_client_device_name_is_kept(self):
        """T28: the Dio User-Agent says nothing, so the client's name must win."""
        self.login('device-a', HW_A, device_name='iPhone của Phúc')
        self.assertEqual(self.user.mobile_devices.first().device_name, 'iPhone của Phúc')

    def test_t30_cannot_return_to_replaced_handset_without_a_key(self):
        """
        T30 (C3): the hole that made R7 collapse after the first device change.

        Old handset A is REVOKED/REPLACED but still matches by device_id. Without
        the shared gate, logging in on it would bind A and revoke B silently.
        """
        self.login('device-a', HW_A)
        key = self.issue()
        self.activate('device-b', key.key, HW_B)

        response = self.login('device-a', HW_A)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'ACTIVATION_REQUIRED')
        active = self.user.mobile_devices.filter(status='ACTIVE').get()
        self.assertEqual(active.device_id, 'device-b')

    def test_t38_requires_activation_truth_table(self):
        """T38: login and activate must read the same gate in opposite directions."""
        self.login('device-a', HW_A)
        bound = self.user.mobile_devices.get()

        self.assertFalse(requires_activation(self.user, bound))       # same handset
        self.assertTrue(requires_activation(self.user, None))         # unseen handset
        self.user.mobile_devices.update(status='REVOKED')
        self.assertFalse(requires_activation(self.user, None))        # nothing bound


@no_throttling
class MobileActivationTests(MobileAuthTestCase):

    def test_t11_activate_new_handset_does_not_violate_constraints(self):
        """T11 (C1): the outgoing device must be revoked before the new one is saved."""
        first = self.login('device-a', HW_A)
        old_code = first.data['client_code']
        key = self.issue()

        response = self.activate('device-b', key.key, HW_B)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(response.data['client_code'], old_code)
        old = self.user.mobile_devices.get(device_id='device-a')
        self.assertEqual(old.status, 'REVOKED')
        self.assertEqual(old.revoked_reason, 'REPLACED')
        key.refresh_from_db()
        self.assertEqual(key.status, 'USED')
        self.assertEqual(key.used_device.device_id, 'device-b')

    def test_t12_wrong_code_persists_the_attempt(self):
        """
        T12 (C2): the attempt counter must survive the failed request.

        Re-read from the database rather than trusting the in-memory object: the
        bug this locks down was a rollback that silently discarded the write.
        """
        self.login('device-a', HW_A)
        key = self.issue()

        response = self.activate('device-b', 'TT-0000-0000-0000', HW_B)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DeviceActivationKey.objects.get(pk=key.pk).attempts, 1)
        self.assertEqual(self.user.mobile_devices.count(), 1)

    def test_t13_key_self_revokes_after_max_attempts(self):
        """T13: five separate HTTP requests, because that is where the boundary is."""
        from django.conf import settings

        self.login('device-a', HW_A)
        key = self.issue()

        for expected in range(1, settings.DEVICE_ACTIVATION_MAX_ATTEMPTS + 1):
            self.activate('device-b', 'TT-0000-0000-0000', HW_B)
            self.assertEqual(DeviceActivationKey.objects.get(pk=key.pk).attempts, expected)

        key.refresh_from_db()
        self.assertEqual(key.status, 'REVOKED')

    def test_t15_expired_key_is_rejected_and_marked(self):
        """T15: an overdue key is refused even before the nightly cron runs."""
        self.login('device-a', HW_A)
        key = self.issue()
        DeviceActivationKey.objects.filter(pk=key.pk).update(
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        response = self.activate('device-b', key.key, HW_B)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DeviceActivationKey.objects.get(pk=key.pk).status, 'EXPIRED')

    def test_t16_key_of_another_user_is_not_accepted(self):
        """T16: keys are scoped to one user and can never be used across accounts."""
        other = User.objects.create_user(
            username='other@example.com', email='other@example.com',
            password=PASSWORD, is_active=True,
        )
        other_key = issue_key(other, staff=None, notify_email=False)
        self.login('device-a', HW_A)

        response = self.activate('device-b', other_key.key, HW_B)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DeviceActivationKey.objects.get(pk=other_key.pk).status, 'ISSUED')

    def test_t18_issuing_a_key_revokes_the_previous_one(self):
        """T18: support must never be looking at two live codes for one person."""
        first = self.issue()
        second = self.issue()

        first.refresh_from_db()
        self.assertEqual(first.status, 'REVOKED')
        self.assertEqual(second.status, 'ISSUED')
        self.assertEqual(
            DeviceActivationKey.objects.filter(user=self.user, status='ISSUED').count(), 1,
        )

    def test_t20_key_normalisation_tolerates_lookalike_glyphs(self):
        """T20: a code read out over the phone still matches if I/O/L are misheard."""
        from users.services.activation import normalize_key

        self.assertEqual(normalize_key('tt-4km9 x7qp-2n5r'), normalize_key('TT4KM9X7QP2N5R'))
        self.assertEqual(normalize_key('TT-O1IL'), normalize_key('TT-0111'))

    def test_t36_returning_to_a_previous_handset_reuses_its_row(self):
        """
        T36 (C5): the pair of T30, on the activate path.

        A handset the user has owned before keeps its row and client_code —
        minting a new row would collide with both unique constraints.
        """
        first = self.login('device-a', HW_A)
        code_a = first.data['client_code']
        self.activate('device-b', self.issue().key, HW_B)

        response = self.activate('device-a', self.issue().key, HW_A)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['client_code'], code_a)
        self.assertEqual(self.user.mobile_devices.count(), 2)
        self.assertEqual(self.user.mobile_devices.get(device_id='device-b').status, 'REVOKED')
        self.assertEqual(self.user.mobile_devices.get(device_id='device-a').status, 'ACTIVE')

    def test_t37_activate_without_a_bound_handset_does_not_spend_the_key(self):
        """T37: if a plain login would work, the single-use code must be preserved."""
        key = self.issue()
        response = self.activate('device-a', key.key, HW_A)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'ALREADY_BOUND')
        self.assertEqual(DeviceActivationKey.objects.get(pk=key.pk).status, 'ISSUED')

    def test_t17_activate_on_the_currently_bound_handset(self):
        """T17: the same refusal applies when the handset is already the active one."""
        self.login('device-a', HW_A)
        key = self.issue()

        response = self.activate('device-a', key.key, HW_A)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'ALREADY_BOUND')
        self.assertEqual(DeviceActivationKey.objects.get(pk=key.pk).status, 'ISSUED')
