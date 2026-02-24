from rest_framework import serializers
from ..models import User


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'public_id', 'username', 'phone_number', 'first_name', 'last_name',
            'email', 'user_type', 'subscription_end_date',
            'last_device_reset', 'created_at', 'avatar_url',
        )
        read_only_fields = (
            'public_id', 'username', 'email', 'user_type',
            'subscription_end_date', 'last_device_reset', 'created_at', 'avatar_url',
        )

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url
