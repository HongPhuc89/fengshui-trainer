from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from .constants import PLATFORM_MOBILE


class DeviceJWTAuthentication(JWTAuthentication):
    """
    Reject access tokens whose device has been revoked (e.g. another device
    logged in and kicked this one out, or staff unbound it).
    """

    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        device_id = token.get('device_id')
        if not device_id:
            raise InvalidToken('Token missing device binding.')

        user = self.get_user(token)
        model = self._device_model(token)
        if not model.objects.filter(user=user, device_id=device_id, status='ACTIVE').exists():
            raise InvalidToken('Device session has been revoked.')
        return token

    @staticmethod
    def _device_model(token):
        """
        Pick the table this token's device lives in.

        Tokens minted before feature-34 carry no platform claim. They can only be
        web tokens: mobile login always failed on a device_type mismatch, so no
        mobile token was ever issued. This branch falls away once every
        pre-release refresh token has expired.
        """
        from .models import MobileDevice, UserDevice

        return MobileDevice if token.get('platform') == PLATFORM_MOBILE else UserDevice
