# Development Commands Guide

Hướng dẫn này cung cấp các lệnh tiện lợi để quản lý dự án Quiz Game.

## Hai cách sử dụng

### Cách 1: Sử dụng npm scripts (Khuyến nghị cho Windows)

Sử dụng trực tiếp npm scripts - hoạt động trên mọi hệ điều hành.

### Cách 2: Sử dụng Makefile (Yêu cầu make)

Sử dụng Makefile - cần cài đặt `make` (có sẵn trên Linux/Mac, hoặc qua Git Bash/WSL trên Windows).

---

## Cài đặt

**NPM:**

```bash
npm install
```

**Make:**

```bash
make install
```

## Development

### Chạy tất cả ứng dụng (Backend + Admin + Mobile)

**NPM:**

```bash
npm run dev
# hoặc
npm run dev:all
```

**Make:**

```bash
make dev
```

Lệnh này sẽ chạy đồng thời:

- **Backend** (NestJS): http://localhost:3000
- **Admin Dashboard** (React Admin): http://localhost:5173
- **Mobile App** (Expo): Expo DevTools

### Chạy từng ứng dụng riêng lẻ

**NPM:**

```bash
npm run dev:backend  # Chỉ chạy backend
npm run dev:admin    # Chỉ chạy admin dashboard
npm run dev:mobile   # Chỉ chạy mobile app
```

**Make:**

```bash
make backend  # Chỉ chạy backend
make admin    # Chỉ chạy admin dashboard
make mobile   # Chỉ chạy mobile app
```

## Build

**NPM:**

```bash
npm run build              # Build tất cả ứng dụng
npm run backend:build      # Build chỉ backend
```

**Make:**

```bash
make build         # Build tất cả ứng dụng
make build-backend # Build chỉ backend
```

## Code Quality

**NPM:**

```bash
npm run lint          # Chạy linter
npm run format        # Format code
npm run format:check  # Kiểm tra formatting
npm run test          # Chạy tests
```

**Make:**

```bash
make lint         # Chạy linter
make format       # Format code
make format-check # Kiểm tra formatting
make test         # Chạy tests
```

## Database

**NPM:**

```bash
npm run backend:migration:run       # Chạy migrations
npm run backend:migration:generate  # Tạo migration mới
npm run backend:create-admin        # Tạo admin user
```

**Make:**

```bash
make migration-run      # Chạy migrations
make migration-generate # Tạo migration mới
make create-admin       # Tạo admin user
```

## Utilities

**NPM:**

```bash
npm run clean  # Xóa node_modules và build artifacts
```

**Make:**

```bash
make clean # Xóa node_modules và build artifacts
make help  # Hiển thị tất cả commands
```

## Yêu cầu

- Node.js >= 18.0.0
- npm >= 9.0.0
- Make (tùy chọn - chỉ cần nếu dùng Makefile)

## Cài đặt Make trên Windows (Tùy chọn)

Nếu bạn muốn sử dụng Makefile:

1. **Git Bash**: Đã có sẵn khi cài Git for Windows
2. **Chocolatey**: `choco install make`
3. **WSL**: Sử dụng Windows Subsystem for Linux

## Lưu ý

- **Khuyến nghị**: Sử dụng npm scripts trên Windows để tránh vấn đề tương thích
- Turborepo sẽ tự động cache và tối ưu hóa các tasks
- Tất cả các lệnh dev chạy ở chế độ watch, tự động reload khi có thay đổi
- Lệnh `npm run dev` sẽ chạy cả 3 ứng dụng đồng thời nhờ Turborepo
