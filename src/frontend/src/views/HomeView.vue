<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { walletService } from '../services/wallet.service'
import { booksService } from '../services/books.service'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const user = ref(null)
const wallet = ref(null)
const books = ref([])
const continueItem = ref(null)
const loading = ref(true)

const greeting = computed(() => {
  const hour = new Date().getHours()
  let period = t('home.greeting.morning')
  if (hour >= 12 && hour < 18) period = t('home.greeting.afternoon')
  else if (hour >= 18) period = t('home.greeting.evening')
  const name = user.value?.first_name || user.value?.phone_number || t('home.greeting.scholar')
  return `${period}, ${t('home.greeting.scholar')} ${name}.`
})

onMounted(async () => {
  try {
    user.value = auth.user || (await auth.fetchMe())
    const [walletRes, booksRes] = await Promise.all([
      walletService.getBalance().catch(() => ({ data: { balance: 0 } })),
      booksService.getBooks().catch(() => ({ data: { results: [] } })),
    ])
    wallet.value = walletRes.data?.balance ?? 0
    const list = booksRes.data?.results ?? booksRes.data ?? []
    books.value = Array.isArray(list) ? list.slice(0, 10) : []
    continueItem.value = null
  } catch (_) {}
  finally {
    loading.value = false
  }
})

function badgeType(book) {
  if (book?.is_free) return 'free'
  if (book?.user_type_required === 'VIP' || book?.is_vip) return 'vip'
  return 'premium'
}

function badgeLabel(book) {
  if (book?.is_free) return t('home.badge.free')
  if (book?.is_vip) return t('home.badge.vip')
  return t('home.badge.premium')
}

function goBook(slug) {
  if (slug) router.push({ name: 'BookReader', params: { slug } })
}
</script>


<template>
  <div class="home-view">
    <p class="home-view__greeting">{{ greeting }}</p>
    <p class="home-view__motto">{{ t('home.motto') }}</p>

    <section class="home-card home-card--profile">
      <div class="home-card__profile-left">
        <div class="home-card__avatar"></div>
        <span class="home-card__role">{{ t('home.profile.role') }}</span>
        <span class="home-card__level">Cấp 4</span>
      </div>
      <div class="home-card__profile-right">
        <span class="home-card__balance-label">{{ t('home.profile.balanceLabel') }}</span>
        <span class="home-card__balance">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" class="home-card__diamond"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          {{ (wallet ?? 0).toLocaleString() }}
        </span>
      </div>
      <div class="home-card__progress-wrap">
        <span class="home-card__progress-label">{{ t('home.profile.progressLabel') }}</span>
        <div class="home-card__progress-bar">
          <div class="home-card__progress-fill" style="width: 65%"></div>
        </div>
        <span class="home-card__progress-text">650/1000 XP</span>
      </div>
    </section>

    <section class="home-section">
      <h2 class="home-section__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        {{ t('home.continueStudy.title') }}
      </h2>
      <div v-if="continueItem" class="home-card home-card--continue" @click="goBook(continueItem.slug)">
        <div class="home-card__cover"></div>
        <div class="home-card__continue-body">
          <span class="home-card__chapter">CHƯƠNG 4</span>
          <span class="home-card__book-title">Phong Thủy Cơ Bản</span>
          <span class="home-card__chapter-title">Bát Quái Đồ & Dòng Ch...</span>
          <div class="home-card__progress-bar home-card__progress-bar--sm">
            <div class="home-card__progress-fill" style="width: 75%"></div>
          </div>
          <span class="home-card__pct">75%</span>
        </div>
        <button type="button" class="home-card__play" aria-label="Play">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <div v-else class="home-card home-card--continue home-card--empty">
        <p class="home-card__empty-text">{{ t('home.continueStudy.empty') }}</p>
      </div>
    </section>

    <section class="home-section">
      <div class="home-section__head">
        <h2 class="home-section__title">{{ t('home.newBooks.title') }}</h2>
        <RouterLink to="/books" class="home-section__link">{{ t('home.newBooks.viewAll') }}</RouterLink>
      </div>
      <div class="home-books">
        <div
          v-for="b in books"
          :key="b.public_id || b.slug || b.id"
          class="home-book-card"
          @click="goBook(b.slug)"
        >
          <div class="home-book-card__cover">
            <img v-if="b.cover_image" :src="b.cover_image" :alt="b.title" />
            <div v-else class="home-book-card__cover-placeholder"></div>
            <span class="home-book-card__badge" :class="`home-book-card__badge--${badgeType(b)}`">
              {{ badgeLabel(b) }}
            </span>
            <span v-if="!b.is_free && !b.is_vip" class="home-book-card__lock" aria-hidden="true">🔒</span>
          </div>
          <span class="home-book-card__title">{{ b.title }}</span>
        </div>
        <div v-if="!books.length && !loading" class="home-book-card home-book-card--empty">
          <span>{{ t('home.newBooks.empty') }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view__greeting { font-size: 0.95rem; color: var(--text-secondary); margin-bottom: var(--space-xs); }
.home-view__motto { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-lg); }
.home-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  border: 1px solid var(--border-input);
}
.home-card--profile { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; gap: var(--space-md); align-items: start; }
.home-card__profile-left { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.home-card__avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--bg-input); }
.home-card__role { font-size: 0.85rem; color: var(--text-secondary); }
.home-card__level { font-size: 0.85rem; color: var(--text-primary); }
.home-card__profile-right { text-align: right; }
.home-card__balance-label { display: block; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px; }
.home-card__balance { display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-weight: 600; }
.home-card__diamond { color: var(--accent-gold); }
.home-card__progress-wrap { grid-column: 1 / -1; }
.home-card__progress-label { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 6px; display: block; }
.home-card__progress-bar { height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden; }
.home-card__progress-fill { height: 100%; background: var(--progress-fill); border-radius: 4px; transition: width 0.3s; }
.home-card__progress-text { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; display: block; }
.home-section { margin-bottom: var(--space-xl); }
.home-section__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); }
.home-section__title { font-size: 1rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px; margin: 0; }
.home-section__link { color: var(--accent-gold); font-size: 0.9rem; }
.home-card--continue { display: flex; align-items: center; gap: var(--space-md); cursor: pointer; }
.home-card__cover { width: 80px; height: 100px; background: var(--bg-input); border-radius: var(--radius-sm); flex-shrink: 0; }
.home-card__continue-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.home-card__chapter { font-size: 0.75rem; color: var(--text-muted); }
.home-card__book-title { font-weight: 700; color: var(--text-primary); }
.home-card__chapter-title { font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.home-card__progress-bar--sm { margin-top: 8px; }
.home-card__pct { font-size: 0.8rem; color: var(--accent-gold); }
.home-card__play { width: 48px; height: 48px; border-radius: 50%; background: var(--accent-gold); color: #1a1a1a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.home-card--empty { justify-content: center; }
.home-card__empty-text { color: var(--text-muted); margin: 0; }
.home-books { display: flex; gap: var(--space-md); overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
.home-book-card { flex: 0 0 140px; min-width: 0; overflow: hidden; cursor: pointer; }
.home-book-card__cover { position: relative; width: 100%; aspect-ratio: 3/4; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-input); }
.home-book-card__cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.home-book-card__cover-placeholder { position: absolute; inset: 0; background: linear-gradient(135deg, var(--bg-input) 0%, var(--policy-bg) 100%); }
.home-book-card__badge { position: absolute; top: 6px; left: 6px; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.home-book-card__badge--premium { background: var(--badge-premium-bg); color: var(--badge-premium-text); }
.home-book-card__badge--free { background: var(--badge-free-bg); color: var(--badge-free-text); }
.home-book-card__badge--vip { background: var(--badge-vip-bg); color: var(--badge-vip-text); }
.home-book-card__lock { position: absolute; bottom: 6px; right: 6px; font-size: 14px; }
.home-book-card__title { display: block; font-size: 0.85rem; margin-top: 6px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.home-book-card--empty { display: flex; align-items: center; justify-content: center; min-height: 180px; color: var(--text-muted); }
</style>
