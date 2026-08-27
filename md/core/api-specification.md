# API Specification - Feng Shui Learning Platform

## Document Information
- **Project**: Thiên Thư API
- **Version**: 1.0
- **Base URL**: `https://api.fengshui-trainer.com/api`
- **Authentication**: JWT Bearer Token

---

## Authentication Endpoints

### POST `/auth/register/`
Register new user account.

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "phone_number": "string",
  "password": "string",
  "device_id": "string",
  "device_type": "MOBILE|WEB",
  "device_name": "string"
}
```

**Response 201:**
```json
{
  "user": {
    "id": 1,
    "username": "user123",
    "user_type": "FREE"
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

---

### POST `/auth/login/`
Login with credentials.

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "device_id": "string",
  "device_type": "MOBILE|WEB"
}
```

**Response 200:**
```json
{
  "user": {
    "id": 1,
    "username": "user123",
    "user_type": "VIP",
    "subscription_end_date": "2026-12-31T23:59:59Z"
  },
  "tokens": {
    "access": "...",
    "refresh": "..."
  }
}
```

**Error 400 - Device Limit:**
```json
{
  "error": "DEVICE_LIMIT_REACHED",
  "message": "Tài khoản đã đăng nhập trên thiết bị khác",
  "active_device": {
    "device_name": "iPhone 13",
    "last_active": "2026-02-16T10:30:00Z"
  }
}
```

---

## Books Endpoints

### GET `/books/`
List all books with filtering.

**Query Parameters:**
- `category`: Filter by category slug
- `is_new_release`: Boolean
- `is_free`: Boolean  
- `search`: Search in title/author

**Response 200:**
```json
{
  "count": 50,
  "next": "...",
  "results": [
    {
      "id": 1,
      "title": "Kỳ Môn Độn Giáp Cơ Bản",
      "slug": "ky-mon-don-giap-co-ban",
      "category": {"id": 1, "name": "Kỳ Môn"},
      "author": "Tác giả",
      "cover_image": "https://...",
      "is_free": false,
      "price": "299000.00",
      "has_purchased": false
    }
  ]
}
```

---

### GET `/books/{slug}/`
Get book details with chapters.

**Response 200:**
```json
{
  "id": 1,
  "title": "Kỳ Môn Độn Giáp Cơ Bản",
  "slug": "ky-mon-don-giap-co-ban",
  "category": {"id": 1, "name": "Kỳ Môn"},
  "author": "Tác giả",
  "cover_image": "https://...",
  "description": "Mô tả sách...",
  "is_free": false,
  "price": "299000.00",
  "has_purchased": true,
  "published_date": "2026-01-15",
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
      "title": "Chương 2: Bát Quái cơ bản",
      "order": 2,
      "is_demo": false
    }
  ],
  "demo_content": "<p>Nội dung demo...</p>",
  "progress": {
    "last_read_chapter": {
      "id": 5,
      "title": "Chương 5: ...",
      "order": 5
    },
    "completed_chapters": 4,
    "total_chapters": 20
  },
  "final_exam": {
    "id": 10,
    "title": "Thi cuối khóa Kỳ Môn Cơ Bản",
    "slug": "thi-cuoi-khoa-ky-mon-co-ban"
  }
}
```

---

### GET `/books/{slug}/chapters/{order}/`
Get chapter content.

**Response 200:**
```json
{
  "id": 1,
  "book": {
    "id": 1,
    "title": "Kỳ Môn Độn Giáp Cơ Bản",
    "slug": "ky-mon-don-giap-co-ban"
  },
  "title": "Chương 1: Giới thiệu",
  "slug": "gioi-thieu",
  "order": 1,
  "file_url": "https://api.fengshui-trainer.com/media/books/ky-mon-don-giap-co-ban/chapters/01-gioi-thieu.pdf?token=...&expires=...",
  "file_size": 2458624,
  "page_count": 25,
  "is_demo": false,
  "watermark": {
    "user_name": "Nguyễn Văn A",
    "phone_number": "0901234567",
    "applied": true
  },
  "navigation": {
    "previous_chapter": null,
    "next_chapter": {
      "id": 2,
      "title": "Chương 2: Bát Quái cơ bản",
      "slug": "bat-quai-co-ban",
      "order": 2
    }
  }
}
```

**Error 403:**
```json
{
  "error": "PERMISSION_DENIED",
  "message": "Bạn cần mua sách để xem nội dung này"
}
```

---

## Video Courses Endpoints

### GET `/courses/`
List video courses.

**Query Parameters:**
- `category`: Filter by category slug
- `level`: Filter by level (BEGINNER, INTERMEDIATE, ADVANCED)
- `search`: Search in title/instructor

**Response 200:**
```json
{
  "count": 20,
  "results": [
    {
      "id": 1,
      "title": "Kỳ Môn Độn Giáp Toàn Tập",
      "slug": "ky-mon-don-giap-toan-tap",
      "category": {"id": 1, "name": "Kỳ Môn"},
      "instructor": "Thầy Nguyễn Văn A",
      "cover_image": "https://...",
      "trailer_url": "https://...",
      "total_lessons": 45,
      "total_duration_seconds": 162000,
      "level": "BEGINNER",
      "price": "1990000.00",
      "is_free": false,
      "has_purchased": false,
      "progress": {
        "completed_lessons": 0,
        "total_lessons": 45,
        "percentage": 0
      }
    }
  ]
}
```

---

### GET `/courses/{slug}/`
Get course details with lessons list.

**Response 200:**
```json
{
  "id": 1,
  "title": "Kỳ Môn Độn Giáp Toàn Tập",
  "slug": "ky-mon-don-giap-toan-tap",
  "description": "Khóa học toàn diện về Kỳ Môn Độn Giáp...",
  "instructor": "Thầy Nguyễn Văn A",
  "category": {"id": 1, "name": "Kỳ Môn"},
  "cover_image": "https://...",
  "trailer_url": "https://...",
  "level": "BEGINNER",
  "total_lessons": 45,
  "total_duration_seconds": 162000,
  "price": "1990000.00",
  "is_free": false,
  "has_purchased": true,
  "published_date": "2026-01-15",
  "lessons": [
    {
      "id": 1,
      "title": "Bài 1: Giới thiệu Kỳ Môn",
      "slug": "bai-1-gioi-thieu",
      "order": 1,
      "duration_seconds": 3600,
      "thumbnail": "https://...",
      "is_free": true,
      "completed": false
    },
    {
      "id": 2,
      "title": "Bài 2: Cơ bản về Bát Quái",
      "slug": "bai-2-co-ban-bat-quai",
      "order": 2,
      "duration_seconds": 4200,
      "thumbnail": "https://...",
      "is_free": false,
      "completed": false
    }
  ],
  "progress": {
    "completed_lessons": 5,
    "total_lessons": 45,
    "percentage": 11,
    "last_watched_lesson": {
      "id": 5,
      "title": "Bài 5: ...",
      "order": 5
    }
  },
  "final_exam": {
    "id": 11,
    "title": "Thi cuối khóa Kỳ Môn Toàn Tập",
    "slug": "thi-cuoi-khoa-ky-mon-toan-tap"
  }
}
```

---

### GET `/courses/{course_slug}/lessons/{lesson_slug}/`
Get lesson details with signed video URL.

**Response 200:**
```json
{
  "id": 2,
  "course": {
    "id": 1,
    "title": "Kỳ Môn Độn Giáp Toàn Tập",
    "slug": "ky-mon-don-giap-toan-tap"
  },
  "title": "Bài 2: Cơ bản về Bát Quái",
  "slug": "bai-2-co-ban-bat-quai",
  "order": 2,
  "description": "Trong bài học này...",
  "video_url": "https://cdn.bunny.net/...?token=...&expires=...",
  "duration_seconds": 4200,
  "transcript": "Full transcript...",
  "summary": "AI-generated summary...",
  "slide_url": "https://.../slides.pdf",
  "mindmap_data": {
    "nodes": [...],
    "edges": [...]
  },
  "thumbnail": "https://...",
  "quizzes": [
    {
      "id": 1,
      "question": "Bát Quái có bao nhiêu quẻ?",
      "options": [
        {"id": "a", "text": "6"},
        {"id": "b", "text": "8"},
        {"id": "c", "text": "10"}
      ],
      "explanation": "Bát Quái có 8 quẻ cơ bản..."
    }
  ],
  "watermark": {
    "user_name": "Nguyễn Văn B",
    "phone_number": "0901234567"
  },
  "progress": {
    "progress_seconds": 1200,
    "completed": false,
    "percentage": 28
  },
  "navigation": {
    "previous_lesson": {
      "id": 1,
      "title": "Bài 1: Giới thiệu Kỳ Môn",
      "slug": "bai-1-gioi-thieu"
    },
    "next_lesson": {
      "id": 3,
      "title": "Bài 3: Thiên Can Địa Chi",
      "slug": "bai-3-thien-can-dia-chi"
    }
  }
}
```

**Error 403 - Not Purchased:**
```json
{
  "error": "PERMISSION_DENIED",
  "message": "Bạn cần mua khóa học để xem bài học này"
}
```

---

### POST `/courses/{course_slug}/lessons/{lesson_slug}/progress/`
Update lesson watch progress.

**Request:**
```json
{
  "progress_seconds": 1500,
  "completed": false
}
```

**Response 200:**
```json
{
  "progress_seconds": 1500,
  "completed": false,
  "percentage": 35,
  "course_progress": {
    "completed_lessons": 5,
    "total_lessons": 45,
    "percentage": 11
  }
}
```

---

### GET `/courses/{course_slug}/progress/`
Get overall course progress.

**Response 200:**
```json
{
  "course_id": 1,
  "completed_lessons": 5,
  "total_lessons": 45,
  "percentage": 11,
  "total_watch_time_seconds": 18000,
  "lessons_progress": [
    {
      "lesson_id": 1,
      "lesson_title": "Bài 1: Giới thiệu",
      "order": 1,
      "completed": true,
      "progress_seconds": 3600,
      "duration_seconds": 3600,
      "last_watched": "2026-02-15T10:30:00Z"
    },
    {
      "lesson_id": 2,
      "lesson_title": "Bài 2: Cơ bản về Bát Quái",
      "order": 2,
      "completed": false,
      "progress_seconds": 1200,
      "duration_seconds": 4200,
      "last_watched": "2026-02-16T14:20:00Z"
    }
  ]
}
```

---

## Exams & Exams Endpoints

### GET `/exams/{slug}/`
Get exam details (questions if authorized).

**Response 200:**
```json
{
  "id": 10,
  "title": "Thi cuối khóa Kỳ Môn Cơ Bản",
  "slug": "thi-cuoi-khoa-ky-mon-co-ban",
  "description": "Bài thi trắc nghiệm khách quan...",
  "time_limit_minutes": 45,
  "passing_score": 70,
  "exam_type": "FINAL_EXAM",
  "questions": [
    {
      "id": 1,
      "question_text": "Càn đại diện cho phương nào?",
      "options": [
        {"id": "a", "text": "Nam"},
        {"id": "b", "text": "Bắc"},
        {"id": "c", "text": "Tây Bắc"}
      ],
      "points": 10,
      "order": 1
    }
  ],
  "user_best_score": 85,
  "is_passed": true
}
```

---

### POST `/exams/{slug}/submit/`
Submit exam answers.

**Request:**
```json
{
  "answers": [
    {"question_id": 1, "answer": "c"},
    {"question_id": 2, "answer": "true"}
  ]
}
```

**Response 200:**
```json
{
  "score": 90,
  "total_points": 100,
  "passed": true,
  "results": [
    {
      "question_id": 1,
      "is_correct": true,
      "correct_answer": "c",
      "explanation": "Càn là quẻ ở phương Tây Bắc."
    }
  ]
}
```

---

## Practice Endpoints (Tower Mode)

### GET `/practice/modules/`
List practice modules.

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Kỳ Môn",
    "slug": "ky-mon",
    "total_levels": 10,
    "user_progress": {
      "completed_chapters": 5,
      "total_chapters": 50,
      "current_level": 3
    }
  }
]
```

---

### GET `/practice/modules/{slug}/chapters/`
List chapters with unlock status.

**Response 200:**
```json
[
  {
    "id": 1,
    "title": "Chương 1",
    "level": 1,
    "is_unlocked": true,
    "is_completed": true,
    "user_score": 85
  },
  {
    "id": 2,
    "title": "Chương 2",
    "is_unlocked": false,
    "unlock_requirement": {
      "chapter_id": 1,
      "required_score": 70
    }
  }
]
```

---

### GET `/practice/chapters/{id}/flashcards/`
Get flashcards for chapter.

**Response 200:**
```json
[
  {
    "id": 1,
    "front": "Question",
    "back": "Answer",
    "difficulty": "EASY",
    "user_mastery": 3,
    "next_review": "2026-02-20T10:00:00Z"
  }
]
```

---

### POST `/practice/flashcards/{id}/review/`
Submit flashcard review (SM-2 algorithm).

**Request:**
```json
{
  "quality": 4
}
```

**Response 200:**
```json
{
  "mastery_level": 4,
  "next_review": "2026-02-25T10:00:00Z"
}
```

---

### POST `/practice/chapters/{id}/submit-test/`
Submit practice test.

**Request:**
```json
{
  "answers": [
    {"question_id": 1, "answer": "a"},
    {"question_id": 2, "answer": "true"}
  ]
}
```

**Response 200:**
```json
{
  "score": 85,
  "total_points": 100,
  "passed": true,
  "results": [
    {
      "question_id": 1,
      "is_correct": true,
      "explanation": "..."
    }
  ],
  "next_chapter_unlocked": true
}
```

---

## Comments Endpoints

### GET `/comments/`
Get comments for content.

**Query Parameters:**
- `content_type`: "book" or "video"
- `object_id`: Content ID

**Response 200:**
```json
[
  {
    "id": 1,
    "user": {"username": "user1"},
    "text": "Comment text",
    "created_at": "2026-02-16T10:00:00Z",
    "replies": [
      {
        "user": {"username": "admin", "is_admin": true},
        "text": "Reply text"
      }
    ]
  }
]
```

---

### POST `/comments/`
Create comment (requires purchase).

**Request:**
```json
{
  "content_type": "book",
  "object_id": 1,
  "text": "My comment"
}
```

**Error 403:**
```json
{
  "error": "PERMISSION_DENIED",
  "message": "Bạn cần mua tài liệu để comment"
}
```

---

## Payment Endpoints

### POST `/payments/create-order/`
Create payment order.

**Request:**
```json
{
  "content_type": "book|course",
  "object_id": 1,
  "payment_method": "VNPAY"
}
```

**Response 200:**
```json
{
  "order_id": "uuid",
  "payment_url": "https://vnpay.vn/...",
  "amount": "299000.00",
  "expires_at": "2026-02-16T22:00:00Z"
}
```

---

### POST `/payments/verify-iap/`
Verify in-app purchase.

**Request:**
```json
{
  "platform": "APPLE",
  "receipt_data": "base64...",
  "product_id": "com.fengshui.book.1",
  "transaction_id": "..."
}
```

**Response 200:**
```json
{
  "success": true,
  "purchase_id": 1,
  "content_unlocked": true
}
```

---

## Notifications Endpoints

### GET `/notifications/`
Get user notifications.

**Response 200:**
```json
{
  "unread_count": 3,
  "results": [
    {
      "id": 1,
      "notification_type": "NEW_BOOK",
      "title": "Sách mới",
      "message": "...",
      "link": "/books/new-book",
      "is_read": false,
      "created_at": "2026-02-16T10:00:00Z"
    }
  ]
}
```

---

### POST `/notifications/{id}/mark-read/`
Mark notification as read.

**Response 200:**
```json
{
  "is_read": true
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "VALIDATION_ERROR",
  "details": {
    "email": ["This field is required"]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "error": "PERMISSION_DENIED",
  "message": "You don't have permission"
}
```

### 404 Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "retry_after": 60
}
```

---

## Rate Limiting

| User Type | Rate Limit |
|-----------|------------|
| Anonymous | 100/hour |
| Authenticated | 1000/hour |
| VIP | 5000/hour |

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "count": 100,
  "next": "https://api.../books/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## Filtering & Sorting

**Common filters:**
- `search`: Full-text search
- `ordering`: Sort field (prefix `-` for descending)

**Example:**
```
GET /api/books/?search=kỳ môn&ordering=-published_date
```

---

## Mobile Auth (feature-34)

Mobile has its own login. One account binds to exactly one handset, and moving to
another handset requires an activation code issued by staff — there is no
self-service path. Web keeps using `/auth/login/` unchanged.

### POST `/auth/mobile/login/`

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "device_id": "string",
  "platform_os": "ios|android",
  "hardware_hash": "sha256 hex, optional",
  "device_name": "string, optional",
  "device_model": "string, optional",
  "os_version": "string, optional",
  "app_version": "string, optional"
}
```

`hardware_hash` is SHA-256 of `Settings.Secure.ANDROID_ID` (Android) or
`identifierForVendor` (iOS). It lets a reinstalled app be recognised as the same
handset instead of a new one. Treated as a hint that *relaxes* the device check;
it never grants access on its own.

**Response 200:**
```json
{
  "user": { "...": "UserSerializer" },
  "access": "jwt",
  "refresh": "jwt",
  "client_code": "MC-7F3A2B91",
  "rebound": false
}
```

`rebound: true` means the client id was lost (app reinstall) but the hardware
anchor matched, so the existing binding was kept.

**Response 400 — another handset holds the binding:**
```json
{
  "code": "ACTIVATION_REQUIRED",
  "detail": "Tài khoản đang liên kết với thiết bị khác (mã MC-7F3A2B91)...",
  "bound_device": {
    "client_code": "MC-7F3A2B91",
    "device_name": "iPhone 15 Pro",
    "last_active": "2026-08-26T09:12:44Z"
  },
  "support_email": "admin@huyenhoc.pro"
}
```

The payload deliberately does not reveal whether a code has already been issued.

---

### POST `/auth/mobile/activate/`

Redeem a staff-issued code so this handset becomes the account's device. Takes
credentials rather than a token: the user could not log in.

**Request:** same envelope as mobile login, plus `"activation_key": "TT-4KM9-X7QP-2N5R"`.

**Response 200:** same shape as mobile login. The previous handset is revoked and
its refresh tokens blacklisted.

**Response 400:**

| `code` | Meaning |
|---|---|
| `ACTIVATION_FAILED` | Wrong, expired, or already-spent code. `detail` carries the attempts remaining. Five wrong attempts revoke the code. |
| `ALREADY_BOUND` | This handset can already log in normally; the code is **not** consumed. |

---

### POST `/auth/refresh/`

**Response 200:**
```json
{ "access": "jwt", "refresh": "jwt" }
```

`refresh` is returned because `ROTATE_REFRESH_TOKENS` is on: the token sent in
the request is blacklisted, so the client must store the new one or the next
refresh fails.

Access tokens carry `device_id` and `platform` (`MOBILE` or `WEB`) claims. The
platform claim tells the authentication layer which device table to validate
against; both claims survive rotation.

---

### POST `/auth/register/`

`device_id`, `device_type` and `device_name` are no longer read. They were
validated and then discarded, and the `device_type` choices rejected the value
the mobile app sends. Clients may still send them; they are ignored.

---

### GET `/users/me/device-status/`

Adds `mobile_device` (or `null`), and `bound_device` now reports the bound mobile
handset instead of always being `null`:

```json
{
  "is_device_locked": false,
  "bound_device": { "device_id": "...", "device_type": "IOS", "device_name": "...", "last_active": "..." },
  "mobile_device": {
    "client_code": "MC-7F3A2B91",
    "device_name": "iPhone 15 Pro",
    "device_type": "IOS",
    "device_model": "iPhone16,1",
    "app_version": "1.4.2+31",
    "os_version": "iOS 17.4",
    "bound_at": "2026-08-01T10:20:30Z",
    "last_active": "2026-08-27T08:00:00Z"
  },
  "last_device_reset": "2026-01-01T00:00:00Z",
  "next_reset_available_at": null,
  "can_reset_now": false,
  "web_devices_count": 3,
  "web_devices_quota": 5
}
```

`can_reset_now` is permanently `false` and `next_reset_available_at` permanently
`null`: the 365-day self-reset was removed with the one-handset policy. The
fields remain so older clients keep parsing the payload. `/users/me/device-reset/`
never existed on the server and has been removed from the app.
