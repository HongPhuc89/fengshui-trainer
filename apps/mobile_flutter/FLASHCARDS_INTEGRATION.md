# Flashcards Integration Guide

## Adding Flashcards Button to Book Detail Page

To complete the flashcards integration, add a flashcards button to each chapter in the book detail page.

### Location

File: `apps/mobile_flutter/lib/features/books/presentation/pages/book_detail_page.dart`

### Code to Add

In the chapter list item (where you have the PDF viewer button), add a flashcards button:

```dart
// Inside the chapter ListTile or Card widget
Row(
  children: [
    // Existing PDF button
    IconButton(
      icon: const Icon(Icons.picture_as_pdf),
      onPressed: () {
        context.go('/books/$bookId/chapters/${chapter.id}');
      },
      tooltip: 'Xem PDF',
    ),

    // NEW: Flashcards button
    IconButton(
      icon: const Icon(Icons.style),
      onPressed: () {
        context.go('/books/$bookId/chapters/${chapter.id}/flashcards');
      },
      tooltip: 'Flashcards',
      color: Colors.blue,
    ),
  ],
)
```

### Alternative: Using ElevatedButton

If you prefer a button style:

```dart
ElevatedButton.icon(
  onPressed: () {
    context.go('/books/$bookId/chapters/${chapter.id}/flashcards');
  },
  icon: const Icon(Icons.style),
  label: const Text('Flashcards'),
  style: ElevatedButton.styleFrom(
    backgroundColor: Colors.blue,
    foregroundColor: Colors.white,
  ),
)
```

## Verification

After adding the button:

1. Run the app: `flutter run -d chrome`
2. Login with test credentials
3. Navigate to a book
4. Click the flashcards button on any chapter
5. Verify flashcards load and display correctly

## Notes

- The flashcards route is already configured in `main.dart`
- The API endpoint is `/books/{bookId}/chapters/{chapterId}/flashcards/random`
- Progress is stored locally using SecureStorage/SharedPreferences
- The spaced repetition algorithm prioritizes cards with lower mastery levels
