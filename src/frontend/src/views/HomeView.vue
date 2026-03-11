<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { booksService } from '../services/books.service'
import { videosService } from '../services/videos.service'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const user = ref(null)
const books = ref([])
const recentBooks = ref([])
const recentVideos = ref([])
const videoCourses = ref([])
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
    const [booksRes, recentRes, recentVideosRes, videosRes] = await Promise.all([
      booksService.getBooks({ exclude_read: 'true' }).catch(() => ({ data: { results: [] } })),
      booksService.getRecentlyRead().catch(() => ({ data: [] })),
      videosService.getRecentlyWatched().catch(() => ({ data: [] })),
      videosService.getVideos().catch(() => ({ data: [] })),
    ])
    const list = booksRes.data?.results ?? booksRes.data ?? []
    books.value = Array.isArray(list) ? list.slice(0, 10) : []
    recentBooks.value = Array.isArray(recentRes.data) ? recentRes.data : []
    recentVideos.value = Array.isArray(recentVideosRes.data) ? recentVideosRes.data : []
    const vlist = videosRes.data?.results ?? videosRes.data ?? []
    videoCourses.value = Array.isArray(vlist) ? vlist.slice(0, 10) : []
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

function goVideo(slug) {
  if (slug) router.push({ name: 'VideoDetail', params: { slug } })
}

function goRecentVideo(v) {
  if (!v?.slug) return
  if (v.last_lesson_slug) {
    router.push({ name: 'VideoPlayer', params: { slug: v.slug, lessonSlug: v.last_lesson_slug } })
  } else {
    router.push({ name: 'VideoDetail', params: { slug: v.slug } })
  }
}
</script>


<template>
  <div class="home-view">
    <p class="home-view__greeting">{{ greeting }}</p>
    <p class="home-view__motto">{{ t('home.motto') }}</p>

    <!-- Recently read / watched -->
    <section class="home-section">
      <h2 class="home-section__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        {{ t('home.continueStudy.title') }}
      </h2>
      <div v-if="recentBooks.length || recentVideos.length" class="home-books">
        <!-- Books first -->
        <div
          v-for="b in recentBooks"
          :key="'book-' + b.slug"
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
        <!-- Videos after -->
        <div
          v-for="v in recentVideos"
          :key="'video-' + v.slug"
          class="home-book-card"
          @click="goRecentVideo(v)"
        >
          <div class="home-book-card__cover">
            <img v-if="v.cover_image" :src="v.cover_image" :alt="v.title" />
            <div v-else class="home-book-card__cover-placeholder"></div>
            <span class="home-book-card__chapter-badge">
              <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style="display:inline;vertical-align:middle;margin-right:3px"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              Video
            </span>
            <div class="home-book-card__play-overlay">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <span class="home-book-card__title">{{ v.title }}</span>
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

    <!-- Video courses -->
    <section v-if="videoCourses.length" class="home-section">
      <div class="home-section__head">
        <h2 class="home-section__title home-section__title--inline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
          Khóa học video
        </h2>
        <RouterLink to="/videos" class="home-section__link">Xem tất cả</RouterLink>
      </div>
      <div class="home-videos">
        <div
          v-for="v in videoCourses"
          :key="v.public_id || v.slug"
          class="home-video-card"
          @click="goVideo(v.slug)"
        >
          <div class="home-video-card__thumb">
            <img v-if="v.cover_image" :src="v.cover_image" :alt="v.title" />
            <div v-else class="home-video-card__thumb-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28" opacity=".35">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </div>
            <!-- play overlay -->
            <div class="home-video-card__play">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <!-- lesson count badge -->
            <span v-if="v.total_lessons" class="home-video-card__count">
              {{ v.total_lessons }} bài
            </span>
          </div>
          <span class="home-video-card__title">{{ v.title }}</span>
          <span v-if="v.category" class="home-video-card__cat">{{ v.category.title }}</span>
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
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 20px 6px 6px;
  letter-spacing: 0.04em;
}
.home-book-card__play-overlay {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 38px; height: 38px;
  border-radius: 50%;
  background: rgba(197,165,81,0.85);
  color: #1a0a00;
  display: flex; align-items: center; justify-content: center;
}
.home-recent-empty {
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: var(--space-sm) 0;
}

/* ── Video course cards ────────────────────────────────────── */
.home-videos {
  display: flex;
  gap: var(--space-md);
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}
.home-video-card {
  flex: 0 0 180px;
  min-width: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.home-video-card__thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-input);
}
.home-video-card__thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.home-video-card:hover .home-video-card__thumb img {
  transform: scale(1.04);
}
.home-video-card__thumb-placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--bg-input) 0%, var(--policy-bg) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.home-video-card__play {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(197,165,81,0.85);
  color: #1a0a00;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}
.home-video-card:hover .home-video-card__play {
  opacity: 1;
}
.home-video-card__count {
  position: absolute;
  bottom: 5px; right: 6px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
}
.home-video-card__title {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.home-video-card__cat {
  font-size: 0.72rem;
  color: var(--accent-gold);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
