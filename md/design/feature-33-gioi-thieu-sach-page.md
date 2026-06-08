# Feature 33 — Trang Giới Thiệu Sách (`/gioi-thieu-sach`)

## Tóm tắt

Thiết kế lại trang giới thiệu tài liệu công khai (public, không cần đăng nhập) tại URL `/gioi-thieu-sach`. Trang hiển thị danh sách các bộ sách/tài liệu theo dạng accordion + featured card, có sidebar liên hệ. Toàn bộ nội dung (tiêu đề trang, tag label, các chapter, các item sách, link demo, sidebar contact) được lấy từ API backend — không hardcode trên frontend.

Trang dùng **layout riêng** (`LandingLayout`) — không có AppHeader/BottomNav của app, vì đây là landing page độc lập hướng đến visitor chưa đăng nhập. Không có entry point từ navigation nội bộ — truy cập trực tiếp qua URL hoặc link chia sẻ.

---

## Phân tích

### Yêu cầu chức năng
- URL công khai: `/gioi-thieu-sach` — không yêu cầu xác thực.
- Nội dung trang lấy từ API: `GET /api/landing/book-intro/`
- Layout 2 cột: cột trái (2/3) là danh sách chapter accordion + featured card; cột phải (1/3) là sidebar liên hệ sticky.
- Accordion: mỗi chapter có thể expand/collapse, chứa danh sách sách con với link "Xem Demo".
- Featured card: một số chapter hiển thị dạng card nổi bật (không accordion), có icon trang trí.
- Sidebar: ảnh QR Zalo + link Zalo — lấy từ API. Click vào QR dẫn đến `sidebar_zalo_url`.
- Responsive: mobile stack thành 1 cột, sidebar xuống dưới.
- Không có entry point từ navigation app — truy cập qua URL trực tiếp hoặc link chia sẻ.
- Layout độc lập: không dùng AppHeader/BottomNav.

### Các tầng liên quan
- **Backend (Django):** Model + Admin + API endpoint mới trong app `landing` (hoặc `core`).
- **Frontend (Vue.js):** View mới + Service + Router entry.
- **Database (PostgreSQL):** Bảng mới để quản lý content trang giới thiệu.

---

## Đề xuất giải pháp

### Database (PostgreSQL)

Tạo thêm Django app mới `landing` với **1 model duy nhất** — `chapters` lưu dạng `JSONField`:

#### Model: `BookIntroPage`
Singleton model — chỉ có 1 bản ghi.

```python
class BookIntroPage(models.Model):
    tag_label        = models.CharField(max_length=100)   # "Lưu Hành Nội Bộ"
    headline         = models.TextField()                  # tiêu đề lớn h1
    is_active        = models.BooleanField(default=True)
    sidebar_qr_image = models.URLField(blank=True)         # URL ảnh QR (Bunny CDN)
    sidebar_zalo_url = models.URLField()
    chapters         = models.JSONField(default=list)      # toàn bộ nội dung chapters + items

    class Meta:
        verbose_name = 'Book Intro Page'
```

> `sidebar_qr_image` dùng `URLField` — admin upload ảnh QR lên Bunny Storage rồi paste CDN URL vào.

#### JSON schema của field `chapters`

```json
[
  {
    "chapter_label": "CHAPTER I",
    "title": "Huyền Không phi tinh học",
    "subtitle": "Bộ 3 cuốn - 1200 trang",
    "price_label": "100 linh thạch",
    "display_type": "accordion",
    "icon": "",
    "items": [
      {
        "title": "1.1. Huyền không phi tinh một cuốn là thành thạo",
        "demo_url": "https://drive.google.com/...",
        "demo_label": "XEM DEMO",
        "copy_link_url": "https://..."
      }
    ]
  },
  {
    "chapter_label": "Chapter III",
    "title": "Chính Ngũ Hành Trạch Nhật",
    "subtitle": "",
    "price_label": "200 linh thạch",
    "display_type": "featured",
    "icon": "auto_stories",
    "items": [
      {
        "title": "",
        "demo_url": "https://drive.google.com/...",
        "demo_label": "Xem Demo Bản Gốc",
        "copy_link_url": ""
      }
    ]
  }
]
```

`display_type` nhận 2 giá trị: `"accordion"` hoặc `"featured"`.
`copy_link_url` để chuỗi rỗng `""` nếu không có — frontend sẽ ẩn nút "Sao chép link".

#### JSON schema validation — `clean()` method

Model validate `chapters` trước khi save để tránh admin nhập sai cấu trúc:

```python
from django.core.exceptions import ValidationError

VALID_DISPLAY_TYPES = {'accordion', 'featured'}
CHAPTER_REQUIRED_KEYS = {'chapter_label', 'title', 'display_type', 'items'}
ITEM_REQUIRED_KEYS = {'demo_url'}

class BookIntroPage(models.Model):
    # ... fields ...

    def clean(self):
        if not isinstance(self.chapters, list):
            raise ValidationError({'chapters': 'chapters phải là một mảng JSON.'})
        for i, chapter in enumerate(self.chapters):
            missing = CHAPTER_REQUIRED_KEYS - chapter.keys()
            if missing:
                raise ValidationError({'chapters': f'Chapter {i+1} thiếu các key: {missing}'})
            if chapter.get('display_type') not in VALID_DISPLAY_TYPES:
                raise ValidationError({'chapters': f'Chapter {i+1}: display_type phải là "accordion" hoặc "featured".'})
            if not isinstance(chapter.get('items'), list):
                raise ValidationError({'chapters': f'Chapter {i+1}: items phải là một mảng.'})
            for j, item in enumerate(chapter['items']):
                missing_item = ITEM_REQUIRED_KEYS - item.keys()
                if missing_item:
                    raise ValidationError({'chapters': f'Chapter {i+1}, item {j+1} thiếu key: {missing_item}'})
                if not item.get('demo_url'):
                    raise ValidationError({'chapters': f'Chapter {i+1}, item {j+1}: demo_url không được rỗng.'})
```

`clean()` được Django admin gọi tự động khi save — lỗi hiển thị ngay trên form trước khi ghi DB.

**Migration:** tạo migration mới trong app `landing`.

---

### Backend (Django)

#### App: `landing`

Tạo app mới `landing` (hoặc thêm file vào `core` — khuyến nghị tạo app mới để tách biệt):

```
src/backend/landing/
  __init__.py
  admin.py
  apps.py
  models.py
  serializers.py
  views.py
  urls.py
  migrations/
```

Thêm vào `INSTALLED_APPS` trong `settings.py`:
```python
'landing',
```

Thêm vào `config/urls.py`:
```python
path('api/landing/', include('landing.urls')),
```

#### Serializers

1 serializer duy nhất — `chapters` trả về trực tiếp từ JSONField, không cần nested serializer:

```python
class BookIntroPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookIntroPage
        fields = ['tag_label', 'headline', 'chapters', 'sidebar_qr_image', 'sidebar_zalo_url']
```

#### View

```python
class BookIntroPageView(generics.RetrieveAPIView):
    serializer_class = BookIntroPageSerializer
    permission_classes = [AllowAny]  # public page

    def get_object(self):
        return get_object_or_404(BookIntroPage, is_active=True)
```

#### URL

```python
# landing/urls.py
urlpatterns = [
    path('book-intro/', BookIntroPageView.as_view(), name='book-intro-page'),
]
```

**API endpoint:** `GET /api/landing/book-intro/` — public, no auth required.

#### Admin

Dùng `django-jsoneditor` để render `chapters` JSONField thành editor có syntax highlight, collapsible nodes, validate JSON trực tiếp trong trang admin — thay vì textarea thuần:

```bash
pip install django-jsoneditor
```

Thêm vào `INSTALLED_APPS`:
```python
'jsoneditor',
```

```python
# landing/admin.py
from django.contrib import admin
from jsoneditor.forms import JSONEditor
from .models import BookIntroPage

@admin.register(BookIntroPage)
class BookIntroPageAdmin(admin.ModelAdmin):
    formfield_overrides = {
        # renders chapters field as a full JSON tree editor
        models.JSONField: {'widget': JSONEditor},
    }
    # Prevent creating more than 1 instance
    def has_add_permission(self, request):
        return not BookIntroPage.objects.exists()
```

Admin UX khi dùng `django-jsoneditor`:
- Field `chapters` hiển thị dạng tree có thể expand/collapse từng chapter và item.
- Có nút Add/Remove node, drag-to-reorder.
- Validate JSON trước khi save — báo lỗi ngay nếu sai cú pháp.
- Admin chỉ cần paste URL và điền text, không cần biết JSON syntax thủ công.

---

### Frontend (Vue.js)

#### Layout: `LandingLayout.vue`

Tạo `src/frontend/src/layouts/LandingLayout.vue` — layout tối giản, không có AppHeader/BottomNav:

```vue
<template>
  <div class="landing-layout">
    <RouterView />
  </div>
</template>

<style scoped>
.landing-layout {
  min-height: 100vh;
}
</style>
```

#### Router

Thêm route mới **ngoài** nhóm AppLayout, dùng `LandingLayout`:

```js
{
  path: '/',
  component: () => import('../layouts/LandingLayout.vue'),
  children: [
    {
      path: 'gioi-thieu-sach',
      name: 'BookIntroPage',
      component: () => import('../views/BookIntroPageView.vue'),
      meta: { requiresAuth: false },
    },
  ],
},
```

Trang **không yêu cầu auth** — visitor chưa đăng nhập vẫn xem được.

#### Service

Tạo file mới `src/frontend/src/services/landing.service.js`:

```js
import api from '../api/client'

const CACHE_30M = { ttl: 30 * 60 * 1000 }

export const landingService = {
  getBookIntroPage() {
    return api.get('landing/book-intro/', { cache: CACHE_30M })
  },
}
```

#### View: `BookIntroPageView.vue`

Tạo `src/frontend/src/views/BookIntroPageView.vue`.

**Cấu trúc component:**

```
BookIntroPageView.vue
  ├── <BookIntroHeader>       — tag label + h1 headline + decorative line
  ├── <BookIntroChapterList>  — list of chapters
  │     ├── <BookIntroAccordion>   — display_type === 'accordion'
  │     ├── <BookIntroFeaturedGrid> — group of featured cards (display_type === 'featured')
  │     └── <BookIntroAccordion>   — ...
  └── <BookIntroSidebar>      — sticky sidebar (QR image + Zalo link)
```

Tuy nhiên để tránh over-engineering, có thể implement toàn bộ trong 1 view file hoặc tách thành 2-3 component con nếu cần tái sử dụng. **Khuyến nghị tách thành các component con** trong `src/frontend/src/components/landing/`:

```
components/landing/
  BookIntroAccordionItem.vue   — 1 accordion chapter
  BookIntroFeaturedCard.vue    — 1 featured card
  BookIntroSidebar.vue         — sidebar: QR image + link Zalo
```

#### Nút "Sao chép link"

Mỗi item có thể có 2 action button đặt cạnh nhau:

```
[ XEM DEMO ↗ ]  [ Sao chép link ⧉ ]
```

- **Nút "Xem Demo"** — luôn hiển thị, mở `demo_url` trong tab mới (`target="_blank"`).
- **Nút "Sao chép link"** — chỉ hiển thị khi `copy_link_url` không rỗng. Click gọi `navigator.clipboard.writeText(copy_link_url)`, sau đó đổi label thành "Đã sao chép!" trong 2 giây rồi trả về label gốc.

```js
const copied = ref(false)

async function copyLink(url) {
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
```

`copy_link_url` có thể là cùng URL với `demo_url` hoặc một link khác (ví dụ link rút gọn để chia sẻ). Admin tự điền từ Django Admin.

#### Loading, error và empty states

- **Loading:** hiển thị skeleton gồm 2 dòng header placeholder + 3 accordion bar placeholder — không dùng spinner.
- **Error:** khi API trả lỗi hoặc 404 (`is_active=False`), hiển thị message "Không thể tải nội dung, vui lòng thử lại" kèm nút retry gọi lại API.
- **Empty:** nếu `chapters` là mảng rỗng, hiển thị message "Chưa có nội dung." (edge case khi admin chưa nhập data).

```js
const pageData = ref(null)
const loading = ref(true)
const error = ref(false)

async function fetchPage() {
  loading.value = true
  error.value = false
  try {
    const res = await landingService.getBookIntroPage()
    pageData.value = res.data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchPage)
```

#### Sidebar QR image fallback

Khi ảnh QR từ Bunny CDN load lỗi, ẩn ảnh và hiển thị icon placeholder:

```vue
<img
  :src="pageData.sidebar_qr_image"
  alt="QR Zalo"
  @error="(e) => e.target.style.display = 'none'"
/>
```

#### Logic accordion

Dùng `chapter_label` làm key thay index — ổn định khi admin reorder chapters trong JSON.

```js
const activeChapterLabel = ref(null)

onMounted(() => {
  // open first accordion chapter by default
  const first = pageData.value?.chapters.find(c => c.display_type === 'accordion')
  if (first) activeChapterLabel.value = first.chapter_label
})

function toggleChapter(label) {
  activeChapterLabel.value = activeChapterLabel.value === label ? null : label
}
```

`chapter_label` là unique tự nhiên ("CHAPTER I", "CHAPTER II"...) — dùng làm key toggle an toàn.

#### API response shape (expected)

```json
{
  "tag_label": "Lưu Hành Nội Bộ",
  "headline": "Demo các bộ sách huyền học mà bạn không thể bỏ qua",
  "sidebar_qr_image": "https://cdn.bunnycdn.com/.../qr.png",
  "sidebar_zalo_url": "https://zalo.me/...",
  "chapters": [
    {
      "chapter_label": "CHAPTER I",
      "title": "Huyền Không phi tinh học (1 cuốn là thành thạo)",
      "subtitle": "Bộ 3 cuốn - 1200 trang",
      "price_label": "100 linh thạch",
      "display_type": "accordion",
      "icon": "",
      "items": [
        { "title": "1.1. Huyền không phi tinh...", "demo_url": "https://...", "demo_label": "XEM DEMO", "copy_link_url": "https://..." },
        { "title": "1.2. Học phong thuỷ đoán bệnh...", "demo_url": "https://...", "demo_label": "XEM DEMO", "copy_link_url": "" }
      ]
    },
    {
      "chapter_label": "Chapter III",
      "title": "Chính Ngũ Hành Trạch Nhật",
      "subtitle": "",
      "price_label": "200 linh thạch",
      "display_type": "featured",
      "icon": "auto_stories",
      "items": [
        { "title": "", "demo_url": "https://...", "demo_label": "Xem Demo Bản Gốc", "copy_link_url": "" }
      ]
    }
  ]
}
```

#### Layout chi tiết (tham chiếu UI mẫu)

```
BookIntroPageView
├── .page-layout (flex col → lg: flex row, gap)
│   ├── .main-col (lg: w-2/3)
│   │   ├── .page-header
│   │   │   ├── <span> tag_label (uppercase gold)
│   │   │   ├── <h1> headline (large serif gold)
│   │   │   └── .celestial-line (decorative divider)
│   │   └── .chapter-list
│   │       ├── [accordion chapters] → BookIntroAccordionItem
│   │       ├── [featured grid — consecutive featured cards] → 2-col grid BookIntroFeaturedCard
│   │       └── [more accordion chapters] → BookIntroAccordionItem
│   └── .sidebar-col (lg: w-1/3)
│       └── BookIntroSidebar (sticky top)
```

**Xử lý featured cards:** Các chapter có `display_type === 'featured'` được group liên tiếp và render trong 1 `<div class="grid grid-cols-2 gap-6">`. Nếu lẻ thì span full width.

#### CSS / Styling

Trang này dùng system design tokens hiện có (CSS variables) của dự án. Tham chiếu thêm các class decoration từ UI mẫu:
- `.celestial-line` — đường trang trí với diamond center, implement bằng CSS `::after`
- `.parchment-glow` — `box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.05)`
- Accordion transition: `max-height` từ 0 → `fit-content` với `transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1)` — **dùng Vue `<Transition>` hoặc CSS class toggle**

> Không dùng Tailwind CDN — dự án đã có CSS variables và class-based styling.

---

## Trade-off & lưu ý

### JSONField vs 3 bảng riêng
- **Chọn:** JSONField — 1 model duy nhất, 1 migration, serializer đơn giản, không cần nested inline.
- **Đánh đổi:** Không query/filter theo chapter/item từ DB; không có foreign key constraint. Chấp nhận được vì đây là content tĩnh, không cần query sâu.
- **Admin UX:** Bù đắp bằng `django-jsoneditor` — editor tree trực quan, validate JSON, không cần biết JSON syntax thủ công.

### `display_type` trong JSON
- Admin tự nhập `"accordion"` hoặc `"featured"` vào JSON editor. Model `clean()` validate giá trị này trước khi save — báo lỗi ngay nếu sai.

### Cache
- Frontend cache 30 phút — trang này thay đổi ít. Khi admin cập nhật nội dung, nếu cần invalidate ngay thì có thể giảm TTL hoặc bỏ cache.

### Public access — no auth guard
- View backend dùng `AllowAny`. Router frontend không đặt `requiresAuth: true`. Trang hiển thị bình thường cho cả user đăng nhập và chưa đăng nhập.

### `sidebar_qr_image`
- Dùng `URLField` — admin upload ảnh QR lên Bunny Storage, paste CDN URL vào trường này. Đơn giản hơn `ImageField`, không cần upload flow riêng trong Django admin.

---

## Bước tiếp theo

**Backend:**
1. Cài `django-jsoneditor`: thêm vào `requirements.txt`, thêm `'jsoneditor'` vào `INSTALLED_APPS`
2. Tạo app `landing`: `python manage.py startapp landing`
3. Tạo `models.py` với 1 model `BookIntroPage`
4. Tạo `serializers.py`, `views.py`, `urls.py`
5. Đăng ký `landing` trong `INSTALLED_APPS`
6. Thêm `path('api/landing/', include('landing.urls'))` vào `config/urls.py`
7. Chạy `makemigrations landing` + `migrate`
8. Đăng ký admin với JSONEditor widget, tạo 1 bản ghi qua Django Admin và nhập dữ liệu

**Frontend:**
1. Tạo `src/frontend/src/layouts/LandingLayout.vue`
2. Tạo `src/frontend/src/services/landing.service.js`
3. Thêm route `LandingLayout > /gioi-thieu-sach` vào `router/index.js`
4. Tạo `src/frontend/src/views/BookIntroPageView.vue`
5. Tạo các component con trong `src/frontend/src/components/landing/`
6. Test responsive (mobile stack 1 cột)
7. Test với data API thực từ backend

**Thứ tự implement khuyến nghị:** Backend trước (tạo app + model + API + seed data), sau đó Frontend.
