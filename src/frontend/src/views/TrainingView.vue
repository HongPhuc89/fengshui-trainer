<script setup>
/**
 * TrainingView — §8.4
 * Full-page training for VideoLesson and standalone PracticeModule.
 * BookChapter training uses TrainingDrawer (no route needed).
 *
 * Routes:
 *   /training/lesson/:lessonSlug   → fetch by lesson
 *   /training/module/:moduleSlug   → fetch by module (via standalone endpoint — TODO when module endpoint added)
 *
 * goBack():
 *   1. window.history.state.back (Vue Router 4 sets this in-app)
 *   2. Fallback via source_meta from API response (§8.4 Fix#4/#5)
 */
import { ref, computed, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { trainingService } from '../services/training.service'
import TrainingModeSelector from '../components/training/TrainingModeSelector.vue'
import FlashcardSession from '../components/training/FlashcardSession.vue'
import QuizSession from '../components/training/QuizSession.vue'

const ACTIVITY_COMPONENTS = {
  FLASHCARD: FlashcardSession,
  QUIZ:      QuizSession,
}

const route  = useRoute()
const router = useRouter()

const trainingSet    = ref(null)
const loading        = ref(false)
const error          = ref(null)
// view_state: LOADING | EMPTY_STATE | INACTIVE_STATE | MODE_SELECT | SESSION
const viewState      = ref('LOADING')
const selectedActivity = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    let res
    if (route.params.lessonSlug) {
      res = await trainingService.getTrainingByLesson(route.params.lessonSlug)
    } else {
      // STANDALONE: module — endpoint to be added in future
      // Fallback: use lesson endpoint pattern
      error.value = 'Chưa hỗ trợ module standalone.'
      viewState.value = 'EMPTY_STATE'
      return
    }
    trainingSet.value = res.data
    const hasActive = res.data.activities?.some(a => a.is_active)
    viewState.value = hasActive ? 'MODE_SELECT' : 'INACTIVE_STATE'
  } catch (e) {
    if (e.response?.status === 404) {
      viewState.value = 'EMPTY_STATE'
    } else {
      error.value = e.response?.status === 403
        ? 'Bạn không có quyền truy cập nội dung luyện tập này.'
        : 'Không thể tải nội dung luyện tập.'
      viewState.value = 'EMPTY_STATE'
    }
  } finally {
    loading.value = false
  }
})

function selectActivity(activity) {
  selectedActivity.value = activity
  viewState.value = 'SESSION'
}

function backToModeSelect() {
  selectedActivity.value = null
  viewState.value = 'MODE_SELECT'
}

function goBack() {
  // Vue Router 4 sets window.history.state.back for in-app navigation
  if (window.history.state?.back) {
    router.back()
    return
  }
  // Fallback via source_meta
  const meta = trainingSet.value?.source_meta
  if (!meta) { router.push({ name: 'Home' }); return }

  if (trainingSet.value.source_type === 'LESSON') {
    router.push({
      name: 'VideoPlayer',
      params: { slug: meta.course_slug, lessonSlug: meta.lesson_slug },
    })
  } else if (trainingSet.value.source_type === 'CHAPTER') {
    router.push({
      name: 'BookReader',
      params: { slug: meta.book_slug },
      query: { chapter: meta.chapter_order },
    })
  } else {
    router.push({ name: 'Home' })
  }
}
</script>

<template>
  <div class="tv">
    <!-- Top bar (full-page only — not embedded) -->
    <div class="tv__topbar">
      <button class="tv__back-btn" @click="viewState === 'SESSION' ? backToModeSelect() : goBack()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="tv__topbar-title">
        {{ viewState === 'SESSION' && selectedActivity ? selectedActivity.title : (trainingSet?.title ?? 'Luyện tập') }}
      </span>
    </div>

    <div class="tv__content">
      <!-- Loading -->
      <div v-if="viewState === 'LOADING'" class="tv__skeletons">
        <div v-for="n in 3" :key="n" class="tv__skeleton"></div>
      </div>

      <!-- Empty state: no TrainingSet -->
      <div v-else-if="viewState === 'EMPTY_STATE'" class="tv__state">
        <p class="tv__state-msg">{{ error ?? 'Bài học này chưa có nội dung luyện tập.' }}</p>
        <button class="tv__cta-btn" @click="goBack">← Quay lại bài học</button>
      </div>

      <!-- Inactive state: TrainingSet exists but all activities inactive -->
      <div v-else-if="viewState === 'INACTIVE_STATE'" class="tv__state">
        <p class="tv__state-msg">Nội dung luyện tập đang được cập nhật.</p>
        <button class="tv__cta-btn" @click="goBack">← Quay lại bài học</button>
      </div>

      <!-- Mode select -->
      <div v-else-if="viewState === 'MODE_SELECT' && trainingSet">
        <TrainingModeSelector
          :activities="trainingSet.activities"
          :title="trainingSet.title"
          @select="selectActivity"
        />
      </div>

      <!-- Session -->
      <div v-else-if="viewState === 'SESSION' && selectedActivity">
        <component
          :is="ACTIVITY_COMPONENTS[selectedActivity.activity_type]"
          :activity-id="selectedActivity.id"
          :embedded="false"
          @complete="backToModeSelect"
          @go-quiz="() => {
            const quiz = trainingSet?.activities?.find(a => a.activity_type === 'QUIZ' && a.is_active)
            if (quiz) selectActivity(quiz)
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tv {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page, #150d05);
}

.tv__topbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  background: var(--bg-page, #150d05);
  z-index: 10;
}
.tv__back-btn { background: none; color: rgba(255,255,255,0.55); padding: 4px; display: flex; }
.tv__back-btn:hover { color: var(--text-primary); }
.tv__topbar-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tv__content { flex: 1; padding: var(--space-md); max-width: 640px; margin: 0 auto; width: 100%; }

.tv__state { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-xl) 0; text-align: center; }
.tv__state-msg { font-size: 0.88rem; color: rgba(255,255,255,0.5); line-height: 1.6; }
.tv__cta-btn { background: var(--bg-card); border-radius: var(--radius-md); padding: 12px var(--space-lg, 24px); font-size: 0.88rem; font-weight: 700; color: var(--accent-gold); }

.tv__skeletons { display: flex; flex-direction: column; gap: var(--space-sm); }
.tv__skeleton { height: 72px; background: rgba(255,255,255,0.07); border-radius: var(--radius-md); animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
