from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.db.models import Q
from django.utils import timezone
from ..constants import PLATFORM_WEB
from ..models import User, UserDevice
from ..services.auth import issue_tokens_for_device
from ..services.tokens import blacklist_tokens_for_devices
from ..utils import get_client_ip, normalize_device_key, parse_device_name

MAX_DEVICES = 5


class RegisterSerializer(serializers.ModelSerializer):
    """
    Register with email and password. Other fields go through profile update.

    Device fields used to be declared here but were popped and discarded in
    create() — no UserDevice was ever built from them, since binding happens at
    first login after an admin activates the account. Keeping them declared broke
    mobile registration: the app sends device_type "ios", which is not in
    UserDevice.DEVICE_TYPE_CHOICES. Clients may still send the fields; DRF
    ignores keys that are not declared.
    """
    email = serializers.EmailField(required=True, write_only=True, allow_blank=False)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('email', 'password')

    def validate_email(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Email is required and cannot be blank.")
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            is_active=False,  # Account must be activated by admin before user can log in
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

        # authenticate() rejects inactive users (returns None) before we can check is_active.
        # So first look up the user manually to distinguish "wrong password" from "inactive account".
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        if not user_obj.check_password(password):
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        if not user_obj.is_active:
            raise serializers.ValidationError({"detail": "Tài khoản của bạn đang chờ admin kích hoạt. Vui lòng liên hệ admin@huyenhoc.pro để được hỗ trợ."})

        if user_obj.is_review_account:
            raise serializers.ValidationError({"detail": "Tài khoản này chỉ dùng để đăng nhập trên ứng dụng di động."})

        user = authenticate(request=request, username=email, password=password)
        if not user:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        # Match the device on its stable key rather than the raw device_id, so a
        # browser that lost its localStorage UUID is not registered as a new device.
        current_device_key = normalize_device_key(current_device_id)
        key_match = Q(device_id=current_device_key) | Q(device_id__startswith=f"{current_device_key}_")

        # Meta.ordering is ['-last_active'], so the most recently used row wins if
        # duplicates for this key were already created before key matching existed.
        device = user.devices.filter(key_match).first()

        # Check device limit before creating a new record
        if device is None and user.devices.filter(status='ACTIVE').count() >= MAX_DEVICES:
            raise serializers.ValidationError({"detail": f"Tài khoản đã đăng ký tối đa {MAX_DEVICES} thiết bị."})

        if device is None:
            device = UserDevice.objects.create(
                user=user,
                device_id=current_device_id,
                device_type=device_type,
                device_name=device_name,
                user_agent=ua_string,
                last_ip=client_ip,
                is_primary_bound=False,
                status='ACTIVE',
            )
        else:
            # device_id is deliberately left untouched: it keeps the raw value first
            # seen for this device for debugging, and rewriting it to the value sent
            # by this request could collide with an existing duplicate row under the
            # (user, device_id) unique constraint.
            device.device_type = device_type
            device.device_name = device_name
            device.user_agent = ua_string
            device.last_ip = client_ip
            device.status = 'ACTIVE'
            device.save()

        # Mark all other WEB devices as REVOKED so DeviceJWTAuthentication rejects
        # their tokens. Excluded by key so the row we just matched is never revoked,
        # even when its stored device_id differs from the one sent by this request.
        # Mobile handsets live in a different table and are untouched.
        stale = list(
            user.devices.exclude(key_match).exclude(status='REVOKED')
            .values_list('device_id', flat=True)
        )
        if stale:
            user.devices.filter(device_id__in=stale).update(
                status='REVOKED', revoked_at=timezone.now(),
            )
            # Scoped, not blanket: blacklisting every outstanding token of the user
            # used to sign them out of the mobile app as well.
            blacklist_tokens_for_devices(user, stale)

        # Update last_login timestamp (django.contrib.auth.login() is not called in JWT flow)
        update_last_login(None, user)

        # Token carries the stored device_id (DeviceJWTAuthentication looks the
        # device up by exact value) plus the platform claim that tells it which
        # table to look in.
        return {
            'user': user,
            **issue_tokens_for_device(user, device, PLATFORM_WEB),
        }
