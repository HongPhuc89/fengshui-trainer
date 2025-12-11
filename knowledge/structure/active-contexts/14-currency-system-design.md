# 💰 Hệ Thống Ngân Lượng (Currency System) - Design Document

## 📋 Tổng Quan

Hệ thống Ngân Lượng cho phép:

- Admin tặng Ngân Lượng cho users
- Users dùng Ngân Lượng để unlock sách
- Chapter 3+ của mỗi sách bị khóa
- Unlock 1 lần cho toàn bộ sách

---

## 🗄️ Database Schema

### 1. Bảng `users` (Update)

```sql
ALTER TABLE users ADD COLUMN currency INTEGER DEFAULT 0 NOT NULL;
```

**Fields mới**:

- `currency`: Số Ngân Lượng hiện tại của user

**Ví dụ**:

```
id | email           | currency | experience_points
---|-----------------|----------|------------------
1  | user1@mail.com  | 150      | 5000
2  | user2@mail.com  | 0        | 1200
```

---

### 2. Bảng `books` (Update)

```sql
ALTER TABLE books ADD COLUMN unlock_price INTEGER DEFAULT 100 NOT NULL;
ALTER TABLE books ADD COLUMN free_chapters INTEGER DEFAULT 2 NOT NULL;
```

**Fields mới**:

- `unlock_price`: Giá để unlock toàn bộ sách (Ngân Lượng)
- `free_chapters`: Số chapter miễn phí (mặc định: 2)

**Ví dụ**:

```
id | title                  | unlock_price | free_chapters
---|------------------------|--------------|---------------
1  | Nhập Môn Phong Thủy    | 100          | 2
2  | Kinh Dịch Căn Bản      | 200          | 2
3  | Tử Vi Đầu Số           | 150          | 3
```

---

### 3. Bảng `currency_transactions` (New)

Lưu lịch sử giao dịch Ngân Lượng.

```sql
CREATE TABLE currency_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'admin_grant', 'book_unlock', 'refund'
  description TEXT,
  admin_id INTEGER REFERENCES users(id), -- Admin thực hiện (nếu có)
  book_id INTEGER REFERENCES books(id), -- Sách liên quan (nếu có)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_currency_transactions_user_id ON currency_transactions(user_id);
CREATE INDEX idx_currency_transactions_type ON currency_transactions(type);
CREATE INDEX idx_currency_transactions_created_at ON currency_transactions(created_at);
```

**Fields**:

- `user_id`: User nhận/trả Ngân Lượng
- `amount`: Số lượng (+/-)
- `type`: Loại giao dịch
  - `admin_grant`: Admin tặng
  - `book_unlock`: Unlock sách
  - `refund`: Hoàn tiền (nếu cần)
- `description`: Mô tả giao dịch
- `admin_id`: Admin thực hiện (nếu type = admin_grant)
- `book_id`: Sách liên quan (nếu type = book_unlock)

**Ví dụ**:

```
id | user_id | amount | type         | description           | admin_id | book_id
---|---------|--------|--------------|----------------------|----------|--------
1  | 5       | +200   | admin_grant  | Tặng thưởng tân thủ  | 1        | NULL
2  | 5       | -100   | book_unlock  | Unlock Nhập Môn PT   | NULL     | 1
3  | 7       | +500   | admin_grant  | Event tết            | 1        | NULL
```

---

### 4. Bảng `user_unlocked_books` (New)

Lưu sách mà user đã unlock.

```sql
CREATE TABLE user_unlocked_books (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

CREATE INDEX idx_user_unlocked_books_user_id ON user_unlocked_books(user_id);
CREATE INDEX idx_user_unlocked_books_book_id ON user_unlocked_books(book_id);
```

**Fields**:

- `user_id`: User đã unlock
- `book_id`: Sách đã unlock
- `unlocked_at`: Thời gian unlock

**Ví dụ**:

```
id | user_id | book_id | unlocked_at
---|---------|---------|------------------------
1  | 5       | 1       | 2025-12-10 10:30:00
2  | 5       | 3       | 2025-12-11 14:20:00
3  | 7       | 1       | 2025-12-09 08:15:00
```

---

## 🎯 Business Logic

### 1. Admin Tặng Ngân Lượng

**Flow**:

```
Admin chọn user
  ↓
Chọn mức tặng: 50/100/200/500/1000/2000
  ↓
Nhập mô tả (optional)
  ↓
Xác nhận
  ↓
System:
  - Cộng currency cho user
  - Tạo currency_transaction (type: admin_grant)
  ↓
Thông báo thành công
```

**Validation**:

- ✅ Chỉ admin mới được tặng
- ✅ Amount phải thuộc danh sách: [50, 100, 200, 500, 1000, 2000]
- ✅ User phải tồn tại và active

**API Endpoint**:

```typescript
POST /admin/currency/grant
Body: {
  user_id: number,
  amount: 50 | 100 | 200 | 500 | 1000 | 2000,
  description?: string
}
```

---

### 2. User Unlock Sách

**Flow**:

```
User vào sách
  ↓
Kiểm tra: Đã unlock chưa?
  ├─ Đã unlock → Cho phép đọc tất cả chapters
  └─ Chưa unlock
      ↓
      Kiểm tra chapter hiện tại
      ├─ Chapter 1-2 (free) → Cho phép đọc
      └─ Chapter 3+ → Hiển thị khóa
          ↓
          User click "Unlock Sách"
          ↓
          Hiển thị modal:
            - Giá: {book.unlock_price} Ngân Lượng
            - Số dư hiện tại: {user.currency}
            - Số dư sau unlock: {user.currency - book.unlock_price}
          ↓
          User xác nhận
          ↓
          System kiểm tra:
            - Đủ Ngân Lượng?
            - Chưa unlock trước đó?
          ↓
          Thực hiện:
            - Trừ currency của user
            - Tạo currency_transaction (type: book_unlock)
            - Tạo user_unlocked_books
          ↓
          Cho phép đọc tất cả chapters
```

**Validation**:

- ✅ User phải đăng nhập
- ✅ Sách phải tồn tại và published
- ✅ User chưa unlock sách này
- ✅ User có đủ Ngân Lượng
- ✅ Ngân Lượng >= book.unlock_price

**API Endpoint**:

```typescript
POST /books/:bookId/unlock
Response: {
  success: true,
  remaining_currency: number,
  unlocked_at: Date
}
```

---

### 3. Kiểm Tra Quyền Truy Cập Chapter

**Logic**:

```typescript
function canAccessChapter(userId, bookId, chapterOrder) {
  // 1. Kiểm tra đã unlock sách chưa
  const hasUnlocked = await checkUserUnlockedBook(userId, bookId);
  if (hasUnlocked) return true;

  // 2. Kiểm tra chapter có miễn phí không
  const book = await getBook(bookId);
  if (chapterOrder <= book.free_chapters) return true;

  // 3. Bị khóa
  return false;
}
```

**API Endpoint**:

```typescript
GET /books/:bookId/chapters/:chapterId/access
Response: {
  can_access: boolean,
  reason?: 'unlocked' | 'free_chapter' | 'locked',
  unlock_price?: number,
  user_currency?: number
}
```

---

## 📱 UI/UX Design

### 1. Admin Dashboard

#### Trang Quản Lý Ngân Lượng

**Layout**:

```
┌─────────────────────────────────────────┐
│ 💰 Quản Lý Ngân Lượng                  │
├─────────────────────────────────────────┤
│                                         │
│ [Tặng Ngân Lượng]                      │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ Lịch Sử Giao Dịch                 │  │
│ ├───────────────────────────────────┤  │
│ │ User      | Amount | Type | Date  │  │
│ │ user1     | +200   | Grant| 12/10│  │
│ │ user2     | -100   | Unlock|12/11│  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### Modal Tặng Ngân Lượng

```
┌─────────────────────────────────┐
│ Tặng Ngân Lượng                │
├─────────────────────────────────┤
│                                 │
│ Chọn User:                     │
│ [Dropdown: Select User]        │
│                                 │
│ Chọn Số Lượng:                 │
│ [50] [100] [200]               │
│ [500] [1000] [2000]            │
│                                 │
│ Mô Tả (Optional):              │
│ [Text Area]                    │
│                                 │
│ [Hủy]  [Xác Nhận Tặng]        │
└─────────────────────────────────┘
```

---

### 2. Mobile App

#### Màn Hình Sách (Book Detail)

**Khi chưa unlock**:

```
┌─────────────────────────────────┐
│ 📚 Nhập Môn Phong Thủy         │
│ Giá unlock: 100 💰             │
├─────────────────────────────────┤
│ Chapters:                       │
│                                 │
│ ✅ Chapter 1: Giới thiệu       │
│ ✅ Chapter 2: Cơ bản           │
│ 🔒 Chapter 3: Nâng cao         │
│ 🔒 Chapter 4: Thực hành        │
│                                 │
│ [💰 Unlock Toàn Bộ - 100]     │
└─────────────────────────────────┘
```

**Khi đã unlock**:

```
┌─────────────────────────────────┐
│ 📚 Nhập Môn Phong Thủy         │
│ ✨ Đã mở khóa                  │
├─────────────────────────────────┤
│ Chapters:                       │
│                                 │
│ ✅ Chapter 1: Giới thiệu       │
│ ✅ Chapter 2: Cơ bản           │
│ ✅ Chapter 3: Nâng cao         │
│ ✅ Chapter 4: Thực hành        │
└─────────────────────────────────┘
```

#### Modal Unlock Sách

```
┌─────────────────────────────────┐
│ 🔓 Mở Khóa Sách                │
├─────────────────────────────────┤
│                                 │
│ Nhập Môn Phong Thủy            │
│                                 │
│ Giá:          100 💰           │
│ Số dư:        150 💰           │
│ Còn lại:       50 💰           │
│                                 │
│ ⚠️ Bạn sẽ mở khóa toàn bộ     │
│    chapters của sách này       │
│                                 │
│ [Hủy]  [Xác Nhận Mở Khóa]     │
└─────────────────────────────────┘
```

#### Màn Profile (Update)

```
┌─────────────────────────────────┐
│ 👤 Đạo Hữu                     │
│ [PHÀM NHÂN]                    │
├─────────────────────────────────┤
│ XP Progress Bar                │
├─────────────────────────────────┤
│ 📚          💰                 │
│ THIÊN THƯ   NGÂN LƯỢNG         │
│    2          150              │ ← Real data
└─────────────────────────────────┘
```

---

## 🔐 Security & Validation

### 1. Admin Grant Currency

**Checks**:

- ✅ Request từ admin account
- ✅ Amount trong danh sách cho phép
- ✅ User tồn tại và active
- ✅ Không tự tặng cho chính mình (optional)

**Rate Limiting**:

- Max 100 grants/admin/day

---

### 2. Book Unlock

**Checks**:

- ✅ User đăng nhập
- ✅ Book tồn tại và published
- ✅ Chưa unlock trước đó
- ✅ Đủ Ngân Lượng
- ✅ Transaction atomic (all or nothing)

**Transaction Flow**:

```sql
BEGIN;
  -- 1. Lock user row
  SELECT currency FROM users WHERE id = :userId FOR UPDATE;

  -- 2. Check balance
  IF currency < unlock_price THEN
    ROLLBACK;
    RETURN 'Insufficient currency';
  END IF;

  -- 3. Deduct currency
  UPDATE users SET currency = currency - :amount WHERE id = :userId;

  -- 4. Create transaction log
  INSERT INTO currency_transactions (...);

  -- 5. Create unlock record
  INSERT INTO user_unlocked_books (...);
COMMIT;
```

---

## 📊 Analytics & Reporting

### 1. Admin Dashboard Stats

**Metrics**:

- Total currency in circulation
- Total currency granted (all time)
- Total currency spent (all time)
- Average currency per user
- Top users by currency
- Most unlocked books

**Charts**:

- Currency grants over time (line chart)
- Book unlocks over time (line chart)
- Currency distribution (histogram)

---

### 2. User Stats

**Metrics**:

- Total currency earned
- Total currency spent
- Books unlocked count
- Currency transaction history

---

## 🎮 Gamification Ideas (Future)

### 1. Kiếm Ngân Lượng

**Cách kiếm**:

- ✅ Admin tặng (hiện tại)
- 🔲 Hoàn thành quiz (future)
- 🔲 Daily login streak (future)
- 🔲 Invite friends (future)
- 🔲 Complete achievements (future)

### 2. Sử Dụng Ngân Lượng

**Cách dùng**:

- ✅ Unlock sách (hiện tại)
- 🔲 Buy power-ups (future)
- 🔲 Unlock special content (future)
- 🔲 Buy cosmetics (future)

---

## 🚀 Implementation Phases

### Phase 1: Core System (MVP)

- ✅ Database schema
- ✅ Admin grant currency
- ✅ User unlock books
- ✅ Transaction logging
- ✅ Basic UI

### Phase 2: Enhanced Features

- 🔲 Currency history page
- 🔲 Analytics dashboard
- 🔲 Notifications
- 🔲 Refund system

### Phase 3: Gamification

- 🔲 Earn currency through activities
- 🔲 Special offers
- 🔲 Currency packages
- 🔲 Achievements

---

## 📝 API Endpoints Summary

### Admin APIs

```typescript
POST / admin / currency / grant; // Tặng Ngân Lượng
GET / admin / currency / transactions; // Lịch sử giao dịch
GET / admin / currency / stats; // Thống kê
```

### User APIs

```typescript
GET    /currency/balance                  // Số dư hiện tại
GET    /currency/transactions             // Lịch sử của user
POST   /books/:bookId/unlock              // Unlock sách
GET    /books/:bookId/unlock-status       // Kiểm tra unlock
GET    /books/:bookId/chapters/:id/access // Kiểm tra quyền chapter
```

### Book APIs (Updated)

#### 1. Get All Books

```typescript
GET /books

Response: {
  data: [
    {
      id: 1,
      title: "Nhập Môn Phong Thủy",
      description: "...",
      unlock_price: 100,
      free_chapters: 2,
      chapter_count: 10,
      is_unlocked: false,        // ✨ NEW: User đã unlock chưa
      cover_file: {...},
      created_at: "...",
      updated_at: "..."
    }
  ]
}
```

#### 2. Get Single Book

```typescript
GET /books/:id

Response: {
  id: 1,
  title: "Nhập Môn Phong Thủy",
  description: "...",
  unlock_price: 100,
  free_chapters: 2,
  chapter_count: 10,
  is_unlocked: true,           // ✨ NEW: User đã unlock chưa
  unlocked_at: "2025-12-10...", // ✨ NEW: Thời gian unlock (nếu có)
  chapters: [
    {
      id: 1,
      order: 1,
      title: "Giới thiệu",
      is_accessible: true,      // ✨ NEW: User có thể đọc không
      lock_reason: null         // ✨ NEW: Lý do khóa (nếu có)
    },
    {
      id: 2,
      order: 2,
      title: "Cơ bản",
      is_accessible: true,
      lock_reason: null
    },
    {
      id: 3,
      order: 3,
      title: "Nâng cao",
      is_accessible: true,      // true vì đã unlock book
      lock_reason: null
    }
  ],
  cover_file: {...},
  created_at: "...",
  updated_at: "..."
}
```

#### 3. Get Single Book (Chưa Unlock)

```typescript
GET /books/:id

Response: {
  id: 2,
  title: "Kinh Dịch Căn Bản",
  unlock_price: 200,
  free_chapters: 2,
  is_unlocked: false,          // ✨ Chưa unlock
  unlocked_at: null,
  chapters: [
    {
      id: 5,
      order: 1,
      title: "Giới thiệu",
      is_accessible: true,      // Free chapter
      lock_reason: null
    },
    {
      id: 6,
      order: 2,
      title: "Cơ bản",
      is_accessible: true,      // Free chapter
      lock_reason: null
    },
    {
      id: 7,
      order: 3,
      title: "Nâng cao",
      is_accessible: false,     // ✨ Bị khóa
      lock_reason: "requires_unlock" // ✨ Cần unlock book
    },
    {
      id: 8,
      order: 4,
      title: "Thực hành",
      is_accessible: false,
      lock_reason: "requires_unlock"
    }
  ]
}
```

---

## 🔧 Backend Implementation Logic

### Service Layer: BooksService

```typescript
class BooksService {
  /**
   * Get all books with unlock status for current user
   */
  async findAll(userId?: number): Promise<Book[]> {
    const books = await this.bookRepository.find({
      where: { status: BookStatus.PUBLISHED },
      relations: ['cover_file', 'file', 'chapters'],
    });

    // If user is logged in, check unlock status
    if (userId) {
      return Promise.all(
        books.map(async (book) => {
          // Compute chapter count
          book.chapter_count = book.chapters?.length || 0;

          // Check if user unlocked this book
          const unlocked = await this.userUnlockedBooksRepository.findOne({
            where: { user_id: userId, book_id: book.id },
          });

          book.is_unlocked = !!unlocked;
          book.unlocked_at = unlocked?.unlocked_at || null;

          return this.attachSignedUrls(book);
        }),
      );
    }

    // Guest user - all books are locked
    return Promise.all(
      books.map(async (book) => {
        book.chapter_count = book.chapters?.length || 0;
        book.is_unlocked = false;
        book.unlocked_at = null;
        return this.attachSignedUrls(book);
      }),
    );
  }

  /**
   * Get single book with unlock status and chapter access info
   */
  async findOne(id: number, userId?: number): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id, status: BookStatus.PUBLISHED },
      relations: ['cover_file', 'file', 'chapters'],
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    // Check unlock status
    let isUnlocked = false;
    let unlockedAt = null;

    if (userId) {
      const unlocked = await this.userUnlockedBooksRepository.findOne({
        where: { user_id: userId, book_id: book.id },
      });
      isUnlocked = !!unlocked;
      unlockedAt = unlocked?.unlocked_at || null;
    }

    book.is_unlocked = isUnlocked;
    book.unlocked_at = unlockedAt;

    // Add access info to each chapter
    if (book.chapters) {
      book.chapters = book.chapters.map((chapter) => {
        const isAccessible = this.canAccessChapter(isUnlocked, chapter.order, book.free_chapters);

        return {
          ...chapter,
          is_accessible: isAccessible,
          lock_reason: isAccessible ? null : 'requires_unlock',
        };
      });
    }

    return this.attachSignedUrls(book);
  }

  /**
   * Check if user can access a chapter
   */
  private canAccessChapter(bookUnlocked: boolean, chapterOrder: number, freeChapters: number): boolean {
    // If book is unlocked, all chapters accessible
    if (bookUnlocked) return true;

    // If chapter is within free range, accessible
    if (chapterOrder <= freeChapters) return true;

    // Otherwise locked
    return false;
  }
}
```

---

## 📱 Mobile UI Updates

### Book Detail Screen

```typescript
// BookDetailScreen.tsx

const BookDetailScreen = ({ bookId }) => {
  const { data: book } = useBook(bookId);
  const { user } = useAuth();

  const handleUnlock = async () => {
    // Show confirmation modal
    const confirmed = await showUnlockModal({
      bookTitle: book.title,
      price: book.unlock_price,
      userCurrency: user.currency,
    });

    if (confirmed) {
      await unlockBook(bookId);
      // Refresh book data
      refetch();
    }
  };

  return (
    <View>
      {/* Book Header */}
      <BookHeader
        title={book.title}
        isUnlocked={book.is_unlocked}
        unlockPrice={book.unlock_price}
      />

      {/* Unlock Button (if not unlocked) */}
      {!book.is_unlocked && (
        <UnlockButton
          price={book.unlock_price}
          onPress={handleUnlock}
        />
      )}

      {/* Chapters List */}
      <ChaptersList>
        {book.chapters.map((chapter) => (
          <ChapterItem
            key={chapter.id}
            chapter={chapter}
            isAccessible={chapter.is_accessible}
            lockReason={chapter.lock_reason}
            onPress={() => {
              if (chapter.is_accessible) {
                navigateToChapter(chapter.id);
              } else {
                showUnlockModal();
              }
            }}
          />
        ))}
      </ChaptersList>
    </View>
  );
};
```

### Chapter Item Component

```typescript
const ChapterItem = ({ chapter, isAccessible, lockReason }) => {
  return (
    <TouchableOpacity
      style={styles.chapterItem}
      disabled={!isAccessible}
    >
      {/* Chapter Icon */}
      {isAccessible ? (
        <Icon name="check-circle" color="green" />
      ) : (
        <Icon name="lock" color="gray" />
      )}

      {/* Chapter Title */}
      <Text style={isAccessible ? styles.accessible : styles.locked}>
        Chapter {chapter.order}: {chapter.title}
      </Text>

      {/* Lock Badge */}
      {!isAccessible && (
        <Badge text="🔒 Cần mở khóa" />
      )}
    </TouchableOpacity>
  );
};
```

---

## 🔄 Data Flow

### Get Books Flow

```
User mở app
  ↓
Call GET /books
  ↓
Backend:
  1. Fetch all published books
  2. Get userId from auth token
  3. For each book:
     - Query user_unlocked_books
     - Set is_unlocked = true/false
     - Set unlocked_at if unlocked
  4. Return books with unlock status
  ↓
Mobile:
  - Display books
  - Show unlock badge if needed
  - Show unlock price
```

### Get Single Book Flow

```
User click vào sách
  ↓
Call GET /books/:id
  ↓
Backend:
  1. Fetch book with chapters
  2. Check if user unlocked
  3. For each chapter:
     - Determine is_accessible
     - Set lock_reason if locked
  4. Return book with full info
  ↓
Mobile:
  - Display chapters
  - Show 🔒 for locked chapters
  - Enable/disable chapter click
  - Show unlock button if needed
```

---

## 📊 Database Query Optimization

### Efficient Unlock Check

```typescript
// Option 1: Join query (for single book)
const book = await this.bookRepository
  .createQueryBuilder('book')
  .leftJoinAndSelect('book.chapters', 'chapters')
  .leftJoin('user_unlocked_books', 'unlocked', 'unlocked.book_id = book.id AND unlocked.user_id = :userId', { userId })
  .addSelect('unlocked.unlocked_at')
  .where('book.id = :bookId', { bookId })
  .getOne();

// Option 2: Separate query (for multiple books)
const bookIds = books.map((b) => b.id);
const unlockedBooks = await this.userUnlockedBooksRepository.find({
  where: {
    user_id: userId,
    book_id: In(bookIds),
  },
});

const unlockedMap = new Map(unlockedBooks.map((u) => [u.book_id, u]));

books.forEach((book) => {
  const unlocked = unlockedMap.get(book.id);
  book.is_unlocked = !!unlocked;
  book.unlocked_at = unlocked?.unlocked_at || null;
});
```

---

## 🎯 Mobile Type Definitions

```typescript
// types.ts

export interface Book {
  id: number;
  title: string;
  description?: string;
  unlock_price: number; // ✨ NEW
  free_chapters: number; // ✨ NEW
  chapter_count?: number;
  is_unlocked?: boolean; // ✨ NEW
  unlocked_at?: string | null; // ✨ NEW
  cover_file?: {
    id: number;
    path: string;
  };
  chapters?: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: number;
  book_id: number;
  title: string;
  order: number;
  is_accessible?: boolean; // ✨ NEW
  lock_reason?: string | null; // ✨ NEW
  content?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## ✅ Updated Checklist

### Backend

- [ ] Add `unlock_price`, `free_chapters` to Book entity
- [ ] Add `is_unlocked`, `unlocked_at` to Book response
- [ ] Add `is_accessible`, `lock_reason` to Chapter response
- [ ] Update `findAll()` to include unlock status
- [ ] Update `findOne()` to include chapter access info
- [ ] Optimize unlock check queries
- [ ] Add indexes for performance

### Frontend (Mobile)

- [ ] Update Book type with new fields
- [ ] Update Chapter type with new fields
- [ ] Display unlock status in book list
- [ ] Display lock icons on chapters
- [ ] Show unlock button when needed
- [ ] Handle locked chapter clicks
- [ ] Update book detail UI

### Testing

- [ ] Test unlock status for logged in users
- [ ] Test unlock status for guest users
- [ ] Test chapter access logic
- [ ] Test free chapters access
- [ ] Test locked chapters display
- [ ] Test unlock button visibility

---

## 🎨 UI Examples

### Book List (Home Screen)

```
┌─────────────────────────────────┐
│ 📚 Nhập Môn Phong Thủy         │
│ [ĐẠI THỪA]                     │
│ 10 chương                      │
│ ✨ Đã mở khóa                  │ ← is_unlocked = true
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📚 Kinh Dịch Căn Bản           │
│ [PHÀM NHÂN]                    │
│ 8 chương                       │
│ 🔒 100 💰 để mở khóa           │ ← is_unlocked = false
└─────────────────────────────────┘
```

### Book Detail Screen

```
┌─────────────────────────────────┐
│ 📚 Kinh Dịch Căn Bản           │
│ 🔒 Giá: 200 💰                 │
├─────────────────────────────────┤
│ Chapters:                       │
│                                 │
│ ✅ 1. Giới thiệu               │ ← is_accessible = true
│ ✅ 2. Cơ bản                   │ ← is_accessible = true
│ 🔒 3. Nâng cao                 │ ← is_accessible = false
│ 🔒 4. Thực hành                │ ← is_accessible = false
│                                 │
│ [💰 Mở Khóa Toàn Bộ - 200]    │
└─────────────────────────────────┘
```

---

**Summary**: API get book bây giờ sẽ trả về đầy đủ thông tin unlock status và chapter access, giúp mobile app hiển thị chính xác trạng thái khóa/mở! ✨

---

## 🎯 Success Metrics

**KPIs**:

- Currency grant rate
- Book unlock rate
- Average currency per user
- User retention after unlock
- Revenue (if monetized)

---

## ⚠️ Edge Cases

### 1. User Unlock Rồi Xóa Sách

- Keep unlock record
- Show "Sách không còn tồn tại"

### 2. Admin Tặng Âm

- Validation: amount > 0

### 3. Race Condition (2 Unlocks Cùng Lúc)

- Use database transaction
- Lock user row

### 4. Refund

- Admin có thể refund
- Tạo transaction type: 'refund'
- Cộng lại currency
- Xóa unlock record (optional)

---

## 🎨 Design Principles

1. **Simple**: Dễ hiểu, dễ dùng
2. **Transparent**: User biết rõ số dư và chi phí
3. **Fair**: Giá unlock hợp lý
4. **Secure**: Transaction atomic, validation chặt chẽ
5. **Scalable**: Dễ mở rộng thêm tính năng

---

## 📚 Database Migration Order

```sql
-- 1. Add currency to users
ALTER TABLE users ADD COLUMN currency INTEGER DEFAULT 0 NOT NULL;

-- 2. Add unlock fields to books
ALTER TABLE books ADD COLUMN unlock_price INTEGER DEFAULT 100 NOT NULL;
ALTER TABLE books ADD COLUMN free_chapters INTEGER DEFAULT 2 NOT NULL;

-- 3. Create currency_transactions table
CREATE TABLE currency_transactions (...);

-- 4. Create user_unlocked_books table
CREATE TABLE user_unlocked_books (...);

-- 5. Create indexes
CREATE INDEX ...;
```

---

## ✅ Checklist

### Backend

- [ ] Database migrations
- [ ] Currency transaction service
- [ ] Book unlock service
- [ ] Admin grant API
- [ ] User unlock API
- [ ] Access control logic
- [ ] Transaction logging
- [ ] Unit tests

### Frontend (Admin)

- [ ] Currency management page
- [ ] Grant currency modal
- [ ] Transaction history table
- [ ] Stats dashboard

### Frontend (Mobile)

- [ ] Update profile with real currency
- [ ] Book unlock button
- [ ] Unlock confirmation modal
- [ ] Locked chapter indicator
- [ ] Currency balance display

### Testing

- [ ] Admin grant flow
- [ ] User unlock flow
- [ ] Insufficient balance
- [ ] Already unlocked
- [ ] Race conditions
- [ ] Transaction rollback

---

**Tổng kết**: Hệ thống Ngân Lượng hoàn chỉnh với admin control, user unlock, transaction logging, và UI/UX rõ ràng. Sẵn sàng để implement! 🚀
