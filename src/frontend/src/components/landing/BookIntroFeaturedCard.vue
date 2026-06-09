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
      <template v-if="item.demo_url">
        <a
          :href="item.demo_url"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn--outline-gold"
        >
          Truy cập
          <span class="material-symbols-outlined btn__icon" aria-hidden="true">open_in_new</span>
        </a>
        <button
          class="btn btn--ghost"
          @click="copyLink(item.copy_link_url || item.demo_url, idx)"
        >
          {{ copiedIndex === idx ? 'Đã sao chép!' : 'Copy link' }}
        </button>
      </template>
    </div>

    <span v-if="chapter.icon" class="featured-card__icon" aria-hidden="true">{{ chapter.icon }}</span>
  </div>
</template>

<style scoped>
.featured-card {
  position: relative;
  overflow: hidden;
  background: #1c1b1b;
  border: 1px solid rgba(242, 202, 80, 0.2);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 300px;
  box-shadow: 0 0 20px rgba(242, 202, 80, 0.05);
  transition: border-color 0.3s;
}

.featured-card:hover {
  border-color: #f2ca50;
}

.featured-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.featured-card__label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #f2ca50;
}

.featured-card__title {
  font-family: 'EB Garamond', serif;
  font-size: 1.75rem;
  font-weight: 500;
  color: #e5e2e1;
  line-height: 1.3;
}

.featured-card__price {
  font-family: 'EB Garamond', serif;
  font-size: 1.75rem;
  font-weight: 500;
  color: #f2ca50;
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
  font-size: 12.5rem;
  color: #f2ca50;
  opacity: 0.05;
  transition: opacity 0.3s;
  font-family: 'Material Symbols Outlined', sans-serif;
  font-variation-settings: 'FILL' 1;
  pointer-events: none;
  line-height: 1;
}

.featured-card:hover .featured-card__icon {
  opacity: 0.1;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  border: none;
  text-decoration: none;
}

.btn--outline-gold {
  color: #f2ca50;
  border: 1px solid rgba(242, 202, 80, 0.2);
  background: transparent;
}

.btn--outline-gold:hover {
  background: #f2ca50;
  color: #3c2f00;
}

.btn--ghost {
  color: #d0c5af;
  border: 1px solid #4d4635;
  background: transparent;
}

.btn--ghost:hover {
  background: #1c1b1b;
}

.btn__icon {
  font-size: 0.875rem;
  font-variation-settings: 'FILL' 0, 'wght' 300;
}
</style>
