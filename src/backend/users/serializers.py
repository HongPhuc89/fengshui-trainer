from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, UserDevice

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'public_id', 'username', 'phone_number', 'first_name', 'last_name',
            'email', 'user_type', 'subscription_end_date', 'is_device_locked',
            'last_device_reset', 'created_at',
        )
        read_only_fields = (
            'public_id', 'username', 'phone_number', 'user_type',
            'subscription_end_date', 'is_device_locked', 'last_device_reset', 'created_at',
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    device_id = serializers.CharField(write_only=True, required=True, max_length=255)
    device_type = serializers.ChoiceField(write_only=True, required=True, choices=UserDevice.DEVICE_TYPE_CHOICES)
    device_name = serializers.CharField(write_only=True, required=False, max_length=255, allow_blank=True)

    class Meta:
        model = User
        fields = ('phone_number', 'password', 'first_name', 'last_name', 'device_id', 'device_type', 'device_name')
        extra_kwargs = {
            'phone_number': {'required': True}
        }

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def create(self, validated_data):
        device_id = validated_data.pop('device_id')
        device_type = validated_data.pop('device_type')
        device_name = validated_data.pop('device_name', '')

        # Use phone_number as username for simplicity, or generate one
        username = validated_data.get('phone_number')
        
        user = User.objects.create_user(
            username=username,
            phone_number=validated_data['phone_number'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_device_locked=False # Not locked until first login/binding
        )

        # Auto-bind primary device
        UserDevice.objects.create(
            user=user,
            device_id=device_id,
            device_type=device_type,
            device_name=device_name,
            is_primary_bound=True,
            status='ACTIVE'
        )

        return user


class CustomLoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    device_id = serializers.CharField(required=True, write_only=True)
    device_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    device_type = serializers.ChoiceField(required=True, write_only=True, choices=UserDevice.DEVICE_TYPE_CHOICES)
    reset_device = serializers.BooleanField(required=False, default=False, write_only=True)

    def validate(self, attrs):
        phone_number = attrs.get('phone_number')
        password = attrs.get('password')
        current_device_id = attrs.get('device_id')
        reset_device = attrs.get('reset_device')
        device_name = attrs.get('device_name', '')
        device_type = attrs.get('device_type')

        user = authenticate(request=self.context.get('request'), username=phone_number, password=password)
        if not user:
            # Maybe they signed up with username instead of phone_number for superusers, fallback check
            user = authenticate(request=self.context.get('request'), phone_number=phone_number, password=password)
            if not user:
                raise serializers.ValidationError({"detail": "Invalid phone number or password."})

        if not user.is_active:
            raise serializers.ValidationError({"detail": "User account is disabled."})

        # Device locking logic
        bound_device = user.devices.filter(is_primary_bound=True, status='ACTIVE').first()
        
        if user.is_device_locked and bound_device:
            if bound_device.device_id != current_device_id:
                if not reset_device:
                    # Challenge
                    raise serializers.ValidationError({
                        "error": "DEVICE_LOCKED", 
                        "can_reset": timezone.now() >= (user.last_device_reset + timedelta(days=365)),
                        "last_reset_date": user.last_device_reset.isoformat(),
                        "detail": "This account is locked to another device."
                    })
                else:
                    # Proceed with reset if cooldown passed
                    if timezone.now() < (user.last_device_reset + timedelta(days=365)):
                        raise serializers.ValidationError({"detail": "Cannot reset device yet. 365-day cooldown active."})
                    
                    # Reset logic
                    bound_device.status = 'REVOKED'
                    bound_device.is_primary_bound = False
                    bound_device.save()
                    
                    user.last_device_reset = timezone.now()
                    user.save()
                    
                    # Create new bound device below
                    bound_device = None

        # Create or update current device
        device, created = UserDevice.objects.get_or_create(
            user=user,
            device_id=current_device_id,
            defaults={
                'device_type': device_type,
                'device_name': device_name,
                'is_primary_bound': user.devices.filter(is_primary_bound=True).count() == 0, # If no primary, make this primary
                'status': 'ACTIVE'
            }
        )
        
        if not created:
            device.status = 'ACTIVE'
            device.device_name = device_name if device_name else device.device_name
            device.last_active = timezone.now()
            
            # If user has no primary bound device (e.g. after reset or if none exists)
            if user.devices.filter(is_primary_bound=True, status='ACTIVE').count() == 0:
                device.is_primary_bound = True
                
            device.save()

        # If it's their first time logging in and getting a primary device, lock it.
        if device.is_primary_bound and not user.is_device_locked:
            user.is_device_locked = True
            user.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return {
            'user': user,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
