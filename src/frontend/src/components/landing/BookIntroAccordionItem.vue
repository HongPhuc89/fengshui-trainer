<script setup>
import { ref } from 'vue'

const props = defineProps({
  chapter: { type: Object, required: true },
  isOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle'])

const copiedIndex = ref(null)

async function copyLink(url, idx) {
  await navigator.clipboard.writeText(url)
  copiedIndex.value = idx
  setTimeout(() => { copiedIndex.value = null }, 2000)
}
</script>

<template>
  <div class="accordion-item" :class="{ 'accordion-item--open': isOpen }">
    <button class="accordion-item__header" @click="emit('toggle', chapter.chapter_label)">
      <div class="accordion-item__meta">
        <span class="accordion-item__label">{{ chapter.chapter_label }}</span>
        <h2 class="accordion-item__title">{{ chapter.title }}</h2>
        <span v-if="chapter.subtitle || chapter.price_label" class="accordion-item__sub">
          {{ [chapter.subtitle, chapter.price_label].filter(Boolean).join(' — ') }}
        </span>
      </div>
      <span class="accordion-item__arrow" aria-hidden="true">▾</span>
    </button>

    <div class="accordion-item__body">
      <div class="accordion-item__grid">
        <div
          v-for="(item, idx) in chapter.items"
          :key="idx"
          class="accordion-item__card"
        >
          <h3 v-if="item.title" class="accordion-item__card-title">{{ item.title }}</h3>
          <div class="accordion-item__actions">
            <a
              :href="item.demo_url"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--outline-gold"
            >
              {{ item.demo_label || 'XEM DEMO' }}
              <span class="btn__icon" aria-hidden="true">↗</span>
            </a>
            <button
              v-if="item.copy_link_url"
              class="btn btn--ghost"
              @click="copyLink(item.copy_link_url, idx)"
            >
              {{ copiedIndex === idx ? 'Đã sao chép!' : 'Sao chép link' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accordion-item {
  border-top: 1px solid rgba(var(--color-primary-rgb, 242 202 80), 0.2);
  background: var(--bg-card);
}

.accordion-item__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
}

.accordion-item__header:hover .accordion-item__title {
  color: var(--btn-primary);
}

.accordion-item__meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.accordion-item__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--btn-primary);
}

.accordion-item__title {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.2s;
}

.accordion-item__sub {
  font-size: 0.9rem;
  color: var(--text-secondary);
  opacity: 0.7;
}

.accordion-item__arrow {
  font-size: 1.5rem;
  color: var(--btn-primary);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.accordion-item--open .accordion-item__arrow {
  transform: rotate(180deg);
}

.accordion-item__body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion-item--open .accordion-item__body {
  max-height: 2000px;
}

.accordion-item__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 0 2rem 2rem;
}

@media (min-width: 768px) {
  .accordion-item__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.accordion-item__card {
  padding: 1.5rem;
  background: var(--bg-main);
  border-left: 4px solid rgba(var(--color-primary-rgb, 242 202 80), 0.4);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  transition: border-color 0.2s;
}

.accordion-item__card:hover {
  border-left-color: var(--btn-primary);
}

.accordion-item__card-title {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-primary);
}

.accordion-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  border: none;
}

.btn--outline-gold {
  color: var(--btn-primary);
  border: 1px solid rgba(var(--color-primary-rgb, 242 202 80), 0.3);
  background: transparent;
  text-decoration: none;
}

.btn--outline-gold:hover {
  background: var(--btn-primary);
  color: var(--btn-primary-text, #3c2f00);
}

.btn--ghost {
  color: var(--text-secondary);
  border: 1px solid var(--border-input);
  background: transparent;
}

.btn--ghost:hover {
  background: var(--bg-card);
}

.btn__icon {
  font-style: normal;
}
</style>
