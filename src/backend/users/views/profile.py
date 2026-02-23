from datetime import timedelta

from drf_spectacular.utils import extend_schema
from rest_framework import generics, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from ..serializers import UserSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/users/me/ - Get or update current user profile."""
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


@extend_schema(responses={200: {
    'type': 'object',
    'properties': {
        'is_device_locked': {'type': 'boolean'},
        'bound_device': {'type': 'object', 'nullable': True},
        'last_device_reset': {'type': 'string', 'format': 'date-time', 'nullable': True},
        'next_reset_available_at': {'type': 'string', 'format': 'date-time', 'nullable': True},
        'can_reset_now': {'type': 'boolean'},
    },
}})
class DeviceStatusView(views.APIView):
    """GET /api/users/me/device-status/ - Show bound device and next reset date."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        bound = user.devices.filter(is_primary_bound=True, status='ACTIVE').first()
        next_reset = None
        can_reset = False
        if user.last_device_reset:
            reset_available_at = user.last_device_reset + timedelta(days=365)
            next_reset = reset_available_at.isoformat()
            can_reset = timezone.now() >= reset_available_at

        return Response({
            'is_device_locked': user.is_device_locked,
            'bound_device': {
                'device_id': bound.device_id,
                'device_type': bound.device_type,
                'device_name': bound.device_name or bound.device_id,
                'last_active': bound.last_active.isoformat() if bound else None,
            } if bound else None,
            'last_device_reset': user.last_device_reset.isoformat() if user.last_device_reset else None,
            'next_reset_available_at': next_reset,
            'can_reset_now': can_reset,
        })
