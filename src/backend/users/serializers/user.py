from rest_framework import serializers
from ..models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'public_id', 'username', 'phone_number', 'first_name', 'last_name',
            'email', 'user_type', 'subscription_end_date',
            'last_device_reset', 'created_at',
        )
        read_only_fields = (
            'public_id', 'username', 'email', 'user_type',
            'subscription_end_date', 'last_device_reset', 'created_at',
        )
