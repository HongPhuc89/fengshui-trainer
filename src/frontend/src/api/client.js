import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { localforageStorage } from './cache-storage'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const axiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

export const api = setupCache(axiosInstance, {
  storage: localforageStorage,
  ttl: 0, // default: no cache — opt-in per request
  methods: ['get'], // only cache GET requests, never POST/PUT/DELETE
  staleIfError: 3_600_000, // on server 5xx: serve stale cache up to 1h (offline resilience)
})

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
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(`${baseURL.replace(/\/$/, '')}/auth/refresh/`, { refresh })
          localStorage.setItem('access', data.access)
          if (data.refresh) localStorage.setItem('refresh', data.refresh)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (_) {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          window.dispatchEvent(new Event('auth:logout'))
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
