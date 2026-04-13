<script setup>
import { ref, watch, nextTick } from 'vue'
import VideoTabNav   from './VideoTabNav.vue'
import LessonListTab from './LessonListTab.vue'

const props = defineProps({
  lesson:          { type: Object,   required: true },
  lessons:         { type: Array,    default: () => [] },
  courseSlug:      { type: String,   required: true },
  lessonSlug:      { type: String,   required: true },
  tabs:            { type: Array,    required: true },
  modelValue:      { type: Number,   required: true },
  canAccessLesson: { type: Function, default: () => true },
})

const emit = defineEmits(['update:modelValue'])

const lessonListRef = ref(null)

// Scroll active lesson into view when returning to tab 0
watch(() => props.modelValue, val => {
  if (val === 0) nextTick(() => lessonListRef.value?.scrollToActive())
})
</script>

<template>
  <aside class="video-sidebar">
    <VideoTabNav
      :model-value="modelValue"
      :tabs="tabs"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <div class="video-sidebar__content">
      <!-- Tab 0: Lesson list -->
      <LessonListTab
        ref="lessonListRef"
        v-show="modelValue === 0"
        :lessons="lessons"
        :current-lesson-slug="lessonSlug"
        :course-slug="courseSlug"
        :can-access-lesson="canAccessLesson"
      />
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
