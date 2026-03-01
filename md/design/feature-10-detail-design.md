# Feature 10: Simplified Flashcard — Random Study, No SM-2

**Date:** 2026-02-28
**Status:** Draft v1
**Scope:** Bỏ SM-2 review workflow; đơn giản hóa flashcard thành random study mode thuần túy trong video player

---

## 1. Mục tiêu

- Bỏ toàn bộ SM-2 spaced repetition (FlashcardReview, rating, due badge, due count).
- Giữ tab Flashcard trong video player sidebar nhưng đơn giản hóa: chỉ flip card + navigate.
- Mỗi lần user mở tab hoặc bấm "Lấy bộ mới" → random 20 card từ flashcard của bài học đang xem.
- Bỏ TrainingView full-page routes (không còn standalone training session).

---

## 2. Những gì bị bỏ

| Component / Behavior | Lý do bỏ |
|----------------------|-----------|
| SM-2 algorithm (FlashcardReview model tracking) | Không có data analysis, user không quay lại review |
| Rating buttons (Hard / OK / Easy) | Phụ thuộc vào SM-2 |
| Due card badge trên VideoTabNav | Phụ thuộc vào due_count từ SM-2 |
| Due card priority trong ActivityFlashcardsView | Thay bằng pure random |
| `POST /api/practice/flashcards/<id>/review/` | Không còn rating |
| TrainingView.vue (full-page) | User không navigate ra khỏi video |
| Routes `/training/lesson/:slug` và `/training/module/:slug` | TrainingView bị bỏ |
| Completion stats (số lượng hard/ok/easy) | Không còn rating |
| `@due-count` emit và handler | Không còn badge |
| `@go-quiz` emit từ FlashcardSession | Không còn cross-tab navigation |

---

## 3. Những gì được giữ

| Component | Trạng thái |
|-----------|-----------|
| Tab Flashcard trong VideoSidebar | Giữ — đơn giản hóa |
| FlashcardTab.vue | Giữ — bỏ due badge prop |
| FlashcardSession.vue | Refactor — bỏ rating, thêm "Lấy bộ mới" |
| Backend: Flashcard model, TrainingActivity | Giữ nguyên |
| Backend: `GET /api/training/activities/<id>/flashcards/?count=20` | Giữ — đổi logic sang pure random |
| TrainingSet, TrainingActivity | Giữ nguyên |
| FlashcardReview model | Giữ schema (không xóa), chỉ bỏ write API |

> **Lý do giữ FlashcardReview model**: Tránh migration xóa dữ liệu đang tồn tại. Có thể dùng lại cho feature phân tích sau này.

---

## 4. Backend Changes

### 4.1 `ActivityFlashcardsView` — đổi sang pure random

**File:** `exams/views_training.py`

**Hiện tại:** Ưu tiên due cards (SM-2), rồi fill ngẫu nhiên.

```python
# Hiện tại
due_ids = set(activity.flashcards.exclude(
    reviews__user=user, reviews__next_review__gt=now
).values_list('id', flat=True))
due = [f for f in all_flashcards if f.id in due_ids]
not_due = [f for f in all_flashcards if f.id not in due_ids]
random.shuffle(due); random.shuffle(not_due)
selected = (due + not_due)[:count]
```

**Sau khi thay đổi:** Pure random, không query FlashcardReview.

```python
# Mới
flashcards = list(activity.flashcards.all())
random.shuffle(flashcards)
selected = flashcards[:count]
```

**Response thay đổi:**

```json
// Bỏ:
{
  "due_count": 4,
  "flashcards": [{ "is_due": true, "user_review": {...} }]
}

// Mới:
{
  "total": 15,
  "count": 20,
  "flashcards": [
    {
      "public_id": "uuid",
      "front": "...",
      "back": "...",
      "category": "KHÁI NIỆM CỐT LÕI",
      "image": "",
      "difficulty": "MEDIUM"
    }
  ]
}
```

**Serializer:** Dùng `FlashcardForSessionSerializer` hiện có (không có `is_due`, `user_review`).

### 4.2 Bỏ review endpoint

`FlashcardReviewView` tại `POST /api/practice/flashcards/<id>/review/` — giữ nguyên code nhưng frontend không còn gọi.

> Không xóa view để tránh breaking change nếu còn client cũ. Có thể deprecated ở v2.

### 4.3 `TrainingActivitySerializer` — bỏ `due_count`

```python
# Hiện tại
if activity.activity_type == 'FLASHCARD':
    return {'total_count': total, 'due_count': due}

# Mới
if activity.activity_type == 'FLASHCARD':
    return {'total_count': total}
```

**Bỏ prefetch** không còn cần thiết:
```python
# Bỏ — không còn query FlashcardReview khi serialize
Prefetch(
    'activities__flashcards__reviews',
    queryset=FlashcardReview.objects.filter(user=request.user),
),
```

---

## 5. Frontend Changes

### 5.1 VideoTabNav.vue — bỏ badge

```
// Hiện tại: hiện badge đỏ với due_count trên tab Flashcard
// Mới: không có badge, tab Flashcard hiển thị đơn giản
```

**Bỏ props:** `dueBadgeCount`
**Bỏ:** Badge counter render logic

### 5.2 VideoPlayerView.vue / VideoSidebar.vue — bỏ due tracking

```javascript
// Bỏ:
const flashcardDueCount = ref(0)
// Bỏ: @due-count="flashcardDueCount = $event"
// Bỏ: :due-badge-count="flashcardDueCount" truyền xuống VideoTabNav
```

### 5.3 FlashcardTab.vue — bỏ badge prop

```javascript
// Bỏ: emit('due-count', dueCount)
// Bỏ: props liên quan đến due count
// Giữ: load flashcards, hiển thị FlashcardSession
```

### 5.4 FlashcardSession.vue — refactor chính

**Bỏ:**
- Rating buttons (😓 Hard / 😐 OK / 😊 Easy)
- `reviewFlashcard()` API call
- `@due-count` emit
- `@go-quiz` emit
- Completion stats breakdown (số card theo rating)
- Reshuffle button trong embedded mode

**Giữ:**
- Card flip animation (click to reveal back)
- Previous / Next navigation
- Progress indicator (e.g. "3/20")
- Loading skeleton
- Empty state khi không có flashcard

**Thêm:**
- "Lấy bộ mới" button ở completion screen (và trong session)

**User flow mới:**

```
[Tab Flashcard được mở]
        ↓
[Load 20 card ngẫu nhiên từ lesson hiện tại]
        ↓
[Hiển thị card đầu tiên — mặt trước]
        ↓ (click card)
[Flip — hiển thị mặt sau]
        ↓ (click Next)
[Card tiếp theo]
        ↓ (sau card cuối)
[Completion screen]
[Nút "Lấy bộ mới" → load 20 card mới ngẫu nhiên]
```

**Completion screen (đơn giản):**

```
┌────────────────────────────────┐
│    ✓ Đã xem xong 20 thẻ       │
│                                │
│   [Lấy bộ mới ngẫu nhiên]     │
└────────────────────────────────┘
```

**API call:** `GET /api/training/activities/<activityId>/flashcards/?count=20`

- Mỗi lần mở tab: gọi API (load 20 random)
- Mỗi lần "Lấy bộ mới": gọi lại API (random mới)

### 5.5 router/index.js — xóa training routes

```javascript
// Xóa:
{
  path: '/training/lesson/:lessonSlug',
  name: 'TrainingLesson',
  component: () => import('../views/TrainingView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/training/module/:moduleSlug',
  name: 'TrainingModule',
  component: () => import('../views/TrainingView.vue'),
  meta: { requiresAuth: true },
},
```

### 5.6 TrainingView.vue — xóa file

File bị xóa hoàn toàn. Không còn entry point nào navigate đến TrainingView.

### 5.7 TrainingDrawer.vue — giữ nguyên (BookReader)

TrainingDrawer dùng cho BookReader không bị ảnh hưởng. Flashcard trong drawer cũng dùng FlashcardSession refactored (không có rating).

---

## 6. Component State Machine (FlashcardSession mới)

```
LOADING
  └─→ EMPTY          (không có flashcard trong lesson)
  └─→ STUDYING       (đang xem card N/20)
        ├── [card chưa flip]  → click card → flip reveal
        ├── [card đã flip]    → click Next → card kế
        └── [card cuối xong] → COMPLETED
  └─→ COMPLETED
        └── click "Lấy bộ mới" → LOADING → STUDYING
```

---

## 7. File Changes Summary

### Backend

| File | Thay đổi |
|------|---------|
| `exams/views_training.py` | `ActivityFlashcardsView.get()`: bỏ SM-2 priority logic, đổi sang `random.shuffle` thuần |
| `exams/serializers_training.py` | `TrainingActivitySerializer.get_stats()`: bỏ `due_count`; bỏ FlashcardReview prefetch |

### Frontend

| File | Thay đổi |
|------|---------|
| `views/TrainingView.vue` | **Xóa file** |
| `router/index.js` | Xóa 2 routes `/training/lesson/:slug` và `/training/module/:slug` |
| `components/training/FlashcardSession.vue` | Bỏ rating buttons, SM-2 API call, `@due-count`/`@go-quiz` emit; thêm "Lấy bộ mới" |
| `components/video/FlashcardTab.vue` | Bỏ `due-count` emit; giữ load + pass flashcards |
| `components/video/VideoTabNav.vue` | Bỏ `dueBadgeCount` prop và badge render |
| `components/video/VideoSidebar.vue` | Bỏ `flashcardDueCount` state và `@due-count` handler |
| `views/VideoPlayerView.vue` | Bỏ `flashcardDueCount` ref và prop drilling xuống VideoSidebar |

---

## 8. Các quyết định đã chốt

| # | Câu hỏi | Quyết định | Lý do |
|---|---------|-----------|-------|
| Phạm vi random | Global hay lesson-scoped? | Lesson-scoped (theo bài học đang xem) | Context rõ ràng, user biết đang ôn bài nào |
| Entry point | Standalone page hay embedded? | Giữ tab trong video player | User không cần rời khỏi video |
| FlashcardReview model | Xóa hay giữ schema? | Giữ schema, bỏ write API | Tránh migration xóa dữ liệu; có thể dùng lại |
| Review endpoint | Xóa view hay giữ? | Giữ view, frontend không gọi | Tránh breaking change |
| Số card mỗi lần | Cố định hay configurable? | Cố định 20 | Đơn giản, đủ cho một session |
| "Lấy bộ mới" | Reshuffle local hay gọi API? | Gọi lại API | Random thực sự, không phải shuffle bộ cũ |
| TrainingView | Deprecate hay xóa? | Xóa ngay | Không còn entry point nào dùng |
| TrainingDrawer (BookReader) | Ảnh hưởng không? | Không ảnh hưởng | Dùng chung FlashcardSession refactored |
