<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { trainingService } from '../services/training.service'
import { videosService } from '../services/videos.service'
import TrainingModeSelector from '../components/training/TrainingModeSelector.vue'
import FlashcardSession from '../components/training/FlashcardSession.vue'
import QuizSession from '../components/training/QuizSession.vue'

const route  = useRoute()
const router = useRouter()

// ── Infographic (query params from VideoPlayerView) ───────────
// lessonId: UUID used to fetch a fresh signed PDF URL via JWT-authenticated API call
const lessonId            = computed(() => route.query.lessonId || null)
const infographicVideoUrl = computed(() => route.query.video    || null)
const hasInfographic = computed(() => !!(lessonId.value || infographicVideoUrl.value))

// ── PDF signed URL (fetched on demand when user opens Lược đồ tab) ─
const pdfSignedUrl  = ref(null)
const pdfLoading    = ref(false)
const pdfError      = ref(null)

async function fetchPdfUrl() {
  if (!lessonId.value || pdfSignedUrl.value) return
  pdfLoading.value = true
  pdfError.value   = null
  try {
    const res       = await videosService.getInfographicPdfUrl(lessonId.value)
    pdfSignedUrl.value = res.data.url
  } catch {
    pdfError.value = 'Không thể tải lược đồ PDF.'
  } finally {
    pdfLoading.value = false
  }
}

// ── Tabs (Ôn luyện always present; Lược đồ only when lesson has infographic) ─
const activeTab = ref(0)
const tabs = computed(() => {
  const t = [{ label: 'Ôn luyện' }]
  if (hasInfographic.value) t.push({ label: 'Lược đồ' })
  return t
})

// Fetch PDF URL the first time user switches to Lược đồ tab
watch(activeTab, val => {
  if (val === 1) fetchPdfUrl()
})

// ── Detect source from route ──────────────────────────────
const isLesson    = computed(() => route.name === 'TrainingLesson')
const sourceTitle = ref('')

// ── Training state ─────────────────────────────────────────
const activities       = ref([])
const trainingTitle    = ref('')
const loading          = ref(true)
const error            = ref(null)
const selectedActivity = ref(null)

// ── Load training set ─────────────────────────────────────
onMounted(async () => {
  try {
    let res
    if (isLesson.value) {
      res = await trainingService.getTrainingByLesson(route.params.lessonSlug)
    } else {
      res = await trainingService.getTrainingByChapter(
        route.params.bookSlug,
        route.params.chapterOrder,
      )
    }
    const data = res.data
    trainingTitle.value  = data.title ?? 'Luyện tập'
    sourceTitle.value    = data.source_title ?? ''
    activities.value     = data.activities ?? []

    // Auto-select if only one active activity
    const active = activities.value.filter(a => a.is_active)
    if (active.length === 1) {
      selectedActivity.value = active[0]
    }
  } catch (e) {
    error.value = e?.response?.status === 404
      ? 'Chưa có nội dung luyện tập cho bài này.'
      : 'Không thể tải nội dung luyện tập.'
  } finally {
    loading.value = false
  }
})

function selectActivity(activity) {
  selectedActivity.value = activity
}

function backToSelector() {
  selectedActivity.value = null
}

// Back button: inside a session → back to selector; on Lược đồ tab → switch to Ôn luyện tab;
// otherwise → router.back()
function handleBack() {
  if (activeTab.value === 1) {
    activeTab.value = 0
    return
  }
  if (selectedActivity.value) {
    backToSelector()
    return
  }
  router.back()
}
</script>

<template>
  <div class="tv">

    <!-- ── Header ──────────────────────────────────────────── -->
    <header class="tv__header">
      <button class="tv__back-btn" @click="handleBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="tv__header-titles">
        <span class="tv__header-sub">{{ sourceTitle }}</span>
        <span class="tv__header-title">
          {{ activeTab === 1 ? 'Lược đồ' : (selectedActivity ? selectedActivity.title : 'Luyện tập') }}
        </span>
      </div>
      <div style="width:38px"></div>
    </header>

    <!-- ── Tab nav (Ôn luyện | Lược đồ) ─────────────────── -->
    <nav v-if="hasInfographic" class="tv__tab-nav">
      <button
        v-for="(tab, i) in tabs"
        :key="i"
        class="tv__tab-btn"
        :class="{ 'tv__tab-btn--active': activeTab === i }"
        @click="activeTab = i"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- ── Body ───────────────────────────────────────────── -->
    <div class="tv__body">

      <!-- ── Tab 0: Ôn luyện ──────────────────────────────── -->
      <template v-if="activeTab === 0">

        <!-- Loading -->
        <div v-if="loading" class="tv__state">
          <div class="tv__spinner"></div>
          <span>Đang tải...</span>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="tv__state tv__state--error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".4">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{{ error }}</p>
          <button class="tv__btn-back" @click="router.back()">Quay lại</button>
        </div>

        <!-- Mode selector -->
        <div v-else-if="!selectedActivity" class="tv__selector-wrap">
          <TrainingModeSelector
            :activities="activities"
            :title="trainingTitle"
            @select="selectActivity"
          />
        </div>

        <!-- Flashcard session -->
        <FlashcardSession
          v-else-if="selectedActivity.activity_type === 'FLASHCARD'"
          :activity-id="selectedActivity.id"
          :embedded="false"
        />

        <!-- Quiz session -->
        <QuizSession
          v-else-if="selectedActivity.activity_type === 'QUIZ'"
          :activity-id="selectedActivity.id"
          :embedded="false"
          @complete="backToSelector"
        />

      </template>

      <!-- ── Tab 1: Lược đồ PDF ────────────────────────────── -->
      <div v-else-if="activeTab === 1" class="tv__pdf-tab">

        <!-- Loading signed URL -->
        <div v-if="pdfLoading" class="tv__state">
          <div class="tv__spinner"></div>
          <span>Đang tải lược đồ...</span>
        </div>

        <!-- Error fetching signed URL -->
        <div v-else-if="pdfError" class="tv__state tv__state--error">
          <p>{{ pdfError }}</p>
          <button class="tv__btn-back" @click="pdfSignedUrl = null; fetchPdfUrl()">Thử lại</button>
        </div>

        <template v-else>
          <!-- PDF iframe — browser native renderer, src is Bunny CDN signed URL -->
          <iframe
            v-if="pdfSignedUrl"
            :src="pdfSignedUrl + '#toolbar=0'"
            class="tv__pdf-frame"
            title="Lược đồ bài học"
            allowfullscreen
          />

          <!-- Summary video (only shown when no PDF, or below PDF when both exist) -->
          <div v-if="infographicVideoUrl" :class="pdfSignedUrl ? 'tv__video-section' : 'tv__pdf-tab'">
            <div v-if="pdfSignedUrl" class="tv__section-label">Video tóm tắt</div>
            <iframe
              :src="infographicVideoUrl"
              :class="pdfSignedUrl ? 'tv__video-frame' : 'tv__pdf-frame'"
              allowfullscreen
              title="Video tóm tắt bài học"
            />
          </div>
        </template>

      </div>

    </div>
  </div>
</template>

<style scoped>
.tv {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg-main);
}

/* ── Header ────────────────────────────────────────────── */
.tv__header {
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

.tv__back-btn {
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
.tv__back-btn:hover { background: rgba(255,255,255,0.06); }

.tv__header-titles {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 0;
}

.tv__header-sub {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tv__header-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ── Tab nav ────────────────────────────────────────────── */
.tv__tab-nav {
  display: flex;
  background: var(--bg-main);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  position: sticky;
  top: 56px;
  z-index: 9;
}

.tv__tab-btn {
  flex: 1;
  height: 44px;
  background: none;
  color: rgba(255,255,255,0.5);
  font-size: 0.82rem;
  font-weight: 600;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.tv__tab-btn--active {
  color: var(--accent-gold);
  border-bottom-color: var(--accent-gold);
}

.tv__tab-btn:hover:not(.tv__tab-btn--active) {
  color: rgba(255,255,255,0.75);
}

/* ── Body ──────────────────────────────────────────────── */
.tv__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── State (loading / error) ───────────────────────────── */
.tv__state {
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

.tv__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.12);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.tv__state--error { color: rgba(255,255,255,0.45); }

.tv__btn-back {
  background: var(--btn-primary);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
}

/* ── Selector wrap ─────────────────────────────────────── */
.tv__selector-wrap {
  padding: var(--space-lg) var(--space-md);
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
}

/* ── PDF tab ───────────────────────────────────────────── */
.tv__pdf-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tv__pdf-frame {
  flex: 1;
  width: 100%;
  /* Fill remaining viewport: 100dvh minus header (56px) minus tab nav (44px) */
  height: calc(100dvh - 56px - 44px);
  border: none;
  display: block;
}

.tv__video-frame {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: none;
  display: block;
}

.tv__video-section {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.tv__section-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
