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

## 4. Lựa chọn ngôn ngữ

- Tiếng Việt: **Đồ họa** (Ngắn gọn, phản ánh tính chất infographic).
- Thay thế cho: Sơ đồ (Mindmap).
