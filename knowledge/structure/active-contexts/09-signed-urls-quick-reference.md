# Quick Reference: Using Signed URLs

## For Backend Developers

### How to Generate Signed URLs Manually

```typescript
import { UploadService } from '../upload/upload.service';

// Inject UploadService
constructor(private readonly uploadService: UploadService) {}

// Generate signed URL for a file path
const signedUrl = await this.uploadService.getSignedUrl('covers/uuid.webp');

// Custom expiration (2 hours)
const signedUrl = await this.uploadService.getSignedUrl('covers/uuid.webp', 7200);

// Extract path from full URL
const path = this.uploadService.extractPathFromUrl(
  'https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/public/books/covers/uuid.webp'
);
// Returns: 'covers/uuid.webp'
```

### Automatic Signed URLs in Books

All book endpoints automatically return signed URLs:

- No manual intervention needed
- URLs are generated on-the-fly for each request
- Expiration: 1 hour by default

## For Frontend Developers

### Important Notes

1. **URLs Expire**: Signed URLs are valid for 1 hour only
2. **Don't Cache**: Never cache signed URLs in localStorage/sessionStorage
3. **Refresh Data**: Fetch fresh book data periodically for long sessions
4. **Error Handling**: Implement retry logic for expired URLs

### Example: React Hook for Auto-Refresh

```typescript
import { useState, useEffect } from 'react';

interface Book {
  id: number;
  title: string;
  cover_file?: {
    path: string;
  };
}

export function useBook(bookId: number) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBook = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}`);
      const data = await response.json();
      setBook(data);
    } catch (error) {
      console.error('Failed to fetch book:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();

    // Refresh every 50 minutes (before 1-hour expiration)
    const interval = setInterval(fetchBook, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [bookId]);

  return { book, loading, refresh: fetchBook };
}
```

### Example: Image with Error Handling

```typescript
import { useState } from 'react';

interface BookCoverProps {
  book: Book;
  onRefresh: () => void;
}

export function BookCover({ book, onRefresh }: BookCoverProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.log('Image failed to load, refreshing...');
    setImageError(true);
    // Refresh book data to get new signed URL
    onRefresh();
  };

  return (
    <img
      src={book.cover_file?.path}
      alt={book.title}
      onError={handleImageError}
      style={{ opacity: imageError ? 0.5 : 1 }}
    />
  );
}
```

### Example: React Native (Expo)

```typescript
import { Image } from 'expo-image';
import { useState, useEffect } from 'react';

export function BookCover({ book }: { book: Book }) {
  const [imageUri, setImageUri] = useState(book.cover_file?.path);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setImageUri(book.cover_file?.path);
  }, [book.cover_file?.path]);

  const handleError = () => {
    if (retryCount < 3) {
      console.log('Image load failed, retrying...');
      // Trigger parent component to refresh book data
      setRetryCount(prev => prev + 1);
      // You would call a refresh function here
    }
  };

  return (
    <Image
      source={{ uri: imageUri }}
      style={{ width: 200, height: 300 }}
      onError={handleError}
      placeholder={require('./placeholder.png')}
      transition={300}
    />
  );
}
```

## For Mobile Developers (React Native)

### Caching Considerations

```typescript
import { Image } from 'expo-image';

// DON'T cache signed URLs
<Image
  source={{ uri: signedUrl }}
  cachePolicy="none" // Important!
/>

// OR use memory cache only (expires when app closes)
<Image
  source={{ uri: signedUrl }}
  cachePolicy="memory"
/>
```

### Refresh Strategy

```typescript
import { useQuery } from '@tanstack/react-query';

export function useFeaturedBooks() {
  return useQuery({
    queryKey: ['books', 'featured'],
    queryFn: fetchFeaturedBooks,
    staleTime: 45 * 60 * 1000, // 45 minutes
    refetchInterval: 45 * 60 * 1000, // Auto-refresh every 45 min
  });
}
```

## Testing Signed URLs

### Manual Test in Browser

1. Get a book from API:

```bash
curl http://localhost:3000/books/1
```

2. Copy the `cover_file.path` URL

3. Open in browser - should work

4. Wait 1 hour and try again - should fail with 403

### Test with Postman

1. Create request: `GET http://localhost:3000/books`
2. Send request
3. Check response - URLs should contain `?token=`
4. Copy a signed URL
5. Create new request with that URL
6. Should return the image

### Automated Test (Jest)

```typescript
import { Test } from '@nestjs/testing';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should extract path from URL', () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/books/covers/test.webp';
    const path = service.extractPathFromUrl(url);
    expect(path).toBe('covers/test.webp');
  });

  it('should generate signed URL', async () => {
    const signedUrl = await service.getSignedUrl('covers/test.webp');
    expect(signedUrl).toContain('?token=');
  });
});
```

## Common Patterns

### Pattern 1: Preload Images

```typescript
// Preload images before showing them
async function preloadBookCovers(books: Book[]) {
  const imagePromises = books.map((book) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = book.cover_file?.path || '';
    });
  });

  await Promise.allSettled(imagePromises);
}
```

### Pattern 2: Lazy Loading with Refresh

```typescript
import { useInView } from 'react-intersection-observer';

export function LazyBookCover({ book }: { book: Book }) {
  const { ref, inView } = useInView({
    triggerOnce: false, // Allow re-triggering
  });

  return (
    <div ref={ref}>
      {inView && (
        <img src={book.cover_file?.path} alt={book.title} />
      )}
    </div>
  );
}
```

### Pattern 3: Background Refresh

```typescript
// Refresh signed URLs in background without UI disruption
export function useBackgroundRefresh(bookId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(
      () => {
        // Silently refetch in background
        queryClient.invalidateQueries(['books', bookId]);
      },
      50 * 60 * 1000,
    ); // 50 minutes

    return () => clearInterval(interval);
  }, [bookId, queryClient]);
}
```

## Troubleshooting

### Issue: Image shows briefly then disappears

**Solution**: URL expired. Implement auto-refresh.

### Issue: Image never loads

**Solution**: Check network tab for 403 errors. Verify Supabase credentials.

### Issue: Different images on each refresh

**Solution**: This is normal - signed URLs change. Cache book metadata, not URLs.

### Issue: Slow image loading

**Solution**: Implement preloading or use lower quality thumbnails.

## Best Practices

1. ✅ **DO**: Refresh book data every 45-50 minutes
2. ✅ **DO**: Implement error handling for image load failures
3. ✅ **DO**: Use placeholders while images load
4. ✅ **DO**: Preload images for better UX
5. ❌ **DON'T**: Cache signed URLs in persistent storage
6. ❌ **DON'T**: Hardcode signed URLs in code
7. ❌ **DON'T**: Share signed URLs between users
8. ❌ **DON'T**: Assume URLs are permanent

## Performance Tips

1. **Use React Query** or similar for automatic caching and refresh
2. **Implement pagination** to reduce number of signed URLs generated
3. **Use thumbnails** for list views, full images for detail views
4. **Lazy load** images that are off-screen
5. **Batch requests** when possible to reduce API calls
