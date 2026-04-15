from rest_framework.throttling import AnonRateThrottle


class RegisterRateThrottle(AnonRateThrottle):
    """Throttle for registration endpoint — low rate to prevent spam signups."""
    scope = 'register'


class LoginRateThrottle(AnonRateThrottle):
    """Throttle for login endpoint — higher rate to accommodate mobile token refresh."""
    scope = 'login'


class OtpRequestRateThrottle(AnonRateThrottle):
    """IP-level throttle for OTP request and verify endpoints — last line of defence."""
    scope = 'otp_request'
