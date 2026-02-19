# Thiên Thư (Feng Shui Trainer) - Source Code

Đây là thư mục chứa toàn bộ mã nguồn của dự án Thiên Thư, được tổ chức theo mô hình Monorepo.

## Cấu trúc thư mục

```text
src/
├── backend/    # Django REST Framework (API & Management)
├── frontend/   # Vue.js Web Application
└── mobile/     # Flutter Mobile Application
```

## Hướng dẫn nhanh cho Backend

### 1. Cài đặt môi trường
Sử dụng Virtual Environment (venv) nằm trong `src/backend/`:
```bash
cd src/backend
source .venv/bin/activate
pip install -r requirements.txt # Nếu có
```

### 2. Chạy Server
```bash
python manage.py runserver
```

---
*Cập nhật: 2026-02-20*
