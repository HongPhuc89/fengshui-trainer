# Idea Backlog — Thiên Thư

Thư mục này lưu các ý tưởng tính năng mới được đề xuất từ quá trình nghiên cứu market và phân tích product gaps.

Mỗi file = 1 ý tưởng. Dùng skill `/product-ideation` để sinh ý tưởng mới.

---

## Workflow

```
md/idea/<tên>.md          ← ý tưởng thô từ product-ideation
    ↓ PO review (/project-owner-detail-design-review)
md/design/feature-N-<name>.md   ← đủ để implement
    ↓ /fullstack-developer
Code
```

---

## Danh sách ý tưởng

| File | Tiêu đề | Ưu tiên | Effort | Status |
|------|---------|---------|--------|--------|
| [admin-activity-dashboard.md](admin-activity-dashboard.md) | Admin User Activity Dashboard — DAU & Linh Thạch theo ngày | 🔴 High | M | Idea |
| [video-watch-tracking.md](video-watch-tracking.md) | Video Watch Tracking & Learning Analytics — trace user xem video, completion rate, course funnel | 🔴 High | M | Idea |
| [quiz-result-summary-screen.md](quiz-result-summary-screen.md) | Quiz Result & Summary Screen V2 — score ring animation, stats breakdown, per-question review với explanation, answer highlight | 🔴 High | M | ✅ Design done |
| [user-learning-dashboard.md](user-learning-dashboard.md) | User Learning Dashboard — tiến trình học tập cá nhân: books/videos progress, quiz history, stats | 🔴 High | M | Idea |
| [comment-ui-social-layer.md](comment-ui-social-layer.md) | Comment UI — Social Layer cho Books & Videos (backend đã có, chỉ cần FE) | 🟡 Medium | S | Idea |
| [dark-mode.md](dark-mode.md) | Dark Mode — chế độ tối + sepia cho đọc sách/xem video ban đêm | 🟡 Medium | M | Idea |
| [book-annotations-bookmarks.md](book-annotations-bookmarks.md) | Book Annotations & Bookmarks — bookmark trang, ghi chú theo chapter trong Book Reader | 🟡 Medium | L | Idea |
| [pwa-progressive-web-app.md](pwa-progressive-web-app.md) | PWA — Progressive Web App, installable, Add to Home Screen (bridge trước Flutter app) | 🟡 Medium | S | Idea |
| [daily-streak-learning-habit.md](daily-streak-learning-habit.md) | Daily Streak & Learning Habit System — "Hỏa Hầu" streak, freeze, milestones | 🟢 Low (2027) | M | Idea |
| [youtube-to-lesson-pipeline.md](youtube-to-lesson-pipeline.md) | YouTube-to-Lesson Auto-Import Pipeline — yt-dlp + Gemini API transcript/dịch tự động cho admin | 🔴 High | L | Idea |

---

## Legend

| Icon | Ý nghĩa |
|---|---|
| 🔴 | High priority — nên làm sớm |
| 🟡 | Medium priority — backlog gần |
| 🟢 | Low priority — backlog xa / nice-to-have |
| ✅ | Đã chuyển thành design doc |
| ❌ | Rejected — có lý do ghi chú |
