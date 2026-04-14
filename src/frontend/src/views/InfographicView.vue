<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { videosService } from '../services/videos.service'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const route  = useRoute()
const router = useRouter()

const loading      = ref(true)
const error        = ref(null)
const containerRef = ref(null)
const pdfDoc       = shallowRef(null)
const canvases     = ref([])          // one canvas element per page
const renderingTasks = []

// ── Load PDF ──────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await videosService.getInfographicPdfUrlBySlug(route.params.lessonSlug)
    const pdfUrl = res.data.url

    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl })
    pdfDoc.value = await loadingTask.promise

    loading.value = false
    await nextTick()
    await renderAllPages()
    setupResizeObserver()
  } catch (e) {
    error.value = e?.response?.status === 404
      ? 'Bài học này chưa có lược đồ PDF.'
      : 'Không thể tải lược đồ. Vui lòng thử lại.'
    loading.value = false
  }
})

onBeforeUnmount(() => {
  renderingTasks.forEach(t => { try { t.cancel() } catch (_) {} })
  if (resizeObserver) resizeObserver.disconnect()
})

// ── Render ────────────────────────────────────────────────
async function renderAllPages() {
  if (!pdfDoc.value || !containerRef.value) return
  const numPages = pdfDoc.value.numPages
  const dpr = window.devicePixelRatio || 1
  const containerWidth = containerRef.value.clientWidth || window.innerWidth

  for (let i = 0; i < numPages; i++) {
    const pageNum = i + 1
    const page = await pdfDoc.value.getPage(pageNum)
    const defaultViewport = page.getViewport({ scale: 1 })
    const scale = (containerWidth / defaultViewport.width) * dpr
    const viewport = page.getViewport({ scale })

    const canvas = canvases.value[i]
    if (!canvas) continue

    canvas.width  = viewport.width
    canvas.height = viewport.height
    canvas.style.width  = `${viewport.width / dpr}px`
    canvas.style.height = `${viewport.height / dpr}px`

    const ctx  = canvas.getContext('2d')
    const task = page.render({ canvasContext: ctx, viewport })
    renderingTasks[i] = task
    try {
      await task.promise
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') throw e
    }
  }
}

// ── Re-render on orientation / resize ────────────────────
let resizeObserver = null
function setupResizeObserver() {
  if (!containerRef.value || !window.ResizeObserver) return
  let lastW = 0
  resizeObserver = new ResizeObserver((entries) => {
    const w = entries[0].contentRect.width
    if (Math.abs(w - lastW) > 1) {
      lastW = w
      renderingTasks.forEach(t => { try { t.cancel() } catch (_) {} })
      renderingTasks.length = 0
      renderAllPages()
    }
  })
  resizeObserver.observe(containerRef.value)
}
</script>

<template>
  <div class="ig">

    <!-- Header -->
    <header class="ig__header">
      <button class="ig__back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="ig__title">Lược đồ</span>
      <div style="width:38px"></div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="ig__state">
      <div class="ig__spinner"></div>
      <span>Đang tải lược đồ...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="ig__state ig__state--error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".4">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button class="ig__btn-back" @click="router.back()">Quay lại</button>
    </div>

    <!-- PDF canvas pages -->
    <div v-else-if="pdfDoc" ref="containerRef" class="ig__scroll">
      <canvas
        v-for="n in pdfDoc.numPages"
        :key="n"
        :ref="el => { if (el) canvases[n - 1] = el }"
        class="ig__canvas"
      />
    </div>

  </div>
</template>

<style scoped>
.ig {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg-main);
}

/* Header */
.ig__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--space-md);
  background: var(--bg-main);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.ig__back-btn {
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
.ig__back-btn:hover { background: rgba(255,255,255,0.06); }

.ig__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* States */
.ig__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
  padding: var(--space-xl);
}
.ig__state--error { color: rgba(255,255,255,0.45); }

.ig__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.12);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.ig__btn-back {
  background: var(--btn-primary);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
}

/* Scrollable PDF container */
.ig__scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.ig__canvas {
  display: block;
  width: 100%;
  height: auto;
}
</style>
