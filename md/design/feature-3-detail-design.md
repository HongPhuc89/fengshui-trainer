# Feature 3 Detailed Design: Videos Module

## Document Information
- **Feature**: Videos Module (Backend) – Course-based structure
- **Reference**: TASKS.md Phase 1 – Feature 3, database-design.md, video-course-structure.md
- **Last Updated**: 2026-02-20

---

## 1. Core Data Structures & Models

### 1.1 VideoCategory
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | CharField(255) | Tên danh mục. |
| `slug` | SlugField(unique=True) | URL-safe identifier. |

### 1.2 VideoCourse (extends BaseModel)
Đã có `VideoCourse` cơ bản (title, price_lt). Mở rộng:

| Field | Type | Description |
| :--- | :--- | :--- |
| `category` | FK(VideoCategory, null=True) | Danh mục. |
| `title` | CharField(255) | Tên khóa học. |
| `slug` | SlugField(unique=True) | URL. |
| `description` | TextField(blank=True) | Mô tả. |
| `instructor` | CharField(255, blank=True) | Giảng viên. |
| `cover_image` | ImageField/CharField(255, blank=True) | Ảnh bìa. |
| `trailer_url` | CharField(500, blank=True) | Link trailer (free). |
| `is_free` | BooleanField(default=False) | Khóa miễn phí. |
| `price_lt` | PositiveIntegerField | Giá Linh Thạch. |
| `total_duration_seconds` | PositiveIntegerField(default=0) | Tổng thời lượng. |
| `total_lessons` | PositiveIntegerField(default=0) | Số bài học. |
| `level` | CharField(20) | BEGINNER, INTERMEDIATE, ADVANCED. |
| `final_exam` | FK(Exam, null=True) | Bài thi cuối (optional). |
| `published_date` | DateField(null=True) | Ngày xuất bản. |

### 1.3 VideoLesson (extends BaseModel)
| Field | Type | Description |
| :--- | :--- | :--- |
| `course` | FK(VideoCourse, CASCADE) | Khóa học. |
| `title` | CharField(255) | Tên bài. |
| `slug` | CharField(255) | Slug trong khóa. |
| `order` | PositiveIntegerField | Thứ tự. |
| `video_url` | CharField(500, blank=True) | URL video (Bunny/local). |
| `video_id` | CharField(255, blank=True) | ID bên Bunny Stream. |
| `duration_seconds` | PositiveIntegerField(null=True) | Thời lượng. |
| `transcript` | TextField(blank=True) | Transcript (AI). |
| `summary` | TextField(blank=True) | Tóm tắt (AI). |
| `slide_url` | CharField(500, blank=True) | Link slides. |
| `mindmap_data` | JSONField(null=True) | Dữ liệu mindmap. |
| `thumbnail` | CharField(255, blank=True) | Ảnh thumbnail. |
| `is_free` | BooleanField(default=False) | Bài xem thử. |
| Meta | unique_together | (course, order), (course, slug). |

### 1.4 VideoQuiz (optional)
| Field | Type | Description |
| :--- | :--- | :--- |
| `lesson` | FK(VideoLesson, CASCADE) | Bài học. |
| `question_text` | TextField | Câu hỏi. |
| `options` | JSONField | [{id, text}, ...]. |
| `correct_answer` | CharField(50) | Đáp án đúng. |
| `explanation` | TextField(blank=True) | Giải thích. |
| `order` | PositiveIntegerField | Thứ tự câu. |

### 1.5 UserVideoPurchase
Đã có (user, video) với `video` FK tới VideoCourse. Giữ nguyên; tên bảng có thể là UserCoursePurchase (user, course).

### 1.6 UserLessonProgress (UserVideoProgress)
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | FK(User) | User. |
| `lesson` | FK(VideoLesson) | Bài học. |
| `progress_seconds` | PositiveIntegerField(default=0) | Giây đã xem. |
| `completed` | BooleanField(default=False) | Đã xem xong. |
| `last_watched` | DateTimeField(auto_now=True) | Lần xem cuối. |
| Meta | unique_together | (user, lesson). |

---

## 2. Business Logic

### 2.1 Permission: Lesson Access
- **VIP**: Full access (nếu khóa nằm trong gói VIP).
- **Purchased**: UserVideoPurchase (course) tồn tại → full access.
- **Free preview**: Lesson.is_free → ai cũng xem được.
- **Khác**: 403 hoặc redirect mua/VIP.

### 2.2 Video URL (Bunny Stream & Local Fallback)
- **Production**: Signed URL từ Bunny Stream (library_id, video_id, token auth).
- **Development**: Khi `DEBUG=True`, có thể serve file local hoặc URL test.
- Service: `VideoStreamingService.get_lesson_url(lesson, user)` → trả URL (signed hoặc local).

### 2.3 Progress
- POST `/api/videos/{slug}/lessons/{lesson_slug}/progress/` body `{ "progress_seconds": N }`.
- Cập nhật UserLessonProgress; nếu progress_seconds >= duration_seconds thì set completed=True.
- GET progress tổng khóa: tổng hợp từ UserLessonProgress của user trong khóa.

---

## 3. API Endpoints

| Endpoint | Method | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `/api/videos/categories/` | GET | No | List danh mục. |
| `/api/videos/` | GET | No | List khóa học (filter: category, level, search). |
| `/api/videos/{slug}/` | GET | No | Chi tiết khóa + danh sách lessons (has_purchased nếu auth). |
| `/api/videos/{slug}/lessons/{lesson_slug}/` | GET | Yes | Chi tiết bài + video URL (signed/local). |
| `/api/videos/{slug}/lessons/{lesson_slug}/progress/` | POST | Yes | Cập nhật progress_seconds. |
| `/api/videos/{slug}/progress/` | GET | Yes | Tổng tiến độ khóa (%). |

Mua khóa: dùng `POST /api/payments/purchase-video/` (Feature 7) với video_id = course.public_id.

---

## 4. Admin

- VideoCategory: CRUD.
- VideoCourse: list_display (title, category, price_lt, total_lessons, level), inline VideoLesson.
- VideoLesson: inline hoặc tab; video_url, video_id, order, is_free.
- VideoQuiz: inline trong Lesson (optional).
- UserVideoPurchase / UserLessonProgress: list, filter theo user/course.

---

## 5. Bunny Stream Integration

- Cấu hình: Library ID, API Key, Pull Zone (env).
- Upload workflow: Admin upload file → push lên Bunny (hoặc manual); lưu video_id vào VideoLesson.
- Signed URL: Token auth, expiry (e.g. 1h), có thể geo-blocking (config Bunny dashboard).

---

## 6. Implementation Status

| # | Task | Status |
| :--- | :--- | :--- |
| 1 | VideoCategory model | ⬜ Pending |
| 2 | VideoCourse mở rộng (slug, category, trailer, level, final_exam, v.v.) | ⬜ Pending |
| 3 | VideoLesson model + migrations | ⬜ Pending |
| 4 | VideoQuiz model (optional) | ⬜ Pending |
| 5 | UserLessonProgress model | ⬜ Pending |
| 6 | API categories, list, detail, lesson URL, progress | ⬜ Pending |
| 7 | VideoStreamingService (Bunny + local fallback) | ⬜ Pending |
| 8 | Admin + Bunny upload workflow | ⬜ Pending |

---
*Last updated: 2026-02-20*
