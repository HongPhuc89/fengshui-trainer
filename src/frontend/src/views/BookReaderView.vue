<script setup>
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist'
import { booksService } from '../services/books.service'
import { useBreakpoint } from '../composables/useBreakpoint'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

// ── Router ────────────────────────────────────────────────
const route = useRoute()
const router = useRouter()
const bookSlug = route.params.slug

// ── State ─────────────────────────────────────────────────
const book = ref(null)
const chapters = ref([])
const currentChapterOrder = ref(1)
const currentPage = ref(1)
const pdfDoc = shallowRef(null)
const chapterPageCount = ref(0)
const loading = ref(true)
const chapterLoading = ref(false)
const error = ref(null)
const watermark = ref({ display_name: '', phone_number: '' })
const showToc = ref(false)
const showZoom = ref(false)
const zoomLevel = ref(1.0)
const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const canvasRef = ref(null)
const contentAreaRef = ref(null)
const saveTimer = ref(null)
const renderingTask = shallowRef(null)
const touchStartX = ref(0)
const touchStartY = ref(0)
const progressTrackRef = ref(null)
const dragPercent = ref(null)
const currentChapterHasTraining = ref(false)
const pageRendering = ref(false)

// ── DRM & responsive ──────────────────────────────────────
const isBlurred = ref(false)
const { isLg: isDesktop } = useBreakpoint()

// Re-render when content area is resized (handles initial layout + orientation change)
let resizeObserver = null
function setupResizeObserver() {
  if (!contentAreaRef.value || !window.ResizeObserver) return
  let lastW = 0, lastH = 0
  resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect
    if (!pdfDoc.value) return
    if (Math.abs(width - lastW) > 1 || Math.abs(height - lastH) > 1) {
      lastW = width; lastH = height
      renderPage(currentPage.value)
    }
  })
  resizeObserver.observe(contentAreaRef.value)
}

// Re-render current page when switching between desktop/mobile
watch(isDesktop, () => {
  if (pdfDoc.value) renderPage(currentPage.value)
})

// ── Computed ──────────────────────────────────────────────
const currentChapter = computed(() =>
  chapters.value.find((c) => c.order === currentChapterOrder.value),
)

const totalBookPages = computed(() =>
  chapters.value.reduce((s, c) => s + (c.page_count || 0), 0),
)

const bookProgressPercent = computed(() => {
  if (!totalBookPages.value) return 0
  const pagesBeforeCurrent = chapters.value
    .filter((c) => c.order < currentChapterOrder.value)
    .reduce((s, c) => s + (c.page_count || 0), 0)
  return Math.round(((pagesBeforeCurrent + currentPage.value) / totalBookPages.value) * 100)
})

const displayPercent = computed(() =>
  dragPercent.value !== null ? Math.round(dragPercent.value) : bookProgressPercent.value,
)

const hasPrev = computed(() => currentPage.value > 1 || currentChapterOrder.value > 1)
const hasNext = computed(
  () =>
    currentPage.value < chapterPageCount.value ||
    currentChapterOrder.value < chapters.value.length,
)

const watermarkText = computed(() => {
  const { display_name, phone_number } = watermark.value
  if (!display_name) return ''
  return phone_number ? `${display_name} - ${phone_number}` : display_name
})

const watermarkBgImage = computed(() => {
  if (!watermarkText.value) return 'none'
  const text = watermarkText.value
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="120">
    <text x="140" y="70" fill="rgba(0,0,0,0.6)" font-size="13" text-anchor="middle"
      transform="rotate(-30,140,70)" font-family="sans-serif" font-weight="600">${text}</text>
  </svg>`
  return `url("data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}")`
})

// ── Init ──────────────────────────────────────────────────
onMounted(async () => {
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('visibilitychange', onVisibilityChange)
  setupResizeObserver()

  try {
    const [bookRes, progressRes] = await Promise.allSettled([
      booksService.getBookDetail(bookSlug),
      booksService.getBookProgress(bookSlug),
    ])

    if (bookRes.status !== 'fulfilled') {
      error.value = 'Không thể tải thông tin sách.'
      loading.value = false
      return
    }

    book.value = bookRes.value.data
    chapters.value = book.value.chapters ?? []

    let startChapter = 1
    let startPage = 1
    const queryChapter = parseInt(route.query.chapter)
    if (!isNaN(queryChapter) && queryChapter >= 1) {
      startChapter = queryChapter
    } else if (progressRes.status === 'fulfilled') {
      startChapter = progressRes.value.data.chapter_order ?? 1
      startPage = progressRes.value.data.current_page ?? 1
    }

    currentChapterOrder.value = startChapter
    loading.value = false   // reveal canvas BEFORE loading PDF
    await nextTick()
    await new Promise(resolve => requestAnimationFrame(resolve))
    await loadChapter(startChapter, startPage)
  } catch (e) {
    console.error('[BookReader] load error:', e)
    error.value = e?.message || 'Đã xảy ra lỗi khi mở sách.'
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (saveTimer.value) clearTimeout(saveTimer.value)
  if (renderingTask.value) renderingTask.value.cancel()
  if (resizeObserver) resizeObserver.disconnect()
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// ── Chapter / PDF loading ─────────────────────────────────
async function loadChapter(order, page = 1) {
  chapterLoading.value = true
  error.value = null
  try {
    const [chapterRes, watermarkRes] = await Promise.allSettled([
      booksService.getChapter(bookSlug, order),
      booksService.getWatermarkConfig(bookSlug, order),
    ])

    if (chapterRes.status !== 'fulfilled') {
      error.value = 'Không có quyền truy cập chương này.'
      chapterLoading.value = false
      return
    }

    if (watermarkRes.status === 'fulfilled') {
      watermark.value = watermarkRes.value.data
    }

    const { file_url, page_count, has_training_set } = chapterRes.value.data
    chapterPageCount.value = page_count ?? 0
    currentChapterHasTraining.value = !!has_training_set
    // Canvas is always in DOM — wait for layout then render, hide loading only after done
    await nextTick()
    await new Promise(resolve => requestAnimationFrame(resolve))
    await loadPdf(file_url, page)
    chapterLoading.value = false
  } catch (e) {
    console.error('[BookReader] chapter error:', e)
    error.value = e?.message || 'Không thể tải chương.'
    chapterLoading.value = false
  }
}

async function loadPdf(url, targetPage = 1) {
  if (renderingTask.value) {
    renderingTask.value.cancel()
    renderingTask.value = null
  }
  pdfDoc.value = await pdfjsLib.getDocument({ url }).promise
  chapterPageCount.value = pdfDoc.value.numPages

  // Sync real page count back into chapters array so totalBookPages stays accurate
  const idx = chapters.value.findIndex((c) => c.order === currentChapterOrder.value)
  if (idx !== -1) chapters.value[idx].page_count = pdfDoc.value.numPages

  currentPage.value = Math.min(Math.max(1, targetPage), pdfDoc.value.numPages)
  await renderPage(currentPage.value)
}

async function renderPage(num) {
  if (!pdfDoc.value || !canvasRef.value) return
  if (renderingTask.value) {
    renderingTask.value.cancel()
    renderingTask.value = null
  }

  pageRendering.value = true
  const page = await pdfDoc.value.getPage(num)
  const defaultViewport = page.getViewport({ scale: 1 })
  const dpr = window.devicePixelRatio || 1

  // Use contentAreaRef dimensions; fallback to window so it's always > 0.
  const el = contentAreaRef.value
  const areaWidth = (el?.clientWidth > 0 ? el.clientWidth : null) ?? window.innerWidth
  const areaHeight = (el?.clientHeight > 0 ? el.clientHeight : null) ?? window.innerHeight

  let baseScale
  if (isDesktop.value) {
    const scaleByWidth = areaWidth / defaultViewport.width
    const scaleByHeight = areaHeight / defaultViewport.height
    baseScale = Math.min(scaleByWidth, scaleByHeight)
  } else {
    baseScale = areaWidth / defaultViewport.width
  }
  const scale = baseScale * dpr * zoomLevel.value
  const viewport = page.getViewport({ scale })

  const canvas = canvasRef.value
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${viewport.width / dpr}px`
  canvas.style.height = `${viewport.height / dpr}px`

  const ctx = canvas.getContext('2d')
  renderingTask.value = page.render({ canvasContext: ctx, viewport })
  try {
    await renderingTask.value.promise
  } finally {
    renderingTask.value = null
    pageRendering.value = false
  }
}

// ── Navigation ────────────────────────────────────────────
async function goToPage(num) {
  const clamped = Math.max(1, Math.min(num, chapterPageCount.value))
  currentPage.value = clamped
  await renderPage(clamped)
  scheduleSave()
}

async function prevPage() {
  if (currentPage.value > 1) {
    await goToPage(currentPage.value - 1)
  } else if (currentChapterOrder.value > 1) {
    const prevOrder = currentChapterOrder.value - 1
    currentChapterOrder.value = prevOrder
    const prevChapter = chapters.value.find((c) => c.order === prevOrder)
    const lastPage = prevChapter?.page_count ?? 1
    await loadChapter(prevOrder, lastPage)
    scheduleSave()
  }
}

async function nextPage() {
  if (currentPage.value < chapterPageCount.value) {
    await goToPage(currentPage.value + 1)
  } else if (currentChapterOrder.value < chapters.value.length) {
    const nextOrder = currentChapterOrder.value + 1
    currentChapterOrder.value = nextOrder
    await loadChapter(nextOrder, 1)
    scheduleSave()
  }
}

async function goToChapter(order) {
  showToc.value = false
  currentChapterOrder.value = order
  await loadChapter(order, 1)
  scheduleSave()
}

// ── Zoom ──────────────────────────────────────────────────
function zoomIn() {
  const idx = ZOOM_STEPS.indexOf(zoomLevel.value)
  if (idx < ZOOM_STEPS.length - 1) {
    zoomLevel.value = ZOOM_STEPS[idx + 1]
    renderPage(currentPage.value)
  }
}

function zoomOut() {
  const idx = ZOOM_STEPS.indexOf(zoomLevel.value)
  if (idx > 0) {
    zoomLevel.value = ZOOM_STEPS[idx - 1]
    renderPage(currentPage.value)
  }
}

// ── Touch / swipe ─────────────────────────────────────────
function onTouchStart(e) {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX.value
  const dy = e.changedTouches[0].clientY - touchStartY.value
  if (Math.abs(dx) > 50 && Math.abs(dy) < 80) {
    if (dx < 0) nextPage()
    else prevPage()
  }
}

// ── Keyboard shortcuts ────────────────────────────────────
function onKeyDown(e) {
  // Guard 1: skip when user is typing in an input element
  const tag = document.activeElement?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      prevPage()
      break
    case 'ArrowRight':
      e.preventDefault()
      nextPage()
      break
    case ' ':
      e.preventDefault()
      if (e.shiftKey) prevPage()
      else nextPage()
      break
    case '+':
    case '=':
      e.preventDefault()
      zoomIn()
      break
    case '-':
      e.preventDefault()
      zoomOut()
      break
    case 't':
    case 'T':
      e.preventDefault()
      showToc.value = !showToc.value
      showZoom.value = false
      break
    case 'Escape':
      if (showToc.value) showToc.value = false
      else if (showZoom.value) showZoom.value = false
      break
  }
}

// ── DRM: blur canvas when tab loses focus ─────────────────
function onVisibilityChange() {
  isBlurred.value = document.hidden
}

// ── Progress track drag ───────────────────────────────────
function calcPctFromPointer(e) {
  const track = progressTrackRef.value
  if (!track) return null
  const rect = track.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

async function seekToPercent(pct) {
  if (!totalBookPages.value || !chapters.value.length) return
  const targetGlobal = Math.max(1, Math.min(Math.round(pct * totalBookPages.value), totalBookPages.value))
  let accumulated = 0
  for (const ch of chapters.value) {
    const count = ch.page_count || 0
    if (targetGlobal <= accumulated + count) {
      const localPage = Math.max(1, targetGlobal - accumulated)
      if (ch.order !== currentChapterOrder.value) {
        currentChapterOrder.value = ch.order
        await loadChapter(ch.order, localPage)
      } else {
        await goToPage(localPage)
      }
      scheduleSave()
      return
    }
    accumulated += count
  }
  // Edge: clamp to last page of last chapter
  const last = chapters.value[chapters.value.length - 1]
  if (last.order !== currentChapterOrder.value) {
    currentChapterOrder.value = last.order
    await loadChapter(last.order, last.page_count || 1)
  } else {
    await goToPage(last.page_count || 1)
  }
  scheduleSave()
}

function onProgressPointerDown(e) {
  e.preventDefault()
  const pct = calcPctFromPointer(e)
  if (pct === null) return
  dragPercent.value = pct * 100

  function onMove(ev) {
    const p = calcPctFromPointer(ev)
    if (p !== null) dragPercent.value = p * 100
  }
  function onUp(ev) {
    const p = calcPctFromPointer(ev)
    dragPercent.value = null
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    if (p !== null) seekToPercent(p)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

// ── Progress saving ───────────────────────────────────────
function scheduleSave() {
  if (saveTimer.value) clearTimeout(saveTimer.value)
  saveTimer.value = setTimeout(() => {
    booksService
      .saveChapterProgress(bookSlug, currentChapterOrder.value, {
        current_page: currentPage.value,
        completed: currentPage.value >= chapterPageCount.value,
      })
      .catch(() => {})
  }, 1500)
}
</script>

<template>
  <div class="reader" @contextmenu.prevent>
    <!-- ── Top bar ─────────────────────────────────────── -->
    <div class="reader__topbar">
      <button class="reader__icon-btn" @click="router.push({ name: 'BookDetail', params: { slug: bookSlug } })" aria-label="Quay lại">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div class="reader__titles">
        <span class="reader__chapter-title">{{ currentChapter?.title ?? '' }}</span>
      </div>

      <!-- Zoom button + popup -->
      <div class="reader__zoom-wrap">
        <button
          class="reader__icon-btn reader__zoom-btn"
          :class="{ 'reader__icon-btn--active': showZoom }"
          @click="showZoom = !showZoom"
          aria-label="Thu phóng"
        >
          <span class="reader__zoom-indicator">{{ Math.round(zoomLevel * 100) }}%</span>
        </button>
        <Transition name="zoom-pop">
          <div v-if="showZoom" class="reader__zoom-panel" @click.stop>
            <button class="reader__zoom-step" :disabled="zoomLevel <= ZOOM_STEPS[0]" @click="zoomOut">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <span class="reader__zoom-value">{{ Math.round(zoomLevel * 100) }}%</span>
            <button class="reader__zoom-step" :disabled="zoomLevel >= ZOOM_STEPS[ZOOM_STEPS.length-1]" @click="zoomIn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </Transition>
      </div>

      <!-- Training button (only when chapter has active training) -->
      <button
        v-if="currentChapterHasTraining"
        class="reader__icon-btn"
        @click="router.push({ name: 'TrainingChapter', params: { bookSlug, chapterOrder: currentChapterOrder } })"
        aria-label="Luyện tập"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </button>

      <button
        class="reader__icon-btn"
        @click="showToc = !showToc; showZoom = false"
        aria-label="Mục lục"
        :class="{ 'reader__icon-btn--active': showToc }"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="15" y2="18" />
        </svg>
      </button>
    </div>

    <!-- ── Body (TOC sidebar + content, flex-row on desktop) ── -->
    <div class="reader__body" :class="{ 'reader__body--desktop': isDesktop }">

      <!-- ── Table of contents ────────────────────────── -->
      <Transition :name="isDesktop ? '' : 'toc'">
        <div
          v-if="showToc || isDesktop"
          class="reader__toc"
          :class="{ 'reader__toc--desktop': isDesktop }"
          @click.self="!isDesktop && (showToc = false)"
        >
          <div class="reader__toc-panel">
            <div class="reader__toc-header">
              <span>Mục lục</span>
              <button v-if="!isDesktop" class="reader__icon-btn" @click="showToc = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div class="reader__toc-list">
              <button
                v-for="ch in chapters"
                :key="ch.order"
                class="reader__toc-item"
                :class="{ 'reader__toc-item--active': ch.order === currentChapterOrder }"
                @click="goToChapter(ch.order)"
              >
                <span class="reader__toc-order">{{ ch.order }}</span>
                <span class="reader__toc-name">{{ ch.title }}</span>
                <span v-if="ch.is_demo" class="reader__toc-demo">Demo</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ── Main content ──────────────────────────────── -->
      <div
        ref="contentAreaRef"
        class="reader__content"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
        @click="showZoom && (showZoom = false)"
      >
        <!-- Loading overlay: absolute, covers canvas until render is done -->
        <div v-if="loading || chapterLoading || pageRendering" class="reader__loading reader__loading--overlay">
          <div class="reader__spinner"></div>
          <span>{{ loading ? 'Đang tải sách...' : chapterLoading ? 'Đang tải chương...' : '' }}</span>
        </div>

        <!-- Error state -->
        <div v-if="error && !loading && !chapterLoading" class="reader__error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{{ error }}</p>
          <button class="reader__btn-back" @click="router.push({ name: 'BookDetail', params: { slug: bookSlug } })">Quay lại</button>
        </div>

        <!-- PDF canvas: always in DOM so canvasRef is always available -->
        <div
          class="reader__canvas-wrap"
          :class="{ 'reader__canvas-wrap--blurred': isBlurred }"
        >
          <canvas ref="canvasRef" class="reader__canvas"></canvas>

          <!-- Watermark overlay -->
          <div
            v-if="watermarkText"
            class="reader__watermark"
            :style="{ backgroundImage: watermarkBgImage }"
            aria-hidden="true"
          ></div>

          <!-- Page footer -->
          <div class="reader__page-footer">
            <span class="reader__page-num">TRANG {{ currentPage }}</span>
            <span class="reader__page-user">{{ watermark.display_name?.toUpperCase() }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Progress bar ───────────────────────────────── -->
    <div v-if="!loading && !error" class="reader__progress-bar">
      <span class="reader__progress-label">{{ displayPercent }}%</span>
      <div
        class="reader__progress-track"
        ref="progressTrackRef"
        @pointerdown.prevent="onProgressPointerDown"
      >
        <div class="reader__progress-fill" :style="{ width: displayPercent + '%' }"></div>
        <div class="reader__progress-thumb" :style="{ left: displayPercent + '%' }"></div>
      </div>
      <span class="reader__progress-label">100%</span>
    </div>

    <!-- ── Bottom nav ─────────────────────────────────── -->
    <div v-if="!loading && !error" class="reader__bottom-nav">
      <button
        class="reader__nav-btn"
        :disabled="!hasPrev"
        @click="prevPage"
        aria-label="Trang trước"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="19 20 9 12 19 4" />
          <line x1="5" y1="4" x2="5" y2="20" />
        </svg>
      </button>

      <!-- Page indicator -->
      <div class="reader__page-indicator">
        <span>{{ currentPage }}</span>
        <span class="reader__page-sep">/</span>
        <span>{{ chapterPageCount }}</span>
      </div>

      <button
        class="reader__nav-btn"
        :disabled="!hasNext"
        @click="nextPage"
        aria-label="Trang tiếp"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="5 4 15 12 5 20" />
          <line x1="19" y1="4" x2="19" y2="20" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Full-screen layout ───────────────────────────────────── */
.reader {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #1a2035;
  color: var(--text-primary);
  z-index: 100;
  overflow: hidden;
}

/* ── Top bar ──────────────────────────────────────────────── */
.reader__topbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: var(--top-bar-height);
  padding: 0 var(--space-md);
  background: rgba(26, 32, 53, 0.96);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  z-index: 10;
}

.reader__titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.reader__book-title {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.reader__chapter-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.reader__icon-btn {
  background: none;
  color: rgba(255, 255, 255, 0.7);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}

.reader__icon-btn:hover,
.reader__icon-btn--active {
  color: var(--accent-gold);
  background: rgba(255, 255, 255, 0.07);
}

/* ── Table of contents overlay ───────────────────────────── */
.reader__toc {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.reader__toc-panel {
  width: min(320px, 85vw);
  height: 100%;
  background: #1e2540;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader__toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.reader__toc-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) 0;
}

.reader__toc-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 12px var(--space-md);
  background: none;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.88rem;
  text-align: left;
  transition: background 0.12s;
  border-radius: 0;
}

.reader__toc-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.reader__toc-item--active {
  color: var(--accent-gold);
  background: rgba(197, 165, 81, 0.1);
}

.reader__toc-order {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.reader__toc-item--active .reader__toc-order {
  background: var(--accent-gold);
  color: #1a0a00;
}

.reader__toc-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reader__toc-demo {
  font-size: 0.65rem;
  font-weight: 700;
  background: rgba(197, 165, 81, 0.2);
  color: var(--accent-gold);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* ── Content area ─────────────────────────────────────────── */
.reader__content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  align-items: center;
  justify-content: center;
  background: #1a2035;
  min-height: 0;
}

.reader__loading--overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: #1a2035;
}

.reader__loading,
.reader__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  height: 100%;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.9rem;
}

.reader__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.reader__btn-back {
  background: var(--btn-primary);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
}

/* ── Canvas wrapper ───────────────────────────────────────── */
.reader__canvas-wrap {
  margin-top: 10px;
  position: relative;
  width: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.reader__canvas {
  display: block;
  max-width: none;
  margin: 0 auto;
}

/* ── Watermark ────────────────────────────────────────────── */
.reader__watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-repeat: repeat;
  background-size: 280px 120px;
  opacity: 0.18;
}

/* ── Page footer (inside canvas wrap) ───────────────────────── */
.reader__page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px var(--space-md);
  background: #1a2035;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);
}

.reader__page-num {
  color: rgba(255, 255, 255, 0.6);
}

.reader__page-user {
  color: rgba(255, 255, 255, 0.45);
}

/* ── Progress bar ─────────────────────────────────────────── */
.reader__progress-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px var(--space-md);
  background: rgba(26, 32, 53, 0.96);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.reader__progress-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  min-width: 32px;
  text-align: center;
}

.reader__progress-track {
  flex: 1;
  height: 20px;
  position: relative;
  cursor: pointer;
  touch-action: none;
  display: flex;
  align-items: center;
}

.reader__progress-track::before {
  content: '';
  position: absolute;
  inset: 8px 0;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
}

.reader__progress-fill {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  background: var(--accent-gold);
  border-radius: 2px;
  transition: width 0.2s ease;
  pointer-events: none;
}

.reader__progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: var(--accent-gold);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px rgba(197, 165, 81, 0.6);
  pointer-events: none;
  transition: left 0.2s ease;
}

/* ── Bottom nav ───────────────────────────────────────────── */
.reader__bottom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-xl);
  height: 60px;
  background: rgba(26, 32, 53, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.reader__nav-btn {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.75);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.reader__nav-btn:hover:not(:disabled) {
  background: rgba(197, 165, 81, 0.2);
  color: var(--accent-gold);
}

.reader__nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.reader__page-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.reader__page-sep {
  color: rgba(255, 255, 255, 0.3);
}

/* ── Zoom ─────────────────────────────────────────────────── */
.reader__zoom-wrap {
  position: relative;
  flex-shrink: 0;
}

.reader__zoom-indicator {
  font-size: 0.72rem;
  font-weight: 700;
  color: inherit;
  min-width: 36px;
  text-align: center;
  letter-spacing: 0.02em;
}

.reader__zoom-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: #1e2540;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  padding: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}

.reader__zoom-step {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.8);
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s;
}

.reader__zoom-step:hover:not(:disabled) {
  background: rgba(197, 165, 81, 0.2);
  color: var(--accent-gold);
}

.reader__zoom-step:disabled {
  opacity: 0.3;
  cursor: default;
}

.reader__zoom-value {
  min-width: 44px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-gold);
}

/* zoom popup animation */
.zoom-pop-enter-active,
.zoom-pop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.zoom-pop-enter-from,
.zoom-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.95);
}

/* ── TOC slide transition ─────────────────────────────────── */
.toc-enter-active,
.toc-leave-active {
  transition: opacity 0.2s;
}
.toc-enter-active .reader__toc-panel,
.toc-leave-active .reader__toc-panel {
  transition: transform 0.25s ease;
}
.toc-enter-from,
.toc-leave-to {
  opacity: 0;
}
.toc-enter-from .reader__toc-panel,
.toc-leave-to .reader__toc-panel {
  transform: translateX(100%);
}

/* ── Body row (TOC sidebar + content) ────────────────────── */
.reader__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.reader__body--desktop {
  flex-direction: row;
}

/* ── TOC desktop sidebar mode ─────────────────────────────── */
.reader__toc--desktop {
  position: static;
  background: transparent;
  z-index: auto;
  width: 260px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  order: 1;
}

.reader__toc--desktop .reader__toc-panel {
  width: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.reader__toc--desktop .reader__toc-list {
  flex: 1;
  overflow-y: auto;
}

/* Content stays on the left (order: 0 is default, explicit for clarity) */
.reader__body--desktop .reader__content {
  flex: 1;
  min-width: 0;
  order: 0;
}

/* ── DRM: blur canvas when tab loses focus ────────────────── */
.reader__canvas-wrap--blurred canvas {
  filter: blur(14px);
  pointer-events: none;
}

.reader__canvas-wrap {
  user-select: none;
}
</style>
