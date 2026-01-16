# Thiết kế tính năng Infographic cho Chapter

## 1. Tổng quan

Tính năng Infographic cho phép người dùng xem một tóm tắt bằng hình ảnh (dưới dạng file PDF) cho mỗi chương. Chức năng này sẽ tương tự như tính năng đọc file PDF của chương hiện tại.

Trên ứng dụng di động, nút "Sơ đồ" (Mindmap) sẽ được thay thế tạm thời bằng nút "Đồ họa" (Infographic).

## 2. Thay đổi Backend

### Data Model

Thêm trường `infographic_file_id` vào bảng `chapters`.

```typescript
// Chapter Entity
@Column({ name: 'infographic_file_id', nullable: true })
infographic_file_id: number | null;

@ManyToOne(() => UploadedFile, { nullable: true })
@JoinColumn({ name: 'infographic_file_id' })
infographic_file: UploadedFile | null;
```

### API

- Cập nhật `CreateChapterDto` và `UpdateChapterDto` để nhận `infographic_file_id`.
- Cập nhật `ChaptersService` để lưu trữ và trả về thông tin `infographic_file`.

## 3. Thay đổi Mobile (Flutter)

### Data Model

Cập nhật model `Chapter` để bao gồm `infographicFile`.

### Giao diện người dùng

- Trong `BottomMenuBar`, đổi nhãn từ "Sơ đồ" thành "**Đồ họa**".
- Thay đổi icon tương ứng (ví dụ: `Icons.image_outlined` hoặc `Icons.auto_awesome_mosaic`).

### Điều hướng và Hiển thị

- Khi nhấn vào nút "Đồ họa", ứng dụng sẽ mở `ChapterReadingPage` nhưng với chế độ hiển thị infographic.
- `ChapterReadingPage` sẽ nhận thêm tham số `isInfographic` để xác định file PDF nào cần tải (file chapter hay file infographic).

### 3.1 Cấu trúc Component dùng chung (Refactoring)

Để tối ưu code, tính năng Đọc sách và Đồ họa sẽ dùng chung một component `BasePdfViewer`.

- **Input:** `pdfUrl`, `title`, `themeColor`.
- **Logic:** Tự động xử lý tải, cache, zoom và quản lý trang.
- **Lợi ích:** Dễ dàng bảo trì và đồng bộ hóa các tính năng mới (như rotation hint) cho cả hai chế độ.

### 3.2 Gợi ý xoay màn hình (Rotation Hint)

Nhằm tối ưu trải nghiệm đọc PDF (vốn thường có khổ ngang rộng), ứng dụng sẽ tích hợp tính năng gợi ý xoay máy:

- **Giao diện:** Một Overlay mờ xuất hiện khi mở PDF ở chế độ dọc.
- **Nội dung:**
  - Icon/Animation điện thoại đang xoay.
  - Text: "Xoay ngang màn hình để đọc dễ hơn".
- **Tính năng "Không nhắc lại":**
  - Một checkbox nhỏ ở góc.
  - Trạng thái được lưu vào `SecureStorage` (key: `hide_rotation_hint`).
- **Tự động đóng:** Hint biến mất sau 3 giây hoặc khi người dùng thực hiện xoay máy.

## 4. Lựa chọn ngôn ngữ

- Tiếng Việt: **Đồ họa** (Ngắn gọn, phản ánh tính chất infographic).
- Thay thế cho: Sơ đồ (Mindmap).
