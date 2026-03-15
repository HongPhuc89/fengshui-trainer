import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

// Injected by main.js after Pinia is initialized — avoids circular dependency
let _authStore = null
export function setAuthStore(store) {
  _authStore = store
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (_authStore) {
        // doRefresh() is a singleton promise — safe to call concurrently
        const newAccess = await _authStore.doRefresh()
        if (newAccess) {
          original.headers.Authorization = `Bearer ${newAccess}`
          return api(original)
        }
      } else {
        globalThis.dispatchEvent(new Event('auth:logout'))
      }
    }
    throw err
  },
)

export default api
