# Mobile App API Integration - Summary

## Overview

Đã tạo đầy đủ hệ thống API services và React hooks để kết nối mobile app với backend.

## Cấu trúc thư mục

```
apps/mobile/modules/shared/services/
├── api/
│   ├── client.ts              # Base Axios client với interceptors
│   ├── types.ts               # TypeScript type definitions
│   ├── auth.service.ts        # Authentication services
│   ├── books.service.ts       # Books & chapters services
│   ├── flashcards.service.ts  # Flashcards services
│   ├── quiz.service.ts        # Quiz services
│   ├── mindmap.service.ts     # Mind map services
│   ├── index.ts               # Barrel exports
│   └── README.md              # API documentation
│
└── hooks/
    ├── useAuth.ts             # Authentication hook
    ├── useBooks.ts            # Books & chapters hooks
    ├── useFlashcards.ts       # Flashcards hooks
    ├── useQuiz.ts             # Quiz hooks
    ├── useMindMap.ts          # Mind map hook
    ├── index.ts               # Barrel exports
    └── README.md              # Hooks documentation
```

## Các tính năng đã implement

### 1. API Client (`client.ts`)

- ✅ Base Axios instance với cấu hình timeout
- ✅ Request interceptor tự động thêm JWT token
- ✅ Response interceptor xử lý lỗi 401
- ✅ Tự động refresh token khi hết hạn
- ✅ Lưu trữ tokens trong AsyncStorage
- ✅ Generic HTTP methods (GET, POST, PUT, PATCH, DELETE)

### 2. Type Definitions (`types.ts`)

- ✅ Auth types (Register, Login, User, Token)
- ✅ Book & Chapter types
- ✅ Flashcard types
- ✅ Quiz types (Config, Attempt, Question, Submit)
- ✅ MindMap types
- ✅ Error types

### 3. API Services

#### Auth Service (`auth.service.ts`)

- ✅ `register()` - Đăng ký tài khoản mới
- ✅ `login()` - Đăng nhập
- ✅ `getProfile()` - Lấy thông tin user
- ✅ `refreshToken()` - Refresh access token
- ✅ `logout()` - Đăng xuất
- ✅ `isAuthenticated()` - Kiểm tra trạng thái đăng nhập
- ✅ `getAccessToken()` - Lấy access token
- ✅ `getRefreshToken()` - Lấy refresh token

#### Books Service (`books.service.ts`)

- ✅ `getAllBooks()` - Lấy danh sách sách
- ✅ `getBookById()` - Lấy chi tiết sách
- ✅ `getChaptersByBookId()` - Lấy danh sách chương
- ✅ `getChapterById()` - Lấy chi tiết chương

#### Flashcards Service (`flashcards.service.ts`)

- ✅ `getFlashcardsByChapter()` - Lấy tất cả flashcards
- ✅ `getRandomFlashcards()` - Lấy flashcards ngẫu nhiên
- ✅ `getFlashcardById()` - Lấy chi tiết flashcard

#### Quiz Service (`quiz.service.ts`)

- ✅ `getQuizConfig()` - Lấy cấu hình quiz
- ✅ `startQuiz()` - Bắt đầu quiz mới
- ✅ `submitQuiz()` - Nộp bài quiz
- ✅ `getAttemptHistory()` - Lấy lịch sử làm bài
- ✅ `getAttemptById()` - Lấy chi tiết lần làm bài

#### MindMap Service (`mindmap.service.ts`)

- ✅ `getMindMapByChapter()` - Lấy mind map
- ✅ `exportMindMap()` - Export mind map

### 4. React Hooks

#### useAuth

- ✅ Quản lý authentication state
- ✅ Auto-check authentication on mount
- ✅ Login/Register/Logout functions
- ✅ Refresh profile

#### useBooks, useBook, useChapters, useChapter

- ✅ Fetch books và chapters
- ✅ Loading & error states
- ✅ Refetch capability

#### useFlashcards, useRandomFlashcards, useFlashcard

- ✅ Fetch flashcards
- ✅ Random selection với shuffle
- ✅ Individual flashcard details

#### useQuizConfig, useQuiz, useQuizHistory, useQuizAttempt

- ✅ Quiz configuration
- ✅ Start/Submit quiz workflow
- ✅ Quiz history
- ✅ Attempt details với results

#### useMindMap

- ✅ Fetch mind map
- ✅ Export functionality

## API Endpoints được support

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh-token`
- `POST /auth/logout`

### Books & Chapters

- `GET /books`
- `GET /books/:id`
- `GET /books/:bookId/chapters`
- `GET /books/:bookId/chapters/:id`

### Flashcards

- `GET /books/:bookId/chapters/:chapterId/flashcards`
- `GET /books/:bookId/chapters/:chapterId/flashcards/random?count=5`
- `GET /books/:bookId/chapters/:chapterId/flashcards/:id`

### Quiz

- `GET /books/:bookId/chapters/:chapterId/quiz/info`
- `POST /books/:bookId/chapters/:chapterId/quiz/start`
- `POST /books/:bookId/chapters/:chapterId/quiz/submit`
- `GET /books/:bookId/chapters/:chapterId/quiz/attempts`
- `GET /books/:bookId/chapters/:chapterId/quiz/attempts/:attemptId`

### Mind Map

- `GET /books/:bookId/chapters/:chapterId/mindmap`
- `GET /books/:bookId/chapters/:chapterId/mindmap/export`

## Cách sử dụng

### 1. Cấu hình môi trường

Tạo file `.env` trong thư mục `apps/mobile/`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 2. Import và sử dụng services

```typescript
import { authService, booksService, quizService } from '@/modules/shared/services/api';

// Login
const response = await authService.login({
  email: 'user@example.com',
  password: 'password',
});

// Get books
const books = await booksService.getAllBooks();

// Start quiz
const attempt = await quizService.startQuiz(1, 1);
```

### 3. Sử dụng hooks trong components

```typescript
import { useAuth, useBooks, useQuiz } from '@/modules/shared/services/hooks';

function MyScreen() {
  const { user, isAuthenticated } = useAuth();
  const { books, isLoading } = useBooks();
  const { startQuiz, submitQuiz } = useQuiz(bookId, chapterId);

  // Component logic...
}
```

## Tính năng nổi bật

1. **Type Safety**: Tất cả APIs đều có TypeScript types đầy đủ
2. **Auto Token Management**: Tự động thêm token vào requests và refresh khi hết hạn
3. **Error Handling**: Xử lý lỗi tập trung trong interceptors
4. **React Hooks**: Easy-to-use hooks với loading/error states
5. **Refetch Support**: Tất cả hooks đều có khả năng refetch data
6. **Documentation**: Đầy đủ README và examples

## Next Steps

1. **Testing**: Viết unit tests cho services và hooks
2. **Caching**: Implement caching strategy (có thể dùng React Query)
3. **Offline Support**: Thêm offline mode với local storage
4. **Error Boundaries**: Implement error boundaries cho UI
5. **Loading States**: Tạo reusable loading components
6. **Retry Logic**: Thêm automatic retry cho failed requests

## Ví dụ sử dụng trong Screen

```typescript
// LoginScreen.tsx
import { useAuth } from '@/modules/shared/services/hooks';

export function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // Navigate to home
    } catch (error) {
      // Show error
    }
  };

  return <LoginForm onSubmit={handleLogin} loading={isLoading} />;
}

// QuizScreen.tsx
import { useQuiz } from '@/modules/shared/services/hooks';

export function QuizScreen({ bookId, chapterId }) {
  const { currentAttempt, startQuiz, submitQuiz } = useQuiz(bookId, chapterId);

  const handleStart = async () => {
    await startQuiz();
  };

  const handleSubmit = async (answers) => {
    const result = await submitQuiz(answers);
    // Show results
  };

  return (
    <QuizContainer
      attempt={currentAttempt}
      onStart={handleStart}
      onSubmit={handleSubmit}
    />
  );
}
```

## Tài liệu tham khảo

- [API Services README](./api/README.md) - Chi tiết về API services
- [Hooks README](./hooks/README.md) - Chi tiết về React hooks
- Backend API Documentation - Swagger UI tại `/api/docs`
