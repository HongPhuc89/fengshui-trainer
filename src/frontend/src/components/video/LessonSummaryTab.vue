<script setup>
import { ref } from 'vue'

const props = defineProps({
  summary: { type: String, default: '' },
})

const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.summary)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // clipboard API not available
  }
}
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
      <div class="summary__toolbar">
        <button class="summary__copy-btn" @click="copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {{ copied ? 'Đã sao chép!' : 'Sao chép' }}
        </button>
      </div>
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

.summary__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-sm);
}

.summary__copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(255,255,255,0.08);
  border-radius: var(--radius-sm);
  color: rgba(255,255,255,0.6);
  font-size: 0.75rem;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}

.summary__copy-btn:hover {
  background: rgba(255,255,255,0.14);
  color: var(--accent-gold);
}

.summary__text {
  font-size: 0.88rem;
  color: rgba(255,255,255,0.75);
  line-height: 1.7;
  white-space: pre-line;
}
</style>
