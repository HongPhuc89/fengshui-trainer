<script setup>
import VideoTabNav      from './VideoTabNav.vue'
import LessonSummaryTab from './LessonSummaryTab.vue'
import FlashcardTab     from './FlashcardTab.vue'
import QuizTab          from './QuizTab.vue'

defineProps({
  lesson:     { type: Object, required: true },
  courseSlug: { type: String, required: true },
  lessonSlug: { type: String, required: true },
  tabs:       { type: Array,  required: true },
  modelValue: { type: Number, required: true },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <aside class="video-sidebar">
    <VideoTabNav
      :model-value="modelValue"
      :tabs="tabs"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <div class="video-sidebar__content">
      <!-- Tab 0: AI Summary -->
      <LessonSummaryTab
        v-show="modelValue === 0"
        :summary="lesson.summary"
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
