<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const drawerOpen = ref(false)
const hasUnread = ref(false) // TODO: from notifications API

function goHome() {
  router.push({ name: 'Home' })
}
</script>

<template>
  <header class="app-header">
    <button type="button" class="app-header__btn" aria-label="Menu" @click="drawerOpen = true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div class="app-header__brand" @click="goHome">
      <span class="app-header__title">THIÊN THƯ</span>
      <span class="app-header__subtitle">MINH TRIẾT CỔ ĐIỂN</span>
    </div>
    <button type="button" class="app-header__btn app-header__btn--bell" aria-label="Notifications" @click="() => {}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span v-if="hasUnread" class="app-header__dot" aria-hidden="true"></span>
    </button>
  </header>
  <!-- TODO: Side drawer for menu (drawerOpen) -->
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--top-bar-height);
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-md);
  z-index: 100;
  border-bottom: 1px solid var(--border-input);
}
.app-header__btn {
  background: none;
  color: var(--text-primary);
  padding: var(--space-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-header__btn--bell { position: relative; }
.app-header__dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--btn-primary);
  border-radius: 50%;
}
.app-header__brand { text-align: center; cursor: pointer; }
.app-header__title { display: block; font-size: 1.15rem; font-weight: 700; color: var(--header-title); letter-spacing: 0.02em; }
.app-header__subtitle { display: block; font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; }
</style>
