<script setup>
/**
 * QuizSession — §8.6
 * embedded: true → ẩn header nav, emit @complete khi nộp xong
 * embedded: false → full-page mode
 */
import { ref, computed, onMounted } from 'vue'
import { trainingService } from '../../services/training.service'
import { examsService } from '../../services/exams.service'

const props = defineProps({
  activityId: { type: String, required: true },
  embedded:   { type: Boolean, default: false },
})

const emit = defineEmits(['complete'])

const exam       = ref(null)
const loading    = ref(false)
const error      = ref(null)
const state      = ref('idle')   // idle | in_progress | submitted
const shuffled   = ref([])
const answers    = ref({})
const qIndex     = ref(0)
const result     = ref(null)
const submitting = ref(false)

const currentQ    = computed(() => shuffled.value[qIndex.value] ?? null)
const isLastQ     = computed(() => qIndex.value === shuffled.value.length - 1)
const progressPct = computed(() =>
  shuffled.value.length ? Math.round((qIndex.value / shuffled.value.length) * 100) : 0
)

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

function startQuiz() {
  shuffled.value = [...(exam.value?.questions ?? [])].sort(() => Math.random() - 0.5)
  answers.value = {}
  qIndex.value = 0
  result.value = null
  state.value = 'in_progress'
}

function selectAnswer(optionId) {
  if (!currentQ.value) return
  answers.value[currentQ.value.public_id] = optionId
}

function prevQ() { if (qIndex.value > 0) qIndex.value-- }
function nextQ() { if (!isLastQ.value) qIndex.value++ }

async function submitQuiz() {
  submitting.value = true
  const payload = Object.entries(answers.value).map(([question_id, answer]) => ({
    question_id, answer,
  }))
  try {
    const res = await examsService.submitExam(exam.value.slug, payload)
    result.value = res.data
    state.value = 'submitted'
    const refreshed = await trainingService.getExam(props.activityId)
    exam.value = refreshed.data
    if (props.embedded) emit('complete')
  } catch {
    error.value = 'Nộp bài thất bại. Thử lại?'
  } finally {
    submitting.value = false
  }
}

function getOptionText(question, answerId) {
  return question?.options?.find(o => o.id === answerId)?.text ?? answerId
}

function getCorrectText(question) {
  return question?.options?.find(o => o.id === question.correct_answer)?.text ?? question?.correct_answer
}

function isCorrect(questionId, givenAnswer) {
  const q = exam.value?.questions?.find(q => q.public_id === questionId)
  return q && String(q.correct_answer).toLowerCase() === String(givenAnswer).toLowerCase()
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN')
}

function motivationMsg(pct) {
  if (pct >= 90) return 'Xuất sắc! Tiếp tục phát huy 🎉'
  if (pct >= 70) return 'Tốt lắm! Bạn đã vượt qua 👍'
  return 'Cố lên! Ôn thêm một lần nữa nhé 💪'
}
</script>

<template>
  <div class="quiz" :class="{ 'quiz--embedded': embedded }">
    <!-- Loading -->
    <div v-if="loading" class="quiz__skeleton-wrap">
      <div class="quiz__skeleton quiz__skeleton--title"></div>
      <div class="quiz__skeleton quiz__skeleton--opt" v-for="n in 4" :key="n"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="quiz__state quiz__state--error">
      {{ error }}
      <button class="quiz__retry-btn" @click="load">Thử lại</button>
    </div>

    <!-- No exam -->
    <div v-else-if="!exam" class="quiz__state quiz__state--empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".3">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <p>Bài kiểm tra chưa được tạo.</p>
    </div>

    <!-- IDLE -->
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
        <span>Lần trước: <strong>{{ exam.user_progress.score }}/100</strong> {{ exam.user_progress.is_passed ? '✅' : '❌' }}</span>
        <span>{{ exam.user_progress.attempts }} lần làm · {{ formatDate(exam.user_progress.last_attempt) }}</span>
      </div>
      <button class="quiz__start-btn" @click="startQuiz">Bắt đầu ôn luyện</button>
    </div>

    <!-- IN PROGRESS -->
    <div v-else-if="state === 'in_progress' && currentQ" class="quiz__progress">
      <div class="quiz__prog-header">
        <span class="quiz__prog-label">Câu {{ qIndex + 1 }} / {{ shuffled.length }}</span>
        <div class="quiz__prog-bar"><div class="quiz__prog-fill" :style="{ width: progressPct + '%' }"></div></div>
      </div>

      <div class="quiz__question-card">
        <p class="quiz__question-text">{{ currentQ.question_text }}</p>

        <div v-if="currentQ.question_type === 'MULTIPLE_CHOICE'" class="quiz__options">
          <button
            v-for="opt in currentQ.options"
            :key="opt.id"
            class="quiz__option"
            :class="{ 'quiz__option--selected': answers[currentQ.public_id] === opt.id }"
            @click="selectAnswer(opt.id)"
          >
            <span class="quiz__option-id">{{ opt.id.toUpperCase() }}</span>
            {{ opt.text }}
          </button>
        </div>

        <div v-else class="quiz__binary-options">
          <button
            v-for="opt in currentQ.options"
            :key="opt.id"
            class="quiz__binary-btn"
            :class="{ 'quiz__binary-btn--selected': answers[currentQ.public_id] === opt.id }"
            @click="selectAnswer(opt.id)"
          >{{ opt.text }}</button>
        </div>
      </div>

      <div class="quiz__nav">
        <button class="quiz__nav-btn" :disabled="qIndex === 0" @click="prevQ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          Câu trước
        </button>
        <button v-if="!isLastQ" class="quiz__nav-btn quiz__nav-btn--next" @click="nextQ">
          Câu tiếp
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button v-else class="quiz__nav-btn quiz__nav-btn--submit" :disabled="submitting" @click="submitQuiz">
          {{ submitting ? 'Đang nộp...' : 'Nộp bài' }}
        </button>
      </div>
    </div>

    <!-- SUBMITTED -->
    <div v-else-if="state === 'submitted' && result" class="quiz__result">
      <div class="quiz__result-score">{{ result.score }} / 100</div>
      <div class="quiz__result-status" :class="result.is_passed ? 'quiz__result-status--pass' : 'quiz__result-status--fail'">
        {{ result.is_passed ? '✅ Đã vượt qua!' : '❌ Chưa đạt' }}
      </div>
      <p class="quiz__result-msg">{{ motivationMsg(result.score) }}</p>

      <details class="quiz__review">
        <summary class="quiz__review-toggle">▼ Xem lại đáp án</summary>
        <div class="quiz__review-list">
          <div
            v-for="(sq, i) in shuffled"
            :key="sq.public_id"
            class="quiz__review-item"
            :class="isCorrect(sq.public_id, answers[sq.public_id]) ? 'quiz__review-item--correct' : 'quiz__review-item--wrong'"
          >
            <span class="quiz__review-icon">{{ isCorrect(sq.public_id, answers[sq.public_id]) ? '✅' : '❌' }}</span>
            <div>
              <p class="quiz__review-q">Câu {{ i + 1 }}: {{ sq.question_text }}</p>
              <p class="quiz__review-ans">
                Đúng: <strong>{{ getCorrectText(sq) }}</strong>
                <span v-if="!isCorrect(sq.public_id, answers[sq.public_id])">
                  · Bạn chọn: {{ getOptionText(sq, answers[sq.public_id]) || '(chưa trả lời)' }}
                </span>
              </p>
            </div>
          </div>
        </div>
      </details>

      <div class="quiz__result-actions">
        <button class="quiz__action-btn" @click="startQuiz">Làm lại</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz { padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-md); min-height: 300px; }
.quiz--embedded { min-height: 0; height: 100%; }

.quiz__state { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); padding: var(--space-xl) 0; font-size: 0.85rem; text-align: center; }
.quiz__state--empty { color: rgba(255,255,255,0.35); }
.quiz__state--error { color: #ef9a9a; }
.quiz__retry-btn { background: var(--bg-card); border-radius: var(--radius-sm); padding: 6px 14px; font-size: 0.8rem; color: var(--accent-gold); }

.quiz__idle { display: flex; flex-direction: column; gap: var(--space-md); }
.quiz__idle-title { font-size: 1rem; font-weight: 800; color: var(--text-primary); }
.quiz__idle-meta { display: flex; gap: 8px; font-size: 0.78rem; color: rgba(255,255,255,0.45); flex-wrap: wrap; }
.quiz__last-result { background: var(--bg-card); border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md); display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; color: rgba(255,255,255,0.6); }
.quiz__start-btn { width: 100%; height: 48px; background: var(--accent-gold); color: #2E1A0F; border-radius: var(--radius-md); font-size: 0.95rem; font-weight: 800; }

.quiz__prog-header { display: flex; flex-direction: column; gap: 6px; }
.quiz__prog-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
.quiz__prog-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.quiz__prog-fill { height: 100%; background: var(--accent-gold); border-radius: 2px; transition: width 0.25s; }

.quiz__question-card { background: var(--bg-card); border-radius: var(--radius-md); padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-md); }
.quiz__question-text { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); line-height: 1.55; }

.quiz__options { display: flex; flex-direction: column; gap: var(--space-sm); }
.quiz__option { display: flex; align-items: center; gap: 10px; padding: 12px var(--space-md); background: rgba(255,255,255,0.05); border-radius: var(--radius-md); border: 1.5px solid transparent; font-size: 0.88rem; color: rgba(255,255,255,0.75); text-align: left; transition: border-color 0.15s, background 0.15s; }
.quiz__option:hover { background: rgba(255,255,255,0.09); }
.quiz__option--selected { border-color: var(--accent-gold); color: var(--accent-gold); background: rgba(197,165,81,0.1); }
.quiz__option-id { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
.quiz__option--selected .quiz__option-id { background: var(--accent-gold); color: #2E1A0F; }

.quiz__binary-options { display: flex; gap: var(--space-sm); }
.quiz__binary-btn { flex: 1; height: 50px; border-radius: var(--radius-md); background: rgba(255,255,255,0.05); border: 1.5px solid transparent; font-size: 0.92rem; font-weight: 700; color: rgba(255,255,255,0.75); transition: border-color 0.15s, background 0.15s; }
.quiz__binary-btn:hover { background: rgba(255,255,255,0.09); }
.quiz__binary-btn--selected { border-color: var(--accent-gold); color: var(--accent-gold); background: rgba(197,165,81,0.1); }

.quiz__nav { display: flex; gap: var(--space-sm); }
.quiz__nav-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; gap: 5px; background: var(--bg-card); border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 600; color: var(--text-primary); transition: background 0.15s; }
.quiz__nav-btn:hover:not(:disabled) { background: rgba(74,44,39,0.9); }
.quiz__nav-btn:disabled { opacity: 0.3; cursor: default; }
.quiz__nav-btn--next { flex-direction: row-reverse; }
.quiz__nav-btn--submit { background: var(--accent-gold); color: #2E1A0F; font-weight: 800; }
.quiz__nav-btn--submit:hover:not(:disabled) { opacity: 0.9; }

.quiz__result { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); text-align: center; }
.quiz__result-score { font-size: 2rem; font-weight: 900; color: var(--text-primary); }
.quiz__result-status { font-size: 1rem; font-weight: 700; }
.quiz__result-status--pass { color: #a5d6a7; }
.quiz__result-status--fail { color: #ef9a9a; }
.quiz__result-msg { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-top: -8px; }

.quiz__review { width: 100%; background: var(--bg-card); border-radius: var(--radius-md); overflow: hidden; }
.quiz__review-toggle { padding: var(--space-sm) var(--space-md); font-size: 0.82rem; color: rgba(255,255,255,0.55); cursor: pointer; user-select: none; }
.quiz__review-list { display: flex; flex-direction: column; gap: 1px; }
.quiz__review-item { display: flex; align-items: flex-start; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: rgba(255,255,255,0.03); }
.quiz__review-item--correct { border-left: 3px solid #66bb6a; }
.quiz__review-item--wrong   { border-left: 3px solid #ef5350; }
.quiz__review-icon { font-size: 0.9rem; padding-top: 2px; flex-shrink: 0; }
.quiz__review-q { font-size: 0.8rem; color: rgba(255,255,255,0.65); line-height: 1.5; }
.quiz__review-ans { font-size: 0.76rem; color: rgba(255,255,255,0.4); margin-top: 2px; }

.quiz__result-actions { width: 100%; }
.quiz__action-btn { width: 100%; height: 44px; background: var(--bg-card); border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }

.quiz__skeleton-wrap { display: flex; flex-direction: column; gap: var(--space-sm); }
.quiz__skeleton { background: rgba(255,255,255,0.07); border-radius: var(--radius-md); animation: shimmer 1.4s infinite; }
.quiz__skeleton--title { height: 24px; width: 60%; }
.quiz__skeleton--opt   { height: 48px; }
@keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
