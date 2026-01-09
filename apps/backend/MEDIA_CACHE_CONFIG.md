# Media Cache Configuration

## Environment Variables

Add these to your `.env` file:

```env
# Media Cache Settings
MEDIA_CACHE_ENABLED=true
MEDIA_CACHE_DIR=./storage/media-cache
MEDIA_CACHE_MAX_SIZE_GB=10
```

## Configuration Details

- **MEDIA_CACHE_ENABLED**: Enable/disable file caching (default: `true`)
- **MEDIA_CACHE_DIR**: Directory for cached files (default: `./storage/media-cache`)
- **MEDIA_CACHE_MAX_SIZE_GB**: Maximum cache size in GB (default: `10`)

## Storage Directory

The cache directory `storage/media-cache/` will be created automatically on first use.

**Structure:**

```
storage/media-cache/
├── abc123hash.pdf
├── def456hash.jpg
└── .cache-metadata.json
```

## Usage

### API Endpoint

```
GET /api/media/:id
Authorization: Bearer <jwt_token>
```

### Example

```bash
curl -H "Authorization: Bearer <token>" \
  https://book-api.hongphuc.top/api/media/10 \
  --output file.pdf
```

### Response Headers

```
Content-Type: application/pdf
Content-Disposition: inline; filename="chapter.pdf"
Content-Length: 1048576
Cache-Control: public, max-age=31536000, immutable
```

## Cache Management

- **LRU Eviction**: Oldest accessed files removed when cache is full
- **Metadata Tracking**: `.cache-metadata.json` tracks all cached files
- **Auto-cleanup**: Runs before caching new files if needed

## Monitoring

Check cache status:

```bash
cat storage/media-cache/.cache-metadata.json
```

Clear cache manually:

```bash
rm -rf storage/media-cache/*
```
