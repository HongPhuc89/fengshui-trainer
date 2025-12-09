# Migration Guide: Updating Frontend for Signed URLs

## Overview

The backend now returns signed URLs with 1-hour expiration for all book covers and files. This guide helps you update your frontend code to handle these temporary URLs properly.

## What Changed?

### Before (Static URLs)

```json
{
  "id": 1,
  "title": "Example Book",
  "cover_file": {
    "path": "https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/public/books/covers/uuid.webp"
  }
}
```

### After (Signed URLs)

```json
{
  "id": 1,
  "title": "Example Book",
  "cover_file": {
    "path": "https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/sign/books/covers/uuid.webp?token=eyJhbGc..."
  }
}
```

**Key Difference**: URLs now contain `?token=` and expire after 1 hour.

## Required Changes

### 1. Remove URL Caching (Critical!)

#### ❌ Before (DON'T DO THIS)

```typescript
// DON'T cache signed URLs in localStorage
localStorage.setItem('bookCover', book.cover_file.path);

// DON'T cache in AsyncStorage (React Native)
await AsyncStorage.setItem('bookCover', book.cover_file.path);
```

#### ✅ After (DO THIS)

```typescript
// Cache book metadata, but fetch fresh URLs from API
const cachedBook = {
  id: book.id,
  title: book.title,
  // Don't include cover_file.path in cache
};
localStorage.setItem('book', JSON.stringify(cachedBook));

// Always fetch fresh book data for URLs
const freshBook = await fetchBook(book.id);
```

### 2. Implement Auto-Refresh

#### For React Web App

```typescript
// apps/admin/src/hooks/useAutoRefreshBook.ts
import { useEffect } from 'react';
import { useRefresh } from 'react-admin';

export function useAutoRefreshBook() {
  const refresh = useRefresh();

  useEffect(() => {
    // Refresh every 50 minutes (before 1-hour expiration)
    const interval = setInterval(
      () => {
        refresh();
      },
      50 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [refresh]);
}
```

#### For React Native (Expo)

```typescript
// apps/mobile/hooks/useAutoRefreshBooks.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useAutoRefreshBooks() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Refresh every 50 minutes
    const interval = setInterval(
      () => {
        queryClient.invalidateQueries({ queryKey: ['books'] });
      },
      50 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [queryClient]);
}
```

### 3. Update Image Components

#### React Admin (BookShow.tsx)

**Location**: `apps/admin/src/resources/books/BookShow.tsx`

```typescript
import { useAutoRefreshBook } from '../../hooks/useAutoRefreshBook';

export const BookShow = () => {
  // Add auto-refresh hook
  useAutoRefreshBook();

  return (
    <Show>
      <SimpleShowLayout>
        {/* Your existing fields */}
        <ImageField source="cover_file.path" label="Cover" />
      </SimpleShowLayout>
    </Show>
  );
};
```

#### React Native (Mobile App)

**Location**: `apps/mobile/screens/BookDetailScreen.tsx` (or similar)

```typescript
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';

export function BookDetailScreen({ route }) {
  const { bookId } = route.params;

  const { data: book, refetch } = useQuery({
    queryKey: ['books', bookId],
    queryFn: () => fetchBook(bookId),
    staleTime: 45 * 60 * 1000, // 45 minutes
    refetchInterval: 45 * 60 * 1000, // Auto-refresh
  });

  return (
    <Image
      source={{ uri: book?.cover_file?.path }}
      style={{ width: 200, height: 300 }}
      cachePolicy="memory" // Only cache in memory, not disk
      onError={() => {
        console.log('Image failed, refreshing...');
        refetch(); // Get fresh signed URL
      }}
    />
  );
}
```

### 4. Update API Service Layer

#### Mobile API Service

**Location**: `apps/mobile/modules/shared/services/api.ts`

```typescript
// Add refresh interval to React Query config
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45 * 60 * 1000, // 45 minutes
      refetchInterval: 45 * 60 * 1000, // Auto-refresh every 45 min
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

### 5. Handle Image Load Errors

#### React Component

```typescript
import { useState } from 'react';

export function BookCover({ book, onRefresh }) {
  const [retryCount, setRetryCount] = useState(0);

  const handleImageError = async () => {
    if (retryCount < 3) {
      console.log('Image load failed, retrying...');
      setRetryCount(prev => prev + 1);
      await onRefresh(); // Fetch fresh signed URL
    }
  };

  return (
    <img
      src={book.cover_file?.path}
      alt={book.title}
      onError={handleImageError}
    />
  );
}
```

#### React Native Component

```typescript
import { Image } from 'expo-image';
import { useState } from 'react';

export function BookCover({ book, onRefresh }) {
  const [key, setKey] = useState(0);

  const handleError = () => {
    console.log('Image failed to load');
    onRefresh().then(() => {
      setKey(prev => prev + 1); // Force re-render with new URL
    });
  };

  return (
    <Image
      key={key}
      source={{ uri: book.cover_file?.path }}
      style={{ width: 200, height: 300 }}
      onError={handleError}
      placeholder={require('./placeholder.png')}
    />
  );
}
```

## Step-by-Step Migration

### Step 1: Update Admin Dashboard

1. Create auto-refresh hook:

```bash
# Create new file
touch apps/admin/src/hooks/useAutoRefreshBook.ts
```

2. Add the hook code (see example above)

3. Update `BookShow.tsx`:

```typescript
import { useAutoRefreshBook } from '../../hooks/useAutoRefreshBook';

export const BookShow = () => {
  useAutoRefreshBook(); // Add this line
  // ... rest of component
};
```

4. Update `BookList.tsx` similarly

### Step 2: Update Mobile App

1. Update React Query config in `apps/mobile/App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45 * 60 * 1000,
      refetchInterval: 45 * 60 * 1000,
    },
  },
});
```

2. Update image cache policy in all Image components:

```typescript
<Image
  source={{ uri: book.cover_file?.path }}
  cachePolicy="memory" // Change from "disk" to "memory"
/>
```

3. Add error handling to image components

### Step 3: Test

1. **Test URL expiration**:
   - Load a book
   - Wait 1 hour
   - Verify image still loads (should auto-refresh)

2. **Test error handling**:
   - Disconnect network
   - Verify placeholder shows
   - Reconnect
   - Verify image loads

3. **Test performance**:
   - Monitor network requests
   - Verify not too many refresh requests
   - Check image loading speed

## Common Issues & Solutions

### Issue 1: Images Disappear After 1 Hour

**Symptom**: Images load initially but disappear after 1 hour

**Solution**: Add auto-refresh hook

```typescript
useAutoRefreshBook(); // In React Admin
useAutoRefreshBooks(); // In React Native
```

### Issue 2: Too Many API Requests

**Symptom**: Network tab shows constant API requests

**Solution**: Increase staleTime and refetchInterval

```typescript
staleTime: 45 * 60 * 1000, // Don't refetch for 45 minutes
refetchInterval: 45 * 60 * 1000, // Only auto-refresh every 45 min
```

### Issue 3: Images Don't Load on Mobile

**Symptom**: Images work on web but not mobile

**Solution**: Change cache policy

```typescript
<Image
  source={{ uri: signedUrl }}
  cachePolicy="memory" // Not "disk"
/>
```

### Issue 4: Stale Images After Update

**Symptom**: Old images show even after updating book

**Solution**: Invalidate query cache

```typescript
queryClient.invalidateQueries({ queryKey: ['books', bookId] });
```

## Testing Checklist

- [ ] Images load on initial page load
- [ ] Images still load after 1 hour (auto-refresh works)
- [ ] Error handling works (network disconnect)
- [ ] Performance is acceptable (not too many requests)
- [ ] Mobile app works (both iOS and Android)
- [ ] Admin dashboard works
- [ ] Image updates reflect immediately
- [ ] No console errors related to images

## Rollback Plan

If you need to rollback:

1. **Backend**: Revert to previous commit

```bash
git revert HEAD
```

2. **Supabase**: Make bucket public
   - Go to Supabase Dashboard
   - Storage → books bucket
   - Enable "Public bucket"

3. **Frontend**: Remove auto-refresh code
   - Remove `useAutoRefreshBook` hook
   - Remove `refetchInterval` from React Query config
   - Change image cache policy back to "disk"

## Performance Considerations

### Network Usage

- Signed URLs are generated on-demand (no extra storage)
- Each API request generates new signed URLs
- Consider pagination to reduce number of URLs

### Caching Strategy

- **Memory cache**: OK (expires when app closes)
- **Disk cache**: NOT OK (URLs expire in 1 hour)
- **CDN cache**: NOT OK (URLs change on each request)

### Optimization Tips

1. Use pagination for book lists
2. Implement lazy loading for images
3. Use thumbnails for list views
4. Preload images for better UX
5. Batch API requests when possible

## Next Steps

After migration:

1. **Monitor**: Watch for errors in production
2. **Optimize**: Adjust refresh intervals based on usage
3. **Document**: Update team documentation
4. **Train**: Educate team on new behavior
5. **Iterate**: Gather feedback and improve

## Support

If you encounter issues:

1. Check documentation: `knowledge/structure/active-contexts/08-signed-urls.md`
2. Review quick reference: `knowledge/structure/active-contexts/09-signed-urls-quick-reference.md`
3. Check Supabase logs for storage errors
4. Verify environment variables are set correctly

## Additional Resources

- [Supabase Signed URLs Documentation](https://supabase.com/docs/guides/storage/signed-urls)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
