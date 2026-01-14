# Analytics Documentation

This document describes the analytics implementation in the Flutter mobile app using Amplitude and Firebase Analytics.

## Overview

The app uses a dual analytics approach:

- **Amplitude**: Primary analytics platform for detailed event tracking and user behavior analysis
- **Firebase Analytics**: Secondary platform for Google ecosystem integration

Both platforms receive the same events through a centralized `AnalyticsService`.

## Setup

### 1. Configure Amplitude API Key

The Amplitude API key is configured in the `.env` file:

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Amplitude API key:
   ```env
   AMPLITUDE_API_KEY=your_amplitude_api_key_here
   ```

### 2. Environment Configuration

The API key is loaded from the `.env` file using `flutter_dotenv`:

```dart
// lib/core/config/environment.dart
static String get amplitudeApiKey => dotenv.get(
  'AMPLITUDE_API_KEY',
  fallback: '',
);
```

The `.env` file is loaded automatically when the app starts in `main.dart`.

## Architecture

### AnalyticsService

The `AnalyticsService` is a singleton that provides:

- Unified interface for both Amplitude and Firebase Analytics
- Type-safe event tracking methods
- User identification and properties management
- Automatic error handling

```dart
// Initialize (called in main.dart)
await AnalyticsService().initialize();

// Track events
await AnalyticsService().logEvent('custom_event', {'key': 'value'});

// Set user properties
await AnalyticsService().setUserId('user123');
await AnalyticsService().setUserProperties({'plan': 'premium'});
```

### AmplitudeObserver

Custom `NavigatorObserver` that automatically tracks screen views when users navigate between pages.

## Tracked Events

### Authentication Events

| Event Name         | Properties       | Triggered When                                      |
| ------------------ | ---------------- | --------------------------------------------------- |
| `login`            | `method: string` | User successfully logs in                           |
| `login_failure`    | `reason: string` | Login attempt fails                                 |
| `register`         | `method: string` | User successfully registers                         |
| `register_failure` | `reason: string` | Registration fails                                  |
| `logout`           | -                | User logs out                                       |
| `session_restored` | -                | User session is automatically restored on app start |

### Screen View Events

| Event Name    | Properties                                      | Triggered When               |
| ------------- | ----------------------------------------------- | ---------------------------- |
| `screen_view` | `screen_name: string`<br>`screen_class: string` | User navigates to any screen |

### Book & Reading Events

| Event Name                 | Properties                                                                                                     | Triggered When              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `book_list_viewed`         | -                                                                                                              | User opens the books list   |
| `book_detail_viewed`       | `book_id: int`<br>`book_title: string`                                                                         | User views a book's details |
| `chapter_opened`           | `book_id: int`<br>`chapter_id: int`<br>`chapter_title: string`                                                 | User opens a chapter        |
| `reading_session_started`  | `book_id: int`<br>`chapter_id: int`                                                                            | PDF viewer loads            |
| `reading_progress_updated` | `book_id: int`<br>`chapter_id: int`<br>`current_page: int`<br>`total_pages: int`<br>`progress_percentage: int` | User scrolls through pages  |

### Quiz Events

| Event Name               | Properties                                                                                                                                              | Triggered When          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `quiz_started`           | `book_id: int`<br>`chapter_id: int`<br>`difficulty: string`                                                                                             | User starts a quiz      |
| `quiz_question_answered` | `question_number: int`<br>`is_correct: bool`<br>`difficulty: string`                                                                                    | User answers a question |
| `quiz_completed`         | `book_id: int`<br>`chapter_id: int`<br>`score: int`<br>`total_questions: int`<br>`difficulty: string`<br>`time_spent_seconds: int`<br>`percentage: int` | User completes a quiz   |
| `quiz_results_viewed`    | `attempt_id: int`<br>`score: int`                                                                                                                       | User views quiz results |

### Flashcard Events

| Event Name                    | Properties                                                                                | Triggered When                  |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
| `flashcard_session_started`   | `book_id: int`<br>`chapter_id: int`<br>`card_count: int`                                  | User opens flashcards           |
| `flashcard_flipped`           | `card_index: int`<br>`showing_answer: bool`                                               | User flips a card               |
| `flashcard_session_completed` | `book_id: int`<br>`chapter_id: int`<br>`cards_reviewed: int`<br>`time_spent_seconds: int` | User finishes flashcard session |

### Mindmap Events

| Event Name       | Properties                          | Triggered When       |
| ---------------- | ----------------------------------- | -------------------- |
| `mindmap_viewed` | `book_id: int`<br>`chapter_id: int` | User views a mindmap |

## User Properties

The following user properties are set after successful authentication:

| Property | Type   | Description          |
| -------- | ------ | -------------------- |
| `email`  | string | User's email address |
| `name`   | string | User's display name  |

User ID is set to the user's database ID (as a string).

## Usage Examples

### Tracking Custom Events

```dart
import 'package:mobile_flutter/core/services/analytics_service.dart';

final analytics = AnalyticsService();

// Simple event
await analytics.logEvent('button_clicked');

// Event with properties
await analytics.logEvent('feature_used', {
  'feature_name': 'pdf_export',
  'user_tier': 'premium',
});
```

### Tracking Authentication

```dart
// On successful login
await analytics.logLogin(method: 'email');
await analytics.setUserId(user.id.toString());
await analytics.setUserProperties({
  'email': user.email,
  'name': user.name,
});

// On logout
await analytics.logLogout();
await analytics.clearUser();
```

### Tracking Book Interactions

```dart
// When user views a book
await analytics.logBookDetailViewed(
  bookId: book.id,
  bookTitle: book.title,
);

// When user opens a chapter
await analytics.logChapterOpened(
  bookId: book.id,
  chapterId: chapter.id,
  chapterTitle: chapter.title,
);
```

### Tracking Quiz Progress

```dart
// Start quiz
await analytics.logQuizStarted(
  bookId: bookId,
  chapterId: chapterId,
  difficulty: 'medium',
);

// Complete quiz
await analytics.logQuizCompleted(
  bookId: bookId,
  chapterId: chapterId,
  score: 8,
  totalQuestions: 10,
  difficulty: 'medium',
  timeSpentSeconds: 300,
);
```

## Best Practices

1. **Don't Track Sensitive Data**: Never log passwords, tokens, or other sensitive information
2. **Use Consistent Naming**: Follow snake_case for event names and property keys
3. **Add Context**: Include relevant IDs and metadata to make events actionable
4. **Handle Errors Gracefully**: The service already handles errors internally, but always await analytics calls
5. **Test in Development**: Analytics events are logged to console in debug mode for easy verification

## Debugging

In development mode, all analytics events are logged to the console:

```
📊 [Analytics] Amplitude initialized successfully
📊 [Analytics] Event logged: login {method: email}
📊 [Analytics] User ID set: 123
📊 [AmplitudeObserver] Screen view: /books
```

## Verification

To verify analytics are working:

1. **Check Console Logs**: Look for `📊 [Analytics]` messages in the debug console
2. **Amplitude Dashboard**: Events should appear in real-time in the Amplitude dashboard
3. **Firebase Console**: Events should appear in Firebase Analytics (with some delay)

## Troubleshooting

### Analytics Not Initializing

- Verify the Amplitude API key is set correctly using `--dart-define`
- Check console for initialization errors
- Ensure `AnalyticsService().initialize()` is called in `main()`

### Events Not Appearing

- Verify the API key is valid
- Check network connectivity
- Events may take a few minutes to appear in dashboards
- Look for error messages in console logs

### Missing User Properties

- Ensure `setUserId()` and `setUserProperties()` are called after login
- Verify user data is available when setting properties
- Check that properties are set before logging events
