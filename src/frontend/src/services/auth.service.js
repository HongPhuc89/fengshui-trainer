import api from '../api/client'

export const authService = {
  login(email, password, deviceId, deviceType = 'WEB') {
    return api.post('auth/login/', {
      email,
      password,
      device_id: deviceId,
      device_type: deviceType,
    })
  },

  loginWithDeviceReset(email, password, deviceId, deviceType = 'WEB') {
    return api.post('auth/login/', {
      email,
      password,
      device_id: deviceId,
      device_type: deviceType,
      reset_device: true,
    })
  },

  register({ email, password, deviceId, deviceType = 'WEB' }) {
    return api.post('auth/register/', {
      email,
      password,
      device_id: deviceId,
      device_type: deviceType,
    })
  },

  getMe() {
    return api.get('/users/me/')
  },

  logout(refreshToken) {
    return api.post('/auth/logout/', { refresh: refreshToken })
  },

  requestPasswordResetOtp(email) {
    return api.post('auth/password-reset/request/', { email })
  },

  verifyPasswordResetOtp(email, otp) {
    return api.post('auth/password-reset/verify/', { email, otp })
  },

  confirmPasswordReset(resetToken, newPassword, confirmPassword) {
    return api.post('auth/password-reset/confirm/', {
      reset_token: resetToken,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
  },
}
