# 🎉 Mobile App Đang Chạy!

## ✅ Trạng Thái

- ✅ **Backend**: Đang compile (có một số lỗi TypeScript trong test files nhưng không ảnh hưởng)
- ✅ **Mobile App**: Đang chạy trên Expo
- ✅ **API Integration**: Đã setup hoàn chỉnh
- ✅ **Environment**: Đã cấu hình

## 📱 Cách Test App

### Option 1: Test trên Web (Nhanh nhất)

```bash
# Trong terminal mobile app, nhấn:
w
```

Hoặc mở browser: http://localhost:8081

### Option 2: Test trên điện thoại (Expo Go)

1. Cài đặt **Expo Go** app từ:
   - iOS: App Store
   - Android: Google Play Store

2. Quét QR code trong terminal

### Option 3: Test trên Android Emulator

```bash
# Trong terminal mobile app, nhấn:
a
```

## 🧪 Test API Integration

### 1. Mở API Test Screen

Trong app, navigate đến route: `/api-test`

Hoặc thêm vào navigation của bạn:

```typescript
import ApiTestScreen from './app/api-test';

// Trong navigation
<Stack.Screen name="api-test" component={ApiTestScreen} />
```

### 2. Test Authentication

Screen sẽ hiển thị:

- ✅ Authentication status
- ✅ Login button (test credentials: test@example.com / password123)
- ✅ Logout button
- ✅ User info khi đã login

### 3. Test Books API

Screen sẽ tự động:

- ✅ Fetch danh sách books từ backend
- ✅ Hiển thị loading state
- ✅ Hiển thị error nếu backend chưa chạy
- ✅ Có nút Refresh để refetch data

### 4. Kiểm Tra API URL

Screen hiển thị:

- API URL: http://localhost:3000
- Environment: development

## 🔧 Troubleshooting

### Nếu không kết nối được backend:

1. **Kiểm tra backend có chạy không:**

```bash
curl http://localhost:3000/api
```

2. **Nếu test trên điện thoại thật:**
   - Backend phải chạy trên cùng mạng WiFi
   - Thay đổi API URL trong `.env`:

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.X:3000
   ```

   (Thay X bằng IP máy tính của bạn)

3. **Restart Expo:**

```bash
# Nhấn r trong terminal để reload
# Hoặc Ctrl+C và chạy lại npm start
```

### Nếu có lỗi import:

1. **Clear cache:**

```bash
npx expo start -c
```

2. **Reinstall dependencies:**

```bash
rm -rf node_modules
npm install
```

## 📖 Sử Dụng API trong Screens Khác

### Example 1: Login Screen

```typescript
import { useAuth } from '@/modules/shared/services/hooks';

function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
      // Navigate to home
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return <LoginForm onSubmit={handleLogin} loading={isLoading} />;
}
```

### Example 2: Books List Screen

```typescript
import { useBooks } from '@/modules/shared/services/hooks';

function BooksScreen() {
  const { books, isLoading, refetch } = useBooks();

  return (
    <FlatList
      data={books}
      renderItem={({ item }) => <BookCard book={item} />}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    />
  );
}
```

### Example 3: Quiz Screen

```typescript
import { useQuiz } from '@/modules/shared/services/hooks';

function QuizScreen({ bookId, chapterId }) {
  const { startQuiz, submitQuiz, currentAttempt } = useQuiz(bookId, chapterId);

  // See full example in:
  // modules/shared/services/examples/QuizScreen.example.tsx
}
```

## 📚 Tài Liệu

- **[Hướng Dẫn Sử Dụng](./modules/shared/services/HUONG_DAN_SU_DUNG.md)** - Quick start
- **[API Services](./modules/shared/services/api/README.md)** - API docs
- **[React Hooks](./modules/shared/services/hooks/README.md)** - Hooks docs
- **[Examples](./modules/shared/services/examples/README.md)** - Complete examples

## 🎯 Next Steps

1. ✅ Test API Test Screen
2. ✅ Verify backend connection
3. ✅ Test login/logout
4. ✅ Test books fetching
5. ⬜ Create your own screens using the hooks
6. ⬜ Implement navigation
7. ⬜ Add more features

## 🚀 Commands Reference

### Mobile App

```bash
npm start          # Start Expo
npm run android    # Open Android
npm run ios        # Open iOS
npm run web        # Open Web
```

### Backend

```bash
npm run dev        # Start backend in watch mode
npm run build      # Build backend
npm run start:prod # Start production
```

## 💡 Tips

1. **Hot Reload**: Code changes sẽ tự động reload
2. **Debug Menu**: Shake device hoặc Cmd+D (iOS) / Cmd+M (Android)
3. **Console Logs**: Xem trong terminal hoặc browser console
4. **Network Requests**: Sử dụng React Native Debugger hoặc Flipper

---

**App đang chạy tại:**

- Web: http://localhost:8081
- Expo: exp://192.168.1.4:8081
- API: http://localhost:3000

**Nhấn `w` trong terminal để mở web browser!** 🌐
