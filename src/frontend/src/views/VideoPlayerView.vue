<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { videosService } from '../services/videos.service'

const auth = useAuthStore()

// ── Watermark ─────────────────────────────────────────────────
const watermarkText = computed(() => auth.user?.email ?? '')

const route  = useRoute()
const router = useRouter()

const lesson  = ref(null)
const course  = ref(null)
const loading = ref(true)
const error   = ref(null)

// ── Video player refs ─────────────────────────────────────────
const videoRef     = ref(null)
const lastSavedAt  = ref(0)
const SAVE_INTERVAL = 15_000 // 15s

// ── Load data ─────────────────────────────────────────────────
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

onBeforeUnmount(() => {
  saveProgress()
})

// ── Navigation between lessons ────────────────────────────────
const sortedLessons = computed(() => {
  return [...(course.value?.lessons ?? [])].sort((a, b) => a.order - b.order)
})

const currentIndex = computed(() => {
  return sortedLessons.value.findIndex(l => l.slug === route.params.lessonSlug)
})

const prevLesson = computed(() => {
  const i = currentIndex.value
  return i > 0 ? sortedLessons.value[i - 1] : null
})

const nextLesson = computed(() => {
  const i = currentIndex.value
  return i >= 0 && i < sortedLessons.value.length - 1 ? sortedLessons.value[i + 1] : null
})

function goToLesson(l) {
  saveProgress()
  router.replace({ name: 'VideoPlayer', params: { slug: route.params.slug, lessonSlug: l.slug } })
}

// ── Video type detection ──────────────────────────────────────
const isEmbedUrl = computed(() => {
  const url = lesson.value?.video_url ?? ''
  return url.includes('iframe') || url.includes('embed') || url.includes('mediadelivery')
})

// ── Progress saving ───────────────────────────────────────────
async function saveProgress() {
  const vid = videoRef.value
  if (!lesson.value || !vid || vid.currentTime <= 0) return
  const sec = Math.floor(vid.currentTime)
  try {
    await videosService.updateProgress(route.params.slug, route.params.lessonSlug, sec)
    lastSavedAt.value = Date.now()
  } catch {
    // silently ignore save errors
  }
}

function onTimeUpdate() {
  if (Date.now() - lastSavedAt.value > SAVE_INTERVAL) {
    saveProgress()
  }
}

async function onEnded() {
  const duration = lesson.value?.duration_seconds ?? videoRef.value?.duration ?? 0
  try {
    await videosService.updateProgress(route.params.slug, route.params.lessonSlug, Math.ceil(duration))
  } catch {
    // silently ignore
  }
}

// ── Helpers ───────────────────────────────────────────────────
function formatDuration(s) {
  if (!s) return ''
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}g ${m}p` : `${m} phút`
}
</script>

<template>
  <div class="vp">
    <!-- ── Header ────────────────────────────────────────── -->
    <header class="vp__header">
      <button class="vp__back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <p class="vp__header-title">{{ course?.title ?? 'Đang tải...' }}</p>
      <div style="width:38px"></div>
    </header>

    <!-- ── Error ─────────────────────────────────────────── -->
    <div v-if="error && !loading" class="vp__error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ error }}
    </div>

    <!-- ── Skeleton ───────────────────────────────────────── -->
    <div v-if="loading" class="vp__player-wrap vp__player-wrap--skeleton"></div>

    <!-- ── Video area ─────────────────────────────────────── -->
    <div v-else-if="lesson" class="vp__player-wrap">
      <!-- Watermark overlay -->
      <div v-if="watermarkText" class="vp__watermark" aria-hidden="true">
        {{ watermarkText }}
      </div>

      <!-- Embed iframe (Bunny Stream) -->
      <iframe
        v-if="isEmbedUrl && lesson.video_url"
        :src="lesson.video_url"
        class="vp__player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe>

      <!-- Native video (local / direct URL) -->
      <video
        v-else-if="lesson.video_url"
        ref="videoRef"
        class="vp__player"
        controls
        preload="metadata"
        @timeupdate="onTimeUpdate"
        @pause="saveProgress"
        @ended="onEnded"
      >
        <source :src="lesson.video_url" type="video/mp4" />
        Trình duyệt của bạn không hỗ trợ phát video.
      </video>

      <!-- No video URL yet -->
      <div v-else class="vp__no-video">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" opacity=".3">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
        <p>Video chưa được upload.</p>
      </div>
    </div>

    <!-- ── Lesson info ────────────────────────────────────── -->
    <div v-if="lesson && !loading" class="vp__body">
      <div class="vp__lesson-header">
        <h1 class="vp__lesson-title">{{ lesson.title }}</h1>
        <span v-if="sortedLessons.length" class="vp__lesson-index">
          {{ currentIndex + 1 }} / {{ sortedLessons.length }}
        </span>
      </div>
      <p v-if="lesson.duration_seconds" class="vp__lesson-dur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {{ formatDuration(lesson.duration_seconds) }}
      </p>

      <!-- Prev / Next navigation -->
      <div class="vp__nav-row">
        <button
          class="vp__nav-btn"
          :disabled="!prevLesson"
          @click="prevLesson && goToLesson(prevLesson)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Bài trước
        </button>

        <button
          class="vp__nav-btn vp__nav-btn--next"
          :disabled="!nextLesson"
          @click="nextLesson && goToLesson(nextLesson)"
        >
          Bài tiếp
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <!-- Description -->
      <div v-if="lesson.description" class="vp__section">
        <h2 class="vp__section-title">Mô tả</h2>
        <p class="vp__section-text">{{ lesson.description }}</p>
      </div>

      <!-- Summary -->
      <div v-if="lesson.summary" class="vp__section">
        <h2 class="vp__section-title">Tóm tắt</h2>
        <p class="vp__section-text">{{ lesson.summary }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vp {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg-main);
  padding-bottom: var(--space-xl);
}

/* ── Header ────────────────────────────────────────────────── */
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

/* ── Player ────────────────────────────────────────────────── */
.vp__player-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  position: relative;
  overflow: hidden;
}
.vp__player-wrap--skeleton {
  background: rgba(255,255,255,0.07);
  animation: shimmer 1.4s infinite;
}
.vp__player {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.vp__no-video {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  color: rgba(255,255,255,0.35);
  font-size: 0.85rem;
  background: rgba(255,255,255,0.03);
}

/* ── Body ──────────────────────────────────────────────────── */
.vp__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
}

.vp__lesson-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}
.vp__lesson-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
}
.vp__lesson-index {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  padding-top: 4px;
}
.vp__lesson-dur {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
  margin-top: -var(--space-sm);
}

/* ── Prev / Next nav ───────────────────────────────────────── */
.vp__nav-row {
  display: flex;
  gap: var(--space-sm);
}
.vp__nav-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: background 0.15s;
}
.vp__nav-btn:hover:not(:disabled) { background: rgba(74,44,39,0.9); }
.vp__nav-btn:disabled { opacity: 0.3; cursor: default; }
.vp__nav-btn--next { flex-direction: row-reverse; }

/* ── Sections ──────────────────────────────────────────────── */
.vp__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
}
.vp__section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.vp__section-text {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.7);
  line-height: 1.65;
  white-space: pre-line;
}

/* ── Error ─────────────────────────────────────────────────── */
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

/* ── Watermark ─────────────────────────────────────────────── */
.vp__watermark {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  user-select: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85), 0 0 8px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  -webkit-font-smoothing: antialiased;
  animation: wm-drift 120s linear infinite;
}

@keyframes wm-drift {
  0%   { top: 12%;  left:  8%; }
  20%  { top: 72%;  left: 55%; }
  40%  { top: 18%;  left: 68%; }
  60%  { top: 68%;  left: 10%; }
  80%  { top: 40%;  left: 40%; }
  100% { top: 12%;  left:  8%; }
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
}
</style>
