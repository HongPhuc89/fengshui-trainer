# Admin User Activity Dashboard

**Ngày đề xuất:** 2026-03-13
**Nguồn cảm hứng:** Yêu cầu từ PO — theo dõi engagement và doanh thu thực tế
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** M

---

## Vấn đề / Cơ hội

Hiện tại admin Thiên Thư quản lý platform hoàn toàn qua Django Jazzmin — xem từng record, filter thủ công, không có view tổng hợp theo thời gian. Điều này tạo ra các pain points cụ thể:

1. **Blind spot về tăng trưởng**: Admin không biết ngày nào user active nhiều nhất, campaign voucher hiệu quả đến đâu, hay tháng nào doanh thu tăng/giảm — tất cả phải query thủ công hoặc export CSV rồi làm trong Excel.

2. **Không phát hiện được churn sớm**: Nếu DAU (Daily Active Users) đột ngột giảm 40%, admin sẽ không biết cho đến khi có người phản ánh, vì không có chart theo dõi trend.

3. **Thiếu dữ liệu để quyết định pricing**: Voucher bán ra bao nhiêu LT mỗi ngày? User có đủ tiền mua khóa học không? Không có số liệu = quyết định pricing theo cảm tính.

4. **Khó đánh giá hiệu quả nội dung mới**: Khi release sách/video mới, admin không thể biết ngay hôm đó có bao nhiêu purchase, học tập tăng hay không so với baseline.

Dashboard tổng hợp theo ngày sẽ biến admin từ người "phản ứng thụ động" thành người "chủ động điều hành" dựa trên data thực tế.

---

## Ý tưởng tính năng

Một trang dashboard dành riêng cho admin (có thể tích hợp vào Django Admin sidebar hoặc build như một custom admin view) với các đặc điểm sau:

**Layout**: 2 section chính — "User Activity" và "Linh Thạch / Revenue", cùng một timeline chung.

**Granularity**: Chủ yếu theo ngày (daily). Có thể group theo tuần/tháng khi xem range dài.

**Date range picker**: Mặc định 30 ngày gần nhất. Cho phép chọn custom range (7 ngày / 30 ngày / 90 ngày / custom).

**Charts**: Line chart cho trends theo thời gian, bar chart cho comparisons, số liệu summary card ở đầu trang (KPI tiles).

**Filters phụ**: Lọc theo content type (sách vs video), user type (FREE/VIP/Paid), hoặc category nội dung.

---

## Metrics cốt lõi (V1)

### User Activity

- **DAU (Daily Active Users)**: Số user duy nhất có ít nhất 1 hành động trong ngày. "Hành động" = xem lesson progress được update, đọc chapter, làm flashcard/quiz, hoặc vào app (JWT refresh).
- **Registrations per day**: Số user đăng ký mới mỗi ngày — để theo dõi growth rate và hiệu quả acquisition.
- **New purchases per day**: Số lượt mua sách + mua video gộp lại theo ngày — đây là conversion metric quan trọng nhất.
- **Daily learning sessions**: Số lần `UserLessonProgress` được update (video) hoặc `UserChapterProgress` được update (sách) — proxy cho số session học tập.
- **VIP activations per day**: Số lượt user nâng cấp VIP (từ WalletTransaction `VIP_SUBSCRIPTION`).

### Linh Thạch (Revenue)

- **LT recharged per day**: Tổng LT nạp vào platform mỗi ngày — từ `WalletTransaction` type `RECHARGE_VOUCHER` + `ADMIN_TOPUP`. Đây là proxy cho doanh thu thực vì LT được bán qua voucher bên ngoài.
- **LT spent per day**: Tổng LT tiêu thụ mỗi ngày (purchases + VIP) — từ các transaction có `amount` âm. Cho thấy mức độ "conversion" từ LT đã nạp sang chi tiêu thực tế.
- **Vouchers redeemed per day**: Số lượt đổi voucher mỗi ngày — cho thấy người dùng đang nạp tiền hay không.
- **Revenue breakdown by content type**: Trong tổng LT spent, bao nhiêu từ sách (`PURCHASE_BOOK`), video (`PURCHASE_VIDEO`), VIP (`VIP_SUBSCRIPTION`) — bar chart stacked.

---

## Metrics mở rộng (V2)

Sau khi V1 ổn định và admin đã quen dùng, PO nên xem xét bổ sung:

- **Lesson completion rate by day**: % bài học được hoàn thành (completed=True) trong ngày / tổng bài học đang học dở — chỉ số chất lượng học tập.
- **Flashcard sessions per day**: Số session flashcard hoàn thành — từ log hoặc completion event (cần thêm tracking, xem Data Gaps).
- **Churn indicator**: Số user có activity tuần trước nhưng không có activity tuần này — early warning cho churn.
- **Top content by purchases this period**: Bảng xếp hạng sách/video được mua nhiều nhất trong khoảng thời gian đang xem — insight cho content strategy.
- **Average LT balance by user segment**: Median LT balance của user FREE, VIP, Paid — giúp quyết định pricing tiers.
- **Device lock events per day**: Số lần user bị lock thiết bị và cần reset — chỉ số về tài khoản sharing/abuse.
- **Cohort retention (weekly)**: Nhóm user đăng ký cùng tuần, còn active sau 1/2/4 tuần là bao nhiêu % — metric sức khỏe dài hạn của platform.

---

## Tại sao phù hợp với Thiên Thư

**Linh Thạch economy là linh hồn của business model**: Khác với các EdTech platform có payment gateway trực tiếp, Thiên Thư dùng voucher vật lý → LT → mua nội dung. Chuỗi này có nhiều điểm friction có thể optimize. Dashboard cho phép admin thấy rõ: "Hôm nay bán được 10 voucher = X LT, nhưng chỉ có Y LT được chi tiêu = còn Z LT đang 'ngủ' trong ví user" — từ đó có chiến thuật push notification hoặc flash sale để kích hoạt số dư đang không được dùng.

**Content bảo mật cao = không có free trial mạnh**: Vì sách/video đều có watermark và device lock, người dùng mới khó "thử" trước khi mua. DAU trend + registration funnel trên dashboard giúp admin phát hiện sớm nếu conversion rate từ FREE → Paid đang kém, từ đó điều chỉnh chương trình demo hoặc giá VIP.

**Admin là người duy nhất có full picture**: Khác với user-facing analytics (Google Analytics), admin Thiên Thư cần thấy đồng thời cả behavior (học gì) và economics (mua gì, nạp bao nhiêu) trong cùng một timeline — dashboard này lấp đúng gap đó.

---

## Data Sources (từ Django models hiện tại)

| Metric | Model / Field | Ghi chú |
|--------|---------------|---------|
| DAU | `UserLessonProgress.last_watched` + `UserChapterProgress.last_read` | Aggregated unique `user_id` per day |
| Registrations | `User.created_at` | Count where `date_trunc('day', created_at)` |
| Purchases | `UserBookPurchase.created_at`, `UserVideoPurchase.created_at` | Two queries, merged by day |
| LT recharged | `WalletTransaction.created_at` where `transaction_type IN ('RECHARGE_VOUCHER', 'ADMIN_TOPUP')` | Sum `amount` per day |
| LT spent | `WalletTransaction.created_at` where `amount < 0` | Abs sum per day |
| VIP activations | `WalletTransaction.created_at` where `transaction_type = 'VIP_SUBSCRIPTION'` | Count per day |
| Vouchers redeemed | `Voucher.used_at` where `is_used = True` | Count per day |
| Revenue by content type | `WalletTransaction.transaction_type` (PURCHASE_BOOK, PURCHASE_VIDEO, VIP_SUBSCRIPTION) | Group by type per day |
| Learning sessions | `UserLessonProgress.last_watched` (updated_at proxy) | Count records updated per day |

**Lợi thế lớn**: `BaseModel` trên tất cả model đều có `created_at` (auto_now_add) và `updated_at` (auto_now) — không cần migration hay backfill. Data đã có sẵn từ ngày đầu, có thể query lịch sử ngay lập tức.

---

## Data Gaps (cần implement thêm)

1. **Flashcard session completion events**: Hiện tại không có model/log nào ghi lại "user hoàn thành 1 session flashcard 20 card". `FlashcardReview` model tồn tại nhưng không còn được ghi vào (sau Feature 10). Cần thêm `FlashcardSessionLog` model (user, training_activity, completed_at, cards_count) nếu muốn track metric này.

2. **App opens / JWT refresh as activity signal**: Để tính DAU chính xác hơn (không chỉ dựa vào progress updates), cần log JWT refresh events vào một bảng `UserActivityLog` (user, event_type, timestamp). Hiện tại không có bảng này.

3. **Quiz session completion**: Tương tự flashcard, `UserExamProgress` chỉ track bài thi chính thức (ExamProgress), không track số lần user làm quiz trong Training context.

4. **Voucher face value vs. actual revenue**: Voucher lưu `value` (LT) nhưng không lưu giá tiền thực (VND) mà admin đã bán. Nếu muốn dashboard có cả "Doanh thu VND theo ngày", cần thêm field `price_vnd` vào `Voucher` model.

---

## Scope gợi ý cho V1

- [ ] Tạo Django admin view `AdminDashboardView` — class-based view, yêu cầu `is_staff=True`
- [ ] Backend: `GET /api/admin/dashboard/activity/?date_from=&date_to=` — trả về daily breakdown cho DAU, registrations, purchases
- [ ] Backend: `GET /api/admin/dashboard/revenue/?date_from=&date_to=` — trả về daily breakdown cho LT recharged, LT spent, vouchers redeemed, breakdown by content type
- [ ] Tích hợp vào Django Jazzmin sidebar: thêm menu item "Dashboard" trỏ vào view này
- [ ] Frontend chart: dùng Chart.js (hoặc django-jazzmin hỗ trợ sẵn) — line chart cho trends, bar chart stacked cho revenue breakdown
- [ ] KPI summary tiles ở đầu trang: tổng cho period đang xem (Total Active Users, Total LT Recharged, Total Purchases, New Registrations)
- [ ] Date range picker: preset 7 ngày / 30 ngày / 90 ngày
- [ ] Export CSV button cho bảng raw data theo ngày

---

## UI/UX Gợi ý

**Layout 3 tầng:**
1. **KPI Tiles row** (4 cards ngang): Period Active Users | New Registrations | Total Purchases | LT Recharged — với delta so với period trước (ví dụ: "+12% vs 30 ngày trước")
2. **Charts row** (2 charts song song): Line chart "User Activity" (DAU + Registrations + Purchases) bên trái; Line chart "Linh Thạch Economy" (LT Recharged vs LT Spent) bên phải
3. **Detail section**: Bar chart stacked "Revenue Breakdown by Type" (Book / Video / VIP mỗi ngày) + bảng data raw có thể sort và export

**Color coding** nhất quán với design Thiên Thư: vàng gold (`#C9A84C`) cho LT/Revenue metrics, xanh teal cho user activity metrics.

**Responsive**: Trên mobile (admin dùng điện thoại check nhanh), KPI tiles hiển thị 2×2, charts stack dọc.

**Access**: Chỉ staff (`is_staff=True`). Không cần separate Django app — thêm vào `users` hoặc `wallet` app dưới dạng admin custom view.

---

## Open questions

- **LT có giá VND cố định không?** Nếu 1 LT = X VND cố định, có thể hiển thị "~ Y triệu VND" tương đương trong dashboard mà không cần migration. Nếu giá linh hoạt, cần field `price_vnd` trong Voucher.
- **Admin muốn xem cấp độ nào?** Platform-wide (tất cả user) hay có thể drill-down theo từng user/cohort? V1 nên dừng ở platform-wide để giữ scope nhỏ.
- **Timezone**: Tất cả timestamp trong DB là UTC. Dashboard nên quy đổi về UTC+7 (Vietnam) khi group theo ngày, để tránh ngày bị split sai. Cần confirm timezone handling ở query layer.
- **Real-time vs. batch**: V1 query trực tiếp PostgreSQL (acceptable với dataset nhỏ). Khi DAU > 5,000, nên pre-aggregate bằng Celery task đêm vào bảng `DailyMetrics` để tránh slow queries.
- **Có cần email report không?** Nhiều admin prefer nhận email tóm tắt hàng tuần thay vì vào xem dashboard — nên hỏi trước khi build.

---

## Bước tiếp theo

- [ ] PO review và approve scope V1 (đặc biệt: có cần LT → VND conversion không, timezone preference)
- [ ] Xác nhận: Dashboard tích hợp Jazzmin hay build trang Vue.js riêng (recommendation: Jazzmin để giữ effort thấp ở V1)
- [ ] Viết detail design → `md/design/feature-13-detail-design.md`
- [ ] Estimate: Backend queries (~2 ngày) + Frontend charts trong Jazzmin (~1.5 ngày) + Testing (~0.5 ngày) = ~4 ngày tổng
