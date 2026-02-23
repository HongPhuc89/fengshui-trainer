<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()

const tabs = computed(() => [
  { name: 'Home', path: '/', label: t('nav.home'), icon: 'home' },
  { name: 'Books', path: '/books', label: t('nav.books'), icon: 'book' },
  { name: 'Store', path: '/store', label: t('nav.store'), icon: 'cart' },
  { name: 'Community', path: '/community', label: t('nav.community'), icon: 'people' },
  { name: 'Profile', path: '/profile', label: t('nav.profile'), icon: 'person' },
])

const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="bottom-nav" aria-label="Main navigation">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="tab.path"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': isActive(tab.path) }"
    >
      <span class="bottom-nav__icon" aria-hidden="true">
        <svg v-if="tab.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <svg v-else-if="tab.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h8"/></svg>
        <svg v-else-if="tab.icon === 'cart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <svg v-else-if="tab.icon === 'people'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </span>
      <span class="bottom-nav__label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-nav-height);
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: space-around;
  border-top: 1px solid var(--border-input);
  z-index: 100;
}
.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.7rem;
}
.bottom-nav__item--active { color: var(--nav-active); }
.bottom-nav__icon { display: block; margin-bottom: 2px; }
.bottom-nav__icon svg { width: 22px; height: 22px; }
</style>
