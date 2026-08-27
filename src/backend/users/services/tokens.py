"""Refresh-token blacklisting scoped to specific devices (feature-34 §7.12)."""

import logging

import jwt
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

logger = logging.getLogger(__name__)


def blacklist_tokens_for_devices(user, device_ids) -> int:
    """
    Blacklist only the refresh tokens bound to the given devices.

    Login used to blacklist every outstanding token of the user, which signed the
    user out of every platform at once. Scoping by the token's device_id claim
    keeps a mobile login from killing the web session and vice versa.

    Decoding without signature verification is safe here: the tokens come from
    our own OutstandingToken table and the claim is only used to match rows, not
    to grant anything. Authorisation still runs through DeviceJWTAuthentication.
    """
    targets = set(device_ids or ())
    if not targets:
        return 0

    count = 0
    for token in OutstandingToken.objects.filter(user=user):
        try:
            claims = jwt.decode(token.token, options={'verify_signature': False})
        except jwt.PyJWTError:
            logger.warning('Skipping undecodable outstanding token id=%s', token.pk)
            continue
        if claims.get('device_id') in targets:
            _, created = BlacklistedToken.objects.get_or_create(token=token)
            count += int(created)
    return count
