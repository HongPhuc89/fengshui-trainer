<script setup>
</script>

<template>
  <div class="auth-layout">
    <main class="auth-layout__main">
      <div class="auth-layout__card">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background: var(--bg-page-dark);
  padding: var(--space-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-layout__main { width: 100%; max-width: 420px; }
.auth-layout__card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
</style>
