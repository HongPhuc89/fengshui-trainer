<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authService } from '../services/auth.service'
import AppLogo from '../components/auth/AppLogo.vue'
import FormInput from '../components/auth/FormInput.vue'
import PrimaryButton from '../components/auth/PrimaryButton.vue'

const { t } = useI18n()
const router = useRouter()

// ─── Step state ──────────────────────────────────────────────────────────────
// step 1 = email entry, step 2 = OTP entry, step 3 = new password
const step = ref(1)

// ─── Step 1 ──────────────────────────────────────────────────────────────────
const email = ref('')
const step1Loading = ref(false)
const step1Error = ref('')
const otpExpiryMinutes = ref(5)

async function submitStep1() {
  step1Error.value = ''
  if (!email.value.trim()) {
    step1Error.value = t('auth.forgotPassword.emailPlaceholder')
    return
  }
  step1Loading.value = true
  try {
    const { data } = await authService.requestPasswordResetOtp(email.value.trim())
    otpExpiryMinutes.value = Math.round((data.expires_in || 300) / 60)
    startResendCountdown()
    step.value = 2
  } catch (e) {
    const res = e.response
    if (res?.status === 429) {
      step1Error.value = res.data?.detail || t('common.error')
    } else {
      step1Error.value = res?.data?.detail || t('common.error')
    }
  } finally {
    step1Loading.value = false
  }
}

// ─── Step 2: OTP ─────────────────────────────────────────────────────────────
const OTP_LENGTH = 6
const otpDigits = ref(Array(OTP_LENGTH).fill(''))
const otpInputRefs = ref([])
const step2Loading = ref(false)
const step2Error = ref('')
const resetToken = ref('')

// Resend countdown
const resendSeconds = ref(0)
let resendTimer = null

function startResendCountdown() {
  resendSeconds.value = 60
  clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    if (resendSeconds.value > 0) {
      resendSeconds.value--
    } else {
      clearInterval(resendTimer)
    }
  }, 1000)
}

onUnmounted(() => clearInterval(resendTimer))

const otpValue = computed(() => otpDigits.value.join(''))

function onOtpInput(index, event) {
  const val = event.target.value.replace(/\D/g, '').slice(-1)
  otpDigits.value[index] = val
  if (val && index < OTP_LENGTH - 1) {
    otpInputRefs.value[index + 1]?.focus()
  }
}

function onOtpKeydown(index, event) {
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    otpInputRefs.value[index - 1]?.focus()
  }
}

function onOtpPaste(event) {
  event.preventDefault()
  const pasted = (event.clipboardData || window.clipboardData)
    .getData('text')
    .replace(/\D/g, '')
    .slice(0, OTP_LENGTH)
  for (let i = 0; i < OTP_LENGTH; i++) {
    otpDigits.value[i] = pasted[i] || ''
  }
  const nextEmpty = otpDigits.value.findIndex(d => !d)
  const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty
  otpInputRefs.value[focusIdx]?.focus()
}

async function submitStep2() {
  step2Error.value = ''
  if (otpValue.value.length < OTP_LENGTH) {
    step2Error.value = t('auth.forgotPassword.otpLabel')
    return
  }
  step2Loading.value = true
  try {
    const { data } = await authService.verifyPasswordResetOtp(email.value.trim(), otpValue.value)
    resetToken.value = data.reset_token
    step.value = 3
  } catch (e) {
    step2Error.value = e.response?.data?.detail || t('common.error')
  } finally {
    step2Loading.value = false
  }
}

async function resendOtp() {
  if (resendSeconds.value > 0) return
  step2Error.value = ''
  step1Loading.value = true
  try {
    const { data } = await authService.requestPasswordResetOtp(email.value.trim())
    otpExpiryMinutes.value = Math.round((data.expires_in || 300) / 60)
    otpDigits.value = Array(OTP_LENGTH).fill('')
    startResendCountdown()
  } catch (e) {
    step2Error.value = e.response?.data?.detail || t('common.error')
  } finally {
    step1Loading.value = false
  }
}

// ─── Step 3: New password ─────────────────────────────────────────────────────
const newPassword = ref('')
const confirmPassword = ref('')
const newPasswordVisible = ref(false)
const confirmPasswordVisible = ref(false)
const step3Loading = ref(false)
const step3Error = ref('')

async function submitStep3() {
  step3Error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    step3Error.value = t('auth.forgotPassword.errorPasswordMismatch')
    return
  }
  step3Loading.value = true
  try {
    await authService.confirmPasswordReset(
      resetToken.value,
      newPassword.value,
      confirmPassword.value,
    )
    router.push({ name: 'Login', query: { reset: 'success' } })
  } catch (e) {
    step3Error.value = e.response?.data?.detail || t('common.error')
  } finally {
    step3Loading.value = false
  }
}
</script>

<template>
  <div class="forgot-view">
    <AppLogo variant="login" />
    <h2 class="forgot-view__heading">{{ t('auth.forgotPassword.heading') }}</h2>

    <!-- ─── Step 1: Email ─────────────────────────────────── -->
    <template v-if="step === 1">
      <p class="forgot-view__subtitle">{{ t('auth.forgotPassword.step1Title') }}</p>
      <form class="forgot-view__form" @submit.prevent="submitStep1">
        <FormInput
          v-model="email"
          :label="t('auth.forgotPassword.emailLabel')"
          :placeholder="t('auth.forgotPassword.emailPlaceholder')"
          type="email"
          icon="person"
          :error="step1Error"
        />
        <PrimaryButton type="submit" :loading="step1Loading">
          {{ t('auth.forgotPassword.sendOtpButton') }}
        </PrimaryButton>
      </form>
    </template>

    <!-- ─── Step 2: OTP ───────────────────────────────────── -->
    <template v-else-if="step === 2">
      <p class="forgot-view__subtitle">
        {{ t('auth.forgotPassword.otpSentTo') }}
        <strong>{{ email }}</strong>
      </p>
      <p class="forgot-view__expiry">
        {{ t('auth.forgotPassword.otpExpiry', { minutes: otpExpiryMinutes }) }}
      </p>

      <form class="forgot-view__form" @submit.prevent="submitStep2">
        <!-- 6-box OTP input -->
        <div class="forgot-view__otp-boxes" @paste="onOtpPaste">
          <input
            v-for="(_, idx) in otpDigits"
            :key="idx"
            :ref="el => otpInputRefs[idx] = el"
            v-model="otpDigits[idx]"
            class="forgot-view__otp-box"
            type="text"
            inputmode="numeric"
            maxlength="1"
            autocomplete="one-time-code"
            :aria-label="`OTP digit ${idx + 1}`"
            @input="onOtpInput(idx, $event)"
            @keydown="onOtpKeydown(idx, $event)"
          />
        </div>

        <p v-if="step2Error" class="forgot-view__error">{{ step2Error }}</p>

        <PrimaryButton type="submit" :loading="step2Loading">
          {{ t('auth.forgotPassword.verifyButton') }}
        </PrimaryButton>

        <!-- Resend link -->
        <div class="forgot-view__resend">
          <span v-if="resendSeconds > 0" class="forgot-view__resend-countdown">
            {{ t('auth.forgotPassword.resendIn', { seconds: resendSeconds }) }}
          </span>
          <button
            v-else
            type="button"
            class="forgot-view__resend-btn"
            :disabled="step1Loading"
            @click="resendOtp"
          >
            {{ t('auth.forgotPassword.resendOtp') }}
          </button>
        </div>
      </form>
    </template>

    <!-- ─── Step 3: New password ──────────────────────────── -->
    <template v-else-if="step === 3">
      <p class="forgot-view__subtitle">{{ t('auth.forgotPassword.step3Title') }}</p>
      <form class="forgot-view__form" @submit.prevent="submitStep3">
        <FormInput
          v-model="newPassword"
          v-model:visible="newPasswordVisible"
          :label="t('auth.forgotPassword.newPasswordLabel')"
          :placeholder="t('auth.forgotPassword.newPasswordPlaceholder')"
          type="password"
          icon="lock"
          :show-password-toggle="true"
        />
        <FormInput
          v-model="confirmPassword"
          v-model:visible="confirmPasswordVisible"
          :label="t('auth.forgotPassword.confirmPasswordLabel')"
          :placeholder="t('auth.forgotPassword.confirmPasswordPlaceholder')"
          type="password"
          icon="lock"
          :show-password-toggle="true"
        />
        <p v-if="step3Error" class="forgot-view__error">{{ step3Error }}</p>
        <PrimaryButton type="submit" :loading="step3Loading">
          {{ t('auth.forgotPassword.confirmButton') }}
        </PrimaryButton>
      </form>
    </template>

    <!-- Back to login -->
    <div class="forgot-view__back">
      <RouterLink to="/auth/login" class="forgot-view__back-link">
        {{ t('auth.forgotPassword.backToLogin') }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.forgot-view__heading {
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  text-align: center;
}

.forgot-view__subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: var(--space-sm);
}

.forgot-view__expiry {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: var(--space-md);
}

.forgot-view__form {
  margin-top: var(--space-md);
}

.forgot-view__error {
  color: var(--error, #e53935);
  font-size: 0.85rem;
  margin-bottom: var(--space-sm);
  text-align: center;
}

/* OTP boxes */
.forgot-view__otp-boxes {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: var(--space-md);
}

.forgot-view__otp-box {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
  border: 1.5px solid var(--border-color, #ccc);
  border-radius: 8px;
  background: var(--input-bg, #fff);
  color: black;
  outline: none;
  transition: border-color 0.15s;
}

.forgot-view__otp-box:focus {
  border-color: var(--accent-gold, #c9a84c);
}

/* Resend */
.forgot-view__resend {
  text-align: center;
  margin-top: var(--space-sm);
  font-size: 0.85rem;
}

.forgot-view__resend-countdown {
  color: var(--text-muted);
}

.forgot-view__resend-btn {
  background: none;
  border: none;
  color: var(--accent-gold, #c9a84c);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
  text-decoration: underline;
}

.forgot-view__resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Back link */
.forgot-view__back {
  text-align: center;
  margin-top: var(--space-md);
  font-size: 0.85rem;
}

.forgot-view__back-link {
  color: var(--accent-gold, #c9a84c);
}
</style>
