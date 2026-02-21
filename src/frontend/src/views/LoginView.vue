<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDeviceId } from '../composables/useDeviceId'
import api from '../api/client'
import AppLogo from '../components/auth/AppLogo.vue'
import FormInput from '../components/auth/FormInput.vue'
import PrimaryButton from '../components/auth/PrimaryButton.vue'
import PolicyBox from '../components/auth/PolicyBox.vue'
import AuthLink from '../components/auth/AuthLink.vue'
import DeviceLockModal from '../components/auth/DeviceLockModal.vue'

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
    error.value = 'Please enter phone number and password.'
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
    error.value = res?.data?.detail || res?.data?.phone_number?.[0] || 'Invalid phone number or password.'
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
    error.value = e.response?.data?.detail || 'Failed to switch device.'
  } finally {
    loading.value = false
  }
}

function closeDeviceLockModal() {
  deviceLock.value = null
  error.value = 'This account is locked to another device.'
}
</script>

<template>
  <div class="login-view">
    <AppLogo variant="login" />
    <h2 class="login-view__heading">Access the Archives</h2>
    <form class="login-view__form" @submit.prevent="submit">
      <FormInput
        v-model="phoneNumber"
        label="Username / Phone"
        placeholder="Enter your scholar ID"
        icon="person"
        :error="error"
      />
      <FormInput
        v-model="password"
        v-model:visible="passwordVisible"
        label="Password"
        type="password"
        placeholder="Enter your secure key"
        icon="lock"
        :show-password-toggle="true"
      />
      <div class="login-view__forgot">
        <a href="#" class="login-view__forgot-link" @click.prevent="">Forgot Password?</a>
      </div>
      <PrimaryButton type="submit" :loading="loading">Enter Library</PrimaryButton>
    </form>
    <PolicyBox title="One Device Policy">
      For security, your account can only be active on one device at a time. Logging in here will disconnect other sessions.
    </PolicyBox>
    <AuthLink to="/auth/register" prefix="New Scholar?">Register for Access</AuthLink>

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
