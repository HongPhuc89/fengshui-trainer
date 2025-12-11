# 🧪 Test Profile API

## Backend Routes

Backend có global prefix `api`, nên routes sẽ là:

```
GET    http://localhost:3000/api/profile
PATCH  http://localhost:3000/api/profile
POST   http://localhost:3000/api/profile/avatar
DELETE http://localhost:3000/api/profile/avatar
```

## Quick Test

### 1. Check if ProfileController is loaded

```bash
# Restart backend để load ProfileController
cd apps/backend
npm run dev
```

Trong console sẽ thấy:

```
Application is running on: http://localhost:3000/api
```

### 2. Test với curl (cần JWT token)

```bash
# Get your JWT token first from login
TOKEN="your-jwt-token-here"

# Test GET /api/profile
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Check Swagger Docs

Mở browser: http://localhost:3000/docs

Tìm "Profile" endpoints trong Swagger UI

---

## ✅ Fix

ProfileController đã được tạo và add vào UsersModule rồi.

**Cần làm**: Restart backend server để load controller mới!

```bash
# In terminal running backend:
Ctrl + C

# Then:
npm run dev
```

Sau khi restart, API sẽ work! 🚀
