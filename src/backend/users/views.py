from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, RegisterSerializer, CustomLoginSerializer
from .models import User

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens for immediate login after registration
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = CustomLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        return Response({
            'user': UserSerializer(serializer.validated_data['user']).data,
            'refresh': serializer.validated_data['refresh'],
            'access': serializer.validated_data['access'],
        }, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/users/me/ - Get or update current user profile."""
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class DeviceStatusView(views.APIView):
    """GET /api/users/me/device-status/ - Show bound device and next reset date."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

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
