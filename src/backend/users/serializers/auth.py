from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from ..models import User, UserDevice
from ..utils import get_client_ip, parse_device_name

MAX_DEVICES = 3


class RegisterSerializer(serializers.ModelSerializer):
    """Register with email (identifier), password, and device info. Other fields via profile update."""
    email = serializers.EmailField(required=True, write_only=True, allow_blank=False)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    device_id = serializers.CharField(write_only=True, required=True, max_length=255)
    device_type = serializers.ChoiceField(write_only=True, required=True, choices=UserDevice.DEVICE_TYPE_CHOICES)
    device_name = serializers.CharField(write_only=True, required=False, max_length=255, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'device_id', 'device_type', 'device_name')

    def validate_email(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Email is required and cannot be blank.")
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        device_id = validated_data.pop('device_id')
        device_type = validated_data.pop('device_type')
        validated_data.pop('device_name', '')
        email = validated_data['email']
        password = validated_data['password']

        request = self.context.get('request')
        ua_string = request.META.get('HTTP_USER_AGENT', '') if request else ''
        device_name = parse_device_name(ua_string)
        client_ip = get_client_ip(request) if request else None

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
        )

        UserDevice.objects.create(
            user=user,
            device_id=device_id,
            device_type=device_type,
            device_name=device_name,
            user_agent=ua_string,
            last_ip=client_ip,
            is_primary_bound=True,
            status='ACTIVE',
        )
        return user


class CustomLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    device_id = serializers.CharField(required=True, write_only=True)
    device_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    device_type = serializers.ChoiceField(required=True, write_only=True, choices=UserDevice.DEVICE_TYPE_CHOICES)

    def validate(self, attrs):
        email = attrs.get('email', '').lower()
        password = attrs.get('password')
        current_device_id = attrs.get('device_id')
        device_type = attrs.get('device_type')

        request = self.context.get('request')
        ua_string = request.META.get('HTTP_USER_AGENT', '') if request else ''
        device_name = parse_device_name(ua_string)
        client_ip = get_client_ip(request) if request else None

        user = authenticate(request=request, username=email, password=password)
        if not user:
            raise serializers.ValidationError({"detail": "Invalid email or password."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "User account is disabled."})

        # Check device limit before creating a new record
        is_new_device = not user.devices.filter(device_id=current_device_id).exists()
        if is_new_device and user.devices.count() >= MAX_DEVICES:
            raise serializers.ValidationError({"detail": f"Tài khoản đã đăng ký tối đa {MAX_DEVICES} thiết bị."})

        device, created = UserDevice.objects.get_or_create(
            user=user,
            device_id=current_device_id,
            defaults={
                'device_type': device_type,
                'device_name': device_name,
                'user_agent': ua_string,
                'last_ip': client_ip,
                'is_primary_bound': False,
                'status': 'ACTIVE',
            }
        )

        if not created:
            device.device_type = device_type
            device.device_name = device_name
            device.user_agent = ua_string
            device.last_ip = client_ip
            device.status = 'ACTIVE'
            device.save()

        # Blacklist all outstanding tokens → logout all other active sessions
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        # Mark all other devices as REVOKED so DeviceJWTAuthentication rejects their tokens
        user.devices.exclude(device_id=current_device_id).update(status='REVOKED')

        # Issue new token with device_id claim embedded
        refresh = RefreshToken.for_user(user)
        refresh['device_id'] = current_device_id
        return {
            'user': user,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
