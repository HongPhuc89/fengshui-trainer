<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { booksService } from '../services/books.service'
import { clearApiCache } from '../api/cache-storage'
import GemIcon from '../components/icons/GemIcon.vue'
import LockIcon from '../components/icons/LockIcon.vue'
import ScrollIcon from '../components/icons/ScrollIcon.vue'

const router = useRouter()
const { t } = useI18n()

// ── State ────────────────────────────────────────────────────
const books = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref(null)
const readingSet = ref(new Set()) // slugs of books user is currently reading

const searchQuery = ref('')
const activeCategory = ref('all')
const sortOrder = ref('newest') // newest | price_asc | price_desc

// ── Load reading progress badges ─────────────────────────────
async function loadReadingSet() {
  try {
    const res = await booksService.getRecentlyRead()
    const list = Array.isArray(res.data) ? res.data : []
    readingSet.value = new Set(list.map(b => b.slug))
  } catch { /* badge is non-critical, silently ignore */ }
}

// ── Load data ────────────────────────────────────────────────
onMounted(async () => {
  const [catRes, bookRes] = await Promise.allSettled([
    booksService.getCategories(),
    booksService.getBooks(),
  ])
  if (catRes.status === 'fulfilled') {
    categories.value = catRes.value.data?.results ?? catRes.value.data ?? []
  }
  if (bookRes.status === 'fulfilled') {
    books.value = bookRes.value.data?.results ?? bookRes.value.data ?? []
  } else {
    error.value = 'Không thể tải danh sách sách.'
  }
  loading.value = false
  loadReadingSet() // non-blocking, badge loads independently
})

// Refresh "Đang đọc" badges when returning from BookReader
onActivated(() => {
  clearApiCache()
  loadReadingSet()
})

// Re-fetch khi đổi category
watch(activeCategory, async (slug) => {
  loading.value = true
  error.value = null
  try {
    const params = slug !== 'all' ? { category: slug } : {}
    const res = await booksService.getBooks(params)
    books.value = res.data?.results ?? res.data ?? []
  } catch {
    error.value = 'Không thể tải danh sách sách.'
  } finally {
    loading.value = false
  }
})

// ── Computed ─────────────────────────────────────────────────
const filtered = computed(() => {
  let list = books.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q),
    )
  }

  if (sortOrder.value === 'price_asc') {
    list = [...list].sort((a, b) => a.price_lt - b.price_lt)
  } else if (sortOrder.value === 'price_desc') {
    list = [...list].sort((a, b) => b.price_lt - a.price_lt)
  }

  return list
})

// ── Helpers ──────────────────────────────────────────────────
function cycleSortOrder() {
  const orders = ['newest', 'price_asc', 'price_desc']
  const idx = orders.indexOf(sortOrder.value)
  sortOrder.value = orders[(idx + 1) % orders.length]
}

const sortLabel = computed(() => {
  if (sortOrder.value === 'price_asc') return 'Giá tăng dần'
  if (sortOrder.value === 'price_desc') return 'Giá giảm dần'
  return 'Mới nhất'
})

function priceLabel(book) {
  if (book.is_free) return 'Miễn phí'
  return book.price_lt?.toLocaleString('vi-VN') ?? '0'
}

// Màu gradient placeholder khi không có ảnh bìa
const COVER_GRADIENTS = [
  'linear-gradient(135deg,#3a1c71,#d76d77)',
  'linear-gradient(135deg,#134e5e,#71b280)',
  'linear-gradient(135deg,#1a1a2e,#e94560)',
  'linear-gradient(135deg,#2c3e50,#e67e22)',
  'linear-gradient(135deg,#360033,#0b8793)',
  'linear-gradient(135deg,#1565c0,#b92b27)',
]

function coverGradient(book) {
  const idx = (book.title?.charCodeAt(0) ?? 0) % COVER_GRADIENTS.length
  return COVER_GRADIENTS[idx]
}
</script>

<template>
  <div class="books">
    <!-- ── Search bar ────────────────────────────────── -->
    <div class="books__search-bar">
      <svg class="books__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="searchQuery"
        class="books__search-input"
        placeholder="Tìm kiếm theo tên sách, tác giả..."
        type="search"
      />
      <button class="books__filter-btn" title="Bộ lọc">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <line x1="4" y1="6"  x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- ── Category tabs ─────────────────────────────── -->
    <div class="books__tabs-wrap">
      <div class="books__tabs" role="tablist">
        <button
          class="books__tab"
          :class="{ 'books__tab--active': activeCategory === 'all' }"
          @click="activeCategory = 'all'"
          role="tab"
        >
          Tất cả
        </button>
        <button
          v-for="cat in categories"
          :key="cat.slug"
          class="books__tab"
          :class="{ 'books__tab--active': activeCategory === cat.slug }"
          @click="activeCategory = cat.slug"
          role="tab"
        >
          {{ cat.title }}
        </button>
      </div>
    </div>

    <!-- ── Count + sort ──────────────────────────────── -->
    <div class="books__meta">
      <span class="books__count">
        Danh sách
        <span class="books__count-num">{{ filtered.length }}</span>
      </span>
      <button class="books__sort-btn" @click="cycleSortOrder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
          <line x1="3" y1="6"  x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12"/>
          <line x1="3" y1="18" x2="9"  y2="18"/>
        </svg>
        {{ sortLabel }}
      </button>
    </div>

    <!-- ── Error ─────────────────────────────────────── -->
    <div v-if="error && !loading" class="books__error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ error }}
    </div>

    <!-- ── Skeleton loading ──────────────────────────── -->
    <template v-if="loading">
      <div v-for="n in 5" :key="n" class="books__card books__card--skeleton">
        <div class="books__cover books__cover--skeleton"></div>
        <div class="books__info">
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-50" style="margin-top:6px"></div>
          <div class="skeleton-line w-40" style="margin-top:12px"></div>
        </div>
      </div>
    </template>

    <!-- ── Empty state ───────────────────────────────── -->
    <div v-else-if="!loading && filtered.length === 0" class="books__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" opacity=".35">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <p>Không tìm thấy sách phù hợp.</p>
    </div>

    <!-- ── Book list ─────────────────────────────────── -->
    <template v-else-if="!loading">
      <div
        v-for="book in filtered"
        :key="book.slug"
        class="books__card"
        role="button"
        tabindex="0"
        @click="router.push({ name: 'BookDetail', params: { slug: book.slug } })"
        @keydown.enter="router.push({ name: 'BookDetail', params: { slug: book.slug } })"
      >
        <!-- Cover -->
        <div
          class="books__cover"
          :style="book.cover_image
            ? `background-image:url(${book.cover_image})`
            : `background:${coverGradient(book)}`"
        >
          <span v-if="book.is_new_release" class="books__badge-hot">Mới</span>
          <span v-if="readingSet.has(book.slug)" class="books__badge-reading">Đang đọc</span>
          <div v-if="!book.cover_image" class="books__cover-initial">
            {{ book.title?.charAt(0) }}
          </div>
        </div>

        <!-- Info -->
        <div class="books__info">
          <div class="books__info-top">
            <p class="books__title">{{ book.title }}</p>
            <button class="books__more-btn" title="Thêm" @click.stop>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
          </div>

          <span v-if="book.category" class="books__category">
            <span class="books__category-dot"></span>
            {{ book.category.title ?? book.category }}
          </span>

          <div class="books__price-row">
            <div class="books__price-block">
              <span class="books__price-label">{{ t('books.priceLabel') }}</span>
              <div class="books__price">
                <GemIcon v-if="!book.is_free" :size="13" style="flex-shrink:0;margin-bottom:1px" />
                <span class="books__price-value" :class="{ 'books__price-value--free': book.is_free }">
                  {{ priceLabel(book) }}
                </span>
              </div>
            </div>

            <span
              class="books__status"
              :class="book.is_free ? 'books__status--free' : 'books__status--paid'"
            >
              <ScrollIcon v-if="book.is_free" :size="11" style="flex-shrink:0" />
              <LockIcon v-else :size="11" style="flex-shrink:0" />
              {{ book.is_free ? t('home.badge.free') : t('home.badge.paid') }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────── */
.books {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-bottom: var(--space-lg);
}

/* ── Search bar ──────────────────────────────────────────── */
.books__search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-md);
  padding: 0 var(--space-sm) 0 var(--space-md);
  height: 46px;
}
.books__search-icon {
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}
.books__search-input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 0.9rem;
}
.books__search-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
/* hide browser default clear button */
.books__search-input::-webkit-search-cancel-button { display: none; }
.books__filter-btn {
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
.books__filter-btn:hover {
  color: var(--accent-gold);
  background: rgba(255, 255, 255, 0.06);
}

/* ── Category tabs ───────────────────────────────────────── */
.books__tabs-wrap {
  overflow-x: auto;
  /* hide scrollbar but keep functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
  margin: 0 calc(-1 * var(--space-md));
  padding: 0 var(--space-md);
}
.books__tabs-wrap::-webkit-scrollbar { display: none; }
.books__tabs {
  display: flex;
  gap: var(--space-sm);
  width: max-content;
  padding: 2px 0 4px;
}
.books__tab {
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
.books__tab:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}
.books__tab--active {
  background: var(--accent-gold);
  color: #1a0a00;
  font-weight: 700;
  border-color: var(--accent-gold);
}

/* ── Meta row (count + sort) ─────────────────────────────── */
.books__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-xs);
}
.books__count {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.55);
}
.books__count-num {
  color: var(--text-primary);
  font-weight: 700;
  margin-left: 4px;
}
.books__sort-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.82rem;
  padding: 4px 0;
  min-height: 32px;
}
.books__sort-btn:hover {
  color: var(--accent-gold);
}

/* ── Card ────────────────────────────────────────────────── */
.books__card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md) var(--space-sm) var(--space-sm);
  cursor: pointer;
  transition: background 0.15s;
  /* prevent tap highlight on mobile */
  -webkit-tap-highlight-color: transparent;
}
.books__card:hover,
.books__card:focus-visible {
  background: rgba(74, 44, 39, 0.9);
  outline: none;
}

/* ── Cover ───────────────────────────────────────────────── */
.books__cover {
  width: 72px;
  min-width: 72px;
  height: 96px;
  border-radius: var(--radius-sm);
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.books__cover-initial {
  font-size: 2rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1;
  text-transform: uppercase;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
.books__badge-hot {
  position: absolute;
  top: 5px;
  left: 5px;
  background: var(--btn-primary);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.books__badge-reading {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(234, 179, 8, 0.9);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  letter-spacing: 0.02em;
}

/* ── Info ────────────────────────────────────────────────── */
.books__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 2px;
}
.books__info-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}
.books__title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  /* max 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.books__more-btn {
  background: none;
  color: rgba(255, 255, 255, 0.4);
  padding: 2px;
  flex-shrink: 0;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  margin-top: -2px;
}
.books__more-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}

.books__category {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}
.books__category-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-gold);
  flex-shrink: 0;
}

/* ── Price row ───────────────────────────────────────────── */
.books__price-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-top: 4px;
}
.books__price-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.books__price-label {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.06em;
  font-weight: 600;
}
.books__price {
  display: flex;
  align-items: center;
  gap: 4px;
}
.books__price-value {
  font-size: 1rem;
  font-weight: 800;
  color: var(--accent-gold);
  line-height: 1;
}
.books__price-value--free {
  color: #66bb6a;
  font-size: 0.88rem;
}

/* ── Status badge ────────────────────────────────────────── */
.books__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  padding: 3px 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.books__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.books__status--free {
  background: rgba(102, 187, 106, 0.15);
  color: #66bb6a;
}
.books__status--free .books__status-dot {
  background: #66bb6a;
}
.books__status--paid {
  background: rgba(197, 165, 81, 0.12);
  color: var(--accent-gold);
}
.books__status--paid .books__status-dot {
  background: var(--accent-gold);
}

/* ── Skeleton ────────────────────────────────────────────── */
.books__card--skeleton {
  pointer-events: none;
}
.books__cover--skeleton {
  background: rgba(255, 255, 255, 0.07);
  animation: shimmer 1.4s infinite;
}
.skeleton-line {
  height: 12px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  animation: shimmer 1.4s infinite;
}
.w-80 { width: 80%; }
.w-50 { width: 50%; }
.w-40 { width: 40%; }

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
}

/* ── Empty / Error ───────────────────────────────────────── */
.books__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) var(--space-md);
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.88rem;
  text-align: center;
}
.books__error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: rgba(193, 49, 35, 0.15);
  border: 1px solid rgba(193, 49, 35, 0.4);
  border-radius: var(--radius-md);
  color: #ef9a9a;
  font-size: 0.85rem;
  padding: var(--space-sm) var(--space-md);
}

/* ── Responsive ──────────────────────────────────────────── */
@media (min-width: 480px) {
  .books__cover { width: 80px; min-width: 80px; height: 108px; }
  .books__title { font-size: 0.95rem; }
  .books__price-value { font-size: 1.05rem; }
}

@media (min-width: 768px) {
  .books__search-bar { height: 50px; }
  .books__tab { font-size: 0.88rem; padding: 7px 20px; }
  .books__cover { width: 88px; min-width: 88px; height: 118px; }
  .books__title { font-size: 1rem; }
  .books__price-value { font-size: 1.1rem; }
}
</style>
