from rest_framework import status, views
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..serializers.password_reset import (
    ConfirmResetSerializer,
    RequestOTPSerializer,
    VerifyOTPSerializer,
)
from ..services.password_reset import (
    RateLimitExceeded,
    confirm_reset,
    request_otp,
    verify_otp,
)
from ..throttles import OtpRequestRateThrottle


class RequestOTPView(views.APIView):
    """POST /api/auth/password-reset/request/

    Send a 6-digit OTP to the given email address.
    """

    permission_classes = (AllowAny,)
    throttle_classes = [OtpRequestRateThrottle]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = request_otp(serializer.validated_data['email'])
        except RateLimitExceeded as e:
            return Response({'detail': str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Mã OTP đã được gửi đến email của bạn.', **result})


class VerifyOTPView(views.APIView):
    """POST /api/auth/password-reset/verify/

    Validate the OTP and return a short-lived reset token on success.
    """

    permission_classes = (AllowAny,)
    throttle_classes = [OtpRequestRateThrottle]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = verify_otp(
                serializer.validated_data['email'],
                serializer.validated_data['otp'],
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class ConfirmResetView(views.APIView):
    """POST /api/auth/password-reset/confirm/

    Set a new password using the reset token obtained from VerifyOTPView.
    """

    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = ConfirmResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirm_reset(
                serializer.validated_data['reset_token'],
                serializer.validated_data['new_password'],
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Mật khẩu đã được đặt lại thành công.'})
