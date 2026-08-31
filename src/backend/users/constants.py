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
PAIRING_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
PAIRING_PREFIX = 'TT'
# 6 chars (~30 bit) is plenty: the real gate is that a wrong password never
# even reaches this check, plus 5 attempts and a 7-day expiry on top
# (feature-38 §3.2) — not the code's own length.
PAIRING_BODY_LENGTH = 6

CLIENT_CODE_PREFIX = 'MC'
