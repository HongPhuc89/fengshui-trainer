<script setup>
import { ref, onMounted } from 'vue'
import { walletService } from '../services/wallet.service'

const balance = ref(0)
const tier = ref('Thành viên Bạc')
const transactions = ref([])
const voucher = ref('')
const voucherLoading = ref(false)
const voucherMessage = ref('')
const loading = ref(true)

const packages = [
  {
    id: 'monthly',
    name: 'Gói Tháng',
    subtitle: 'Trải nghiệm cơ bản',
    price: '59.000đ',
    period: 'tháng',
    features: [
      { label: 'Đọc không giới hạn', included: true },
      { label: 'Tắt quảng cáo', included: true },
      { label: 'Tư vấn Phong Thủy 1:1', included: false },
    ],
    featured: false,
  },
  {
    id: 'annual',
    name: 'Gói Năm',
    subtitle: 'Đặc quyền toàn diện',
    price: '599.000đ',
    period: 'năm',
    features: [
      { label: 'Tất cả quyền lợi gói tháng', included: true },
      { label: 'Huy hiệu VIP độc quyền', included: true },
      { label: '1 lần chuyển thiết bị', included: true },
    ],
    featured: true,
  },
]

onMounted(async () => {
  try {
    const [walletRes, txRes] = await Promise.allSettled([
      walletService.getBalance(),
      walletService.getTransactions({ limit: 5 }),
    ])
    if (walletRes.status === 'fulfilled') {
      balance.value = walletRes.value.data?.balance ?? 0
      tier.value = walletRes.value.data?.tier_display ?? 'Thành viên Bạc'
    }
    if (txRes.status === 'fulfilled') {
      const list = txRes.value.data?.results ?? txRes.value.data ?? []
      transactions.value = Array.isArray(list) ? list : []
    }
  } catch (_) {}
  finally {
    loading.value = false
  }
})

async function redeemVoucher() {
  if (!voucher.value.trim()) return
  voucherLoading.value = true
  voucherMessage.value = ''
  try {
    const { data } = await walletService.redeemVoucher(voucher.value.trim())
    voucherMessage.value = data?.message ?? 'Đổi mã thành công!'
    balance.value += data?.amount ?? 0
    voucher.value = ''
  } catch (e) {
    voucherMessage.value = e.response?.data?.detail ?? 'Mã không hợp lệ hoặc đã được sử dụng.'
  } finally {
    voucherLoading.value = false
  }
}

function txIcon(type) {
  if (type === 'topup' || type === 'deposit') return 'plus'
  if (type === 'unlock') return 'unlock'
  return 'book'
}

function txSign(amount) {
  return amount >= 0 ? '+' : ''
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) {
    return `Hôm nay, ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diff < 172800000) {
    return `Hôm qua, ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="wallet">
    <!-- Page header -->
    <div class="wallet__page-header">
      <span class="wallet__page-title">Ví Linh Thạch</span>
      <button class="wallet__history-btn" title="Lịch sử">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
        </svg>
      </button>
    </div>

    <!-- Balance card -->
    <div class="wallet__balance-card">
      <span class="wallet__balance-label">Số dư khả dụng</span>
      <div class="wallet__balance-amount">
        <span class="wallet__balance-number">{{ balance.toLocaleString('vi-VN') }}</span>
        <span class="wallet__diamond">💎</span>
      </div>
      <span class="wallet__tier-badge">{{ tier }}</span>
    </div>

    <!-- Action buttons -->
    <div class="wallet__actions">
      <button class="wallet__btn wallet__btn--topup">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nạp Thêm
      </button>
      <button class="wallet__btn wallet__btn--transfer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        Chuyển Khoản
      </button>
    </div>

    <!-- Voucher -->
    <div class="wallet__voucher">
      <svg class="wallet__voucher-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
      <input
        v-model="voucher"
        class="wallet__voucher-input"
        placeholder="Nhập mã Voucher"
        @keyup.enter="redeemVoucher"
      />
      <button class="wallet__voucher-btn" :disabled="voucherLoading" @click="redeemVoucher">
        {{ voucherLoading ? '...' : 'Đổi mã' }}
      </button>
    </div>
    <p v-if="voucherMessage" class="wallet__voucher-msg">{{ voucherMessage }}</p>

    <!-- VIP Packages -->
    <div class="wallet__section">
      <div class="wallet__section-header">
        <span class="wallet__section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right:4px;vertical-align:middle"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Các gói thành viên VIP
        </span>
        <a href="#" class="wallet__section-link">Quyền lợi chi tiết</a>
      </div>

      <div class="wallet__packages">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="wallet__package"
          :class="{ 'wallet__package--featured': pkg.featured }"
        >
          <div class="wallet__package-header">
            <span class="wallet__package-name">{{ pkg.name }}</span>
            <span class="wallet__package-subtitle">{{ pkg.subtitle }}</span>
          </div>
          <ul class="wallet__package-features">
            <li
              v-for="f in pkg.features"
              :key="f.label"
              class="wallet__package-feature"
              :class="{ 'wallet__package-feature--excluded': !f.included }"
            >
              <span class="wallet__feature-icon">{{ f.included ? '✓' : '✗' }}</span>
              {{ f.label }}
            </li>
          </ul>
          <div class="wallet__package-footer">
            <span class="wallet__package-price">{{ pkg.price }}<span class="wallet__package-period">/{{ pkg.period }}</span></span>
            <button class="wallet__package-btn" :class="{ 'wallet__package-btn--featured': pkg.featured }">Chọn</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Transactions -->
    <div class="wallet__section">
      <div class="wallet__section-header">
        <span class="wallet__section-title">Lịch sử giao dịch</span>
      </div>

      <div v-if="loading" class="wallet__tx-empty">Đang tải...</div>
      <div v-else-if="transactions.length === 0" class="wallet__tx-empty">Chưa có giao dịch nào.</div>
      <template v-else>
        <div v-for="tx in transactions" :key="tx.id" class="wallet__tx">
          <div class="wallet__tx-icon" :class="`wallet__tx-icon--${txIcon(tx.transaction_type)}`">
            <svg v-if="txIcon(tx.transaction_type) === 'plus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <svg v-else-if="txIcon(tx.transaction_type) === 'unlock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div class="wallet__tx-info">
            <span class="wallet__tx-title">{{ tx.description }}</span>
            <span class="wallet__tx-date">{{ formatDate(tx.created_at) }}</span>
          </div>
          <span class="wallet__tx-amount" :class="tx.amount >= 0 ? 'wallet__tx-amount--positive' : 'wallet__tx-amount--negative'">
            {{ txSign(tx.amount) }}{{ Math.abs(tx.amount).toLocaleString('vi-VN') }} 💎
          </span>
        </div>
        <a href="#" class="wallet__tx-all">Xem tất cả lịch sử</a>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   Base – mobile first (< 480px)
   ============================================================ */
.wallet {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  /* Center on wide screens; full-width on mobile */
  max-width: 600px;
  margin-inline: auto;
}

/* Page header */
.wallet__page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wallet__page-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}
.wallet__history-btn {
  background: none;
  color: var(--text-muted);
  padding: 6px;
  display: flex;
  align-items: center;
  /* ensure 44px touch target */
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
}

/* Balance card */
.wallet__balance-card {
  background: linear-gradient(135deg, #3a2060 0%, #1a1040 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  text-align: center;
}
.wallet__balance-label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.wallet__balance-amount {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.wallet__balance-number {
  /* fluid: 1.8rem on very small → 2.6rem on normal phones */
  font-size: clamp(1.8rem, 8vw, 2.6rem);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}
.wallet__diamond { font-size: clamp(1.6rem, 6vw, 2.2rem); }
.wallet__tier-badge {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  padding: 3px 14px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Action buttons */
.wallet__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}
.wallet__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* min 44px touch target */
  min-height: 44px;
  padding: 10px var(--space-sm);
  border-radius: var(--radius-md);
  font-size: clamp(0.8rem, 3vw, 0.95rem);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.wallet__btn--topup {
  background: #1565c0;
  color: #fff;
}
.wallet__btn--transfer {
  background: transparent;
  border: 1.5px solid var(--border-input);
  color: var(--text-primary);
}

/* Voucher */
.wallet__voucher {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-md);
  padding: 10px var(--space-md);
  min-height: 48px;
}
.wallet__voucher-icon { color: var(--accent-gold); flex-shrink: 0; }
.wallet__voucher-input {
  flex: 1;
  min-width: 0; /* prevent overflow */
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 0.9rem;
}
.wallet__voucher-input::placeholder { color: rgba(255,255,255,0.4); }
.wallet__voucher-btn {
  background: none;
  color: var(--accent-gold);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  padding: 4px 0 4px 8px;
  min-height: 44px;
}
.wallet__voucher-btn:disabled { opacity: 0.5; }
.wallet__voucher-msg {
  font-size: 0.8rem;
  color: var(--accent-gold);
  margin-top: -8px;
  padding: 0 2px;
}

/* Sections */
.wallet__section { display: flex; flex-direction: column; gap: var(--space-sm); }
.wallet__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}
.wallet__section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}
.wallet__section-link {
  font-size: 0.8rem;
  color: var(--accent-gold);
  text-decoration: none;
  white-space: nowrap;
}

/* Packages — default: 2 equal columns */
.wallet__packages {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}
.wallet__package {
  background: var(--bg-input);
  border: 1.5px solid var(--border-input);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0; /* prevent overflow */
}
.wallet__package--featured {
  border-color: var(--accent-gold);
  background: rgba(197, 165, 81, 0.08);
}
.wallet__package-header { display: flex; flex-direction: column; gap: 2px; }
.wallet__package-name {
  font-size: clamp(0.85rem, 3vw, 0.95rem);
  font-weight: 700;
  color: var(--text-primary);
}
.wallet__package-subtitle {
  font-size: clamp(0.68rem, 2.5vw, 0.75rem);
  color: rgba(255,255,255,0.55);
}
.wallet__package-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.wallet__package-feature {
  font-size: clamp(0.7rem, 2.5vw, 0.78rem);
  color: var(--text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 5px;
  line-height: 1.35;
  word-break: break-word;
}
.wallet__package-feature--excluded { color: rgba(255,255,255,0.35); }
.wallet__feature-icon { font-size: 0.8rem; flex-shrink: 0; margin-top: 1px; }
.wallet__package-feature:not(.wallet__package-feature--excluded) .wallet__feature-icon { color: #4caf50; }
.wallet__package-feature--excluded .wallet__feature-icon { color: rgba(255,255,255,0.3); }
.wallet__package-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: var(--space-xs);
  flex-wrap: wrap;
}
.wallet__package-price {
  font-size: clamp(0.82rem, 3vw, 0.95rem);
  font-weight: 700;
  color: var(--text-primary);
}
.wallet__package-period {
  font-size: 0.7rem;
  font-weight: 400;
  color: rgba(255,255,255,0.55);
}
.wallet__package-btn {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 32px;
  white-space: nowrap;
}
.wallet__package-btn--featured {
  background: var(--accent-gold);
  border-color: var(--accent-gold);
  color: #1a0a00;
}

/* Transactions */
.wallet__tx {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-input);
}
.wallet__tx:last-of-type { border-bottom: none; }
.wallet__tx-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wallet__tx-icon--plus  { background: rgba(21,101,192,0.25); color: #64b5f6; }
.wallet__tx-icon--unlock{ background: rgba(230,81,0,0.25);   color: #ffb74d; }
.wallet__tx-icon--book  { background: rgba(198,40,40,0.25);  color: #ef9a9a; }
.wallet__tx-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.wallet__tx-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wallet__tx-date { font-size: 0.72rem; color: rgba(255,255,255,0.5); }
.wallet__tx-amount { font-size: 0.88rem; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.wallet__tx-amount--positive { color: #66bb6a; }
.wallet__tx-amount--negative { color: rgba(255,255,255,0.75); }
.wallet__tx-empty {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.4);
  text-align: center;
  padding: var(--space-lg) var(--space-md);
}
.wallet__tx-all {
  display: block;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  margin-top: var(--space-sm);
  text-decoration: none;
  padding: var(--space-sm);
}

/* ============================================================
   Very small phones (< 360px) — stack packages vertically
   ============================================================ */
@media (max-width: 359px) {
  .wallet__packages {
    grid-template-columns: 1fr;
  }
  .wallet__btn {
    font-size: 0.78rem;
    padding: 10px var(--space-xs);
  }
}

/* ============================================================
   Tablet / large phones (≥ 480px)
   ============================================================ */
@media (min-width: 480px) {
  .wallet__balance-card {
    padding: var(--space-xl) var(--space-lg);
  }
  .wallet__balance-number {
    font-size: 2.8rem;
  }
  .wallet__diamond { font-size: 2.4rem; }
  .wallet__btn {
    font-size: 0.95rem;
    padding: 12px var(--space-md);
  }
  .wallet__package {
    padding: var(--space-md);
  }
  .wallet__package-name { font-size: 0.95rem; }
  .wallet__package-feature { font-size: 0.78rem; }
  .wallet__tx-icon { width: 44px; height: 44px; }
}

/* ============================================================
   Desktop (≥ 768px) — wider layout, packages side-by-side
   ============================================================ */
@media (min-width: 768px) {
  .wallet {
    gap: var(--space-lg);
  }
  .wallet__page-title { font-size: 1.25rem; }
  .wallet__balance-card {
    padding: 40px var(--space-xl);
    border-radius: 20px;
  }
  .wallet__balance-number { font-size: 3.2rem; }
  .wallet__diamond { font-size: 2.8rem; }
  .wallet__tier-badge { font-size: 0.85rem; padding: 5px 18px; }
  .wallet__btn {
    min-height: 48px;
    font-size: 1rem;
  }
  /* Packages: keep 2 cols but let them breathe */
  .wallet__packages {
    gap: var(--space-md);
  }
  .wallet__package {
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
  }
  .wallet__package-name { font-size: 1.05rem; }
  .wallet__package-subtitle { font-size: 0.8rem; }
  .wallet__package-feature { font-size: 0.85rem; gap: 8px; }
  .wallet__package-price { font-size: 1.05rem; }
  .wallet__package-btn { padding: 7px 16px; font-size: 0.85rem; min-height: 36px; }
  .wallet__tx-title { font-size: 0.95rem; }
  .wallet__tx-date { font-size: 0.8rem; }
  .wallet__tx-amount { font-size: 0.95rem; }
  .wallet__section-title { font-size: 1.05rem; }
}
</style>
