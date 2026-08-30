"""
Mobile login, including first-time pairing (feature-34 §7.6).

One endpoint: pairing_code is optional and only sent the first time a handset
appears. Kept separate from CustomLoginSerializer so the mobile policy never has
to branch inside the web login path.
"""

import logging

from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.db import transaction
from rest_framework import serializers

from ..constants import PLATFORM_MOBILE
from ..exceptions import MobileDeviceError
from ..models import AdminAuditLog
from ..services.auth import authenticate_user, issue_tokens_for_device
from ..services.client_id import normalize_hardware_hash
from ..services.mobile_device import resolve_mobile_device
from ..services.mobile_slot import claim_slot, rebind_known_handset, verify_pairing_code
from ..utils import get_client_ip

logger = logging.getLogger(__name__)


def pairing_required_error(user) -> dict:
    """
    Body of the 400 that asks the client for a pairing code.

    has_unclaimed_slot only says whether a slot is waiting, not whether a code was
    ever issued — the user already knows, since they are the one who asked for it.
    """
    return {
        'code': 'PAIRING_CODE_REQUIRED',
        'detail': 'Thiết bị này chưa được ghép cặp. Vui lòng nhập mã do quản trị viên cấp.',
        'has_unclaimed_slot': user.mobile_devices.filter(status='UNCLAIMED').exists(),
        'support_email': settings.SUPPORT_EMAIL,
    }


class MobileLoginSerializer(serializers.Serializer):
    """POST /api/auth/mobile/login/"""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    device_id = serializers.CharField(required=True, write_only=True, max_length=255)
    device_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    platform_os = serializers.ChoiceField(required=True, write_only=True, choices=['ios', 'android'])
    hardware_hash = serializers.CharField(required=False, write_only=True, allow_blank=True)
    app_version = serializers.CharField(required=False, write_only=True, allow_blank=True)
    os_version = serializers.CharField(required=False, write_only=True, allow_blank=True)
    device_model = serializers.CharField(required=False, write_only=True, allow_blank=True)
    # Only needed the first time this handset appears.
    pairing_code = serializers.CharField(required=False, write_only=True, allow_blank=True)

    def validate(self, attrs):
        request = self.context['request']
        user = authenticate_user(attrs['email'].lower(), attrs['password'])
        hardware_hash = normalize_hardware_hash(attrs.get('hardware_hash'))

        device, outcome = resolve_mobile_device(user, attrs['device_id'], hardware_hash)

        # Known handset on a live slot: no code, ever again.
        if device is not None and device.status == 'ACTIVE':
            rebind_known_handset(device, attrs, hardware_hash, request)
            return self._session(user, device, outcome, claimed=False)

        # Anything else — unknown handset, or one whose slot was revoked or
        # expired — needs a slot staff allocated for this account.
        code = attrs.get('pairing_code')
        if not code:
            raise MobileDeviceError(pairing_required_error(user))

        # Phase 1 — OUTSIDE the write transaction so a wrong code still commits
        # its attempt counter (see services.mobile_slot).
        slot = verify_pairing_code(user, code)

        # Phase 2 — the code is good; bind the handset and spend the slot together.
        with transaction.atomic():
            device = claim_slot(slot, attrs, hardware_hash, request)
            self._log_claim(user, slot, device, request)

        return self._session(user, device, outcome, claimed=True)

    def _session(self, user, device, outcome, claimed: bool) -> dict:
        update_last_login(None, user)
        # Structured line for metric M1 (design §12): a rebound rate near zero on
        # Android means the hardware anchor is not working.
        logger.info(
            'mobile_login outcome=%s claimed=%s client_code=%s',
            outcome, claimed, device.client_code,
        )
        return {
            'user': user,
            'device': device,
            'rebound': outcome == 'rebound',
            'claimed': claimed,
            **issue_tokens_for_device(user, device, PLATFORM_MOBILE),
        }

    @staticmethod
    def _log_claim(user, slot, device, request):
        AdminAuditLog.objects.create(
            staff=slot.issued_by,
            target_user=user,
            action_category='MOBILE_SLOT',
            action_detail=f'Handset claimed slot {device.client_code}',
            change_log={
                'before': {'status': 'UNCLAIMED'},
                'after': {
                    'status': 'ACTIVE',
                    'client_code': device.client_code,
                    'device_name': device.device_name,
                },
                'issued_by': slot.issued_by.email if slot.issued_by else None,
            },
            ip_address=get_client_ip(request),
        )
