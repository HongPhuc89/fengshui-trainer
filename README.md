# Quiz Game Backend API

Backend API cho ứng dụng Quiz Game được xây dựng với NestJS, TypeORM và PostgreSQL.

## Tính năng

- ✅ Đăng ký tài khoản bằng email/password (không cần verify email)
- ✅ Đăng nhập bằng email/password
- ✅ JWT Authentication với Access Token và Refresh Token
- ✅ 3 loại người dùng: Admin, Normal User, Staff
- ✅ Role-based access control (RBAC)
- ✅ Swagger API Documentation

## Yêu cầu

- Node.js >= 18.x
- PostgreSQL >= 12.x
- npm hoặc yarn

## Cài đặt

1. Clone repository và cài đặt dependencies:

```bash
cd quiz_game
npm install
```

2. Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

3. Cấu hình database và các biến môi trường trong file `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=quiz_game

JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-secret-key-here
REFRESH_TOKEN_EXPIRES_IN=30d

APP_PORT=3000
APP_PREFIX=api
APP_ENV=development
```

4. Tạo database:

```sql
CREATE DATABASE quiz_game;
```

5. Chạy migrations:

```bash
npm run migration:run
```

6. Tạo admin user:

```bash
npm run create:admin <email> <password> [full_name]
```

Ví dụ:

```bash
npm run create:admin admin@example.com password123 "Admin User"
```

7. Khởi động ứng dụng:

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại (cần authentication)
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Đăng xuất (cần authentication)

### Swagger Documentation

Sau khi khởi động server, truy cập:

- Swagger UI: http://localhost:3000/docs

## Cấu trúc dự án

```
quiz_game/
├── src/
│   ├── modules/
│   │   ├── auth/              # Module xác thực
│   │   ├── users/             # Module quản lý users
│   │   ├── user-credential/   # Module quản lý credentials
│   │   ├── core/              # Module cấu hình
│   │   └── typeorm/           # Module database
│   └── shares/                # Shared utilities
│       ├── decorators/        # Custom decorators
│       ├── guards/            # Auth guards
│       ├── helpers/           # Helper functions
│       └── enums/             # Enums
├── config/                    # Configuration files
├── datasource.ts             # TypeORM datasource
└── package.json
```

## User Roles

- **ADMIN**: Quản trị viên hệ thống
- **NORMAL_USER**: Người dùng thông thường (mặc định khi đăng ký)
- **STAFF**: Nhân viên

## Ví dụ sử dụng

### Đăng ký tài khoản

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "NORMAL_USER"  // Optional, mặc định là NORMAL_USER
}
```

### Đăng nhập

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Sử dụng token

```bash
GET /api/auth/me
Authorization: Bearer <access_token>
```

## License

UNLICENSED
