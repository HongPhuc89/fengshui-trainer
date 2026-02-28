<script setup>
/**
 * TrainingDrawer — §8.3
 * Dùng trong BookReaderView. Lazy load khi lần đầu mở.
 * States: loading | error (403/network) | inactive | mode_select | session
 */
import { ref, watch } from 'vue'
import { trainingService } from '../../services/training.service'
import TrainingModeSelector from './TrainingModeSelector.vue'
import FlashcardSession from './FlashcardSession.vue'
import QuizSession from './QuizSession.vue'

const ACTIVITY_COMPONENTS = {
  FLASHCARD: FlashcardSession,
  QUIZ:      QuizSession,
}

const props = defineProps({
  bookSlug:     { type: String, required: true },
  chapterOrder: { type: Number, required: true },
  open:         { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const trainingSet    = ref(null)
const loading        = ref(false)
const error          = ref(null)
const errorType      = ref(null)   // 'forbidden' | 'network'
const uiState        = ref('mode_select')  // mode_select | session
const selectedActivity = ref(null)
const loaded         = ref(false)

// Lazy load: chỉ fetch khi drawer mở lần đầu
watch(() => props.open, async (isOpen) => {
  if (isOpen && !loaded.value) {
    await fetchTraining()
  }
})

async function fetchTraining() {
  loading.value = true
  error.value = null
  errorType.value = null
  try {
    const res = await trainingService.getTrainingByChapter(props.bookSlug, props.chapterOrder)
    trainingSet.value = res.data
    loaded.value = true
  } catch (e) {
    if (e.response?.status === 403) {
      error.value = 'Bạn không có quyền luyện tập nội dung này.'
      errorType.value = 'forbidden'
    } else {
      error.value = 'Lỗi kết nối. Vui lòng thử lại.'
      errorType.value = 'network'
    }
  } finally {
    loading.value = false
  }
}

function selectActivity(activity) {
  selectedActivity.value = activity
  uiState.value = 'session'
}

function backToModeSelect() {
  selectedActivity.value = null
  uiState.value = 'mode_select'
}

const hasActiveActivities = () =>
  (trainingSet.value?.activities ?? []).some(a => a.is_active)
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-backdrop" @click.self="emit('close')">
        <div class="drawer">
          <!-- Header -->
          <div class="drawer__header">
            <div class="drawer__title-row">
              <button v-if="uiState === 'session'" class="drawer__back-btn" @click="backToModeSelect">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <span class="drawer__title">
                {{ uiState === 'session' && selectedActivity ? selectedActivity.title : `Luyện tập: ${trainingSet?.title ?? ''}` }}
              </span>
            </div>
            <button class="drawer__close-btn" @click="emit('close')">✕</button>
          </div>

          <!-- Body -->
          <div class="drawer__body">
            <!-- Loading -->
            <div v-if="loading" class="drawer__skeletons">
              <div v-for="n in 2" :key="n" class="drawer__skeleton"></div>
            </div>

            <!-- Error states (§T9) -->
            <div v-else-if="error" class="drawer__state">
              <p class="drawer__state-msg" :class="{ 'drawer__state-msg--error': errorType !== 'forbidden' }">
                {{ error }}
              </p>
              <button v-if="errorType === 'network'" class="drawer__cta-btn" @click="fetchTraining">
                Thử lại
              </button>
              <button v-else class="drawer__cta-btn" @click="emit('close')">
                ← Tiếp tục đọc
              </button>
            </div>

            <!-- Inactive (all activities disabled) -->
            <div v-else-if="trainingSet && !hasActiveActivities()" class="drawer__state">
              <p class="drawer__state-msg">Nội dung luyện tập đang được cập nhật.</p>
              <button class="drawer__cta-btn" @click="emit('close')">← Tiếp tục đọc</button>
            </div>

            <!-- Mode select -->
            <div v-else-if="trainingSet && uiState === 'mode_select'">
              <TrainingModeSelector
                :activities="trainingSet.activities"
                @select="selectActivity"
              />
            </div>

            <!-- Session -->
            <div v-else-if="uiState === 'session' && selectedActivity" class="drawer__session">
              <component
                :is="ACTIVITY_COMPONENTS[selectedActivity.activity_type]"
                :activity-id="selectedActivity.id"
                :embedded="true"
                @complete="backToModeSelect"
                @go-quiz="() => {
                  const quiz = trainingSet?.activities?.find(a => a.activity_type === 'QUIZ' && a.is_active)
                  if (quiz) selectActivity(quiz)
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.drawer {
  width: 100%;
  max-height: 80vh;
  background: var(--bg-surface, #1e1108);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.drawer__title-row { display: flex; align-items: center; gap: var(--space-sm); min-width: 0; }
.drawer__title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer__back-btn { background: none; color: rgba(255,255,255,0.5); padding: 4px; display: flex; }
.drawer__back-btn:hover { color: var(--text-primary); }
.drawer__close-btn { background: none; color: rgba(255,255,255,0.4); font-size: 1rem; padding: 4px 8px; }
.drawer__close-btn:hover { color: var(--text-primary); }

.drawer__body { flex: 1; overflow-y: auto; padding: var(--space-md); }

.drawer__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
  text-align: center;
}
.drawer__state-msg { font-size: 0.85rem; color: rgba(255,255,255,0.5); }
.drawer__state-msg--error { color: #ef9a9a; }
.drawer__cta-btn {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 10px var(--space-lg, 24px);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-gold);
}

.drawer__skeletons { display: flex; flex-direction: column; gap: var(--space-sm); }
.drawer__skeleton { height: 64px; background: rgba(255,255,255,0.07); border-radius: var(--radius-md); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

.drawer__session { height: 100%; }

/* Slide-up transition */
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s, transform 0.25s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; transform: translateY(100%); }
.drawer-enter-to, .drawer-leave-from { opacity: 1; transform: translateY(0); }
</style>
