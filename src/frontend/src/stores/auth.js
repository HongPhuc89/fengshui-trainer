import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { authService } from '../services/auth.service'
import { clearApiCache } from '../api/cache-storage'

const ACCESS_KEY = 'access'
const REFRESH_KEY = 'refresh'
const USER_KEY = 'thienthu_user'
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000 // refresh 5 min trước khi hết hạn

function decodeJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const access = ref(localStorage.getItem(ACCESS_KEY))
  const refresh = ref(localStorage.getItem(REFRESH_KEY))
  const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))
  let refreshTimer = null
  let _refreshPromise = null

  const isAuthenticated = computed(() => !!access.value && !!user.value)

  function setTokens({ access: a, refresh: r }) {
    access.value = a
    refresh.value = r
    if (a) localStorage.setItem(ACCESS_KEY, a)
    if (r) localStorage.setItem(REFRESH_KEY, r)
  }

  function setUser(u) {
    user.value = u
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
  }

  function clearAuth() {
    stopAutoRefresh()
    access.value = null
    refresh.value = null
    user.value = null
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    // Clear API cache on logout — prevents stale is_purchased data leaking to next user
    clearApiCache()
  }

  async function doRefresh() {
    if (_refreshPromise) return _refreshPromise

    const refreshToken = refresh.value || localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) {
      clearAuth()
      globalThis.dispatchEvent(new Event('auth:logout'))
      return null
    }

    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
    _refreshPromise = axios
      .post(`${baseURL.replace(/\/$/, '')}/auth/refresh/`, { refresh: refreshToken })
      .then(({ data }) => {
        setTokens({ access: data.access, refresh: data.refresh || refreshToken })
        scheduleTokenRefresh()
        return data.access
      })
      .catch(() => {
        clearAuth()
        globalThis.dispatchEvent(new Event('auth:logout'))
        return null
      })
      .finally(() => {
        _refreshPromise = null
      })

    return _refreshPromise
  }

  function scheduleTokenRefresh() {
    stopAutoRefresh()
    const token = access.value
    if (!token) return

    const expiry = decodeJwtExpiry(token)
    if (!expiry) return

    const delay = expiry - Date.now() - REFRESH_BEFORE_EXPIRY_MS
    if (delay <= 0) {
      doRefresh()
      return
    }

    refreshTimer = setTimeout(() => doRefresh(), delay)
  }

  function startAutoRefresh() {
    scheduleTokenRefresh()
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  async function fetchMe() {
    const { data } = await authService.getMe()
    setUser(data)
    return data
  }

  return {
    access,
    refresh,
    user,
    isAuthenticated,
    setTokens,
    setUser,
    clearAuth,
    fetchMe,
    doRefresh,
    startAutoRefresh,
    stopAutoRefresh,
  }
})
