<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { booksService } from '../services/books.service'
import { walletService } from '../services/wallet.service'
import { clearApiCache } from '../api/cache-storage'
import GemIcon from '../components/icons/GemIcon.vue'
import LockIcon from '../components/icons/LockIcon.vue'
import BookOpenIcon from '../components/icons/BookOpenIcon.vue'
import CheckIcon from '../components/icons/CheckIcon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const bookSlug = route.params.slug
const coverFailed = ref(false)

// ── State ─────────────────────────────────────────────────
const book = ref(null)
const balance = ref(0)
const loading = ref(true)
const error = ref(null)
const currentProgress = ref(null) // { chapter_order, current_page }

// Purchase modal
const showModal = ref(false)
const targetChapterOrder = ref(null)
const purchasing = ref(false)
const purchaseError = ref(null)

// ── Computed ──────────────────────────────────────────────
const isVip = computed(() => authStore.user?.user_type === 'VIP')

const coverStyle = computed(() => {
  if (!book.value) return ''
  const url = (book.value.small_cover && !coverFailed.value)
    ? book.value.small_cover
    : book.value.cover_image
  return url
    ? `background-image:url(${url})`
    : 'background:linear-gradient(135deg,#1a1a2e,#e94560)'
})

const isUnlocked = computed(() =>
  !!(book.value?.is_free || book.value?.has_purchased || isVip.value),
)

const price = computed(() => book.value?.price_lt ?? 0)

const canAfford = computed(() => balance.value >= price.value)

const balanceAfter = computed(() => balance.value - price.value)

const sortedChapters = computed(() =>
  [...(book.value?.chapters ?? [])].sort((a, b) => a.order - b.order),
)

const demoCount = computed(
  () => book.value?.chapters?.filter((c) => c.is_demo).length ?? 0,
)

// ── Load ──────────────────────────────────────────────────
onMounted(async () => {
  const [bookRes, walletRes] = await Promise.allSettled([
    booksService.getBookDetail(bookSlug),
    walletService.getBalance(),
  ])
  if (bookRes.status === 'fulfilled') {
    book.value = bookRes.value.data
  } else {
    error.value = 'Không thể tải thông tin sách.'
  }
  if (walletRes.status === 'fulfilled') {
    balance.value = walletRes.value.data?.balance ?? 0
  }
  loading.value = false

  // Only fetch reading progress if user has access (avoids 403 for unowned books)
  if (isUnlocked.value) {
    booksService.getBookProgress(bookSlug)
      .then(res => { currentProgress.value = res.data })
      .catch(() => {})
  }
})

// ── Chapter progress helpers ───────────────────────────────
function isCurrentChapter(chapter) {
  return isUnlocked.value
    && currentProgress.value
    && chapter.order === currentProgress.value.chapter_order
}

// ── Chapter access ────────────────────────────────────────
function canAccessChapter(chapter) {
  return isUnlocked.value || chapter.is_demo
}

function onChapterClick(chapter) {
  if (canAccessChapter(chapter)) {
    router.push({
      name: 'BookReader',
      params: { slug: bookSlug },
      query: { chapter: chapter.order },
    })
  } else {
    targetChapterOrder.value = chapter.order
    purchaseError.value = null
    showModal.value = true
  }
}

function onCtaClick() {
  if (isUnlocked.value) {
    router.push({ name: 'BookReader', params: { slug: bookSlug } })
  } else {
    targetChapterOrder.value = null
    purchaseError.value = null
    showModal.value = true
  }
}

// ── Purchase ──────────────────────────────────────────────
async function confirmPurchase() {
  if (!canAfford.value || purchasing.value) return
  purchasing.value = true
  purchaseError.value = null
  try {
    const res = await booksService.purchaseBook(book.value.public_id)
    // Case 1 — VIP user: update local state, use server balance
    book.value.has_purchased = true
    balance.value = res.data.balance
    // Invalidate book catalogue cache so is_purchased reflects correctly on next visit
    clearApiCache()
    showModal.value = false
    router.push({
      name: 'BookReader',
      params: { slug: bookSlug },
      query: { chapter: targetChapterOrder.value ?? 1 },
    })
  } catch (err) {
    const detail = err.response?.data?.detail
    if (detail === 'INSUFFICIENT_FUNDS') {
      // Sync balance from server (may have changed since modal opened)
      if (err.response?.data?.balance !== undefined) {
        balance.value = err.response.data.balance
      }
      purchaseError.value = 'insufficient'
    } else if (detail === 'You already own this book.') {
      // Race: already purchased from another tab/device — treat as success
      book.value.has_purchased = true
      showModal.value = false
      router.push({ name: 'BookReader', params: { slug: bookSlug } })
    } else {
      purchaseError.value = 'error'
    }
  } finally {
    purchasing.value = false
  }
}

function closeModal() {
  if (purchasing.value) return
  showModal.value = false
  purchaseError.value = null
}
</script>

<template>
  <div class="book-detail">
    <!-- ── Back nav ───────────────────────────────────────── -->
    <button class="book-detail__back" @click="router.push({ name: 'Books' })">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Danh sách sách
    </button>

    <!-- ── Loading skeleton ──────────────────────────────── -->
    <template v-if="loading">
      <div class="book-detail__hero book-detail__hero--skeleton">
        <div class="book-detail__cover book-detail__cover--skeleton"></div>
        <div class="book-detail__meta">
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-50" style="margin-top:8px"></div>
          <div class="skeleton-line w-40" style="margin-top:16px"></div>
        </div>
      </div>
      <div v-for="n in 4" :key="n" class="book-detail__chapter-row book-detail__chapter-row--skeleton">
        <div class="skeleton-line w-60"></div>
      </div>
    </template>

    <!-- ── Error ─────────────────────────────────────────── -->
    <div v-else-if="error" class="book-detail__error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{{ error }}</p>
      <button class="btn-ghost" @click="router.push({ name: 'Books' })">Quay lại</button>
    </div>

    <!-- ── Content ───────────────────────────────────────── -->
    <template v-else-if="book">
      <!-- Hero: cover + info -->
      <div class="book-detail__hero">
        <div class="book-detail__cover" :style="coverStyle">
          <img
            v-if="book.small_cover"
            :src="book.small_cover"
            style="display:none;position:absolute"
            @error="coverFailed = true"
          />
          <div v-if="!book.cover_image && !book.small_cover" class="book-detail__cover-initial">
            {{ book.title?.charAt(0) }}
          </div>
        </div>

        <div class="book-detail__meta">
          <div class="book-detail__badges">
            <span v-if="book.is_free" class="badge badge--free">Miễn phí</span>
            <span v-else-if="isVip" class="badge badge--vip">VIP</span>
            <span v-else-if="book.has_purchased" class="badge badge--owned">Đã mua</span>
            <span v-if="book.is_new_release" class="badge badge--new">Mới</span>
            <span v-if="book.category" class="badge badge--cat">{{ book.category.title }}</span>
          </div>

          <h1 class="book-detail__title">{{ book.title }}</h1>
          <p v-if="book.author" class="book-detail__author">{{ book.author }}</p>

          <div v-if="!book.is_free && !book.has_purchased && !isVip" class="book-detail__price">
            <GemIcon :size="14" />
            <span>{{ price.toLocaleString('vi-VN') }} Linh Thạch</span>
          </div>

          <p v-if="!isUnlocked && demoCount > 0" class="book-detail__demo-hint">
            {{ demoCount }} chapter đọc thử miễn phí
          </p>
        </div>
      </div>

      <!-- Description -->
      <p v-if="book.description" class="book-detail__desc">{{ book.description }}</p>

      <!-- CTA button — unlocked (free / purchased / VIP) -->
      <button v-if="isUnlocked" class="book-detail__cta" @click="onCtaClick">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" style="flex-shrink:0">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        {{ book.has_purchased ? 'Đọc tiếp' : 'Đọc ngay' }}
      </button>

      <!-- CTA button — locked (need to purchase) -->
      <button v-else class="book-detail__cta book-detail__cta--buy" :disabled="purchasing" @click="onCtaClick">
        <svg
          v-if="purchasing"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          width="16" height="16" style="flex-shrink:0;animation:spin 0.8s linear infinite"
        >
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          width="16" height="16" style="flex-shrink:0"
        >
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Mở khóa với {{ price.toLocaleString('vi-VN') }}
        <GemIcon :size="14" style="flex-shrink:0" />
      </button>

      <!-- Chapter list -->
      <div class="book-detail__chapters">
        <h2 class="book-detail__section-title">
          Nội dung · {{ sortedChapters.length }} chương
        </h2>

        <div
          v-for="chapter in sortedChapters"
          :key="chapter.order"
          class="book-detail__chapter-row"
          :class="{
            'book-detail__chapter-row--locked': !canAccessChapter(chapter),
            'book-detail__chapter-row--reading': isCurrentChapter(chapter),
          }"
          role="button"
          tabindex="0"
          @click="onChapterClick(chapter)"
          @keydown.enter="onChapterClick(chapter)"
        >
          <div class="book-detail__chapter-left">
            <span class="book-detail__chapter-num">{{ chapter.order }}</span>
            <span class="book-detail__chapter-title">{{ chapter.title }}</span>
            <span v-if="chapter.is_demo" class="badge badge--demo">Đọc thử</span>
            <!-- Reading progress badge: shows current page -->
            <span v-if="isCurrentChapter(chapter)" class="badge badge--reading">
              Trang {{ currentProgress.current_page }}
            </span>
          </div>

          <div class="book-detail__chapter-right">
            <!-- Locked -->
            <LockIcon
              v-if="!canAccessChapter(chapter)"
              :size="14"
              class="book-detail__chapter-lock"
            />
            <!-- Currently reading: open book icon -->
            <BookOpenIcon
              v-else-if="isCurrentChapter(chapter)"
              :size="14"
              class="book-detail__chapter-reading-icon"
            />
            <!-- Other unlocked chapters: checkmark -->
            <CheckIcon
              v-else-if="isUnlocked"
              :size="14"
              class="book-detail__chapter-check"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ── Purchase Modal ─────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card" role="dialog" aria-modal="true">
          <button class="modal-close" :disabled="purchasing" @click="closeModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <h3 class="modal-title">Mở khoá toàn bộ sách</h3>
          <p class="modal-book-title">{{ book?.title }}</p>

          <div class="modal-price-row">
            <span class="modal-label">Giá sách</span>
            <span class="modal-value modal-value--price">
              <GemIcon :size="13" />
              {{ price.toLocaleString('vi-VN') }} LT
            </span>
          </div>

          <div class="modal-price-row">
            <span class="modal-label">Số dư hiện tại</span>
            <span
              class="modal-value"
              :class="canAfford ? 'modal-value--ok' : 'modal-value--err'"
            >
              <GemIcon :size="13" />
              {{ balance.toLocaleString('vi-VN') }} LT
            </span>
          </div>

          <div v-if="canAfford" class="modal-price-row">
            <span class="modal-label">Sau khi mua còn</span>
            <span class="modal-value modal-value--muted">
              {{ balanceAfter.toLocaleString('vi-VN') }} LT
            </span>
          </div>

          <div v-if="purchaseError === 'insufficient'" class="modal-error">
            Số dư không đủ. Cần thêm {{ (price - balance).toLocaleString('vi-VN') }} LT.
          </div>
          <div v-else-if="purchaseError === 'error'" class="modal-error">
            Đã xảy ra lỗi. Vui lòng thử lại.
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button class="btn-ghost" :disabled="purchasing" @click="closeModal">
              Huỷ
            </button>

            <button
              v-if="canAfford && purchaseError !== 'insufficient'"
              class="btn-primary"
              :disabled="purchasing"
              @click="confirmPurchase"
            >
              <span v-if="purchasing">Đang xử lý…</span>
              <span v-else>Xác nhận mua</span>
            </button>

            <button
              v-else
              class="btn-primary"
              @click="router.push({ name: 'Store' }); showModal = false"
            >
              Nạp Linh Thạch →
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────── */
.book-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: calc(var(--space-lg) * 2);
}

/* ── Back nav ────────────────────────────────────────────── */
.book-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-secondary, rgba(255,255,255,.55));
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: var(--space-xs, 4px);
}
.book-detail__back:hover {
  color: var(--text-primary);
}

/* ── Hero ────────────────────────────────────────────────── */
.book-detail__hero {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
}
.book-detail__hero--skeleton {
  opacity: .5;
}
.book-detail__cover {
  width: 90px;
  height: 128px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.book-detail__cover--skeleton {
  background: var(--bg-card, #1e1e2e);
}
.book-detail__cover-initial {
  font-size: 2.2rem;
  font-weight: 700;
  color: rgba(255,255,255,.7);
  text-transform: uppercase;
}
.book-detail__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.book-detail__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.book-detail__title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.35;
}
.book-detail__author {
  font-size: 0.82rem;
  color: var(--text-secondary, rgba(255,255,255,.55));
  margin: 0;
}
.book-detail__price {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent-gold);
}
.book-detail__demo-hint {
  font-size: 0.78rem;
  color: var(--text-secondary, rgba(255,255,255,.5));
  margin: 0;
}

/* ── Badges ──────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: .02em;
}
.badge--free   { background: rgba(56,142,60,.25);  color: #81c784; }
.badge--vip    { background: rgba(197,165,81,.2);  color: var(--accent-gold); }
.badge--owned  { background: rgba(21,101,192,.2);  color: #64b5f6; }
.badge--new    { background: rgba(230,81,0,.25);   color: #ffb74d; }
.badge--cat    { background: rgba(255,255,255,.08); color: var(--text-secondary, rgba(255,255,255,.55)); }
.badge--demo   { background: rgba(56,142,60,.2);   color: #81c784; font-size: 0.65rem; }

/* ── Description ─────────────────────────────────────────── */
.book-detail__desc {
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(255,255,255,.65));
  line-height: 1.6;
  margin: 0;
}

/* ── CTA button ──────────────────────────────────────────── */
.book-detail__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  width: 100%;
  height: 50px;
  border-radius: var(--radius-md);
  border: none;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  background: var(--accent-gold);
  color: #1a0a00;
  transition: opacity .15s;
}
.book-detail__cta:hover:not(:disabled) { opacity: .88; }
.book-detail__cta--buy {
  background: var(--color-action);
  color: #fff;
}
.book-detail__cta:disabled { opacity: .6; cursor: not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Chapter list ────────────────────────────────────────── */
.book-detail__chapters {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.book-detail__section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(255,255,255,.5));
  text-transform: uppercase;
  letter-spacing: .06em;
  margin: 0 0 var(--space-sm);
}
.book-detail__chapter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 12px var(--space-md);
  border-radius: var(--radius-sm, 8px);
  background: var(--bg-card, rgba(255,255,255,.04));
  cursor: pointer;
  transition: background .15s;
}
.book-detail__chapter-row:hover {
  background: var(--bg-card-hover, rgba(255,255,255,.08));
}
.book-detail__chapter-row--locked {
  opacity: .75;
}
.book-detail__chapter-row--skeleton {
  height: 44px;
  opacity: .4;
}
.book-detail__chapter-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}
.book-detail__chapter-num {
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(255,255,255,.4));
  min-width: 20px;
  text-align: right;
}
.book-detail__chapter-title {
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.book-detail__chapter-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.book-detail__chapter-pages {
  font-size: 0.72rem;
  color: var(--text-secondary, rgba(255,255,255,.4));
}
.book-detail__chapter-lock  { color: rgba(255,255,255,.35); }
.book-detail__chapter-check { color: var(--accent-gold); }
.book-detail__chapter-reading-icon { color: #f59e0b; }

/* Highlight row currently being read */
.book-detail__chapter-row--reading {
  background: rgba(234, 179, 8, 0.08);
  border-left: 3px solid #f59e0b;
  padding-left: calc(var(--space-md) - 3px);
}
.book-detail__chapter-row--reading:hover {
  background: rgba(234, 179, 8, 0.14);
}

/* Badges */
.badge--reading {
  background: rgba(234, 179, 8, 0.15);
  color: #92400e;
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 8px;
}

/* ── Error ───────────────────────────────────────────────── */
.book-detail__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg) 0;
  color: var(--text-secondary, rgba(255,255,255,.5));
  text-align: center;
}

/* ── Skeleton ────────────────────────────────────────────── */
.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: rgba(255,255,255,.08);
  animation: shimmer 1.4s infinite;
}
.w-80 { width: 80%; }
.w-60 { width: 60%; }
.w-50 { width: 50%; }
.w-40 { width: 40%; }
@keyframes shimmer {
  0%,100% { opacity: .5; }
  50%      { opacity: 1; }
}

/* ── Buttons ─────────────────────────────────────────────── */
.btn-primary {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--accent-gold);
  color: #1a1400;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { opacity: .88; }

.btn-ghost {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255,255,255,.15);
  background: none;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color .15s;
}
.btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost:not(:disabled):hover { border-color: rgba(255,255,255,.3); }

/* ── Modal ───────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
  padding: 0 0 env(safe-area-inset-bottom, 0);
}
@media (min-width: 480px) {
  .modal-overlay { align-items: center; }
}
.modal-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: var(--bg-surface, #1e1e2e);
  border-radius: 20px 20px 0 0;
  padding: var(--space-lg) var(--space-md) calc(var(--space-lg) + env(safe-area-inset-bottom, 0));
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
@media (min-width: 480px) {
  .modal-card {
    border-radius: 16px;
    padding: var(--space-lg) var(--space-md);
  }
}
.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text-secondary, rgba(255,255,255,.5));
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.modal-close:disabled { opacity: .4; cursor: not-allowed; }
.modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.modal-book-title {
  font-size: 0.85rem;
  color: var(--accent-gold);
  margin: -8px 0 0;
  font-weight: 500;
}
.modal-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.modal-price-row:last-of-type { border-bottom: none; }
.modal-label {
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(255,255,255,.55));
}
.modal-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}
.modal-value--price  { color: var(--accent-gold); }
.modal-value--ok     { color: #81c784; }
.modal-value--err    { color: #ef9a9a; }
.modal-value--muted  { color: var(--text-secondary, rgba(255,255,255,.55)); }
.modal-error {
  font-size: 0.82rem;
  color: #ef9a9a;
  background: rgba(198,40,40,.15);
  border-radius: var(--radius-sm, 8px);
  padding: 10px 12px;
}
.modal-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: 4px;
}
</style>
