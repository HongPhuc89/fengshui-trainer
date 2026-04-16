import io
from datetime import timedelta
from logging import getLogger

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from PIL import Image
from rest_framework import generics, status, views
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..serializers import UserSerializer
from ..serializers.user import ChangePasswordSerializer
from ..throttles import LoginRateThrottle

logger = getLogger(__name__)

ALLOWED_AVATAR_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB
AVATAR_DIMENSION = 400


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/users/me/ - Get or update current user profile."""
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AvatarUploadView(views.APIView):
    """POST /api/users/me/avatar/ - Upload and replace user avatar."""
    permission_classes = (IsAuthenticated,)
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'detail': 'Không có file ảnh.'}, status=status.HTTP_400_BAD_REQUEST)

        if file.content_type not in ALLOWED_AVATAR_TYPES:
            return Response(
                {'detail': 'Định dạng không hỗ trợ. Chỉ chấp nhận JPEG, PNG, WEBP.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > MAX_AVATAR_SIZE:
            return Response(
                {'detail': 'File quá lớn. Tối đa 5MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Process with Pillow: resize + center-crop to 400×400 JPEG
        img = Image.open(file)
        img = img.convert('RGB')

        # Scale down so the shorter side = AVATAR_DIMENSION, then center-crop
        w, h = img.size
        if w < h:
            new_w = AVATAR_DIMENSION
            new_h = int(h * AVATAR_DIMENSION / w)
        else:
            new_h = AVATAR_DIMENSION
            new_w = int(w * AVATAR_DIMENSION / h)
        img = img.resize((new_w, new_h), Image.LANCZOS)

        left = (new_w - AVATAR_DIMENSION) // 2
        top = (new_h - AVATAR_DIMENSION) // 2
        img = img.crop((left, top, left + AVATAR_DIMENSION, top + AVATAR_DIMENSION))

        output = io.BytesIO()
        img.save(output, format='JPEG', quality=88, optimize=True)
        output.seek(0)

        user = request.user
        if user.avatar:
            user.avatar.delete(save=False)

        user.avatar.save(f'{user.pk}.jpg', ContentFile(output.read()), save=True)

        avatar_url = request.build_absolute_uri(user.avatar.url)
        return Response({'avatar_url': avatar_url}, status=status.HTTP_200_OK)


class ChangePasswordView(views.APIView):
    """POST /api/users/me/change-password/ — Change password for the authenticated user."""
    permission_classes = (IsAuthenticated,)
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.check_password(serializer.validated_data['current_password']):
            return Response(
                {'current_password': 'Mật khẩu hiện tại không đúng.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_password = serializer.validated_data['new_password']

        # validate_password called here (not in serializer) so UserAttributeSimilarityValidator
        # has the user object to check against email/name attributes.
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response({'new_password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])

        logger.info('change_password_success: user_id=%s email=%s', user.pk, user.email)
        return Response({'message': 'Đổi mật khẩu thành công.'})


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
