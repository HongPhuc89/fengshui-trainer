# Quiz Result & Summary Screen V2

**Ngày đề xuất:** 2026-03-26
**Nguồn cảm hứng:** Quizizz, Duolingo, Kahoot, Khan Academy
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** M

---

## Vấn đề / Cơ hội

Màn hình kết quả hiện tại (`QuizSession.vue`) chỉ hiển thị điểm số dạng `75/100` + emoji text, review đáp án bị ẩn trong `<details>` (người dùng thường bỏ qua). Trong lúc làm bài, user chọn đáp án → chỉ highlight vàng, không biết đúng/sai cho đến khi nộp hết — mất đi cơ hội học ngay lúc làm.

Cơ hội: Biến từng câu hỏi thành **micro learning moment** — user biết kết quả ngay sau khi chọn, và màn hình summary sau đó cho thấy toàn cảnh rõ ràng.

## Ý tưởng tính năng

### Phần 1 — Immediate Feedback per câu hỏi (in_progress state)

**Core behavior:** Sau khi chọn đáp án → options bị **lock ngay** (không chọn lại được), hiện màu đúng/sai, user nhấn "Câu tiếp" để đi tiếp. Không đợi đến nộp bài.

```
User chọn B  →  [A] mờ
                [B] ❌ đỏ  ← bạn chọn (sai)
                [C] ✅ xanh ← đúng
                [D] mờ

                [Câu tiếp →]   ← nút hiện ra sau khi reveal
```

```
User chọn C  →  [A] mờ
                [B] mờ
                [C] ✅ xanh ← đúng
                [D] mờ

                [Câu tiếp →]   ← nút hiện ra
```

**Chi tiết:**
- State mới per câu: `answered[questionId] = { chosen, revealed }` (local, không submit đến BE)
- Sau khi chọn → set `revealed = true` cho câu đó → re-render options với màu đúng/sai
- Options bị `pointer-events: none` sau khi revealed
- Nút "Câu tiếp / Nộp bài" **chỉ hiện ra sau khi đã chọn** (không cho skip câu chưa chọn)
- Nút Prev vẫn hoạt động (xem lại câu cũ, nhưng không đổi được đáp án)
- Click animation: option scale 0.97 → spring back khi click (CSS `active`, 100ms)
- Slide transition giữa các câu: Vue `<Transition name="slide-q">`, slide left khi next, slide right khi prev

**Phân biệt theo `exam_type`:**
| Mode | Behavior |
|---|---|
| `PRACTICE` / `QUIZ` | Immediate feedback — reveal đúng/sai ngay sau khi chọn |
| `FINAL_EXAM` | Classic mode — chỉ highlight selected (vàng), nộp xong mới review |

**1.2 — Question map / dot grid**
- Row các chấm tròn nhỏ ở trên progress bar: xám = chưa trả lời, xanh = đúng, đỏ = sai
- Nhấn vào dot → nhảy tới câu đó (xem lại)

**1.3 — Không cần unanswered warning nữa**
- Vì user không thể skip câu (nút Next chỉ hiện sau khi chọn) → không thể bỏ câu nào

---

### Phần 2 — Result Summary Screen (submitted state)

Thiết kế lại hoàn toàn màn hình kết quả thành 3 section rõ ràng:

**Section A — Score Hero**
```
┌─────────────────────────────┐
│  [Circular score ring]      │
│      75 / 100               │
│   ✅ Đã vượt qua!           │
│  "Tốt lắm! Tiếp tục nhé"   │
│                             │
│  [Stats row]                │
│  ✅ 15 đúng  ❌ 3 sai  — 2 bỏ │
└─────────────────────────────┘
```
- Score ring: SVG `<circle>` với `stroke-dasharray` animated (fill từ 0% → 75% trong 0.8s)
- Stats row: 3 pill nhỏ: đúng/sai/bỏ qua (không trả lời)
- Nếu passed: confetti animation nhẹ (CSS only, 1-2 giây)

**Section B — Answer Review List (luôn hiển thị, không ẩn trong `<details>`)**

Mỗi câu trong review list:
```
┌─ Câu 1 ─────────────────── ✅ ─┐
│ Bát quái "Càn" tượng trưng      │
│ cho yếu tố gì?                  │
│                                 │
│ ✅ A. Kim / Trời / Cha  ← đúng  │
│    B. Mộc / Đất / Mẹ           │
│    C. Thủy / Đêm               │
│    D. Hỏa / Sáng               │
└─────────────────────────────────┘

┌─ Câu 3 ─────────────────── ❌ ─┐
│ Cung Khảm thuộc mệnh gì?        │
│                                 │
│ ❌ B. Thổ  ← bạn chọn (sai)     │
│ ✅ A. Thủy ← đúng               │
│    C. Mộc                       │
│    D. Hỏa                       │
│                                 │
│ 💡 Giải thích:                  │
│ Cung Khảm thuộc hành Thủy,      │
│ tượng trưng cho hướng Bắc...    │
└─────────────────────────────────┘
```

Chi tiết từng câu:
- Luôn hiện tất cả options (A/B/C/D)
- Câu đúng: cả 4 options, đáp án đúng highlight xanh
- Câu sai: đáp án user chọn = đỏ, đáp án đúng = xanh, 2 còn lại = mờ
- Câu bỏ qua: tất cả mờ, đáp án đúng highlight vàng nhạt
- **`explanation` hiển thị dưới đáp án đúng** (nếu có) — đây là điểm cốt lõi nhất
- Collapsible per-question trên mobile (nhấn tiêu đề câu để expand)

**Section C — Actions**
```
[Làm lại]   [Quay lại khóa học / bài học]
```
- "Làm lại" — restart quiz
- "Quay lại" — navigate back (emit event hoặc router.back())
- Nếu is_passed: thêm nút "Tiếp tục học" → next lesson

---

### Phần 3 — Micro-animations (CSS only, no lib)

| Trigger | Animation |
|---|---|
| Score ring | SVG stroke fill 0 → actual score, 0.8s ease-out |
| Score number | Count-up từ 0 → score, 0.6s |
| Stats pills | Fade + slide up, 0.3s delay sau ring |
| Passed state | Confetti burst (4-6 CSS particles, scale + opacity, 1.5s) |
| Review items | Slide in từ bottom, staggered 50ms per item |
| Wrong answer card | Subtle red glow pulse 1 lần |

Tất cả dùng CSS `@keyframes` + Vue `<Transition>` — không cần thư viện.

---

## Tại sao phù hợp với Thiên Thư

Nội dung Phong Thuỷ/Kỳ Môn/Trạch Nhật rất conceptual và dày kiến thức. Người học thường sai vì chưa nắm rõ ý nghĩa từng khái niệm (ví dụ: phân biệt Bát Quái, Cung Mệnh, Ngũ Hành). `explanation` cho từng câu sai chính là **nơi kiến thức thật sự được truyền đạt** — hiện tại đang bị bỏ phí hoàn toàn. Màn hình summary đẹp cũng tăng cảm giác achievement cho người học niche knowledge.

## Inspiration từ market

- **Quizizz**: Per-question review với tất cả options visible, correct in green + user's wrong answer in red, explanation below. Score donut chart.
- **Duolingo**: Animated XP bar fill, hearts remaining, confetti + owl celebration. Clean "lesson complete" modal.
- **Kahoot**: Stats breakdown (correct/wrong/unanswered counts), per-question accuracy.
- **Khan Academy**: Mastery indicator, "keep practicing" vs "mastered" badge, explanation hints per wrong question.
- **Coursera quizzes**: Collapsible per-question review, show explanation only for wrong answers.

## Scope gợi ý cho V1

**Phải có (V1 — cao giá trị, ít effort):**
- [ ] **Immediate feedback per câu**: lock options sau khi chọn, highlight đúng (xanh) / sai (đỏ + show đúng), nút Next chỉ hiện sau khi chọn
- [ ] Phân biệt `exam_type`: PRACTICE/QUIZ = immediate feedback, FINAL_EXAM = classic mode
- [ ] Click animation: option scale 0.97 spring back (CSS only)
- [ ] Slide transition giữa các câu (Vue Transition)
- [ ] Stats breakdown: đúng/sai counts (computed từ `answered` local state)
- [ ] Answer review list luôn visible (bỏ `<details>` wrapper) với tất cả options + highlight đúng/sai
- [ ] Score ring SVG với animation (CSS only)

**Nâng cao (V1.5):**
- [ ] Question map dot grid (xám/xanh/đỏ theo kết quả từng câu)
- [ ] Confetti CSS animation khi passed
- [ ] Count-up number animation cho score
- [ ] Staggered slide-in cho review items
- [ ] Collapsible per-question card trên mobile
- [ ] "Tiếp tục học" CTA sau khi passed

**Không cần cho V1:**
- Live leaderboard (không có multi-player)
- Shareable result card
- Streak/XP system (riêng biệt, nếu cần thì design riêng)
- Explanation text (chưa có data)

## API impact

Không cần API changes. Toàn bộ data đã có:
- `result.score`, `result.is_passed` — từ submit response
- `exam.questions[].options`, `exam.questions[].correct_answer` — từ exam detail
- `exam.questions[].explanation` — **đã có trong model, BE đã return** (cần verify)
- `answers` — local state trong component

> ⚠️ Cần verify: `explanation` field có được include trong `/api/exams/{slug}/` response không? Check `ExamSerializer`. Nếu chưa có → thêm field vào serializer (1 dòng).

## Open questions

- Exam type "QUIZ" (trong training) vs "FINAL_EXAM" (standalone) — summary screen có cần khác nhau không? (Gợi ý: dùng cùng component, chỉ khác CTA buttons)
- Embedded mode (trong VideoPlayer/BookReader) — summary có hiển thị full hay compact? Gợi ý: compact (chỉ score + stats + minimal review)
- `explanation` field hiện tại có content không? Nếu chưa có content → feature này giá trị thấp hơn cho V1, có thể defer phần explanation

## Bước tiếp theo

- [x] Viết detail design → `md/design/feature-24-quiz-session-v2.md` ✅
