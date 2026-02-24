import { ref, onMounted } from 'vue'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const DEVICE_ID_KEY = 'thienthu_device_id'
const UUID_KEY = 'thienthu_device_uuid'

// Generate a unique UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Get or create persistent UUID
function getPersistentUUID() {
  try {
    let uuid = localStorage.getItem(UUID_KEY)
    if (!uuid) {
      uuid = generateUUID()
      localStorage.setItem(UUID_KEY, uuid)
    }
    return uuid
  } catch (_) {
    return generateUUID()
  }
}

// Generate device ID using FingerprintJS + UUID hybrid approach
async function generateDeviceId() {
  try {
    // Get fingerprint
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    const fingerprint = result.visitorId

    // Get persistent UUID
    const uuid = getPersistentUUID()

    // Combine fingerprint + UUID for more stable device ID
    const deviceId = `web_${fingerprint}_${uuid.split('-')[0]}`

    return deviceId
  } catch (error) {
    console.error('Error generating device ID:', error)
    // Fallback to UUID only
    return `web_${getPersistentUUID()}`
  }
}

export function useDeviceId() {
  const deviceId = ref(null)
  const isLoading = ref(true)

  onMounted(async () => {
    try {
      // Try to get from localStorage first
      const cached = localStorage.getItem(DEVICE_ID_KEY)
      if (cached) {
        deviceId.value = cached
        isLoading.value = false
        return
      }

      // Generate new device ID
      const newDeviceId = await generateDeviceId()
      deviceId.value = newDeviceId

      // Save to localStorage
      try {
        localStorage.setItem(DEVICE_ID_KEY, newDeviceId)
      } catch (_) {
        // Ignore localStorage errors
      }
    } catch (error) {
      console.error('Error in useDeviceId:', error)
      // Ultimate fallback
      deviceId.value = `web_${getPersistentUUID()}`
    } finally {
      isLoading.value = false
    }
  })

  return { deviceId, isLoading }
}
