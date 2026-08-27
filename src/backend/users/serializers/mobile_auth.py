"""
Mobile login and device activation (feature-34 §7.6, §7.7).

Kept separate from CustomLoginSerializer so the mobile policy — one active
device, hardware-anchored identity, staff-issued handset changes — never has to
branch inside the web login path.
"""

import logging

from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from ..constants import PLATFORM_MOBILE
from ..exceptions import MobileDeviceError
from ..models import AdminAuditLog, MobileDevice
from ..services.activation import consume_activation_key, verify_activation_key
from ..services.auth import authenticate_user, issue_tokens_for_device
from ..services.client_id import normalize_hardware_hash
from ..services.mobile_device import requires_activation, resolve_mobile_device
from ..services.tokens import blacklist_tokens_for_devices
from ..utils import get_client_ip

logger = logging.getLogger(__name__)


def activation_required_error(active) -> dict:
    """Body of the 400 that sends the client to the activation screen."""
    return {
        'code': 'ACTIVATION_REQUIRED',
        'detail': (
            f'Tài khoản đang liên kết với thiết bị khác (mã {active.client_code}). '
            f'Vui lòng liên hệ admin để nhận mã kích hoạt cho thiết bị này.'
        ),
        'bound_device': {
            'client_code': active.client_code,
            'device_name': active.device_name,
            'last_active': active.last_active.isoformat(),
        },
        'support_email': settings.SUPPORT_EMAIL,
    }


@transaction.atomic
def bind_mobile_device(user, device, attrs, hardware_hash, request):
    """
    Make `device` the user's one active mobile handset.

    The outgoing device is stood down BEFORE the incoming one is saved:
    uniq_active_mobile_device_per_user rejects a second ACTIVE row, so saving
    first would raise IntegrityError on every real device change.
    """
    outgoing = user.mobile_devices.exclude(status='REVOKED')
    if device.pk:
        outgoing = outgoing.exclude(pk=device.pk)
    stale = list(outgoing.values_list('device_id', flat=True))

    if stale:
        user.mobile_devices.filter(device_id__in=stale).update(
            status='REVOKED', revoked_at=timezone.now(), revoked_reason='REPLACED',
        )
        blacklist_tokens_for_devices(user, stale)

    device.device_type = 'IOS' if attrs['platform_os'] == 'ios' else 'ANDROID'
    # device_name comes from the client: the Dio User-Agent ("Dart/3.x") tells us
    # nothing, so parse_device_name() is deliberately not used here.
    device.device_name = attrs.get('device_name') or attrs.get('device_model') or 'Mobile'
    device.hardware_hash = hardware_hash or device.hardware_hash
    device.app_version = attrs.get('app_version') or None
    device.os_version = attrs.get('os_version') or None
    device.device_model = attrs.get('device_model') or None
    device.last_ip = get_client_ip(request)
    device.status = 'ACTIVE'
    device.revoked_at = None
    device.revoked_reason = None
    device.save()


class MobileDevicePayloadMixin(serializers.Serializer):
    """Device fields both mobile endpoints accept."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    device_id = serializers.CharField(required=True, write_only=True, max_length=255)
    device_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    platform_os = serializers.ChoiceField(required=True, write_only=True, choices=['ios', 'android'])
    hardware_hash = serializers.CharField(required=False, write_only=True, allow_blank=True)
    app_version = serializers.CharField(required=False, write_only=True, allow_blank=True)
    os_version = serializers.CharField(required=False, write_only=True, allow_blank=True)
    device_model = serializers.CharField(required=False, write_only=True, allow_blank=True)


class MobileLoginSerializer(MobileDevicePayloadMixin):
    """POST /api/auth/mobile/login/"""

    def validate(self, attrs):
        request = self.context['request']
        user = authenticate_user(attrs['email'].lower(), attrs['password'])
        hardware_hash = normalize_hardware_hash(attrs.get('hardware_hash'))
        device, outcome = resolve_mobile_device(user, attrs['device_id'], hardware_hash)

        # Applies to EVERY outcome, not just 'new'. Checking only 'new' would let
        # a user whose old handset was replaced through an activation key simply
        # log back in on it: the old row still matches by device_id, and binding
        # it would silently revoke the current one.
        if requires_activation(user, device):
            active = user.mobile_devices.filter(status='ACTIVE').first()
            raise MobileDeviceError(activation_required_error(active))

        if device is None:
            device = MobileDevice(user=user, device_id=attrs['device_id'])

        bind_mobile_device(user, device, attrs, hardware_hash, request)
        update_last_login(None, user)

        # Structured line for metric M1 (design §12): a rebound rate near zero on
        # Android means the hardware anchor is not working.
        logger.info(
            'mobile_login outcome=%s platform=%s client_code=%s',
            outcome, attrs['platform_os'], device.client_code,
        )
        return {
            'user': user,
            'device': device,
            'rebound': outcome == 'rebound',
            **issue_tokens_for_device(user, device, PLATFORM_MOBILE),
        }


class MobileActivateSerializer(MobileDevicePayloadMixin):
    """POST /api/auth/mobile/activate/ — the only path to a different handset."""

    activation_key = serializers.CharField(required=True, write_only=True, max_length=32)

    def validate(self, attrs):
        request = self.context['request']
        user = authenticate_user(attrs['email'].lower(), attrs['password'])
        hardware_hash = normalize_hardware_hash(attrs.get('hardware_hash'))
        device, outcome = resolve_mobile_device(user, attrs['device_id'], hardware_hash)

        # Same gate as login, read the other way round. Refusing here keeps a
        # single-use key from being spent on a handset that could simply log in.
        if not requires_activation(user, device):
            raise MobileDeviceError({
                'code': 'ALREADY_BOUND',
                'detail': 'Thiết bị này đăng nhập được bình thường, không cần mã kích hoạt.',
            })

        # Phase 1 — OUTSIDE any write transaction, so a wrong code still commits
        # its attempt counter. Raises ActivationError on failure.
        key = verify_activation_key(user, attrs['activation_key'])

        # Phase 2 — the key is good; bind the handset and spend the key together.
        with transaction.atomic():
            old = user.mobile_devices.filter(status='ACTIVE').first()
            # A handset this user has owned before keeps its original row and
            # client_code: the code identifies the physical device (§6.5), and a
            # new row would collide with unique_together(user, device_id) anyway.
            if outcome == 'new':
                device = MobileDevice(user=user, device_id=attrs['device_id'])

            bind_mobile_device(user, device, attrs, hardware_hash, request)
            consume_activation_key(key, device, get_client_ip(request))
            self._log_activation(user, key, old, device, request)

        update_last_login(None, user)
        return {
            'user': user,
            'device': device,
            'rebound': outcome == 'rebound',
            **issue_tokens_for_device(user, device, PLATFORM_MOBILE),
        }

    @staticmethod
    def _log_activation(user, key, old, device, request):
        AdminAuditLog.objects.create(
            staff=key.issued_by,
            target_user=user,
            action_category='DEVICE_ACTIVATION',
            action_detail=f'User activated device {device.client_code} with key {key.key}',
            change_log={
                'before': {
                    'client_code': old.client_code if old else None,
                    'device_name': old.device_name if old else None,
                },
                'after': {
                    'client_code': device.client_code,
                    'device_name': device.device_name,
                    'returning_handset': device.pk is not None and old is not None
                                         and device.pk != old.pk,
                },
                'activation_key': key.key,
                'issued_by': key.issued_by.email if key.issued_by else None,
            },
            ip_address=get_client_ip(request),
        )
