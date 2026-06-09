<script setup>
import { ref } from 'vue'

const props = defineProps({
  chapter: { type: Object, required: true },
  chapterNumber: { type: Number, required: true },
})

const isOpen = ref(false)
const copiedIndex = ref(null)

async function copyLink(url, idx) {
  await navigator.clipboard.writeText(url)
  copiedIndex.value = idx
  setTimeout(() => { copiedIndex.value = null }, 2000)
}
</script>

<template>
  <div class="featured-card" :class="{ 'featured-card--open': isOpen }">
    <button class="featured-card__header" @click="isOpen = !isOpen">
      <div class="featured-card__header-inner">
        <div class="featured-card__num">{{ chapterNumber }}</div>
        <div class="featured-card__meta">
          <h2 class="featured-card__title">{{ chapter.title }}</h2>
          <span v-if="chapter.price_label" class="featured-card__sub">{{ chapter.price_label }}</span>
        </div>
      </div>
      <span class="material-symbols-outlined featured-card__arrow" aria-hidden="true">expand_more</span>
    </button>

    <div class="featured-card__body">
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
  box-shadow: 0 0 20px rgba(242, 202, 80, 0.05);
  display: flex;
  flex-direction: column;
  transition: border-color 0.3s;
}

.featured-card:hover {
  border-color: #f2ca50;
}

/* Header / clickable area */
.featured-card__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: #e5e2e1;
  gap: 1rem;
}

.featured-card__header:hover .featured-card__title {
  color: #f2ca50;
}

.featured-card__header-inner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.featured-card__num {
  width: 2.75rem;
  height: 2.75rem;
  border: 2px solid #f2ca50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'EB Garamond', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #f2ca50;
  box-shadow: 0 0 10px rgba(242, 202, 80, 0.15);
  flex-shrink: 0;
}

.featured-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.featured-card__title {
  font-family: 'EB Garamond', serif;
  font-size: 1.75rem;
  font-weight: 500;
  color: #e5e2e1;
  line-height: 1.3;
  transition: color 0.2s;
}

.featured-card__sub {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 0.9rem;
  color: #d0c5af;
  opacity: 0.7;
}

.featured-card__arrow {
  font-size: 2rem;
  color: #f2ca50;
  flex-shrink: 0;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  font-variation-settings: 'FILL' 0, 'wght' 300;
  margin-top: 0.25rem;
}

.featured-card--open .featured-card__arrow {
  transform: rotate(180deg);
}

/* Expandable body */
.featured-card__body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.featured-card--open .featured-card__body {
  max-height: 200px;
}

.featured-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0 2rem 1.5rem;
}

/* Background icon */
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

/* Buttons */
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
