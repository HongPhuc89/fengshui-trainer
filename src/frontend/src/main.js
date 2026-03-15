import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import { useAuthStore } from './stores/auth'
import { setAuthStore } from './api/client'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

app.mount('#app')

const auth = useAuthStore()
setAuthStore(auth)
auth.startAutoRefresh()

globalThis.addEventListener('auth:logout', () => {
  router.push({ name: 'Login' })
})
