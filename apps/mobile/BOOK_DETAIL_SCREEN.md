# Book Detail Screen - Màn Hình Chi Tiết Sách

## Tổng Quan

Màn hình chi tiết sách được thiết kế theo giao diện tham khảo, hiển thị đầy đủ thông tin về sách và các công cụ học tập.

## Đường Dẫn

```
/books/[id]
```

## Tính Năng

### 1. **Thông Tin Sách**

- ✅ Cover sách (hoặc placeholder nếu không có ảnh)
- ✅ Tên sách và tác giả
- ✅ Số lượng chương
- ✅ Thời gian học dự kiến (tính 5 phút/chương)
- ✅ Progress bar hiển thị tiến độ học tập

### 2. **Công Cụ Học Tập**

Các action buttons được thiết kế theo reference image:

- **Tóm tắt** - Xem tóm tắt nội dung sách
- **Quiz** - Làm bài kiểm tra
- **Flashcards** - Học với flashcards
- **Hỏi đáp với sách** - Chat AI về nội dung sách
- **Mindmap** - Xem sơ đồ tư duy (highlighted với background khác)

### 3. **Danh Sách Chương**

- Hiển thị tất cả các chương của sách
- Số thứ tự chương trong circle badge
- Tên và mô tả chương
- Click để xem chi tiết chương (TODO)

## Cách Sử Dụng

### Navigation từ Home Screen

```tsx
import { useRouter } from 'expo-router';

const router = useRouter();
router.push(`/books/${bookId}`);
```

### Lấy Dữ Liệu

Screen tự động load dữ liệu khi mount:

- Thông tin sách qua `booksService.getBookById()`
- Danh sách chương qua `booksService.getChaptersByBookId()`

## Thiết Kế UI

### Color Scheme

- **Primary Action Color**: `#4A9B8E` (Teal/Jade green)
- **Light Background**: `#E8F5F3` (Light teal)
- **Gold Icons**: `colors.secondary.gold` (#FFD700)

### Layout

```
┌─────────────────────────────────┐
│ ← Header (Back + Title)         │
├─────────────────────────────────┤
│ ┌─────┐  Book Title             │
│ │Cover│  Author                 │
│ │Image│  📚 X chương  ⏱️ X phút  │
│ └─────┘  Progress Bar           │
├─────────────────────────────────┤
│ Mô tả                           │
│ Description text...             │
├─────────────────────────────────┤
│ Công cụ học tập                 │
│ ┌─────────────────────────────┐ │
│ │ 📄 Tóm tắt              →   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ❓ Quiz                 →   │ │
│ └─────────────────────────────┘ │
│ ... (more actions)              │
├─────────────────────────────────┤
│ Danh sách chương                │
│ ① Chapter 1 Title          →   │
│ ② Chapter 2 Title          →   │
│ ...                             │
└─────────────────────────────────┘
```

## TODO - Tính Năng Cần Bổ Sung

### 1. **Progress Tracking**

- [ ] Lưu và hiển thị tiến độ học thực tế
- [ ] Cập nhật progress bar dựa trên chapters đã hoàn thành
- [ ] Sync progress với backend

### 2. **Action Handlers**

- [ ] Implement navigation cho từng action button:
  - `/books/[id]/summary` - Tóm tắt
  - `/books/[id]/quiz` - Quiz
  - `/books/[id]/flashcards` - Flashcards
  - `/books/[id]/chat` - Hỏi đáp AI
  - `/books/[id]/mindmap` - Mindmap

### 3. **Chapter Navigation**

- [ ] Tạo screen chi tiết chapter
- [ ] Navigate to `/books/[id]/chapters/[chapterId]`

### 4. **Offline Support**

- [ ] Cache book data
- [ ] Offline reading capability

### 5. **Enhancements**

- [ ] Share book functionality
- [ ] Bookmark/Favorite
- [ ] Reading statistics
- [ ] Estimated time based on user's reading speed

## API Dependencies

### Books Service

```typescript
// Get book details
booksService.getBookById(bookId: number): Promise<Book>

// Get chapters
booksService.getChaptersByBookId(bookId: number): Promise<Chapter[]>
```

### Types

```typescript
interface Book {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  author?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Chapter {
  id: number;
  bookId: number;
  title: string;
  description?: string;
  content?: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Testing

### Test Cases

1. ✅ Load book with cover image
2. ✅ Load book without cover image (show placeholder)
3. ✅ Display chapters list
4. ✅ Calculate estimated study time
5. ✅ Back navigation
6. ⏳ Handle loading state
7. ⏳ Handle error state
8. ⏳ Retry on error

### Manual Testing

```bash
# Ensure backend is running
cd apps/backend
npm run dev

# Ensure mobile app is running
cd apps/mobile
npm start

# Navigate to a book from home screen
# Test all interactions
```

## Performance Considerations

- **Parallel Loading**: Book data and chapters load simultaneously using `Promise.all()`
- **Image Optimization**: Cover images use `resizeMode="cover"`
- **List Optimization**: Chapters use `key={chapter.id}` for efficient rendering
- **Lazy Loading**: Consider implementing pagination for books with many chapters

## Accessibility

- ✅ Touchable areas have proper `activeOpacity`
- ✅ Text has proper contrast ratios
- ⏳ Add accessibility labels for screen readers
- ⏳ Support for larger text sizes

---

**Created**: 2025-12-08
**Last Updated**: 2025-12-08
**Status**: ✅ Implemented, 🚧 Pending Action Handlers
