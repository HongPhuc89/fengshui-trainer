"""Authentication helpers shared by the web and mobile login flows (§3.1)."""

from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import User

INVALID_CREDENTIALS = 'Invalid email or password.'
PENDING_APPROVAL = (
    'Tài khoản của bạn đang chờ admin kích hoạt. '
    'Vui lòng liên hệ admin@huyenhoc.pro để được hỗ trợ.'
)


def authenticate_user(email: str, password: str) -> User:
    """
    Resolve credentials to a User, raising the same errors both login flows use.

    Keeps the three-way distinction the web login already makes, because the
    cases are not interchangeable to the person reading the message:
      - unknown email or wrong password -> INVALID_CREDENTIALS
      - correct password but is_active=False -> PENDING_APPROVAL
      - otherwise -> the authenticated User

    django.contrib.auth.authenticate() alone cannot express the middle case: it
    returns None for an inactive user, which would report a pending account as a
    wrong password and send the user off to reset a password that was never wrong.
    """
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise serializers.ValidationError({'detail': INVALID_CREDENTIALS})

    if not user.check_password(password):
        raise serializers.ValidationError({'detail': INVALID_CREDENTIALS})

    if not user.is_active:
        raise serializers.ValidationError({'detail': PENDING_APPROVAL})

    authenticated = authenticate(username=email, password=password)
    if not authenticated:
        raise serializers.ValidationError({'detail': INVALID_CREDENTIALS})
    return authenticated


def issue_tokens_for_device(user, device, platform: str) -> dict:
    """
    Mint an access/refresh pair carrying the device_id and platform claims.

    Both claims are required: device_id binds the session to one handset, and
    platform tells DeviceJWTAuthentication which table to look that id up in.
    """
    refresh = RefreshToken.for_user(user)
    refresh['device_id'] = device.device_id
    refresh['platform'] = platform
    # for_user() writes the OutstandingToken row before these claims exist, so the
    # stored copy carries no device_id and blacklist_tokens_for_devices() could
    # never match it. Re-sync the row with the token actually handed out; rotation
    # in TokenRefreshSerializer calls outstand() after the claims are already on
    # the payload, so only this first token needs the fix.
    OutstandingToken.objects.filter(jti=refresh[api_settings.JTI_CLAIM]).update(
        token=str(refresh),
    )
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}
