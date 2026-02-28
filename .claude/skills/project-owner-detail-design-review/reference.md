# Project Owner — Detail Design Review Checklist

Dùng checklist này để review từng phần của tài liệu detail design. Đánh dấu Pass / Fail / N/A và ghi chú ngắn nếu cần.

---

## 1. Mục tiêu & phạm vi

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 1.1 | Mục tiêu feature được nêu rõ, đo lường được (hoặc có thể verify) | | |
| 1.2 | Phạm vi (in-scope / out-of-scope) được giới hạn rõ, không mơ hồ | | |
| 1.3 | Có nêu rõ phiên bản (v1 / v2) và defer gì sang sau | | |

---

## 2. Vấn đề & giải pháp

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 2.1 | Vấn đề hiện tại được mô tả cụ thể (có thể trích dẫn code/model hiện có) | | |
| 2.2 | Giải pháp đề xuất trực tiếp giải quyết các vấn đề đã nêu | | |
| 2.3 | Không tạo ra vấn đề mới không cần thiết (over-engineering, breaking change không được giải thích) | | |

---

## 3. Kiến trúc & mở rộng

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 3.1 | Sơ đồ / mô tả kiến trúc rõ ràng (lớp, luồng dữ liệu) | | |
| 3.2 | Quy tắc extensibility được nêu (thêm type/feature mới mà không phá vỡ hiện tại) | | |
| 3.3 | Naming nhất quán (source_type, activity_type, v.v.) | | |
| 3.4 | Tránh circular dependency hoặc coupling không cần thiết giữa domain | | |

---

## 4. Access control & bảo mật

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 4.1 | Quy tắc truy cập (ai được dùng feature nào) được định nghĩa rõ | | |
| 4.2 | Design tái sử dụng hoặc mở rộng access check hiện có (không duplicate logic mơ hồ) | | |
| 4.3 | API / endpoint mới có nêu permission (auth, staff-only, v.v.) | | |
| 4.4 | Không lộ dữ liệu nhạy cảm qua response hoặc error message | | |

---

## 5. Database & data model

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 5.1 | Model mới có đủ field cần thiết, kiểu dữ liệu hợp lý | | |
| 5.2 | Ràng buộc toàn vẹn rõ ràng (unique, FK, exactly-one source) — có `clean()` / constraint | | |
| 5.3 | Quan hệ (OneToOne, FK, reverse name) đúng với nghiệp vụ | | |
| 5.4 | Index / query pattern được cân nhắc nếu có list/dashboard (có thể ghi "N/A" nếu đơn giản) | | |
| 5.5 | Soft delete vs hard delete (nếu có) được nêu rõ | | |

---

## 6. API design

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 6.1 | Endpoint mới có method + path + mô tả ngắn | | |
| 6.2 | Request/response format (hoặc serializer) được mô tả hoặc ví dụ | | |
| 6.3 | Mã lỗi (404, 403, 400) được nêu trong từng endpoint liên quan | | |
| 6.4 | Endpoint cũ deprecated/giữ nguyên được liệt kê rõ | | |
| 6.5 | URL naming nhất quán với convention dự án (slug, id, v.v.) | | |

---

## 7. Frontend & UX

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 7.1 | Entry point (nút, route, drawer/tab) được chỉ rõ theo từng loại content | | |
| 7.2 | State (loading, empty, error) và empty state có copy/CTA rõ | | |
| 7.3 | Navigation (back, đóng drawer) không làm mất context user (ví dụ đang đọc trang X) | | |
| 7.4 | Component tách dùng lại được (embedded vs full page) được mô tả | | |
| 7.5 | Route mới và meta (auth, title) được liệt kê | | |

---

## 8. Migration & rollout

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 8.1 | Các phase migration được liệt kê (tạo model → data migration → cleanup) | | |
| 8.2 | Data migration script xử lý edge case (nhiều exam per lesson, null, v.v.) | | |
| 8.3 | Rollback plan rõ ràng (revert migration nào, data có bị mất không) | | |
| 8.4 | Điều kiện an toàn để chạy phase cleanup (verify production trước khi xóa cột) | | |
| 8.5 | Deprecation timeline (endpoint cũ dừng khi nào) nếu có | | |

---

## 9. Admin & vận hành

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 9.1 | Workflow tạo/sửa nội dung (admin) được mô tả từng bước | | |
| 9.2 | Import/export (CSV, template) có endpoint hoặc hướng dẫn | | |
| 9.3 | List display / filter / search trong admin phù hợp với model mới | | |

---

## 10. Tổng hợp & open questions

| # | Tiêu chí | Pass/Fail | Ghi chú |
|---|----------|-----------|---------|
| 10.1 | File/summary thay đổi (backend, frontend, migration) đủ để estimate effort | | |
| 10.2 | Open questions (nếu có) đã được trả lời hoặc ghi rõ "defer" | | |
| 10.3 | Không còn mâu thuẫn giữa các section (ví dụ API path khác nhau giữa 7.1 và 7.2) | | |

---

**Cách dùng:** Đi qua từng bảng, đánh Pass/Fail/N/A. Mọi Fail hoặc N/A cần giải thích nên ghi vào phần Critical hoặc Suggestion trong báo cáo PO.
