"""API exceptions that need to render a flat JSON body."""

from rest_framework import status
from rest_framework.exceptions import APIException


class MobileDeviceError(APIException):
    """
    A 400 whose body is returned exactly as given.

    serializers.ValidationError cannot be used for these: it wraps every dict
    value in a list, so clients reading `data['code']` would get
    `['ACTIVATION_REQUIRED']` instead of the string the API contract promises.
    """

    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, payload: dict):
        self.detail = payload
