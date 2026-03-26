# Daily Streak & Learning Habit System

**Ngày đề xuất:** 2026-03-26
**Nguồn cảm hứng:** Duolingo (streak + freeze), Anki (daily review target), Habitica
**Độ ưu tiên gợi ý:** 🟢 Low (defer đến 2027)
**Effort ước tính:** M
**Timeline:** ⏳ Thực hiện năm 2027 — ý tưởng hay nhưng chưa phải thời điểm phù hợp hiện tại
**Timezone:** UTC+7 (VN time) — streak reset lúc 00:00 giờ Việt Nam

---

## Vấn đề / Cơ hội

Thiên Thư hiện không có cơ chế nào thúc đẩy người dùng quay lại mỗi ngày. Sau khi mua sách/video, không có lý do cụ thể để mở app vào ngày mai. Duolingo chứng minh rằng streak là **retention driver mạnh nhất** cho learning apps — tạo ra loss aversion (sợ mất chuỗi) mạnh hơn cả reward. Với nội dung Phong Thuỷ/Kỳ Môn sâu và phức tạp, học hàng ngày một ít (microlearning) sẽ hiệu quả hơn nhiều so với học dồn.

## Ý tưởng tính năng

Hệ thống **Hỏa Hầu** (tên Phong Thuỷ cho "ngọn lửa liên tục") — streak học hàng ngày:

**Core mechanics:**
- **Streak counter** hiển thị trên Home page và Profile: "🔥 7 ngày liên tiếp"
- **Điều kiện tính streak**: trong ngày đã hoàn thành ít nhất 1 trong: 1 flashcard session / 1 quiz / đọc ít nhất 1 chapter / xem ít nhất 1 video lesson
- **Streak freeze**: dùng Linh Thạch để mua "Phù Hộ" — bảo vệ streak 1 ngày khi bỏ lỡ (tối đa 3 phù hộ tích trữ)
- **Milestone badges**: 7 ngày, 30 ngày, 100 ngày — badge đặc biệt hiển thị trên Profile
- **Weekly goal summary**: cuối tuần hiển thị mini-summary "Tuần này bạn đã học X ngày"

**Thông báo nhắc nhở (in-app + push sau khi có FCM):**
- 20:00 mỗi ngày nếu chưa học: "🔥 Streak của bạn đang chờ — học 5 phút thôi!"
- Khi streak bị gãy: "Streak gãy rồi! Bắt đầu lại hôm nay nhé"

**Profile enhancement:**
- Hiển thị "Chuỗi dài nhất: 42 ngày" (all-time best streak)
- Calendar heatmap nhỏ (kiểu GitHub contributions) — 3 tháng gần nhất, màu vàng theo intensity

## Tại sao phù hợp với Thiên Thư

Phong Thuỷ và Kỳ Môn là kiến thức tích lũy theo thời gian — không thể học dồn. Streak mechanic hoàn toàn align với triết lý "học mỗi ngày một chút" của người học niche knowledge. Tên "Hỏa Hầu" (từ Phong Thuỷ — ngọn lửa kiên trì) sẽ tạo cảm giác độc đáo, không copy paste từ Duolingo. Streak freeze bán bằng Linh Thạch tạo thêm **use case tiêu Linh Thạch** (hiện tại chỉ dùng mua content).

## Inspiration từ market

- **Duolingo**: Streak + Streak Freeze (gems) = #1 retention driver, giữ 23% DAU quay lại chỉ vì streak
- **Anki**: Daily review card count — simple target creates strong habit
- **Habitica**: RPG-themed habit tracker — tên/visual phù hợp với aesthetic Phong Thuỷ

## Scope gợi ý cho V1

- [ ] `DailyStreak` model: `user`, `streak_count`, `longest_streak`, `last_activity_date`, `freeze_count`
- [ ] `LearningActivity` signal hoặc post-save hook: cập nhật streak sau flashcard/quiz/reading progress
- [ ] API: `GET /api/users/me/streak/` — trả `streak_count`, `longest_streak`, `freeze_count`, `learned_today`
- [ ] API: `POST /api/users/me/streak/use-freeze/` — dùng 1 phù hộ (trừ Linh Thạch hoặc dùng item)
- [ ] Streak widget trên HomeView.vue (inline trong greeting section)
- [ ] Streak display trên ProfileView.vue (badge + longest streak + calendar dots 30 ngày)
- [ ] Milestone badge khi đạt 7/30/100 ngày (Notification + badge trên profile)

## Open questions

- Timezone: dùng timezone VN (UTC+7) hay UTC của server?
- Thời điểm reset streak: midnight VN time? → cần lưu `last_activity_date` theo VN timezone
- Streak freeze mua bằng Linh Thạch hay tặng miễn phí? Gợi ý: 1 free/tuần, mua thêm bằng LT
- Calendar heatmap — lưu daily activity log riêng hay dùng existing models?

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-N-daily-streak.md`
