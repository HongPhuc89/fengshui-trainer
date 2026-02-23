<script setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

function toggle() {
  locale.value = locale.value === 'vi' ? 'en' : 'vi'
  localStorage.setItem('locale', locale.value)
}
</script>

<template>
  <button
    type="button"
    class="lang-switcher"
    :aria-label="locale === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'"
    @click="toggle"
  >
    <span class="lang-switcher__flag">{{ locale === 'vi' ? '🇻🇳' : '🇬🇧' }}</span>
    <span class="lang-switcher__code">{{ locale === 'vi' ? 'VI' : 'EN' }}</span>
  </button>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 20px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.lang-switcher:hover {
  background: var(--policy-bg);
  border-color: var(--accent-gold);
}
.lang-switcher__flag {
  font-size: 0.85rem;
  line-height: 1;
}
.lang-switcher__code {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}
</style>
