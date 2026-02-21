<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})
</script>

<template>
  <button
    :type="type"
    class="primary-btn"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span class="primary-btn__text"><slot /></span>
    <span class="primary-btn__icon" aria-hidden="true">
      <svg v-if="!loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      <span v-else class="primary-btn__spinner" aria-hidden="true"></span>
    </span>
  </button>
</template>

<style scoped>
.primary-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 14px var(--space-md);
  background: var(--btn-primary);
  color: var(--text-primary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-md);
  transition: background 0.2s;
}
.primary-btn:hover:not(:disabled) { background: var(--btn-primary-hover); }
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.primary-btn__icon { display: flex; align-items: center; }
.primary-btn__spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
