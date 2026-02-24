from .auth import RegisterView, LoginView, LogoutView
from .profile import UserProfileView, DeviceStatusView, AvatarUploadView

__all__ = [
    'RegisterView', 'LoginView', 'LogoutView',
    'UserProfileView', 'DeviceStatusView', 'AvatarUploadView',
]
