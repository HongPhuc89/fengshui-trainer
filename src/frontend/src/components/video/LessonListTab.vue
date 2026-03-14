<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  lessons:           { type: Array,    required: true },
  currentLessonSlug: { type: String,   required: true },
  courseSlug:        { type: String,   required: true },
  canAccessLesson:   { type: Function, default: () => true },
})

const emit = defineEmits(['select'])
const router = useRouter()
const listRef = ref(null)

function scrollToActive() {
  nextTick(() => {
    const el = listRef.value?.querySelector('.lesson-list__item--active')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

onMounted(scrollToActive)
watch(() => props.currentLessonSlug, scrollToActive)

defineExpose({ scrollToActive })

function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function selectLesson(lesson) {
  if (lesson.slug === props.currentLessonSlug) return
  if (!props.canAccessLesson(lesson)) return
  emit('select', lesson)
  router.push({ name: 'VideoPlayer', params: { slug: props.courseSlug, lessonSlug: lesson.slug } })
}
</script>

<template>
  <div ref="listRef" class="lesson-list">
    <div
      v-for="lesson in lessons"
      :key="lesson.slug"
      class="lesson-list__item"
      :class="{
        'lesson-list__item--active':  lesson.slug === currentLessonSlug,
        'lesson-list__item--locked':  !canAccessLesson(lesson),
      }"
      @click="selectLesson(lesson)"
    >
      <!-- Active indicator / lock icon -->
      <span class="lesson-list__indicator">
        <svg
          v-if="!canAccessLesson(lesson)"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"
          class="lesson-list__lock-icon"
        >
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <svg
          v-else-if="lesson.slug === currentLessonSlug"
          viewBox="0 0 24 24" fill="currentColor" width="12" height="12"
        >
          <polygon points="5,3 19,12 5,21"/>
        </svg>
        <span v-else class="lesson-list__order">{{ lesson.order }}</span>
      </span>

      <!-- Thumbnail -->
      <img
        v-if="lesson.thumbnail"
        class="lesson-list__thumb"
        :src="lesson.thumbnail"
        :alt="lesson.title"
      />
      <div v-else class="lesson-list__thumb lesson-list__thumb--empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20" opacity=".4">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
      </div>

      <!-- Info -->
      <div class="lesson-list__info">
        <p class="lesson-list__title">{{ lesson.title }}</p>
        <span v-if="lesson.duration_seconds" class="lesson-list__duration">
          {{ formatDuration(lesson.duration_seconds) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lesson-list {
  padding: var(--space-sm) 0;
}

.lesson-list__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px var(--space-md);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background 0.12s, border-color 0.12s;
}

.lesson-list__item:hover:not(.lesson-list__item--active) {
  background: rgba(255,255,255,0.05);
}

.lesson-list__item--active {
  background: rgba(197,165,81,0.1);
  border-left-color: var(--accent-gold);
  cursor: default;
}

/* Indicator (order number or play icon) */
.lesson-list__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  color: var(--accent-gold);
}

.lesson-list__order {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255,255,255,0.3);
}

.lesson-list__item--active .lesson-list__order {
  color: var(--accent-gold);
}

/* Thumbnail */
.lesson-list__thumb {
  width: 72px;
  height: 42px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  background: rgba(255,255,255,0.06);
}

.lesson-list__thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Info */
.lesson-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.lesson-list__title {
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.lesson-list__item--active .lesson-list__title {
  color: var(--accent-gold);
  font-weight: 600;
}

.lesson-list__duration {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.35);
}

/* Locked state */
.lesson-list__item--locked {
  cursor: not-allowed;
  opacity: 0.5;
}

.lesson-list__item--locked:hover:not(.lesson-list__item--active) {
  background: none;
}

.lesson-list__lock-icon {
  color: rgba(255,255,255,0.4);
}
</style>
