# Chunked Video Upload — Detail Design

## 1. Vấn đề hiện tại

| Vấn đề | Mô tả |
|--------|-------|
| Single POST request | Toàn bộ file 1 GB gửi trong 1 request → dễ timeout, bị dropped |
| Gunicorn timeout | Default worker timeout ~30s, không đủ cho file lớn |
| Không resume được | Mạng drop giữa chừng → phải upload lại từ đầu |
| Memory | Django MultiPartParser buffer toàn bộ file trước khi xử lý |
| Không có progress thực | Progress bar phía FE chỉ phản ánh phần gửi lên, không biết server đang xử lý đến đâu |

---

## 2. Giải pháp: Chunked Upload với Celery Assembly

### Ý tưởng

1. **FE chia file** thành các chunk nhỏ (10 MB/chunk)
2. **Upload từng chunk** lên server qua API riêng
3. Server **lưu chunk vào thư mục tạm** theo session
4. Khi đủ chunk, FE gọi **complete** → server dùng **Celery** ghép chunk + chạy ffmpeg + đẩy lên storage
5. FE **poll status** cho đến khi xong

### Tại sao không dùng thư viện ngoài (TUS, django-chunked-upload)?

- TUS cần client lib riêng, thêm dependency FE
- `django-chunked-upload` có nhiều feature thừa, thêm migration phức tạp
- Hệ thống đã có **Redis + Celery** sẵn → custom solution đơn giản hơn, kiểm soát tốt hơn

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vue)                                              │
│                                                              │
│  useChunkedUpload composable                                 │
│  ├─ Chia file thành chunks (10 MB)                          │
│  ├─ POST /upload/init/     → session_id                     │
│  ├─ PUT  /upload/{id}/chunk/{n}/ (tuần tự)                  │
│  ├─ POST /upload/{id}/complete/                              │
│  └─ GET  /upload/{id}/status/ (poll mỗi 2s)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP
┌─────────────────▼───────────────────────────────────────────┐
│  Django REST API                                             │
│                                                              │
│  ChunkUploadInitView     → tạo session, trả chunk_size      │
│  ChunkUploadView         → nhận chunk, lưu /tmp             │
│  ChunkUploadCompleteView → validate, enqueue Celery task    │
│  ChunkUploadStatusView   → trả status từ Redis              │
└─────────────────┬───────────────────────────────────────────┘
                  │
      ┌───────────┴──────────────┐
      │                          │
┌─────▼──────┐          ┌────────▼──────────────────────────┐
│  Redis     │          │  Celery Worker                     │
│            │          │                                    │
│  Session:  │          │  assemble_and_process_video task   │
│  - status  │          │  ├─ Ghép chunks → file tạm         │
│  - chunks  │◄─────────│  ├─ ffmpeg faststart optimize      │
│  - task_id │          │  ├─ get_video_storage().upload()   │
│  - video_id│          │  ├─ Update Redis status            │
└────────────┘          │  └─ Cleanup /tmp chunks            │
                        └────────────────────────────────────┘
```

---

## 4. Data Model

### Upload Session (lưu trong Redis, TTL 24h)

```python
# Key: upload_session:{session_id}
{
    "session_id": "uuid4-string",
    "lesson_public_id": "uuid4-string",
    "filename": "video.mp4",
    "content_type": "video/mp4",
    "file_size": 1073741824,       # bytes
    "chunk_size": 10485760,        # 10 MB
    "total_chunks": 103,
    "received_chunks": [0, 1, 2],  # list chunk index đã nhận
    "status": "uploading",         # uploading | processing | done | failed
    "celery_task_id": null,
    "video_id": null,
    "video_url": null,
    "error": null,
    "created_at": "2026-02-27T10:00:00Z",
    "expires_at": "2026-02-28T10:00:00Z"
}
```

### Chunk files trên disk

```
/tmp/chunked_uploads/
  {session_id}/
    chunk_0000
    chunk_0001
    chunk_0002
    ...
    chunk_0102
```

---

## 5. API Endpoints

### 5.1 Init Upload

```
POST /api/videos/lessons/{lesson_public_id}/upload/init/
Authorization: Admin only

Request:
{
    "filename": "my-video.mp4",
    "file_size": 1073741824,
    "content_type": "video/mp4"
}

Response 201:
{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "chunk_size": 10485760,
    "total_chunks": 103,
    "expires_at": "2026-02-28T10:00:00Z"
}

Errors:
- 400: content_type không hợp lệ
- 400: file_size > 5 GB
- 404: lesson không tồn tại
```

**Logic:**
1. Validate `content_type` và `file_size`
2. Tạo UUID làm `session_id`
3. Tính `total_chunks = ceil(file_size / CHUNK_SIZE)`
4. Lưu session vào Redis với TTL 24h
5. Tạo thư mục `/tmp/chunked_uploads/{session_id}/`
6. Trả về thông tin session

---

### 5.2 Upload Chunk

```
PUT /api/videos/upload/{session_id}/chunk/{chunk_index}/
Authorization: Admin only
Content-Type: application/octet-stream
Content-Range: bytes 0-10485759/1073741824

Body: raw binary chunk data

Response 200:
{
    "chunk_index": 0,
    "received": 1,
    "total": 103,
    "progress_percent": 1
}

Errors:
- 404: session không tồn tại hoặc expired
- 400: chunk_index out of range
- 400: chunk size không khớp (trừ chunk cuối)
- 409: chunk đã được upload (idempotent: trả 200 luôn)
- 410: session đã complete/failed
```

**Logic:**
1. Load session từ Redis
2. Validate `chunk_index` trong range `[0, total_chunks-1]`
3. Nếu chunk đã tồn tại → trả 200 (idempotent, hỗ trợ retry)
4. Validate chunk size (mọi chunk phải đúng `CHUNK_SIZE`, trừ chunk cuối)
5. Ghi bytes vào `/tmp/chunked_uploads/{session_id}/chunk_{chunk_index:04d}`
6. Update `received_chunks` trong Redis
7. Trả progress

---

### 5.3 Complete Upload

```
POST /api/videos/upload/{session_id}/complete/
Authorization: Admin only

Response 202:
{
    "task_id": "celery-task-uuid",
    "message": "Processing started"
}

Errors:
- 404: session không tồn tại
- 400: chưa nhận đủ tất cả chunks
- 409: đã complete rồi
```

**Logic:**
1. Kiểm tra `len(received_chunks) == total_chunks`
2. Update session status → `processing`
3. Enqueue Celery task `assemble_and_process_video.delay(session_id)`
4. Lưu `celery_task_id` vào Redis
5. Trả 202 Accepted

---

### 5.4 Check Status

```
GET /api/videos/upload/{session_id}/status/
Authorization: Admin only

Response 200:
{
    "status": "processing",     # uploading | processing | done | failed
    "progress_percent": 65,     # chỉ có nghĩa khi status = processing
    "video_id": null,
    "video_url": null,
    "error": null
}

Khi done:
{
    "status": "done",
    "progress_percent": 100,
    "video_id": "abc123",
    "video_url": "https://..."
}
```

---

## 6. Celery Task

### `assemble_and_process_video`

```python
# videos/tasks.py

@shared_task(bind=True, max_retries=0)
def assemble_and_process_video(self, session_id: str):
    """
    1. Ghép tất cả chunks thành file tạm
    2. Chạy ffmpeg faststart
    3. Upload qua storage backend
    4. Update lesson, cleanup
    """
    pass
```

**Chi tiết các bước:**

```
Step 1 — Assemble (10%)
  Mở output file, đọc từng chunk_0000..chunk_N theo thứ tự
  Ghi vào /tmp/chunked_uploads/{session_id}/assembled.mp4
  Update Redis: progress = 10

Step 2 — Validate (15%)
  Kiểm tra file size sau ghép == file_size trong session
  Kiểm tra video có thể đọc được bằng ffprobe
  Update Redis: progress = 15

Step 3 — Upload to Storage (15% → 90%)
  Gọi get_video_storage().upload(assembled_file, filename)
  LocalStorage: ffmpeg optimize + copy → progress tăng dần
  BunnyStorage: stream lên CDN → progress tăng dần
  Update Redis: progress theo từng bước

Step 4 — Update Lesson (95%)
  lesson.video_id = result.video_id
  lesson.video_url = result.video_url
  lesson.save()
  Update Redis: progress = 95

Step 5 — Cleanup (100%)
  Xóa /tmp/chunked_uploads/{session_id}/
  Update Redis: status = done, progress = 100, video_id, video_url
```

**Error handling:**

```python
try:
    # ... các bước trên
except Exception as e:
    redis.hset(f"upload_session:{session_id}", mapping={
        "status": "failed",
        "error": str(e)
    })
    # Cleanup tmp files
    shutil.rmtree(session_tmp_dir, ignore_errors=True)
    raise
```

---

## 7. Frontend — `useChunkedUpload` Composable

```javascript
// src/composables/useChunkedUpload.js

export function useChunkedUpload() {
  const CHUNK_SIZE = 10 * 1024 * 1024  // 10 MB

  const state = reactive({
    status: 'idle',           // idle | uploading | processing | done | failed
    uploadProgress: 0,        // % chunks đã gửi (0-100)
    processProgress: 0,       // % server đang xử lý (0-100)
    overallProgress: 0,       // tổng hợp (upload 60% + process 40%)
    sessionId: null,
    videoId: null,
    videoUrl: null,
    error: null,
    canPause: true,
  })

  let isPaused = false
  let abortController = null

  async function upload(lessonPublicId, file) { ... }
  async function uploadChunks(sessionId, file, totalChunks) { ... }
  async function pollStatus(sessionId) { ... }
  function pause() { isPaused = true }
  function resume() { ... }
  function cancel() { ... }

  return { state, upload, pause, resume, cancel }
}
```

### Upload Flow chi tiết

```javascript
async function upload(lessonPublicId, file) {
  state.status = 'uploading'
  state.error = null

  // 1. Init session
  const { session_id, chunk_size, total_chunks } = await videosService.initChunkUpload(
    lessonPublicId,
    { filename: file.name, file_size: file.size, content_type: file.type }
  )
  state.sessionId = session_id

  // 2. Upload từng chunk
  await uploadChunks(session_id, file, total_chunks, chunk_size)

  // 3. Complete
  await videosService.completeChunkUpload(session_id)
  state.status = 'processing'

  // 4. Poll status
  await pollStatus(session_id)
}

async function uploadChunks(sessionId, file, totalChunks, chunkSize) {
  for (let i = 0; i < totalChunks; i++) {
    if (isPaused) {
      await waitForResume()
    }

    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)

    const contentRange = `bytes ${start}-${end - 1}/${file.size}`

    await videosService.uploadChunk(sessionId, i, chunk, contentRange)

    state.uploadProgress = Math.round(((i + 1) / totalChunks) * 100)
    state.overallProgress = Math.round(state.uploadProgress * 0.6)
  }
}

async function pollStatus(sessionId) {
  while (true) {
    const data = await videosService.getUploadStatus(sessionId)

    if (data.status === 'done') {
      state.status = 'done'
      state.processProgress = 100
      state.overallProgress = 100
      state.videoId = data.video_id
      state.videoUrl = data.video_url
      return
    }

    if (data.status === 'failed') {
      state.status = 'failed'
      state.error = data.error
      return
    }

    state.processProgress = data.progress_percent ?? 0
    state.overallProgress = 60 + Math.round(state.processProgress * 0.4)

    await sleep(2000)  // poll mỗi 2 giây
  }
}
```

### `VideoUploadProgress` Component

```vue
<!-- Hiển thị progress bar 2 giai đoạn -->
<template>
  <div class="upload-progress">
    <!-- Phase indicator -->
    <div class="phase">
      <span v-if="state.status === 'uploading'">
        Đang tải lên... ({{ state.uploadProgress }}%)
      </span>
      <span v-else-if="state.status === 'processing'">
        Đang xử lý video... ({{ state.processProgress }}%)
      </span>
      <span v-else-if="state.status === 'done'">
        Hoàn thành!
      </span>
    </div>

    <!-- Overall progress bar -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: state.overallProgress + '%' }" />
    </div>

    <!-- Controls -->
    <div class="controls" v-if="state.status === 'uploading'">
      <button @click="pause" v-if="!isPaused">Tạm dừng</button>
      <button @click="resume" v-else>Tiếp tục</button>
      <button @click="cancel">Hủy</button>
    </div>

    <p class="chunk-info">
      Chunk {{ currentChunk }}/{{ totalChunks }} · {{ formatBytes(uploadedBytes) }}/{{ formatBytes(totalBytes) }}
    </p>
  </div>
</template>
```

---

## 8. Backend File Structure

```
src/backend/
├── videos/
│   ├── views.py                    # Thêm 4 view mới
│   ├── urls.py                     # Thêm 4 URL patterns
│   ├── tasks.py                    # Celery task (file mới)
│   ├── chunk_upload_service.py     # Logic session/Redis (file mới)
│   └── ...
└── config/
    └── settings.py                 # Thêm CHUNK_SIZE, TMP_UPLOAD_DIR
```

### Settings mới

```python
# config/settings.py

CHUNK_SIZE = 10 * 1024 * 1024           # 10 MB
CHUNK_UPLOAD_TMP_DIR = '/tmp/chunked_uploads'
CHUNK_UPLOAD_SESSION_TTL = 86400        # 24 giờ (seconds)
CHUNK_UPLOAD_MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # 5 GB
```

### URL patterns mới

```python
# videos/urls.py

urlpatterns = [
    # Upload hiện tại (giữ lại cho backward compat)
    path('lessons/<uuid:public_id>/upload/', views.VideoLessonUploadView.as_view()),

    # Chunked upload mới
    path('lessons/<uuid:public_id>/upload/init/', views.ChunkUploadInitView.as_view()),
    path('upload/<str:session_id>/chunk/<int:chunk_index>/', views.ChunkUploadView.as_view()),
    path('upload/<str:session_id>/complete/', views.ChunkUploadCompleteView.as_view()),
    path('upload/<str:session_id>/status/', views.ChunkUploadStatusView.as_view()),
]
```

---

## 9. Infrastructure Changes

### Gunicorn — tăng timeout

```yaml
# docker/docker-compose.yml

web:
  command: gunicorn config.wsgi:application
    --bind 0.0.0.0:8000
    --workers 2
    --timeout 120        # tăng từ 30s lên 120s (chỉ cho chunk nhỏ)
    --reload
```

> Vì mỗi request chỉ là 1 chunk 10 MB, timeout 120s là quá đủ.
> Không cần tăng lên hàng giờ như upload nguyên file.

### Nginx (nếu thêm sau)

```nginx
client_max_body_size 15m;    # hơi lớn hơn chunk_size 10M
proxy_read_timeout 120s;
```

### Docker — mount tmp dir

```yaml
volumes:
  - chunked_uploads:/tmp/chunked_uploads   # persistent across restarts

volumes:
  chunked_uploads:
```

> **Quan trọng:** Mount volume để tránh mất chunks khi container restart.

---

## 10. Retry & Resume Strategy

### Frontend retry logic

```javascript
async function uploadChunkWithRetry(sessionId, index, chunk, contentRange, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await videosService.uploadChunk(sessionId, index, chunk, contentRange)
    } catch (err) {
      if (attempt === maxRetries - 1) throw err
      await sleep(1000 * (attempt + 1))  // exponential backoff: 1s, 2s, 3s
    }
  }
}
```

### Resume sau khi F5 / mất mạng

```javascript
// Lưu session_id vào localStorage
localStorage.setItem(`upload_session_${lessonId}`, session_id)

// Khi mở lại, kiểm tra session còn sống không
const savedSessionId = localStorage.getItem(`upload_session_${lessonId}`)
if (savedSessionId) {
  const status = await videosService.getUploadStatus(savedSessionId)
  if (status.status === 'uploading') {
    // Hỏi user có muốn tiếp tục không
    // Biết chunk nào đã upload qua received_chunks trong response
  }
}
```

> Backend API `GET /status/` nên trả thêm `received_chunks: [0,1,2,...]`
> để FE biết bắt đầu upload từ chunk nào.

---

## 11. Cleanup

### Celery beat task — dọn sessions hết hạn

```python
@shared_task
def cleanup_expired_upload_sessions():
    """Chạy mỗi 1 giờ, xóa các tmp dir của session đã expired"""
    tmp_dir = settings.CHUNK_UPLOAD_TMP_DIR
    for session_dir in Path(tmp_dir).iterdir():
        session_id = session_dir.name
        key = f"upload_session:{session_id}"
        if not redis_client.exists(key):
            # Session đã expired trong Redis → xóa tmp files
            shutil.rmtree(session_dir, ignore_errors=True)
```

```python
# config/celery.py — thêm schedule
CELERY_BEAT_SCHEDULE = {
    'cleanup-upload-sessions': {
        'task': 'videos.tasks.cleanup_expired_upload_sessions',
        'schedule': crontab(minute=0),  # mỗi giờ
    }
}
```

---

## 12. Implementation Order

| Bước | Việc làm | File |
|------|----------|------|
| 1 | Thêm settings `CHUNK_SIZE`, `CHUNK_UPLOAD_TMP_DIR` | `config/settings.py` |
| 2 | Tạo `chunk_upload_service.py` — Redis session CRUD | `videos/chunk_upload_service.py` |
| 3 | Implement 4 Django views | `videos/views.py` |
| 4 | Thêm URL patterns | `videos/urls.py` |
| 5 | Tạo `tasks.py` — Celery assembly task | `videos/tasks.py` |
| 6 | Tăng gunicorn timeout | `docker/docker-compose.yml` |
| 7 | FE: thêm 4 API methods vào `videos.service.js` | `src/frontend/src/services/videos.service.js` |
| 8 | FE: tạo `useChunkedUpload` composable | `src/frontend/src/composables/useChunkedUpload.js` |
| 9 | FE: cập nhật VideoAdmin upload UI | Component liên quan |
| 10 | Celery beat cleanup task | `videos/tasks.py`, `config/celery.py` |

---

## 13. Trade-offs

| Quyết định | Lý do |
|-----------|-------|
| Chunk size 10 MB | Đủ nhỏ để retry nhanh, đủ lớn để giảm số request (100 request cho 1 GB) |
| Lưu session Redis (không DB) | Không cần migration, TTL tự động, cực nhanh |
| Upload tuần tự (không parallel) | Đơn giản hơn, tránh race condition, network đã là bottleneck |
| Celery assemble async | Không block request, user nhận phản hồi ngay |
| Poll mỗi 2s (không WebSocket) | Đơn giản, không cần infra thêm, 2s delay chấp nhận được |
| Giữ API cũ | Backward compat với Django Admin upload |
