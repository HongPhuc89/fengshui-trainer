<script setup>
defineProps({
  lesson:       { type: Object, required: true },
  currentIndex: { type: Number, required: true },
  totalCount:   { type: Number, required: true },
})

function formatDuration(s) {
  if (!s) return ''
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}g ${m}p` : `${m} phút`
}
</script>

<template>
  <div class="lesson-meta">
    <div class="lesson-meta__row">
      <h1 class="lesson-meta__title">{{ lesson.title }}</h1>
      <span v-if="totalCount" class="lesson-meta__index">
        {{ currentIndex + 1 }} / {{ totalCount }}
      </span>
    </div>
    <p v-if="lesson.duration_seconds" class="lesson-meta__dur">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      {{ formatDuration(lesson.duration_seconds) }}
    </p>
  </div>
</template>

<style scoped>
.lesson-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-md) var(--space-md) var(--space-sm);
}

.lesson-meta__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}

.lesson-meta__title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
}

.lesson-meta__index {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  padding-top: 4px;
}

.lesson-meta__dur {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
}
</style>
