<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { trainingService } from '../services/training.service'
import TrainingModeSelector from '../components/training/TrainingModeSelector.vue'
import FlashcardSession from '../components/training/FlashcardSession.vue'
import QuizSession from '../components/training/QuizSession.vue'

const route  = useRoute()
const router = useRouter()

// ── Detect source from route ──────────────────────────────
const isLesson  = computed(() => route.name === 'TrainingLesson')
const sourceTitle = ref('')

// ── State ─────────────────────────────────────────────────
const activities     = ref([])
const trainingTitle  = ref('')
const loading        = ref(true)
const error          = ref(null)
const selectedActivity = ref(null)

// ── Load training set ─────────────────────────────────────
onMounted(async () => {
  try {
    let res
    if (isLesson.value) {
      res = await trainingService.getTrainingByLesson(route.params.lessonSlug)
    } else {
      res = await trainingService.getTrainingByChapter(
        route.params.bookSlug,
        route.params.chapterOrder,
      )
    }
    const data = res.data
    trainingTitle.value  = data.title ?? 'Luyện tập'
    sourceTitle.value    = data.source_title ?? ''
    activities.value     = data.activities ?? []

    // Auto-select if only one active activity
    const active = activities.value.filter(a => a.is_active)
    if (active.length === 1) {
      selectedActivity.value = active[0]
    }
  } catch (e) {
    error.value = e?.response?.status === 404
      ? 'Chưa có nội dung luyện tập cho bài này.'
      : 'Không thể tải nội dung luyện tập.'
  } finally {
    loading.value = false
  }
})

function selectActivity(activity) {
  selectedActivity.value = activity
}

function backToSelector() {
  selectedActivity.value = null
}
</script>

<template>
  <div class="tv">
    <!-- ── Header ──────────────────────────────────────────── -->
    <header class="tv__header">
      <button class="tv__back-btn" @click="selectedActivity ? backToSelector() : router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="tv__header-titles">
        <span class="tv__header-sub">{{ sourceTitle }}</span>
        <span class="tv__header-title">{{ selectedActivity ? selectedActivity.title : 'Luyện tập' }}</span>
      </div>
      <div style="width:38px"></div>
    </header>

    <!-- ── Body ───────────────────────────────────────────── -->
    <div class="tv__body">

      <!-- Loading -->
      <div v-if="loading" class="tv__state">
        <div class="tv__spinner"></div>
        <span>Đang tải...</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="tv__state tv__state--error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".4">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>{{ error }}</p>
        <button class="tv__btn-back" @click="router.back()">Quay lại</button>
      </div>

      <!-- Mode selector -->
      <div v-else-if="!selectedActivity" class="tv__selector-wrap">
        <TrainingModeSelector
          :activities="activities"
          :title="trainingTitle"
          @select="selectActivity"
        />
      </div>

      <!-- Flashcard session -->
      <FlashcardSession
        v-else-if="selectedActivity.activity_type === 'FLASHCARD'"
        :activity-id="selectedActivity.id"
        :embedded="false"
      />

      <!-- Quiz session -->
      <QuizSession
        v-else-if="selectedActivity.activity_type === 'QUIZ'"
        :activity-id="selectedActivity.id"
        :embedded="false"
        @complete="backToSelector"
      />

    </div>
  </div>
</template>

<style scoped>
.tv {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg-main);
}

/* ── Header ────────────────────────────────────────────── */
.tv__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  height: 56px;
  padding: 0 var(--space-md);
  background: var(--bg-main);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.tv__back-btn {
  background: none;
  color: var(--accent-gold);
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.tv__back-btn:hover { background: rgba(255,255,255,0.06); }

.tv__header-titles {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 0;
}

.tv__header-sub {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tv__header-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ── Body ──────────────────────────────────────────────── */
.tv__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── State (loading / error) ───────────────────────────── */
.tv__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
  padding: var(--space-xl);
}

.tv__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.12);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.tv__state--error { color: rgba(255,255,255,0.45); }

.tv__btn-back {
  background: var(--btn-primary);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
}

/* ── Selector wrap ─────────────────────────────────────── */
.tv__selector-wrap {
  padding: var(--space-lg) var(--space-md);
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
}
</style>
