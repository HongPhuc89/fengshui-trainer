<script setup>
/**
 * ActivityCard — §8.5 ACTIVITY_CONFIG
 * Hiển thị một chế độ luyện tập (FLASHCARD / QUIZ) với stats.
 */
const props = defineProps({
  activity: { type: Object, required: true },
})

const emit = defineEmits(['select'])

const ACTIVITY_CONFIG = {
  FLASHCARD: { icon: '🃏', label: 'Flashcard' },
  QUIZ:      { icon: '📝', label: 'Quiz' },
}

const FLASHCARD_SESSION_SIZE = 10
const QUIZ_SESSION_SIZE = 10

function formatStats(activity) {
  const s = activity.stats
  if (!s) return ''
  if (activity.activity_type === 'FLASHCARD') {
    const total = s.total_count ?? 0
    const sessionSize = Math.min(FLASHCARD_SESSION_SIZE, total)
    return `${sessionSize} thẻ luyện tập ngẫu nhiên`
  }
  if (activity.activity_type === 'QUIZ') {
    const total = s.question_count ?? 0
    const sessionSize = Math.min(QUIZ_SESSION_SIZE, total)
    return `Luyện tập nhanh với ${sessionSize} câu hỏi trắc nghiệm`
  }
  return ''
}
</script>

<template>
  <button class="ac" @click="emit('select', activity)">
    <span class="ac__icon">{{ ACTIVITY_CONFIG[activity.activity_type]?.icon ?? '📚' }}</span>
    <div class="ac__body">
      <span class="ac__label">{{ ACTIVITY_CONFIG[activity.activity_type]?.label ?? activity.activity_type }}</span>
      <span class="ac__stats">{{ formatStats(activity) }}</span>
    </div>
    <svg class="ac__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </button>
</template>

<style scoped>
.ac {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
}
.ac:hover { border-color: var(--accent-gold); background: rgba(197,165,81,0.06); }
.ac__icon { font-size: 1.5rem; flex-shrink: 0; }
.ac__body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.ac__label { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
.ac__stats { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
.ac__arrow { color: rgba(255,255,255,0.25); flex-shrink: 0; }
</style>
