<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { booksService } from '../services/books.service'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const user = ref(null)
const books = ref([])
const recentBooks = ref([])
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
    const [booksRes, recentRes] = await Promise.all([
      booksService.getBooks({ exclude_read: 'true' }).catch(() => ({ data: { results: [] } })),
      booksService.getRecentlyRead().catch(() => ({ data: [] })),
    ])
    const list = booksRes.data?.results ?? booksRes.data ?? []
    books.value = Array.isArray(list) ? list.slice(0, 10) : []
    recentBooks.value = Array.isArray(recentRes.data) ? recentRes.data : []
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

    <!-- Recently read -->
    <section class="home-section">
      <h2 class="home-section__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        {{ t('home.continueStudy.title') }}
      </h2>
      <div v-if="recentBooks.length" class="home-books">
        <div
          v-for="b in recentBooks"
          :key="b.slug"
          class="home-book-card"
          @click="goBook(b.slug)"
        >
          <div class="home-book-card__cover">
            <img v-if="b.cover_image" :src="b.cover_image" :alt="b.title" />
            <div v-else class="home-book-card__cover-placeholder"></div>
            <span class="home-book-card__chapter-badge">
              {{ t('home.continueStudy.chapter') }} {{ b.chapter_order }}
            </span>
            <div class="home-book-card__play-overlay">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <span class="home-book-card__title">{{ b.title }}</span>
        </div>
      </div>
      <div v-else-if="!loading" class="home-recent-empty">
        <p>{{ t('home.continueStudy.empty') }}</p>
      </div>
    </section>

    <!-- New books -->
    <section class="home-section">
      <div class="home-section__head">
        <h2 class="home-section__title home-section__title--inline">{{ t('home.newBooks.title') }}</h2>
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
.home-section { margin-bottom: var(--space-xl); }
.home-section__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); }
.home-section__title { font-size: 1rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px; margin: 0 0 var(--space-md); }
.home-section__title--inline { margin-bottom: 0; }
.home-section__link { color: var(--accent-gold); font-size: 0.9rem; }
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

/* Recently read overlays */
.home-book-card__chapter-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 20px 6px 6px;
  letter-spacing: 0.04em;
}
.home-book-card__play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(197, 165, 81, 0.85);
  color: #1a0a00;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home-recent-empty {
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: var(--space-sm) 0;
}
</style>
