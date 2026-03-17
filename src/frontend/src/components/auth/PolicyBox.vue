<script setup>
defineProps({
  title: { type: String, default: 'One Device Policy' },
})
</script>

<template>
  <div class="policy-box" role="alert">
    <span class="policy-box__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    </span>
    <p class="policy-box__text">
      <strong v-if="title" class="policy-box__title">{{ title }}: </strong>
      <slot />
    </p>
  </div>
</template>

<style scoped>
.policy-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--policy-bg);
  border-radius: var(--radius-md);
  margin-top: var(--space-lg);
}
.policy-box__icon {
  flex-shrink: 0;
  color: var(--btn-primary);
}
.policy-box__text { font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
.policy-box__title { color: var(--text-primary); }
</style>
