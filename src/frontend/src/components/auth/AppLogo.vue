<script setup>
defineProps({
  variant: { type: String, default: 'login' }, // 'login' | 'register' | 'app'
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="app-logo" :class="[`app-logo--${variant}`]">
    <div class="app-logo__icon">
      <img src="/favicon.svg" alt="Huyền Học Logo" />
    </div>
    <h1 class="app-logo__title">HUYỀN HỌC</h1>
    <p v-if="subtitle || variant === 'login'" class="app-logo__subtitle">
      {{ subtitle || (variant === 'login' ? 'ANCIENT WISDOM ARCHIVES' : '') }}
    </p>
    <p v-else-if="variant === 'register'" class="app-logo__tagline">
      Secure your access to ancient wisdom.
    </p>
  </div>
</template>

<style scoped>
.app-logo {
  text-align: center;
  margin-bottom: var(--space-lg);
}
.app-logo__icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-logo__icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.app-logo--app .app-logo__icon {
  width: 40px;
  height: 40px;
  margin-bottom: 0;
}
.app-logo__title {
  font-size: 1.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-gold);
  margin: 0 0 var(--space-xs);
}
.app-logo--app .app-logo__title {
  font-size: 1.25rem;
  color: var(--header-title);
}
.app-logo__subtitle {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  margin: 0;
}
.app-logo__tagline {
  font-size: 0.9rem;
  font-style: italic;
  color: var(--accent-golden);
  margin: 0;
}
</style>
