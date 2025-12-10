# API Services

Centralized API service layer cho mobile app với automatic token management.

## 📦 Structure

```
services/api/
├── client.ts              # Base API client với token injection
├── auth.service.ts        # Authentication APIs
├── book.service.ts        # Books & Chapters APIs
├── flashcard.service.ts   # Flashcard & Review APIs
├── quiz.service.ts        # Quiz Session APIs
└── index.ts              # Export all services
```

## 🚀 Usage

### Import Services

```typescript
import { authService, bookService, flashcardService, quizService } from '@/services/api';
```

### Auth Service

```typescript
// Login
const response = await authService.login({
  email: 'user@example.com',
  password: 'password123',
});

// Register
await authService.register({
  email: 'new@example.com',
  password: 'password123',
  full_name: 'John Doe',
});

// Logout
await authService.logout();

// Get current user
const user = await authService.getCurrentUser();

// Check if authenticated
const isAuth = await authService.isAuthenticated();
```

### Book Service

```typescript
// Get all books
const books = await bookService.getBooks();

// Get book with chapters
const book = await bookService.getBook(bookId);

// Get chapters
const chapters = await bookService.getChapters(bookId);

// Search books
const results = await bookService.searchBooks('feng shui');

// Favorites
await bookService.addToFavorites(bookId);
await bookService.removeFromFavorites(bookId);
const favorites = await bookService.getFavoriteBooks();

// Progress
const progress = await bookService.getUserProgress();
```

### Flashcard Service

```typescript
// Get chapter flashcards
const flashcards = await flashcardService.getChapterFlashcards(chapterId);

// Get due flashcards
const dueCards = await flashcardService.getDueFlashcards(chapterId);

// Submit review (SuperMemo algorithm)
const result = await flashcardService.submitReview(chapterId, {
  flashcard_id: 123,
  quality: 4, // 0-5
});

// Get progress
const progress = await flashcardService.getProgress(chapterId);

// Get stats
const stats = await flashcardService.getStats(chapterId);
// { total: 100, mastered: 30, learning: 50, new: 20 }
```

### Quiz Service

```typescript
// Start quiz
const session = await quizService.startQuiz(chapterId);

// Submit answer
await quizService.submitAnswer(sessionId, questionId, answer);

// Complete quiz
const result = await quizService.completeQuiz(sessionId);

// Get session
const session = await quizService.getSession(sessionId);

// Get history
const history = await quizService.getChapterHistory(chapterId);
```

## 🔐 Token Management

Token được tự động inject vào mọi request:

```typescript
// ❌ Old way - Manual token
const token = await AsyncStorage.getItem('token');
const response = await axios.get('/api/books', {
  headers: { Authorization: `Bearer ${token}` },
});

// ✅ New way - Automatic
const books = await bookService.getBooks();
```

## 🛡️ Error Handling

API client tự động xử lý 401 errors:

```typescript
// If 401 Unauthorized
// - Token automatically removed
// - User logged out
// - Can redirect to login screen
```

## 📝 TypeScript Support

Tất cả services đều có TypeScript types:

```typescript
import type { Book, Chapter, Flashcard, QuizSession, User } from '@/services/api';
```

## 🎯 Best Practices

1. **Always use services** - Không call axios trực tiếp
2. **Handle errors** - Wrap trong try-catch
3. **Type safety** - Sử dụng TypeScript interfaces
4. **Centralized** - Tất cả API logic ở services

## 🔧 Configuration

Base URL được config trong `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

API client tự động thêm `/api` prefix.

## 📚 Examples

### Complete Login Flow

```typescript
import { authService } from '@/services/api';

async function handleLogin(email: string, password: string) {
  try {
    const response = await authService.login({ email, password });
    console.log('Logged in:', response.user);
    // Token automatically saved
    // Navigate to home screen
  } catch (error) {
    console.error('Login failed:', error);
    Alert.alert('Error', 'Invalid credentials');
  }
}
```

### Complete Quiz Flow

```typescript
import { quizService } from '@/services/api';

async function startQuiz(chapterId: number) {
  try {
    // Start quiz
    const session = await quizService.startQuiz(chapterId);

    // Submit answers
    for (const question of session.questions) {
      await quizService.submitAnswer(session.id, question.id, userAnswer);
    }

    // Complete and get result
    const result = await quizService.completeQuiz(session.id);
    console.log('Score:', result.score, '/', result.total_points);
    console.log('Passed:', result.passed);
  } catch (error) {
    console.error('Quiz error:', error);
  }
}
```

## 🚀 Adding New Services

1. Create new service file: `myfeature.service.ts`
2. Define interfaces
3. Create service class
4. Export service instance
5. Add to `index.ts`

```typescript
// myfeature.service.ts
import { apiClient } from './client';

export interface MyData {
  id: number;
  name: string;
}

class MyFeatureService {
  async getData(): Promise<MyData[]> {
    return apiClient.get<MyData[]>('/my-feature');
  }
}

export const myFeatureService = new MyFeatureService();
```

```typescript
// index.ts
export * from './myfeature.service';
```
