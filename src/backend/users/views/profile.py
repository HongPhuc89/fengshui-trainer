import io
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
from ..serializers.auth import MAX_DEVICES
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

        if user.password_changed_at == timezone.localdate():
            return Response(
                {'detail': 'Bạn chỉ có thể đổi mật khẩu một lần mỗi ngày.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

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
        user.password_changed_at = timezone.localdate()
        user.save(update_fields=['password', 'password_changed_at'])

        logger.info('change_password_success: user_id=%s email=%s', user.pk, user.email)
        return Response({'message': 'Đổi mật khẩu thành công.'})


@extend_schema(responses={200: {
    'type': 'object',
    'properties': {
        'is_device_locked': {'type': 'boolean'},
        'bound_device': {'type': 'object', 'nullable': True},
        'mobile_device': {'type': 'object', 'nullable': True},
        'last_device_reset': {'type': 'string', 'format': 'date-time', 'nullable': True},
        'next_reset_available_at': {'type': 'string', 'format': 'date-time', 'nullable': True},
        'can_reset_now': {'type': 'boolean'},
    },
}})
class DeviceStatusView(views.APIView):
    """GET /api/users/me/device-status/ - Show the bound mobile handset and web device usage."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        # "Bound device" now means the mobile handset. is_primary_bound was never
        # set anywhere, so this used to be null for everyone; a web device is a
        # disposable slot, not a binding.
        mobile = user.mobile_devices.filter(status='ACTIVE').first()

        return Response({
            'is_device_locked': user.is_device_locked,
            'bound_device': {
                'device_id': mobile.device_id,
                'device_type': mobile.device_type,
                'device_name': mobile.device_name or mobile.device_id,
                'last_active': mobile.last_active.isoformat(),
            } if mobile else None,
            'mobile_device': {
                'client_code': mobile.client_code,
                'device_name': mobile.device_name,
                'device_type': mobile.device_type,
                'device_model': mobile.device_model,
                'app_version': mobile.app_version,
                'os_version': mobile.os_version,
                'bound_at': mobile.bound_at.isoformat() if mobile.bound_at else None,
                'last_active': mobile.last_active.isoformat(),
            } if mobile else None,
            'last_device_reset': user.last_device_reset.isoformat() if user.last_device_reset else None,
            # The 365-day self-reset was removed with feature-34: a handset change
            # is staff-gated. The fields stay so older clients keep parsing the
            # payload, but they can no longer advertise an available reset.
            'next_reset_available_at': None,
            'can_reset_now': False,
            'web_devices_count': user.devices.filter(status='ACTIVE').count(),
            'web_devices_quota': MAX_DEVICES,
        })


class MobileDeviceMetadataView(views.APIView):
    """
    PATCH /api/users/me/mobile-device/ - Refresh this handset's reported
    app_version/os_version without requiring a fresh login.

    apply_handset_metadata() (users/services/mobile_slot.py) already keeps
    this current on every /auth/mobile/login/ call, but a session restored
    from a still-valid access token never calls that endpoint again — so a
    user who updates the app without logging out would have a stale
    app_version on their MobileDevice row until their token happens to
    expire. This lets the app report the change as soon as it starts.
    """
    permission_classes = (IsAuthenticated,)

    def patch(self, request):
        mobile = request.user.mobile_devices.filter(status='ACTIVE').first()
        if mobile is None:
            return Response({'detail': 'Không có thiết bị mobile nào đang hoạt động.'}, status=404)

        app_version = request.data.get('app_version')
        os_version = request.data.get('os_version')
        fields = []
        if app_version:
            mobile.app_version = app_version
            fields.append('app_version')
        if os_version:
            mobile.os_version = os_version
            fields.append('os_version')
        if fields:
            mobile.save(update_fields=fields)

        return Response({'app_version': mobile.app_version, 'os_version': mobile.os_version})
