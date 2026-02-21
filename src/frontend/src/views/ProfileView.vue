<script setup>
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const user = auth.user
</script>

<template>
  <div class="profile-view">
    <h1 class="profile-view__title">Hồ Sơ</h1>
    <div v-if="user" class="home-card">
      <p><strong>Học giả:</strong> {{ user.first_name }} {{ user.last_name }}</p>
      <p><strong>Điện thoại:</strong> {{ user.phone_number }}</p>
      <p><strong>Loại tài khoản:</strong> {{ user.user_type || 'FREE' }}</p>
    </div>
  </div>
</template>

<style scoped>
.profile-view__title { font-size: 1.25rem; margin-bottom: var(--space-md); }
.home-card { background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-md); }
</style>
