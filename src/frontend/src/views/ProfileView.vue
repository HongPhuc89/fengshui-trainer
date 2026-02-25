<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import GemIcon from '../components/icons/GemIcon.vue'
import { useAuthStore } from '../stores/auth'
import { userService } from '../services/user.service'
import { authService } from '../services/auth.service'
import { walletService } from '../services/wallet.service'

const auth = useAuthStore()
const router = useRouter()

// ─── Avatar ───────────────────────────────────────────────────────────────────
const fileInputRef = ref(null)
const rawImageSrc = ref('')
const showCropModal = ref(false)
const cropperRef = ref(null)
const avatarUploading = ref(false)
const avatarError = ref('')

const avatarUrl = computed(() => auth.user?.avatar_url || null)
const initials = computed(() => {
  const u = auth.user
  if (!u) return '?'
  const f = (u.first_name || '').charAt(0).toUpperCase()
  const l = (u.last_name || '').charAt(0).toUpperCase()
  return f || l ? `${f}${l}` : (u.email || '?').charAt(0).toUpperCase()
})

function openFilePicker() {
  fileInputRef.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''
  avatarError.value = ''
  rawImageSrc.value = URL.createObjectURL(file)
  showCropModal.value = true
}

function cancelCrop() {
  showCropModal.value = false
  rawImageSrc.value = ''
}

async function confirmCrop() {
  if (!cropperRef.value) return
  const { canvas } = cropperRef.value.getResult()
  if (!canvas) return

  avatarUploading.value = true
  avatarError.value = ''

  canvas.toBlob(
    async (blob) => {
      try {
        const { data } = await userService.uploadAvatar(blob)
        auth.setUser({ ...auth.user, avatar_url: data.avatar_url })
        showCropModal.value = false
        rawImageSrc.value = ''
      } catch {
        avatarError.value = 'Upload thất bại. Vui lòng thử lại.'
      } finally {
        avatarUploading.value = false
      }
    },
    'image/jpeg',
    0.9,
  )
}

// ─── Name Edit ────────────────────────────────────────────────────────────────
const editing = ref(false)
const nameForm = reactive({ first_name: '', last_name: '' })
const nameSaving = ref(false)
const nameError = ref('')

function startEditing() {
  nameForm.first_name = auth.user?.first_name || ''
  nameForm.last_name = auth.user?.last_name || ''
  nameError.value = ''
  editing.value = true
}

function cancelEditing() {
  editing.value = false
}

async function saveName() {
  if (!nameForm.first_name.trim() && !nameForm.last_name.trim()) {
    nameError.value = 'Vui lòng nhập ít nhất tên hoặc họ.'
    return
  }
  nameSaving.value = true
  nameError.value = ''
  try {
    const { data } = await userService.updateProfile({
      first_name: nameForm.first_name.trim(),
      last_name: nameForm.last_name.trim(),
    })
    auth.setUser({ ...auth.user, ...data })
    editing.value = false
  } catch {
    nameError.value = 'Cập nhật thất bại. Vui lòng thử lại.'
  } finally {
    nameSaving.value = false
  }
}

// ─── Wallet balance ───────────────────────────────────────────────────────────
const walletBalance = ref(null)

async function loadWallet() {
  try {
    const { data } = await walletService.getBalance()
    walletBalance.value = data.balance
  } catch {
    // non-critical
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await authService.logout?.(auth.refresh)
  } catch {
    // proceed regardless
  }
  auth.clearAuth()
  router.push('/auth/login')
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
const userTypeBadge = computed(() => {
  const map = { FREE: 'Miễn phí', VIP: 'VIP', USER: 'Đã mua' }
  return map[auth.user?.user_type] || 'Miễn phí'
})

const badgeClass = computed(() => {
  const map = { FREE: 'badge--free', VIP: 'badge--vip', USER: 'badge--user' }
  return map[auth.user?.user_type] || 'badge--free'
})

onMounted(() => {
  loadWallet()
})
</script>

<template>
  <div class="profile-view">
    <!-- ── Avatar ─────────────────────────────────────────── -->
    <div class="avatar-section">
      <div class="avatar-wrap" @click="openFilePicker">
        <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-img" />
        <div v-else class="avatar-initials">{{ initials }}</div>
        <div class="avatar-overlay">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      </div>
      <p class="avatar-hint">Nhấn để đổi ảnh</p>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="file-input-hidden"
        @change="onFileChange"
      />
    </div>

    <!-- ── Crop Modal ─────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showCropModal" class="crop-modal-overlay">
        <div class="crop-modal">
          <p class="crop-title">Cắt ảnh đại diện</p>
          <div class="crop-area">
            <Cropper
              ref="cropperRef"
              :src="rawImageSrc"
              :stencil-props="{ aspectRatio: 1 }"
              :resize-image="{ wheel: true }"
              image-restriction="stencil"
            />
          </div>
          <p v-if="avatarError" class="crop-error">{{ avatarError }}</p>
          <div class="crop-actions">
            <button class="btn-cancel" :disabled="avatarUploading" @click="cancelCrop">Hủy</button>
            <button class="btn-confirm" :disabled="avatarUploading" @click="confirmCrop">
              <span v-if="avatarUploading" class="spinner" />
              <span v-else>Xác nhận</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── User Info Card ─────────────────────────────────── -->
    <div class="card info-card">
      <!-- Name row -->
      <div class="name-row" v-if="!editing">
        <div class="name-display">
          <span class="display-name">
            {{
              [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ') ||
              'Chưa có tên'
            }}
          </span>
          <span :class="['badge', badgeClass]">{{ userTypeBadge }}</span>
        </div>
        <button class="btn-icon" title="Chỉnh sửa tên" @click="startEditing">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      <!-- Name edit form -->
      <div v-else class="name-edit-form">
        <div class="name-inputs">
          <input
            v-model="nameForm.last_name"
            class="name-input"
            type="text"
            placeholder="Họ"
            :disabled="nameSaving"
          />
          <input
            v-model="nameForm.first_name"
            class="name-input"
            type="text"
            placeholder="Tên"
            :disabled="nameSaving"
          />
        </div>
        <p v-if="nameError" class="field-error">{{ nameError }}</p>
        <div class="name-edit-actions">
          <button class="btn-cancel-sm" :disabled="nameSaving" @click="cancelEditing">Hủy</button>
          <button class="btn-save" :disabled="nameSaving" @click="saveName">
            <span v-if="nameSaving" class="spinner spinner--sm" />
            <span v-else>Lưu</span>
          </button>
        </div>
      </div>

      <div class="info-rows">
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">{{ auth.user?.email || '—' }}</span>
        </div>
        <div v-if="auth.user?.phone_number" class="info-row">
          <span class="info-label">Điện thoại</span>
          <span class="info-value">{{ auth.user.phone_number }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Số dư</span>
          <span class="info-value balance">
            <span v-if="walletBalance !== null" style="display:inline-flex;align-items:center;gap:4px;">{{ walletBalance.toLocaleString('vi-VN') }}<GemIcon :size="13" /></span>
            <span v-else class="text-muted">Đang tải...</span>
          </span>
        </div>
      </div>
    </div>

    <!-- ── Logout ─────────────────────────────────────────── -->
    <button class="btn-logout" :disabled="loggingOut" @click="logout">
      <span v-if="loggingOut" class="spinner spinner--sm" />
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Đăng xuất
    </button>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────── */
.profile-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  padding-bottom: calc(var(--bottom-nav-height) + var(--space-lg));
  max-width: 480px;
  margin: 0 auto;
}

/* ── Avatar ─────────────────────────────────────────────── */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding-top: var(--space-md);
}

.avatar-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  cursor: pointer;
  border-radius: 50%;
  border: 2px solid var(--accent-gold);
}

.avatar-img,
.avatar-initials {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}

.avatar-img {
  object-fit: cover;
}

.avatar-initials {
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-gold);
  letter-spacing: 0.05em;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.18s;
}

.avatar-wrap:hover .avatar-overlay,
.avatar-wrap:active .avatar-overlay {
  opacity: 1;
}

.avatar-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.file-input-hidden {
  display: none;
}

/* ── Crop Modal ─────────────────────────────────────────── */
.crop-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}

.crop-modal {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.crop-title {
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

.crop-area {
  height: 300px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000;
}

.crop-error {
  color: #e05555;
  font-size: 0.8rem;
  margin: 0;
  text-align: center;
}

.crop-actions {
  display: flex;
  gap: var(--space-sm);
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: var(--space-sm) 0;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
}

.btn-cancel {
  background: var(--bg-input);
  color: var(--text-secondary);
}

.btn-confirm {
  background: var(--btn-primary);
  color: #fff;
}

.btn-confirm:disabled,
.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Cards ──────────────────────────────────────────────── */
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.card-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 var(--space-sm);
}

/* ── Info rows ──────────────────────────────────────────── */
.info-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.info-value {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
}

.info-value.balance {
  color: var(--accent-gold);
  font-weight: 700;
}

/* ── Name row ───────────────────────────────────────────── */
.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.name-display {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.display-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

.btn-icon:hover {
  color: var(--accent-gold);
}

/* ── Name edit form ──────────────────────────────────────── */
.name-edit-form {
  margin-bottom: var(--space-md);
}

.name-inputs {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.name-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.name-input:focus {
  border-color: var(--accent-gold);
}

.name-input:disabled {
  opacity: 0.6;
}

.field-error {
  color: #e05555;
  font-size: 0.78rem;
  margin: 0 0 var(--space-xs);
}

.name-edit-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.btn-cancel-sm {
  background: var(--bg-input);
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: var(--space-xs) var(--space-md);
  cursor: pointer;
}

.btn-save {
  background: var(--btn-primary);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  padding: var(--space-xs) var(--space-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 64px;
  justify-content: center;
}

.btn-save:disabled,
.btn-cancel-sm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Badge ──────────────────────────────────────────────── */
.badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.badge--free {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.badge--vip {
  background: var(--badge-premium-bg, #2a1a00);
  color: var(--accent-gold);
  border: 1px solid rgba(197, 165, 81, 0.4);
}

.badge--user {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.3);
}

/* ── Logout ─────────────────────────────────────────────── */
.btn-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm);
  background: rgba(193, 49, 35, 0.12);
  border: 1px solid rgba(193, 49, 35, 0.3);
  border-radius: var(--radius-lg);
  color: #e05555;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-logout:hover {
  background: rgba(193, 49, 35, 0.22);
}

.btn-logout:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Helpers ────────────────────────────────────────────── */
.text-muted {
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* ── Spinner ────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner--sm {
  width: 14px;
  height: 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
