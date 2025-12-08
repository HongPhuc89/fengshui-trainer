# API Services Documentation

This directory contains all API service modules for communicating with the backend.

## Structure

```
api/
├── client.ts           # Base Axios client with interceptors
├── types.ts            # TypeScript type definitions
├── auth.service.ts     # Authentication services
├── books.service.ts    # Books and chapters services
├── flashcards.service.ts # Flashcards services
├── quiz.service.ts     # Quiz services
├── mindmap.service.ts  # Mind map services
└── index.ts            # Barrel exports
```

## Configuration

Set the API base URL in your `.env` file:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For production:

```env
EXPO_PUBLIC_API_URL=https://your-api-domain.com
```

## Usage Examples

### Authentication

```typescript
import { authService } from '@/modules/shared/services/api';

// Register
const user = await authService.register({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe',
});

// Login
const loginResponse = await authService.login({
  email: 'user@example.com',
  password: 'password123',
});

// Get current user profile
const profile = await authService.getProfile();

// Logout
await authService.logout();
```

### Books & Chapters

```typescript
import { booksService } from '@/modules/shared/services/api';

// Get all books
const books = await booksService.getAllBooks();

// Get specific book
const book = await booksService.getBookById(1);

// Get chapters for a book
const chapters = await booksService.getChaptersByBookId(1);

// Get specific chapter
const chapter = await booksService.getChapterById(1, 1);
```

### Flashcards

```typescript
import { flashcardsService } from '@/modules/shared/services/api';

// Get all flashcards for a chapter
const flashcards = await flashcardsService.getFlashcardsByChapter(1, 1);

// Get random flashcards (useful for practice mode)
const randomCards = await flashcardsService.getRandomFlashcards(1, 1, 10);

// Get specific flashcard
const flashcard = await flashcardsService.getFlashcardById(1, 1, 1);
```

### Quiz

```typescript
import { quizService } from '@/modules/shared/services/api';

// Get quiz configuration
const config = await quizService.getQuizConfig(1, 1);

// Start a new quiz attempt
const attempt = await quizService.startQuiz(1, 1);

// Submit quiz answers
const result = await quizService.submitQuiz(1, 1, {
  attempt_id: attempt.id,
  answers: {
    1: 'answer_a', // questionId: answer
    2: ['answer_a', 'answer_b'], // for multiple answer questions
    3: true, // for true/false questions
  },
});

// Get attempt history
const history = await quizService.getAttemptHistory(1, 1);

// Get specific attempt details
const attemptDetails = await quizService.getAttemptById(1, 1, attempt.id);
```

### Mind Map

```typescript
import { mindMapService } from '@/modules/shared/services/api';

// Get mind map for a chapter
const mindMap = await mindMapService.getMindMapByChapter(1, 1);

// Export mind map
const exportData = await mindMapService.exportMindMap(1, 1);
```

## Error Handling

All API calls can throw errors. Use try-catch blocks:

```typescript
import { authService } from '@/modules/shared/services/api';

try {
  const user = await authService.login({
    email: 'user@example.com',
    password: 'wrong-password',
  });
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('Error:', error.response.data.message);
  } else if (error.request) {
    // Request made but no response
    console.error('Network error');
  } else {
    // Other errors
    console.error('Error:', error.message);
  }
}
```

## Authentication Flow

The API client automatically handles:

- Adding JWT tokens to requests
- Refreshing expired tokens
- Clearing tokens on logout
- Redirecting to login on authentication failure

Tokens are stored in AsyncStorage:

- `@quiz_game:auth_token` - Access token
- `@quiz_game:refresh_token` - Refresh token

## Type Safety

All services are fully typed. Import types as needed:

```typescript
import type { Book, Chapter, QuizAttempt, Flashcard } from '@/modules/shared/services/api';

const books: Book[] = await booksService.getAllBooks();
```

## API Endpoints Reference

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - Logout

### Books

- `GET /books` - List all books
- `GET /books/:id` - Get book by ID

### Chapters

- `GET /books/:bookId/chapters` - List chapters
- `GET /books/:bookId/chapters/:id` - Get chapter by ID

### Flashcards

- `GET /books/:bookId/chapters/:chapterId/flashcards` - List flashcards
- `GET /books/:bookId/chapters/:chapterId/flashcards/random?count=5` - Random flashcards
- `GET /books/:bookId/chapters/:chapterId/flashcards/:id` - Get flashcard by ID

### Quiz

- `GET /books/:bookId/chapters/:chapterId/quiz/info` - Get quiz config
- `POST /books/:bookId/chapters/:chapterId/quiz/start` - Start quiz
- `POST /books/:bookId/chapters/:chapterId/quiz/submit` - Submit answers
- `GET /books/:bookId/chapters/:chapterId/quiz/attempts` - Get attempt history
- `GET /books/:bookId/chapters/:chapterId/quiz/attempts/:attemptId` - Get attempt details

### Mind Map

- `GET /books/:bookId/chapters/:chapterId/mindmap` - Get mind map
- `GET /books/:bookId/chapters/:chapterId/mindmap/export` - Export mind map
