<script setup>
defineProps({
  prevLesson: { type: Object, default: null },
  nextLesson: { type: Object, default: null },
})

const emit = defineEmits(['go-prev', 'go-next'])
</script>

<template>
  <div class="lesson-nav">
    <button
      class="lesson-nav__btn"
      :disabled="!prevLesson"
      @click="emit('go-prev')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Bài trước
    </button>
    <button
      class="lesson-nav__btn lesson-nav__btn--next"
      :disabled="!nextLesson"
      @click="emit('go-next')"
    >
      Bài tiếp
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.lesson-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom));
  background: var(--bg-main);
  border-top: 1px solid rgba(255,255,255,0.08);
  z-index: 20;
}

.lesson-nav__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: background 0.15s;
}

.lesson-nav__btn:hover:not(:disabled) { background: rgba(74,44,39,0.9); }
.lesson-nav__btn:disabled { opacity: 0.3; cursor: default; }
.lesson-nav__btn--next { flex-direction: row-reverse; }
</style>
