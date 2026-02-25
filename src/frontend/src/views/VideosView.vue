<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { videosService } from '../services/videos.service'

const router = useRouter()

// ── State ────────────────────────────────────────────────────
const courses = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref(null)

const searchQuery = ref('')
const activeCategory = ref('all')
const sortOrder = ref('newest') // newest | price_asc | price_desc | duration_desc

// ── Load data ────────────────────────────────────────────────
onMounted(async () => {
  const [catRes, courseRes] = await Promise.allSettled([
    videosService.getCategories(),
    videosService.getVideos(),
  ])
  if (catRes.status === 'fulfilled') {
    categories.value = catRes.value.data?.results ?? catRes.value.data ?? []
  }
  if (courseRes.status === 'fulfilled') {
    courses.value = courseRes.value.data?.results ?? courseRes.value.data ?? []
  } else {
    error.value = 'Không thể tải danh sách khóa học.'
  }
  loading.value = false
})

watch(activeCategory, async (slug) => {
  loading.value = true
  error.value = null
  try {
    const params = slug !== 'all' ? { category: slug } : {}
    const res = await videosService.getVideos(params)
    courses.value = res.data?.results ?? res.data ?? []
  } catch {
    error.value = 'Không thể tải danh sách khóa học.'
  } finally {
    loading.value = false
  }
})

// ── Computed ─────────────────────────────────────────────────
const filtered = computed(() => {
  let list = courses.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q),
    )
  }

  if (sortOrder.value === 'price_asc') {
    list = [...list].sort((a, b) => a.price_lt - b.price_lt)
  } else if (sortOrder.value === 'price_desc') {
    list = [...list].sort((a, b) => b.price_lt - a.price_lt)
  } else if (sortOrder.value === 'duration_desc') {
    list = [...list].sort((a, b) => b.total_duration_seconds - a.total_duration_seconds)
  }

  return list
})

// ── Helpers ──────────────────────────────────────────────────
function cycleSortOrder() {
  const orders = ['newest', 'price_asc', 'price_desc', 'duration_desc']
  const idx = orders.indexOf(sortOrder.value)
  sortOrder.value = orders[(idx + 1) % orders.length]
}

const sortLabel = computed(() => {
  if (sortOrder.value === 'price_asc') return 'Giá tăng dần'
  if (sortOrder.value === 'price_desc') return 'Giá giảm dần'
  if (sortOrder.value === 'duration_desc') return 'Dài nhất'
  return 'Mới nhất'
})

function priceLabel(course) {
  if (course.is_free) return 'Miễn phí'
  return course.price_lt?.toLocaleString('vi-VN') ?? '0'
}

function formatDuration(seconds) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}g ${m}p`
  return `${m} phút`
}

const LEVEL_MAP = {
  BEGINNER:     { label: 'Cơ bản',   color: '#66bb6a' },
  INTERMEDIATE: { label: 'Trung cấp', color: '#ffa726' },
  ADVANCED:     { label: 'Nâng cao', color: '#ef5350' },
}

function levelInfo(level) {
  return LEVEL_MAP[level] ?? { label: level, color: 'rgba(255,255,255,0.5)' }
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#1a237e,#7b1fa2)',
  'linear-gradient(135deg,#004d40,#00695c)',
  'linear-gradient(135deg,#880e4f,#c62828)',
  'linear-gradient(135deg,#e65100,#bf360c)',
  'linear-gradient(135deg,#1b5e20,#33691e)',
  'linear-gradient(135deg,#0d47a1,#1565c0)',
]

function coverGradient(course) {
  const idx = (course.title?.charCodeAt(0) ?? 0) % COVER_GRADIENTS.length
  return COVER_GRADIENTS[idx]
}
</script>

<template>
  <div class="videos">
    <!-- ── Search bar ─────────────────────────────────── -->
    <div class="videos__search-bar">
      <svg class="videos__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="searchQuery"
        class="videos__search-input"
        placeholder="Tìm kiếm khóa học, giảng viên..."
        type="search"
      />
      <button class="videos__filter-btn" title="Bộ lọc">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <line x1="4" y1="6"  x2="20" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- ── Category tabs ──────────────────────────────── -->
    <div class="videos__tabs-wrap">
      <div class="videos__tabs" role="tablist">
        <button
          class="videos__tab"
          :class="{ 'videos__tab--active': activeCategory === 'all' }"
          @click="activeCategory = 'all'"
          role="tab"
        >
          Tất cả
        </button>
        <button
          v-for="cat in categories"
          :key="cat.slug"
          class="videos__tab"
          :class="{ 'videos__tab--active': activeCategory === cat.slug }"
          @click="activeCategory = cat.slug"
          role="tab"
        >
          {{ cat.title }}
        </button>
      </div>
    </div>

    <!-- ── Count + sort ───────────────────────────────── -->
    <div class="videos__meta">
      <span class="videos__count">
        Khóa học
        <span class="videos__count-num">{{ filtered.length }}</span>
      </span>
      <button class="videos__sort-btn" @click="cycleSortOrder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="15" y2="12"/>
          <line x1="3" y1="18" x2="9"  y2="18"/>
        </svg>
        {{ sortLabel }}
      </button>
    </div>

    <!-- ── Error ──────────────────────────────────────── -->
    <div v-if="error && !loading" class="videos__error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ error }}
    </div>

    <!-- ── Skeleton ───────────────────────────────────── -->
    <template v-if="loading">
      <div v-for="n in 4" :key="n" class="videos__card videos__card--skeleton">
        <div class="videos__cover videos__cover--skeleton"></div>
        <div class="videos__info">
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-50" style="margin-top:6px"></div>
          <div class="skeleton-line w-60" style="margin-top:10px"></div>
          <div class="skeleton-line w-40" style="margin-top:6px"></div>
        </div>
      </div>
    </template>

    <!-- ── Empty ──────────────────────────────────────── -->
    <div v-else-if="!loading && filtered.length === 0" class="videos__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" opacity=".35">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <p>Không tìm thấy khóa học phù hợp.</p>
    </div>

    <!-- ── Course list ────────────────────────────────── -->
    <template v-else-if="!loading">
      <div
        v-for="course in filtered"
        :key="course.slug"
        class="videos__card"
        role="button"
        tabindex="0"
        @click="router.push({ name: 'VideoDetail', params: { slug: course.slug } })"
        @keydown.enter="router.push({ name: 'VideoDetail', params: { slug: course.slug } })"
      >
        <!-- Thumbnail -->
        <div
          class="videos__cover"
          :style="course.cover_image
            ? `background-image:url(${course.cover_image})`
            : `background:${coverGradient(course)}`"
        >
          <!-- Play icon overlay -->
          <div class="videos__play-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>

          <!-- Duration badge -->
          <span v-if="course.total_duration_seconds" class="videos__duration-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {{ formatDuration(course.total_duration_seconds) }}
          </span>
        </div>

        <!-- Info -->
        <div class="videos__info">
          <p class="videos__title">{{ course.title }}</p>

          <!-- Instructor -->
          <span v-if="course.instructor" class="videos__instructor">
            <span class="videos__instructor-dot"></span>
            {{ course.instructor }}
          </span>

          <!-- Lessons + Level + Price -->
          <div class="videos__tags">
            <span v-if="course.total_lessons" class="videos__tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              {{ course.total_lessons }} bài
            </span>
            <span
              v-if="course.level"
              class="videos__tag videos__tag--level"
              :style="`color:${levelInfo(course.level).color};border-color:${levelInfo(course.level).color}22`"
            >
              {{ levelInfo(course.level).label }}
            </span>
            <span
              class="videos__price-value"
              :class="{ 'videos__price-value--free': course.is_free }"
            >
              {{ priceLabel(course) }}
              <svg v-if="!course.is_free" viewBox="0 0 24 24" fill="currentColor" width="11" height="11" style="flex-shrink:0;margin-bottom:1px">
                <path d="M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9l2.5 4H5L6.5 4zM5.5 10h13l-8.5 12L5.5 10z"/>
              </svg>
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────── */
.videos {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-bottom: var(--space-lg);
}

/* ── Search bar ──────────────────────────────────────────── */
.videos__search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-md);
  padding: 0 var(--space-sm) 0 var(--space-md);
  height: 46px;
}
.videos__search-icon {
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}
.videos__search-input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 0.9rem;
}
.videos__search-input::placeholder { color: rgba(255, 255, 255, 0.35); }
.videos__search-input::-webkit-search-cancel-button { display: none; }
.videos__filter-btn {
  background: none;
  color: rgba(255, 255, 255, 0.55);
  padding: 6px;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.videos__filter-btn:hover { color: var(--accent-gold); background: rgba(255,255,255,0.06); }

/* ── Category tabs ───────────────────────────────────────── */
.videos__tabs-wrap {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  margin: 0 calc(-1 * var(--space-md));
  padding: 0 var(--space-md);
}
.videos__tabs-wrap::-webkit-scrollbar { display: none; }
.videos__tabs {
  display: flex;
  gap: var(--space-sm);
  width: max-content;
  padding: 2px 0 4px;
}
.videos__tab {
  background: var(--bg-input);
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 0.82rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  min-height: 34px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.videos__tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.08); }
.videos__tab--active {
  background: var(--accent-gold);
  color: #1a0a00;
  font-weight: 700;
  border-color: var(--accent-gold);
}

/* ── Meta row ────────────────────────────────────────────── */
.videos__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-xs);
}
.videos__count { font-size: 0.82rem; color: rgba(255, 255, 255, 0.55); }
.videos__count-num { color: var(--text-primary); font-weight: 700; margin-left: 4px; }
.videos__sort-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.82rem;
  padding: 4px 0;
  min-height: 32px;
}
.videos__sort-btn:hover { color: var(--accent-gold); }

/* ── Card ────────────────────────────────────────────────── */
.videos__card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md) var(--space-sm) var(--space-sm);
  cursor: pointer;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.videos__card:hover,
.videos__card:focus-visible {
  background: rgba(74, 44, 39, 0.9);
  outline: none;
}

/* ── Cover / Thumbnail ───────────────────────────────────── */
.videos__cover {
  width: 100px;
  min-width: 100px;
  height: 70px;
  border-radius: var(--radius-sm);
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* play icon */
.videos__play-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  padding-left: 2px; /* optical center for play triangle */
}

/* duration badge bottom-right */
.videos__duration-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 3px;
}

/* ── Info ────────────────────────────────────────────────── */
.videos__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
}
.videos__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.videos__instructor {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}
.videos__instructor-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7c4dff;
  flex-shrink: 0;
}

/* ── Tags row (lessons + level) ──────────────────────────── */
.videos__tags {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.videos__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 2px 7px;
}
.videos__tag--level {
  border: 1px solid;
  background: transparent;
  font-weight: 600;
}

/* ── Price inline in tags ────────────────────────────────── */
.videos__price-value {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--accent-gold);
  margin-left: auto;
}
.videos__price-value--free { color: #66bb6a; }

/* ── Skeleton ────────────────────────────────────────────── */
.videos__card--skeleton { pointer-events: none; }
.videos__cover--skeleton {
  background: rgba(255,255,255,0.07);
  animation: shimmer 1.4s infinite;
}
.skeleton-line {
  height: 12px;
  background: rgba(255,255,255,0.07);
  border-radius: 6px;
  animation: shimmer 1.4s infinite;
}
.w-80 { width: 80%; }
.w-60 { width: 60%; }
.w-50 { width: 50%; }
.w-40 { width: 40%; }
@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
}

/* ── Empty / Error ───────────────────────────────────────── */
.videos__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) var(--space-md);
  color: rgba(255,255,255,0.35);
  font-size: 0.88rem;
  text-align: center;
}
.videos__error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: rgba(193,49,35,0.15);
  border: 1px solid rgba(193,49,35,0.4);
  border-radius: var(--radius-md);
  color: #ef9a9a;
  font-size: 0.85rem;
  padding: var(--space-sm) var(--space-md);
}

/* ── Responsive ──────────────────────────────────────────── */
@media (min-width: 480px) {
  .videos__cover { width: 116px; min-width: 116px; height: 80px; }
  .videos__title { font-size: 0.95rem; }
  .videos__play-icon { width: 40px; height: 40px; }
}
@media (min-width: 768px) {
  .videos__search-bar { height: 50px; }
  .videos__tab { font-size: 0.88rem; padding: 7px 20px; }
  .videos__cover { width: 130px; min-width: 130px; height: 88px; }
  .videos__title { font-size: 1rem; }
  .videos__price-value { font-size: 1.1rem; }
}
</style>
