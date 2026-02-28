# PO — Hướng dẫn đề xuất tính năng (Feature Proposal)

Dùng khi user muốn **đề xuất tính năng** hoặc nhờ PO cho ý kiến về ý tưởng. PO giúp cấu trúc đề xuất và đặt câu hỏi làm rõ, chưa cần có detail design.

---

## Template đề xuất tính năng (draft)

Đề xuất user/PO cùng điền (hoặc PO điền dựa trên mô tả của user):

```markdown
# Đề xuất: [Tên tính năng]

## 1. Vấn đề / Bối cảnh
- Ai gặp vấn đề? (user type, persona)
- Vấn đề cụ thể là gì? (pain point, limitation hiện tại)
- Tại sao cần giải quyết bây giờ?

## 2. Mục tiêu
- Kết quả mong muốn (outcome) sau khi có tính năng
- Có thể đo lường không? (metric, hoặc cách verify thành công)

## 3. Phạm vi đề xuất (v1)
- In scope: làm gì trong phiên bản đầu
- Out of scope: không làm gì / defer sang v2

## 4. Giải pháp high-level (ý tưởng)
- Mô tả ngắn cách giải quyết (1–2 đoạn)
- Có ảnh hưởng đến kiến trúc/UX hiện tại không?

## 5. Open questions / Cần làm rõ
- Câu hỏi PO hoặc team cần trả lời trước khi viết detail design
```

---

## Câu hỏi PO nên đặt khi đề xuất tính năng

- **Vấn đề:** "Ai cụ thể gặp vấn đề này? Có data/feedback nào chứng minh không?"
- **Phạm vi:** "v1 chỉ làm X có đủ giá trị không? Tại sao không làm thêm Y ngay?"
- **Rủi ro:** "Có phụ thuộc bên ngoài (API, team khác) không? Migration có ảnh hưởng data hiện tại không?"
- **Ưu tiên:** "So với các feature khác trong backlog, tính năng này ưu tiên thế nào?"
- **Thành công:** "Làm sao biết feature thành công? (metric, feedback, NPS...)"

---

## Output PO sau khi xử lý đề xuất

1. **Tóm tắt đề xuất** — 1–2 đoạn, đủ để ai chưa đọc cũng hiểu ý tưởng.
2. **Draft cấu trúc** — Điền template trên (có thể để trống phần chưa rõ).
3. **Feedback PO** — Điểm hợp lý, điểm cần làm rõ, rủi ro, gợi ý thu hẹp/mở rộng scope.
4. **Khuyến nghị bước tiếp theo:**
   - **Tiến tới detail design** — Đủ rõ để viết doc thiết kế chi tiết.
   - **Làm rõ thêm** — Liệt kê câu hỏi cần trả lời trước.
   - **Thu hẹp scope trước** — Đề xuất v1 nhỏ hơn, ít rủi ro hơn.

---

## Ví dụ cách user gọi

- "Tôi muốn đề xuất tính năng: cho phép user export báo cáo ra PDF, PO cho ý kiến giúp."
- "Ý tưởng: thêm chế độ luyện tập mindmap cho chapter sách. PO giúp làm rõ phạm vi và câu hỏi cần trả lời."
- "Đề xuất feature X — [mô tả ngắn]. Làm giúp tôi draft đề xuất và câu hỏi PO cần hỏi."
