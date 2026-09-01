# Database Design - Feng Shui Learning Platform

## Document Information
- **Project**: Thiên Thư - Feng Shui Learning Platform  
- **Version**: 1.0
- **Last Updated**: 2026-02-16

---

## Entity Relationship Overview

### Dual ID Strategy (Security & Performance)
The system adopts a **Dual ID Pattern** for all database tables:
1.  **Private ID (`id`)**: 
    - Type: Auto-incrementing Integer (`SERIAL`).
    - Use: Internal database relations (Foreign Keys), indexing, and Admin access.
    - Benefit: Faster JOIN operations and smaller index sizes.
2.  **Public ID (`uuid`)**:
    - Type: `UUID` (v4).
    - Use: External API access, frontend routing, and public links.
    - Benefit: Prevents ID enumeration attacks and hides database size/growth.

---


```mermaid
erDiagram
    User ||--o{ UserDevice : has
    User ||--o{ UserBookPurchase : purchases
    User ||--o{ UserCoursePurchase : purchases
    User ||--o{ Comment : writes
    
    BookCategory ||--o{ Book : contains
    Book ||--o{ BookChapter : has
    Book ||--o? Exam : "optional final exam"
    Book ||--o{ UserBookPurchase : purchased_by
    User ||--o{ UserChapterProgress : tracks
    BookChapter ||--o{ UserChapterProgress : tracked_by
    
    VideoCategory ||--o{ VideoCourse : contains
    VideoCourse ||--o{ VideoLesson : has
    VideoCourse ||--o? Exam : "optional final exam"
    VideoLesson ||--o{ VideoQuiz : has
    VideoCourse ||--o{ UserCoursePurchase : purchased_by
    User ||--o{ UserLessonProgress : tracks
    VideoLesson ||--o{ UserLessonProgress : tracked_by
    
    PracticeModule ||--o{ Exam : contains
    Exam ||--o{ PracticeQuestion : has
    Exam ||--o{ UserExamProgress : tracks
    User ||--o{ UserExamProgress : tracked_by
```

---

## Core Tables

### Users & Authentication

#### `users_user`
```sql
CREATE TABLE users_user (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(), -- Public ID
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(128) NOT NULL,
    user_type VARCHAR(10) DEFAULT 'FREE',
    subscription_end_date TIMESTAMP,
    bound_device_id VARCHAR(255) UNIQUE,
    last_device_reset TIMESTAMP,
    is_device_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_uuid ON users_user(uuid);
CREATE INDEX idx_user_type ON users_user(user_type);
```

#### `users_userdevice`
```sql
CREATE TABLE users_userdevice (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users_user(id),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_type VARCHAR(10) NOT NULL,
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_userdevice_uuid ON users_userdevice(uuid);
```

> **Web only since feature-34.** Mobile handsets live in `users_mobiledevice`
> below, so `user.devices` in the ORM means "web devices" and nothing else.
> `is_primary_bound` is a dead column, dropped in the follow-up cleanup commit.

#### `users_mobiledevice`
```sql
CREATE TABLE users_mobiledevice (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL,
    user_id BIGINT REFERENCES users_user(id) ON DELETE CASCADE,

    -- Permanent public id of the slot, shown to support and in the app.
    client_code VARCHAR(16) UNIQUE NOT NULL,     -- MC-7F3A2B91
    -- One-time secret the user types to claim the slot. Stored in plaintext on
    -- purpose: staff read it out over Zalo/phone (no automated email).
    pairing_code VARCHAR(20) UNIQUE NOT NULL,    -- TT-4KM-9X7 (feature-38)

    device_id VARCHAR(255),                      -- NULL until claimed
    hardware_hash VARCHAR(64),                   -- SHA-256(ANDROID_ID | IDFV)
    device_type VARCHAR(10),                     -- IOS | ANDROID
    device_name VARCHAR(255), device_model VARCHAR(128),
    os_version VARCHAR(64), app_version VARCHAR(32),

    status VARCHAR(10) NOT NULL,                 -- UNCLAIMED|ACTIVE|REVOKED|EXPIRED
    revoked_reason VARCHAR(20),                  -- ADMIN_UNBIND | MOBILE_DISABLED
    issued_by_id BIGINT REFERENCES users_user(id) ON DELETE SET NULL,
    issued_reason VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,               -- deadline to claim
    claimed_at TIMESTAMP, claim_ip INET, claim_attempts INTEGER NOT NULL DEFAULT 0,

    last_ip INET, bound_at TIMESTAMP, revoked_at TIMESTAMP, last_active TIMESTAMP,
    geo_city VARCHAR(100), geo_region VARCHAR(100),
    geo_country_code CHAR(2), geo_fetched_at TIMESTAMP,
    created_at TIMESTAMP, updated_at TIMESTAMP
);

-- Scoped to the occupying statuses, not just "not null". A revoked slot keeps
-- the handset's identifiers, so the same phone taking a fresh slot would
-- otherwise collide with its own history.
CREATE UNIQUE INDEX uniq_mobile_device_id_per_user ON users_mobiledevice(user_id, device_id)
    WHERE device_id IS NOT NULL AND status IN ('UNCLAIMED', 'ACTIVE');
CREATE UNIQUE INDEX uniq_mobile_hardware_per_user ON users_mobiledevice(user_id, hardware_hash)
    WHERE hardware_hash IS NOT NULL AND status IN ('UNCLAIMED', 'ACTIVE');

CREATE INDEX idx_mobiledevice_user_status ON users_mobiledevice(user_id, status);
CREATE INDEX idx_mobiledevice_expiry ON users_mobiledevice(status, expires_at);
```

> The quota is `users_user.mobile_max_devices` counted over the same two
> occupying statuses. No index can express "at most N rows", so it is enforced
> with a `SELECT ... FOR UPDATE` on the user row when staff allocate a slot.

#### `admin_auditlog`
```sql
CREATE TABLE admin_auditlog (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    staff_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
    target_user_id INTEGER REFERENCES users_user(id) ON DELETE CASCADE,
    action_category VARCHAR(50) NOT NULL, -- CURRENCY, VIP, DEVICE, etc.
    action_detail VARCHAR(255),
    change_log JSONB, -- {"before": ..., "after": ...}
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auditlog_staff ON admin_auditlog(staff_id);
CREATE INDEX idx_auditlog_target ON admin_auditlog(target_user_id);
CREATE INDEX idx_auditlog_uuid ON admin_auditlog(uuid);
```

#### `notifications_emaillog`
```sql
CREATE TABLE notifications_emaillog (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(100),
    status VARCHAR(10) NOT NULL, -- PENDING, SENT, FAILED
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_emaillog_recipient ON notifications_emaillog(recipient);
CREATE INDEX idx_emaillog_status ON notifications_emaillog(status);
```

#### `notifications_emailquota`
```sql
CREATE TABLE notifications_emailquota (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER NOT NULL DEFAULT 0
);
```
```

---

### Books Module

#### `books_book`
```sql
CREATE TABLE books_book (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    category_id INTEGER REFERENCES books_bookcategory(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    author VARCHAR(255),
    cover_image VARCHAR(255),
    description TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    is_new_release BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2) DEFAULT 0,
    price_linh_thach INTEGER DEFAULT 0,
    demo_content TEXT,
    table_of_contents JSONB,
    final_exam_id INTEGER REFERENCES exams_exam(id) ON DELETE SET NULL,
    published_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_book_uuid ON books_book(uuid);

CREATE INDEX idx_book_category ON books_book(category_id);
CREATE INDEX idx_book_slug ON books_book(slug);
```

#### `books_bookchapter`
```sql
CREATE TABLE books_bookchapter (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    book_id INTEGER REFERENCES books_book(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    page_count INTEGER,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(book_id, "order"),
    UNIQUE(book_id, slug)
);

CREATE INDEX idx_bookchapter_book ON books_bookchapter(book_id, "order");
CREATE INDEX idx_bookchapter_filepath ON books_bookchapter(file_path);
```

#### `books_userbookpurchase`
```sql
CREATE TABLE books_userbookpurchase (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users_user(id),
    book_id INTEGER REFERENCES books_book(id),
    purchased_at TIMESTAMP DEFAULT NOW(),
    transaction_id VARCHAR(255) UNIQUE, -- Internal UUID reference
    UNIQUE(user_id, book_id)
);

CREATE INDEX idx_userbookpurchase_user ON books_userbookpurchase(user_id);
CREATE INDEX idx_userbookpurchase_book ON books_userbookpurchase(book_id);
```

#### `books_userchapterprogress`
```sql
CREATE TABLE books_userchapterprogress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_user(id),
    chapter_id INTEGER REFERENCES books_bookchapter(id),
    completed BOOLEAN DEFAULT FALSE,
    last_read TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, chapter_id)
);

CREATE INDEX idx_userchapterprogress_user ON books_userchapterprogress(user_id);
CREATE INDEX idx_userchapterprogress_completed ON books_userchapterprogress(completed);
```

---

### Videos Module (Course-Based Structure)

#### `videos_videocourse`
```sql
CREATE TABLE videos_videocourse (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    category_id INTEGER REFERENCES videos_videocategory(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    instructor VARCHAR(255),
    cover_image VARCHAR(255),
    trailer_url VARCHAR(500),
    is_free BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2) DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    level VARCHAR(20), -- BEGINNER, INTERMEDIATE, ADVANCED
    final_exam_id INTEGER REFERENCES exams_exam(id) ON DELETE SET NULL,
    published_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videocourse_category ON videos_videocourse(category_id);
CREATE INDEX idx_videocourse_slug ON videos_videocourse(slug);
CREATE INDEX idx_videocourse_published ON videos_videocourse(published_date DESC);
```

#### `videos_videolesson`
```sql
CREATE TABLE videos_videolesson (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    course_id INTEGER REFERENCES videos_videocourse(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL,
    video_url VARCHAR(500),
    video_id VARCHAR(255),
    duration_seconds INTEGER,
    transcript TEXT,
    summary TEXT,
    slide_url VARCHAR(500),
    mindmap_data JSONB,
    thumbnail VARCHAR(255),
    is_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, "order"),
    UNIQUE(course_id, slug)
);

CREATE INDEX idx_videolesson_course ON videos_videolesson(course_id, "order");
```

#### `videos_videoquiz`
```sql
CREATE TABLE videos_videoquiz (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES videos_videolesson(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    explanation TEXT,
    "order" INTEGER NOT NULL
);

CREATE INDEX idx_videoquiz_lesson ON videos_videoquiz(lesson_id, "order");
```

#### `videos_usercoursepurchase`
```sql
CREATE TABLE videos_usercoursepurchase (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_user(id),
    course_id INTEGER REFERENCES videos_videocourse(id),
    purchased_at TIMESTAMP DEFAULT NOW(),
    transaction_id VARCHAR(255) UNIQUE, -- Internal UUID reference
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_usercoursepurchase_user ON videos_usercoursepurchase(user_id);
CREATE INDEX idx_usercoursepurchase_course ON videos_usercoursepurchase(course_id);
```

#### `videos_userlessonprogress`
```sql
CREATE TABLE videos_userlessonprogress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_user(id),
    lesson_id INTEGER REFERENCES videos_videolesson(id),
    progress_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    last_watched TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_userlessonprogress_user ON videos_userlessonprogress(user_id);
CREATE INDEX idx_userlessonprogress_completed ON videos_userlessonprogress(completed);
```

---

---

### Exams & Practice Module

#### `exams_exam`
```sql
CREATE TABLE exams_exam (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    module_id INTEGER REFERENCES practice_practicemodule(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER,
    passing_score INTEGER DEFAULT 70,
    exam_type VARCHAR(20) DEFAULT 'PRACTICE', -- FINAL_EXAM, PRACTICE, QUIZ
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `exams_practicequestion`
```sql
CREATE TABLE exams_practicequestion (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams_exam(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB, -- [{id: 'a', text: '...'}, ...]
    correct_answer VARCHAR(50),
    explanation TEXT,
    difficulty VARCHAR(10), -- EASY, MEDIUM, HARD
    points INTEGER DEFAULT 10,
    "order" INTEGER
);
```

#### `exams_userexamprogress`
```sql
CREATE TABLE exams_userexamprogress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_user(id),
    exam_id INTEGER REFERENCES exams_exam(id),
    score INTEGER DEFAULT 0,
    is_passed BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exam_id)
);
```

#### `practice_flashcard`
```sql
CREATE TABLE practice_flashcard (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES practice_practicemodule(id),
    front TEXT,
    back TEXT,
    image VARCHAR(255),
    difficulty VARCHAR(10),
    "order" INTEGER
);
```

---

#### `wallet_wallet`
```sql
CREATE TABLE wallet_wallet (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users_user(id) UNIQUE,
    balance INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_wallet_uuid ON wallet_wallet(uuid);
```

#### `wallet_voucher`
```sql
CREATE TABLE wallet_voucher (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    value INTEGER NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by_id INTEGER REFERENCES users_user(id),
    used_at TIMESTAMP,
    expiry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_voucher_uuid ON wallet_voucher(uuid);
```

---

## Query Examples

### Get User's Purchased Books
```sql
SELECT b.* FROM books_book b
INNER JOIN books_userbookpurchase ubp ON b.id = ubp.book_id
WHERE ubp.user_id = :user_id;
```

### Check Chapter Access Permission
```sql
SELECT bc.*, 
    EXISTS(SELECT 1 FROM books_userbookpurchase 
           WHERE user_id = :user_id AND book_id = bc.book_id) as has_access
FROM books_bookchapter bc
WHERE bc.book_id = :book_id AND bc."order" = :chapter_order;
```

---

## Backup Strategy

```bash
# Daily backup
pg_dump -U postgres fengshui_db > backup_$(date +%Y%m%d).sql

# Retention: 30 days
```

See full schema details in Django models.
