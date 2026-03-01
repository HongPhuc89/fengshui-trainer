<script setup>
/**
 * FlashcardSession — feature-10 (simplified, no SM-2)
 * Dùng trong 2 context: embedded tab (VideoPlayerView), embedded drawer (TrainingDrawer).
 *
 * Props:
 *   activityId  — public_id của TrainingActivity (FLASHCARD type)
 *   embedded    — true: ẩn header, height 100% container
 *                 false: min-h-screen (dùng trong drawer full-height)
 */
import { ref, computed, onMounted } from 'vue'
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

const currentCard = computed(() => flashcards.value[index.value] ?? null)
const progress    = computed(() => `${index.value + 1} / ${flashcards.value.length}`)

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

onMounted(loadCards)

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

// ── Swipe ─────────────────────────────────────────────────────────────────────
let touchStartX = 0
function onTouchStart(e) { touchStartX = e.touches[0].clientX }
function onTouchEnd(e) {
  const delta = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(delta) < 50) return
  if (delta < 0) next()
  else prev()
}
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
      <div class="fc__done-icon">✅</div>
      <h3 class="fc__done-title">Đã xem xong {{ flashcards.length }} thẻ</h3>
      <button class="fc__action-btn fc__action-btn--primary" @click="loadCards">
        🔀 Lấy bộ mới ngẫu nhiên
      </button>
    </div>

    <!-- Card session -->
    <template v-else-if="currentCard">
      <!-- Card -->
      <div class="fc__wrap" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <div class="fc__card" :class="{ 'fc__card--flipped': isFlipped }" @click="isFlipped = !isFlipped">
          <div class="fc__face fc__face--front">
            <div v-if="currentCard.category" class="fc__category">{{ currentCard.category }}</div>
            <p class="fc__text">{{ currentCard.front }}</p>
            <div class="fc__dots">
              <span
                v-for="(_, i) in flashcards"
                :key="i"
                class="fc__dot"
                :class="{ 'fc__dot--active': i === index }"
              ></span>
            </div>
          </div>
          <div class="fc__face fc__face--back">
            <div v-if="currentCard.category" class="fc__category">{{ currentCard.category }}</div>
            <p class="fc__text">{{ currentCard.back }}</p>
          </div>
        </div>
      </div>

      <p v-if="!isFlipped" class="fc__hint">Chạm để lật thẻ</p>

      <!-- Nav -->
      <div class="fc__nav">
        <button class="fc__nav-btn" :disabled="index === 0" @click="prev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Trước
        </button>
        <span class="fc__nav-progress">{{ progress }}</span>
        <button class="fc__nav-btn" @click="next">
          Sau
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
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

.fc__wrap { perspective: 1000px; }
.fc__card { width: 100%; min-height: 180px; position: relative; transform-style: preserve-3d; transition: transform 0.4s ease; cursor: pointer; }
.fc__card--flipped { transform: rotateY(180deg); }
.fc__face { position: absolute; inset: 0; backface-visibility: hidden; background: var(--bg-card); border-radius: var(--radius-md); padding: var(--space-md); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-sm); }
.fc__face--back { transform: rotateY(180deg); }

.fc__category { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; color: var(--accent-gold); text-transform: uppercase; align-self: flex-start; }
.fc__text { font-size: 0.95rem; color: var(--text-primary); line-height: 1.6; text-align: center; white-space: pre-line; }
.fc__dots { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; margin-top: auto; padding-top: var(--space-sm); }
.fc__dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.fc__dot--active { background: var(--accent-gold); }

.fc__hint { text-align: center; font-size: 0.75rem; color: rgba(255,255,255,0.3); }

.fc__nav { display: flex; align-items: center; justify-content: space-between; }
.fc__nav-btn { display: flex; align-items: center; gap: 5px; background: var(--bg-card); border-radius: var(--radius-md); padding: 8px 14px; font-size: 0.84rem; font-weight: 600; color: var(--text-primary); transition: background 0.15s; }
.fc__nav-btn:hover:not(:disabled) { background: rgba(74,44,39,0.9); }
.fc__nav-btn:disabled { opacity: 0.3; cursor: default; }
.fc__nav-progress { font-size: 0.78rem; color: rgba(255,255,255,0.4); }

.fc__done { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-xl) 0; text-align: center; }
.fc__done-icon { font-size: 2.5rem; }
.fc__done-title { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
.fc__action-btn { height: 44px; padding: 0 var(--space-md); border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 700; background: var(--bg-card); color: var(--text-primary); }
.fc__action-btn--primary { background: var(--accent-gold); color: #2E1A0F; }

.fc__empty, .fc__error { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); padding: var(--space-xl) 0; color: rgba(255,255,255,0.35); font-size: 0.85rem; text-align: center; }
.fc__retry-btn { margin-top: 4px; background: var(--bg-card); border-radius: var(--radius-sm); padding: 6px 14px; font-size: 0.8rem; color: var(--accent-gold); }

.fc__skeletons { display: flex; flex-direction: column; gap: var(--space-sm); }
.fc__skeleton { height: 60px; background: rgba(255,255,255,0.07); border-radius: var(--radius-md); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
