from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.db import transaction

from ..models import User
from ..serializers import UserSerializer, RegisterSerializer, CustomLoginSerializer
from ..throttles import RegisterRateThrottle, LoginRateThrottle
from logging import getLogger

logger = getLogger(__name__)


class DeviceTokenRefreshView(TokenRefreshView):
    """
    Extends TokenRefreshView to forward the device_id claim from the refresh
    token into the newly issued access token, so DeviceJWTAuthentication can
    still validate the device session after a token refresh.
    """
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        refresh = RefreshToken(request.data['refresh'])
        device_id = refresh.get('device_id')

        access = refresh.access_token
        if device_id:
            access['device_id'] = device_id

        return Response({'access': str(access)})


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterRateThrottle]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Do not issue JWT tokens — account is inactive until admin activates it
        return Response({
            'message': 'Tài khoản đã được tạo thành công. Vui lòng chờ admin kích hoạt tài khoản.',
            'email': user.email,
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = CustomLoginSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response({
            'user': UserSerializer(data['user']).data,
            'refresh': data['refresh'],
            'access': data['access'],
        }, status=status.HTTP_200_OK)


@extend_schema(request=None, responses={205: None})
class LogoutView(views.APIView):
    """
    Logout: client nên gửi { "refresh": "<refresh_token>" } để server blacklist token.
    Nếu không gửi, vẫn 205 (client xóa token ở local) nhưng refresh token vẫn dùng được đến hết hạn.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh_raw = request.data.get("refresh")
        if refresh_raw:
            try:
                token = RefreshToken(refresh_raw)
                token.blacklist()
            except Exception:
                logger.exception("Blacklist refresh token failed")
        return Response(status=status.HTTP_205_RESET_CONTENT)
