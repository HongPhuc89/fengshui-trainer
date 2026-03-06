<script setup>
/**
 * FlashcardSession — feature-12 (modern UI: V1 + V1.5)
 * Dùng trong 2 context: embedded tab (VideoPlayerView), embedded drawer (TrainingDrawer).
 *
 * Props:
 *   activityId  — public_id của TrainingActivity (FLASHCARD type)
 *   embedded    — true: ẩn header, height 100% container, single-column always
 *                 false: split-panel khi viewport >= 768px (TrainingView standalone)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { trainingService } from '../../services/training.service'

const props = defineProps({
  activityId: { type: String, required: true },
  embedded:   { type: Boolean, default: false },
})

// ── State ─────────────────────────────────────────────────────────────────────
const flashcards  = ref([])
const total       = ref(0)
const index       = ref(0)
const isFlipped   = ref(false)
const loading     = ref(false)
const error       = ref(null)
const sessionDone = ref(false)
const windowWidth = ref(window.innerWidth)

const currentCard    = computed(() => flashcards.value[index.value] ?? null)
const progressPercent = computed(() =>
  flashcards.value.length > 0
    ? Math.round(((index.value + 1) / flashcards.value.length) * 100)
    : 0
)

// Split-panel: chỉ bật khi không embedded và viewport đủ rộng
const isSplitPanel = computed(() => !props.embedded && windowWidth.value >= 768)

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadCards() {
  loading.value = true
  error.value   = null
  sessionDone.value = false
  index.value   = 0
  isFlipped.value = false
  try {
    const res = await trainingService.getFlashcards(props.activityId, 20)
    flashcards.value = res.data.flashcards
    total.value      = res.data.total
  } catch {
    error.value = 'Không thể tải flashcard.'
  } finally {
    loading.value = false
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function prev() {
  if (index.value > 0) {
    index.value--
    isFlipped.value = false
  }
}

function next() {
  isFlipped.value = false
  if (index.value < flashcards.value.length - 1) {
    index.value++
  } else {
    sessionDone.value = true
  }
}

function jumpTo(i) {
  if (i >= 0 && i < flashcards.value.length) {
    index.value = i
    isFlipped.value = false
  }
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function handleKeydown(e) {
  // Guard: không xử lý khi focus vào form element
  const tag = document.activeElement?.tagName?.toLowerCase()
  if (['input', 'textarea', 'select'].includes(tag)) return
  if (document.activeElement?.isContentEditable) return

  // Guard: không xử lý khi session chưa active
  if (loading.value || error.value || sessionDone.value || !currentCard.value) return

  switch (e.key) {
    case ' ':
    case 'Spacebar': // IE/Edge compat
      e.preventDefault() // tránh page scroll
      isFlipped.value = !isFlipped.value
      break
    case 'ArrowRight':
      e.preventDefault()
      next()
      break
    case 'ArrowLeft':
      e.preventDefault()
      prev()
      break
  }
}

// ── Swipe ─────────────────────────────────────────────────────────────────────
let touchStartX = 0
let touchStartY = 0

function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e) {
  const deltaX = e.changedTouches[0].clientX - touchStartX
  const deltaY = e.changedTouches[0].clientY - touchStartY
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)

  // Swipe UP to flip: deltaY âm (ngón tay đi lên), đủ threshold, chủ yếu dọc
  if (deltaY < 0 && absY >= 60 && absY > absX) {
    if (!sessionDone.value && currentCard.value) {
      isFlipped.value = !isFlipped.value
    }
    return // consumed — không check horizontal
  }

  // Horizontal swipe: điều hướng card
  if (absX < 50) return
  if (deltaX < 0) next()
  else prev()
}

// ── Window resize ─────────────────────────────────────────────────────────────
function onResize() {
  windowWidth.value = window.innerWidth
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  loadCards()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="fc" :class="{ 'fc--embedded': embedded }">
    <!-- Loading -->
    <div v-if="loading" class="fc__skeletons">
      <div v-for="n in 3" :key="n" class="fc__skeleton"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="fc__error">
      {{ error }}
      <button class="fc__retry-btn" @click="loadCards">Thử lại</button>
    </div>

    <!-- Empty -->
    <div v-else-if="total === 0" class="fc__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".3">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
      <p>Chưa có flashcard nào.</p>
    </div>

    <!-- Session complete -->
    <div v-else-if="sessionDone" class="fc__done">
      <div class="fc__done-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2.5" width="48" height="48">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      </div>
      <h3 class="fc__done-title">Đã xem xong {{ flashcards.length }} thẻ</h3>
      <button class="fc__action-btn fc__action-btn--primary" @click="loadCards">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="16 3 21 3 21 8"/>
          <line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/>
          <line x1="15" y1="15" x2="21" y2="21"/>
        </svg>
        Lấy bộ mới ngẫu nhiên
      </button>
    </div>

    <!-- Card session -->
    <template v-else-if="currentCard">
      <div :class="isSplitPanel ? 'fc__split' : 'fc__single'">

        <!-- Left column: card area -->
        <div class="fc__col-main">
          <!-- Progress bar -->
          <div class="fc__progress-wrap">
            <div class="fc__progress-bar">
              <div class="fc__progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <span class="fc__progress-label">{{ index + 1 }} / {{ flashcards.length }}</span>
          </div>

          <!-- Card -->
          <div class="fc__wrap" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
            <div class="fc__card" :class="{ 'fc__card--flipped': isFlipped }" @click="isFlipped = !isFlipped">
              <div class="fc__face fc__face--front">
                <div v-if="currentCard.category" class="fc__category">{{ currentCard.category }}</div>
                <p class="fc__text">{{ currentCard.front }}</p>
              </div>
              <div class="fc__face fc__face--back">
                <div v-if="currentCard.category" class="fc__category">{{ currentCard.category }}</div>
                <p class="fc__text">{{ currentCard.back }}</p>
              </div>
            </div>
          </div>

          <p v-if="!isFlipped" class="fc__hint">
            <template v-if="isSplitPanel">Nhấn Space hoặc click để lật</template>
            <template v-else>Chạm để lật thẻ</template>
          </p>

          <!-- Nav -->
          <div class="fc__nav">
            <button class="fc__nav-btn" :disabled="index === 0" @click="prev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Trước
            </button>
            <span class="fc__nav-progress">{{ index + 1 }} / {{ flashcards.length }}</span>
            <button class="fc__nav-btn" @click="next">
              Sau
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <!-- Keyboard hint (desktop split-panel only) -->
          <p v-if="isSplitPanel" class="fc__kb-hint">
            Phím tắt: ← → di chuyển &nbsp;|&nbsp; Space lật thẻ
          </p>
        </div>

        <!-- Right column: card list (split-panel only) -->
        <div v-if="isSplitPanel" class="fc__col-list">
          <div class="fc__list-header">Danh sách thẻ</div>
          <ul class="fc__list">
            <li
              v-for="(card, i) in flashcards"
              :key="card.public_id ?? i"
              class="fc__list-item"
              :class="{
                'fc__list-item--active': i === index,
                'fc__list-item--seen': i < index,
              }"
              @click="jumpTo(i)"
            >
              <span class="fc__list-num">{{ i + 1 }}</span>
              <span v-if="card.category" class="fc__list-badge">{{ card.category }}</span>
            </li>
          </ul>
        </div>

      </div>
    </template>
  </div>
</template>

<style scoped>
.fc {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 320px;
  position: relative;
}
.fc--embedded { min-height: 0; height: 100%; }

/* ── Layout: single vs split ─────────────────────────────────────────────── */
.fc__single {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.fc__split {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: var(--space-lg);
  align-items: start;
}

.fc__col-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 0;
}

/* ── Progress bar ────────────────────────────────────────────────────────── */
.fc__progress-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.fc__progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}
.fc__progress-fill {
  height: 100%;
  background: var(--accent-gold);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.fc__progress-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  min-width: 36px;
  text-align: right;
}

/* ── Card ────────────────────────────────────────────────────────────────── */
.fc__wrap { perspective: 1000px; }

.fc__card {
  width: 100%;
  min-height: 180px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.4s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

/* Increase card height in split-panel mode */
.fc__split .fc__card {
  min-height: 280px;
}

.fc__card--flipped {
  transform: rotateY(180deg) !important;
}

/* Hover lift — desktop only (pointer devices) */
@media (hover: hover) {
  .fc__card:not(.fc__card--flipped):hover {
    transform: translateY(-4px) rotateY(0deg);
    box-shadow: var(--shadow-card-hover);
  }
}

.fc__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

/* Back face: gold gradient tint + left accent border to signal "answer side" */
.fc__face--back {
  transform: rotateY(180deg);
  background: linear-gradient(
    135deg,
    rgba(214, 158, 46, 0.06) 0%,
    var(--bg-card) 60%
  );
  border-left: 2px solid var(--accent-gold);
}

.fc__category {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--accent-gold);
  text-transform: uppercase;
  align-self: flex-start;
}

.fc__text {
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  color: var(--text-primary);
  line-height: 1.7;
  text-align: center;
  white-space: pre-line;
  font-family: var(--font-cjk);
}

/* ── Hint & keyboard hint ────────────────────────────────────────────────── */
.fc__hint {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
}

.fc__kb-hint {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  padding-top: var(--space-xs);
  letter-spacing: 0.02em;
}

/* ── Navigation ──────────────────────────────────────────────────────────── */
.fc__nav { display: flex; align-items: center; justify-content: space-between; }
.fc__nav-btn { display: flex; align-items: center; gap: 5px; background: var(--bg-card); border-radius: var(--radius-md); padding: 8px 14px; font-size: 0.84rem; font-weight: 600; color: var(--text-primary); transition: background 0.15s; }
.fc__nav-btn:hover:not(:disabled) { background: rgba(74,44,39,0.9); }
.fc__nav-btn:disabled { opacity: 0.3; cursor: default; }
.fc__nav-progress { font-size: 0.78rem; color: rgba(255,255,255,0.4); }

/* ── Card list (V1.5 split-panel right column) ───────────────────────────── */
.fc__col-list {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.fc__list-header {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.fc__list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  padding: var(--space-xs) 0;
}

.fc__list-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 7px var(--space-md);
  cursor: pointer;
  transition: background 0.12s;
  border-left: 2px solid transparent;
}
.fc__list-item:hover { background: rgba(255, 255, 255, 0.04); }
.fc__list-item--active {
  background: rgba(214, 158, 46, 0.08);
  border-left-color: var(--accent-gold);
}
.fc__list-item--seen { opacity: 0.5; }
.fc__list-item--active.fc__list-item--seen { opacity: 1; }

.fc__list-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  min-width: 24px;
  text-align: right;
}
.fc__list-item--active .fc__list-num { color: var(--accent-gold); }

.fc__list-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--accent-gold);
  background: rgba(214, 158, 46, 0.12);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Done screen ─────────────────────────────────────────────────────────── */
.fc__done { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-xl) 0; text-align: center; }
.fc__done-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(214, 158, 46, 0.1);
  border-radius: 50%;
}
.fc__done-title { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
.fc__action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  height: 44px;
  padding: 0 var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--bg-card);
  color: var(--text-primary);
}
.fc__action-btn--primary { background: var(--accent-gold); color: #2E1A0F; }

/* ── States: empty / error / loading ─────────────────────────────────────── */
.fc__empty, .fc__error { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); padding: var(--space-xl) 0; color: rgba(255,255,255,0.35); font-size: 0.85rem; text-align: center; }
.fc__retry-btn { margin-top: 4px; background: var(--bg-card); border-radius: var(--radius-sm); padding: 6px 14px; font-size: 0.8rem; color: var(--accent-gold); }

.fc__skeletons { display: flex; flex-direction: column; gap: var(--space-sm); }
.fc__skeleton { height: 60px; background: rgba(255,255,255,0.07); border-radius: var(--radius-md); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
