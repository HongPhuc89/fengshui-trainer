# Yêu Cầu Giao Diện (UI/UX) - Nền Tảng Học Thuật Thiên Thư

Tài liệu này tóm tắt các luồng nghiệp vụ (Business Logic) và tính năng cốt lõi của **Thiên Thư (Feng Shui Learning Platform)**, giúp Designer nắm bắt nhanh bối cảnh để thiết kế giao diện (UI/UX) cho cả Mobile App (App Store/Google Play) và Web App.

---

## 1. Tổng Quan Dự Án
- **Tên nền tảng**: Thiên Thư
- **Lĩnh vực**: Nền tảng học thuật về Phong Thuỷ, Kỳ Môn, Trạch Nhật, Mệnh Lý.
- **Nền tảng hỗ trợ**:
  - Hỗ trợ **Mobile App** (iOS/Android).
  - Hỗ trợ **Web App** (Desktop/Mobile Browser).
- **Mục tiêu thiết kế**: Mang phong cách học thuật, bảo mật tài liệu cao, hiện đại nhưng phảng phất nét cổ điển/trầm mặc của Phong Thuỷ.

---

## 2. Các Luồng Nghiệp Vụ Chính (Business Flow)

### 2.1. Quản Lý Tài Khoản & Bảo Mật Thiết Bị
- **Đăng nhập/Đăng ký**: Các màn hình thông dụng cơ bản.
- **Giới hạn thiết bị (Device Locking)**: 
  - Mỗi tài khoản **chỉ được đăng nhập trên 1 thiết bị duy nhất** tại một thời điểm.
  - Cần có luồng (hoặc thông báo popup) cảnh báo khi người dùng đăng nhập trên thiết bị mới (yêu cầu gỡ thiết bị cũ hoặc liên hệ Admin).

### 2.2. Hệ Thống Thanh Toán & Ví (Wallet)
- **Tiền ảo**: "Linh Thạch".
- **Nạp tiền (Top-up)**: Hệ thống **không** thanh toán trực tiếp qua App/Web. Người dùng sẽ mua **Voucher** từ kênh ngoài (ví dụ: chuyển khoản cho Admin để lấy mã).
  - Cần màn hình **Nhập mã Voucher** để đổi lấy Linh Thạch.
- **Phân loại người dùng (User Roles)**:
  - **FREE**: Truy cập nội dung miễn phí hoặc các chương đọc thử (Demo).
  - **VIP (Subscription)**: Mua gói VIP tháng/năm để truy cập toàn bộ hoặc phần lớn nội dung.
  - **Paid USER (Pay-per-course)**: Dùng Linh Thạch để mua đứt từng khoá học/cuốn sách cụ thể.

### 2.3. Trải Nghiệm Học Tập (Nội Dung)
Nền tảng chia làm 3 phân hệ chính:

#### A. Đọc Sách (Books Module)
- **Danh sách sách**: Phân loại theo danh mục (Kỳ Môn, Trạch Nhật...).
- **Màn hình đọc sách (Book Reader)**:
  - Hiển thị Text hoặc PDF chống copy.
  - **[Quan trọng]** Phải có **Watermark mờ** (Họ tên + Số điện thoại người dùng) đè lên trang sách để chống chụp ảnh màn hình bán lậu. Designer lưu ý thiết kế sao cho Watermark không làm ảnh hưởng quá nhiều đến việc đọc.
  - Chế độ đọc thử (Demo chapters) và nút "Mua cuốn sách này/Nâng cấp VIP".

#### B. Xem Video (Videos Module)
- **Danh sách khoá học Video**: Tương tự sách, phân loại theo chủ đề.
- **Màn hình học Video (Video Player)**:
  - Giao diện bài giảng (Lessons), bài tập trắc nghiệm (Quizzes) đan xen.
  - Bảng tóm tắt nội dung (Summaries) và kịch bản (Transcripts) sinh ra từ AI.
  - **[Quan trọng]** Watermark dạng pop-up bật lên ngẫu nhiên trên video trong vài giây để chống quay lén.

#### C. Luyện Tập & Thi Cử (Practice & Exam Module)
- Các bài test trắc nghiệm, Flashcards.
- Chế độ "Leo tháp" (Tower mode) / Case studies để thực hành kiến thức.

---

## 3. Danh Sách Các Màn Hình Đề Xuất (Screen List)

Designer có thể dựa vào danh sách sau để lên sitemap và wireframe:

1. **Auth**: Splash, Login, Register, Forgot Password, Device Locked Alert.
2. **Home / Dashboard**: Tổng hợp các sách mới, video nổi bật, tiến độ học tập hiện tại.
3. **Books**: Danh sách sách, Chi tiết sách (có nút Mua/Đọc thử), Màn hình đọc sách (Reader + Watermark).
4. **Videos**: Danh sách khoá học, Chi tiết khoá học, Giao diện Video Player (có danh sách bài học, mục hỏi đáp/tóm tắt).
5. **Practice / Exams**: Danh sách bài thi, Giao diện làm bài tập trắc nghiệm, Kết quả điểm số.
6. **Wallet & VIP**: Hiển thị số dư Linh Thạch, Lịch sử giao dịch, Màn hình nhập mã Voucher, Bảng giá gói VIP.
7. **Profile & Settings**: Đổi mật khẩu, Tắt/Bật thông báo, Liên hệ hỗ trợ (để gỡ thiết bị).

---

## 4. Lưu Ý Quan Trọng Cho Designer
- **Chống Capture**: Trên Mobile sẽ chặn chụp ảnh màn hình. UI nên thể hiện cảnh báo ở các nội dung bản quyền.
- **Chế độ hiển thị (Dark/Light mode)**: Nên có thiết kế hỗ trợ đọc giả vào ban đêm (rất quan trọng cho app đọc sách/học tập).
- **Hệ thống phân cấp nội dung**: Có các nhãn dán (tags/badges) rõ ràng cho nội dung `FREE`, `VIP`, `PREMIUM` trên thẻ sách/video.
