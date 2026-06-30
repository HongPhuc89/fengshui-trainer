<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { videosService } from '../../services/videos.service'
import FullscreenIcon from './FullscreenIcon.vue'

const props = defineProps({
  lesson:        { type: Object,  required: true },
  watermarkText: { type: String,  default: ''    },
  isEmbedUrl:    { type: Boolean, required: true },
  courseSlug:    { type: String,  required: true },
  lessonSlug:    { type: String,  required: true },
})

const videoRef      = ref(null)
const playerWrapRef = ref(null)
const lastSavedAt   = ref(0)
const SAVE_INTERVAL = 15_000
const isFullscreen  = ref(false)

// ── Progress saving ───────────────────────────────────────────
async function saveProgress() {
  const vid = videoRef.value
  if (!vid || vid.currentTime <= 0) return
  try {
    await videosService.updateProgress(props.courseSlug, props.lessonSlug, Math.floor(vid.currentTime))
    lastSavedAt.value = Date.now()
  } catch {
    // silently ignore
  }
}

function onTimeUpdate() {
  if (Date.now() - lastSavedAt.value > SAVE_INTERVAL) saveProgress()
}

async function onEnded() {
  const duration = props.lesson.duration_seconds ?? videoRef.value?.duration ?? 0
  try {
    await videosService.updateProgress(props.courseSlug, props.lessonSlug, Math.ceil(duration))
  } catch {
    // silently ignore
  }
}

// ── Embed (iframe) progress tracking ─────────────────────────
// Cross-origin iframes don't emit timeupdate/ended events, so we track
// elapsed wall-clock time as a proxy for watch time.
const embedStartedAt = ref(0)
const embedTimerId   = ref(null)

async function saveEmbedProgress() {
  const elapsed = Math.floor((Date.now() - embedStartedAt.value) / 1000)
  if (elapsed <= 0) return
  try {
    await videosService.updateProgress(props.courseSlug, props.lessonSlug, elapsed)
  } catch {
    // silently ignore
  }
}

function startEmbedTimer() {
  embedStartedAt.value = Date.now()
  embedTimerId.value = setInterval(saveEmbedProgress, SAVE_INTERVAL)
}

function stopEmbedTimer() {
  if (embedTimerId.value) {
    clearInterval(embedTimerId.value)
    embedTimerId.value = null
  }
}

// ── Fullscreen ────────────────────────────────────────────────
// Use a custom overlay button instead of the native iframe/video fullscreen button.
// Reason: requestFullscreen() must be called DIRECTLY from a user gesture.
// Calling it inside exitFullscreen().then(requestFullscreen) is rejected by the browser.
// Button is hidden in Zalo WebView where the Fullscreen API is unavailable.
function toggleFullscreen() {
  const wrap = playerWrapRef.value
  if (!wrap) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    wrap.requestFullscreen()
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  if (props.isEmbedUrl) startEmbedTimer()
})
onBeforeUnmount(() => {
  if (props.isEmbedUrl) {
    stopEmbedTimer()
    saveEmbedProgress()
  } else {
    saveProgress()
  }
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

defineExpose({ saveProgress })
</script>

<template>
  <div ref="playerWrapRef" class="player-area">

    <!-- Watermark overlay -->
    <div v-if="watermarkText" class="player-area__watermark" aria-hidden="true">
      {{ watermarkText }}
    </div>

    <!-- Custom fullscreen button (works for both iframe and native video) -->
    <button
      v-if="lesson.video_url"
      class="player-area__fs-btn"
      :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
      @click="toggleFullscreen"
    >
      <FullscreenIcon :compressed="isFullscreen" />
    </button>

    <!-- Embed iframe (Bunny Stream) — no allowfullscreen so the iframe cannot -->
    <!-- go fullscreen on its own; the custom button above handles it instead. -->
    <iframe
      v-if="isEmbedUrl && lesson.video_url"
      :src="lesson.video_url"
      class="player-area__player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      loading="lazy"
    ></iframe>

    <!-- Native video — controlsList="nofullscreen" hides the native fullscreen button -->
    <video
      v-else-if="lesson.video_url"
      ref="videoRef"
      class="player-area__player"
      controls
      controlsList="nofullscreen"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @pause="saveProgress"
      @ended="onEnded"
    >
      <source :src="lesson.video_url" type="video/mp4" />
      Your browser does not support video playback.
    </video>

    <!-- No URL -->
    <div v-else class="player-area__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" opacity=".3">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <p>No video uploaded yet.</p>
    </div>

  </div>
</template>

<style scoped>
.player-area {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  position: relative;
  overflow: hidden;
}

/* When the container enters fullscreen, fill the entire screen */
.player-area:fullscreen,
.player-area:-webkit-full-screen,
.player-area:-moz-full-screen {
  aspect-ratio: unset;
  width: 100%;
  height: 100%;
}

.player-area__player {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Hide the native fullscreen button on the video element (Chrome/Safari/Edge) */
.player-area__player::-webkit-media-controls-fullscreen-button {
  display: none;
}

.player-area__empty {
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

/* ── Custom fullscreen button ──────────────────────────────── */
.player-area__fs-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 6;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.55);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s, background 0.15s;
  backdrop-filter: blur(4px);
}
.player-area:hover .player-area__fs-btn,
.player-area:fullscreen .player-area__fs-btn,
.player-area:-webkit-full-screen .player-area__fs-btn {
  opacity: 1;
}
.player-area__fs-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

@media (max-width: 768px) {
  .player-area__fs-btn {
    display: none;
  }
}

/* ── Watermark ──────────────────────────────────────────────── */
.player-area__watermark {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  user-select: none;
  color: rgba(255,255,255,0.55);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.5);
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
</style>
