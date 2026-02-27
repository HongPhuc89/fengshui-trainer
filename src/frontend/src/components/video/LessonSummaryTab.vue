<script setup>
defineProps({
  summary: { type: String, default: '' },
})
</script>

<template>
  <div class="summary">
    <!-- Empty state -->
    <div v-if="!summary" class="summary__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".3">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
      <p>Tóm tắt AI đang được tạo cho bài học này...</p>
    </div>

    <!-- Has content -->
    <div v-else class="summary__content">
      <p class="summary__text">{{ summary }}</p>
    </div>
  </div>
</template>

<style scoped>
.summary {
  padding: var(--space-md);
}

.summary__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
  color: rgba(255,255,255,0.35);
  font-size: 0.85rem;
  text-align: center;
}

.summary__content {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.summary__text {
  font-size: 0.88rem;
  color: rgba(255,255,255,0.75);
  line-height: 1.7;
  white-space: pre-line;
}
</style>
