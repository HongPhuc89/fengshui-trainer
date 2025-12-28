# React Hooks Documentation

Custom React hooks for easy integration with backend API services.

## Available Hooks

### Authentication Hooks

#### `useAuth()`

Manages authentication state and operations.

```typescript
import { useAuth } from '@/modules/shared/services/hooks';

function LoginScreen() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      // Navigate to home screen
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View>
      {isAuthenticated ? (
        <>
          <Text>Welcome, {user?.name}!</Text>
          <Button title="Logout" onPress={logout} />
        </>
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
}
```

**Returns:**

- `user` - Current user object or null
- `isLoading` - Loading state
- `isAuthenticated` - Authentication status
- `login(email, password)` - Login function
- `register(email, password, name?)` - Register function
- `logout()` - Logout function
- `refreshProfile()` - Refresh user profile
- `checkAuth()` - Check authentication status

---

### Books & Chapters Hooks

#### `useBooks()`

Fetches all books.

```typescript
import { useBooks } from '@/modules/shared/services/hooks';

function BooksListScreen() {
  const { books, isLoading, error, refetch } = useBooks();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <FlatList
      data={books}
      renderItem={({ item }) => <BookCard book={item} />}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
}
```

#### `useBook(bookId)`

Fetches a specific book.

```typescript
import { useBook } from '@/modules/shared/services/hooks';

function BookDetailScreen({ route }) {
  const { bookId } = route.params;
  const { book, isLoading, error } = useBook(bookId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <Text>{book?.title}</Text>
      <Text>{book?.description}</Text>
    </View>
  );
}
```

#### `useChapters(bookId)`

Fetches all chapters for a book.

```typescript
import { useChapters } from '@/modules/shared/services/hooks';

function ChaptersScreen({ bookId }) {
  const { chapters, isLoading, error, refetch } = useChapters(bookId);

  return (
    <FlatList
      data={chapters}
      renderItem={({ item }) => <ChapterCard chapter={item} />}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
}
```

#### `useChapter(bookId, chapterId)`

Fetches a specific chapter.

---

### Flashcards Hooks

#### `useFlashcards(bookId, chapterId)`

Fetches all flashcards for a chapter.

```typescript
import { useFlashcards } from '@/modules/shared/services/hooks';

function FlashcardsScreen({ bookId, chapterId }) {
  const { flashcards, isLoading, error } = useFlashcards(bookId, chapterId);

  return (
    <FlashcardDeck flashcards={flashcards} />
  );
}
```

#### `useRandomFlashcards(bookId, chapterId, count)`

Fetches random flashcards for practice mode.

```typescript
import { useRandomFlashcards } from '@/modules/shared/services/hooks';

function PracticeScreen({ bookId, chapterId }) {
  const { flashcards, isLoading, shuffle } = useRandomFlashcards(
    bookId,
    chapterId,
    10 // Get 10 random cards
  );

  return (
    <View>
      <FlashcardDeck flashcards={flashcards} />
      <Button title="Shuffle" onPress={shuffle} />
    </View>
  );
}
```

**Returns:**

- `flashcards` - Array of flashcards
- `isLoading` - Loading state
- `error` - Error object if any
- `shuffle()` - Get new random set
- `refetch()` - Refetch same set

---

### Quiz Hooks

#### `useQuizConfig(bookId, chapterId)`

Fetches quiz configuration.

```typescript
import { useQuizConfig } from '@/modules/shared/services/hooks';

function QuizInfoScreen({ bookId, chapterId }) {
  const { config, isLoading } = useQuizConfig(bookId, chapterId);

  return (
    <View>
      <Text>Questions: {config?.questionCount}</Text>
      <Text>Passing Score: {config?.passingScore}%</Text>
      <Text>Time Limit: {config?.timeLimit} minutes</Text>
    </View>
  );
}
```

#### `useQuiz(bookId, chapterId)`

Manages quiz attempt lifecycle.

```typescript
import { useQuiz } from '@/modules/shared/services/hooks';
import { useState } from 'react';

function QuizScreen({ bookId, chapterId }) {
  const {
    currentAttempt,
    submitResult,
    isLoading,
    startQuiz,
    submitQuiz,
    resetQuiz,
  } = useQuiz(bookId, chapterId);

  const [answers, setAnswers] = useState<Record<number, any>>({});

  const handleStart = async () => {
    await startQuiz();
  };

  const handleSubmit = async () => {
    try {
      const result = await submitQuiz(answers);
      console.log('Score:', result.score);
      console.log('Passed:', result.passed);
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  if (!currentAttempt) {
    return <Button title="Start Quiz" onPress={handleStart} />;
  }

  if (submitResult) {
    return (
      <View>
        <Text>Score: {submitResult.score}%</Text>
        <Text>Status: {submitResult.passed ? 'Passed' : 'Failed'}</Text>
        <Text>
          Correct: {submitResult.correctAnswers}/{submitResult.totalQuestions}
        </Text>
        <Button title="Try Again" onPress={resetQuiz} />
      </View>
    );
  }

  return (
    <View>
      {currentAttempt.questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          onAnswer={(answer) => {
            setAnswers({ ...answers, [question.id]: answer });
          }}
        />
      ))}
      <Button
        title="Submit Quiz"
        onPress={handleSubmit}
        disabled={isLoading}
      />
    </View>
  );
}
```

**Returns:**

- `currentAttempt` - Current quiz attempt or null
- `submitResult` - Quiz submission result or null
- `isLoading` - Loading state
- `error` - Error object if any
- `startQuiz()` - Start new quiz attempt
- `submitQuiz(answers)` - Submit quiz answers
- `resetQuiz()` - Reset quiz state

#### `useQuizHistory(bookId, chapterId)`

Fetches user's quiz attempt history.

```typescript
import { useQuizHistory } from '@/modules/shared/services/hooks';

function QuizHistoryScreen({ bookId, chapterId }) {
  const { attempts, isLoading, refetch } = useQuizHistory(bookId, chapterId);

  return (
    <FlatList
      data={attempts}
      renderItem={({ item }) => (
        <View>
          <Text>Score: {item.score}%</Text>
          <Text>Date: {new Date(item.completedAt).toLocaleDateString()}</Text>
          <Text>Status: {item.passed ? '✓ Passed' : '✗ Failed'}</Text>
        </View>
      )}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
}
```

#### `useQuizAttempt(bookId, chapterId, attemptId)`

Fetches details of a specific quiz attempt.

---

### Mind Map Hooks

#### `useMindMap(bookId, chapterId)`

Fetches mind map for a chapter.

```typescript
import { useMindMap } from '@/modules/shared/services/hooks';

function MindMapScreen({ bookId, chapterId }) {
  const { mindMap, isLoading, exportMindMap } = useMindMap(bookId, chapterId);

  const handleExport = async () => {
    try {
      const data = await exportMindMap();
      // Handle export (e.g., save to file or share)
      console.log('Exported:', data);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <View>
      <MindMapViewer data={mindMap?.structure} />
      <Button title="Export" onPress={handleExport} />
    </View>
  );
}
```

**Returns:**

- `mindMap` - Mind map data or null
- `isLoading` - Loading state
- `error` - Error object if any
- `refetch()` - Refetch mind map
- `exportMindMap()` - Export mind map as JSON

---

## Common Patterns

### Error Handling

```typescript
function MyScreen() {
  const { data, error, isLoading } = useSomeHook();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return (
      <View>
        <Text>Error: {error.message}</Text>
        <Button title="Retry" onPress={refetch} />
      </View>
    );
  }

  return <DataView data={data} />;
}
```

### Pull to Refresh

```typescript
function MyListScreen() {
  const { data, isLoading, refetch } = useSomeHook();

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
        />
      }
    />
  );
}
```

### Conditional Fetching

```typescript
function ConditionalScreen({ shouldFetch, bookId }) {
  const { data, isLoading } = useBook(shouldFetch ? bookId : 0);

  // Hook won't fetch if bookId is 0 or falsy
}
```

## Best Practices

1. **Always handle loading states** - Show loading indicators while data is being fetched
2. **Handle errors gracefully** - Display error messages and provide retry options
3. **Use refetch for updates** - Call `refetch()` when you need fresh data
4. **Combine hooks** - Use multiple hooks together for complex screens
5. **Memoize callbacks** - Use `useCallback` for functions passed to hooks

## Example: Complete Screen

```typescript
import { useBooks, useAuth } from '@/modules/shared/services/hooks';
import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';

function HomeScreen({ navigation }) {
  const { user, isAuthenticated } = useAuth();
  const { books, isLoading, error, refetch } = useBooks();

  if (!isAuthenticated) {
    navigation.navigate('Login');
    return null;
  }

  if (isLoading && !books.length) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return (
      <ErrorView
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <View>
      <Text>Welcome, {user?.name}!</Text>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
          />
        }
      />
    </View>
  );
}
```
