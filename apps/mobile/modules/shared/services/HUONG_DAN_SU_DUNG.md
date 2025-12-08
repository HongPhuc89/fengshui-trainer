# Hướng Dẫn Sử Dụng API - Mobile App

## 🎯 Tổng Quan

Đã tạo xong hệ thống API integration hoàn chỉnh để kết nối mobile app với backend. Bao gồm:

- ✅ **7 API Services** - Gọi API từ backend
- ✅ **11 React Hooks** - Sử dụng trong components
- ✅ **2 Example Screens** - Ví dụ hoàn chỉnh
- ✅ **Type Safety** - TypeScript đầy đủ
- ✅ **Auto Token** - Tự động quản lý JWT token

## 📁 Cấu Trúc

```
modules/shared/services/
├── api/                    # API Services
│   ├── client.ts          # Axios client
│   ├── types.ts           # Type definitions
│   ├── auth.service.ts    # Đăng nhập/đăng ký
│   ├── books.service.ts   # Sách & chương
│   ├── flashcards.service.ts  # Flashcards
│   ├── quiz.service.ts    # Quiz
│   ├── mindmap.service.ts # Mind map
│   └── index.ts           # Exports
│
├── hooks/                  # React Hooks
│   ├── useAuth.ts         # Hook đăng nhập
│   ├── useBooks.ts        # Hook sách/chương
│   ├── useFlashcards.ts   # Hook flashcards
│   ├── useQuiz.ts         # Hook quiz
│   ├── useMindMap.ts      # Hook mind map
│   └── index.ts           # Exports
│
└── examples/               # Ví dụ
    ├── BooksListScreen.example.tsx
    └── QuizScreen.example.tsx
```

## 🚀 Cách Sử Dụng

### 1. Cấu Hình

Tạo file `.env` trong `apps/mobile/`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 2. Import Hooks

```typescript
import { useAuth, useBooks, useQuiz } from '@/modules/shared/services/hooks';
```

### 3. Sử Dụng Trong Component

```typescript
function MyScreen() {
  // Lấy thông tin user
  const { user, isAuthenticated, login, logout } = useAuth();

  // Lấy danh sách sách
  const { books, isLoading, error, refetch } = useBooks();

  // Quiz
  const { startQuiz, submitQuiz, currentAttempt } = useQuiz(bookId, chapterId);

  return (
    <View>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList data={books} ... />
      )}
    </View>
  );
}
```

## 📚 Các Hook Có Sẵn

### Authentication

```typescript
const { user, login, logout, register } = useAuth();
```

### Books & Chapters

```typescript
const { books } = useBooks();
const { book } = useBook(bookId);
const { chapters } = useChapters(bookId);
const { chapter } = useChapter(bookId, chapterId);
```

### Flashcards

```typescript
const { flashcards } = useFlashcards(bookId, chapterId);
const { flashcards, shuffle } = useRandomFlashcards(bookId, chapterId, 10);
```

### Quiz

```typescript
const { config } = useQuizConfig(bookId, chapterId);
const { startQuiz, submitQuiz, currentAttempt, submitResult } = useQuiz(bookId, chapterId);
const { attempts } = useQuizHistory(bookId, chapterId);
```

### Mind Map

```typescript
const { mindMap, exportMindMap } = useMindMap(bookId, chapterId);
```

## 💡 Ví Dụ Thực Tế

### Màn Hình Đăng Nhập

```typescript
import { useAuth } from '@/modules/shared/services/hooks';

function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login('email@example.com', 'password');
      // Chuyển sang màn hình chính
    } catch (error) {
      Alert.alert('Lỗi', 'Đăng nhập thất bại');
    }
  };

  return <LoginForm onSubmit={handleLogin} loading={isLoading} />;
}
```

### Màn Hình Danh Sách Sách

```typescript
import { useBooks } from '@/modules/shared/services/hooks';

function BooksScreen() {
  const { books, isLoading, refetch } = useBooks();

  return (
    <FlatList
      data={books}
      renderItem={({ item }) => <BookCard book={item} />}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    />
  );
}
```

### Màn Hình Quiz

```typescript
import { useQuiz } from '@/modules/shared/services/hooks';

function QuizScreen({ bookId, chapterId }) {
  const { startQuiz, submitQuiz, currentAttempt, submitResult } = useQuiz(bookId, chapterId);
  const [answers, setAnswers] = useState({});

  // Bắt đầu quiz
  const handleStart = async () => {
    await startQuiz();
  };

  // Nộp bài
  const handleSubmit = async () => {
    const result = await submitQuiz(answers);
    console.log('Điểm:', result.score);
  };

  if (!currentAttempt) {
    return <Button onPress={handleStart}>Bắt Đầu Quiz</Button>;
  }

  if (submitResult) {
    return (
      <View>
        <Text>Điểm: {submitResult.score}%</Text>
        <Text>{submitResult.passed ? 'Đạt' : 'Không đạt'}</Text>
      </View>
    );
  }

  return (
    <View>
      {currentAttempt.questions.map(q => (
        <QuestionCard
          question={q}
          onAnswer={(answer) => setAnswers({...answers, [q.id]: answer})}
        />
      ))}
      <Button onPress={handleSubmit}>Nộp Bài</Button>
    </View>
  );
}
```

## 🎨 Xử Lý States

### Loading State

```typescript
if (isLoading) {
  return <ActivityIndicator />;
}
```

### Error State

```typescript
if (error) {
  return (
    <View>
      <Text>Lỗi: {error.message}</Text>
      <Button onPress={refetch}>Thử Lại</Button>
    </View>
  );
}
```

### Empty State

```typescript
if (data.length === 0) {
  return <Text>Không có dữ liệu</Text>;
}
```

## 📖 Tài Liệu Chi Tiết

- **[API Services](./api/README.md)** - Chi tiết về các API services
- **[React Hooks](./hooks/README.md)** - Chi tiết về các hooks
- **[Examples](./examples/README.md)** - Các ví dụ hoàn chỉnh
- **[Summary](./API_INTEGRATION_SUMMARY.md)** - Tổng quan đầy đủ
- **[Changelog](./CHANGELOG.md)** - Lịch sử thay đổi

## ✅ Checklist Triển Khai

- [ ] Cấu hình `.env` với API URL
- [ ] Import hooks vào components
- [ ] Xử lý loading states
- [ ] Xử lý error states
- [ ] Thêm pull-to-refresh
- [ ] Test đăng nhập/đăng xuất
- [ ] Test các chức năng chính

## 🆘 Hỗ Trợ

Nếu gặp vấn đề:

1. Kiểm tra `.env` có đúng API URL không
2. Kiểm tra backend có đang chạy không
3. Xem console logs để debug
4. Đọc documentation chi tiết
5. Xem example components

## 🎉 Hoàn Thành!

Mobile app giờ đã sẵn sàng kết nối với backend và hiển thị dữ liệu!
