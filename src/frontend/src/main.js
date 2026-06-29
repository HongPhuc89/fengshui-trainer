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
import { consoleLoggingIntegration } from '@sentry/browser'

const app = createApp(App)
const pinia = createPinia()

Sentry.init({
    app,
    dsn: 'https://1984e26259654c3c91ae8ccb8b17bc85@o212840.ingest.us.sentry.io/5720762',
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: false,
        }),
        consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
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

app.mount('#app')

const auth = useAuthStore()
setAuthStore(auth)
auth.startAutoRefresh()

globalThis.addEventListener('auth:logout', () => {
  router.push({ name: 'Login' })
})
