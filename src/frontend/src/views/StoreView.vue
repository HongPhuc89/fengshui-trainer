<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { walletService } from '../services/wallet.service'
import GemIcon from '../components/icons/GemIcon.vue'

const { t } = useI18n()

const ADMIN_EMAIL = 'admin@huyenhoc.pro'

const balance = ref(0)
const transactions = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [walletRes, txRes] = await Promise.allSettled([
      walletService.getBalance(),
      walletService.getTransactions({ limit: 20 }),
    ])
    if (walletRes.status === 'fulfilled') {
      balance.value = walletRes.value.data?.balance ?? 0
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

const TX_CONFIG = {
  ADMIN_TOPUP:       { icon: 'plus',  bg: 'rgba(21,101,192,0.25)', color: '#64b5f6' },
  ADMIN_EDIT:        { icon: 'plus',  bg: 'rgba(21,101,192,0.25)', color: '#64b5f6' },
  RECHARGE_VOUCHER:  { icon: 'plus',  bg: 'rgba(21,101,192,0.25)', color: '#64b5f6' },
  PURCHASE_BOOK:     { icon: 'book',  bg: 'rgba(198,40,40,0.25)',  color: '#ef9a9a' },
  PURCHASE_VIDEO:    { icon: 'play',  bg: 'rgba(230,81,0,0.25)',   color: '#ffb74d' },
  VIP_SUBSCRIPTION:  { icon: 'star',  bg: 'rgba(197,165,81,0.2)',  color: 'var(--accent-gold)' },
}

function txConfig(type) {
  return TX_CONFIG[type] ?? { icon: 'book', bg: 'rgba(198,40,40,0.25)', color: '#ef9a9a' }
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
  <div class="donate">
    <!-- Page header -->
    <div class="donate__header">
      <span class="donate__title">{{ t('donate.title') }}</span>
    </div>

    <!-- Balance card -->
    <div class="donate__balance-card">
      <span class="donate__balance-label">{{ t('donate.balanceLabel') }}</span>
      <div class="donate__balance-amount">
        <span class="donate__balance-number">{{ balance.toLocaleString('vi-VN') }}</span>
        <GemIcon :size="32" class="donate__gem-icon" />
      </div>
    </div>

    <!-- Contact to top up -->
    <div class="donate__contact-card">
      <div class="donate__contact-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <div class="donate__contact-body">
        <p class="donate__contact-title">{{ t('donate.contactTitle') }}</p>
        <p class="donate__contact-desc">{{ t('donate.contactDesc') }}</p>
        <a :href="`mailto:${ADMIN_EMAIL}`" class="donate__contact-email">
          {{ ADMIN_EMAIL }}
        </a>
      </div>
    </div>

    <!-- Transaction history -->
    <div class="donate__section">
      <span class="donate__section-title">{{ t('donate.historyTitle') }}</span>

      <div v-if="loading" class="donate__tx-empty">{{ t('donate.loading') }}</div>
      <div v-else-if="transactions.length === 0" class="donate__tx-empty">{{ t('donate.empty') }}</div>
      <template v-else>
        <div v-for="tx in transactions" :key="tx.id ?? tx.public_id" class="donate__tx">
          <div
            class="donate__tx-icon"
            :style="`background:${txConfig(tx.transaction_type).bg};color:${txConfig(tx.transaction_type).color}`"
          >
            <!-- plus -->
            <svg v-if="txConfig(tx.transaction_type).icon === 'plus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <!-- play -->
            <svg v-else-if="txConfig(tx.transaction_type).icon === 'play'" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <!-- star -->
            <svg v-else-if="txConfig(tx.transaction_type).icon === 'star'" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <!-- book (default) -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div class="donate__tx-info">
            <span class="donate__tx-title">{{ tx.description }}</span>
            <span class="donate__tx-date">{{ formatDate(tx.created_at) }}</span>
          </div>
          <span
            class="donate__tx-amount"
            :class="tx.amount >= 0 ? 'donate__tx-amount--positive' : 'donate__tx-amount--negative'"
          >
            {{ tx.amount >= 0 ? '+' : '' }}{{ Math.abs(tx.amount).toLocaleString('vi-VN') }}
            <GemIcon :size="11" style="flex-shrink:0" />
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.donate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  max-width: 600px;
  margin-inline: auto;
  padding-bottom: var(--space-lg);
}

/* Header */
.donate__header {
  display: flex;
  align-items: center;
}
.donate__title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Balance card */
.donate__balance-card {
  background: linear-gradient(135deg, #3a2060 0%, #1a1040 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  text-align: center;
}
.donate__balance-label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.65);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.donate__balance-amount {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.donate__gem-icon {
  color: var(--accent-gold);
  opacity: 0.9;
}
.donate__balance-number {
  font-size: clamp(2rem, 9vw, 2.8rem);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

/* Contact card */
.donate__contact-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  background: var(--bg-card);
  border: 1px solid rgba(197,165,81,0.25);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}
.donate__contact-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(197,165,81,0.15);
  color: var(--accent-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.donate__contact-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.donate__contact-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}
.donate__contact-desc {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.55);
  line-height: 1.45;
}
.donate__contact-email {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-gold);
  text-decoration: none;
  word-break: break-all;
}
.donate__contact-email:hover { text-decoration: underline; }

/* Section */
.donate__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.donate__section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Transactions */
.donate__tx {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-input);
}
.donate__tx:last-child { border-bottom: none; }
.donate__tx-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.donate__tx-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.donate__tx-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.donate__tx-date { font-size: 0.72rem; color: rgba(255,255,255,0.5); }
.donate__tx-amount {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.donate__tx-amount--positive { color: #66bb6a; }
.donate__tx-amount--negative { color: rgba(255,255,255,0.7); }

.donate__tx-empty {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.4);
  text-align: center;
  padding: var(--space-lg) var(--space-md);
}

/* Responsive */
@media (min-width: 480px) {
  .donate__balance-card { padding: var(--space-xl) var(--space-lg); }
  .donate__tx-icon { width: 44px; height: 44px; }
}
@media (min-width: 768px) {
  .donate { gap: var(--space-lg); }
  .donate__title { font-size: 1.25rem; }
  .donate__balance-card { padding: 40px var(--space-xl); border-radius: 20px; }
  .donate__tx-title { font-size: 0.95rem; }
  .donate__tx-date { font-size: 0.8rem; }
  .donate__tx-amount { font-size: 0.95rem; }
}
</style>
