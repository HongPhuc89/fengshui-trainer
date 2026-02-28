<script setup>
/**
 * FlashcardSession — §8.6
 * Dùng trong 3 context: embedded tab (VideoPlayerView), embedded drawer (TrainingDrawer),
 * và full-page (TrainingView).
 *
 * Props:
 *   activityId  — public_id của TrainingActivity (FLASHCARD type)
 *   embedded    — true: ẩn header nav, height 100% container, emit @complete khi xong
 *                 false: hiện header nav, min-h-screen, navigate sang route khi xong
 */
import { ref, computed, onMounted } from 'vue'
import { trainingService } from '../../services/training.service'
import { examsService } from '../../services/exams.service'

const props = defineProps({
  activityId: { type: String, required: true },
  embedded:   { type: Boolean, default: false },
})

const emit = defineEmits(['due-count', 'go-quiz', 'complete'])

// ── State ─────────────────────────────────────────────────────────────────────
const data           = ref({ count: 0, total: 0, due_count: 0, flashcards: [] })
const index          = ref(0)
const isFlipped      = ref(false)
const loading        = ref(false)
const error          = ref(null)
const sessionRatings = ref({})    // { cardId: 'hard'|'ok'|'easy' }
const sessionDone    = ref(false)
const confirmReshuffle = ref(false)

const QUALITY = { hard: 1, ok: 3, easy: 5 }

const currentCard = computed(() => data.value.flashcards[index.value] ?? null)
const progress    = computed(() => `${index.value + 1} / ${data.value.count}`)

const sessionSummary = computed(() => {
  const vals = Object.values(sessionRatings.value)
  return {
    hard: vals.filter(v => v === 'hard').length,
    ok:   vals.filter(v => v === 'ok').length,
    easy: vals.filter(v => v === 'easy').length,
  }
})

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadCards() {
  loading.value = true
  error.value = null
  try {
    const res = await trainingService.getFlashcards(props.activityId)
    data.value = res.data
    emit('due-count', res.data.due_count)
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
  if (index.value < data.value.count - 1) {
    index.value++
  } else {
    sessionDone.value = true
    if (props.embedded) emit('complete')
  }
}

async function rate(label) {
  const card = currentCard.value
  if (!card) return
  sessionRatings.value[card.public_id] = label
  try {
    await examsService.reviewFlashcard(card.public_id, QUALITY[label])
  } catch {
    // silently ignore SM-2 errors
  }
  next()
}

function skip() { next() }

// ── Reshuffle ─────────────────────────────────────────────────────────────────
function requestReshuffle() {
  if (index.value > 0 && !sessionDone.value) {
    confirmReshuffle.value = true
  } else {
    doReshuffle()
  }
}

async function doReshuffle() {
  confirmReshuffle.value = false
  sessionDone.value = false
  index.value = 0
  isFlipped.value = false
  sessionRatings.value = {}
  await loadCards()
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
  <!-- embedded: height 100% container; full-page: min-h-screen via class -->
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
    <div v-else-if="data.total === 0" class="fc__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".3">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
      <p>Chưa có flashcard nào.</p>
    </div>

    <!-- Session complete -->
    <div v-else-if="sessionDone" class="fc__done">
      <div class="fc__done-icon">✅</div>
      <h3 class="fc__done-title">Phiên học hoàn thành!</h3>
      <p class="fc__done-sub">{{ data.count }} thẻ đã xem</p>
      <div class="fc__done-stats">
        <span>😓 Khó: {{ sessionSummary.hard }}</span>
        <span>😐 Ổn: {{ sessionSummary.ok }}</span>
        <span>😊 Dễ: {{ sessionSummary.easy }}</span>
      </div>
      <div class="fc__done-actions">
        <button class="fc__action-btn" @click="doReshuffle">🔀 Xáo bài mới</button>
        <button class="fc__action-btn fc__action-btn--primary" @click="emit('go-quiz')">
          📝 Ôn luyện ngay →
        </button>
      </div>
    </div>

    <!-- Card session -->
    <template v-else-if="currentCard">
      <!-- Header — chỉ hiện khi không embedded -->
      <div v-if="!embedded" class="fc__header">
        <div class="fc__pool-info">
          🃏 Kho {{ data.total }} thẻ
          <span v-if="data.due_count > 0" class="fc__due-badge">{{ data.due_count }} đến hạn</span>
        </div>
        <button class="fc__reshuffle-btn" @click="requestReshuffle">🔀 Xáo bài</button>
      </div>

      <!-- Card -->
      <div class="fc__wrap" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <div class="fc__card" :class="{ 'fc__card--flipped': isFlipped }" @click="isFlipped = !isFlipped">
          <div class="fc__face fc__face--front">
            <div v-if="currentCard.category" class="fc__category">{{ currentCard.category }}</div>
            <p class="fc__text">{{ currentCard.front }}</p>
            <div class="fc__dots">
              <span
                v-for="(_, i) in data.flashcards"
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

      <!-- SM-2 rating -->
      <div v-if="isFlipped" class="fc__rating">
        <p class="fc__rating-label">Bạn nhớ tốt không?</p>
        <div class="fc__rating-btns">
          <button class="fc__rating-btn fc__rating-btn--hard" @click="rate('hard')">😓 Khó</button>
          <button class="fc__rating-btn fc__rating-btn--ok"   @click="rate('ok')">😐 Ổn</button>
          <button class="fc__rating-btn fc__rating-btn--easy" @click="rate('easy')">😊 Dễ</button>
        </div>
        <button class="fc__skip-btn" @click="skip">→ Bỏ qua</button>
      </div>

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

    <!-- Reshuffle confirm dialog -->
    <div v-if="confirmReshuffle" class="fc__overlay" @click.self="confirmReshuffle = false">
      <div class="fc__dialog">
        <p class="fc__dialog-msg">Bạn đang ở thẻ {{ index + 1 }}/{{ data.count }}.<br>Xáo bài sẽ đặt lại phiên học hiện tại.</p>
        <div class="fc__dialog-btns">
          <button class="fc__dialog-btn" @click="confirmReshuffle = false">Huỷ</button>
          <button class="fc__dialog-btn fc__dialog-btn--confirm" @click="doReshuffle">Xáo bài</button>
        </div>
      </div>
    </div>
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

.fc__header { display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; color: rgba(255,255,255,0.5); }
.fc__pool-info { display: flex; align-items: center; gap: 6px; }
.fc__due-badge { background: rgba(193,49,35,0.2); color: #ef9a9a; border-radius: 10px; padding: 2px 7px; font-size: 0.7rem; font-weight: 700; }
.fc__reshuffle-btn { background: none; color: rgba(255,255,255,0.45); font-size: 0.78rem; padding: 4px 8px; border-radius: var(--radius-sm); transition: background 0.15s; }
.fc__reshuffle-btn:hover { background: rgba(255,255,255,0.07); color: var(--accent-gold); }

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

.fc__rating { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); }
.fc__rating-label { font-size: 0.82rem; color: rgba(255,255,255,0.55); }
.fc__rating-btns { display: flex; gap: var(--space-sm); width: 100%; }
.fc__rating-btn { flex: 1; height: 44px; border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 700; transition: opacity 0.15s; }
.fc__rating-btn:hover { opacity: 0.8; }
.fc__rating-btn--hard { background: rgba(193,49,35,0.25); color: #ef9a9a; }
.fc__rating-btn--ok   { background: rgba(255,193,7,0.18); color: #ffd54f; }
.fc__rating-btn--easy { background: rgba(76,175,80,0.22); color: #a5d6a7; }
.fc__skip-btn { background: none; color: rgba(255,255,255,0.3); font-size: 0.75rem; padding: 4px 10px; }
.fc__skip-btn:hover { color: rgba(255,255,255,0.6); }

.fc__nav { display: flex; align-items: center; justify-content: space-between; }
.fc__nav-btn { display: flex; align-items: center; gap: 5px; background: var(--bg-card); border-radius: var(--radius-md); padding: 8px 14px; font-size: 0.84rem; font-weight: 600; color: var(--text-primary); transition: background 0.15s; }
.fc__nav-btn:hover:not(:disabled) { background: rgba(74,44,39,0.9); }
.fc__nav-btn:disabled { opacity: 0.3; cursor: default; }
.fc__nav-progress { font-size: 0.78rem; color: rgba(255,255,255,0.4); }

.fc__done { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-xl) 0; text-align: center; }
.fc__done-icon { font-size: 2.5rem; }
.fc__done-title { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
.fc__done-sub { font-size: 0.82rem; color: rgba(255,255,255,0.45); margin-top: -8px; }
.fc__done-stats { display: flex; gap: var(--space-md); font-size: 0.85rem; color: rgba(255,255,255,0.6); }
.fc__done-actions { display: flex; gap: var(--space-sm); width: 100%; }
.fc__action-btn { flex: 1; height: 44px; background: var(--bg-card); border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
.fc__action-btn--primary { background: var(--accent-gold); color: #2E1A0F; }

.fc__empty, .fc__error { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); padding: var(--space-xl) 0; color: rgba(255,255,255,0.35); font-size: 0.85rem; text-align: center; }
.fc__retry-btn { margin-top: 4px; background: var(--bg-card); border-radius: var(--radius-sm); padding: 6px 14px; font-size: 0.8rem; color: var(--accent-gold); }

.fc__skeletons { display: flex; flex-direction: column; gap: var(--space-sm); }
.fc__skeleton { height: 60px; background: rgba(255,255,255,0.07); border-radius: var(--radius-md); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

.fc__overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
.fc__dialog { background: var(--bg-card); border-radius: var(--radius-md); padding: var(--space-lg, 24px) var(--space-md); max-width: 320px; width: 100%; }
.fc__dialog-msg { font-size: 0.88rem; color: rgba(255,255,255,0.75); line-height: 1.6; text-align: center; margin-bottom: var(--space-md); }
.fc__dialog-btns { display: flex; gap: var(--space-sm); }
.fc__dialog-btn { flex: 1; height: 42px; border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 700; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
.fc__dialog-btn--confirm { background: var(--accent-gold); color: #2E1A0F; }
</style>
