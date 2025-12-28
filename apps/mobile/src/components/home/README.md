# Home Screen Components

This directory contains all the components used in the Home Screen of the mobile app.

## Component Structure

```
home/
├── AppHeader.tsx        # App header with logo and points
├── SectionHeader.tsx    # Section title and subtitle
├── BookIcon.tsx         # Book icon with gradient background
├── BookInfo.tsx         # Book information (title, category, description, chapters)
├── BookCard.tsx         # Complete book card (combines BookIcon + BookInfo)
├── BooksList.tsx        # List of books with loading/error/empty states
└── index.ts             # Barrel export file
```

## Components Overview

### 1. **AppHeader**

Displays the app name and user points in the header.

**Props:**

- `appName: string` - Name of the application
- `points: number` - User's current points

**Usage:**

```tsx
<AppHeader appName="Thiên Thư Các" points={50} />
```

---

### 2. **SectionHeader**

Displays a section title with subtitle.

**Props:**

- `title: string` - Section title
- `subtitle: string` - Section subtitle/description

**Usage:**

```tsx
<SectionHeader title="Tăng Thư Các" subtitle="Chọn bộ sách để bắt đầu con đường tu tiên." />
```

---

### 3. **BookIcon**

Displays a large letter icon with gradient background representing a book.

**Props:**

- `initial: string` - First letter of the book title
- `gradientColors: [string, string]` - Gradient colors for the background

**Usage:**

```tsx
<BookIcon initial="N" gradientColors={['#8B4513', '#D2691E']} />
```

---

### 4. **BookInfo**

Displays book details including title, category, description, and chapter count.

**Props:**

- `title: string` - Book title
- `category: string` - Book category label
- `description: string` - Book description
- `chapterCount: number` - Number of chapters

**Usage:**

```tsx
<BookInfo title="Nhập Môn Phong Thủy" category="THÀNH Ở TỪ" description="Cuốn sách cơ bản nhất..." chapterCount={5} />
```

---

### 5. **BookCard**

A complete book card that combines BookIcon and BookInfo with touchable functionality.

**Props:**

- `title: string` - Book title
- `category: string` - Book category
- `description: string` - Book description
- `chapterCount: number` - Number of chapters
- `initial: string` - First letter for icon
- `gradientColors: [string, string]` - Icon gradient colors
- `onPress: () => void` - Callback when card is pressed

**Usage:**

```tsx
<BookCard
  title="Nhập Môn Phong Thủy"
  category="THÀNH Ở TỪ"
  description="Cuốn sách cơ bản nhất..."
  chapterCount={5}
  initial="N"
  gradientColors={['#8B4513', '#D2691E']}
  onPress={() => console.log('Book pressed')}
/>
```

---

### 6. **BooksList**

Manages the list of books with loading, error, and empty states.

**Props:**

- `books: Book[]` - Array of book objects
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error object if any
- `onBookPress: (bookId: number) => void` - Callback when a book is pressed

**Usage:**

```tsx
<BooksList books={books} isLoading={isLoading} error={error} onBookPress={(id) => router.push(`/books/${id}`)} />
```

**Helper Functions:**

- `getBookInitial(title)` - Extracts first letter from book title
- `getCategoryLabel(index)` - Returns category label based on index
- `getIconGradient(index)` - Returns gradient colors based on index

---

## Design System

### Colors

- **Primary Gold:** `#FFD700`
- **Primary Orange:** `#FF8C00`
- **Background Gradient:** `#1a1a2e` → `#16213e` → `#0f3460`
- **Error Red:** `#FF6B6B`
- **White with opacity:** `rgba(255, 255, 255, 0.7)`

### Icon Gradients

1. Brown: `#8B4513` → `#D2691E`
2. Blue: `#2C5F7C` → `#4A8FB0`
3. Purple: `#5B4B8A` → `#8B7AB8`
4. Gold: `#C17817` → `#E8A84D`
5. Sienna: `#6B4423` → `#A0522D`

### Categories

- THÀNH Ở TỪ
- PHỤC HY
- TRẤN ĐOÀN
- TU TIÊN
- HUYỀN HUYỄN

---

## Maintenance Tips

1. **Adding new categories:** Update the `categories` array in `BooksList.tsx`
2. **Changing gradient colors:** Update the `gradients` array in `BooksList.tsx`
3. **Modifying book card layout:** Edit `BookCard.tsx`
4. **Updating header design:** Edit `AppHeader.tsx`
5. **Changing loading/error states:** Edit `BooksList.tsx`

---

## Future Improvements

- [ ] Add pull-to-refresh functionality
- [ ] Add search/filter functionality
- [ ] Add category-based filtering
- [ ] Fetch real chapter counts from API
- [ ] Add animations for card interactions
- [ ] Add skeleton loading states
- [ ] Make categories dynamic from backend
