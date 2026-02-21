import { ref, onMounted } from 'vue'

const DEVICE_ID_KEY = 'thienthu_device_id'

function simpleFingerprint() {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
  ]
  let str = parts.join('|')
  let h = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h = (h << 5) - h + c
    h |= 0
  }
  return 'web_' + Math.abs(h).toString(36)
}

export function useDeviceId() {
  const deviceId = ref(null)

  onMounted(() => {
    try {
      deviceId.value = localStorage.getItem(DEVICE_ID_KEY)
      if (!deviceId.value) {
        deviceId.value = simpleFingerprint()
        localStorage.setItem(DEVICE_ID_KEY, deviceId.value)
      }
    } catch (_) {
      deviceId.value = simpleFingerprint()
    }
  })

  return { deviceId }
}
