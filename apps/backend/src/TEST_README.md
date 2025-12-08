# Backend Unit Tests

This directory contains comprehensive unit tests for the backend API.

## Test Coverage

### Authentication Module (`auth/`)

- **auth.service.spec.ts**: Tests for authentication service
  - User registration
  - User login
  - Token refresh
  - User logout
  - Password validation

### Books Module (`books/`)

- **books.service.spec.ts**: Tests for book management
  - CRUD operations for books
  - Book processing triggers
  - Admin vs. user access
  - Status filtering (published/draft)

- **chapters.service.spec.ts**: Tests for chapter management
  - CRUD operations for chapters
  - Auto-ordering
  - Book integration
  - Chapter count updates

- **flashcards.service.spec.ts**: Tests for flashcard management
  - CRUD operations for flashcards
  - CSV import/export
  - Duplicate detection
  - Random flashcard selection

### Quiz Module (`quiz/`)

- **question-bank.service.spec.ts**: Tests for question bank
  - CRUD operations for questions
  - CSV import/export
  - Question filtering by difficulty
  - Active/inactive questions

- **quiz-attempts.service.spec.ts**: Tests for quiz attempts
  - Starting a quiz
  - Submitting answers
  - Score calculation
  - Question selection by difficulty
  - Grading logic for all question types (Multiple Choice, Multiple Answer, True/False)

### Mind Map Module (`mindmap/`)

- **mindmap.service.spec.ts**: Tests for mind map management
  - CRUD operations for mind maps
  - Structure validation
  - Circular reference detection
  - Size limit enforcement
  - Active status toggling
  - User access controls

### Users Module (`users/`)

- **users.service.spec.ts**: Tests for user management
  - User retrieval
  - Last login updates
  - User profile

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage

```bash
npm run test:cov
```

### Run specific test file

```bash
npm test -- auth.service.spec.ts
```

## Test Structure

Each test file follows this structure:

1. **Setup**: Mock dependencies and create test module
2. **Test Cases**: Organized by method/functionality
3. **Assertions**: Verify expected behavior and side effects

## Mocking Strategy

- **Repositories**: Mocked using Jest
- **Services**: Mocked with custom implementations
- **External Dependencies**: Mocked to isolate unit tests

## Best Practices

1. **Isolation**: Each test is independent
2. **Clarity**: Test names describe what they test
3. **Coverage**: Both success and error cases are tested
4. **Maintainability**: Tests are easy to update when code changes

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%
