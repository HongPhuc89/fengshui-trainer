<script setup>
/**
 * FlashcardTab — feature-10 (simplified)
 * Wrapper in VideoSidebar. Loads TrainingSet for the lesson,
 * then delegates to FlashcardSession with embedded=true.
 */
import { ref, onMounted } from 'vue'
import { trainingService } from '../../services/training.service'
import FlashcardSession from '../training/FlashcardSession.vue'

const props = defineProps({
  courseSlug: { type: String, required: true },
  lessonSlug: { type: String, required: true },
})

const activityId = ref(null)
const loading    = ref(false)
const error      = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    const res = await trainingService.getTrainingByLesson(props.lessonSlug)
    const flashcardActivity = res.data.activities?.find(
      a => a.activity_type === 'FLASHCARD' && a.is_active
    )
    if (flashcardActivity) {
      activityId.value = flashcardActivity.id
    } else {
      error.value = 'empty'
    }
  } catch (e) {
    if (e.response?.status === 404) {
      error.value = 'empty'
    } else {
      error.value = 'Không thể tải flashcard.'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="fc-tab">
    <div v-if="loading" class="fc-tab__skeletons">
      <div v-for="n in 3" :key="n" class="fc-tab__skeleton"></div>
    </div>

    <div v-else-if="error === 'empty'" class="fc-tab__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".3">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
      <p>Bài học này chưa có flashcard.</p>
    </div>

    <div v-else-if="error" class="fc-tab__error">
      {{ error }}
    </div>

    <FlashcardSession
      v-else-if="activityId"
      :activity-id="activityId"
      :embedded="true"
    />
  </div>
</template>

<style scoped>
.fc-tab { min-height: 320px; }

.fc-tab__skeletons { display: flex; flex-direction: column; gap: var(--space-sm); padding: var(--space-md); }
.fc-tab__skeleton {
  height: 60px;
  background: rgba(255,255,255,0.07);
  border-radius: var(--radius-md);
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

.fc-tab__empty, .fc-tab__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) 0;
  color: rgba(255,255,255,0.35);
  font-size: 0.85rem;
  text-align: center;
}
.fc-tab__error { color: #ef9a9a; }
</style>
