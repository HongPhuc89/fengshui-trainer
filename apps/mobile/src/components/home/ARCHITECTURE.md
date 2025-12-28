# Home Screen Component Architecture

## Component Hierarchy

```
HomeScreen (index.tsx)
│
├── LinearGradient (Background)
│   │
│   └── SafeAreaView
│       │
│       ├── AppHeader
│       │   ├── App Icon (T)
│       │   ├── App Name ("Thiên Thư Các")
│       │   └── Points Badge (📚 50)
│       │
│       └── ScrollView
│           │
│           ├── SectionHeader
│           │   ├── Title ("Tăng Thư Các")
│           │   └── Subtitle
│           │
│           └── BooksList
│               │
│               ├── Loading State (if isLoading)
│               │   ├── ActivityIndicator
│               │   └── Loading Text
│               │
│               ├── Error State (if error)
│               │   ├── Error Text
│               │   └── Error Message
│               │
│               ├── Empty State (if no books)
│               │   └── Empty Text
│               │
│               └── Books (if has books)
│                   │
│                   └── BookCard (for each book)
│                       │
│                       ├── BookIcon
│                       │   └── LinearGradient
│                       │       └── Letter (e.g., "N")
│                       │
│                       └── BookInfo
│                           ├── Title
│                           ├── Category Badge
│                           ├── Description
│                           └── Chapter Count Badge
```

## Data Flow

```
HomeScreen
    │
    ├── useBooks() hook
    │   └── Returns: { books, isLoading, error }
    │
    ├── handleBookPress(bookId)
    │   └── router.push(`/books/${bookId}`)
    │
    └── Pass data to children:
        │
        ├── AppHeader
        │   └── Props: { appName, points }
        │
        ├── SectionHeader
        │   └── Props: { title, subtitle }
        │
        └── BooksList
            └── Props: { books, isLoading, error, onBookPress }
                │
                └── For each book:
                    │
                    ├── getBookInitial(title) → initial
                    ├── getCategoryLabel(index) → category
                    ├── getIconGradient(index) → gradientColors
                    └── Random chapter count
                    │
                    └── BookCard
                        └── Props: {
                              title,
                              category,
                              description,
                              chapterCount,
                              initial,
                              gradientColors,
                              onPress
                            }
                            │
                            ├── BookIcon
                            │   └── Props: { initial, gradientColors }
                            │
                            └── BookInfo
                                └── Props: {
                                      title,
                                      category,
                                      description,
                                      chapterCount
                                    }
```

## File Organization

```
apps/mobile/
│
├── app/(tabs)/
│   └── index.tsx                    # Main screen (75 lines)
│       └── Uses: AppHeader, SectionHeader, BooksList
│
└── src/components/home/
    ├── index.ts                     # Barrel exports
    ├── README.md                    # Documentation
    ├── ARCHITECTURE.md              # This file
    │
    ├── AppHeader.tsx                # ~85 lines
    ├── SectionHeader.tsx            # ~40 lines
    ├── BookIcon.tsx                 # ~55 lines
    ├── BookInfo.tsx                 # ~75 lines
    ├── BookCard.tsx                 # ~55 lines
    └── BooksList.tsx                # ~140 lines
```

## Benefits of This Architecture

### 1. **Separation of Concerns**

- Each component has a single responsibility
- Easy to understand and modify individual components
- Clear boundaries between UI elements

### 2. **Reusability**

- Components can be reused in other screens
- `BookCard` can be used in search results, favorites, etc.
- `AppHeader` can be adapted for other screens

### 3. **Testability**

- Each component can be tested independently
- Mock props are simple and straightforward
- Easy to test different states (loading, error, empty)

### 4. **Maintainability**

- Changes to one component don't affect others
- Easy to locate and fix bugs
- Simple to add new features

### 5. **Scalability**

- Easy to add new components
- Can extend functionality without touching existing code
- Clear patterns for future developers

## Component Responsibilities

| Component         | Responsibility               | State | Side Effects     |
| ----------------- | ---------------------------- | ----- | ---------------- |
| **HomeScreen**    | Orchestration, data fetching | None  | Navigation       |
| **AppHeader**     | Display app info             | None  | None             |
| **SectionHeader** | Display section info         | None  | None             |
| **BookIcon**      | Display book visual          | None  | None             |
| **BookInfo**      | Display book details         | None  | None             |
| **BookCard**      | Combine icon + info          | None  | onPress callback |
| **BooksList**     | Manage book list states      | None  | None             |

## State Management

### Current State (Props Drilling)

```
HomeScreen (has state)
    ↓
BooksList (receives state)
    ↓
BookCard (receives individual book)
    ↓
BookIcon + BookInfo (receive book parts)
```

### Future: Context API (if needed)

```tsx
// If app grows, consider:
<BooksContext.Provider value={{ books, isLoading, error }}>
  <HomeScreen />
</BooksContext.Provider>
```

## Performance Considerations

1. **Memoization** (if needed):

   ```tsx
   const BookCard = React.memo(BookCardComponent);
   ```

2. **FlatList** (for large lists):

   ```tsx
   // Replace map() in BooksList with:
   <FlatList
     data={books}
     renderItem={({ item, index }) => <BookCard ... />}
     keyExtractor={(item) => item.id.toString()}
   />
   ```

3. **Image Optimization**:
   - Use `FastImage` for book covers (when added)
   - Implement lazy loading

## Styling Strategy

- **StyleSheet.create()** for performance
- **Inline styles** only for dynamic values (e.g., width percentages)
- **Shared constants** from `@/constants` (colors, spacing, fontSizes)
- **No magic numbers** - all values should be named constants

## Next Steps for Enhancement

1. **Add TypeScript strict mode** to all components
2. **Add PropTypes** or **Zod validation** for runtime checks
3. **Add Storybook** for component documentation
4. **Add unit tests** with Jest and React Native Testing Library
5. **Add E2E tests** with Detox
6. **Add accessibility** labels and hints
7. **Add animations** with Reanimated
8. **Add error boundaries** for graceful error handling
