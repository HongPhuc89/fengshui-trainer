# YouTube-to-Lesson Auto-Import Pipeline

**Ngày đề xuất:** 2026-06-11
**Nguồn cảm hứng:** Admin workflow thực tế — import nội dung từ YouTube Trung Quốc về Kỳ Môn/Phong Thủy
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** L

---

## Vấn đề / Cơ hội

Tạo bài giảng mới hiện tại là thủ công: admin upload video lên Bunny Stream, tự dịch nội dung, copy paste transcript. Với nguồn content Trung Quốc phong phú trên YouTube (Kỳ Môn, Phong Thủy, Mệnh Lý), việc tự động hóa bước download → transcript → dịch có thể cắt 80-90% thời gian onboarding nội dung mới.

## Ý tưởng tính năng

Admin nhập YouTube URL (1 video hoặc cả playlist) vào Django admin. Hệ thống tự động:
1. Download audio MP3 từ YouTube (yt-dlp)
2. Upload audio lên Gemini File API
3. Gọi Gemini `generateContent` với prompt đóng vai chuyên gia dịch Kỳ Môn → trả về transcript song ngữ (Trung → Việt) kèm timestamp
4. Tạo draft `VideoLesson` với `description` = nội dung dịch, admin review và publish

Toàn bộ pipeline chạy bất đồng bộ qua Celery task. Admin theo dõi trạng thái (Pending → Processing → Done / Failed) ngay trên Django admin.

## Tại sao phù hợp với Thiên Thư

- **Niche content**: Hầu hết nội dung chất lượng về Kỳ Môn Độn Giáp đang ở YouTube Trung Quốc — đây là con đường thực tế nhất để scale content
- **Prompt đã chuẩn**: Admin đã có prompt dịch thuật được tested trên gemini.google.com, chỉ cần wrap vào API call
- **Stack sẵn**: Celery + Redis đã có, Gemini API đơn giản (REST/SDK), yt-dlp là Python library
- **Không thay đổi frontend**: Kết quả là draft VideoLesson bình thường, không cần thêm UI mới

## Feasibility Assessment

### ✅ Hoàn toàn khả thi về kỹ thuật

| Bước | Tool | Giới hạn | Đánh giá |
|------|------|----------|----------|
| Download audio | `yt-dlp` Python lib | N/A | ✅ Dễ — 5-10 dòng code |
| Convert MP3 | FFmpeg (via yt-dlp postprocessor) | Cần FFmpeg trong Docker | ✅ Add vào Dockerfile |
| Upload audio | Gemini File API | Max 20MB inline / dùng File API nếu lớn hơn | ✅ Hỗ trợ MP3, tối đa 9.5h audio/request |
| Transcript + Dịch | `gemini-2.5-flash` | ~32 tokens/giây audio | ✅ Video 1h ≈ 115K tokens — rẻ |
| Background job | Celery + Redis | Redis đã có | ✅ Pattern đã dùng ở `videos/tasks.py` |
| Admin UI | Django admin custom action | — | ✅ Jazzmin hỗ trợ custom action |

### ⚠️ Rủi ro cần lưu ý

1. **YouTube ToS**: yt-dlp vi phạm ToS của YouTube (cấm download) — không phải vi phạm luật, nhưng Google có thể block IP/account. **Mitigation**: Chỉ dùng để import nội dung vào platform (nội bộ admin), không phân phối file MP3 thô.

2. **Bản quyền nội dung**: Cần kiểm tra creator video có cho phép reuse không. **Mitigation**: Admin cần xác nhận quyền trước khi import. Thêm checkbox "Tôi xác nhận đã được phép sử dụng nội dung này" trong UI.

3. **Rate limit Gemini API**: Free tier ~15 req/min, có thể gặp 429 khi xử lý playlist lớn. **Mitigation**: Celery task throttle + exponential backoff.

4. **File size YouTube audio**: Video dài (>2-3h) sẽ có file MP3 >20MB — phải dùng Gemini File API (upload trước, lấy URI). **Mitigation**: Luôn dùng File API thay vì inline, tránh edge case.

5. **Chất lượng Gemini transcript**: Gemini không phải Whisper — với audio tiếng Trung chất lượng thấp hoặc có tiếng ồn nền, accuracy có thể kém. **Mitigation**: Admin review bắt buộc trước khi publish.

## Inspiration từ market

- **Descript, Otter.ai**: Auto-transcript nhưng không có domain-specific translation
- **Gemini gemini.google.com**: Chính xác flow user đang dùng thủ công, chỉ cần automate
- **Custom AI pipelines**: Nhiều EdTech startup đang dùng Gemini/GPT-4 + yt-dlp để tạo course content (trend 2025-2026)

## Scope gợi ý cho V1

- [ ] `VideoLesson.import_source_url` field (YouTube URL, nullable)
- [ ] `VideoLesson.import_status` field (PENDING / PROCESSING / DONE / FAILED)
- [ ] `VideoLesson.raw_transcript` TextField (bản dịch thô từ Gemini — admin tham khảo)
- [ ] Celery task `import_youtube_lesson(lesson_id)`: download MP3 → Gemini transcript+translate → lưu kết quả
- [ ] Django admin custom action "Import từ YouTube" trên VideoLesson — nhận URL, tạo draft lesson, trigger task
- [ ] Admin hiển thị `import_status` + link "Xem transcript" trên detail page
- [ ] Gemini system prompt hardcode trong settings (GEMINI_TRANSCRIPT_PROMPT)
- [ ] FFmpeg trong Dockerfile (nếu chưa có)

**Out of scope V1:**
- Playlist bulk import (làm sau khi single video ổn định)
- Progress bar realtime trong admin
- Edit transcript trong admin trước khi publish

## Open questions

- Video YouTube có cần đăng ký Gemini API key riêng cho production không? (free tier đủ dùng lúc đầu?)
- Nên lưu file MP3 tạm vào đâu: `/tmp` (xóa sau khi xong) hay Supabase bucket?
- Transcript Gemini trả về có nên lưu vào `VideoLesson.description` thẳng, hay cần field riêng `raw_transcript` để admin có thể edit trước khi dùng?
- Playlist import: có muốn tạo cả `VideoCourse` tự động không, hay chỉ từng `VideoLesson` rời?

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-33-youtube-import-pipeline.md`
