<script setup>
/**
 * QuizSession — Feature 24 V2
 *
 * Modes (by exam_type):
 *   PRACTICE / QUIZ  → immediate feedback per question (lock + reveal on select)
 *   FINAL_EXAM       → classic mode (highlight only, reveal after submit)
 *
 * Props:
 *   activityId  — TrainingActivity public_id
 *   embedded    — true → hide header nav, emit @complete on submit
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { trainingService } from '../../services/training.service'
import { examsService } from '../../services/exams.service'

const props = defineProps({
  activityId: { type: String, required: true },
  embedded:   { type: Boolean, default: false },
})

const emit = defineEmits(['complete'])
const router = useRouter()

// ─── state ───────────────────────────────────────────────────────────────────

const exam       = ref(null)
const loading    = ref(false)
const error      = ref(null)
const state      = ref('idle')     // idle | in_progress | submitted
const shuffled   = ref([])
const qIndex     = ref(0)
const slideDir   = ref('slide-left')

// answered[questionId] = { chosen: 'b', revealed: true }
// revealed: true after selecting (PRACTICE/QUIZ) or always false until submit (FINAL_EXAM)
const answered      = ref({})

// submitResults[questionId] = { correct_answer: 'a', is_correct: true }
// populated from submit API response — used by FINAL_EXAM review
const submitResults = ref({})

const result     = ref(null)
const submitting = ref(false)

// score ring + count-up animation state
const CIRCUMFERENCE = 251.2  // 2π × 40
const ringDash      = ref(0)
const displayScore  = ref(0)

// ─── computed ────────────────────────────────────────────────────────────────

const currentQ = computed(() => shuffled.value[qIndex.value] ?? null)
const isLastQ  = computed(() => qIndex.value === shuffled.value.length - 1)

const progressPct = computed(() =>
  shuffled.value.length ? Math.round((qIndex.value / shuffled.value.length) * 100) : 0
)

/** PRACTICE/QUIZ: reveal answer immediately on select. FINAL_EXAM: classic mode. */
const isImmediateFeedback = computed(() =>
  exam.value?.exam_type === 'PRACTICE' || exam.value?.exam_type === 'QUIZ'
)

/** Next/Submit button is always visible but disabled until user has answered current question. */
const canAdvance = computed(() => {
  if (!currentQ.value) return false
  const a = answered.value[currentQ.value.public_id]
  if (!a) return false
  if (isImmediateFeedback.value) return a.revealed  // must have revealed
  return !!a.chosen                                 // FINAL_EXAM: chosen is enough
})

/** Stats for summary screen — correct / wrong / skipped counts. */
const stats = computed(() => {
  if (!exam.value?.questions) return { correct: 0, wrong: 0, skipped: 0 }
  let correct = 0, wrong = 0, skipped = 0
  for (const q of exam.value.questions) {
    const a = answered.value[q.public_id]
    if (!a?.chosen) { skipped++; continue }
    const isCorr = isImmediateFeedback.value
      ? String(q.correct_answer).toLowerCase() === String(a.chosen).toLowerCase()
      : (submitResults.value[q.public_id]?.is_correct ?? false)
    isCorr ? correct++ : wrong++
  }
  return { correct, wrong, skipped }
})

// ─── data loading ─────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await trainingService.getExam(props.activityId)
    exam.value = res.data
  } catch (e) {
    if (e.response?.status === 404) {
      exam.value = null
    } else {
      error.value = 'Không thể tải bài ôn luyện.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ─── quiz flow ────────────────────────────────────────────────────────────────

/** Start (or restart) quiz — always reshuffles to prevent memorization. */
function startQuiz() {
  shuffled.value = [...(exam.value?.questions ?? [])].sort(() => Math.random() - 0.5)
  answered.value = {}
  submitResults.value = {}
  ringDash.value = 0
  displayScore.value = 0
  result.value = null
  qIndex.value = 0
  state.value = 'in_progress'
}

function selectAnswer(optionId) {
  if (!currentQ.value) return
  const qid = currentQ.value.public_id
  // Lock: do not allow re-selection after reveal
  if (answered.value[qid]?.revealed) return
  answered.value[qid] = { chosen: optionId, revealed: false }
  if (isImmediateFeedback.value) {
    answered.value[qid].revealed = true
  }
}

function nextQ() {
  if (isLastQ.value) return
  slideDir.value = 'slide-left'
  qIndex.value++
}

function prevQ() {
  if (qIndex.value === 0) return
  slideDir.value = 'slide-right'
  qIndex.value--
}

async function submitQuiz() {
  submitting.value = true
  error.value = null
  const payload = Object.entries(answered.value).map(([question_id, a]) => ({
    question_id,
    answer: a.chosen,
  }))
  try {
    const res = await examsService.submitExam(exam.value.slug, payload)
    result.value = res.data
    // Index submitResults by question_id for O(1) lookup in review
    submitResults.value = Object.fromEntries(
      (res.data.question_results ?? []).map(r => [r.question_id, r])
    )
    state.value = 'submitted'
    // Refresh exam to update user_progress displayed on idle screen next time
    const refreshed = await trainingService.getExam(props.activityId)
    exam.value = refreshed.data
    if (props.embedded) emit('complete')
  } catch {
    error.value = 'Nộp bài thất bại. Thử lại?'
  } finally {
    submitting.value = false
  }
}

// ─── score ring + count-up animation (JS RAF, Safari-safe) ───────────────────

watch(() => result.value?.score, (target) => {
  if (target === null || target === undefined) return  // 0 is a valid score
  const start = Date.now()
  const duration = 700
  const targetDash = (target / 100) * CIRCUMFERENCE
  const tick = () => {
    const elapsed = Date.now() - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 2)  // ease-out quadratic
    ringDash.value = Math.round(eased * targetDash * 10) / 10
    displayScore.value = Math.round(eased * target)
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

// ─── option class helpers ─────────────────────────────────────────────────────

/** Returns BEM modifier class for an option button during in_progress. */
function optionClass(opt) {
  if (!currentQ.value) return ''
  const a = answered.value[currentQ.value.public_id]
  if (!a?.revealed) {
    return a?.chosen === opt.id ? 'quiz__option--selected' : ''
  }
  // Revealed state (PRACTICE/QUIZ only)
  if (opt.id === currentQ.value.correct_answer) return 'quiz__option--correct'
  if (opt.id === a.chosen) return 'quiz__option--wrong'
  return 'quiz__option--dimmed'
}

// ─── review screen helpers ────────────────────────────────────────────────────

function getCorrectAnswerId(question) {
  if (isImmediateFeedback.value) return question.correct_answer
  return submitResults.value[question.public_id]?.correct_answer
}

function isQuestionCorrect(question) {
  if (isImmediateFeedback.value) {
    const a = answered.value[question.public_id]
    return a && String(question.correct_answer).toLowerCase() === String(a.chosen).toLowerCase()
  }
  return submitResults.value[question.public_id]?.is_correct ?? false
}

function reviewOptClass(question, opt) {
  const correctId = getCorrectAnswerId(question)
  const chosenId = answered.value[question.public_id]?.chosen
  if (opt.id === correctId) return 'quiz__review-opt--correct'
  if (opt.id === chosenId && opt.id !== correctId) return 'quiz__review-opt--wrong'
  return 'quiz__review-opt--neutral'
}

// ─── misc ─────────────────────────────────────────────────────────────────────

function motivationMsg(score) {
  if (score >= 90) return 'Xuất sắc! Tiếp tục phát huy'
  if (score >= 70) return 'Tốt lắm! Bạn đã vượt qua'
  return 'Cố lên! Ôn thêm một lần nữa nhé'
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN')
}
</script>

<template>
  <div class="quiz" :class="{ 'quiz--embedded': embedded }">

    <!-- Loading skeleton -->
    <div v-if="loading" class="quiz__skeleton-wrap">
      <div class="quiz__skeleton quiz__skeleton--title"></div>
      <div class="quiz__skeleton quiz__skeleton--opt" v-for="n in 4" :key="n"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error && state !== 'submitted'" class="quiz__state quiz__state--error">
      {{ error }}
      <button class="quiz__retry-btn" @click="load">Thử lại</button>
    </div>

    <!-- No exam -->
    <div v-else-if="!exam" class="quiz__state quiz__state--empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
        width="40" height="40" opacity=".3">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <p>Bài kiểm tra chưa được tạo.</p>
    </div>

    <!-- ── IDLE ── -->
    <div v-else-if="state === 'idle'" class="quiz__idle">
      <div class="quiz__idle-header">
        <h2 class="quiz__idle-title">{{ exam.title }}</h2>
        <div class="quiz__idle-meta">
          <span>{{ exam.total_questions }} câu</span>
          <span>·</span>
          <span>Đạt: ≥{{ exam.passing_score }}%</span>
          <span>·</span>
          <span>{{ exam.time_limit_minutes ? exam.time_limit_minutes + ' phút' : 'Không giới hạn TG' }}</span>
        </div>
      </div>
      <div v-if="exam.user_progress" class="quiz__last-result">
        <span>Lần trước: <strong>{{ exam.user_progress.score }}/100</strong>
          {{ exam.user_progress.is_passed ? '✅' : '❌' }}
        </span>
        <span>{{ exam.user_progress.attempts }} lần làm · {{ formatDate(exam.user_progress.last_attempt) }}</span>
      </div>
      <button class="quiz__start-btn" @click="startQuiz">Bắt đầu ôn luyện</button>
    </div>

    <!-- ── IN PROGRESS ── -->
    <div v-else-if="state === 'in_progress' && currentQ" class="quiz__progress">

      <!-- Progress bar -->
      <div class="quiz__prog-header">
        <span class="quiz__prog-label">Câu {{ qIndex + 1 }} / {{ shuffled.length }}</span>
        <div class="quiz__prog-bar">
          <div class="quiz__prog-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>

      <!-- Question card with slide transition -->
      <Transition :name="slideDir" mode="out-in">
        <div class="quiz__question-card" :key="qIndex">
          <p class="quiz__question-text">{{ currentQ.question_text }}</p>

          <!-- Multiple choice options -->
          <div v-if="currentQ.question_type === 'MULTIPLE_CHOICE'" class="quiz__options">
            <button
              v-for="opt in currentQ.options"
              :key="opt.id"
              class="quiz__option"
              :class="optionClass(opt)"
              :disabled="!!answered[currentQ.public_id]?.revealed"
              @click="selectAnswer(opt.id)"
            >
              <span class="quiz__option-id">{{ opt.id.toUpperCase() }}</span>
              {{ opt.text }}
            </button>
          </div>

          <!-- Binary (True/False) options -->
          <div v-else class="quiz__binary-options">
            <button
              v-for="opt in currentQ.options"
              :key="opt.id"
              class="quiz__binary-btn"
              :class="optionClass(opt)"
              :disabled="!!answered[currentQ.public_id]?.revealed"
              @click="selectAnswer(opt.id)"
            >{{ opt.text }}</button>
          </div>
        </div>
      </Transition>

      <!-- Navigation -->
      <div class="quiz__nav">
        <button class="quiz__nav-btn" :disabled="qIndex === 0" @click="prevQ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          Câu trước
        </button>
        <button
          v-if="!isLastQ"
          class="quiz__nav-btn quiz__nav-btn--next"
          :disabled="!canAdvance"
          @click="nextQ"
        >
          Câu tiếp
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button
          v-else
          class="quiz__nav-btn quiz__nav-btn--submit"
          :disabled="!canAdvance || submitting"
          @click="submitQuiz"
        >
          {{ submitting ? 'Đang nộp...' : 'Nộp bài' }}
        </button>
      </div>

      <!-- Inline error (submit failure) -->
      <p v-if="error" class="quiz__inline-error">{{ error }}</p>
    </div>

    <!-- ── SUBMITTED — Summary screen ── -->
    <div v-else-if="state === 'submitted' && result" class="quiz__result">

      <!-- Confetti (CSS only, shown when passed) -->
      <div v-if="result.is_passed" class="quiz__confetti" aria-hidden="true">
        <span v-for="n in 6" :key="n" :class="`quiz__confetti-piece quiz__confetti-piece--${n}`"/>
      </div>

      <!-- Section A: Score hero -->
      <div class="quiz__score-hero">
        <div class="quiz__score-ring-wrap">
          <svg class="quiz__score-ring" viewBox="0 0 96 96" width="96" height="96"
            :aria-label="`Điểm số: ${result.score}/100`" role="img">
            <!-- track -->
            <circle cx="48" cy="48" r="40" fill="none"
              stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
            <!-- fill — animated via JS RAF (Safari-safe) -->
            <circle cx="48" cy="48" r="40" fill="none"
              stroke="var(--accent-gold)" stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="`${ringDash} 251.2`"
              stroke-dashoffset="0"
              transform="rotate(-90 48 48)"
            />
          </svg>
          <div class="quiz__score-number">{{ displayScore }}</div>
        </div>

        <div class="quiz__score-meta">
          <div class="quiz__result-status"
            :class="result.is_passed ? 'quiz__result-status--pass' : 'quiz__result-status--fail'">
            {{ result.is_passed ? '✓ Đã vượt qua!' : '✗ Chưa đạt' }}
          </div>
          <p class="quiz__result-msg">{{ motivationMsg(result.score) }}</p>

          <!-- Stats pills -->
          <div class="quiz__stats">
            <span class="quiz__stat quiz__stat--correct">✓ {{ stats.correct }} đúng</span>
            <span class="quiz__stat quiz__stat--wrong">✗ {{ stats.wrong }} sai</span>
            <span v-if="stats.skipped" class="quiz__stat quiz__stat--skip">— {{ stats.skipped }} bỏ qua</span>
          </div>
        </div>
      </div>

      <!-- Section B: Answer review list (always visible) -->
      <div class="quiz__review-list">
        <div
          v-for="(sq, i) in shuffled"
          :key="sq.public_id"
          class="quiz__review-item"
          :class="isQuestionCorrect(sq) ? 'quiz__review-item--correct' : 'quiz__review-item--wrong'"
        >
          <div class="quiz__review-header">
            <span class="quiz__review-num">Câu {{ i + 1 }}</span>
            <span class="quiz__review-badge"
              :class="isQuestionCorrect(sq) ? 'quiz__review-badge--correct' : 'quiz__review-badge--wrong'">
              {{ isQuestionCorrect(sq) ? '✓ Đúng' : '✗ Sai' }}
            </span>
          </div>
          <p class="quiz__review-q">{{ sq.question_text }}</p>
          <div class="quiz__review-options">
            <div
              v-for="opt in sq.options"
              :key="opt.id"
              class="quiz__review-opt"
              :class="reviewOptClass(sq, opt)"
            >
              <span v-if="sq.question_type === 'MULTIPLE_CHOICE'" class="quiz__review-opt-id">{{ opt.id.toUpperCase() }}</span>
              <span>{{ opt.text }}</span>
              <span v-if="opt.id === getCorrectAnswerId(sq)"
                class="quiz__review-opt-tag quiz__review-opt-tag--correct">đúng</span>
              <span v-else-if="opt.id === answered[sq.public_id]?.chosen && !isQuestionCorrect(sq)"
                class="quiz__review-opt-tag quiz__review-opt-tag--wrong">bạn chọn</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section C: Actions -->
      <div class="quiz__result-actions">
        <button class="quiz__action-btn quiz__action-btn--primary" @click="startQuiz">
          Làm lại
        </button>
        <button v-if="embedded"
          class="quiz__action-btn quiz__action-btn--ghost"
          @click="emit('complete')">
          Đóng
        </button>
        <button v-else
          class="quiz__action-btn quiz__action-btn--ghost"
          @click="router.back()">
          Quay lại
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.quiz {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 300px;
  position: relative;
}
.quiz--embedded { min-height: 0; height: 100%; }

/* ─── States ─────────────────────────────────────────────── */
.quiz__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) 0;
  font-size: 0.85rem;
  text-align: center;
}
.quiz__state--empty { color: rgba(255,255,255,0.35); }
.quiz__state--error { color: #ef9a9a; }
.quiz__retry-btn {
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: 0.8rem;
  color: var(--accent-gold);
}
.quiz__inline-error {
  font-size: 0.8rem;
  color: #ef9a9a;
  text-align: center;
}

/* ─── Idle ───────────────────────────────────────────────── */
.quiz__idle { display: flex; flex-direction: column; gap: var(--space-md); }
.quiz__idle-title { font-size: 1rem; font-weight: 800; color: var(--text-primary); }
.quiz__idle-meta {
  display: flex;
  gap: 8px;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
  flex-wrap: wrap;
}
.quiz__last-result {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
}
.quiz__start-btn {
  width: 100%;
  height: 48px;
  background: var(--accent-gold);
  color: #2E1A0F;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 800;
}

/* ─── In progress ────────────────────────────────────────── */
.quiz__prog-header { display: flex; flex-direction: column; gap: 6px; }
.quiz__prog-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
.quiz__prog-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.quiz__prog-fill { height: 100%; background: var(--accent-gold); border-radius: 2px; transition: width 0.25s; }

.quiz__question-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.quiz__question-text { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); line-height: 1.55; }

/* Options */
.quiz__options { display: flex; flex-direction: column; gap: var(--space-sm); }
.quiz__option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px var(--space-md);
  background: rgba(255,255,255,0.05);
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.75);
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  cursor: pointer;
}
.quiz__option:hover:not(:disabled):not(.quiz__option--correct):not(.quiz__option--wrong):not(.quiz__option--dimmed) {
  background: rgba(255,255,255,0.09);
}
.quiz__option:active:not(:disabled) { transform: scale(0.97); }
.quiz__option:disabled { cursor: default; }

/* Option states */
.quiz__option--selected  { border-color: var(--accent-gold); color: var(--accent-gold); background: rgba(197,165,81,0.1); }
.quiz__option--correct   { border-color: #66bb6a; color: #a5d6a7; background: rgba(102,187,106,0.12); }
.quiz__option--wrong     { border-color: #ef5350; color: #ef9a9a; background: rgba(239,83,80,0.12); }
.quiz__option--dimmed    { opacity: 0.35; }

.quiz__option-id {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
}
.quiz__option--selected .quiz__option-id { background: var(--accent-gold); color: #2E1A0F; }
.quiz__option--correct  .quiz__option-id { background: #66bb6a; color: #1a3a1a; }
.quiz__option--wrong    .quiz__option-id { background: #ef5350; color: #3a1a1a; }

/* Binary options */
.quiz__binary-options { display: flex; gap: var(--space-sm); }
.quiz__binary-btn {
  flex: 1;
  height: 50px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.05);
  border: 1.5px solid transparent;
  font-size: 0.92rem;
  font-weight: 700;
  color: rgba(255,255,255,0.75);
  transition: border-color 0.15s, background 0.15s;
  cursor: pointer;
}
.quiz__binary-btn:hover:not(:disabled):not(.quiz__option--correct):not(.quiz__option--wrong) {
  background: rgba(255,255,255,0.09);
}
.quiz__binary-btn:active:not(:disabled) { transform: scale(0.97); }
.quiz__binary-btn:disabled { cursor: default; }
.quiz__binary-btn.quiz__option--selected { border-color: var(--accent-gold); color: var(--accent-gold); background: rgba(197,165,81,0.1); }
.quiz__binary-btn.quiz__option--correct  { border-color: #66bb6a; color: #a5d6a7; background: rgba(102,187,106,0.12); }
.quiz__binary-btn.quiz__option--wrong    { border-color: #ef5350; color: #ef9a9a; background: rgba(239,83,80,0.12); }

/* Navigation */
.quiz__nav { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); }
.quiz__nav-btn {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: background 0.15s, opacity 0.15s;
}
.quiz__nav-btn:hover:not(:disabled) { background: rgba(74,44,39,0.9); }
.quiz__nav-btn:disabled { opacity: 0.3; cursor: default; }
.quiz__nav-btn--next { flex-direction: row-reverse; }
.quiz__nav-btn--submit { background: var(--accent-gold); color: #2E1A0F; font-weight: 800; }
.quiz__nav-btn--submit:hover:not(:disabled) { opacity: 0.9; }

/* ─── Slide transitions ──────────────────────────────────── */
.slide-left-enter-from  { transform: translateX(32px); opacity: 0; }
.slide-left-leave-to    { transform: translateX(-32px); opacity: 0; }
.slide-right-enter-from { transform: translateX(-32px); opacity: 0; }
.slide-right-leave-to   { transform: translateX(32px); opacity: 0; }
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active { transition: all 0.2s ease; }

/* ─── Confetti ───────────────────────────────────────────── */
@keyframes confetti-fall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
}
.quiz__confetti { position: absolute; top: 0; left: 50%; pointer-events: none; }
.quiz__confetti-piece {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  animation: confetti-fall 1.4s ease-out forwards;
}
.quiz__confetti-piece--1 { background: var(--accent-gold); left: -40px; animation-delay: 0s; }
.quiz__confetti-piece--2 { background: #66bb6a; left: -20px; animation-delay: 0.1s; }
.quiz__confetti-piece--3 { background: #ef5350; left: 0;     animation-delay: 0.2s; }
.quiz__confetti-piece--4 { background: var(--accent-gold); left: 20px; animation-delay: 0.05s; }
.quiz__confetti-piece--5 { background: #66bb6a; left: 40px; animation-delay: 0.15s; }
.quiz__confetti-piece--6 { background: #ef5350; left: 60px; animation-delay: 0.25s; }

/* ─── Summary screen ─────────────────────────────────────── */
.quiz__result { display: flex; flex-direction: column; gap: var(--space-lg); }

/* Score hero */
.quiz__score-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  text-align: center;
}
.quiz__score-ring-wrap { position: relative; width: 96px; height: 96px; }
.quiz__score-ring { display: block; }
.quiz__score-number {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--text-primary);
}
.quiz__score-meta { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.quiz__result-status { font-size: 1rem; font-weight: 700; }
.quiz__result-status--pass { color: #a5d6a7; }
.quiz__result-status--fail { color: #ef9a9a; }
.quiz__result-msg { font-size: 0.85rem; color: rgba(255,255,255,0.5); }

/* Stats pills */
.quiz__stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
.quiz__stat {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
}
.quiz__stat--correct { background: rgba(102,187,106,0.15); color: #a5d6a7; }
.quiz__stat--wrong   { background: rgba(239,83,80,0.15);   color: #ef9a9a; }
.quiz__stat--skip    { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.45); }

/* ─── Review list ────────────────────────────────────────── */
.quiz__review-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.quiz--embedded .quiz__review-list { max-height: 420px; overflow-y: auto; }

.quiz__review-item {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-left: 3px solid transparent;
}
.quiz__review-item--correct { border-left-color: #66bb6a; }
.quiz__review-item--wrong   { border-left-color: #ef5350; }

.quiz__review-header { display: flex; align-items: center; justify-content: space-between; }
.quiz__review-num { font-size: 0.72rem; color: rgba(255,255,255,0.35); font-weight: 600; }
.quiz__review-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}
.quiz__review-badge--correct { background: rgba(102,187,106,0.15); color: #a5d6a7; }
.quiz__review-badge--wrong   { background: rgba(239,83,80,0.15);   color: #ef9a9a; }

.quiz__review-q { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); line-height: 1.5; }

.quiz__review-options { display: flex; flex-direction: column; gap: 4px; }
.quiz__review-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
}
.quiz__review-opt--correct { background: rgba(102,187,106,0.12); color: #a5d6a7; border-left: 2px solid #66bb6a; }
.quiz__review-opt--wrong   { background: rgba(239,83,80,0.12);   color: #ef9a9a; border-left: 2px solid #ef5350; }
.quiz__review-opt--neutral { color: rgba(255,255,255,0.3); }

.quiz__review-opt-id {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 800;
  flex-shrink: 0;
}
.quiz__review-opt-tag {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.quiz__review-opt-tag--correct { background: rgba(102,187,106,0.2); color: #a5d6a7; }
.quiz__review-opt-tag--wrong   { background: rgba(239,83,80,0.2);   color: #ef9a9a; }

/* ─── Actions ────────────────────────────────────────────── */
.quiz__result-actions { display: flex; gap: var(--space-sm); }
.quiz__action-btn {
  flex: 1;
  height: 44px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 700;
  transition: opacity 0.15s;
}
.quiz__action-btn--primary { background: var(--accent-gold); color: #2E1A0F; }
.quiz__action-btn--ghost   { background: var(--bg-card); color: var(--text-primary); }
.quiz__action-btn:hover    { opacity: 0.85; }

/* ─── Skeleton ───────────────────────────────────────────── */
.quiz__skeleton-wrap { display: flex; flex-direction: column; gap: var(--space-sm); }
.quiz__skeleton { background: rgba(255,255,255,0.07); border-radius: var(--radius-md); animation: shimmer 1.4s infinite; }
.quiz__skeleton--title { height: 24px; width: 60%; }
.quiz__skeleton--opt   { height: 48px; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
