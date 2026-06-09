<script setup>
import { ref, computed, onMounted } from 'vue'
import { landingService } from '../services/landing.service'
import BookIntroAccordionItem from '../components/landing/BookIntroAccordionItem.vue'
import BookIntroFeaturedCard from '../components/landing/BookIntroFeaturedCard.vue'
import BookIntroSidebar from '../components/landing/BookIntroSidebar.vue'

const pageData = ref(null)
const loading = ref(true)
const error = ref(false)
const activeChapterLabel = ref(null)

async function fetchPage() {
  loading.value = true
  error.value = false
  try {
    const res = await landingService.getBookIntroPage()
    pageData.value = res.data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function toggleChapter(label) {
  activeChapterLabel.value = activeChapterLabel.value === label ? null : label
}

// Group consecutive featured chapters together so they render in a 2-col grid
const groupedChapters = computed(() => {
  if (!pageData.value?.chapters) return []
  const result = []
  let featuredBuffer = []
  let num = 0

  for (const chapter of pageData.value.chapters) {
    num++
    if (chapter.display_type === 'featured') {
      featuredBuffer.push({ chapter, num })
    } else {
      if (featuredBuffer.length) {
        result.push({ type: 'featured-group', items: [...featuredBuffer] })
        featuredBuffer = []
      }
      result.push({ type: 'accordion', chapter, num })
    }
  }
  if (featuredBuffer.length) {
    result.push({ type: 'featured-group', items: featuredBuffer })
  }
  return result
})

onMounted(fetchPage)
</script>

<template>
  <div class="book-intro">
    <!-- Loading skeleton -->
    <div v-if="loading" class="book-intro__skeleton">
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--subtitle"></div>
      <div class="skeleton skeleton--bar"></div>
      <div class="skeleton skeleton--bar"></div>
      <div class="skeleton skeleton--bar"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="book-intro__error">
      <p>Không thể tải nội dung, vui lòng thử lại.</p>
      <button class="book-intro__retry" @click="fetchPage">Thử lại</button>
    </div>

    <!-- Main content -->
    <template v-else-if="pageData">
      <div class="book-intro__layout">
        <!-- Left column -->
        <div class="book-intro__main">
          <header class="book-intro__header">
            <h1 class="book-intro__headline">{{ pageData.headline }}</h1>
            <div class="book-intro__divider" aria-hidden="true"></div>
            <span class="book-intro__tag">{{ pageData.tag_label }}</span>
          </header>

          <!-- Empty state -->
          <p v-if="!pageData.chapters?.length" class="book-intro__empty">
            Chưa có nội dung.
          </p>

          <div v-else class="book-intro__chapters">
            <template v-for="(group, i) in groupedChapters" :key="i">
              <!-- Accordion chapter -->
              <BookIntroAccordionItem
                v-if="group.type === 'accordion'"
                :chapter="group.chapter"
                :chapter-number="group.num"
                :is-open="activeChapterLabel === group.chapter.chapter_label"
                @toggle="toggleChapter"
              />

              <!-- Featured chapters grid -->
              <div v-else class="book-intro__featured-grid">
                <BookIntroFeaturedCard
                  v-for="({ chapter, num }, j) in group.items"
                  :key="j"
                  :chapter="chapter"
                  :chapter-number="num"
                  :class="{ 'book-intro__featured-card--full': group.items.length % 2 !== 0 && j === group.items.length - 1 }"
                />
              </div>
            </template>
          </div>
        </div>

        <!-- Right column: sidebar -->
        <div class="book-intro__sidebar-col">
          <BookIntroSidebar
            :qr-image="pageData.sidebar_qr_image"
            :zalo-url="pageData.sidebar_zalo_url"
            :phone="pageData.sidebar_phone"
            :messenger-url="pageData.sidebar_messenger_url"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Design tokens ───────────────────────────────────────── */
:root {
  --land-gold: #f2ca50;
  --land-gold-dim: #e9c349;
  --land-on-primary: #3c2f00;
  --land-bg: #131313;
  --land-surface-low: #1c1b1b;
  --land-surface: #20201f;
  --land-on-surface: #e5e2e1;
  --land-on-surface-var: #d0c5af;
  --land-outline: #99907c;
  --land-outline-var: #4d4635;
}

.book-intro {
  max-width: 1280px;
  margin: 0 auto;
  padding: 5rem 1.25rem 6rem;
  background: #131313;
  min-height: 100vh;
  color: #e5e2e1;
}

@media (min-width: 768px) {
  .book-intro {
    padding: 8rem 4rem 6rem;
  }
}

/* Skeleton */
.book-intro__skeleton {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 700px;
}

.skeleton {
  background: #1c1b1b;
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton--title    { height: 3.5rem; width: 80%; }
.skeleton--subtitle { height: 2rem;   width: 60%; }
.skeleton--bar      { height: 4rem;   width: 100%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* Error */
.book-intro__error {
  text-align: center;
  padding: 4rem 2rem;
  color: #d0c5af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.book-intro__retry {
  padding: 0.5rem 1.5rem;
  border: 1px solid #f2ca50;
  background: transparent;
  color: #f2ca50;
  cursor: pointer;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: background 0.2s, color 0.2s;
}

.book-intro__retry:hover {
  background: #f2ca50;
  color: #3c2f00;
}

/* Layout */
.book-intro__layout {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

@media (min-width: 1024px) {
  .book-intro__layout {
    flex-direction: row;
    align-items: flex-start;
    gap: 3rem;
  }

  .book-intro__main {
    flex: 3;
    min-width: 0;
  }

  .book-intro__sidebar-col {
    flex: 1;
    min-width: 0;
    max-width: 280px;
    align-self: flex-start;
    position: sticky;
    top: 7.5rem;
  }
}

/* Header */
.book-intro__header {
  margin-bottom: 3rem;
}

.book-intro__tag {
  display: block;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-style: italic;
  color: #f2ca50;
  margin-top: 0.5rem;
}

.book-intro__headline {
  font-family: 'EB Garamond', serif;
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 500;
  color: #f2ca50;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
}

/* Decorative divider */
.book-intro__divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #99907c, transparent);
  position: relative;
  max-width: 32rem;
  margin: 2rem 0;
}

.book-intro__divider::after {
  content: '◆';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #131313;
  padding: 0 0.625rem;
  color: #f2ca50;
  font-size: 0.75rem;
}

/* Chapters */
.book-intro__chapters {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.book-intro__empty {
  color: #d0c5af;
  padding: 2rem 0;
}

/* Featured grid */
.book-intro__featured-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
