import client from '../api/client'

export const userService = {
  getProfile() {
    return client.get('/users/me/')
  },

  updateProfile(data) {
    return client.put('/users/me/', data)
  },

  uploadAvatar(blob) {
    const form = new FormData()
    form.append('avatar', blob, 'avatar.jpg')
    return client.post('/users/me/avatar/', form, {
      headers: { 'Content-Type': undefined },
    })
  },

  getDeviceStatus() {
    return client.get('/users/me/device-status/')
  },
}
