import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import { useAuthStore } from './stores/auth'
import { setAuthStore } from './api/client'
import * as Sentry from '@sentry/vue'
import { sentryService } from './services/sentry.service'

const app = createApp(App)
const pinia = createPinia()

Sentry.init({
    app,
    dsn: 'https://1984e26259654c3c91ae8ccb8b17bc85@o212840.ingest.us.sentry.io/5720762',
    environment: import.meta.env.MODE,
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: false,
        }),
    ],

    enableLogs: true,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,

    // Suppress errors from third-party scripts outside the app (Zalo SDK, browser extensions, etc.)
    ignoreErrors: [
        /zaloJSV2/,
        /Can't find variable: zalo/i,
    ],
    denyUrls: [
        /sp\.zalo\.me/,
        /zalo\.me\/plugins/,
    ],
})

app.use(pinia)
app.use(router)
app.use(i18n)

// Report the first CDN image load failure per browser session (image errors
// don't bubble, so this must be registered on the capture phase).
const IMAGE_ERROR_SESSION_KEY = 'sentry_image_load_error_reported'
window.addEventListener(
  'error',
  (event) => {
    const target = event.target
    if (target?.tagName !== 'IMG' || !target.src) return
    if (new URL(target.src, window.location.href).hostname === window.location.hostname) return
    if (sessionStorage.getItem(IMAGE_ERROR_SESSION_KEY)) return

    sessionStorage.setItem(IMAGE_ERROR_SESSION_KEY, '1')
    sentryService.trackImageLoadError(target.src)
  },
  true,
)

app.mount('#app')

const auth = useAuthStore()
setAuthStore(auth)
auth.startAutoRefresh()

// Restore Sentry user context from persisted session (page reload, direct URL access)
if (auth.user) sentryService.setUser(auth.user)

globalThis.addEventListener('auth:logout', () => {
  router.push({ name: 'Login' })
})
