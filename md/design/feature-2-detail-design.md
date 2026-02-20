# Feature 2 Detailed Design: Books Module

## Document Information
- **Feature**: Books Module (Backend)
- **Reference**: TASKS.md Phase 1 – Feature 2, database-design.md, api-specification.md
- **Last Updated**: 2026-02-20

---

## 1. Core Data Structures & Models

### 1.1 BookCategory
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | CharField(255) | Tên danh mục (e.g. Kỳ Môn, Trạch Nhật). |
| `slug` | SlugField(unique=True) | URL-safe identifier. |

### 1.2 Book (extends BaseModel)
Đã có `Book` cơ bản (title, price_lt). Mở rộng theo database-design:

| Field | Type | Description |
| :--- | :--- | :--- |
| `category` | FK(BookCategory, null=True) | Danh mục sách. |
| `title` | CharField(255) | Tên sách. |
| `slug` | SlugField(unique=True) | URL cho API/frontend. |
| `author` | CharField(255, blank=True) | Tác giả. |
| `cover_image` | ImageField/CharField(255, blank=True) | Ảnh bìa. |
| `description` | TextField(blank=True) | Mô tả. |
| `is_free` | BooleanField(default=False) | Sách miễn phí. |
| `is_new_release` | BooleanField(default=False) | Sách mới. |
| `price` | PositiveIntegerField | Giá Linh Thạch (đã có). |
| `demo_content` | TextField(blank=True) | Nội dung đọc thử. |
| `table_of_contents` | JSONField(blank=True, null=True) | Mục lục (structure). |
| `final_exam` | FK(Exam, null=True) | Bài thi cuối (optional). |
| `published_date` | DateField(null=True) | Ngày xuất bản. |

### 1.3 BookChapter (extends BaseModel)
| Field | Type | Description |
| :--- | :--- | :--- |
| `book` | FK(Book, CASCADE) | Sách chứa chương. |
| `title` | CharField(255) | Tên chương. |
| `slug` | CharField(255) | Slug trong sách. |
| `order` | PositiveIntegerField | Thứ tự chương. |
| `file_path` | CharField(500) | Đường dẫn file PDF (trong media). |
| `file_size` | PositiveIntegerField(null=True) | Kích thước file. |
| `page_count` | PositiveIntegerField(null=True) | Số trang. |
| `is_demo` | BooleanField(default=False) | Chương đọc thử. |
| Meta | unique_together | (book, order), (book, slug). |

### 1.4 UserBookPurchase
Đã có (user, book). Bổ sung nếu dùng PDF watermark (theo book-file-storage.md):

| Field | Type | Description |
| :--- | :--- | :--- |
| `pdf_ready` | BooleanField(default=False) | PDF đã generate watermark. |
| `pdf_generated_at` | DateTimeField(null=True) | Thời điểm generate. |
| `pdf_folder_path` | CharField(500, blank=True) | Đường dẫn thư mục PDF user. |

### 1.5 UserChapterProgress (optional)
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | FK(User) | User. |
| `chapter` | FK(BookChapter) | Chương. |
| `completed` | BooleanField(default=False) | Đã đọc xong. |
| `last_read` | DateTimeField(auto_now=True) | Lần đọc cuối. |
| Meta | unique_together | (user, chapter). |

---

## 2. Business Logic

### 2.1 Permission: Chapter Access
- **VIP**: Được đọc mọi chương (nếu book nằm trong gói VIP).
- **Purchased**: UserBookPurchase tồn tại → full access.
- **Demo**: Chương có `is_demo=True` → ai cũng đọc được.
- **Khác**: 403 hoặc redirect mua/VIP.

### 2.2 File Serving
- Gốc: `media/books/originals/{book_slug}/chapters/` (file gốc).
- User đã mua: Celery task generate PDF watermark → `media/books/users/u{user_id}/{book_slug}/`.
- API chapter content: Trả URL file (đã watermark nếu có) hoặc stream; cấu hình watermark (tên, SĐT) cho frontend nếu render HTML.

### 2.3 Watermark Config
API trả thêm object watermark cho frontend (tên user, phone) để overlay khi đọc (HTML/PDF viewer).

---

## 3. API Endpoints

| Endpoint | Method | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `/api/books/categories/` | GET | No | List danh mục. |
| `/api/books/` | GET | No | List sách (filter: category, is_new_release, is_free, search). |
| `/api/books/{slug}/` | GET | No | Chi tiết sách + chapters (has_purchased nếu auth). |
| `/api/books/{slug}/chapters/{order}/` | GET | Yes | Nội dung chương (check permission; trả URL/file hoặc content). |
| `/api/books/{slug}/chapters/{order}/watermark-config/` | GET | Yes | Cấu hình watermark (tên, SĐT) cho client. |

Mua sách: dùng sẵn `POST /api/payments/purchase-book/` (Feature 7).

---

## 4. Admin

- BookCategory: CRUD, list_display (title, slug).
- Book: list_display (title, category, price_lt, is_free, published_date), filter, search; inline BookChapter.
- BookChapter: inline trong Book hoặc tab riêng; upload file_path (PDF).
- UserBookPurchase: list_display (user, book, pdf_ready, created_at); readonly khi cần.
- Bulk import: Admin action hoặc form upload CSV/Excel để tạo Book + Chapter.

---

## 5. Media & Storage

- Cấu hình `MEDIA_ROOT`, `MEDIA_URL`.
- Thư mục: `media/books/originals/{book_slug}/cover.jpg`, `chapters/01-xxx.pdf`.
- Nếu dùng Celery: task `generate_user_book_pdfs` sau khi UserBookPurchase tạo (ref: book-file-storage.md).

---

## 6. Implementation Status

| # | Task | Status |
| :--- | :--- | :--- |
| 1 | BookCategory model | ⬜ Pending |
| 2 | Book model (mở rộng slug, category, cover, description, is_free, final_exam, v.v.) | ⬜ Pending |
| 3 | BookChapter model + migrations | ⬜ Pending |
| 4 | UserBookPurchase (pdf_ready, pdf_folder_path) – optional | ⬜ Pending |
| 5 | UserChapterProgress – optional | ⬜ Pending |
| 6 | API categories, list, detail, chapter content, watermark-config | ⬜ Pending |
| 7 | Admin Book/Chapter/Category + bulk import | ⬜ Pending |
| 8 | Celery task PDF watermark (optional) | ⬜ Pending |

---
*Last updated: 2026-02-20*
