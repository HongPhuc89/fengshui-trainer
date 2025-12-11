# 🚀 Quick Start Guide - User Profile System

## ✅ Backend Implementation - COMPLETE!

Em đã implement xong toàn bộ backend cho User Profile System theo đúng design! 🎉

---

## 📋 Những Gì Đã Làm

### 1. Database ✅

- Tạo bảng `user_profiles` với date_of_birth, gender, avatar_file_id
- Thêm type `avatar` vào FileType enum
- Migration đã chạy thành công
- Tạo default profiles cho users hiện có

### 2. Backend Code ✅

- **ProfileService**: getProfile, updateProfile, uploadAvatar, deleteAvatar
- **ProfileController**: GET/PATCH/POST/DELETE endpoints
- **SupabaseService**: uploadFile, deleteFile, getSignedUrl
- **Validation**: Age 13-120, file type JPEG/PNG, max 1MB, 400x400px

### 3. Upload Flow ✅ (ĐÚNG THEO YÊU CẦU)

```
1. Upload file mới lên Supabase ✨
2. Tạo record mới trong DB ✨
3. Update profile link ✨
4. Xóa file cũ (soft delete) ✨
```

---

## ⚠️ CẦN LÀM NGAY (Supabase Setup)

### Tạo Bucket `avatars` trong Supabase

1. Vào Supabase Dashboard: https://supabase.com/dashboard
2. Chọn project của anh
3. Vào **Storage** → **Create a new bucket**
4. Tạo bucket mới:
   - **Name**: `avatars`
   - **Public**: ❌ NO (private bucket)
   - **File size limit**: 1MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`

5. Tạo RLS Policies (Optional, nhưng recommended):

```sql
-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own avatar
CREATE POLICY "Users can read own avatar"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 🧪 Test API Ngay

### 1. Get Profile

```bash
GET http://localhost:3000/profile
Authorization: Bearer <your-token>
```

### 2. Update Profile

```bash
PATCH http://localhost:3000/profile
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "full_name": "Tùng Net",
  "date_of_birth": "1990-05-15",
  "gender": "male"
}
```

### 3. Upload Avatar (cần file 400x400, max 1MB)

```bash
POST http://localhost:3000/profile/avatar
Authorization: Bearer <your-token>
Content-Type: multipart/form-data

file: <chọn file ảnh 400x400>
```

### 4. Delete Avatar

```bash
DELETE http://localhost:3000/profile/avatar
Authorization: Bearer <your-token>
```

---

## 📱 Next: Mobile Implementation

Khi anh sẵn sàng, em sẽ implement mobile UI:

### Cần làm:

1. ProfileScreen - Hiển thị thông tin + avatar
2. EditProfileScreen - Form edit profile
3. Avatar upload flow với image picker + cropper
4. Date picker cho ngày sinh
5. Gender dropdown

### Libraries cần cài:

```bash
npm install react-native-image-crop-picker date-fns
```

---

## 📝 Important Notes

1. **File Size**: Đã set max 1MB theo yêu cầu của anh ✅
2. **Upload Flow**: Upload mới TRƯỚC, xóa cũ SAU ✅
3. **Soft Delete**: Dùng `deleted_at` để có thể khôi phục ✅
4. **Dimensions**: Validate 400x400px bằng sharp ✅

---

## 🎯 Summary

✅ **Backend**: HOÀN THÀNH 100%

- Database migration ✅
- Entities & DTOs ✅
- Services & Controllers ✅
- Upload flow đúng ✅
- Soft delete ✅
- Error handling ✅

⏳ **Mobile**: Chưa bắt đầu

- Chờ anh confirm để em implement

🔧 **Cần làm ngay**: Tạo bucket `avatars` trong Supabase

---

Anh test thử API xem có work không nhé! Nếu có vấn đề gì em sẽ fix ngay! 😊
