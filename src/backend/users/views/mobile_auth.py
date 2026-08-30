"""Mobile authentication endpoint (feature-34 §7.6)."""

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..serializers import UserSerializer
from ..serializers.mobile_auth import MobileLoginSerializer
from ..services.mobile_slot import SlotError
from ..throttles import MobileLoginRateThrottle


class MobileLoginView(generics.GenericAPIView):
    """
    POST /api/auth/mobile/login/

    NOT decorated with @transaction.atomic, and it must stay that way.
    RegisterView.create() in users/views/auth.py does use that decorator; copying
    the pattern here would pull verify_pairing_code() into the view's
    transaction, so a wrong code would roll back its own attempt counter and the
    lockout would silently stop working.
    """

    permission_classes = (AllowAny,)
    serializer_class = MobileLoginSerializer
    throttle_classes = [MobileLoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        try:
            serializer.is_valid(raise_exception=True)
        except SlotError as exc:
            return Response(
                {'code': 'PAIRING_FAILED', 'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        return Response({
            'user': UserSerializer(data['user']).data,
            'refresh': data['refresh'],
            'access': data['access'],
            'client_code': data['device'].client_code,
            'rebound': data['rebound'],
            'claimed': data['claimed'],
        }, status=status.HTTP_200_OK)
