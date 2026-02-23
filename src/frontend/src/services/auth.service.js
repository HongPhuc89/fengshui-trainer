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
}
