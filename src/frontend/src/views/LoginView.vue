<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useDeviceId } from '../composables/useDeviceId'
import api from '../api/client'
import AppLogo from '../components/auth/AppLogo.vue'
import FormInput from '../components/auth/FormInput.vue'
import PrimaryButton from '../components/auth/PrimaryButton.vue'
import PolicyBox from '../components/auth/PolicyBox.vue'
import AuthLink from '../components/auth/AuthLink.vue'
import DeviceLockModal from '../components/auth/DeviceLockModal.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { deviceId } = useDeviceId()

const phoneNumber = ref('')
const password = ref('')
const passwordVisible = ref(false)
const loading = ref(false)
const error = ref('')
const deviceLock = ref(null) // { can_reset, last_reset_date }

async function submit() {
  error.value = ''
  if (!phoneNumber.value.trim() || !password.value) {
    error.value = t('auth.login.errorEmpty')
    return
  }
  loading.value = true
  try {
    const { data } = await api.post('auth/login/', {
      phone_number: phoneNumber.value.trim(),
      password: password.value,
      device_id: deviceId.value || 'web_unknown',
      device_type: 'WEB',
    })
    auth.setTokens({ access: data.access, refresh: data.refresh })
    auth.setUser(data.user)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    const res = e.response
    if (res?.status === 400 && res?.data?.error === 'DEVICE_LOCKED') {
      deviceLock.value = {
        can_reset: res.data.can_reset,
        last_reset_date: res.data.last_reset_date,
      }
      error.value = ''
      return
    }
    error.value = res?.data?.detail || res?.data?.phone_number?.[0] || t('auth.login.errorInvalid')
  } finally {
    loading.value = false
  }
}

async function confirmDeviceReset() {
  if (!deviceLock.value?.can_reset) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.post('auth/login/', {
      phone_number: phoneNumber.value.trim(),
      password: password.value,
      device_id: deviceId.value || 'web_unknown',
      device_type: 'WEB',
      reset_device: true,
    })
    auth.setTokens({ access: data.access, refresh: data.refresh })
    auth.setUser(data.user)
    deviceLock.value = null
    router.push(route.query.redirect || '/')
  } catch (e) {
    error.value = e.response?.data?.detail || t('auth.login.errorInvalid')
  } finally {
    loading.value = false
  }
}

function closeDeviceLockModal() {
  deviceLock.value = null
  error.value = t('auth.login.errorDeviceLocked')
}
</script>

<template>
  <div class="login-view">
    <AppLogo variant="login" />
    <h2 class="login-view__heading">{{ t('auth.login.heading') }}</h2>
    <form class="login-view__form" @submit.prevent="submit">
      <FormInput
        v-model="phoneNumber"
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
        <a href="#" class="login-view__forgot-link" @click.prevent="">{{ t('auth.login.forgotPassword') }}</a>
      </div>
      <PrimaryButton type="submit" :loading="loading">{{ t('auth.login.submitButton') }}</PrimaryButton>
    </form>
    <PolicyBox :title="t('auth.policy.title')">
      {{ t('auth.policy.body') }}
    </PolicyBox>
    <AuthLink to="/auth/register" :prefix="t('auth.login.noAccount')">{{ t('auth.login.registerLink') }}</AuthLink>

    <DeviceLockModal
      v-if="deviceLock"
      :can-reset="deviceLock.can_reset"
      :last-reset-date="deviceLock.last_reset_date"
      @confirm="confirmDeviceReset"
      @close="closeDeviceLockModal"
    />
  </div>
</template>

<style scoped>
.login-view__heading { font-size: 1.1rem; color: var(--text-secondary); font-weight: 600; margin-bottom: var(--space-lg); text-align: center; }
.login-view__form { margin-top: var(--space-md); }
.login-view__forgot { text-align: right; margin-top: -8px; margin-bottom: var(--space-md); }
.login-view__forgot-link { color: var(--accent-gold); font-size: 0.85rem; }
</style>

