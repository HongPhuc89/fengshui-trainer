<script setup>
import AppHeader from '../components/app/AppHeader.vue'
import BottomNav from '../components/app/BottomNav.vue'
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    <main class="app-layout__main">
      <RouterView />
    </main>
    <BottomNav />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  padding-top: var(--top-bar-height);
  padding-bottom: var(--bottom-nav-height);
}
.app-layout__main {
  min-height: calc(100vh - var(--top-bar-height) - var(--bottom-nav-height));
  padding: var(--space-md);
}
</style>
