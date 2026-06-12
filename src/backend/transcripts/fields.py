import base64

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _get_fernet() -> Fernet:
    """
    Derive Fernet key from Django SECRET_KEY.
    Uses first 32 bytes of SECRET_KEY, base64url-encoded.
    Supports key rotation via FERNET_KEYS list in settings (first key = current).
    """
    keys = getattr(settings, 'FERNET_KEYS', None)
    if not keys:
        raw = settings.SECRET_KEY.encode()[:32].ljust(32, b'=')
        keys = [base64.urlsafe_b64encode(raw)]
    # Use MultiFernet if multiple keys, otherwise single Fernet
    if len(keys) > 1:
        from cryptography.fernet import MultiFernet
        return MultiFernet([Fernet(k) for k in keys])
    return Fernet(keys[0])


class EncryptedCharField(models.BinaryField):
    """
    CharField that stores its value encrypted at rest using Fernet (AES-128-CBC + HMAC-SHA256).
    Reads/writes plaintext transparently. Not filterable by value (by design).
    Encryption key derived from settings.SECRET_KEY or settings.FERNET_KEYS.
    """

    def __init__(self, max_length=200, **kwargs):
        self._plain_max_length = max_length
        kwargs.setdefault('editable', True)
        super().__init__(**kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs['max_length'] = self._plain_max_length
        kwargs.pop('editable', None)
        return name, path, args, kwargs

    def get_internal_type(self):
        return 'BinaryField'

    def from_db_value(self, value, expression, connection):
        if value is None:
            return ''
        try:
            raw = bytes(value) if not isinstance(value, bytes) else value
            return _get_fernet().decrypt(raw).decode()
        except (InvalidToken, Exception):
            return ''

    def to_python(self, value):
        if isinstance(value, bytes):
            return self.from_db_value(value, None, None)
        return value or ''

    def get_prep_value(self, value):
        if not value:
            return None
        if isinstance(value, bytes):
            return value
        return _get_fernet().encrypt(value.encode())

    def value_to_string(self, obj):
        return self.value_from_object(obj)

    def formfield(self, **kwargs):
        from django.forms import CharField
        defaults = {'max_length': self._plain_max_length}
        defaults.update(kwargs)
        return CharField(**defaults)
