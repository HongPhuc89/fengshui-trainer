<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import VideoTabNav    from './VideoTabNav.vue'
import LessonListTab  from './LessonListTab.vue'
import FlashcardTab   from './FlashcardTab.vue'
import QuizTab        from './QuizTab.vue'
import { trainingService } from '../../services/training.service'

const props = defineProps({
  lesson:     { type: Object, required: true },
  lessons:    { type: Array,  default: () => [] },
  courseSlug: { type: String, required: true },
  lessonSlug: { type: String, required: true },
  tabs:       { type: Array,  required: true },
  modelValue: { type: Number, required: true },
})

const emit = defineEmits(['update:modelValue'])

// null = unknown (still loading), true = has content, false = empty
const hasFlashcard = ref(null)
const hasQuiz      = ref(null)

async function loadTrainingInfo(lessonSlug) {
  hasFlashcard.value = null
  hasQuiz.value      = null
  try {
    const res       = await trainingService.getTrainingByLesson(lessonSlug)
    const activities = res.data.activities ?? []
    hasFlashcard.value = activities.some(a => a.activity_type === 'FLASHCARD' && a.is_active)
    hasQuiz.value      = activities.some(a => a.activity_type === 'QUIZ'      && a.is_active)
  } catch {
    hasFlashcard.value = false
    hasQuiz.value      = false
  }
}

onMounted(() => loadTrainingInfo(props.lessonSlug))
watch(() => props.lessonSlug, loadTrainingInfo)

const localTabs = computed(() =>
  props.tabs.map((tab, i) => {
    if (i === 1) return { ...tab, disabled: hasFlashcard.value === false }
    if (i === 2) return { ...tab, disabled: hasQuiz.value      === false }
    return tab
  })
)
</script>

<template>
  <aside class="video-sidebar">
    <VideoTabNav
      :model-value="modelValue"
      :tabs="localTabs"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <div class="video-sidebar__content">
      <!-- Tab 0: Lesson list -->
      <LessonListTab
        v-show="modelValue === 0"
        :lessons="lessons"
        :current-lesson-slug="lessonSlug"
        :course-slug="courseSlug"
      />

      <!-- Tab 1: Flashcards (lazy, keep-alive) -->
      <keep-alive>
        <FlashcardTab
          v-if="modelValue === 1"
          :course-slug="courseSlug"
          :lesson-slug="lessonSlug"
        />
      </keep-alive>

      <!-- Tab 2: Quiz (lazy, keep-alive) -->
      <keep-alive>
        <QuizTab
          v-if="modelValue === 2"
          :course-slug="courseSlug"
          :lesson-slug="lessonSlug"
        />
      </keep-alive>
    </div>
  </aside>
</template>

<style scoped>
.video-sidebar {
  display: flex;
  flex-direction: column;
}

.video-sidebar__content {
  flex: 1;
}
</style>
