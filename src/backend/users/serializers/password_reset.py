from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class RequestOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)


class ConfirmResetSerializer(serializers.Serializer):
    # reset_token is a secrets.token_urlsafe(32) value, not UUID format
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Mật khẩu xác nhận không khớp."})
        validate_password(data['new_password'])
        return data
