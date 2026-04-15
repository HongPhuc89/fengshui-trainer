<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useDeviceId } from '../composables/useDeviceId'
import { authService } from '../services/auth.service'
import AppLogo from '../components/auth/AppLogo.vue'
import FormInput from '../components/auth/FormInput.vue'
import PrimaryButton from '../components/auth/PrimaryButton.vue'
import PolicyBox from '../components/auth/PolicyBox.vue'
import AuthLink from '../components/auth/AuthLink.vue'
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { deviceId } = useDeviceId()

const email = ref('')
const password = ref('')
const passwordVisible = ref(false)
const loading = ref(false)
const error = ref('')
const pendingApproval = ref(false)
const pendingEmail = ref('')
const resetSuccess = computed(() => route.query.reset === 'success')

async function submit() {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = t('auth.login.errorEmpty')
    return
  }
  loading.value = true
  try {
    const { data } = await authService.login(
      email.value.trim(),
      password.value,
      deviceId.value || 'web_unknown',
    )
    auth.setTokens({ access: data.access, refresh: data.refresh })
    auth.setUser(data.user)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    const res = e.response
    if (res?.status === 429) {
      const retryAfter = res.headers?.['retry-after']
      error.value = retryAfter
        ? t('auth.login.rateLimitExceededSeconds', { seconds: retryAfter })
        : t('auth.login.rateLimitExceeded')
    } else if (res?.data?.detail?.includes('chờ admin kích hoạt')) {
      // Account exists but is inactive — show pending approval screen
      pendingApproval.value = true
      pendingEmail.value = email.value.trim()
    } else {
      error.value = res?.data?.detail || res?.data?.email?.[0] || t('auth.login.errorInvalid')
    }
  } finally {
    loading.value = false
  }
}


</script>

<template>
  <div class="login-view">
    <AppLogo variant="login" />

    <div v-if="resetSuccess" class="login-view__reset-banner">
      {{ t('auth.login.resetSuccess') }}
    </div>

    <div v-if="pendingApproval" class="login-view__pending">
      <div class="login-view__pending-icon">⏳</div>
      <h2 class="login-view__pending-title">{{ t('auth.register.successTitle') }}</h2>
      <p class="login-view__pending-body">{{ t('auth.register.pendingApproval', { email: pendingEmail }) }}</p>
      <p class="login-view__pending-hint">{{ t('auth.register.pendingHint') }}</p>
    </div>

    <template v-else>
    <h2 class="login-view__heading">{{ t('auth.login.heading') }}</h2>
    <form class="login-view__form" @submit.prevent="submit">
      <FormInput
        v-model="email"
        :label="t('auth.login.usernameLabel')"
        :placeholder="t('auth.login.usernamePlaceholder')"
        icon="person"
        :error="error"
      />
      <FormInput
        v-model="password"
        v-model:visible="passwordVisible"
        :label="t('auth.login.passwordLabel')"
        type="password"
        :placeholder="t('auth.login.passwordPlaceholder')"
        icon="lock"
        :show-password-toggle="true"
      />
      <div class="login-view__forgot">
        <RouterLink to="/auth/forgot-password" class="login-view__forgot-link">{{ t('auth.login.forgotPassword') }}</RouterLink>
      </div>
      <PrimaryButton type="submit" :loading="loading">{{ t('auth.login.submitButton') }}</PrimaryButton>
    </form>
    <PolicyBox :title="t('auth.policy.title')">
      {{ t('auth.policy.body') }}
    </PolicyBox>
    <AuthLink to="/auth/register" :prefix="t('auth.login.noAccount')">{{ t('auth.login.registerLink') }}</AuthLink>
    </template>

  </div>
</template>

<style scoped>
.login-view__heading { font-size: 1.1rem; color: var(--text-secondary); font-weight: 600; margin-bottom: var(--space-lg); text-align: center; }
.login-view__form { margin-top: var(--space-md); }
.login-view__forgot { text-align: right; margin-top: -8px; margin-bottom: var(--space-md); }
.login-view__forgot-link { color: var(--accent-gold); font-size: 0.85rem; }
.login-view__reset-banner { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; border-radius: 8px; padding: 10px 16px; font-size: 0.9rem; text-align: center; margin-bottom: var(--space-md); }
.login-view__pending { text-align: center; padding: var(--space-lg) 0; }
.login-view__pending-icon { font-size: 3rem; margin-bottom: var(--space-md); }
.login-view__pending-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-sm); }
.login-view__pending-body { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-sm); }
.login-view__pending-hint { font-size: 0.8rem; color: var(--text-muted); }
</style>

