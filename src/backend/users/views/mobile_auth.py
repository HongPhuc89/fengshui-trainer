"""Mobile authentication endpoints (feature-34 §7.6, §7.7)."""

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..serializers import UserSerializer
from ..serializers.mobile_auth import MobileActivateSerializer, MobileLoginSerializer
from ..services.activation import ActivationError
from ..throttles import ActivationRateThrottle, MobileLoginRateThrottle


class _MobileAuthView(generics.GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response({
            'user': UserSerializer(data['user']).data,
            'refresh': data['refresh'],
            'access': data['access'],
            'client_code': data['device'].client_code,
            'rebound': data['rebound'],
        }, status=status.HTTP_200_OK)


class MobileLoginView(_MobileAuthView):
    """POST /api/auth/mobile/login/"""

    serializer_class = MobileLoginSerializer
    throttle_classes = [MobileLoginRateThrottle]


class MobileActivateView(_MobileAuthView):
    """
    POST /api/auth/mobile/activate/

    NOT decorated with @transaction.atomic, and it must stay that way.
    RegisterView.create() in users/views/auth.py does use that decorator; copying
    the pattern here would pull verify_activation_key() into the view's
    transaction, so a wrong code would roll back its own attempt counter and the
    five-attempt lockout would silently stop working.
    """

    serializer_class = MobileActivateSerializer
    throttle_classes = [ActivationRateThrottle]

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except ActivationError as exc:
            return Response(
                {'code': 'ACTIVATION_FAILED', 'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
