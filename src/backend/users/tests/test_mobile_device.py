"""
Mobile device slots and pairing codes (feature-34 §13).

Several cases must go through the HTTP client rather than calling services
directly: the bugs they lock down are transaction-boundary bugs, which only
appear when there is a real request boundary.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import AdminAuditLog, MobileDevice, User, UserDevice
from users.services.mobile_slot import SlotError, issue_slot, normalize_code, refresh_slot
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

    def test_generated_body_never_starts_with_the_prefix(self):
        """
        Both sides strip a leading "TT" when normalising, so a body that also
        starts with TT would normalise differently depending on whether the user
        typed the prefix, and the code could never be redeemed.
        """
        from users.services.mobile_slot import _generate_unique_pairing_code

        for _ in range(200):
            body = _generate_unique_pairing_code().removeprefix('TT-').replace('-', '')
            self.assertFalse(body.startswith('TT'), body)

    def test_t21_code_normalisation_tolerates_lookalike_glyphs(self):
        """T21: a code read out over the phone still matches if I/O/L are misheard."""
        self.assertEqual(normalize_code('tt-4km 9x7'), normalize_code('TT4KM9X7'))
        self.assertEqual(normalize_code('TT-O1IL'), normalize_code('TT-0111'))

    def test_generated_code_is_six_characters_grouped_3_3(self):
        """Feature-38: shortened from 12 to 6 chars, grouped TT-XXX-XXX."""
        from users.services.mobile_slot import _generate_unique_pairing_code

        for _ in range(50):
            code = _generate_unique_pairing_code()
            self.assertRegex(code, r'^TT-[0-9A-Z]{3}-[0-9A-Z]{3}$')
            for excluded in 'ILOU':
                self.assertNotIn(excluded, code)

    def test_pre_existing_twelve_character_code_still_verifies(self):
        """
        Feature-38 §3.3: normalize_code() compares by value, not length, so a
        code minted before this change stays redeemable — no migration needed.
        """
        from users.services.mobile_slot import verify_pairing_code

        user = User.objects.create_user(
            username='legacy@example.com', email='legacy@example.com',
            password=PASSWORD, is_active=True,
        )
        MobileDevice.objects.create(
            user=user, client_code='C-LEGACY', pairing_code='TT-4KM9-X7QP-2N5R',
            status='UNCLAIMED', device_type='ANDROID',
            expires_at=timezone.now() + timedelta(days=1),
        )

        slot = verify_pairing_code(user, 'tt-4km9-x7qp-2n5r')

        self.assertEqual(slot.pairing_code, 'TT-4KM9-X7QP-2N5R')


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


@no_throttling
class SlotRefreshTests(MobileSlotTestCase):
    """Admin refresh of a device slot (feature-35 §3, §6.1)."""

    def test_t35_1_refresh_releases_the_handset_but_keeps_the_slot(self):
        """T35-1: client_code is the slot's identity and must survive a refresh."""
        self.pair()
        slot = self.user.mobile_devices.get()
        old_code, old_pairing = slot.client_code, slot.pairing_code

        refresh_slot(slot)
        slot.refresh_from_db()

        self.assertEqual(slot.status, 'UNCLAIMED')
        self.assertIsNone(slot.device_id)
        self.assertIsNone(slot.hardware_hash)
        self.assertEqual(slot.client_code, old_code)
        self.assertNotEqual(slot.pairing_code, old_pairing)
        self.assertEqual(slot.claim_attempts, 0)
        self.assertGreater(slot.expires_at, timezone.now())

    def test_t35_2_refresh_rescues_a_slot_burnt_by_wrong_attempts(self):
        """T35-2: an unclaimed slot with spent attempts gets a clean code."""
        slot = self.issue()
        MobileDevice.objects.filter(pk=slot.pk).update(claim_attempts=4)
        slot.refresh_from_db()

        refresh_slot(slot)
        slot.refresh_from_db()

        self.assertEqual(slot.claim_attempts, 0)
        self.assertEqual(slot.status, 'UNCLAIMED')

    def test_t35_3_refresh_refuses_a_dead_slot(self):
        """T35-3: reviving a non-occupying slot would hand out quota by the back door."""
        slot = self.issue()
        MobileDevice.objects.filter(pk=slot.pk).update(status='REVOKED')
        slot.refresh_from_db()

        with self.assertRaises(SlotError):
            refresh_slot(slot)
        slot.refresh_from_db()
        self.assertEqual(slot.status, 'REVOKED')

    def test_t35_4_refresh_does_not_free_the_quota(self):
        """T35-4: the slot is still the user's, so it still occupies its place."""
        self.pair()
        slot = self.user.mobile_devices.get()

        refresh_slot(slot)

        with self.assertRaises(SlotError):
            issue_slot(self.user, staff=None)

    def test_t35_5_new_handset_claims_the_refreshed_slot(self):
        """T35-5: a device change must not fragment the history into a new row."""
        self.pair()
        slot = self.user.mobile_devices.get()
        old_code = slot.client_code

        refresh_slot(slot)
        slot.refresh_from_db()
        response = self.login('device-b', HW_B, code=slot.pairing_code)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['client_code'], old_code)
        self.assertEqual(self.user.mobile_devices.count(), 1)

    def test_t35_6_duplicate_device_id_is_a_400_not_a_500(self):
        """
        T35-6: the unique constraint is right to refuse; only the 500 was wrong.

        Reaching claim_slot with a device_id that is already live needs the clone
        branch of resolve_mobile_device: same device_id, different hardware
        anchor, so the handset reads as unknown and is sent to a second slot.
        """
        self.user.mobile_max_devices = 2
        self.user.save(update_fields=['mobile_max_devices'])
        self.pair()  # slot #1 ACTIVE on device-a / HW_A
        spare = self.issue()

        response = self.login('device-a', HW_B, code=spare.pairing_code)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAIRING_FAILED')
        # Pin the message so this keeps testing the constraint guard rather than
        # some other SlotError the flow might start raising first.
        self.assertIn('đang dùng một slot khác', response.data['detail'])
        self.assertEqual(MobileDevice.objects.get(pk=spare.pk).status, 'UNCLAIMED')

    def test_t35_7_old_tokens_stop_working(self):
        """T35-7: the old handset must be signed out, not left in a broken state."""
        tokens = self.pair().data
        slot = self.user.mobile_devices.get()

        refresh_slot(slot)

        # The API is closed by DeviceJWTAuthentication (status left ACTIVE)...
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        self.assertEqual(
            self.client.get(reverse('user_profile')).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        # ...and the refresh path is closed by the blacklist, which is what makes
        # the app call clearAuth() instead of looping on a token it cannot use.
        self.client.credentials()
        self.assertEqual(
            self.client.post(reverse('token_refresh'),
                             {'refresh': tokens['refresh']}, format='json').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_t35_8_snapshot_is_json_safe(self):
        """T35-8: change_log is a plain JSONField, so datetimes must be stringified."""
        self.pair()
        slot = self.user.mobile_devices.get()
        device_id = slot.device_id

        before = refresh_slot(slot)

        self.assertEqual(before['device_id'], device_id)
        self.assertEqual(before['status'], 'ACTIVE')
        self.assertIsInstance(before['claimed_at'], str)
        AdminAuditLog.objects.create(
            staff=None, target_user=self.user, action_category='DEVICE_RESET',
            action_detail='test', change_log={'before': before, 'after': {}},
        )

    def test_t35_9_refresh_respects_not_null_columns(self):
        """T35-9: device_type is blank=True but null=False."""
        self.pair()
        slot = self.user.mobile_devices.get()

        refresh_slot(slot)
        slot.refresh_from_db()

        self.assertEqual(slot.device_type, '')
        self.assertIsNone(slot.device_name)

    def test_t35_10_code_picks_its_own_slot_not_the_oldest(self):
        """T35-10: a refreshed slot keeps its created_at, so ordering would misfire."""
        self.user.mobile_max_devices = 2
        self.user.save(update_fields=['mobile_max_devices'])
        older = self.issue()
        newer = self.issue()
        MobileDevice.objects.filter(pk=older.pk).update(
            created_at=timezone.now() - timedelta(days=30),
        )

        response = self.login('device-b', HW_B, code=newer.pairing_code)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(MobileDevice.objects.get(pk=newer.pk).status, 'ACTIVE')
        self.assertEqual(MobileDevice.objects.get(pk=older.pk).claim_attempts, 0)

    def test_t35_11_a_wrong_code_burns_every_live_slot(self):
        """T35-11: counting on one slot only would leave the others grindable."""
        self.user.mobile_max_devices = 2
        self.user.save(update_fields=['mobile_max_devices'])
        first, second = self.issue(), self.issue()

        response = self.login('device-b', HW_B, code='TT-0000-0000-0000')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MobileDevice.objects.get(pk=first.pk).claim_attempts, 1)
        self.assertEqual(MobileDevice.objects.get(pk=second.pk).claim_attempts, 1)
        remaining = settings.DEVICE_PAIRING_MAX_ATTEMPTS - 1
        self.assertIn(f'còn {remaining} lần thử', response.data['detail'])


class MobileDeviceAdminAddTests(APITestCase):
    """The admin Add button routes through issue_slot() (feature-35 §6.3)."""

    def setUp(self):
        self.target = User.objects.create_user(
            username='target@example.com', email='target@example.com',
            password=PASSWORD, is_active=True,
        )
        self.admin = User.objects.create_superuser(
            username='admin@example.com', email='admin@example.com', password=PASSWORD,
        )
        self.add_url = reverse('admin:users_mobiledevice_add')

    def test_t35_12_add_allocates_a_slot_with_a_code(self):
        """T35-12: selecting a user is enough; the system mints both codes."""
        self.client.force_login(self.admin)
        response = self.client.post(
            self.add_url, {'user': self.target.pk, 'issued_reason': 'user đổi sang iPhone'},
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        slot = MobileDevice.objects.get(user=self.target)
        self.assertEqual(slot.status, 'UNCLAIMED')
        self.assertTrue(slot.client_code)
        self.assertTrue(slot.pairing_code)
        self.assertEqual(slot.issued_by, self.admin)

    def test_t35_13_add_shows_the_pairing_code_to_the_admin(self):
        """T35-13: the code is delivered out of band, so it has to be readable once."""
        self.client.force_login(self.admin)
        response = self.client.post(
            self.add_url, {'user': self.target.pk, 'issued_reason': ''}, follow=True,
        )

        slot = MobileDevice.objects.get(user=self.target)
        self.assertContains(response, slot.pairing_code)

    def test_t35_14_add_refuses_a_user_that_is_out_of_quota(self):
        """T35-14: the quota error belongs on the form, not in a 500."""
        issue_slot(self.target, staff=None)
        self.client.force_login(self.admin)

        response = self.client.post(
            self.add_url, {'user': self.target.pk, 'issued_reason': ''},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFormError(response.context['form'], 'user',
                             [msg for msg in response.context['form'].errors['user']])
        self.assertEqual(MobileDevice.objects.filter(user=self.target).count(), 1)

    def test_t35_15_add_requires_the_add_permission(self):
        """T35-15: staff without users.add_mobiledevice must not allocate slots."""
        weak = User.objects.create_user(
            username='weak@example.com', email='weak@example.com',
            password=PASSWORD, is_active=True, is_staff=True,
        )
        weak.user_permissions.add(
            Permission.objects.get(codename='view_mobiledevice',
                                   content_type=ContentType.objects.get_for_model(MobileDevice)),
        )
        self.client.force_login(weak)

        response = self.client.get(self.add_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(MobileDevice.objects.exists())

    def test_t35_16_add_writes_the_same_audit_row_as_the_bulk_action(self):
        """T35-16: both entry points go through _log_issue, so shapes must match."""
        self.client.force_login(self.admin)
        self.client.post(self.add_url, {'user': self.target.pk, 'issued_reason': ''})

        slot = MobileDevice.objects.get(user=self.target)
        log = AdminAuditLog.objects.get(target_user=self.target, action_category='MOBILE_SLOT')
        self.assertEqual(log.staff, self.admin)
        self.assertEqual(log.change_log['after']['client_code'], slot.client_code)


class MobileDeviceAdminRefreshButtonTests(APITestCase):
    """The refresh button on the change form (feature-35 §6.5)."""

    def setUp(self):
        self.target = User.objects.create_user(
            username='target@example.com', email='target@example.com',
            password=PASSWORD, is_active=True,
        )
        self.admin = User.objects.create_superuser(
            username='admin@example.com', email='admin@example.com', password=PASSWORD,
        )
        self.slot = issue_slot(self.target, staff=self.admin)
        self.client.force_login(self.admin)

    def change_url(self):
        return reverse('admin:users_mobiledevice_change', args=[self.slot.pk])

    def refresh_url(self):
        return reverse('admin:users_mobiledevice_refresh_slot', args=[self.slot.pk])

    def test_t35_17_change_form_offers_the_button_for_an_occupying_slot(self):
        """T35-17: an unclaimed or active slot can still be refreshed."""
        response = self.client.get(self.change_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, 'Làm mới thiết bị')
        self.assertContains(response, self.refresh_url())

    def test_t35_18_change_form_hides_the_button_on_a_dead_slot(self):
        """T35-18: refresh_slot() would refuse, so do not offer the button."""
        MobileDevice.objects.filter(pk=self.slot.pk).update(status='REVOKED')

        response = self.client.get(self.change_url())

        self.assertNotContains(response, self.refresh_url())

    def test_t35_19_posting_the_button_refreshes_the_slot(self):
        """T35-19: the button and the bulk action share _refresh_one()."""
        old_pairing = self.slot.pairing_code

        response = self.client.post(self.refresh_url())

        self.assertRedirects(response, self.change_url())
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, 'UNCLAIMED')
        self.assertNotEqual(self.slot.pairing_code, old_pairing)
        self.assertTrue(
            AdminAuditLog.objects.filter(
                target_user=self.target, action_category='DEVICE_RESET',
            ).exists()
        )

    def test_t35_20_get_never_mutates(self):
        """T35-20: a refresh must not fire from a link prefetch or a stray GET."""
        old_pairing = self.slot.pairing_code

        response = self.client.get(self.refresh_url())

        self.assertRedirects(response, self.change_url())
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.pairing_code, old_pairing)

    def test_t35_21_refresh_requires_the_change_permission(self):
        """T35-21: read-only staff must not be able to reset a device."""
        weak = User.objects.create_user(
            username='weak@example.com', email='weak@example.com',
            password=PASSWORD, is_active=True, is_staff=True,
        )
        weak.user_permissions.add(
            Permission.objects.get(codename='view_mobiledevice',
                                   content_type=ContentType.objects.get_for_model(MobileDevice)),
        )
        self.client.force_login(weak)

        response = self.client.post(self.refresh_url())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, 'UNCLAIMED')


@no_throttling
class MobileLoginIgnoresAppVersionTests(MobileSlotTestCase):
    """Login must not enforce the update floor (feature-36 §6.3)."""

    def test_t36_9_stale_client_still_gets_a_session(self):
        """
        T36-9: login never looks at AppRelease at all. Feature-37 dropped even
        the app-open enforcement (min_supported_version_code no longer
        exists) — there is no floor anywhere any more, but this pins the
        boundary that login specifically was never the place for it.
        """
        from core.models import AppRelease
        AppRelease.objects.filter(platform=AppRelease.PLATFORM_ANDROID).update(
            version_code=12, version_name='1.2.0',
        )

        response = self.login('device-a', HW_A, code=self.issue().pairing_code,
                              platform_os='android', app_version='1.0.0+7')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_t36_10_login_records_the_version_it_was_told(self):
        """T36-10: app_version is still recorded at login, independent of AppRelease."""
        self.login('device-a', HW_A, code=self.issue().pairing_code,
                   app_version='1.0.0+7')

        self.assertEqual(self.user.mobile_devices.get().app_version, '1.0.0+7')


@no_throttling
class MobileDeviceMetadataViewTests(MobileSlotTestCase):
    """
    PATCH /users/me/mobile-device/ — lets an app update without a fresh
    login report its new app_version, since restoreSession() never re-hits
    /auth/mobile/login/ (the only other place this field is refreshed).
    """

    def setUp(self):
        super().setUp()
        self.url = reverse('user_mobile_device_metadata')

    def authenticate(self):
        tokens = self.pair().data
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')

    def test_updates_app_version_on_the_active_slot(self):
        self.authenticate()

        response = self.client.patch(self.url, {'app_version': '1.0.2+3'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.user.mobile_devices.get().app_version, '1.0.2+3')

    def test_blank_fields_are_left_untouched(self):
        self.authenticate()
        self.user.mobile_devices.update(app_version='1.0.1+2')

        response = self.client.patch(self.url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.user.mobile_devices.get().app_version, '1.0.1+2')

    def test_requires_auth(self):
        response = self.client.patch(self.url, {'app_version': '1.0.2+3'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_404_when_user_has_no_active_mobile_device(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(self.url, {'app_version': '1.0.2+3'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_touch_another_users_slot(self):
        other = User.objects.create_user(
            username='other@example.com', email='other@example.com',
            password=PASSWORD, is_active=True,
        )
        self.client.post(self.login_url, {
            'email': other.email, 'password': PASSWORD,
            'device_id': 'device-other', 'hardware_hash': HW_B,
            'platform_os': 'ios', 'device_name': 'iPhone',
            'pairing_code': issue_slot(other, staff=None).pairing_code,
        }, format='json')

        self.authenticate()  # self.user's token, not other's
        self.client.patch(self.url, {'app_version': '9.9.9+99'}, format='json')

        self.assertIsNone(other.mobile_devices.get().app_version)


@no_throttling
class IssuedReasonSuggestionTests(MobileSlotTestCase):
    """Suggestions on the admin add form (feature-35 §6.3)."""

    def suggestions(self, **kwargs):
        from users.services.mobile_slot import issued_reason_suggestions
        return issued_reason_suggestions(**kwargs)

    def issue_with_reason(self, reason):
        slot = issue_slot(self.user, staff=None, reason=reason)
        MobileDevice.objects.filter(pk=slot.pk).update(status='REVOKED')
        return slot

    def test_presets_come_first_even_with_nothing_used_yet(self):
        from users.services.mobile_slot import ISSUED_REASON_PRESETS

        self.assertEqual(self.suggestions()[:len(ISSUED_REASON_PRESETS)],
                         list(ISSUED_REASON_PRESETS))

    def test_reasons_already_used_here_are_offered_back(self):
        self.issue_with_reason('Chuyển sang máy công ty cấp')

        self.assertIn('Chuyển sang máy công ty cấp', self.suggestions())

    def test_more_used_reasons_come_before_rarer_ones(self):
        for _ in range(3):
            self.issue_with_reason('Đổi sang iPhone')
        self.issue_with_reason('Máy dính nước')

        used = [s for s in self.suggestions() if s.startswith(('Đổi', 'Máy dính'))]
        self.assertEqual(used, ['Đổi sang iPhone', 'Máy dính nước'])

    def test_the_placeholder_the_form_writes_is_never_suggested(self):
        """Suggesting it back would spread a value nobody chose."""
        from users.services.mobile_slot import AUTO_ISSUED_REASON

        self.issue_with_reason(AUTO_ISSUED_REASON)

        self.assertNotIn(AUTO_ISSUED_REASON, self.suggestions())

    def test_a_preset_typed_by_hand_does_not_appear_twice(self):
        from users.services.mobile_slot import ISSUED_REASON_PRESETS

        self.issue_with_reason(ISSUED_REASON_PRESETS[0].lower())

        result = self.suggestions()
        self.assertEqual(sum(1 for r in result if r.casefold()
                             == ISSUED_REASON_PRESETS[0].casefold()), 1)

    def test_the_list_is_capped(self):
        for i in range(20):
            self.issue_with_reason(f'Lý do số {i}')

        self.assertEqual(len(self.suggestions(limit=6)), 6)


class IssueFormSuggestionRenderTests(APITestCase):
    """The datalist has to reach the page, not just the form object."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin@example.com', email='admin@example.com', password=PASSWORD,
        )
        self.client.force_login(self.admin)

    def test_add_page_renders_the_suggestions(self):
        from users.services.mobile_slot import ISSUED_REASON_PRESETS

        response = self.client.get(reverse('admin:users_mobiledevice_add'))

        self.assertContains(response, 'id="issued-reason-options"')
        self.assertContains(response, 'list="issued-reason-options"')
        self.assertContains(response, ISSUED_REASON_PRESETS[0])
