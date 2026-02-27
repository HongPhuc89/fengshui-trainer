<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { videosService } from '../../services/videos.service'

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

// ── Fullscreen ────────────────────────────────────────────────
function onFullscreenChange() {
  const fsEl = document.fullscreenElement
  if (fsEl === videoRef.value) {
    document.exitFullscreen().then(() => playerWrapRef.value?.requestFullscreen())
  }
}

onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange))
onBeforeUnmount(() => {
  saveProgress()
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

    <!-- Embed iframe (Bunny Stream, etc.) -->
    <iframe
      v-if="isEmbedUrl && lesson.video_url"
      :src="lesson.video_url"
      class="player-area__player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>

    <!-- Native video -->
    <video
      v-else-if="lesson.video_url"
      ref="videoRef"
      class="player-area__player"
      controls
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @pause="saveProgress"
      @ended="onEnded"
    >
      <source :src="lesson.video_url" type="video/mp4" />
      Trình duyệt của bạn không hỗ trợ phát video.
    </video>

    <!-- No URL -->
    <div v-else class="player-area__empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" opacity=".3">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <p>Video chưa được upload.</p>
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

.player-area__player {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
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
