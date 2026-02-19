# Books API Optimization - Lazy Loading Chapters

## Document Information
- **Updated**: 2026-02-17
- **Change**: Books API now loads chapters on-demand instead of returning all content at once

---

## Problem

Previously, `GET /api/books/{slug}/` returned:
- Book metadata
- **Full content of ALL chapters** in one response

This caused:
- ❌ Large payload size (especially for books with 20+ chapters)
- ❌ Slow initial load time
- ❌ Wasted bandwidth (user may only read 1-2 chapters)
- ❌ Memory issues on mobile devices

---

## Solution

**Lazy Loading Pattern** (similar to video courses):

1. **Book Detail** (`GET /api/books/{slug}/`) returns:
   - Book metadata
   - Table of contents (chapter list with metadata only)
   - Demo content (if available)
   - **NO full chapter content**

2. **Individual Chapter** (`GET /api/books/{slug}/chapters/{order}/`) returns:
   - Single chapter content
   - Watermark configuration
   - Navigation (previous/next chapter)

---

## API Changes

### Before (Old Design)
```json
GET /api/books/ky-mon-co-ban/

{
  "id": 1,
  "title": "...",
  "chapters": [
    {
      "id": 1,
      "title": "Chương 1",
      "content": "<p>10,000 characters...</p>"  // ❌ Heavy
    },
    {
      "id": 2,
      "title": "Chương 2",
      "content": "<p>15,000 characters...</p>"  // ❌ Heavy
    }
    // ... 18 more chapters
  ]
}
```

**Payload**: ~500KB - 2MB

---

### After (New Design)

#### Step 1: Get Book + TOC
```json
GET /api/books/ky-mon-co-ban/

{
  "id": 1,
  "title": "Kỳ Môn Cơ Bản",
  "total_chapters": 20,
  "table_of_contents": [
    {
      "chapter_id": 1,
      "title": "Chương 1: Giới thiệu",
      "order": 1,
      "is_demo": true
    },
    {
      "chapter_id": 2,
      "title": "Chương 2: Bát Quái",
      "order": 2,
      "is_demo": false
    }
    // ... metadata only, no content
  ],
  "demo_content": "<p>Demo preview...</p>",
  "progress": {
    "last_read_chapter": {"id": 5, "order": 5},
    "completed_chapters": 4
  }
}
```

**Payload**: ~5-10KB ✅

#### Step 2: Load Chapter On-Demand
```json
GET /api/books/ky-mon-co-ban/chapters/1/

{
  "id": 1,
  "book": {
    "id": 1,
    "title": "Kỳ Môn Cơ Bản",
    "slug": "ky-mon-co-ban"
  },
  "title": "Chương 1: Giới thiệu",
  "order": 1,
  "content": "<p>Full chapter content...</p>",
  "watermark": {
    "user_name": "Nguyễn Văn A",
    "phone_number": "0901234567"
  },
  "navigation": {
    "previous_chapter": null,
    "next_chapter": {
      "id": 2,
      "title": "Chương 2: Bát Quái",
      "order": 2
    }
  }
}
```

**Payload**: ~20-50KB per chapter ✅

---

## Benefits

### Performance
- ✅ **90% reduction** in initial payload size
- ✅ **Faster initial load** (5-10KB vs 500KB-2MB)
- ✅ **Progressive loading** - only load what user reads
- ✅ **Better mobile experience** - less memory usage

### User Experience
- ✅ **Instant book preview** - see TOC immediately
- ✅ **Smooth navigation** - previous/next chapter links
- ✅ **Resume reading** - track last read chapter
- ✅ **Offline-friendly** - can cache individual chapters

### Backend
- ✅ **Reduced database load** - query one chapter at a time
- ✅ **Better caching** - cache chapters individually
- ✅ **Scalable** - works for books with 100+ chapters

---

## Implementation Notes

### Backend (Django)

```python
# books/views.py
class BookDetailView(RetrieveAPIView):
    def retrieve(self, request, slug):
        book = get_object_or_404(Book, slug=slug)
        
        # Only return chapter metadata, NOT content
        chapters = book.chapters.values('id', 'title', 'order', 'is_demo')
        
        return Response({
            'id': book.id,
            'title': book.title,
            'table_of_contents': chapters,
            # NO full content here
        })

class ChapterDetailView(RetrieveAPIView):
    def retrieve(self, request, book_slug, chapter_order):
        chapter = get_object_or_404(
            BookChapter,
            book__slug=book_slug,
            order=chapter_order
        )
        
        # Check permissions
        if not self.has_permission(request.user, chapter):
            raise PermissionDenied()
        
        # Return full content for single chapter
        return Response({
            'id': chapter.id,
            'title': chapter.title,
            'content': chapter.content,  # Full HTML
            'watermark': generate_watermark(request.user),
            'navigation': get_navigation(chapter),
        })
```

### Frontend (Flutter)

```dart
// 1. Load book + TOC
final book = await api.getBook(slug);

// 2. Display TOC
ListView.builder(
  itemCount: book.tableOfContents.length,
  itemBuilder: (context, index) {
    final chapter = book.tableOfContents[index];
    return ListTile(
      title: Text(chapter.title),
      onTap: () => navigateToChapter(chapter.order),
    );
  },
);

// 3. Load chapter on-demand when user taps
Future<void> navigateToChapter(int order) async {
  final chapter = await api.getChapter(book.slug, order);
  // Display chapter content
}
```

### Frontend (Vue.js)

```typescript
// 1. Load book + TOC
const book = await booksApi.getBook(slug);

// 2. Display TOC
<ul>
  <li v-for="chapter in book.tableOfContents" :key="chapter.id">
    <router-link :to="`/books/${book.slug}/chapters/${chapter.order}`">
      {{ chapter.title }}
    </router-link>
  </li>
</ul>

// 3. Load chapter on route change
async function loadChapter(order: number) {
  const chapter = await booksApi.getChapter(bookSlug, order);
  // Display chapter content
}
```

---

## Caching Strategy

### Backend (Redis)
```python
# Cache individual chapters for 1 hour
cache_key = f'chapter:{book_slug}:{chapter_order}'
chapter = cache.get(cache_key)

if not chapter:
    chapter = BookChapter.objects.get(...)
    cache.set(cache_key, chapter, 3600)
```

### Frontend (Mobile)
```dart
// Cache chapters in local storage
final cachedChapter = await storage.getChapter(bookSlug, order);
if (cachedChapter != null && !cachedChapter.isExpired) {
  return cachedChapter;
}

final chapter = await api.getChapter(bookSlug, order);
await storage.saveChapter(chapter);
```

---

## Migration Notes

### Database
- ✅ No schema changes needed
- ✅ Existing `books_bookchapter` table works as-is

### API
- ✅ `GET /api/books/{slug}/` - Modified response (remove full content)
- ✅ `GET /api/books/{slug}/chapters/{order}/` - Enhanced response (add navigation)

### Clients
- ⚠️ **Breaking change** for mobile/web apps
- Need to update to load chapters on-demand
- Update UI to show TOC first, then load chapter

---

## Comparison with Video Courses

Both now follow the same pattern:

| Feature | Books | Video Courses |
|---------|-------|---------------|
| Container | Book | Course |
| Content Unit | Chapter | Lesson |
| List Endpoint | `/books/` | `/courses/` |
| Detail Endpoint | `/books/{slug}/` | `/courses/{slug}/` |
| Content Endpoint | `/books/{slug}/chapters/{order}/` | `/courses/{slug}/lessons/{slug}/` |
| Lazy Loading | ✅ Yes | ✅ Yes |
| Navigation | ✅ Prev/Next | ✅ Prev/Next |
| Progress Tracking | ✅ Yes | ✅ Yes |

---

*This optimization significantly improves app performance and user experience!*
