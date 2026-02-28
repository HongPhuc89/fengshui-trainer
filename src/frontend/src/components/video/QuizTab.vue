<script setup>
/**
 * QuizTab — §8.6
 * Wrapper in VideoSidebar. Loads TrainingSet for the lesson,
 * then delegates to QuizSession with embedded=true.
 */
import { ref, onMounted } from 'vue'
import { trainingService } from '../../services/training.service'
import QuizSession from '../training/QuizSession.vue'

const props = defineProps({
  courseSlug: { type: String, required: true },
  lessonSlug: { type: String, required: true },
})

const loading    = ref(false)
const error      = ref(null)
const activityId = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    const res = await trainingService.getTrainingByLesson(props.lessonSlug)
    const quizActivity = res.data.activities?.find(
      a => a.activity_type === 'QUIZ' && a.is_active
    )
    if (quizActivity) {
      activityId.value = quizActivity.id
    } else {
      error.value = 'empty'
    }
  } catch (e) {
    if (e.response?.status === 404) {
      error.value = 'empty'
    } else {
      error.value = 'Không thể tải bài ôn luyện.'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="quiz-tab">
    <div v-if="loading" class="quiz-tab__skeleton-wrap">
      <div class="quiz-tab__skeleton quiz-tab__skeleton--title"></div>
      <div v-for="n in 4" :key="n" class="quiz-tab__skeleton quiz-tab__skeleton--opt"></div>
    </div>

    <div v-else-if="error === 'empty'" class="quiz-tab__state quiz-tab__state--empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".3">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <p>Bài học này chưa có bài ôn luyện.</p>
    </div>

    <div v-else-if="error" class="quiz-tab__state quiz-tab__state--error">
      {{ error }}
    </div>

    <QuizSession
      v-else-if="activityId"
      :activity-id="activityId"
      :embedded="true"
    />
  </div>
</template>

<style scoped>
.quiz-tab { min-height: 300px; }

.quiz-tab__skeleton-wrap { display: flex; flex-direction: column; gap: var(--space-sm); padding: var(--space-md); }
.quiz-tab__skeleton {
  background: rgba(255,255,255,0.07);
  border-radius: var(--radius-md);
  animation: shimmer 1.4s infinite;
}
.quiz-tab__skeleton--title { height: 24px; width: 60%; }
.quiz-tab__skeleton--opt   { height: 48px; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

.quiz-tab__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) 0;
  font-size: 0.85rem;
  text-align: center;
}
.quiz-tab__state--empty { color: rgba(255,255,255,0.35); }
.quiz-tab__state--error { color: #ef9a9a; }
</style>
