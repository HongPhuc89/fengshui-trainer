# Quiz Scoring & Pass/Fail Implementation

**Status**: ✅ Hoàn thành
**Ngày cập nhật**: 2025-12-10

## Tổng quan

Hệ thống quiz đã được cập nhật để **chấm điểm tự động** và hiển thị kết quả **Pass/Fail** dựa trên cấu hình `passing_score_percentage` từ quiz config.

## Những gì đã có sẵn

### Backend (✅ Đã hoàn chỉnh)

1. **Quiz Config Entity** (`quiz-config.entity.ts`)
   - Có trường `passing_score_percentage` (mặc định: 70%)
   - Có thể cấu hình qua Admin Dashboard

2. **Quiz Session Service** (`quiz-session.service.ts`)
   - ✅ Chấm điểm tự động cho tất cả loại câu hỏi:
     - TRUE_FALSE
     - MULTIPLE_CHOICE
     - MULTIPLE_ANSWER
     - MATCHING
     - ORDERING
   - ✅ Tính phần trăm điểm
   - ✅ So sánh với `passing_score_percentage` để xác định pass/fail
   - ✅ Lưu kết quả vào database

3. **Quiz Attempts Service** (`quiz-attempts.service.ts`)
   - Có logic chấm điểm tương tự
   - Hỗ trợ cả hai API endpoints

## Những gì đã được cập nhật

### Backend Enhancements

**File**: `apps/backend/src/modules/quiz/services/quiz-session.service.ts`

**Thay đổi**:

- ✅ `completeQuiz()` giờ trả về thông tin chi tiết hơn:
  ```typescript
  {
    ...session,
    passing_score_percentage: 70,  // Điểm chuẩn từ config
    correct_count: 8,               // Số câu đúng
    incorrect_count: 2,             // Số câu sai
    total_questions: 10,            // Tổng số câu
    results: [                      // Chi tiết từng câu
      {
        question_id: 1,
        question_text: "...",
        is_correct: true,
        points: 10,
        user_answer: "A"
      },
      ...
    ]
  }
  ```

### Frontend Enhancements

#### 1. Quiz Result Interface

**File**: `apps/mobile/services/api/quiz.service.ts`

**Thay đổi**:

```typescript
export interface QuizResult extends QuizSession {
  score: number;
  percentage: number;
  passed: boolean;
  passing_score_percentage?: number;  // ✨ Mới
  correct_count?: number;             // ✨ Mới
  incorrect_count?: number;           // ✨ Mới
  total_questions?: number;           // ✨ Mới
  results?: Array<{...}>;             // ✨ Mới
}
```

#### 2. Quiz Result Screen

**File**: `apps/mobile/app/quiz-result/[sessionId].tsx`

**Cải tiến UI**:

- ✅ Hiển thị **Pass/Fail banner** với màu sắc rõ ràng
- ✅ Hiển thị **điểm chuẩn** (passing score percentage)
- ✅ Thêm **console logs** để debug
- ✅ Xử lý trường hợp `percentage` là `null/undefined`

**Giao diện mới**:

```
┌─────────────────────────────┐
│   ✓ ĐẠT! / ✗ CHƯA ĐẠT      │
│   Chúc mừng! ...            │
└─────────────────────────────┘
┌─────────────────────────────┐
│   Điểm số của bạn           │
│   80 / 100                  │
│   80.0%                     │
└─────────────────────────────┘
┌─────────────────────────────┐
│ 🏆 Đạt yêu cầu              │
│ Điểm chuẩn: 70%             │ ← ✨ MỚI
└─────────────────────────────┘
┌─────────────────────────────┐
│  ✓ 8    ✗ 2    ? 10        │
│  Đúng   Sai    Tổng         │
└─────────────────────────────┘
```

#### 3. Quiz Screen Logging

**File**: `apps/mobile/app/quiz/[chapterId].tsx`

**Thay đổi**:

- ✅ Thêm logs chi tiết khi submit quiz
- ✅ Log kết quả chấm điểm
- ✅ Log lỗi chi tiết nếu có

## Cách hoạt động

### Flow chấm điểm

```
1. User làm quiz
   ↓
2. User nhấn "Nộp bài"
   ↓
3. Frontend gọi: POST /quiz-sessions/{id}/complete
   ↓
4. Backend:
   - Lấy tất cả câu trả lời
   - Chấm từng câu (checkAnswer)
   - Tính tổng điểm
   - Tính phần trăm = (score / total_points) * 100
   - Lấy passing_score_percentage từ config
   - So sánh: passed = percentage >= passing_score_percentage
   - Lưu vào database
   ↓
5. Backend trả về kết quả chi tiết
   ↓
6. Frontend hiển thị:
   - Điểm số
   - Phần trăm
   - Pass/Fail status
   - Điểm chuẩn
   - Số câu đúng/sai
```

### Logic chấm điểm

```typescript
// TRUE_FALSE & MULTIPLE_CHOICE
isCorrect = userAnswer === correctAnswer;

// MULTIPLE_ANSWER
isCorrect = correctAnswers.length === userAnswers.length && correctAnswers.every((a) => userAnswers.includes(a));

// MATCHING
isCorrect = correctPairs.every((pair) => userPairs[pair.left] === pair.right);

// ORDERING
isCorrect = JSON.stringify(correctOrder) === JSON.stringify(userOrder);
```

## Cấu hình Passing Score

### Qua Admin Dashboard

1. Vào **Admin Dashboard**
2. Chọn **Books** → Chọn book → **Chapters**
3. Chọn chapter → Tab **Quiz Config**
4. Điều chỉnh **Passing Score Percentage** (0-100%)
5. Nhấn **Save**

### Giá trị mặc định

- **Passing Score**: 70%
- **Questions per Quiz**: 10
- **Time Limit**: 30 phút

## Testing

### Test Case 1: Pass

```
- Tổng điểm: 100
- Điểm đạt: 80
- Passing score: 70%
- Kết quả: ✅ PASSED (80% >= 70%)
```

### Test Case 2: Fail

```
- Tổng điểm: 100
- Điểm đạt: 65
- Passing score: 70%
- Kết quả: ❌ FAILED (65% < 70%)
```

### Test Case 3: Exact Pass

```
- Tổng điểm: 100
- Điểm đạt: 70
- Passing score: 70%
- Kết quả: ✅ PASSED (70% >= 70%)
```

## Debug Logs

Khi submit quiz, bạn sẽ thấy logs như sau:

```
🎯 handleSubmitQuiz called
📊 Session ID: 26
📝 Submitted answers: 7 / 7
✅ User confirmed submit
📤 Calling completeQuiz...
✅ Quiz completed successfully!
📊 Result: {
  score: 80,
  total_points: 100,
  percentage: 80,
  passed: true,
  passing_score: 70
}
📊 Quiz Result: {
  score: 80,
  total_points: 100,
  percentage: 80,
  passed: true
}
```

## API Endpoints

### Complete Quiz

```
POST /quiz-sessions/{sessionId}/complete

Response:
{
  "id": 26,
  "score": 80,
  "total_points": 100,
  "percentage": 80,
  "passed": true,
  "passing_score_percentage": 70,
  "correct_count": 8,
  "incorrect_count": 2,
  "total_questions": 10,
  "status": "COMPLETED",
  "completed_at": "2025-12-10T12:42:00Z",
  "results": [...]
}
```

## Các file đã thay đổi

### Backend

- ✅ `apps/backend/src/modules/quiz/services/quiz-session.service.ts`

### Frontend

- ✅ `apps/mobile/services/api/quiz.service.ts`
- ✅ `apps/mobile/app/quiz-result/[sessionId].tsx`
- ✅ `apps/mobile/app/quiz/[chapterId].tsx`

## Tính năng tiếp theo (Optional)

- [ ] Hiển thị chi tiết từng câu trả lời (đúng/sai)
- [ ] Hiển thị đáp án đúng sau khi hoàn thành
- [ ] Thống kê theo độ khó (Easy/Medium/Hard)
- [ ] Lưu lịch sử các lần làm quiz
- [ ] So sánh kết quả với lần trước
- [ ] Leaderboard

## Kết luận

✅ **Hệ thống chấm điểm đã hoàn chỉnh và hoạt động tốt!**

Backend đã có đầy đủ logic chấm điểm, tính phần trăm, và kiểm tra pass/fail dựa trên config. Frontend đã được cập nhật để hiển thị thông tin chi tiết hơn, bao gồm điểm chuẩn và trạng thái pass/fail rõ ràng.

Người dùng giờ có thể:

1. Làm quiz
2. Nộp bài
3. Xem kết quả với điểm số, phần trăm
4. Biết rõ đã đạt hay chưa đạt
5. Biết điểm chuẩn là bao nhiêu
