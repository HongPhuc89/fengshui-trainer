# 🔧 Fix Metro Bundler Cache Issue

## Vấn Đề

Metro bundler đang cache import path cũ của AuthContext

## Giải Pháp

### Option 1: Reload trong Terminal (Nhanh nhất)

1. Vào terminal đang chạy `npm run dev`
2. Press `r` để reload
3. Hoặc press `shift + r` để reload và clear cache

### Option 2: Restart với Clear Cache

```bash
# Stop dev server (Ctrl+C)
# Then run:
npm run dev -- --reset-cache
```

### Option 3: Manual Clear Cache

```bash
# Stop dev server
# Clear Metro cache
npx expo start -c

# Or for npm workspaces:
npm run dev -- -c
```

---

## ✅ Sau khi Clear Cache

App sẽ reload và import path sẽ đúng:

```typescript
// ✅ ĐÚNG
import { useAuth } from '../modules/shared/services/contexts/AuthContext';
```

Lỗi sẽ biến mất! 🎉
