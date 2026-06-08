<script setup>
import { ref } from 'vue'

const props = defineProps({
  chapter: { type: Object, required: true },
})

const copiedIndex = ref(null)

async function copyLink(url, idx) {
  await navigator.clipboard.writeText(url)
  copiedIndex.value = idx
  setTimeout(() => { copiedIndex.value = null }, 2000)
}
</script>

<template>
  <div class="featured-card">
    <div class="featured-card__content">
      <span class="featured-card__label">{{ chapter.chapter_label }}</span>
      <h2 class="featured-card__title">{{ chapter.title }}</h2>
      <p v-if="chapter.price_label" class="featured-card__price">{{ chapter.price_label }}</p>
    </div>

    <div
      v-for="(item, idx) in chapter.items"
      :key="idx"
      class="featured-card__actions"
    >
      <a
        :href="item.demo_url"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn--primary"
      >
        {{ item.demo_label || 'XEM DEMO' }}
      </a>
      <button
        v-if="item.copy_link_url"
        class="btn btn--outline"
        @click="copyLink(item.copy_link_url, idx)"
      >
        {{ copiedIndex === idx ? 'Đã sao chép!' : 'Sao chép link' }}
      </button>
    </div>

    <span v-if="chapter.icon" class="featured-card__icon" aria-hidden="true">
      {{ chapter.icon }}
    </span>
  </div>
</template>

<style scoped>
.featured-card {
  position: relative;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid rgba(var(--color-primary-rgb, 242 202 80), 0.2);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 300px;
  transition: border-color 0.2s;
}

.featured-card:hover {
  border-color: var(--btn-primary);
}

.featured-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.featured-card__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--btn-primary);
}

.featured-card__title {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.featured-card__price {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--btn-primary);
}

.featured-card__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.featured-card__icon {
  position: absolute;
  right: -3rem;
  bottom: -3rem;
  font-size: 12rem;
  color: var(--btn-primary);
  opacity: 0.05;
  transition: opacity 0.2s;
  font-family: 'Material Symbols Outlined', sans-serif;
  font-variation-settings: 'FILL' 1;
  pointer-events: none;
}

.featured-card:hover .featured-card__icon {
  opacity: 0.1;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
  border: none;
  text-align: center;
  text-decoration: none;
}

.btn--primary {
  background: var(--btn-primary);
  color: var(--btn-primary-text, #3c2f00);
}

.btn--primary:hover {
  opacity: 0.9;
}

.btn--outline {
  background: transparent;
  color: var(--btn-primary);
  border: 1px solid var(--btn-primary);
}

.btn--outline:hover {
  background: var(--btn-primary);
  color: var(--btn-primary-text, #3c2f00);
}
</style>
