<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { videosService } from '../services/videos.service'
import VideoPlayerArea from '../components/video/VideoPlayerArea.vue'
import LessonMeta      from '../components/video/LessonMeta.vue'
import LessonNav       from '../components/video/LessonNav.vue'
import VideoSidebar    from '../components/video/VideoSidebar.vue'

const auth   = useAuthStore()
const route  = useRoute()
const router = useRouter()

// ── Data ──────────────────────────────────────────────────────
const lesson  = ref(null)
const course  = ref(null)
const loading = ref(true)
const error   = ref(null)

// ── Tabs ──────────────────────────────────────────────────────
const activeTab = ref(0)
const TABS = [
  { label: 'Tóm tắt AI' },
  { label: 'Flashcards' },
  { label: 'Ôn luyện'   },
]

// ── Video player ref (for triggering save on navigation) ───────
const playerAreaRef = ref(null)

// ── Watermark ─────────────────────────────────────────────────
const watermarkText = computed(() => auth.user?.email ?? '')

// ── Video type detection ───────────────────────────────────────
const isEmbedUrl = computed(() => {
  const url = lesson.value?.video_url ?? ''
  return url.includes('iframe') || url.includes('embed') || url.includes('mediadelivery')
})

// ── Load data ─────────────────────────────────────────────────
async function loadLesson() {
  loading.value = true
  error.value   = null
  lesson.value  = null
  try {
    const res    = await videosService.getLesson(route.params.slug, route.params.lessonSlug)
    lesson.value = res.data
  } catch {
    error.value = 'Không thể tải bài học.'
  }
  loading.value = false
}

onMounted(async () => {
  const [lessonRes, courseRes] = await Promise.allSettled([
    videosService.getLesson(route.params.slug, route.params.lessonSlug),
    videosService.getVideoDetail(route.params.slug),
  ])
  if (lessonRes.status === 'fulfilled') {
    lesson.value = lessonRes.value.data
  } else {
    error.value = 'Không thể tải bài học.'
  }
  if (courseRes.status === 'fulfilled') {
    course.value = courseRes.value.data
  }
  loading.value = false
})

// Reload lesson when navigating between lessons in the same course
watch(() => route.params.lessonSlug, loadLesson)

onBeforeUnmount(() => playerAreaRef.value?.saveProgress())

// ── Lesson navigation ──────────────────────────────────────────
const sortedLessons = computed(() =>
  [...(course.value?.lessons ?? [])].sort((a, b) => a.order - b.order)
)

const currentIndex = computed(() =>
  sortedLessons.value.findIndex(l => l.slug === route.params.lessonSlug)
)

const prevLesson = computed(() => {
  const i = currentIndex.value
  return i > 0 ? sortedLessons.value[i - 1] : null
})

const nextLesson = computed(() => {
  const i = currentIndex.value
  return i >= 0 && i < sortedLessons.value.length - 1 ? sortedLessons.value[i + 1] : null
})

function goToLesson(l) {
  if (!l) return
  playerAreaRef.value?.saveProgress()
  activeTab.value = 0
  router.replace({ name: 'VideoPlayer', params: { slug: route.params.slug, lessonSlug: l.slug } })
}
</script>

<template>
  <div class="vp">

    <!-- ── Header ──────────────────────────────────────────── -->
    <header class="vp__header">
      <button class="vp__back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <p class="vp__header-title">{{ course?.title ?? 'Đang tải...' }}</p>
      <div style="width:38px"></div>
    </header>

    <!-- ── Body: stacked mobile / side-by-side desktop ──────── -->
    <div class="vp__body">

      <!-- ── Main column (left on desktop) ───────────────────── -->
      <div class="vp__main">

        <!-- Error -->
        <div v-if="error && !loading" class="vp__error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error }}
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="vp__skeleton"></div>

        <!-- Video player -->
        <VideoPlayerArea
          v-else-if="lesson"
          ref="playerAreaRef"
          :lesson="lesson"
          :watermark-text="watermarkText"
          :is-embed-url="isEmbedUrl"
          :course-slug="route.params.slug"
          :lesson-slug="route.params.lessonSlug"
        />

        <!-- Lesson metadata -->
        <LessonMeta
          v-if="lesson && !loading"
          :lesson="lesson"
          :current-index="currentIndex"
          :total-count="sortedLessons.length"
        />

        <!-- Description -->
        <div v-if="lesson && !loading && lesson.description" class="vp__description">
          <h2 class="vp__description-title">Mô tả</h2>
          <p class="vp__description-text">{{ lesson.description }}</p>
        </div>

        <!-- Prev / Next navigation -->
        <LessonNav
          v-if="lesson && !loading"
          :prev-lesson="prevLesson"
          :next-lesson="nextLesson"
          @go-prev="goToLesson(prevLesson)"
          @go-next="goToLesson(nextLesson)"
        />

      </div>

      <!-- ── Sidebar column (right on desktop, below on mobile) ── -->
      <VideoSidebar
        v-if="lesson && !loading"
        v-model="activeTab"
        :lesson="lesson"
        :course-slug="route.params.slug"
        :lesson-slug="route.params.lessonSlug"
        :tabs="TABS"
      />

    </div>
  </div>
</template>

<style scoped>
/* ── Base (mobile-first) ──────────────────────────────────── */
.vp {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg-main);
  padding-bottom: 80px; /* clearance for fixed LessonNav */
}

/* ── Header ───────────────────────────────────────────────── */
.vp__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  height: 56px;
  padding: 0 var(--space-md);
  background: var(--bg-main);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}
.vp__back-btn {
  background: none;
  color: var(--accent-gold);
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.vp__back-btn:hover { background: rgba(255,255,255,0.06); }
.vp__header-title {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Body ─────────────────────────────────────────────────── */
.vp__body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* ── Main ─────────────────────────────────────────────────── */
.vp__main {
  display: flex;
  flex-direction: column;
}

/* ── Skeleton ─────────────────────────────────────────────── */
.vp__skeleton {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: rgba(255,255,255,0.07);
  animation: shimmer 1.4s infinite;
}

/* ── Description ──────────────────────────────────────────── */
.vp__description {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  margin: var(--space-sm) var(--space-md);
}
.vp__description-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.vp__description-text {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.7);
  line-height: 1.65;
  white-space: pre-line;
}

/* ── Error ────────────────────────────────────────────────── */
.vp__error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: rgba(193,49,35,0.15);
  border: 1px solid rgba(193,49,35,0.4);
  border-radius: var(--radius-md);
  color: #ef9a9a;
  font-size: 0.85rem;
  padding: var(--space-sm) var(--space-md);
  margin: var(--space-md);
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
}

/* ══ Desktop layout (≥ 960px) ════════════════════════════════ */
@media (min-width: 960px) {
  /* No extra padding — LessonNav is no longer fixed */
  .vp {
    padding-bottom: 0;
  }

  /* Two-column body */
  .vp__body {
    flex-direction: row;
    align-items: flex-start;
  }

  /* Left column grows, scrolls with page */
  .vp__main {
    flex: 1;
    min-width: 0;
  }

  /* Right column: sticky sidebar */
  :deep(.video-sidebar) {
    width: 380px;
    flex-shrink: 0;
    position: sticky;
    top: 56px;
    height: calc(100dvh - 56px);
    overflow: hidden;
    border-left: 1px solid rgba(255,255,255,0.08);
    background: var(--bg-main);
  }

  /* Tab content scrolls within the sidebar */
  :deep(.video-sidebar__content) {
    overflow-y: auto;
    flex: 1;
  }

  /* Tab nav is always visible at top of sidebar — no sticky needed */
  :deep(.tab-nav) {
    position: relative;
    top: auto;
    flex-shrink: 0;
  }

  /* LessonNav: switch from fixed to sticky at bottom of main column */
  :deep(.lesson-nav) {
    position: sticky;
    bottom: 0;
    left: auto;
    right: auto;
    z-index: 5;
    padding-bottom: var(--space-sm);
  }
}
</style>
