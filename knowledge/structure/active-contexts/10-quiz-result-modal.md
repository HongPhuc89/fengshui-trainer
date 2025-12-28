# Quiz Result Modal - Màn hình thông báo kết quả

**Status**: ✅ Hoàn thành
**Ngày tạo**: 2025-12-10

## Tổng quan

Đã tạo một **modal thông báo kết quả quiz đẹp mắt** với animation, hiển thị ngay sau khi user nộp bài. Modal này cung cấp feedback tức thì và cho phép user chọn xem chi tiết hoặc làm lại.

## Tính năng

### 🎨 UI/UX Features

1. **Animated Modal**
   - ✅ Fade in animation
   - ✅ Scale animation cho card
   - ✅ Slide up animation cho icon
   - ✅ Blur background (expo-blur)

2. **Visual Feedback**
   - ✅ Màu gradient khác nhau cho Pass (xanh) và Fail (đỏ)
   - ✅ Icon động: Trophy (🏆) cho Pass, Sad (😢) cho Fail
   - ✅ Score circle với phần trăm lớn
   - ✅ Điểm chuẩn hiển thị rõ ràng

3. **Thông tin hiển thị**
   - ✅ Điểm số (score / total_points)
   - ✅ Phần trăm (%)
   - ✅ Điểm chuẩn (passing score)
   - ✅ Số câu đúng/sai/tổng
   - ✅ Trạng thái Pass/Fail

4. **Actions**
   - ✅ **Xem chi tiết** - Navigate đến trang kết quả đầy đủ
   - ✅ **Làm lại** - Bắt đầu quiz mới
   - ✅ **Đóng (X)** - Quay lại màn hình trước

## Cấu trúc File

```
apps/mobile/
├── components/
│   └── quiz/
│       ├── QuizResultModal.tsx    ← ✨ MỚI
│       └── index.ts               ← Updated
└── app/
    └── quiz/
        └── [chapterId].tsx        ← Updated
```

## Component API

### QuizResultModal Props

```typescript
interface QuizResultModalProps {
  visible: boolean; // Hiển thị modal
  passed: boolean; // Đạt/Không đạt
  score: number; // Điểm đạt được
  totalPoints: number; // Tổng điểm
  percentage: number; // Phần trăm (0-100)
  passingScore: number; // Điểm chuẩn (%)
  correctCount: number; // Số câu đúng
  incorrectCount: number; // Số câu sai
  totalQuestions: number; // Tổng số câu
  onViewDetails: () => void; // Handler xem chi tiết
  onRetry: () => void; // Handler làm lại
  onClose: () => void; // Handler đóng modal
}
```

## Usage Example

```typescript
import { QuizResultModal } from '../../components/quiz';

function QuizScreen() {
  const [showResultModal, setShowResultModal] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const handleSubmit = async () => {
    const result = await quizService.completeQuiz(sessionId);
    setQuizResult(result);
    setShowResultModal(true);  // Show modal immediately
  };

  return (
    <>
      {/* Quiz content */}

      {quizResult && (
        <QuizResultModal
          visible={showResultModal}
          passed={quizResult.passed}
          score={quizResult.score}
          totalPoints={quizResult.total_points}
          percentage={quizResult.percentage}
          passingScore={quizResult.passing_score_percentage || 70}
          correctCount={quizResult.correct_count || 0}
          incorrectCount={quizResult.incorrect_count || 0}
          totalQuestions={quizResult.total_questions || 0}
          onViewDetails={() => {
            setShowResultModal(false);
            router.push('/quiz-result/[sessionId]');
          }}
          onRetry={() => {
            setShowResultModal(false);
            router.replace('/quiz/[chapterId]');
          }}
          onClose={() => {
            setShowResultModal(false);
            router.back();
          }}
        />
      )}
    </>
  );
}
```

## Flow Diagram

```
User làm quiz
    ↓
User nhấn "Nộp bài"
    ↓
Confirm dialog
    ↓
User xác nhận
    ↓
Call API: completeQuiz()
    ↓
Backend chấm điểm
    ↓
Trả về kết quả
    ↓
✨ HIỂN THỊ MODAL ✨  ← Màn hình mới
    ↓
User có 3 lựa chọn:
├─ Xem chi tiết → Navigate to /quiz-result/[sessionId]
├─ Làm lại → Navigate to /quiz/[chapterId]
└─ Đóng (X) → router.back()
```

## Giao diện Modal

### Pass (Đạt)

```
┌─────────────────────────────────┐
│ [X]                             │
│                                 │
│     ┌───────────────┐           │
│     │   🏆 Trophy   │           │
│     └───────────────┘           │
│                                 │
│      XUẤT SẮC!                  │
│   Bạn đã vượt qua bài kiểm tra! │
│                                 │
│     ┌───────────┐               │
│     │    85%    │               │
│     │  Điểm đạt │               │
│     └───────────┘               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Điểm số:        85 / 100    │ │
│ │ Điểm chuẩn:     70%         │ │
│ │ ─────────────────────────── │ │
│ │  ✓ 8    ✗ 2    ? 10        │ │
│ │  Đúng   Sai    Tổng         │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │  📋 Xem chi tiết            │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │  🔄 Làm lại                 │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Fail (Chưa đạt)

```
┌─────────────────────────────────┐
│ [X]                             │
│                                 │
│     ┌───────────────┐           │
│     │   😢 Sad      │           │
│     └───────────────┘           │
│                                 │
│      CHƯA ĐẠT                   │
│   Đừng nản lòng, hãy thử lại!   │
│                                 │
│     ┌───────────┐               │
│     │    55%    │               │
│     │  Điểm đạt │               │
│     └───────────┘               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Điểm số:        55 / 100    │ │
│ │ Điểm chuẩn:     70%         │ │
│ │ ─────────────────────────── │ │
│ │  ✓ 5    ✗ 5    ? 10        │ │
│ │  Đúng   Sai    Tổng         │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │  📋 Xem chi tiết            │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │  🔄 Làm lại                 │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## Animations

### 1. Modal Entrance

```typescript
Animated.parallel([
  // Scale from 0 to 1
  Animated.spring(scaleAnim, {
    toValue: 1,
    tension: 50,
    friction: 7,
  }),
  // Fade in
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 300,
  }),
  // Slide up icon
  Animated.timing(slideAnim, {
    toValue: 0,
    duration: 400,
  }),
]);
```

### 2. Background Blur

```typescript
<BlurView intensity={80} style={styles.backdrop}>
  {/* Modal content */}
</BlurView>
```

## Styling

### Colors

**Pass (Green)**

- Gradient: `['#10b981', '#059669', '#047857']`
- Icon color: `#fbbf24` (Gold trophy)

**Fail (Red)**

- Gradient: `['#ef4444', '#dc2626', '#b91c1c']`
- Icon color: `#fff` (White sad face)

### Dimensions

- Modal width: `90% of screen width`, max `400px`
- Icon circle: `120x120px`
- Score circle: `140x140px`
- Border radius: `24px` (card), `12px` (buttons)

## Dependencies

```json
{
  "expo-blur": "^14.0.1",
  "expo-linear-gradient": "^14.0.1",
  "@expo/vector-icons": "^14.0.0"
}
```

## Installation

```bash
# Install expo-blur
npx expo install expo-blur

# Already installed
# expo-linear-gradient
# @expo/vector-icons
```

## Files Changed

### New Files

- ✅ `apps/mobile/components/quiz/QuizResultModal.tsx`

### Modified Files

- ✅ `apps/mobile/components/quiz/index.ts`
- ✅ `apps/mobile/app/quiz/[chapterId].tsx`

## Testing Scenarios

### Scenario 1: Pass Quiz

1. Làm quiz và đạt >= 70%
2. Nhấn "Nộp bài"
3. **Expected**: Modal xanh hiển thị với trophy icon
4. Nhấn "Xem chi tiết" → Navigate to result page
5. **Expected**: Thấy trang kết quả đầy đủ

### Scenario 2: Fail Quiz

1. Làm quiz và đạt < 70%
2. Nhấn "Nộp bài"
3. **Expected**: Modal đỏ hiển thị với sad icon
4. Nhấn "Làm lại" → Start new quiz
5. **Expected**: Quiz mới được tạo

### Scenario 3: Close Modal

1. Sau khi nộp bài
2. Nhấn nút X ở góc phải
3. **Expected**: Modal đóng, quay lại màn hình trước

## Improvements (Future)

- [ ] Confetti animation khi Pass
- [ ] Sound effects (success/fail)
- [ ] Share result to social media
- [ ] Comparison with previous attempts
- [ ] Achievement badges
- [ ] Motivational quotes for failed attempts

## Kết luận

✅ **Modal thông báo kết quả đã hoàn chỉnh!**

User giờ có trải nghiệm tốt hơn với:

- Feedback tức thì sau khi nộp bài
- Animation mượt mà
- Thông tin rõ ràng
- Nhiều lựa chọn hành động

Modal này tạo ra một **"celebration moment"** cho user khi đạt quiz, hoặc **động viên** khi chưa đạt, giúp tăng engagement và motivation! 🎉
