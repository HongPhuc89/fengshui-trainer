from django.urls import path
from .views import RegisterView, LoginView, LogoutView, DeviceTokenRefreshView
from .views import RequestOTPView, VerifyOTPView, ConfirmResetView
from .views import MobileLoginView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', DeviceTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    # Forgot password via OTP
    path('password-reset/request/', RequestOTPView.as_view(), name='password_reset_request'),
    path('password-reset/verify/', VerifyOTPView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', ConfirmResetView.as_view(), name='password_reset_confirm'),
    # Mobile-only auth: one bound handset per user, changed only with a
    # staff-issued activation key (feature-34).
    path('mobile/login/', MobileLoginView.as_view(), name='mobile_login'),
]
