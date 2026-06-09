<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="landing-layout">
    <nav class="landing-nav">
      <div class="landing-nav__inner">
        <div class="landing-nav__logo">
          <img src="/favicon.svg" alt="Logo" class="landing-nav__logo-img" />
          Feng Shui Library
        </div>

        <RouterLink :to="{ name: 'Login' }" class="landing-nav__login">
          Đăng nhập
        </RouterLink>
      </div>
    </nav>

    <RouterView />
  </div>
</template>

<style scoped>
.landing-layout {
  min-height: 100vh;
  background: #131313;
}

.landing-nav {
  background: #131313;
  border-bottom: 1px solid #4d4635;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 50;
}

.landing-nav__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.25rem;
  height: 5rem;
}

@media (min-width: 768px) {
  .landing-nav__inner {
    padding: 0 4rem;
  }
}

.landing-nav__logo {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-family: 'EB Garamond', serif;
  font-size: 1.75rem;
  font-weight: 500;
  color: #f2ca50;
  line-height: 1.3;
}

.landing-nav__logo-img {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  flex-shrink: 0;
}

.landing-nav__login {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: #f2ca50;
  color: #3c2f00;
  padding: 0.5rem 1.5rem;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.15s;
}

.landing-nav__login:hover {
  opacity: 0.88;
}

.landing-nav__login:active {
  transform: scale(0.95);
}
</style>
