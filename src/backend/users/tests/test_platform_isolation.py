"""
Web and mobile sessions must not disturb each other (feature-34 §13, T3/T4, T22-T27).
"""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import MobileDevice, User, UserDevice
from users.services.auth import issue_tokens_for_device
from users.constants import PLATFORM_MOBILE, PLATFORM_WEB
from users.tests.utils import no_throttling

PASSWORD = 'str0ng-pass-word'
HW_A = 'a' * 64


@no_throttling
class PlatformIsolationTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='user@example.com', email='user@example.com',
            password=PASSWORD, is_active=True,
        )
        self.me_url = reverse('user_profile')

    def _web_login(self, device_id='web_fp_abcd1234'):
        return self.client.post(reverse('auth_login'), {
            'email': self.user.email, 'password': PASSWORD,
            'device_id': device_id, 'device_type': 'WEB',
        }, format='json')

    def _mobile_login(self, device_id='device-a', hardware_hash=HW_A):
        """Issue a slot and claim it — the only way a handset gets in."""
        from users.services.mobile_slot import issue_slot

        slot = issue_slot(self.user, staff=None)
        return self.client.post(reverse('mobile_login'), {
            'email': self.user.email, 'password': PASSWORD,
            'device_id': device_id, 'platform_os': 'ios', 'hardware_hash': hardware_hash,
            'pairing_code': slot.pairing_code,
        }, format='json')

    def _authed_get(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        response = self.client.get(self.me_url)
        self.client.credentials()
        return response

    def test_t3_mobile_login_leaves_the_web_session_alive(self):
        """T3: this is the regression that made the two platforms fight each other."""
        web = self._web_login()
        self._mobile_login()

        self.assertEqual(UserDevice.objects.get(user=self.user).status, 'ACTIVE')
        self.assertEqual(self._authed_get(web.data['access']).status_code, status.HTTP_200_OK)

    def test_t4_web_login_leaves_the_mobile_session_alive(self):
        """T4: and the same in the other direction."""
        mobile = self._mobile_login()
        self._web_login()

        self.assertEqual(MobileDevice.objects.get(user=self.user).status, 'ACTIVE')
        self.assertEqual(self._authed_get(mobile.data['access']).status_code, status.HTTP_200_OK)

    def test_t22_revoked_mobile_device_rejects_its_token(self):
        """T22: the device check runs on every request, not only at login."""
        mobile = self._mobile_login()
        MobileDevice.objects.filter(user=self.user).update(status='REVOKED')

        self.assertEqual(
            self._authed_get(mobile.data['access']).status_code, status.HTTP_401_UNAUTHORIZED,
        )

    def test_t23_same_device_id_in_both_tables_resolves_by_platform(self):
        """
        T23: the platform claim decides which table a token is checked against.

        Both rows share a device_id; revoking the mobile one must not lock the web
        session out.
        """
        shared_id = 'collision-id'
        web_device = UserDevice.objects.create(
            user=self.user, device_id=shared_id, device_type='WEB', status='ACTIVE',
        )
        MobileDevice.objects.create(
            user=self.user, device_id=shared_id, device_type='IOS', status='REVOKED',
            client_code='MC-DEADBEEF', pairing_code='TT-0000-0000-0001',
            expires_at=timezone.now() + timedelta(days=7),
        )
        tokens = issue_tokens_for_device(self.user, web_device, PLATFORM_WEB)

        self.assertEqual(self._authed_get(tokens['access']).status_code, status.HTTP_200_OK)

    def test_t24_legacy_token_without_platform_claim_resolves_to_web(self):
        """T24: pre-release tokens carry no platform claim and can only be web."""
        from rest_framework_simplejwt.tokens import RefreshToken

        device = UserDevice.objects.create(
            user=self.user, device_id='web_fp_legacy', device_type='WEB', status='ACTIVE',
        )
        refresh = RefreshToken.for_user(self.user)
        refresh['device_id'] = device.device_id  # no 'platform' claim

        self.assertEqual(
            self._authed_get(str(refresh.access_token)).status_code, status.HTTP_200_OK,
        )

    def test_t25_refresh_forwards_both_claims(self):
        """T25: dropping the platform claim on refresh would 401 a valid mobile session."""
        mobile = self._mobile_login()
        response = self.client.post(
            reverse('token_refresh'), {'refresh': mobile.data['refresh']}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._authed_get(response.data['access']).status_code, status.HTTP_200_OK)

    def test_t26_geo_signal_fires_for_mobile_devices(self):
        """T26: the geo receiver is registered for both senders, keyed by model label."""
        from unittest.mock import patch

        with patch('users.tasks.trigger_geo_fetch') as trigger:
            MobileDevice.objects.create(
                user=self.user, device_id='device-geo', device_type='IOS', last_ip='8.8.8.8',
                client_code='MC-CAFEBABE', pairing_code='TT-0000-0000-0002',
                expires_at=timezone.now() + timedelta(days=7),
            )
        trigger.assert_called_once()
        self.assertEqual(trigger.call_args[0][0], 'users.MobileDevice')


@no_throttling
class RegistrationTests(APITestCase):
    """T31 (C4): registration must accept both client shapes."""

    def _register(self, payload):
        return self.client.post(reverse('auth_register'), payload, format='json')

    def test_mobile_payload_is_accepted(self):
        """The app sends device_type "ios", which is not a UserDevice choice."""
        response = self._register({
            'email': 'mobile@example.com', 'password': PASSWORD,
            'device_id': 'device-a', 'device_type': 'ios',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserDevice.objects.count(), 0)

    def test_legacy_web_payload_still_works(self):
        """The web app keeps sending the old device fields; they are simply ignored."""
        response = self._register({
            'email': 'web@example.com', 'password': PASSWORD,
            'device_id': 'web_fp_1234', 'device_type': 'WEB', 'device_name': 'Chrome',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserDevice.objects.count(), 0)


@no_throttling
class DeviceStatusTests(APITestCase):
    """T32 (P6) and T39 (S11)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='user@example.com', email='user@example.com',
            password=PASSWORD, is_active=True,
        )
        self.client.force_authenticate(self.user)

    def test_bound_device_reports_the_mobile_handset(self):
        MobileDevice.objects.create(
            user=self.user, device_id='device-a', device_type='IOS', device_name='iPhone 15',
            client_code='MC-12345678', pairing_code='TT-0000-0000-0003',
            expires_at=timezone.now() + timedelta(days=7), status='ACTIVE',
        )
        response = self.client.get(reverse('user_device_status'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['bound_device'])
        self.assertEqual(response.data['bound_device']['device_name'], 'iPhone 15')
        self.assertTrue(response.data['mobile_device']['client_code'].startswith('MC-'))

    def test_self_reset_is_frozen(self):
        """The 365-day self-reset is gone; the fields stay only for older clients."""
        response = self.client.get(reverse('user_device_status'))

        self.assertFalse(response.data['can_reset_now'])
        self.assertIsNone(response.data['next_reset_available_at'])
