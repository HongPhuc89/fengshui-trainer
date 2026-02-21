<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDeviceId } from '../composables/useDeviceId'
import api from '../api/client'
import AppLogo from '../components/auth/AppLogo.vue'
import FormInput from '../components/auth/FormInput.vue'
import PrimaryButton from '../components/auth/PrimaryButton.vue'
import AuthLink from '../components/auth/AuthLink.vue'

const router = useRouter()
const auth = useAuthStore()
const { deviceId } = useDeviceId()

const fullName = ref('')
const phoneNumber = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const passwordVisible = ref(false)
const confirmVisible = ref(false)
const termsAccepted = ref(false)
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({})

const displayName = computed(() => {
  const n = fullName.value.trim()
  if (!n) return 'Scholar'
  const parts = n.split(/\s+/)
  return parts[parts.length - 1] || parts[0] || 'Scholar'
})

const canSubmit = computed(() => {
  if (!termsAccepted.value) return false
  if (!fullName.value.trim() || !phoneNumber.value.trim() || !password.value || !confirmPassword.value) return false
  if (password.value !== confirmPassword.value) return false
  if (password.value.length < 8) return false
  return true
})

function validate() {
  fieldErrors.value = {}
  if (!fullName.value.trim()) fieldErrors.value.fullName = 'Full name is required.'
  if (!phoneNumber.value.trim()) fieldErrors.value.phoneNumber = 'Phone number is required.'
  if (!email.value.trim()) fieldErrors.value.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) fieldErrors.value.email = 'Invalid email format.'
  if (!password.value) fieldErrors.value.password = 'Password is required.'
  else if (password.value.length < 8) fieldErrors.value.password = 'Password must be at least 8 characters.'
  if (password.value !== confirmPassword.value) fieldErrors.value.confirmPassword = 'Passwords do not match.'
  if (!termsAccepted.value) fieldErrors.value.terms = 'You must accept the terms.'
  return Object.keys(fieldErrors.value).length === 0
}

async function submit() {
  error.value = ''
  if (!validate()) return
  loading.value = true
  try {
    const [first, ...rest] = fullName.value.trim().split(/\s+/)
    const last = rest.length ? rest.join(' ') : ''
    const { data } = await api.post('auth/register/', {
      phone_number: phoneNumber.value.trim(),
      password: password.value,
      first_name: first || '',
      last_name: last,
      device_id: deviceId.value || 'web_unknown',
      device_type: 'WEB',
    })
    auth.setTokens({ access: data.access, refresh: data.refresh })
    auth.setUser(data.user)
    router.push('/')
  } catch (e) {
    const res = e.response
    const d = res?.data
    if (d?.phone_number) fieldErrors.value.phoneNumber = Array.isArray(d.phone_number) ? d.phone_number[0] : d.phone_number
    else error.value = d?.detail || (typeof d === 'string' ? d : 'Registration failed.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-view">
    <AppLogo variant="register" subtitle="SCHOLAR REGISTRATION" />
    <form class="register-view__form" @submit.prevent="submit">
      <FormInput v-model="fullName" label="Full Name" placeholder="Nguyen Van A" icon="person" :error="fieldErrors.fullName" />
      <FormInput v-model="phoneNumber" label="Phone Number" placeholder="+84..." icon="phone" :error="fieldErrors.phoneNumber" />
      <FormInput v-model="email" label="Email Address" placeholder="scholar@thienthu.vn" icon="envelope" :error="fieldErrors.email" type="email" />
      <FormInput v-model="password" v-model:visible="passwordVisible" label="Password" type="password" placeholder="••••••••" icon="lock" :show-password-toggle="true" :error="fieldErrors.password" />
      <FormInput v-model="confirmPassword" v-model:visible="confirmVisible" label="Confirm Password" type="password" placeholder="••••••••" icon="shield" :show-password-toggle="true" :error="fieldErrors.confirmPassword" />
      <div class="register-view__terms">
        <label class="register-view__checkbox">
          <input v-model="termsAccepted" type="checkbox" />
          <span>I agree to the <a href="#" class="register-view__link">Terms of Service</a> and <a href="#" class="register-view__link">Copyright Protection Policy</a>.</span>
        </label>
        <p v-if="fieldErrors.terms" class="form-input__error">{{ fieldErrors.terms }}</p>
      </div>
      <p v-if="error" class="register-view__error">{{ error }}</p>
      <PrimaryButton type="submit" :loading="loading" :disabled="!canSubmit">Create Account</PrimaryButton>
    </form>
    <p class="register-view__encrypted">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align: middle; margin-right: 4px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      END-TO-END ENCRYPTED
    </p>
    <AuthLink to="/auth/login" prefix="Already a scholar?">Log In</AuthLink>
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
