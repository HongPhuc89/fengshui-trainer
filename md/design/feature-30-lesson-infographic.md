# Technical Solution: Feature 30 — Lesson Infographic / Summary Attachments

## Document Information
- **Feature**: Lesson Infographic & Summary Video Attachments
- **Version**: 1.6
- **Created**: 2026-04-13
- **Updated**: 2026-04-13 (v1.6 — filename prefix: {lesson_pk}_{lesson_public_id}_{hex4}.pdf for dashboard ordering)
- **Status**: Draft — Awaiting PO Approval

---

## Tóm tắt

Mỗi `VideoLesson` có thể đính kèm tối đa một **infographic (lược đồ)** dưới dạng:
1. **PDF file** — upload lên **Bunny Storage**, filename ngẫu nhiên (UUID) để hạn chế crawler. Phục vụ qua **signed CDN URL** có TTL 5 phút, sau khi Django kiểm tra quyền truy cập.
2. **Video tóm tắt URL** — link Bunny Stream hoặc bất kỳ URL embed nào.

Hai trường này độc lập và đều optional. Admin quản lý qua Django Admin (VideoLesson change form). Frontend hiển thị dưới dạng tab mới "Lược đồ" trong `VideoPlayerView.vue` (tab chỉ xuất hiện khi bài học có ít nhất 1 infographic).

---

## Phân tích

- **Yêu cầu:** Mỗi bài học video (VideoLesson) có thể gắn infographic ở dạng PDF hoặc video tóm tắt. Không bắt buộc. Admin upload/nhập URL trực tiếp. Học viên xem trong player.
- **Ràng buộc:** Truy cập infographic phải cùng điều kiện với truy cập bài học (có mua khoá học hoặc bài học free). Không thêm model mới — mở rộng thẳng vào `VideoLesson`. Endpoint dùng `public_id` (UUID) theo **Dual ID Strategy**. PDF lưu trên Bunny Storage (không phải VPS local) với filename ngẫu nhiên để hạn chế crawler.
- **Các tầng liên quan:** DB ✅ / Backend Django ✅ / Frontend Vue.js ✅

---

## Đề xuất giải pháp

### Database (PostgreSQL)

Thêm **2 trường mới** vào bảng `videos_videolesson`:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `infographic_pdf_key` | `CharField(max_length=255, blank=True)` | Bunny Storage key của file PDF (ví dụ: `infographics/a3f8c2d1....pdf`). Rỗng nếu chưa upload. |
| `infographic_video_url` | `CharField(max_length=500, blank=True)` | URL video tóm tắt (Bunny embed, YouTube, hoặc bất kỳ iframe URL). |

> **Filename strategy:** `infographics/{lesson_pk}_{lesson_public_id}_{hex4}.pdf`
> - `{lesson_pk}` — integer PK, giúp files **sắp xếp theo thứ tự** trên Bunny dashboard
> - `{lesson_public_id}` — UUID, dễ identify lesson khi nhìn dashboard
> - `_{hex4}` — 4-char hex suffix (65k possibilities), biết 2 phần trên vẫn không đoán được full path; token auth là lớp bảo vệ chính
> - `short_random` sinh **một lần duy nhất** khi tạo, lưu vào `infographic_pdf_key`. Re-upload dùng **cùng key** → Bunny PUT tự overwrite, không cần delete.
>
> Ví dụ: `infographics/42_a3f8c2d1-4b5e-6f7a-8c9d-0e1f2a3b4c5d_f3a1.pdf`

**Migration:** 1 migration đơn giản, không ảnh hưởng row hiện tại (blank=True).

```python
# videos/migrations/xxxx_add_lesson_infographic_fields.py
operations = [
    migrations.AddField(
        model_name='videolesson',
        name='infographic_pdf_key',
        field=models.CharField(max_length=255, blank=True, default='',
                               verbose_name='Lược đồ PDF (Bunny key)'),
        preserve_default=False,
    ),
    migrations.AddField(
        model_name='videolesson',
        name='infographic_video_url',
        field=models.CharField(max_length=500, blank=True,
                               verbose_name='Video tóm tắt URL'),
    ),
]
```

**Không cần index** — trường chỉ đọc theo lesson, không dùng để filter.

---

### Backend (Django)

#### 1. Model — `videos/models.py`

Dùng `CharField` thay `FileField` — Bunny Storage quản lý file, Django chỉ lưu key:

```python
infographic_pdf_key = models.CharField(
    max_length=255,
    blank=True,
    verbose_name='Lược đồ PDF (Bunny key)',
    help_text='Bunny Storage key. Tu dong dien khi upload qua admin. Toi da 50MB.',
)
infographic_video_url = models.CharField(
    max_length=500,
    blank=True,
    verbose_name='Video tom tat URL',
    help_text='URL video tom tat (Bunny embed URL hoac iframe src). Dan URL truc tiep.',
)
```

> `infographic_pdf_key` lưu đường dẫn trong Bunny Storage zone, ví dụ: `infographics/a3f8c2d14b5e6f7a8c9d0e1f2a3b4c5d.pdf`

#### 2. Bunny Storage utility — `videos/bunny_file_storage.py` (mới)

Tách riêng utility cho file storage (khác Bunny Stream dùng cho video):

```python
"""
Bunny Storage utility for static file assets (PDFs, infographics).
Different from BunnyVideoStorage (Bunny Stream — video transcoding).

Required settings:
    BUNNY_STORAGE_ZONE         — Storage zone name (e.g. "thiênthu-assets")
    BUNNY_STORAGE_API_KEY      — Storage zone Password (read/write)
    BUNNY_STORAGE_CDN_HOSTNAME — Pull zone hostname (e.g. "assets.thiênthu.vn")
    BUNNY_STORAGE_TOKEN_KEY    — Pull zone Token Authentication secret key
"""
import base64
import hashlib
import time
import uuid

import requests as http
from django.conf import settings


_STORAGE_API_BASE = 'https://storage.bunnycdn.com'


def upload_pdf_to_bunny(file_obj, lesson_pk: int, lesson_uuid: str, existing_key: str = '') -> str:
    """
    Upload a PDF to Bunny Storage and return the storage key.

    Filename format: infographics/{lesson_pk}_{lesson_uuid}_{hex4}.pdf
      - lesson_pk   : integer PK — files sort naturally by ID in Bunny dashboard
      - lesson_uuid : public_id UUID — identifies the lesson at a glance
      - hex4        : 4-char random hex suffix — prevents enumeration even if
                      both IDs are known (token auth is the primary security layer)

    If existing_key is provided (re-upload), the same key is reused so Bunny
    overwrites the file in-place — no delete step needed.

    Raises requests.HTTPError on failure.
    """
    if existing_key:
        filename = existing_key                              # reuse → overwrite
    else:
        short_random = uuid.uuid4().hex[:4]                 # e.g. "f3a1"
        filename = f'infographics/{lesson_pk}_{lesson_uuid}_{short_random}.pdf'

    zone = settings.BUNNY_STORAGE_ZONE
    api_key = settings.BUNNY_STORAGE_API_KEY

    url = f'{_STORAGE_API_BASE}/{zone}/{filename}'
    resp = http.put(
        url,
        data=file_obj.read(),
        headers={
            'AccessKey': api_key,
            'Content-Type': 'application/pdf',
        },
        timeout=120,
    )
    resp.raise_for_status()
    return filename


def delete_pdf_from_bunny(storage_key: str) -> None:
    """Delete a previously uploaded PDF from Bunny Storage."""
    zone = settings.BUNNY_STORAGE_ZONE
    api_key = settings.BUNNY_STORAGE_API_KEY
    url = f'{_STORAGE_API_BASE}/{zone}/{storage_key}'
    resp = http.delete(url, headers={'AccessKey': api_key}, timeout=30)
    resp.raise_for_status()


def generate_bunny_pdf_signed_url(storage_key: str, expires_in: int = 300) -> str:
    """
    Generate a time-limited signed CDN URL for a Bunny Storage file.
    Uses Bunny Token Authentication (SHA256 HMAC).

    expires_in: seconds until URL expires (default 300 = 5 minutes).
    """
    cdn_hostname = settings.BUNNY_STORAGE_CDN_HOSTNAME
    token_key = settings.BUNNY_STORAGE_TOKEN_KEY
    expire_time = int(time.time()) + expires_in

    url_path = f'/{storage_key}'

    # Bunny Token Auth format: base64(sha256(token_key + url_path + expire_time))
    raw = f'{token_key}{url_path}{expire_time}'
    token = (
        base64.b64encode(hashlib.sha256(raw.encode('utf-8')).digest())
        .decode('utf-8')
        .replace('\n', '')
        .replace('+', '-')
        .replace('/', '_')
        .replace('=', '')
    )
    return f'https://{cdn_hostname}{url_path}?token={token}&expires={expire_time}'
```

#### 3. Settings — `settings.py` / `.env`

Các biến môi trường cần thêm (Bunny Storage — khác với Bunny Stream đã có):

```env
# Bunny Storage (for PDF/static file assets)
BUNNY_STORAGE_ZONE=thiênthu-assets
BUNNY_STORAGE_API_KEY=xxxx-storage-password
BUNNY_STORAGE_CDN_HOSTNAME=assets.thiênthu.vn
BUNNY_STORAGE_TOKEN_KEY=xxxx-pull-zone-token-key
```

> `BUNNY_STORAGE_ZONE` và `BUNNY_STORAGE_API_KEY` đã có property trong `BunnyVideoStorage` (dormant). `BUNNY_STORAGE_CDN_HOSTNAME` và `BUNNY_STORAGE_TOKEN_KEY` là mới — cần thêm vào `.env.example`.

#### 4. Admin Form + Admin Class — `videos/admin.py`

Thêm upload field và validation vào `VideoLessonAdminForm`:

```python
class VideoLessonAdminForm(forms.ModelForm):
    # ... existing video_upload field ...
    infographic_pdf_upload = forms.FileField(
        required=False,
        label='Upload lược đồ PDF lên Bunny',
        help_text='PDF tối đa 50MB. Sau khi lưu, file được upload lên Bunny Storage.',
        widget=forms.FileInput(attrs={'accept': 'application/pdf'}),
    )

    def clean_infographic_pdf_upload(self):
        f = self.cleaned_data.get('infographic_pdf_upload')
        if f and hasattr(f, 'size') and f.size > 50 * 1024 * 1024:
            raise forms.ValidationError('File PDF khong duoc vuot qua 50MB.')
        return f

    class Meta:
        model = VideoLesson
        fields = '__all__'
```

Thêm fieldset và preview vào `VideoLessonAdmin`:

```python
class VideoLessonAdmin(admin.ModelAdmin):
    readonly_fields = (
        'video_id', 'video_url', 'video_status',
        'fetch_metadata_btn', 'extract_thumbnail_btn',
        'infographic_pdf_status',   # ← new
    )

    fieldsets = (
        (None, {
            'fields': ('course', 'title', 'slug', 'order', 'is_free'),
        }),
        ('Video', {
            'fields': ('video_upload', 'video_status', 'video_id', 'video_url',
                       'duration_seconds', 'fetch_metadata_btn', 'thumbnail', 'extract_thumbnail_btn'),
        }),
        ('Luoc do / Tom tat', {                            # ← new fieldset
            'fields': ('infographic_pdf_upload', 'infographic_pdf_status', 'infographic_video_url'),
            'description': (
                'Dinh kem luoc do PDF <strong>hoac</strong> URL video tom tat '
                '(hoac ca hai). Hien thi trong tab "Luoc do" cua trinh phat video. '
                'PDF toi da 50MB.'
            ),
        }),
        ('Noi dung', {
            'fields': ('description', 'transcript', 'summary'),
            'classes': ('collapse',),
        }),
    )

    def infographic_pdf_status(self, obj):
        if not obj.pk or not obj.infographic_pdf_key:
            return format_html('<span style="color:#ef5350">Chua co luoc do PDF</span>')
        # ✅ Build API URL trực tiếp — không dùng reverse('admin:...') vì URL thuộc API router
        url = f'/api/videos/lessons/{obj.public_id}/infographic-pdf/'
        return format_html(
            '<span style="color:#66bb6a">Key: {}</span> — '
            '<a href="{}" target="_blank" style="font-weight:bold">Xem PDF hien tai ↗</a>',
            obj.infographic_pdf_key,
            url,
        )
    infographic_pdf_status.short_description = 'Luoc do PDF hien tai'

    def save_model(self, request, obj, form, change):
        # ... existing slug + video_upload logic ...
        super().save_model(request, obj, form, change)
        pdf_file = form.cleaned_data.get('infographic_pdf_upload')
        if pdf_file:
            from .bunny_file_storage import upload_pdf_to_bunny
            try:
                # Pass existing_key so re-upload overwrites same Bunny path (no delete needed)
                key = upload_pdf_to_bunny(
                    pdf_file,
                    lesson_pk=obj.pk,
                    lesson_uuid=str(obj.public_id),
                    existing_key=obj.infographic_pdf_key,
                )
                obj.infographic_pdf_key = key
                obj.save(update_fields=['infographic_pdf_key'])
                self.message_user(request, f'Da upload luoc do PDF: {key}')
            except Exception as exc:
                self.message_user(request, f'Upload PDF that bai: {exc}', level='error')
```

#### 5. Serializer — `videos/serializers.py`

Check `infographic_pdf_key` (CharField) thay vì FileField cũ:

```python
class VideoLessonDetailSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    infographic_pdf_url = serializers.SerializerMethodField()

    def get_video_url(self, obj):
        return getattr(obj, '_resolved_video_url', obj.video_url) or obj.video_url

    def get_infographic_pdf_url(self, obj):
        if not obj.infographic_pdf_key:   # ← CharField, not FileField
            return None
        request = self.context.get('request')
        if request:
            # ✅ UUID-based endpoint — Django validates access, then redirects to signed CDN URL
            return request.build_absolute_uri(
                f'/api/videos/lessons/{obj.public_id}/infographic-pdf/'
            )
        return None

    class Meta:
        model = VideoLesson
        fields = (
            'public_id', 'title', 'slug', 'order', 'description',
            'video_url', 'video_id', 'duration_seconds', 'transcript', 'summary',
            'thumbnail', 'is_free',
            'infographic_pdf_url',    # ← new: Django access-check endpoint → 302 signed CDN URL
            'infographic_video_url',  # ← new: raw embed URL
        )
```

#### 6. Protected PDF Endpoint — `videos/views.py`

Access check → **302 redirect** sang signed Bunny CDN URL. File không đi qua Django:

```python
from django.http import HttpResponseRedirect

class LessonInfographicPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_uuid):
        # ✅ Lookup by public_id (UUID) — Dual ID Strategy
        lesson = get_object_or_404(VideoLesson, public_id=lesson_uuid)

        # Access check: staff bypass → free lesson → course free → VIP → purchased
        if not request.user.is_staff and not lesson.is_free:
            course = lesson.course
            if not course.is_free:
                if request.user.user_type != 'VIP':
                    has_access = UserVideoPurchase.objects.filter(
                        user=request.user, video=course
                    ).exists()
                    if not has_access:
                        return Response(
                            {'error': 'Ban chua mua khoa hoc nay.'},
                            status=status.HTTP_403_FORBIDDEN
                        )

        if not lesson.infographic_pdf_key:
            return Response(
                {'error': 'Bai hoc nay khong co luoc do PDF.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # ✅ 302 redirect to signed Bunny CDN URL (TTL 5 min)
        # File delivered directly by Bunny CDN — no Django memory/bandwidth used
        from .bunny_file_storage import generate_bunny_pdf_signed_url
        signed_url = generate_bunny_pdf_signed_url(lesson.infographic_pdf_key, expires_in=300)
        return HttpResponseRedirect(signed_url)
```

> **Flow:** FE gọi `/api/videos/lessons/{uuid}/infographic-pdf/` → Django check quyền → 302 → Bunny CDN (signed URL, TTL 5 phút). Signed URL hết hạn sau 5 phút, không thể bookmark hay share lâu dài. Filename UUID trên CDN không enumerate được.

#### 6. URL — `videos/urls.py`

```python
path(
    # ✅ UUID-based — không lộ internal integer pk
    'lessons/<uuid:lesson_uuid>/infographic-pdf/',
    LessonInfographicPDFView.as_view(),
    name='videos_videolesson_infographic_pdf',
),
```

---

### Frontend (Vue.js)

#### 1. `videos.service.js`

Không cần thay đổi — API đã trả về `infographic_pdf_url` và `infographic_video_url` trong lesson detail response.

#### 2. Tab "Lược đồ" trong `VideoPlayerView.vue`

**Lưu ý quan trọng:** `TABS` hiện tại trong `VideoPlayerView.vue` là `const` array. Cần **đổi sang `computed`** để tab "Lược đồ" chỉ xuất hiện khi lesson có infographic. Đồng thời update tất cả chỗ dùng `TABS` trong template (vẫn dùng `.value` như mọi computed).

```javascript
// ✅ Đổi từ const sang computed
const TABS = computed(() => {
  const tabs = [
    { label: 'Danh sách bài' },
    { label: 'Flashcards' },
    { label: 'Ôn luyện' },
  ]
  if (lesson.value?.infographic_pdf_url || lesson.value?.infographic_video_url) {
    tabs.push({ label: 'Lược đồ' })
  }
  return tabs
})

const infographicTabIndex = computed(() => {
  if (!lesson.value?.infographic_pdf_url && !lesson.value?.infographic_video_url) return -1
  return 3 // index sau 3 tab cố định
})
```

> **Chú ý cho implement:** Kiểm tra toàn bộ template tham chiếu `TABS` (tab bar render, `v-for`, length check) — đảm bảo không bị break khi đổi sang computed. `activeTab` cũng cần reset về `0` khi chuyển sang lesson không có infographic (tránh index out of range).

#### 3. Component `LessonInfographic.vue` (mới)

File: `src/frontend/src/components/video/LessonInfographic.vue`

```vue
<script setup>
import { ref } from 'vue'  // ✅ import ref

const props = defineProps({
  pdfUrl: { type: String, default: null },
  videoUrl: { type: String, default: null },
})

// Default sang view có sẵn
const activeView = ref(props.pdfUrl ? 'pdf' : 'video')
</script>

<template>
  <div class="infographic">
    <!-- Toggle — chỉ hiện khi có cả 2 -->
    <div v-if="pdfUrl && videoUrl" class="infographic__toggle">
      <button :class="{ active: activeView === 'pdf' }" @click="activeView = 'pdf'">
        Lược đồ PDF
      </button>
      <button :class="{ active: activeView === 'video' }" @click="activeView = 'video'">
        Video tóm tắt
      </button>
    </div>

    <!-- PDF viewer -->
    <div v-if="pdfUrl && (activeView === 'pdf' || !videoUrl)" class="infographic__pdf">
      <a :href="pdfUrl" target="_blank" rel="noopener" class="infographic__download-btn">
        Mở lược đồ PDF ↗
      </a>
      <iframe
        :src="pdfUrl + '#toolbar=0'"
        class="infographic__pdf-frame"
        title="Lược đồ bài học"
      />
    </div>

    <!-- Summary video -->
    <div v-if="videoUrl && (activeView === 'video' || !pdfUrl)" class="infographic__video">
      <iframe
        :src="videoUrl"
        class="infographic__video-frame"
        allowfullscreen
        title="Video tóm tắt bài học"
      />
    </div>
  </div>
</template>

<style scoped>
.infographic__pdf-frame {
  width: 100%;
  height: 600px;
  border: none;
}

.infographic__video-frame {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: none;
}

.infographic__toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.infographic__download-btn {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 13px;
}
</style>
```

#### 4. Tích hợp vào `VideoPlayerView.vue`

```vue
<!-- Import -->
import LessonInfographic from '../components/video/LessonInfographic.vue'

<!-- Trong template -->
<div v-if="activeTab === infographicTabIndex">
  <LessonInfographic
    :pdf-url="lesson.infographic_pdf_url"
    :video-url="lesson.infographic_video_url"
  />
</div>
```

---

## Trade-off & lưu ý

| Vấn đề | Quyết định | Lý do |
|--------|-----------|-------|
| Inline fields vs. Separate model | Inline fields trên VideoLesson | Mỗi lesson chỉ cần 1 PDF key + 1 video URL. Separate model là over-engineering. |
| PDF storage: VPS local vs. Bunny Storage | Bunny Storage | CDN delivery nhanh hơn, không tốn VPS disk, không stream qua Django process. |
| PDF filename | `infographics/{lesson_public_id}_{hex4}.pdf` | Readable (identify lesson từ dashboard) + hex4 suffix chống enumerate. Key cố định sau lần đầu — re-upload overwrites. |
| Serve PDF: FileResponse vs. 302 signed redirect | 302 redirect sang signed Bunny URL | File do Bunny CDN deliver trực tiếp; Django chỉ làm access gate. TTL 5 phút chống bookmark/share. |
| Endpoint ID: `pk` vs `public_id` | `public_id` (UUID) | Tuân thủ Dual ID Strategy — tránh ID enumeration attack. |
| PDF viewer: `<iframe>` vs. `pdfjs-dist` | `<iframe>` | Use-case tóm tắt, không cần watermark/DRM. `pdfjs-dist` đã có cho BookReader nhưng overkill ở đây. |
| Tab "Lược đồ": luôn hiện vs. ẩn khi không có | Ẩn khi không có | Tránh cluttered UI; tab chỉ xuất hiện khi có nội dung. |
| File size limit | 50MB, validate ở AdminForm | Đủ cho PDF infographic; tránh admin upload nhầm file lớn. |

**Edge cases:**
- `BUNNY_STORAGE_TOKEN_KEY` chưa cấu hình → `generate_bunny_pdf_signed_url` raise `AttributeError`. Cần đảm bảo tất cả 4 biến môi trường Bunny Storage có mặt trước khi deploy.
- Bunny Storage upload fail (network/quota) → admin nhận error message, `infographic_pdf_key` không được cập nhật — lesson vẫn hoạt động bình thường, chỉ thiếu infographic.
- Old PDF key còn trong DB sau khi replace → `delete_pdf_from_bunny` gọi trong `save_model` (non-blocking, fail silently).
- `infographic_video_url` là raw embed URL — admin cần dán đúng định dạng. Không validate format ở BE (tránh over-engineering cho MVP).
- Mobile: `<iframe>` PDF không render tốt trên iOS Safari → nút "Mo PDF ↗" (`target="_blank"`) là fallback.
- Khi chuyển sang lesson mới không có infographic, `activeTab` cần reset về `0` nếu đang ở index 3.

**Lưu ý Feature 13 (Content Sync):**
Khi Feature 13 được implement, `sync_content_export/import` cho `VideoLesson` cần bao gồm trường `infographic_video_url` (text, sync được). Riêng `infographic_pdf` là binary file — cần xử lý riêng (ghi chú trong design doc của Feature 13, không sync file trong MVP).

---

## Bước tiếp theo (thứ tự implement)

1. **BE — Settings**: Thêm `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_CDN_HOSTNAME`, `BUNNY_STORAGE_TOKEN_KEY` vào `.env` + `.env.example`.
2. **BE — Bunny utility**: Tạo `videos/bunny_file_storage.py` (`upload_pdf_to_bunny`, `delete_pdf_from_bunny`, `generate_bunny_pdf_signed_url`).
3. **BE — Model + Migration**: Thêm `infographic_pdf_key` (CharField) + `infographic_video_url` vào `VideoLesson`, chạy `makemigrations` + `migrate`.
4. **BE — Admin**: Thêm `infographic_pdf_upload` field + `clean_infographic_pdf_upload` vào Form; thêm fieldset + `infographic_pdf_status` + Bunny upload logic vào `save_model`.
5. **BE — Serializer**: Thêm `infographic_pdf_url` + `infographic_video_url` vào `VideoLessonDetailSerializer`.
6. **BE — View + URL**: Tạo `LessonInfographicPDFView` (UUID lookup, 302 signed redirect) + đăng ký URL.
7. **FE — Component**: Tạo `LessonInfographic.vue`.
8. **FE — PlayerView**: Đổi `TABS` sang `computed`; thêm `infographicTabIndex`; import + render `LessonInfographic`; reset `activeTab` khi load lesson mới.
9. **Test**: Upload PDF admin → xem `infographic_pdf_status` → click link → redirect sang Bunny CDN → render trong player iframe. Kiểm tra access control (403 nếu chưa mua). Tab ẩn/hiện đúng khi chuyển lesson.

---

## Files cần tạo/sửa

| File | Hanh dong |
|------|-----------|
| `.env` + `.env.example` | Them 4 bien `BUNNY_STORAGE_*` |
| `src/backend/videos/bunny_file_storage.py` | Tao moi: `upload_pdf_to_bunny`, `delete_pdf_from_bunny`, `generate_bunny_pdf_signed_url` |
| `src/backend/videos/models.py` | Them `infographic_pdf_key` (CharField), `infographic_video_url` vao `VideoLesson` |
| `src/backend/videos/migrations/xxxx_add_lesson_infographic.py` | Tao migration |
| `src/backend/videos/admin.py` | `infographic_pdf_upload` field + `clean` + fieldset + `infographic_pdf_status` + Bunny upload trong `save_model` |
| `src/backend/videos/serializers.py` | Them `infographic_pdf_url`, `infographic_video_url` vao `VideoLessonDetailSerializer` |
| `src/backend/videos/views.py` | Them `LessonInfographicPDFView` (UUID lookup, 302 signed redirect) |
| `src/backend/videos/urls.py` | Dang ky `lessons/<uuid:lesson_uuid>/infographic-pdf/` |
| `src/frontend/src/components/video/LessonInfographic.vue` | Tao moi |
| `src/frontend/src/views/VideoPlayerView.vue` | Doi `TABS` computed; them tab + component; reset `activeTab` |
