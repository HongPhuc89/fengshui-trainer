# Comment UI — Social Layer cho Books & Videos

**Ngày đề xuất:** 2026-03-26
**Nguồn cảm hứng:** Udemy (Q&A section), YouTube (comment section), Coursera (discussion forums)
**Độ ưu tiên gợi ý:** 🟡 Medium
**Effort ước tính:** S

---

## Vấn đề / Cơ hội

Backend `Comment` + `CommentReply` models đã **hoàn chỉnh** với GenericForeignKey (attach vào Book hoặc VideoLesson), CRUD APIs đã có và purchase verification đã implement. Nhưng **hoàn toàn không có UI** — người dùng không biết feature này tồn tại. Đây là "tính năng ẩn" có thể khai thác ngay với effort FE thấp.

Với nội dung Phong Thuỷ niche, **comment section chính là nơi cộng đồng hình thành**: học viên hỏi về ứng dụng thực tế, chia sẻ kinh nghiệm, thầy/admin trả lời → tạo ra sticky value mà không platform nào khác có.

## Ý tưởng tính năng

**Comment section trong BookReaderView và VideoPlayerView:**

```
💬 Thảo luận (12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Avatar] Nguyễn Văn A · 2 ngày trước
"Phần giải thích Cung Khảm thuộc Thủy rất hay,
 nhưng sao trong thực tế xem nhà lại thường..."

   ↳ [Avatar] Admin · 1 ngày trước
     "Đó là vì trong Trạch Nhật có phân biệt..."

[Avatar] Trần Thị B · 5 ngày trước
"Chương này có ví dụ minh họa nào không ạ?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Viết bình luận...]  [Gửi]
```

**Chi tiết UX:**
- Hiển thị trong tab "Thảo luận" (song song với tab "Tóm tắt" / "Transcript" trong VideoPlayer)
- Trong BookReader: drawer hoặc panel bên cạnh (desktop) / tab dưới (mobile)
- Comment gắn với: BookChapter cụ thể (đang đọc) hoặc VideoLesson cụ thể (đang xem)
- Chỉ user đã mua content mới comment được (backend đã enforce)
- Tên hiển thị theo `display_name` từ profile (ẩn số điện thoại)
- Reply: 1 level (comment → reply, không nested deeper)
- Pagination: load 10 comments, "Xem thêm" button

**Moderation (admin):**
- Django admin có thể xóa/ẩn comment (Jazzmin, đã có model)
- Flag nút "Báo cáo" (store report, không cần auto-action V1)

## Tại sao phù hợp với Thiên Thư

Cộng đồng học Phong Thuỷ **đang sống trên Facebook Groups và Zalo** — họ vừa học vừa hỏi cộng đồng. Nếu Thiên Thư có comment section chất lượng, nó kéo activity đó vào trong platform thay vì ra ngoài. Mỗi câu hỏi được admin trả lời là 1 piece of content free cho tất cả học viên khác → **network effect nhẹ**. Với niche knowledge, câu hỏi/trả lời thực tế còn valuable hơn nội dung course.

## Inspiration từ market

- **Udemy**: "Q&A" tab trên mỗi video lecture — instructor phải trả lời, tạo accountability
- **Coursera**: Discussion forums per-week — community-driven learning, upvote hệ thống
- **YouTube**: Comment section ngay dưới video — familiar UX pattern cho người dùng VN

## Scope gợi ý cho V1

- [ ] `comments.service.js` — `getComments(contentType, objectId)`, `postComment()`, `postReply()`, `deleteComment()`
- [ ] `CommentList.vue` — list comments + replies, pagination
- [ ] `CommentForm.vue` — textarea + submit, chỉ hiện nếu user đã mua
- [ ] `CommentItem.vue` — avatar + name + text + date + reply button + (nếu own) delete
- [ ] Tích hợp vào `VideoPlayerView.vue` — thêm "Thảo luận" tab (sau Summary/Transcript)
- [ ] Tích hợp vào `BookReaderView.vue` — thêm vào TrainingDrawer hoặc panel riêng

## Open questions

- Comment gắn theo Chapter/Lesson hay theo Book/Course tổng? Gợi ý: theo Chapter/Lesson (context cụ thể hơn)
- Avatar: dùng placeholder/initials nếu chưa có avatar upload? Gợi ý: vâng, dùng initials từ display_name
- Anonymous mode? Gợi ý: không, dùng display_name thật để accountability
- Comment hiển thị cho FREE user không? Gợi ý: có thể xem comment của demo chapters, nhưng không post

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-N-comment-ui.md`
- [ ] Verify: `GET /api/comments/` endpoint format, content_type choices (book_chapter / video_lesson)
