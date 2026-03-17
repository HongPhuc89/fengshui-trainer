<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LangSwitcher from './LangSwitcher.vue'

const { t } = useI18n()
const router = useRouter()
const drawerOpen = ref(false)
const hasUnread = ref(false) // TODO: from notifications API

function goHome() {
  router.push({ name: 'Home' })
}
</script>

<template>
  <header class="app-header">
    <!-- TODO: menu drawer – ẩn tạm -->
    <span class="app-header__btn-placeholder"></span>
    <div class="app-header__brand" @click="goHome">
      <span class="app-header__title">HUYỀN HỌC</span>
      <span class="app-header__subtitle">{{ t('header.subtitle') }}</span>
    </div>
    <div class="app-header__right">
      <LangSwitcher />
      <!-- TODO: notifications – ẩn tạm -->
    </div>
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
.app-header__right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
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
.app-header__btn-placeholder { width: 40px; }
.app-header__brand { text-align: center; cursor: pointer; }
.app-header__title { display: block; font-size: 1.15rem; font-weight: 700; color: var(--header-title); letter-spacing: 0.02em; }
.app-header__subtitle { display: block; font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; }
</style>


