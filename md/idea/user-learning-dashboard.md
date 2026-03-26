# User Learning Dashboard — "Tiến Trình Học Tập"

**Ngày đề xuất:** 2026-03-26
**Nguồn cảm hứng:** Coursera (My Learning), Udemy (My Learning), Khan Academy (progress map)
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** M

---

## Vấn đề / Cơ hội

Hiện tại người dùng **không thể thấy mình đang học đến đâu**. Không có tổng quan về: "Tôi đã đọc được bao nhiêu % sách X?", "Tôi đã xem mấy bài trong khóa Y?", "Tôi đã làm quiz nào rồi?". Home page hiện chỉ có "Đọc/Xem gần đây" (recent 5 items) — không đủ để thể hiện progress toàn bộ. Điều này dẫn đến người dùng **quên mình đang học gì** và mất đà sau vài ngày.

Backend đã có đủ data: `UserLessonProgress`, `UserBookPurchase`, `FlashcardReview`, `UserExamProgress` — chỉ cần aggregate và hiển thị.

## Ý tưởng tính năng

Một section hoặc page riêng **"Học Tập Của Tôi"** (hoặc tab trên Profile):

**Tổng quan (summary cards):**
```
📚 Sách đang đọc        🎬 Khóa học đang học
   3 cuốn / 5 sở hữu      2 khóa / 3 sở hữu

🃏 Flashcard tuần này   📝 Quiz đã làm
   47 thẻ                  12 bài, TB 82%
```

**Sách của tôi — progress list:**
- Mỗi sách: cover thumbnail + tên + progress bar (X/Y chapters đã đọc = %)
- Badge: "Đang đọc" / "Hoàn thành" / "Chưa bắt đầu"
- Nút "Tiếp tục đọc" → resume tại chapter cuối

**Khóa học của tôi — progress list:**
- Mỗi khóa: thumbnail + tên + progress bar (X/Y lessons đã xem đến ≥80%)
- Badge: "Đang học" / "Hoàn thành" / "Chưa bắt đầu"
- Nút "Tiếp tục xem" → lesson tiếp theo chưa hoàn thành

**Lịch sử luyện tập:**
- Quiz gần đây: tên quiz, điểm, ngày làm — 10 kết quả gần nhất
- Flashcard: tổng thẻ đã học tuần này, tháng này

**Thống kê cá nhân (simple):**
- "Bạn đã học X ngày trong tháng này"
- "Đã đọc X trang sách"
- "Đã xem X phút video"

## Tại sao phù hợp với Thiên Thư

Nội dung Phong Thuỷ có nhiều module liên quan nhau — người học cần biết mình đang ở đâu trong hành trình học. Việc thấy "Kỳ Môn Độn Giáp: 60% hoàn thành" sẽ tạo ra **Zeigarnik effect** (xu hướng muốn hoàn thành việc dang dở), thúc đẩy tiếp tục học. Dashboard cũng là nơi tự nhiên để hiển thị streak (từ idea Daily Streak).

## Inspiration từ market

- **Coursera**: "My Learning" tab — enrolled courses với progress bar, certificates earned, deadline reminders
- **Udemy**: Clean course list với % completion, last accessed date, "Continue" CTA
- **Khan Academy**: Mastery map — visual heatmap of topics mastered vs in-progress vs not started

## Scope gợi ý cho V1

**Backend (aggregate APIs):**
- [ ] `GET /api/users/me/learning-stats/` — trả: books_owned, books_in_progress, videos_owned, videos_in_progress, flashcards_this_week, quizzes_this_month, avg_quiz_score
- [ ] `GET /api/users/me/book-progress/` — list books user sở hữu + chapter progress (đã đọc/tổng)
- [ ] `GET /api/users/me/video-progress/` — list videos user sở hữu + lesson progress

**Frontend:**
- [ ] `MyLearningView.vue` — page mới, accessible từ Profile tab hoặc bottom nav (thay tab ít dùng)
- [ ] `LearningStats.vue` — 4 summary stat cards
- [ ] `BookProgressList.vue` — list books với progress bar
- [ ] `VideoProgressList.vue` — list videos với progress bar
- [ ] Cập nhật `ProfileView.vue` — thêm link/tab "Học tập của tôi"

## Open questions

- Navigation: Page riêng (`/my-learning`) hay tab trong Profile? Gợi ý: tab trong Profile cho V1, upgrade lên nav item nếu cần
- Book progress tính theo chapter nào? `UserLessonProgress` không có book chapter progress riêng — cần verify BE có `ReadingProgress` hay không, hoặc dùng `last_read_chapter` từ BookPurchase
- "Hoàn thành" định nghĩa: Video = đã xem ≥80% lesson, Book = đã đọc tất cả chapters?

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Verify BE: `UserLessonProgress` schema, đã có `last_watched_at`, `progress_percentage`?
- [ ] Viết detail design → `md/design/feature-N-learning-dashboard.md`
