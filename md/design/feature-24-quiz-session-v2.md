# Feature 24 — Quiz Session V2: Immediate Feedback & Summary Screen

## Document Information
- **Feature**: Quiz Session V2 — Immediate per-question feedback + Result Summary Screen
- **Idea doc**: `md/idea/quiz-result-summary-screen.md`
- **Last Updated**: 2026-03-26
- **Scope**: Backend (minor) + Frontend (`QuizSession.vue` rewrite)
- **Effort**: M (~2–3 ngày)

---

## 1. Mục tiêu

| Trước | Sau |
|---|---|
| Chọn đáp án → highlight vàng, không biết đúng/sai | Chọn đáp án → lock + reveal đúng/sai ngay |
| Nộp bài → số điểm to + `<details>` collapsed | Nộp bài → score ring animated + stats + review list luôn mở |
| `correct_answer` không có trong API → review bị lỗi | `correct_answer` trả về đúng lúc theo `exam_type` |

---

## 2. Backend Changes

### 2.1 Bug fix — `correct_answer` missing

**File:** `src/backend/exams/serializers.py`

`PracticeQuestionListSerializer` hiện không có `correct_answer`. Do đó `isCorrect()` trong frontend luôn trả `false` — review screen hiển thị sai hết.

**Fix:** Tạo thêm `PracticeQuestionWithAnswerSerializer` dùng cho PRACTICE/QUIZ:

```python
class PracticeQuestionWithAnswerSerializer(serializers.ModelSerializer):
    """With correct_answer — chỉ dùng cho PRACTICE/QUIZ exam."""
    class Meta:
        model = PracticeQuestion
        fields = ('public_id', 'question_type', 'question_text', 'options',
                  'correct_answer', 'points', 'order', 'difficulty')
```

### 2.2 `ExamDetailSerializer` — trả `correct_answer` theo `exam_type`

**File:** `src/backend/exams/serializers.py`

```python
class ExamDetailSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()   # ← đổi từ PracticeQuestionListSerializer
    total_questions = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()

    def get_questions(self, obj):
        # PRACTICE / QUIZ → trả correct_answer để frontend dùng immediate feedback
        # FINAL_EXAM → ẩn correct_answer (bảo mật bài thi)
        if obj.exam_type in ('PRACTICE', 'QUIZ'):
            return PracticeQuestionWithAnswerSerializer(
                obj.questions.all().order_by('order'), many=True
            ).data
        return PracticeQuestionListSerializer(
            obj.questions.all().order_by('order'), many=True
        ).data

    # ... get_total_questions, get_user_progress giữ nguyên

    class Meta:
        model = Exam
        fields = (
            'public_id', 'title', 'slug', 'description', 'exam_type',
            'time_limit_minutes', 'passing_score', 'total_questions',
            'questions', 'user_progress',
        )
```

> `exam_type` đã có trong response (`ExamDetailSerializer.Meta.fields`). Frontend dùng giá trị này để quyết định behavior.

### 2.3 `ExamSubmitView` — trả per-question results

**File:** `src/backend/exams/views.py`

Thêm `question_results` vào submit response để FINAL_EXAM có thể review sau khi nộp:

```python
# Trong ExamSubmitView.post(), thay thế loop tính điểm hiện tại bằng 1 loop duy nhất:
question_results = []
total_score = 0
max_score = 0
for q in exam.questions.all():
    max_score += q.points
    ans = answers.get(str(q.public_id))
    is_correct = bool(ans and str(ans).strip().lower() == str(q.correct_answer).strip().lower())
    if is_correct:
        total_score += q.points
    question_results.append({
        'question_id': str(q.public_id),
        'correct_answer': q.correct_answer,
        'is_correct': is_correct,
    })

return Response({
    'score': score_pct,
    'max_score': max_score,
    'total_points_earned': total_score,
    'is_passed': is_passed,
    'passing_score': exam.passing_score,
    'attempts': progress.attempts,
    'question_results': question_results,   # ← thêm mới
})
```

> Merge thành 1 loop thay vì 2 (tránh double DB iteration). FINAL_EXAM: frontend lưu `question_results` từ submit response → dùng để render review screen.

---

## 3. Frontend — `QuizSession.vue` Rewrite

### 3.1 State diagram

```
idle → in_progress → submitted
         ↑               |
         └── startQuiz() ┘ (làm lại — luôn shuffle lại câu hỏi)
```

> `startQuiz()` luôn shuffle lại danh sách câu hỏi mỗi lần bắt đầu (kể cả "Làm lại") để tránh memorization theo thứ tự.

**State mới trong `in_progress`:**

```
answered = {
  [questionId]: {
    chosen: 'b',     // option id user đã chọn
    revealed: true,  // true sau khi chọn (lock + show màu)
  }
}
```

### 3.2 Logic phân biệt `exam_type`

| `exam_type` | In-progress behavior | Submit response |
|---|---|---|
| `PRACTICE` / `QUIZ` | Immediate feedback (lock + reveal ngay sau click) | `question_results` có nhưng không cần (đã biết từ `answered` + `correct_answer` trong exam) |
| `FINAL_EXAM` | Classic (highlight vàng, không reveal) | Dùng `question_results` để render review |

```js
const isImmediateFeedback = computed(() =>
  exam.value?.exam_type === 'PRACTICE' || exam.value?.exam_type === 'QUIZ'
)
```

### 3.3 `selectAnswer()` mới

```js
function selectAnswer(optionId) {
  if (!currentQ.value) return
  const qid = currentQ.value.public_id
  if (answered.value[qid]?.revealed) return   // đã lock, không cho đổi
  answered.value[qid] = { chosen: optionId, revealed: false }
  if (isImmediateFeedback.value) {
    // reveal ngay
    answered.value[qid].revealed = true
  }
  // FINAL_EXAM: revealed = false, canAdvance = true nhờ !!a.chosen
}
```

### 3.4 `canAdvance` computed

```js
const canAdvance = computed(() => {
  if (!currentQ.value) return false
  const a = answered.value[currentQ.value.public_id]
  if (!a) return false
  if (isImmediateFeedback.value) return a.revealed   // phải đã reveal
  return !!a.chosen                                  // FINAL_EXAM: chỉ cần đã chọn
})
```

Nút "Câu tiếp / Nộp bài" luôn **hiển thị** nhưng **disabled** khi `canAdvance === false` — không ẩn nút, để user hiểu cần chọn đáp án trước.

```vue
<button
  class="quiz__nav-btn quiz__nav-btn--next"
  :disabled="!canAdvance"
  @click="nextQ"
>
  Câu tiếp
</button>
```

> Không dùng `v-if` ẩn nút — dùng `:disabled` để UX rõ ràng hơn.

### 3.5 Option CSS states (in_progress)

| Trạng thái | Class | Style |
|---|---|---|
| Chưa chọn | (default) | Background mờ, border transparent |
| Đang chọn (chưa reveal) | `--selected` | Border vàng (hiện tại) |
| Revealed — đúng | `--correct` | Border xanh `#66bb6a`, bg xanh nhạt |
| Revealed — sai (user chọn) | `--wrong` | Border đỏ `#ef5350`, bg đỏ nhạt |
| Revealed — mờ (không liên quan) | `--dimmed` | Opacity 0.35 |
| Click animation | CSS `active` | `transform: scale(0.97)`, 100ms |

```js
function optionClass(opt) {
  const qid = currentQ.value.public_id
  const a = answered.value[qid]
  if (!a?.revealed) {
    return a?.chosen === opt.id ? 'quiz__option--selected' : ''
  }
  // revealed state
  if (opt.id === currentQ.value.correct_answer) return 'quiz__option--correct'
  if (opt.id === a.chosen) return 'quiz__option--wrong'
  return 'quiz__option--dimmed'
}
```

> **FINAL_EXAM**: `a.revealed` luôn `false` trong in_progress → chỉ dùng `--selected`. Review dùng `question_results` từ submit response.

### 3.6 Slide transition giữa các câu

```vue
<Transition :name="slideDir">
  <div class="quiz__question-card" :key="qIndex">
    ...
  </div>
</Transition>
```

```js
const slideDir = ref('slide-left')

function nextQ() {
  slideDir.value = 'slide-left'
  qIndex.value++
}
function prevQ() {
  slideDir.value = 'slide-right'
  qIndex.value--
}
```

```css
/* slide-left */
.slide-left-enter-from  { transform: translateX(32px); opacity: 0; }
.slide-left-leave-to    { transform: translateX(-32px); opacity: 0; }
/* slide-right */
.slide-right-enter-from { transform: translateX(-32px); opacity: 0; }
.slide-right-leave-to   { transform: translateX(32px); opacity: 0; }

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active { transition: all 0.2s ease; }
```

---

## 4. Summary Screen (submitted state)

### 4.1 Layout — 3 sections

```
┌─────────────────────────────────┐
│  Section A: Score Hero          │
│  [Score Ring] + Stats pills     │
├─────────────────────────────────┤
│  Section B: Answer Review List  │
│  (luôn visible, không <details>)│
├─────────────────────────────────┤
│  Section C: Actions             │
│  [Làm lại]  [Quay lại]          │
└─────────────────────────────────┘
```

### 4.2 Section A — Score Hero

**Score Ring (SVG):**

```vue
<svg class="quiz__score-ring" viewBox="0 0 96 96" width="96" height="96"
  :aria-label="`Điểm số: ${result?.score ?? 0}/100`" role="img">
  <!-- track -->
  <circle cx="48" cy="48" r="40" fill="none"
    stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
  <!-- fill — animated via JS (cross-browser, Safari safe) -->
  <circle cx="48" cy="48" r="40" fill="none"
    stroke="var(--accent-gold)" stroke-width="8"
    stroke-linecap="round"
    :stroke-dasharray="`${ringDash} 251.2`"
    stroke-dashoffset="0"
    transform="rotate(-90 48 48)"
  />
</svg>
<div class="quiz__score-number">{{ displayScore }}</div>
```

```js
const CIRCUMFERENCE = 251.2   // 2π × 40
const ringDash = ref(0)
const displayScore = ref(0)

// Dùng JS animation (requestAnimationFrame) thay vì CSS transition trên stroke-dasharray
// → tránh lỗi Safari không hỗ trợ transition trên SVG attribute
watch(() => result.value?.score, (target) => {
  if (target === null || target === undefined) return   // fix: 0 là valid score
  const start = Date.now()
  const duration = 700
  const targetDash = (target / 100) * CIRCUMFERENCE
  const tick = () => {
    const elapsed = Date.now() - start
    const progress = Math.min(elapsed / duration, 1)
    // ease-out: 1 - (1-t)^2
    const eased = 1 - Math.pow(1 - progress, 2)
    ringDash.value = Math.round(eased * targetDash * 10) / 10
    displayScore.value = Math.round(eased * target)
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
```

> Dùng chung 1 animation loop cho cả ring và count-up (đồng bộ, không cần 2 watcher riêng).

**Stats pills:**

```js
const stats = computed(() => {
  if (!exam.value?.questions || !answered.value) return { correct: 0, wrong: 0, skipped: 0 }
  let correct = 0, wrong = 0, skipped = 0
  for (const q of exam.value.questions) {
    const a = answered.value[q.public_id]
    if (!a?.chosen) { skipped++; continue }
    // PRACTICE/QUIZ: dùng correct_answer từ exam data
    // FINAL_EXAM: dùng question_results từ submit response
    const isCorr = isImmediateFeedback.value
      ? String(q.correct_answer).toLowerCase() === String(a.chosen).toLowerCase()
      : (submitResults.value[q.public_id]?.is_correct ?? false)
    isCorr ? correct++ : wrong++
  }
  return { correct, wrong, skipped }
})
```

> `submitResults` = `ref({})` — được set sau khi submit: `submitResults.value = Object.fromEntries(res.data.question_results.map(r => [r.question_id, r]))`

**Confetti (CSS only — khi passed):**

```vue
<div v-if="result?.is_passed" class="quiz__confetti" aria-hidden="true">
  <span v-for="n in 6" :key="n" :class="`quiz__confetti-piece quiz__confetti-piece--${n}`"/>
</div>
```

```css
@keyframes confetti-fall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
}
.quiz__confetti { position: absolute; top: 0; left: 50%; pointer-events: none; }
.quiz__confetti-piece {
  position: absolute; width: 8px; height: 8px; border-radius: 2px;
  animation: confetti-fall 1.4s ease-out forwards;
}
.quiz__confetti-piece--1 { background: var(--accent-gold); left: -40px; animation-delay: 0s; }
.quiz__confetti-piece--2 { background: #66bb6a; left: -20px; animation-delay: 0.1s; }
.quiz__confetti-piece--3 { background: #ef5350; left: 0;    animation-delay: 0.2s; }
.quiz__confetti-piece--4 { background: var(--accent-gold); left: 20px; animation-delay: 0.05s; }
.quiz__confetti-piece--5 { background: #66bb6a; left: 40px; animation-delay: 0.15s; }
.quiz__confetti-piece--6 { background: #ef5350; left: 60px; animation-delay: 0.25s; }
```

### 4.3 Section B — Answer Review List

Luôn visible, không dùng `<details>`. Mỗi câu hiển thị tất cả options với highlight đúng/sai.

```vue
<div class="quiz__review-list">
  <div
    v-for="(sq, i) in shuffled"
    :key="sq.public_id"
    class="quiz__review-item"
    :class="reviewItemClass(sq)"
  >
    <div class="quiz__review-header">
      <span class="quiz__review-num">Câu {{ i + 1 }}</span>
      <span class="quiz__review-badge" :class="reviewBadgeClass(sq)">
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
        <span class="quiz__review-opt-id">{{ opt.id.toUpperCase() }}</span>
        <span>{{ opt.text }}</span>
        <span v-if="opt.id === getCorrectAnswerId(sq)" class="quiz__review-opt-tag quiz__review-opt-tag--correct">đúng</span>
        <span v-else-if="opt.id === answered[sq.public_id]?.chosen && !isQuestionCorrect(sq)" class="quiz__review-opt-tag quiz__review-opt-tag--wrong">bạn chọn</span>
      </div>
    </div>
  </div>
</div>
```

```js
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
```

**CSS cho review options:**

```css
.quiz__review-opt { display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border-radius: var(--radius-sm); font-size: 0.8rem; }
.quiz__review-opt--correct { background: rgba(102,187,106,0.12); color: #a5d6a7;
  border-left: 2px solid #66bb6a; }
.quiz__review-opt--wrong   { background: rgba(239,83,80,0.12); color: #ef9a9a;
  border-left: 2px solid #ef5350; }
.quiz__review-opt--neutral { color: rgba(255,255,255,0.3); }
.quiz__review-opt-tag { margin-left: auto; font-size: 0.7rem; font-weight: 700;
  padding: 1px 6px; border-radius: 4px; }
.quiz__review-opt-tag--correct { background: rgba(102,187,106,0.2); color: #a5d6a7; }
.quiz__review-opt-tag--wrong   { background: rgba(239,83,80,0.2);  color: #ef9a9a; }

/* Embedded mode: giới hạn chiều cao review list để không tràn sidebar */
.quiz--embedded .quiz__review-list {
  max-height: 420px;
  overflow-y: auto;
}
```

### 4.4 Section C — Actions

```vue
<div class="quiz__result-actions">
  <button class="quiz__action-btn quiz__action-btn--secondary" @click="startQuiz">
    Làm lại
  </button>
  <button v-if="embedded" class="quiz__action-btn quiz__action-btn--ghost" @click="emit('complete')">
    Đóng
  </button>
  <button v-else class="quiz__action-btn quiz__action-btn--ghost" @click="$router.back()">
    Quay lại
  </button>
</div>
```

---

## 5. Data Flow tổng thể

```
onMounted → trainingService.getExam(activityId)
          → exam.value = { exam_type, questions[{ correct_answer? }], ... }

startQuiz() → shuffle questions → answered = {} → submitResults = {}
            → state = 'in_progress'

selectAnswer(optId):
  PRACTICE/QUIZ → answered[qid] = { chosen, revealed: true }
                → render option colors immediately
  FINAL_EXAM    → answered[qid] = { chosen, revealed: false }
                → canAdvance = true, nút Next active

nextQ() / submitQuiz():
  submitQuiz() → examsService.submitExam()
              → result.value = { score, is_passed, question_results }
              → submitResults.value = { [qid]: { correct_answer, is_correct } }
              → state = 'submitted'
              → refresh exam (để cập nhật user_progress cho lần sau)
```

---

## 6. Files thay đổi

| File | Loại thay đổi |
|---|---|
| `src/backend/exams/serializers.py` | Thêm `PracticeQuestionWithAnswerSerializer`, update `ExamDetailSerializer.get_questions()` |
| `src/backend/exams/views.py` | Thêm `question_results` vào `ExamSubmitView` response |
| `src/frontend/src/components/training/QuizSession.vue` | Rewrite in_progress + submitted state |

---

## 7. Implementation Checklist

### Backend

- [ ] **BE-1** Thêm `PracticeQuestionWithAnswerSerializer` vào `serializers.py`
- [ ] **BE-2** Update `ExamDetailSerializer` dùng `get_questions()` theo `exam_type`
- [ ] **BE-3** Thêm `question_results` vào `ExamSubmitView` response

### Frontend

- [ ] **FE-1** Thêm `answered` ref (replace `answers`) với `{ chosen, revealed }` per question
- [ ] **FE-2** Thêm `submitResults` ref — set từ submit response
- [ ] **FE-3** Thêm `isImmediateFeedback` computed từ `exam.exam_type`
- [ ] **FE-4** Update `selectAnswer()` — lock + reveal logic
- [ ] **FE-5** Thêm `canAdvance` computed — nút Next chỉ active sau khi chọn/reveal
- [ ] **FE-6** `optionClass()` function — trả CSS class theo revealed state
- [ ] **FE-7** Slide transition Vue `<Transition>` + `slideDir` ref
- [ ] **FE-8** CSS `--correct`, `--wrong`, `--dimmed` option states + `active` scale animation
- [ ] **FE-9** Score ring SVG + count-up: dùng chung 1 `requestAnimationFrame` loop, `ringDash` ref thay vì computed (Safari-safe)
- [ ] **FE-11** `stats` computed (correct/wrong/skipped counts)
- [ ] **FE-12** Confetti CSS (`@keyframes confetti-fall`, 6 pieces)
- [ ] **FE-13** Review list — bỏ `<details>`, dùng flat list với tất cả options
- [ ] **FE-14** `reviewOptClass()`, `getCorrectAnswerId()`, `isQuestionCorrect()` functions
- [ ] **FE-15** Actions: Làm lại + Đóng/Quay lại buttons

### Testing

- [ ] PRACTICE exam: chọn đúng → option xanh, chọn sai → option đỏ + show đúng → next
- [ ] FINAL_EXAM: chọn → highlight vàng → next → nộp → review hiện đúng/sai
- [ ] Summary: score ring fill đúng % → count-up → stats đúng
- [ ] Confetti chỉ hiện khi `is_passed = true`
- [ ] Embedded mode (`embedded=true`): nút "Đóng" thay vì "Quay lại"
- [ ] `startQuiz()` (Làm lại): reset `answered`, `submitResults`, `displayScore`

---

*Last updated: 2026-03-26 (v1.1 — PO review fixes: canAdvance disabled not hidden, score=0 bug, single loop submit, JS ring animation Safari-safe, embedded max-height, shuffle note)*
