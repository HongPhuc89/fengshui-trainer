<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  chapter: { type: Object, required: true },
  chapterNumber: { type: Number, required: true },
  isOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle'])

const copiedIndex = ref(null)
const hasContent = computed(() => props.chapter.items?.length > 0)

async function copyLink(url, idx) {
  await navigator.clipboard.writeText(url)
  copiedIndex.value = idx
  setTimeout(() => { copiedIndex.value = null }, 2000)
}
</script>

<template>
  <div class="accordion-item" :class="{ 'accordion-item--open': isOpen && hasContent }">
    <button
      class="accordion-item__header"
      :class="{ 'accordion-item__header--static': !hasContent }"
      :disabled="!hasContent"
      @click="hasContent && emit('toggle', chapter.chapter_label)"
    >
      <div class="accordion-item__header-inner">
        <div class="accordion-item__num">{{ chapterNumber }}</div>
        <div class="accordion-item__meta">
          <h2 class="accordion-item__title">{{ chapter.title }}</h2>
          <span v-if="chapter.subtitle || chapter.price_label" class="accordion-item__sub">
            {{ [chapter.subtitle, chapter.price_label].filter(Boolean).join(' — ') }}
          </span>
        </div>
      </div>
      <span v-if="hasContent" class="material-symbols-outlined accordion-item__arrow" aria-hidden="true">expand_more</span>
    </button>

    <div class="accordion-item__body">
      <div class="accordion-item__grid">
        <div
          v-for="(item, idx) in chapter.items"
          :key="idx"
          class="accordion-item__card"
        >
          <h3 v-if="item.title" class="accordion-item__card-title">{{ item.title }}</h3>
          <div v-if="item.demo_url" class="accordion-item__actions">
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accordion-item {
  border-top: 1px solid rgba(242, 202, 80, 0.2);
  background: #1c1b1b;
  box-shadow: 0 0 20px rgba(242, 202, 80, 0.05);
}

.accordion-item__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: #e5e2e1;
  gap: 1rem;
}

.accordion-item__header:hover:not(.accordion-item__header--static) .accordion-item__title {
  color: #f2ca50;
}

.accordion-item__header--static {
  cursor: default;
}

.accordion-item__header-inner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex: 1;
  min-width: 0;
}

.accordion-item__num {
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
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(242, 202, 80, 0.15);
}

.accordion-item__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.accordion-item__title {
  font-family: 'EB Garamond', serif;
  font-size: 1.75rem;
  font-weight: 500;
  color: #e5e2e1;
  transition: color 0.3s;
  line-height: 1.3;
}

.accordion-item__sub {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 1rem;
  color: #d0c5af;
  opacity: 0.7;
}

.accordion-item__arrow {
  font-size: 2rem;
  color: #f2ca50;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  font-variation-settings: 'FILL' 0, 'wght' 300;
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
  padding: 0 2rem 2.5rem;
}

@media (min-width: 768px) {
  .accordion-item__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.accordion-item__card {
  padding: 1.5rem;
  background: #131313;
  border-left: 4px solid rgba(242, 202, 80, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  transition: border-color 0.2s;
}

.accordion-item__card:hover {
  border-left-color: #f2ca50;
}

.accordion-item__card-title {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  color: #e5e2e1;
  line-height: 1.6;
}

.accordion-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
