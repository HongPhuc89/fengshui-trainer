from django.urls import path
from .views import UserProfileView, DeviceStatusView

urlpatterns = [
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('me/device-status/', DeviceStatusView.as_view(), name='user_device_status'),
]
