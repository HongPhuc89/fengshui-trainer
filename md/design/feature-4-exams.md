# Feature 4 Detailed Design: Exams & Practice Module

## Document Information
- **Feature**: Exams & Practice Module (Backend)
- **Reference**: TASKS.md Phase 1 – Feature 4, database-design.md
- **Last Updated**: 2026-02-20

---

## 1. Core Data Structures & Models

### 1.1 PracticeModule (Tower / Kỳ Môn focus)
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | CharField(255) | Tên module (e.g. Kỳ Môn Cơ Bản). |
| `slug` | SlugField(unique=True) | URL. |
| `description` | TextField(blank=True) | Mô tả. |
| `order` | PositiveIntegerField(default=0) | Thứ tự hiển thị. |

### 1.2 Exam (extends BaseModel)
| Field | Type | Description |
| :--- | :--- | :--- |
| `module` | FK(PracticeModule, null=True, SET_NULL) | Module chứa (optional). |
| `title` | CharField(255) | Tên bài thi. |
| `slug` | SlugField(unique=True) | URL. |
| `description` | TextField(blank=True) | Mô tả. |
| `time_limit_minutes` | PositiveIntegerField(null=True) | Giới hạn thời gian. |
| `passing_score` | PositiveIntegerField(default=70) | Điểm đạt (%). |
| `exam_type` | CharField(20) | FINAL_EXAM, PRACTICE, QUIZ. |

Book/VideoCourse có thể có FK `final_exam` → Exam (optional).

### 1.3 PracticeQuestion
| Field | Type | Description |
| :--- | :--- | :--- |
| `exam` | FK(Exam, CASCADE) | Bài thi. |
| `question_text` | TextField | Nội dung câu hỏi. |
| `options` | JSONField | [{id: 'a', text: '...'}, ...]. |
| `correct_answer` | CharField(50) | Id đáp án đúng. |
| `explanation` | TextField(blank=True) | Giải thích. |
| `difficulty` | CharField(10) | EASY, MEDIUM, HARD. |
| `points` | PositiveIntegerField(default=10) | Điểm câu. |
| `order` | PositiveIntegerField(default=0) | Thứ tự. |

### 1.4 UserExamProgress
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | FK(User) | User. |
| `exam` | FK(Exam) | Bài thi. |
| `score` | PositiveIntegerField(default=0) | Điểm đạt được. |
| `is_passed` | BooleanField(default=False) | Đạt passing_score. |
| `attempts` | PositiveIntegerField(default=0) | Số lần làm. |
| `last_attempt` | DateTimeField(auto_now=True) | Lần làm cuối. |
| `answers_snapshot` | JSONField(null=True) | Lưu đáp án lần nộp (optional). |
| Meta | unique_together | (user, exam). |

### 1.5 Flashcard (Spaced Repetition)
| Field | Type | Description |
| :--- | :--- | :--- |
| `module` | FK(PracticeModule) | Module (hoặc link tới Chapter/Book). |
| `front` | TextField | Mặt trước. |
| `back` | TextField | Mặt sau. |
| `image` | CharField(255, blank=True) | Ảnh (optional). |
| `difficulty` | CharField(10, blank=True) | EASY, MEDIUM, HARD. |
| `order` | PositiveIntegerField(default=0) | Thứ tự. |

### 1.6 UserPracticeProgress / FlashcardReview (SM-2)
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | FK(User) | User. |
| `flashcard` | FK(Flashcard) | Thẻ. |
| `next_review` | DateTimeField | Ngày ôn tiếp (SM-2). |
| `interval` | PositiveIntegerField(default=0) | Số ngày interval. |
| `ease_factor` | FloatField(default=2.5) | EF (SM-2). |
| `repetitions` | PositiveIntegerField(default=0) | Số lần ôn. |
| Meta | unique_together | (user, flashcard). |

---

## 2. Business Logic

### 2.1 Exam Access
- **Standalone practice**: Exam không link Book/Video → user đã đăng nhập có thể làm (hoặc theo module unlock).
- **Final exam**: Chỉ user đã mua Book / VideoCourse tương ứng (hoặc VIP) mới được làm.

### 2.2 Submit Exam
- Nhận payload: list câu trả lời `[{ question_id, answer }, ...]`.
- Tính điểm: so sánh với correct_answer, cộng points.
- Cập nhật UserExamProgress: score, is_passed=(score >= passing_score), attempts+=1, last_attempt.

### 2.3 SM-2 Algorithm (Flashcards)
- Input: flashcard_id, quality (0–5).
- Cập nhật next_review, interval, ease_factor, repetitions theo SM-2.
- GET flashcards cho chapter/module: filter theo next_review <= now hoặc chưa từng ôn.

---

## 3. API Endpoints

| Endpoint | Method | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `/api/exams/` | GET | Yes | List exam (có thể filter theo module, type). |
| `/api/exams/{slug}/` | GET | Yes | Chi tiết exam + danh sách câu hỏi (chỉ metadata, không trả đáp án đúng). |
| `/api/exams/{slug}/submit/` | POST | Yes | Nộp bài: body { "answers": [{ "question_id": "uuid", "answer": "a" }] }; trả score, is_passed. |
| `/api/practice/modules/` | GET | Yes | List PracticeModule (tower). |
| `/api/practice/modules/{slug}/exams/` | GET | Yes | List exam thuộc module. |
| `/api/practice/chapters/{id}/flashcards/` | GET | Yes | List flashcard của chapter (hoặc module). |
| `/api/practice/flashcards/{id}/review/` | POST | Yes | Gửi quality (SM-2); cập nhật next_review. |

---

## 4. Admin

- PracticeModule: CRUD, order.
- Exam: list_display (title, exam_type, passing_score, time_limit_minutes), inline PracticeQuestion.
- PracticeQuestion: inline; options, correct_answer dạng JSON.
- Flashcard: list_display (module, front, order); inline hoặc tab.
- UserExamProgress: readonly list (user, exam, score, is_passed, attempts).

---

## 5. Implementation Status

| # | Task | Status |
| :--- | :--- | :--- |
| 1 | PracticeModule, Exam, PracticeQuestion models | ⬜ Pending |
| 2 | UserExamProgress model | ⬜ Pending |
| 3 | API exam list, detail, submit | ⬜ Pending |
| 4 | Flashcard, UserPracticeProgress (SM-2) models | ⬜ Pending |
| 5 | API practice modules, flashcards, review | ⬜ Pending |
| 6 | Link Book/VideoCourse.final_exam → Exam | ⬜ Pending |

---
*Last updated: 2026-02-20*
