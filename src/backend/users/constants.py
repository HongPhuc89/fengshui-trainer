"""Shared constants for device binding and activation keys (feature-34)."""

# Platform discriminator. Not a database column: mobile and web devices live in
# separate tables. This value travels as a JWT claim so DeviceJWTAuthentication
# knows which table to resolve a token's device_id against.
PLATFORM_MOBILE = 'MOBILE'
PLATFORM_WEB = 'WEB'

# Android returns these well-known broken values on some old ROMs; treating them
# as a real hardware anchor would make every affected phone look like the same
# device as every other affected phone.
ANDROID_ID_DENYLIST = {
    '9774d56d682e549c',
    '0000000000000000',
}

# Crockford Base32 minus I, L, O and U — the characters people misread when a
# code is spelled out over the phone.
ACTIVATION_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
ACTIVATION_PREFIX = 'TT'
ACTIVATION_BODY_LENGTH = 12

CLIENT_CODE_PREFIX = 'MC'
