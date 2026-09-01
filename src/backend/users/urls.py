from django.urls import path
from .views import (
    UserProfileView, DeviceStatusView, MobileDeviceMetadataView,
    AvatarUploadView, ChangePasswordView,
)

urlpatterns = [
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('me/avatar/', AvatarUploadView.as_view(), name='user_avatar'),
    path('me/change-password/', ChangePasswordView.as_view(), name='user_change_password'),
    path('me/device-status/', DeviceStatusView.as_view(), name='user_device_status'),
    path('me/mobile-device/', MobileDeviceMetadataView.as_view(), name='user_mobile_device_metadata'),
]
