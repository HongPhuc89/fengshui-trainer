import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../services/auth.service'

const ACCESS_KEY = 'access'
const REFRESH_KEY = 'refresh'
const USER_KEY = 'thienthu_user'

export const useAuthStore = defineStore('auth', () => {
  const access = ref(localStorage.getItem(ACCESS_KEY))
  const refresh = ref(localStorage.getItem(REFRESH_KEY))
  const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))

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
    access.value = null
    refresh.value = null
    user.value = null
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
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
  }
})
