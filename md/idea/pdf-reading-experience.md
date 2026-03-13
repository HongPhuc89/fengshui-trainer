# PDF Reading Experience — Cải thiện trải nghiệm đọc sách

**Ngày đề xuất:** 2026-03-13
**Nguồn cảm hứng:** Market research — Kindle, Scribd, O'Reilly, pdf.js ecosystem, EdTech UX studies
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** M (V1) → L (V2)

---

## Vấn đề / Cơ hội

BookReaderView hiện tại của Thiên Thư đã hoạt động đúng chức năng cốt lõi — render PDF, watermark, progress, TOC, zoom — nhưng trải nghiệm đọc vẫn ở mức "functional", chưa đạt chuẩn "immersive" mà các platform sách học thuật lớn đang cung cấp.

Phong Thuỷ là lĩnh vực đòi hỏi đọc sâu, đọc lại nhiều lần, nghiên cứu so sánh giữa các chương. User học Phong Thuỷ cần highlight khái niệm, ghi chú lề, bookmark trang quan trọng, và tìm lại thông tin nhanh — những thứ hiện chưa có. Mỗi lần tắt app là mất toàn bộ context học tập.

Pain point cụ thể:

- Không có keyboard shortcuts → bất tiện trên desktop (target audience có dùng laptop).
- Không có dark mode / sepia → đọc ban đêm mỏi mắt.
- Không có text search trong trang hiện tại.
- Không có highlight / note → không thể lưu lại điểm quan trọng.
- Khi mất kết nối hoặc reload trang, user phải tìm lại từ đầu chương.
- Không có estimated reading time → user không biết chương này còn bao lâu nữa.
- Giao diện desktop chưa tận dụng không gian rộng (vẫn layout mobile-first).

**Note về architecture:** Mỗi chapter là 1 file PDF riêng biệt — đây là thiết kế **chủ ý** vì:
- Tải nhanh hơn (file nhỏ, load theo demand)
- Access control rõ ràng per-chapter (free / demo / purchased)
- Free user có thể đọc một số chapter miễn phí mà không expose toàn bộ sách
- Watermark per-user per-chapter được generate riêng (Celery + PyPDF2)

---

## Hiện trạng tính năng đọc PDF

**Đã có:**
- Render PDF qua `pdfjs-dist` trực tiếp lên `<canvas>` — ổn định, không cần iframe.
- Watermark động qua CSS `background-image` SVG tiled — nhẹ, không ảnh hưởng render.
- Watermark bên trong PDF (embedded khi generate per-user qua Celery + PyPDF2 + reportlab).
- Progress bar có thể drag + click để seek toàn cuốn sách (cross-chapter).
- TOC panel slide-in từ phải, hiển thị số chương + demo badge.
- Zoom 6 mức: 50% → 75% → 100% → 125% → 150% → 200%.
- Swipe trái/phải để chuyển trang (mobile touch).
- Resume reading — lưu `current_page` và `chapter_order` qua `UserChapterProgress` (auto-save sau 1.5s debounce).
- Training button khi chapter có flashcard/quiz.
- Page indicator `Trang X / Y` trong chương.
- Dark background (`#1a2035`) cho vùng reader — đã khá tốt cho ban đêm.
- Lazy loading chapter theo demand (không tải toàn sách một lần).
- Pre-generated PDF per user (watermark server-side, Celery task).
- Access control: Free / VIP / Purchased / Demo tại backend.

**Chưa có:**
- Dark mode toggle (sepia / trắng / đen) cho nội dung PDF.
- Text selection và copy (hiện dùng canvas thô, không có text layer).
- Highlight + ghi chú lề (annotation).
- Bookmark trang cụ thể (trong chương).
- Tìm kiếm text trong PDF.
- Keyboard shortcuts (ArrowLeft/Right, Space...).
- Estimated reading time per chapter / toàn sách.
- Pre-fetch chapter tiếp theo khi gần hết chương hiện tại.
- Font size control (chỉ áp dụng được nếu dùng HTML renderer, không áp dụng được với canvas PDF).
- Desktop layout tối ưu (split 2 cột: TOC luôn hiện bên trái + nội dung bên phải).
- Blur/ẩn nội dung khi tab mất focus (bảo vệ bản quyền, đã có trong plan F-I).
- Right-click prevention (đã có trong plan F-I).
- Offline reading (service worker / local cache).
- AI-powered features (tóm tắt chương, giải thích thuật ngữ).

---

## Gaps so với market standard

| Tính năng | Kindle | Scribd | O'Reilly | Thiên Thư hiện tại |
|---|---|---|---|---|
| Dark mode / Sepia | ✅ | ✅ | ✅ | ❌ |
| Font size adjustment | ✅ | ✅ | ✅ | ❌ (canvas PDF) |
| Text highlight | ✅ | ✅ | ✅ | ❌ |
| Bookmark trang | ✅ | ✅ | ✅ | ❌ |
| Ghi chú lề | ✅ | ✅ | ✅ | ❌ |
| Text search | ✅ | ✅ | ✅ | ❌ |
| Keyboard shortcuts | ❌ | ❌ | ✅ | ❌ |
| Estimated read time | ✅ | ✅ | ❌ | ❌ |
| Desktop sidebar TOC | ❌ | ❌ | ✅ | ❌ |
| Pre-fetch next chapter | ✅ | ✅ | ✅ | ❌ |
| Offline reading | ✅ (device) | ❌ | ✅ | ❌ |
| Progress tracking | ✅ | ✅ | ✅ | ✅ |
| Resume reading | ✅ | ✅ | ✅ | ✅ |
| Watermark DRM | ❌ | ❌ | ❌ | ✅ (mạnh hơn thị trường) |

---

## Đề xuất tính năng — Nhóm theo priority

### 🔴 V1 — Quick wins (< 1 tuần)

#### 1. Keyboard shortcuts cho navigation

- Mô tả: `ArrowLeft` / `ArrowRight` chuyển trang; `Space` / `Shift+Space` cuộn; `T` toggle TOC; `+` / `-` zoom. Bind onMounted, unbind onUnmounted, guard khi focus vào input.
- Impact: Rất cao với user desktop/laptop — đây là audience chính học Phong Thuỷ.
- Implementation hint: Pattern y hệt `FlashcardSession.vue` đã có (keyboard guard chuẩn). Thêm `Escape` để đóng TOC/zoom panel.
- Effort: 0.5 ngày.

#### 2. Estimated reading time per chapter

- Mô tả: Hiển thị "~X phút" dựa trên `page_count` của chương hiện tại. Tốc độ đọc trung bình: 1-2 phút/trang PDF học thuật → conservative estimate 2 phút/trang.
- Impact: Medium — giúp user plan session học tập ("Chương này còn 8 trang, khoảng 16 phút").
- Implementation hint: Frontend-only, computed từ `chapterPageCount - currentPage + 1` × 2 phút. Hiển thị trong topbar hoặc bottom nav. Không cần backend.
- Effort: 0.5 ngày.

#### 3. Desktop split-panel layout (TOC luôn visible)

- Mô tả: Trên `windowWidth >= 1024px`, TOC không cần mở panel overlay — hiển thị cố định bên trái (240px), PDF content bên phải. Tương tự pattern split-panel đã implement cho `FlashcardSession.vue` V1.5.
- Impact: Cao — UX desktop giống O'Reilly, tận dụng màn hình rộng, không cần thao tác thêm để xem TOC.
- Implementation hint: CSS grid `240px 1fr` khi `windowWidth >= 1024`. TOC column reuse `reader__toc-list` style. Dùng `useWindowSize` composable hoặc resize listener.
- Effort: 1 ngày.

#### 4. Blur content khi tab mất focus

- Mô tả: Khi browser tab bị background hoặc window bị minimize, canvas bị blur (`filter: blur(12px)`). Khôi phục khi tab active lại.
- Impact: Bảo vệ bản quyền — đã là F-I backlog item, reader là nơi quan trọng nhất để implement.
- Implementation hint: `document.addEventListener('visibilitychange')`. Thêm CSS class `.reader__canvas--blurred { filter: blur(12px); }`. Unmount listener onBeforeUnmount.
- Effort: 0.5 ngày.

#### 5. Right-click prevention trên canvas area

- Mô tả: Disable context menu trên `reader__content` và `reader__canvas-wrap`. Thêm `@contextmenu.prevent` trên template.
- Impact: Bảo vệ bản quyền — ngăn "Save image as..." qua canvas context menu.
- Implementation hint: `@contextmenu.prevent` trên div wrapper. Cũng disable `user-select: none` CSS trên toàn reader (đã có cơ bản với watermark overlay).
- Effort: 0.25 ngày.

---

### 🟡 V2 — Core improvements (1-2 tuần)

#### 1. Text Layer — cho phép select và copy text

- Mô tả: Enable `TextLayer` của pdf.js bên cạnh canvas hiện tại. User có thể select text trên trang, copy để tra cứu. Không enable annotation editor (để tránh phức tạp + vẫn bảo vệ bản quyền qua watermark).
- Impact: Rất cao — user học Phong Thuỷ cần tra cứu thuật ngữ Hán Nôm/cổ ngữ.
- Implementation hint: `pdfjsLib` hỗ trợ `renderTextLayer({ textContentSource, container, viewport })`. Cần thêm `<div class="textLayer">` positioned absolute over canvas, import `pdfjs-dist/web/pdf_viewer.css` hoặc custom CSS. Cần test tương tác với watermark overlay (z-index ordering: canvas → textLayer → watermark).
- Caveat: Text layer có thể conflict watermark overlay. Giải pháp: watermark `pointer-events: none` + `user-select: none` (đã có) — text layer đặt giữa canvas và watermark. Watermark vẫn hiện nhưng text dưới vẫn selectable.
- Effort: 2-3 ngày (implement + test cross-browser + mobile).

#### 2. Bookmark trang

- Mô tả: User nhấn icon bookmark ở topbar để lưu trang hiện tại. Danh sách bookmark hiển thị trong TOC panel (tab thứ 2). Tối đa 20 bookmarks per sách.
- Impact: Cao — user hay trở lại trang chứa bảng tra cứu, sơ đồ bát quái, etc.
- Implementation hint:
  - **Backend**: Thêm model `UserPageBookmark` (user, chapter FK, page_num, note_text optional). API: `POST /api/books/{slug}/bookmarks/`, `GET /api/books/{slug}/bookmarks/`, `DELETE /api/books/{slug}/bookmarks/{id}/`.
  - **Frontend**: Icon bookmark trong topbar (toggle trạng thái trang hiện tại). TOC panel có 2 tabs: "Mục lục" / "Bookmarks". Bookmark item click → navigate đến chapter + page.
- Effort: 3-4 ngày (backend model + API + frontend UI).

#### 3. Pre-fetch chapter tiếp theo

- Mô tả: Khi user còn 3 trang cuối của chương hiện tại, tự động load chapter tiếp theo vào background (không render, chỉ fetch và parse PDF). Khi user nhấn "Tiếp" → render ngay, không chờ download.
- Impact: Trải nghiệm mượt hơn đáng kể khi đọc liên tục nhiều chương.
- **Access control caveat**: Chỉ pre-fetch chapter tiếp theo nếu user **có quyền** với chapter đó. Kiểm tra `chapter.access_status` từ TOC data trước khi trigger pre-fetch. Nếu chapter tiếp theo là locked → không pre-fetch, chỉ hiện paywall khi navigate.
- Implementation hint: `pdfDoc` cho chapter kế tiếp stored trong `shallowRef(null)`. Trigger pre-fetch khi `currentPage >= chapterPageCount - 3`. Dùng `pdfjsLib.getDocument({ url }).promise` nhưng không `renderPage`. Khi navigate sang chapter tiếp → reuse `pdfDoc` đã cached.
- Effort: 1.5 ngày.

#### 4. In-chapter text search

- Mô tả: Search icon trong topbar → input search → highlight tất cả occurrences trên trang hiện tại → navigate prev/next match. Scope: **trong chapter hiện tại** (1 PDF file). Cross-chapter search là V3 riêng.
- Impact: Trung bình — quan trọng với tài liệu học thuật nhiều trang.
- **Tại sao giới hạn trong 1 chapter**: Mỗi chapter là 1 file PDF riêng, cross-chapter search cần backend index (phức tạp hơn nhiều). V2 chỉ cần client-side search trên file đang mở.
- Implementation hint: Cần TextLayer (V2.1 trước). Sau khi có text layer, dùng `page.getTextContent()` để extract text per page. Match với regex → highlight spans trong text layer. Navigation qua các match bằng scroll.
- Effort: 3 ngày (phụ thuộc TextLayer đã done).

#### 5. Reading mode themes (Sepia / White / Dark)

- Mô tả: Toggle màu nền canvas area: Dark (hiện tại `#1a2035`), Sepia (`#f4ecd8` background + PDF có thể filter `sepia(30%)`), Light (trắng). PDF vẫn render bình thường, chỉ đổi background wrapper + CSS filter nhẹ.
- Impact: Trung bình — quan trọng với user đọc nhiều giờ liên tục.
- Implementation hint: CSS variable `--reader-bg` apply lên `.reader__content`. CSS filter `sepia(25%) brightness(0.95)` cho canvas wrap khi sepia mode. State lưu vào localStorage để persist.
- Caveat: Watermark SVG cũng cần điều chỉnh opacity theo mode. Dark mode (hiện tại) giữ nguyên.
- Effort: 1 ngày.

---

### 🟢 V3 — Advanced (> 2 tuần)

#### 1. Highlight + Ghi chú lề (Annotation system)

- Mô tả: User select text (cần TextLayer từ V2) → popup toolbar (Highlight / Note) → lưu annotation vào backend với `page_num`, `rect coordinates`, `color`, `note_text`. Hiển thị lại annotations khi mở trang.
- Impact: Rất cao về engagement dài hạn — user tạo ra "học liệu cá nhân" trên nền sách.
- Implementation hint:
  - **Backend**: Model `UserAnnotation` (user, chapter, page_num, rect_json, color, note_text, created_at). API CRUD.
  - **Frontend**: Mouse-up event trên text layer → detect selection → show annotation toolbar. Overlay divs positioned over text layer để render highlights. Note popover.
- Complexity: Cao — coordinate system của pdf.js cần transform giữa PDF space và CSS space. Mobile select text cũng khó.
- Effort: 1.5-2 tuần.

#### 2. Cross-chapter text search

- Mô tả: Search toàn cuốn sách (tất cả chapters user có quyền access). Kết quả hiển thị theo chapter + page, click để navigate.
- Impact: Cao cho nhu cầu research/lookup.
- **Access control**: Chỉ search trong các chapters user được phép đọc (free chapters + purchased chapters). Không trả về snippet từ locked chapters.
- Implementation hint: Backend cần index text content (hoặc dùng `pdfminer` để extract text khi upload chapter). Store trong `BookChapter.text_content` (TextField). API: `GET /api/books/{slug}/search/?q=bát+quái` → trả về list `{chapter_order, page_num, snippet}` (filter theo quyền user). Backend query join với user's access status.
- Effort: 1 tuần (backend indexing + search API + frontend search modal).

#### 3. Offline reading (Service Worker)

- Mô tả: Cache PDF chapters đã mở vào IndexedDB. User có thể đọc các chương đã tải kể cả khi mất mạng.
- Impact: Trung bình cho web (quan trọng hơn cho Flutter mobile).
- Implementation hint: Vite PWA plugin + Workbox. Cache strategy: `CacheFirst` cho PDF files. Chỉ cache chapters user đã mở — không pre-download toàn sách.
- Caveat: PDF per-user đã watermarked → URL có thể có token signature → cần xử lý cache invalidation khi profile user thay đổi.
- Effort: 1 tuần.

#### 4. AI summary + keyword extraction per chapter

- Mô tả: Mỗi chương có panel "Tóm tắt AI" → gọi LLM API (OpenAI / Gemini) với text content của chương → trả về bullet points tóm tắt + danh sách thuật ngữ Phong Thuỷ với giải thích ngắn.
- Impact: Rất cao về giá trị học thuật — đặc biệt phù hợp với lĩnh vực Phong Thuỷ (nhiều thuật ngữ Hán Việt cổ).
- Implementation hint: Backend Celery task chạy sau khi admin upload chapter → extract text (pdfminer) → call LLM → store `BookChapter.ai_summary` và `BookChapter.glossary_json`. Frontend: tab thứ 3 trong TOC panel hoặc bottom sheet riêng.
- Effort: 2 tuần (LLM integration + prompt engineering cho Phong Thuỷ context).

#### 5. Social highlights — Phổ biến nhất

- Mô tả: Hiển thị những đoạn text được nhiều user highlight nhất (aggregated, anonymized). Tương tự feature "Popular Highlights" của Kindle.
- Impact: Tạo community learning — user mới nhìn thấy đoạn nào quan trọng.
- Caveat: Chỉ khả thi sau khi có annotation system (V3.1) và đủ user base.
- Effort: 0.5 tuần sau khi có V3.1.

---

## Inspiration từ market

**Kindle:**
- Estimated reading time per chapter là feature được mention nhiều nhất trong user reviews → đơn giản nhưng impact cao.
- Progress hiển thị theo "Time left in chapter" / "Time left in book" (không chỉ %) → giúp user plan session.
- Popular Highlights aggregated từ cộng đồng → tạo network effect cho content.
- Page Turn Animation (sliding effect) → cảm giác đọc sách thật.
- Font: Amazon Ember Bold + OpenDyslexic → accessibility.

**Scribd:**
- Clean white/sepia mode là default → khác với dark mode của Thiên Thư hiện tại.
- Progress bar theo % toàn sách (giống Thiên Thư đã có ✅).
- Offline download cho mobile app.

**O'Reilly Learning:**
- Desktop split-panel: TOC panel cố định bên trái → không cần toggle → rất tiện cho tài liệu kỹ thuật nhiều chương.
- Keyboard shortcuts `j`/`k` next/prev section → power user experience.
- In-page search với highlight + count → "12 matches found".
- Code copy button (không applicable cho Thiên Thư).

**Flexcil (EdTech PDF reader):**
- Gesture-based annotation: draw → auto-detect highlight vs. free draw.
- Note cards linked to annotation → study cards generated từ highlights.
- Phù hợp với FlashcardSession của Thiên Thư: annotation → auto-generate flashcard từ highlighted text là V3+ idea.

---

## Stack notes

**pdf.js (đang dùng `pdfjs-dist`):**
- TextLayer: `pdfjsLib.renderTextLayer({ textContentSource, container, viewport })` — cần import `TextLayer` từ `pdfjs-dist/web/pdf_viewer.css`.
- AnnotationLayer: available trong pdf.js nhưng phức tạp — skip cho V1-V2, chỉ cần V3.
- `page.getTextContent()` → extract raw text per page → dùng cho search và AI summary.
- Version hiện tại `pdfjs-dist` — kiểm tra trước khi implement TextLayer (API có thể khác nhau theo version).

**Vue.js pattern:**
- Keyboard handler pattern đã chuẩn từ `FlashcardSession.vue` — reuse.
- Desktop split-panel: CSS grid pattern đã chuẩn từ `FlashcardSession.vue` V1.5 — reuse.
- Window resize listener: onMounted / onUnmounted pattern.
- Bookmark state: Pinia store `useBookmarkStore` hoặc local reactive state + API sync.

**Django backend:**
- `UserPageBookmark` model cần migration nhỏ, không impact bất kỳ model hiện tại nào.
- `UserAnnotation` model phức tạp hơn — cần `rect_json` (tọa độ PDF space), `color`, `note_text`.
- Text content indexing: `pdfminer.six` hoặc `pypdf` để extract text khi admin upload chapter → store vào `BookChapter.text_content`.
- AI summary: dùng Celery task — không block upload flow.

**Watermark compatibility:**
- TextLayer cần z-index stack cẩn thận: `canvas (z:1)` → `textLayer (z:2, pointer-events:auto)` → `watermark overlay (z:3, pointer-events:none, user-select:none)`.
- Watermark vẫn hiển thị đầy đủ; text bên dưới vẫn selectable qua text layer.

---

## Open questions

- Font size control có khả thi với canvas render không? → Thực tế không — `pdfjs-dist` render PDF thành canvas, font size là của file PDF gốc. Chỉ zoom (đã có). Thay đổi thực sự cần HTML renderer (không phù hợp vì cần watermark bảo vệ).
- Có nên enable text select + copy không? → Rủi ro user copy toàn bộ nội dung. Mitigate: watermark embedded trong PDF gốc (đã có), disable right-click (V1.5), chỉ enable text layer trên purchased chapters.
- Bookmark lưu server hay localStorage? → Server (backend model) để sync across devices, phù hợp với device-lock architecture. Fallback localStorage nếu offline. Bookmark model cần `chapter` FK (không chỉ `book`) vì mỗi chapter là file riêng.
- Theme mode (light/dark/sepia) có ảnh hưởng đến watermark readability không? → Sepia mode cần adjust watermark opacity từ 0.18 lên 0.25 để vẫn visible trên nền vàng.
- Annotation system có ảnh hưởng đến DRM model không? → Không — annotations là overlay HTML, không modify PDF file gốc. PDF per-user (embedded watermark) vẫn giữ nguyên.

---

## Bước tiếp theo

- [ ] PO review và chọn scope V1 (keyboard shortcuts + estimated time + desktop layout là low-risk, high-impact)
- [ ] Quyết định có enable TextLayer (V2.1) không — đây là dependency của highlight và search
- [ ] Viết detail design cho V1 nếu được approve
- [ ] Test keyboard shortcuts trên Firefox / Safari / Edge (behavior khác Chrome)
- [ ] Benchmark TextLayer performance với PDF nhiều trang (>50 trang/chapter)
