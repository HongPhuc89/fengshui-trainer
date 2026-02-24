from django.urls import path
from .views import UserProfileView, DeviceStatusView, AvatarUploadView

urlpatterns = [
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('me/avatar/', AvatarUploadView.as_view(), name='user_avatar'),
    path('me/device-status/', DeviceStatusView.as_view(), name='user_device_status'),
]
