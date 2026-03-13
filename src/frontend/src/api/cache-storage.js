import { buildStorage } from 'axios-cache-interceptor'
import localforage from 'localforage'

// Separate instance to avoid conflicts with auth tokens in localStorage
const store = localforage.createInstance({
  name: 'thienthu-api-cache',
  storeName: 'api_cache',
})

export const localforageStorage = buildStorage({
  async find(key) {
    const value = await store.getItem(key)
    // buildStorage expects undefined (not null) for cache miss
    return value ?? undefined
  },

  async set(key, value) {
    await store.setItem(key, value)
  },

  async remove(key) {
    await store.removeItem(key)
  },
})

export async function clearApiCache() {
  await store.clear()
}
