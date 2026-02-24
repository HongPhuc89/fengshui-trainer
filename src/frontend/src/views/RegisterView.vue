<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useDeviceId } from '../composables/useDeviceId'
import { authService } from '../services/auth.service'
import AppLogo from '../components/auth/AppLogo.vue'
import FormInput from '../components/auth/FormInput.vue'
import PrimaryButton from '../components/auth/PrimaryButton.vue'
import AuthLink from '../components/auth/AuthLink.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const { deviceId } = useDeviceId()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const passwordVisible = ref(false)
const confirmVisible = ref(false)
const termsAccepted = ref(false)
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({})
const touched = ref({
  email: false,
  password: false,
  confirmPassword: false
})

let debounceTimers = {
  email: null,
  password: null,
  confirmPassword: null
}

const canSubmit = computed(() => {
  if (!termsAccepted.value) return false
  if (!email.value.trim() || !password.value || !confirmPassword.value) return false
  if (password.value !== confirmPassword.value) return false
  if (password.value.length < 8) return false
  return true
})

function validateField(field) {
  if (field === 'email' && touched.value.email) {
    if (!email.value.trim()) {
      fieldErrors.value.email = t('auth.register.validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      fieldErrors.value.email = t('auth.register.validation.emailInvalid')
    } else {
      delete fieldErrors.value.email
    }
  }

  if (field === 'password' && touched.value.password) {
    if (!password.value) {
      fieldErrors.value.password = t('auth.register.validation.passwordRequired')
    } else if (password.value.length < 8) {
      fieldErrors.value.password = t('auth.register.validation.passwordMin')
    } else {
      delete fieldErrors.value.password
    }
    // Re-validate confirmPassword if it has been touched
    if (touched.value.confirmPassword && confirmPassword.value) {
      validateField('confirmPassword')
    }
  }

  if (field === 'confirmPassword' && touched.value.confirmPassword) {
    if (!confirmPassword.value) {
      fieldErrors.value.confirmPassword = t('auth.register.validation.passwordRequired')
    } else if (password.value !== confirmPassword.value) {
      fieldErrors.value.confirmPassword = t('auth.register.validation.passwordMismatch')
    } else {
      delete fieldErrors.value.confirmPassword
    }
  }
}

function debouncedValidate(field, delay = 500) {
  if (debounceTimers[field]) {
    clearTimeout(debounceTimers[field])
  }
  debounceTimers[field] = setTimeout(() => {
    validateField(field)
  }, delay)
}

function validate() {
  touched.value.email = true
  touched.value.password = true
  touched.value.confirmPassword = true

  fieldErrors.value = {}
  if (!email.value.trim()) fieldErrors.value.email = t('auth.register.validation.emailRequired')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) fieldErrors.value.email = t('auth.register.validation.emailInvalid')
  if (!password.value) fieldErrors.value.password = t('auth.register.validation.passwordRequired')
  else if (password.value.length < 8) fieldErrors.value.password = t('auth.register.validation.passwordMin')
  if (!confirmPassword.value) fieldErrors.value.confirmPassword = t('auth.register.validation.passwordRequired')
  else if (password.value !== confirmPassword.value) fieldErrors.value.confirmPassword = t('auth.register.validation.passwordMismatch')
  if (!termsAccepted.value) fieldErrors.value.terms = t('auth.register.validation.termsRequired')
  return Object.keys(fieldErrors.value).length === 0
}

// Watch for input changes with debounce
watch(email, () => {
  touched.value.email = true
  debouncedValidate('email')
})

watch(password, () => {
  touched.value.password = true
  debouncedValidate('password')
})

watch(confirmPassword, () => {
  touched.value.confirmPassword = true
  debouncedValidate('confirmPassword')
})

async function submit() {
  error.value = ''
  if (!validate()) return
  loading.value = true
  try {
    const { data } = await authService.register({
      email: email.value.trim(),
      password: password.value,
      deviceId: deviceId.value || 'web_unknown',
    })
    auth.setTokens({ access: data.access, refresh: data.refresh })
    auth.setUser(data.user)
    router.push('/')
  } catch (e) {
    const res = e.response
    const d = res?.data
    if (d?.email) fieldErrors.value.email = Array.isArray(d.email) ? d.email[0] : d.email
    else error.value = d?.detail || (typeof d === 'string' ? d : t('auth.register.error'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-view">
    <AppLogo variant="register" :subtitle="t('auth.register.subtitle')" />
    <form class="register-view__form" @submit.prevent="submit">
      <FormInput v-model="email" :label="t('auth.register.emailLabel')" :placeholder="t('auth.register.emailPlaceholder')" icon="envelope" :error="fieldErrors.email" type="email" />
      <FormInput v-model="password" v-model:visible="passwordVisible" :label="t('auth.register.passwordLabel')" type="password" :placeholder="t('auth.register.passwordPlaceholder')" icon="lock" :show-password-toggle="true" :error="fieldErrors.password" />
      <FormInput v-model="confirmPassword" v-model:visible="confirmVisible" :label="t('auth.register.confirmPasswordLabel')" type="password" :placeholder="t('auth.register.confirmPasswordPlaceholder')" icon="shield" :show-password-toggle="true" :error="fieldErrors.confirmPassword" />
      <div class="register-view__terms">
        <label class="register-view__checkbox">
          <input v-model="termsAccepted" type="checkbox" />
          <span>{{ t('auth.register.termsText') }} <a href="#" class="register-view__link">{{ t('auth.register.termsLink') }}</a> {{ t('auth.register.andText') }} <a href="#" class="register-view__link">{{ t('auth.register.privacyLink') }}</a>.</span>
        </label>
        <p v-if="fieldErrors.terms" class="form-input__error">{{ fieldErrors.terms }}</p>
      </div>
      <p v-if="error" class="register-view__error">{{ error }}</p>
      <PrimaryButton type="submit" :loading="loading" :disabled="!canSubmit">{{ t('auth.register.submitButton') }}</PrimaryButton>
    </form>
    <p class="register-view__encrypted">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align: middle; margin-right: 4px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      {{ t('auth.register.encrypted') }}
    </p>
    <AuthLink to="/auth/login" :prefix="t('auth.register.alreadyAccount')">{{ t('auth.register.loginLink') }}</AuthLink>
  </div>
</template>

<style scoped>
.register-view__form { margin-top: var(--space-md); }
.register-view__terms { margin: var(--space-md) 0; }
.register-view__checkbox { display: flex; align-items: flex-start; gap: var(--space-sm); font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; }
.register-view__checkbox input { margin-top: 4px; }
.register-view__link { color: var(--accent-gold); }
.register-view__error { font-size: 0.85rem; color: #e57373; margin-bottom: var(--space-md); }
.register-view__encrypted { font-size: 0.75rem; color: var(--text-muted); margin-top: var(--space-md); display: flex; align-items: center; }
</style>

