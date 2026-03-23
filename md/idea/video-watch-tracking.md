# Video Watch Tracking & Learning Analytics

**Ngày đề xuất:** 2026-03-23
**Nguồn cảm hứng:** Wistia per-viewer heatmap, Udemy engagement analytics, YouTube Studio audience retention curves
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** M

---

## Vấn đề / Cơ hội

Hiện tại Thiên Thư đã có model `UserLessonProgress` lưu `progress_seconds` và `completed`, nhưng dữ liệu này **chỉ phục vụ học viên** (resume playback) và **hoàn toàn invisible với admin/instructor**. Điều này tạo ra một số pain points cụ thể:

1. **Admin không biết ai đang học gì**: Khi một học viên mua khóa học, admin không thể trả lời câu hỏi "Học viên X đã xem đến đâu?" hay "Bài học Y có ai xem chưa?" — phải query DB thủ công.

2. **Không phát hiện được nội dung kém chất lượng**: Nếu 90% user dừng xem bài học số 3 của mọi khóa học, đó là tín hiệu nội dung có vấn đề. Hiện tại không có cách nào nhìn thấy pattern này.

3. **Không có dữ liệu để chứng minh engagement với học viên**: Thiên Thư là nền tảng học thuật — học viên trả tiền muốn biết họ đã học được bao nhiêu. Không có "learning report" cá nhân hóa.

4. **Không thể đánh giá ROI của từng video**: Một bài học 30 phút được xem hết bởi 80% học viên vs. một bài 10 phút chỉ được xem 20% — hai nội dung này cần được đánh giá khác nhau khi quyết định đầu tư làm thêm.

5. **Thiếu tín hiệu để re-engage user đang churn**: User mua khóa học nhưng không xem bài nào trong 7 ngày là tín hiệu cần push notification/email nhắc nhở. Không có tracking = không có tín hiệu.

---

## Ý tưởng tính năng

Tính năng chia làm 3 lớp, mỗi lớp phục vụ một đối tượng khác nhau:

### Lớp 1 — Admin/Instructor View (Watch History per User)

**"Ai đang xem video gì?"** — bảng tra cứu dành cho admin:

- Tìm kiếm theo user: chọn 1 user → thấy toàn bộ lịch sử xem video (tên khóa, tên bài, % đã xem, thời gian xem cuối, completed hay chưa)
- Tìm kiếm theo bài học: chọn 1 VideoLesson → thấy danh sách user đã xem, ai completed, ai đang dở, tiến độ từng người
- Filter: theo khóa học, theo khoảng thời gian, theo trạng thái (completed / in-progress / not-started)
- Export CSV: để admin gửi report cho học viên hoặc phân tích ngoài

**Tích hợp vào Django Admin**: thêm 2 custom admin views dưới section Videos — "Watch History by User" và "Lesson Analytics".

### Lớp 2 — Content Analytics (Video Performance)

**"Bài học nào đang hoạt động tốt?"** — dashboard phân tích nội dung:

- **Completion rate per lesson**: % học viên đã purchased khóa học và xem hết bài lesson đó. Bài nào dưới 50% cần review.
- **Average progress percentage per lesson**: Trung bình % video đã xem của tất cả user, cho biết điểm drop-off điển hình.
- **Watch count per lesson**: Tổng lượt xem (unique users) mỗi bài.
- **Re-watch indicator**: Số user có `progress_seconds > duration_seconds * 0.9` nhiều hơn 1 lần (hiện không track được — cần `VideoWatchEvent` hoặc tăng watch_count). **V2.**
- **Course completion funnel**: Trong số user mua khóa, bao nhiêu % đã xem bài 1 → bài 2 → ... → bài cuối. Visualize dạng funnel để thấy drop-off ở bài nào.

### Lớp 3 — Learner Progress Report (học viên tự xem)

**"Tôi đã học được bao nhiêu?"** — trang learning summary trong Profile hoặc sau khi mua khóa học:

- Per-course progress card: % hoàn thành tổng thể, số bài đã xem / tổng số bài, thời gian học tích lũy (tổng `progress_seconds` của tất cả bài).
- "Tiếp tục học" button → resume từ bài đang dở (đã có `UserCourseProgress.last_lesson` — cần expose rõ hơn trên UI).
- Streak indicator (V2): số ngày liên tiếp có activity — tăng motivation.
- Certificate / Completion badge khi xem hết 100% khóa (V2 — cần UX design riêng).

---

## Tại sao phù hợp với Thiên Thư

**Mô hình bán khóa học Phong Thuỷ = high-trust transaction**: Học viên bỏ tiền mua kiến thức cổ học, họ kỳ vọng được theo dõi hành trình học tập. Một "Báo cáo tiến độ học tập" chuyên nghiệp không chỉ tăng trust mà còn là differentiator so với các group Zalo/Facebook bán tài liệu thô.

**Data đã tồn tại, chỉ cần expose**: `UserLessonProgress` với `progress_seconds`, `completed`, `last_watched` đã được ghi mỗi khi video player cập nhật tiến độ. Không cần schema migration lớn — chỉ cần build views và APIs trên data sẵn có.

**Device locking = 1 user = 1 device = data sạch**: Không như Coursera/Udemy có thể bị chia sẻ tài khoản, Thiên Thư enforce 1 device per account. Watch data do đó rất tin cậy — 1 progress record = 1 người thực sự xem.

**Admin nhỏ, cần tự động hóa**: Với team vận hành nhỏ, admin cần công cụ thay thế "hỏi thủ công" khi học viên hỏi "tôi học được bao nhiêu rồi?". Watch tracking giúp admin trả lời ngay trong 30 giây.

---

## Inspiration từ market

- **Wistia** (video hosting for business): Heatmap per-viewer cho thấy từng giây video được xem/bỏ qua/xem lại. Mỗi viewer có summary: total plays, % engagement, last view date. Milestone events: 25% / 50% / 75% / 100% completion.
- **Udemy** (instructor analytics): Dashboard hiển thị "Engagement" per lecture — trung bình % video được xem, total watch minutes, completion funnel theo thứ tự bài học. Instructor thấy rõ bài nào student skip nhiều nhất.
- **YouTube Studio**: "Audience Retention" curve cho từng video — biểu đồ đường % viewers còn lại theo thời gian. Đỉnh = re-watch, đáy đột ngột = drop-off point. Admin thấy tín hiệu nội dung weak ngay từ ngày đầu.
- **Thinkific / Teachable**: Learner progress dashboard cho instructor — per-student view (ai đã hoàn thành, ai đang bỏ dở), per-course view (completion rate, avg score). Export CSV học viên để tích hợp email automation.
- **LMS platforms (Litmos, CYPHER)**: "Green Dot" real-time activity indicator; completion tracking tích hợp với certification issuance; drill-down từ cohort → individual learner.

---

## Scope gợi ý cho V1

Giữ V1 focused: chỉ expose data đã có, không cần schema mới.

**Backend (Django Admin custom views + API):**
- [ ] `GET /api/admin/videos/watch-history/?user_id=&lesson_id=&course_id=&date_from=&date_to=` — query `UserLessonProgress`, trả về list với user info + lesson info + progress_seconds + completed + last_watched
- [ ] `GET /api/admin/videos/lesson-analytics/?lesson_id=` — aggregate: watch_count, completed_count, avg_progress_pct, completion_rate cho 1 lesson
- [ ] `GET /api/admin/videos/course-funnel/?course_id=` — per-lesson funnel: số unique user đã xem từng bài, xem dạng [lesson_order, lesson_title, viewer_count, completion_rate]
- [ ] Django Admin custom view "Video Watch History" dưới Videos section — table với search/filter, link ra detail
- [ ] Django Admin custom view "Lesson Analytics" — per-lesson stats table, sortable theo completion rate

**Frontend học viên (Vue.js — trong VideoDetailView hoặc ProfileView):**
- [ ] Per-course progress indicator: `X / Y bài đã hoàn thành` + progress bar `Z%`
- [ ] Tổng thời gian học tích lũy cho khóa học: format `X giờ Y phút`
- [ ] Button "Tiếp tục học" → navigate đến `last_lesson` (dùng `UserCourseProgress.last_lesson` đã có)

**Không trong V1:**
- Heatmap chi tiết từng giây (cần event logging riêng, overengineering cho scale hiện tại)
- Re-watch tracking (cần thêm `watch_count` field hoặc event log)
- Streak / gamification
- Certificate / badge system
- Email notifications dựa trên inactivity (cần Celery integration)

---

## Data Sources (từ models hiện tại — không cần migration)

| Metric | Model / Field | Ghi chú |
|--------|---------------|---------|
| Ai xem lesson nào | `UserLessonProgress.user`, `.lesson` | One record per user-lesson pair |
| Tiến độ xem | `UserLessonProgress.progress_seconds` | Cập nhật mỗi ~5-10s từ player |
| Đã xem xong chưa | `UserLessonProgress.completed` | Boolean, set khi `progress_seconds >= duration * 0.9` |
| Thời gian xem cuối | `UserLessonProgress.last_watched` | `auto_now=True` |
| Bài học đang dở | `UserCourseProgress.last_lesson` | Per user-course, dùng để resume |
| Duration của lesson | `VideoLesson.duration_seconds` | Cần để tính % progress |
| User đã mua chưa | `UserVideoPurchase` | Để filter đúng cohort (chỉ tính user đã mua) |

**Lợi thế**: Không cần migration schema nào cho V1. Tất cả queries là `SELECT` / `GROUP BY` trên data đã có.

---

## Data Gaps (cho V2+)

1. **Không có event log theo từng giây**: `UserLessonProgress` chỉ lưu snapshot progress cuối — không biết user đã xem đoạn nào, skip đoạn nào. Để làm heatmap như Wistia, cần thêm `VideoWatchSegment` model ghi `(user, lesson, segment_start, segment_end, watched_at)`.

2. **Không track re-watch**: Một user xem lại bài học nhiều lần → `progress_seconds` bị overwrite, mất thông tin số lần xem. Cần thêm `watch_count` field vào `UserLessonProgress` (tăng 1 mỗi khi video được play từ đầu).

3. **Không có play/pause/seek events**: Để biết user pause nhiều lần ở đoạn nào (sign of confusion), cần event log. Thường được triển khai via frontend analytics (Firebase / Mixpanel) thay vì backend model.

4. **Duration chưa chắc đầy đủ**: `VideoLesson.duration_seconds` là nullable. Nếu null, không tính được `completion_rate` (%). Cần backfill hoặc tự động sync từ Bunny Stream API.

---

## Open questions

- **Threshold "completed"**: Hiện tại completed = `progress_seconds >= duration * 0.9`? Hay có threshold khác? Cần confirm logic hiện tại trong `views_videos.py`.
- **Admin muốn xem level nào trước?** Per-user (tìm kiếm từng học viên) hay per-content (phân tích từng bài học)? Gợi ý V1: per-user trước vì đó là câu hỏi thực tế nhất ("học viên này học đến đâu rồi?").
- **Học viên có muốn ẩn progress không?** Trong context học thuật cao cấp, một số người không muốn admin thấy họ xem bài nào. Thiên Thư hiện không có privacy setting — nên quyết định rõ: platform này admin-visible by design.
- **Export format**: CSV đủ cho V1? Hay cần PDF report (branded với logo Thiên Thư) để admin gửi cho học viên như "bảng điểm danh"?
- **Mobile app (Flutter)**: Progress tracking cũng cần đồng bộ qua cùng API khi Flutter được build. V1 backend-only là đủ vì Flutter chưa có.

---

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-18-video-watch-tracking.md`
