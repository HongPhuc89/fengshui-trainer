<script setup>
defineProps({
  variant: { type: String, default: 'login' }, // 'login' | 'register' | 'app'
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="app-logo" :class="[`app-logo--${variant}`]">
    <div class="app-logo__icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h8" />
      </svg>
    </div>
    <h1 class="app-logo__title">THIÊN THƯ</h1>
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
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-md);
  border: 2px solid var(--accent-gold);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-logo__icon svg {
  width: 32px;
  height: 32px;
  color: var(--accent-gold);
}
.app-logo--register .app-logo__icon {
  background: rgba(197, 165, 81, 0.2);
}
.app-logo__icon svg {
  color: var(--accent-gold);
}
.app-logo--app .app-logo__icon {
  display: none;
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
