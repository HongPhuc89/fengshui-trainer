# Signed URLs Implementation for Private Content

## Overview

Implemented signed URLs with 1-hour expiration for secure, temporary access to private files stored in Supabase Storage. This ensures that book covers and files remain private while still being accessible to authorized users.

## Implementation Details

### 1. Upload Service Enhancements

**File**: `apps/backend/src/modules/upload/upload.service.ts`

Added two new methods:

#### `getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string>`

- Generates a temporary signed URL for a file in Supabase Storage
- Default expiration: 3600 seconds (1 hour)
- Returns a signed URL that grants temporary access to private files
- Throws error if Supabase is not configured or URL generation fails

#### `extractPathFromUrl(fullUrl: string): string`

- Extracts the storage path from a full Supabase URL
- Example:
  - Input: `https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/public/books/covers/uuid.webp`
  - Output: `covers/uuid.webp`
- Used to convert stored URLs back to paths for signed URL generation

### 2. Books Service Updates

**File**: `apps/backend/src/modules/books/books.service.ts`

#### New Dependencies

- Injected `UploadService` into `BooksService` constructor

#### New Private Method: `attachSignedUrls(book: Book): Promise<Book>`

- Automatically generates signed URLs for:
  - `book.cover_file.path` (if exists)
  - `book.file.path` (if exists)
- Replaces static storage URLs with temporary signed URLs
- Gracefully handles errors (keeps original URL if signing fails)
- Called automatically before returning book data

#### Updated Methods

All book retrieval methods now automatically attach signed URLs:

- `findAll()` - User-facing list of published books
- `findOne(id)` - User-facing single book detail
- `findAllAdmin()` - Admin list of all books
- `findOneAdmin(id)` - Admin single book detail

### 3. Module Configuration

**File**: `apps/backend/src/modules/books/books.module.ts`

- Already imports `UploadModule` which exports `UploadService`
- No changes needed

**File**: `apps/backend/src/modules/upload/upload.module.ts`

- Already exports `UploadService`
- No changes needed

## How It Works

### Flow Diagram

```
1. Client requests book data
   ↓
2. BooksService retrieves book from database
   ↓
3. attachSignedUrls() is called
   ↓
4. For each file (cover_file, file):
   a. Extract storage path from stored URL
   b. Generate signed URL via Supabase
   c. Replace original URL with signed URL
   ↓
5. Return book with signed URLs to client
   ↓
6. Client can access files for 1 hour
```

### Example Response

**Before** (static URL - won't work if bucket is private):

```json
{
  "id": 1,
  "title": "Example Book",
  "cover_file": {
    "path": "https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/public/books/covers/uuid.webp"
  }
}
```

**After** (signed URL - works for 1 hour):

```json
{
  "id": 1,
  "title": "Example Book",
  "cover_file": {
    "path": "https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/sign/books/covers/uuid.webp?token=eyJhbGc..."
  }
}
```

## Security Benefits

1. **Private Content**: Files remain private in Supabase Storage
2. **Time-Limited Access**: URLs expire after 1 hour
3. **No Public Exposure**: Files are not publicly accessible
4. **Controlled Access**: Only authenticated API requests can generate signed URLs
5. **Automatic Refresh**: New signed URLs are generated on each API request

## Configuration Requirements

### Supabase Storage Setup

1. Keep bucket **private** (do NOT enable "Public bucket")
2. No additional policies needed - signed URLs bypass RLS
3. Ensure `SUPABASE_URL` and `SUPABASE_KEY` are configured in `.env`

### Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_BUCKET=books
```

## API Endpoints Affected

All book-related endpoints now return signed URLs:

### Public Endpoints

- `GET /books` - List all published books
- `GET /books/:id` - Get single published book

### Admin Endpoints

- `GET /admin/books` - List all books (any status)
- `GET /admin/books/:id` - Get single book (any status)

## Frontend Considerations

### URL Expiration

- Signed URLs expire after 1 hour
- Frontend should refresh book data periodically for long sessions
- Consider implementing URL refresh logic if users keep pages open > 1 hour

### Caching Strategy

- **Don't cache signed URLs** in localStorage/sessionStorage
- Cache book metadata, but always fetch fresh URLs from API
- Consider implementing a refresh mechanism:
  ```typescript
  // Example: Refresh book data every 50 minutes
  setInterval(
    () => {
      refreshBookData();
    },
    50 * 60 * 1000,
  );
  ```

### Error Handling

- If image fails to load, it might be expired
- Implement retry logic to fetch fresh signed URL
- Show placeholder image while refreshing

## Testing

### Manual Testing

1. Start the backend server
2. Call `GET /books` or `GET /books/:id`
3. Verify response contains signed URLs (look for `?token=` in URLs)
4. Copy signed URL and test in browser - should work
5. Wait 1 hour and test again - should fail (403 Forbidden)

### Automated Testing

Consider adding tests for:

- Signed URL generation
- URL expiration handling
- Fallback to original URL on error
- Path extraction from various URL formats

## Future Enhancements

### Potential Improvements

1. **Configurable Expiration**: Allow different expiration times per file type
2. **URL Caching**: Cache signed URLs server-side with TTL
3. **Batch Generation**: Generate signed URLs in batch for better performance
4. **Client-Side Refresh**: Provide endpoint to refresh expired URLs
5. **Analytics**: Track signed URL usage and expiration patterns

### Example: Configurable Expiration

```typescript
// Different expiration times for different file types
const expirationTimes = {
  cover: 3600, // 1 hour for covers
  book: 7200, // 2 hours for book files
  preview: 1800, // 30 minutes for previews
};
```

## Troubleshooting

### Common Issues

#### Issue: "Invalid Supabase storage URL format"

- **Cause**: Stored URL doesn't match expected format
- **Solution**: Check URL format in database, ensure it follows Supabase pattern

#### Issue: "Failed to generate signed URL"

- **Cause**: Supabase credentials invalid or file doesn't exist
- **Solution**: Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`

#### Issue: Images not loading in frontend

- **Cause**: Signed URL might be expired or CORS issue
- **Solution**:
  - Check if URL has `?token=` parameter
  - Verify Supabase CORS settings
  - Try refreshing book data

#### Issue: URLs work in browser but not in app

- **Cause**: CORS or authentication headers
- **Solution**: Ensure frontend sends proper headers with requests

## Related Files

- `apps/backend/src/modules/upload/upload.service.ts` - Signed URL generation
- `apps/backend/src/modules/books/books.service.ts` - Automatic URL attachment
- `apps/backend/src/modules/books/books.controller.ts` - API endpoints
- `apps/backend/src/modules/upload/entities/uploaded-file.entity.ts` - File entity

## References

- [Supabase Storage Signed URLs](https://supabase.com/docs/guides/storage/signed-urls)
- [Supabase Storage Security](https://supabase.com/docs/guides/storage/security/access-control)
