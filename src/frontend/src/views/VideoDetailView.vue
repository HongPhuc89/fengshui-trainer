<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { videosService } from '../services/videos.service'
import GemIcon from '../components/icons/GemIcon.vue'
import { clearApiCache } from '../api/cache-storage'
import LessonListTab from '../components/video/LessonListTab.vue'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const course   = ref(null)
const progress = ref(null)
const loading  = ref(true)
const error    = ref(null)

onMounted(async () => {
  const [courseRes, progressRes] = await Promise.allSettled([
    videosService.getVideoDetail(route.params.slug),
    videosService.getCourseProgress(route.params.slug),
  ])
  if (courseRes.status === 'fulfilled') {
    course.value = courseRes.value.data
  } else {
    error.value = 'Không thể tải thông tin khóa học.'
  }
  if (progressRes.status === 'fulfilled') {
    progress.value = progressRes.value.data
  }
  loading.value = false
})

// ── Access control ────────────────────────────────────────────
const canAccess = computed(() => {
  if (!course.value) return false
  if (course.value.is_free) return true
  if (auth.user?.user_type === 'VIP') return true
  if (course.value.has_purchased) return true
  return false
})

function canAccessLesson(lesson) {
  if (lesson.is_free) return true
  return canAccess.value
}

// ── Navigation ────────────────────────────────────────────────
async function startOrContinue() {
  const lessons = course.value?.lessons
  if (!lessons?.length) return
  try {
    const { data } = await videosService.getLastLesson(course.value.slug)
    const lesson = lessons.find(l => l.public_id === data.lesson_public_id)
    const lessonSlug = lesson?.slug ?? lessons[0].slug
    router.push({ name: 'VideoPlayer', params: { slug: course.value.slug, lessonSlug } })
  } catch {
    router.push({ name: 'VideoPlayer', params: { slug: course.value.slug, lessonSlug: lessons[0].slug } })
  }
}

const buying   = ref(false)
const buyError = ref(null)

async function handleBuy() {
  if (buying.value || !course.value) return
  buying.value = true
  buyError.value = null
  try {
    await videosService.purchaseCourse(course.value.public_id)
    course.value.has_purchased = true
    // Invalidate video catalogue cache so is_purchased reflects correctly on next visit
    clearApiCache()
  } catch (err) {
    const detail = err.response?.data?.detail
    if (detail === 'INSUFFICIENT_FUNDS') {
      buyError.value = 'Số dư Linh Thạch không đủ để mở khóa khóa học này.'
    } else if (detail === 'ALREADY_PURCHASED') {
      course.value.has_purchased = true
    } else {
      buyError.value = 'Mở khóa thất bại. Vui lòng thử lại.'
    }
  } finally {
    buying.value = false
  }
}

// ── Description expand ────────────────────────────────────────
const descExpanded = ref(false)

// ── Helpers ───────────────────────────────────────────────────
function formatDuration(s) {
  if (!s) return ''
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}g ${m}p` : `${m} phút`
}

const LEVEL_MAP = {
  BEGINNER:     { label: 'Cơ bản',    color: '#66bb6a' },
  INTERMEDIATE: { label: 'Trung cấp', color: '#ffa726' },
  ADVANCED:     { label: 'Nâng cao',  color: '#ef5350' },
}
function levelInfo(level) {
  return LEVEL_MAP[level] ?? { label: level, color: 'rgba(255,255,255,0.5)' }
}

</script>

<template>
  <div class="vd">
    <!-- ── Back nav ───────────────────────────────────────── -->
    <div class="vd__nav">
      <button class="vd__back-btn" @click="router.push({ name: 'Videos' })">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span>Khóa học</span>
      </button>
    </div>

    <!-- ── Error ──────────────────────────────────────────── -->
    <div v-if="error && !loading" class="vd__error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ error }}
    </div>

    <!-- ── Skeleton ───────────────────────────────────────── -->
    <template v-if="loading">
      <div class="vd__body">
        <div class="skeleton-line w-80" style="height:18px"></div>
        <div class="skeleton-line w-50" style="height:13px;margin-top:8px"></div>
        <div class="skeleton-line w-60" style="height:12px;margin-top:12px"></div>
        <div class="skeleton-line w-full" style="height:46px;margin-top:20px;border-radius:10px"></div>
        <div class="skeleton-line w-40" style="height:14px;margin-top:24px"></div>
        <div v-for="n in 4" :key="n" class="vd__lesson-skeleton" style="margin-top:10px"></div>
      </div>
    </template>

    <template v-else-if="course">
      <!-- ── Body ───────────────────────────────────────── -->
      <div class="vd__body">
        <!-- Title + instructor -->
        <h1 class="vd__title">{{ course.title }}</h1>
        <p v-if="course.instructor" class="vd__instructor">
          <span class="vd__instructor-dot"></span>
          {{ course.instructor }}
        </p>

        <!-- Tags -->
        <div class="vd__tags">
          <span
            v-if="course.level"
            class="vd__tag vd__tag--level"
            :style="`color:${levelInfo(course.level).color};border-color:${levelInfo(course.level).color}33`"
          >
            {{ levelInfo(course.level).label }}
          </span>
          <span v-if="course.total_lessons" class="vd__tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            {{ course.total_lessons }} bài học
          </span>
          <span v-if="course.total_duration_seconds" class="vd__tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {{ formatDuration(course.total_duration_seconds) }}
          </span>
        </div>

        <!-- Progress bar -->
        <div v-if="progress && progress.completed_lessons > 0" class="vd__progress-wrap">
          <div class="vd__progress-bar">
            <div class="vd__progress-fill" :style="`width:${progress.progress_percent}%`"></div>
          </div>
          <span class="vd__progress-label">
            {{ progress.completed_lessons }}/{{ progress.total_lessons }} bài · {{ progress.progress_percent }}%
          </span>
        </div>

        <!-- CTA button -->
        <button v-if="canAccess" class="vd__cta-btn" @click="startOrContinue">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          {{ progress && progress.completed_lessons > 0 ? 'Tiếp tục học' : 'Bắt đầu học' }}
        </button>
        <button v-else class="vd__cta-btn vd__cta-btn--buy" :disabled="buying" @click="handleBuy">
          <svg v-if="buying" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" style="flex-shrink:0;animation:spin 0.8s linear infinite">
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" style="flex-shrink:0">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Mở khóa với {{ course.price_lt?.toLocaleString('vi-VN') }}
          <GemIcon :size="14" style="flex-shrink:0" />
        </button>
        <p v-if="buyError" class="vd__buy-error">{{ buyError }}</p>

        <!-- Description -->
        <div v-if="course.description" class="vd__desc-wrap">
          <p
            class="vd__desc"
            :class="{ 'vd__desc--collapsed': !descExpanded }"
          >{{ course.description }}</p>
          <button class="vd__desc-toggle" @click="descExpanded = !descExpanded">
            {{ descExpanded ? 'Thu gọn' : 'Xem thêm' }}
          </button>
        </div>

        <!-- Lessons list — reuse LessonListTab (same component as VideoPlayerView sidebar) -->
        <div class="vd__lessons">
          <h2 class="vd__lessons-title">Danh sách bài học</h2>
          <LessonListTab
            :lessons="course.lessons"
            :current-lesson-slug="null"
            :course-slug="course.slug"
            :can-access-lesson="canAccessLesson"
            :show-free-badge="true"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vd {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: var(--space-xl);
}

/* ── Back nav ──────────────────────────────────────────────── */
.vd__nav {
  padding: var(--space-xs) 0 var(--space-sm);
}
.vd__back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  color: var(--accent-gold);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 6px 0;
  min-height: 36px;
}
.vd__back-btn:hover { opacity: 0.8; }

/* ── Body ──────────────────────────────────────────────────── */
.vd__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
}

.vd__title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.35;
}

.vd__instructor {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.55);
}
.vd__instructor-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7c4dff;
  flex-shrink: 0;
}

/* ── Tags ──────────────────────────────────────────────────── */
.vd__tags {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.vd__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.55);
  background: rgba(255,255,255,0.07);
  border-radius: 4px;
  padding: 3px 8px;
}
.vd__tag--level {
  border: 1px solid;
  background: transparent;
  font-weight: 700;
}

/* ── Progress ──────────────────────────────────────────────── */
.vd__progress-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}
.vd__progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}
.vd__progress-fill {
  height: 100%;
  background: var(--accent-gold);
  border-radius: 3px;
  transition: width 0.3s;
}
.vd__progress-label {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.5);
  white-space: nowrap;
}

/* ── CTA button ────────────────────────────────────────────── */
.vd__cta-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  background: var(--accent-gold);
  color: #1a0a00;
  font-size: 1rem;
  font-weight: 800;
  border-radius: var(--radius-md);
  height: 50px;
  width: 100%;
  margin-top: var(--space-xs);
  transition: opacity 0.15s;
}
.vd__cta-btn:hover { opacity: 0.88; }
.vd__cta-btn--buy {
  background: var(--color-action);
  color: #fff;
}
.vd__cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.vd__buy-error {
  font-size: 0.8rem;
  color: #ef9a9a;
  text-align: center;
  margin-top: -4px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Description ───────────────────────────────────────────── */
.vd__desc-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
}
.vd__desc {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.65);
  line-height: 1.6;
  white-space: pre-line;
}
.vd__desc--collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.vd__desc-toggle {
  background: none;
  color: var(--accent-gold);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0;
  text-align: left;
  min-height: 28px;
}

/* ── Lessons list ──────────────────────────────────────────── */
.vd__lessons {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-xs);
}
.vd__lessons-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: var(--space-xs);
}

/* ── Skeleton ──────────────────────────────────────────────── */
.skeleton-line {
  background: rgba(255,255,255,0.07);
  border-radius: 6px;
  animation: shimmer 1.4s infinite;
}
.vd__lesson-skeleton {
  height: 58px;
  background: rgba(255,255,255,0.07);
  border-radius: var(--radius-sm);
  animation: shimmer 1.4s infinite;
}
.w-80  { width: 80%; }
.w-60  { width: 60%; }
.w-50  { width: 50%; }
.w-40  { width: 40%; }
.w-full { width: 100%; }
@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
}

/* ── Error ─────────────────────────────────────────────────── */
.vd__error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: rgba(193,49,35,0.15);
  border: 1px solid rgba(193,49,35,0.4);
  border-radius: var(--radius-md);
  color: #ef9a9a;
  font-size: 0.85rem;
  padding: var(--space-sm) var(--space-md);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (min-width: 480px) {
  .vd__title { font-size: 1.25rem; }
}
@media (min-width: 768px) {
  .vd__title { font-size: 1.4rem; }
}
</style>
