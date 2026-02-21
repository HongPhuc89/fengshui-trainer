<script setup>
defineProps({
  to: { type: String, default: '#' },
  prefix: { type: String, default: '' },
})
</script>

<template>
  <p v-if="prefix" class="auth-link">
    <span class="auth-link__prefix">{{ prefix }}</span>
    <RouterLink :to="to" class="auth-link__link"><slot /></RouterLink>
  </p>
  <RouterLink v-else :to="to" class="auth-link__link"><slot /></RouterLink>
</template>

<style scoped>
.auth-link { margin-top: var(--space-lg); text-align: center; color: var(--text-secondary); font-size: 0.9rem; }
.auth-link__prefix { margin-right: 0.25em; }
.auth-link__link { color: var(--accent-gold); font-weight: 500; }
.auth-link__link:hover { text-decoration: underline; }
</style>
