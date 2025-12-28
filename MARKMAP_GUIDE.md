# Hướng Dẫn Sử Dụng Markmap cho Mind Map

## 📝 Tổng Quan

Hệ thống Mind Map đã được cập nhật để sử dụng **Markmap** - một thư viện tạo mind map từ Markdown. Điều này giúp việc tạo và chỉnh sửa mind map trở nên đơn giản và trực quan hơn.

## ✨ Tính Năng Mới

### 1. **Markdown Editor trong Admin**

- Giao diện editor markdown đơn giản, dễ sử dụng
- Live preview với Markmap
- Hỗ trợ cú pháp markdown chuẩn

### 2. **Markmap Rendering trong Mobile**

- Hiển thị mind map tương tác với Markmap
- Hỗ trợ zoom, pan, và collapse/expand nodes
- Tự động chuyển đổi từ cấu trúc JSON cũ sang markdown (backward compatible)

## 🎯 Cách Sử Dụng

### Trong Admin Dashboard

1. **Tạo Mind Map Mới:**
   - Vào trang Chapter Detail
   - Chọn tab "Mind Map"
   - Click "Create Mind Map"
   - Nhập markdown content trong editor
   - Xem preview real-time ở tab "Preview"
   - Click "Create" để lưu

2. **Cú Pháp Markdown:**

```markdown
# Chủ Đề Chính

## Nhánh 1

- Điểm 1.1
- Điểm 1.2
  - Chi tiết 1.2.1
  - Chi tiết 1.2.2

## Nhánh 2

- Điểm 2.1
  - Chi tiết 2.1.1
- Điểm 2.2

## Nhánh 3

- Điểm 3.1
- Điểm 3.2
  - Chi tiết 3.2.1
```

**Quy Tắc:**

- `#` = Chủ đề chính (root node)
- `##` = Nhánh chính (main branches)
- `###` hoặc `-` = Nhánh phụ (sub-branches)
- Indent với spaces để tạo hierarchy

3. **Ví Dụ Mind Map Phong Thủy:**

```markdown
# Ngũ Hành (Five Elements)

## Mộc (Wood)

- Màu sắc: Xanh lá
- Hướng: Đông
- Tính chất
  - Sinh trưởng
  - Phát triển
  - Sáng tạo

## Hỏa (Fire)

- Màu sắc: Đỏ
- Hướng: Nam
- Tính chất
  - Nhiệt tình
  - Năng động
  - Sáng sủa

## Thổ (Earth)

- Màu sắc: Vàng
- Hướng: Trung tâm
- Tính chất
  - Ổn định
  - Nuôi dưỡng
  - Bao dung

## Kim (Metal)

- Màu sắc: Trắng
- Hướng: Tây
- Tính chất
  - Cứng rắn
  - Quyết đoán
  - Chính xác

## Thủy (Water)

- Màu sắc: Đen/Xanh dương
- Hướng: Bắc
- Tính chất
  - Linh hoạt
  - Thông minh
  - Bí ẩn
```

### Trong Mobile App

1. **Xem Mind Map:**
   - Mở chapter detail
   - Tap vào nút "Mind Map"
   - Mind map sẽ hiển thị với Markmap

2. **Tương Tác:**
   - **Zoom:** Pinch to zoom in/out
   - **Pan:** Drag để di chuyển
   - **Expand/Collapse:** Tap vào node để mở rộng/thu gọn

## 🔧 Chi Tiết Kỹ Thuật

### Backend Changes

1. **Entity Update:**
   - Thêm field `markdown_content` (text, nullable) vào bảng `mindmaps`

2. **DTOs Update:**
   - `CreateMindMapDto`: Thêm `markdown_content?: string`
   - `UpdateMindMapDto`: Thêm `markdown_content?: string`
   - `MindMapResponseDto`: Thêm `markdown_content?: string`

3. **Migration:**
   - File: `1734752400000-AddMarkdownContentToMindmaps.ts`
   - Chạy: `npm run migration:run`

### Admin Changes

1. **Component:**
   - File: `apps/admin/src/components/MindMapTab.tsx`
   - Markdown editor với tabs (Editor/Preview)
   - Live preview sử dụng Markmap autoloader CDN

2. **Features:**
   - Markdown syntax highlighting
   - Real-time preview
   - Validation

### Mobile Changes

1. **Component:**
   - File: `apps/mobile/app/mindmap/[chapterId].tsx`
   - WebView rendering với Markmap
   - Backward compatibility với JSON structure

2. **Dependencies:**
   - `react-native-webview`: ^13.12.2
   - Markmap libraries loaded via CDN trong WebView

## 📊 Backward Compatibility

Hệ thống tự động chuyển đổi từ cấu trúc JSON cũ sang markdown:

```typescript
const convertStructureToMarkdown = (structure: any): string => {
  // Convert centerNode to # heading
  // Convert nodes to ## and - bullets
  // Maintain hierarchy
};
```

## 🎨 Customization

### Màu Sắc Markmap

Trong mobile app, màu sắc được tự động assign theo depth:

```typescript
color: (node) => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  return colors[node.depth % colors.length];
};
```

### Markmap Options

```typescript
{
  duration: 500,        // Animation duration
  maxWidth: 300,        // Max node width
  paddingX: 20,         // Horizontal padding
  autoFit: true,        // Auto-fit on load
  zoom: true,           // Enable zoom
  pan: true,            // Enable pan
}
```

## 🐛 Troubleshooting

### Admin Preview không hiển thị

- Kiểm tra markdown syntax
- Đảm bảo có kết nối internet (CDN)
- Xem console log trong browser

### Mobile không render

- Kiểm tra `react-native-webview` đã cài đặt
- Rebuild app: `expo prebuild --clean`
- Kiểm tra markdown_content có tồn tại

### Migration lỗi

```bash
# Rollback
npm run migration:revert

# Run lại
npm run migration:run
```

## 📚 Resources

- [Markmap Documentation](https://markmap.js.org/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Markmap Examples](https://markmap.js.org/repl)

## 🚀 Next Steps

1. **AI Generation:** Tự động tạo markdown từ chapter content
2. **Templates:** Thêm templates có sẵn cho các chủ đề phổ biến
3. **Export:** Xuất mind map ra PNG/SVG
4. **Collaborative Editing:** Chỉnh sửa real-time nhiều người

---

**Lưu Ý:** Hệ thống vẫn lưu cả `structure` (JSON) và `markdown_content` để đảm bảo backward compatibility. Ưu tiên sử dụng `markdown_content` nếu có.
