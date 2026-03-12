from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class DeviceJWTAuthentication(JWTAuthentication):
    """
    Extends JWTAuthentication to reject access tokens whose device has been
    revoked (e.g. another device logged in and kicked this one out).
    """

    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        device_id = token.get('device_id')
        if not device_id:
            raise InvalidToken('Token missing device binding.')
        user = self.get_user(token)
        from .models import UserDevice
        if not UserDevice.objects.filter(
            user=user,
            device_id=device_id,
            status='ACTIVE',
        ).exists():
            raise InvalidToken('Device session has been revoked.')
        return token
