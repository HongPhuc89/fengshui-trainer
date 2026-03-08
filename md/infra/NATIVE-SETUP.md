# Native Setup Guide – Ubuntu (không Docker)

Hướng dẫn chạy backend Thiên Thư trên **Ubuntu**: Django, Celery, Redis. Database dùng **Supabase** (PostgreSQL managed), trên máy chỉ cài **Redis**.

---

## 1. Yêu cầu

- **Ubuntu** 20.04+ (hoặc WSL2 Ubuntu)
- **Python** 3.10+ (khuyến nghị 3.12)
- **Redis** 6+ (cho Celery broker)
- **Git**
- **Tài khoản Supabase** – dùng PostgreSQL trên cloud, không cài Postgres local

---

## 2. Cài đặt Redis (Ubuntu)

```bash
sudo apt update
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Kiểm tra:

```bash
redis-cli ping
# PONG
```

URL mặc định: `redis://localhost:6379/0`

---

## 3. Python & Virtual environment

### Cách 1: pip + requirements.txt

```bash
# Python 3.10+ (thường đã có sẵn)
python3 --version

cd /path/to/fengshui-trainer
python3 -m venv .venv
source .venv/bin/activate
pip install -r src/backend/requirements.txt
```

### Cách 2 (khuyến nghị): uv + lock file

Dùng [uv](https://docs.astral.sh/uv/) để lock chính xác version thư viện (có `pyproject.toml` và `uv.lock`):

```bash
# Cài uv (một lần): https://docs.astral.sh/uv/getting-started/installation/
curl -LsSf https://astral.sh/uv/install.sh | sh

cd /path/to/fengshui-trainer/src/backend
uv sync                    # cài đúng version trong uv.lock (reproducible)
# Hoặc từ repo root:
make sync                  # chạy uv sync trong src/backend
```

- **Thêm/sửa dependency**: sửa `pyproject.toml` rồi chạy `uv lock` (hoặc `make lock`). Commit cả `uv.lock`.
- **Nâng version tất cả**: `make lock-upgrade` rồi commit `uv.lock`.
- **CI/Docker dùng pip**: có thể dùng `requirements-lock.txt` (sinh từ lock): `make export-lock` rồi `pip install -r requirements-lock.txt`.

---

## 4. Database: Supabase

- Vào [Supabase](https://supabase.com) → tạo project → lấy **Connection string** (URI).
- Trong Dashboard: **Project Settings** → **Database** → **Connection string** → chọn **URI**.
- Format: `postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
- Nếu dùng direct connection (port 5432): `postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres`

Django dùng `postgres://` (hoặc `postgresql://`) đều được. Copy URI và thay `[YOUR-PASSWORD]` bằng mật khẩu database của project.

---

## 5. Biến môi trường (`.env`)

Tạo file `src/backend/.env`:

```bash
cd src/backend
cp .env.dev.example .env
nano .env   # hoặc editor bất kỳ
```

Nội dung tối thiểu:

```env
DEBUG=True
SECRET_KEY=your-secret-key-change-in-prod

# Supabase (PostgreSQL)
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

# Redis (local – bắt buộc cho Celery)
REDIS_URL=redis://localhost:6379/0
```

Lưu ý: Supabase dùng SSL; nếu lỗi kết nối, thử thêm `?sslmode=require` vào cuối `DATABASE_URL`.

---

## 6. Django: migrate & chạy server

```bash
cd src/backend
python manage.py migrate
python manage.py createsuperuser   # optional
```

**Development (local):** dùng `runserver` – nhanh, tự reload; Django sẽ hiện cảnh báo *"Do not use it in a production setting"*, có thể bỏ qua khi dev.

```bash
python manage.py runserver 0.0.0.0:8000
```

**Production / bỏ cảnh báo:** dùng **Gunicorn** (WSGI server):

```bash
pip install gunicorn   # đã có trong requirements.txt
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2
```

API: http://localhost:8000  
Admin: http://localhost:8000/admin/

---

## 7. Celery (Worker + Beat)

Mở **2 terminal** (cùng `cd src/backend` và đã `source .venv/bin/activate`).

**Terminal 1 – Worker:**

```bash
cd src/backend
celery -A config worker -l info
```

**Terminal 2 – Beat (nếu có periodic tasks):**

```bash
cd src/backend
celery -A config beat -l info
```

---

## 8. Systemd Services — Chạy tự động khi reboot VPS

Cách trên (mở terminal thủ công) chỉ phù hợp khi dev. Trên **VPS production**, cần đăng ký Gunicorn và Celery như **systemd services** để:
- Tự khởi động sau khi VPS reboot
- Tự restart nếu process crash
- Quản lý log tập trung qua `journalctl`

### 8.1 Cài đặt nhanh bằng script

Service files đã có sẵn trong repo tại `infra/systemd/`. Chạy script cài đặt:

```bash
# Trên VPS, từ thư mục gốc repo:
sudo bash infra/install-services.sh
```

Script sẽ tự động:
1. Tạo thư mục log `/var/log/fengshui/`
2. Copy 3 service files vào `/etc/systemd/system/`
3. `daemon-reload` → enable → start tất cả services
4. In status để kiểm tra

### 8.2 Service files (tham khảo)

Các file nằm trong `infra/systemd/`:

| File | Mô tả |
|------|-------|
| `fengshui-gunicorn.service` | Django WSGI server, bind `127.0.0.1:8000` |
| `fengshui-celery-worker.service` | Celery task worker |
| `fengshui-celery-beat.service` | Celery periodic scheduler |

Tất cả đọc env từ `/srv/fengshui/.env` và chạy dưới user `fengshui`.

### 8.3 Kiểm tra trạng thái

```bash
sudo systemctl status fengshui-gunicorn
sudo systemctl status fengshui-celery-worker
sudo systemctl status fengshui-celery-beat
```

### 8.4 Lệnh quản lý thường dùng

| Mục đích | Lệnh |
|----------|------|
| Xem status | `sudo systemctl status fengshui-gunicorn` |
| Restart sau deploy | `sudo systemctl restart fengshui-gunicorn fengshui-celery-worker fengshui-celery-beat` |
| Xem log realtime | `sudo journalctl -u fengshui-gunicorn -f` |
| Xem log file | `tail -f /var/log/fengshui/gunicorn-error.log` |
| Stop tạm thời | `sudo systemctl stop fengshui-gunicorn` |
| Disable auto-start | `sudo systemctl disable fengshui-gunicorn` |

---

## 9. Tóm tắt lệnh (Ubuntu, Native)

| Thành phần    | Lệnh / Ghi chú |
|---------------|----------------|
| Redis         | `sudo systemctl start redis-server` (tự enable sẵn khi cài) |
| Django (dev)  | `cd src/backend && python manage.py runserver 0.0.0.0:8000` |
| Django (prod) | `sudo systemctl start fengshui-gunicorn` |
| Celery Worker | `sudo systemctl start fengshui-celery-worker` |
| Celery Beat   | `sudo systemctl start fengshui-celery-beat` |
| Database      | Supabase (cloud), không chạy Postgres local |
| Deploy mới    | `make deploy` (Ansible) hoặc git pull + `systemctl restart` thủ công |

---

## 10. Troubleshooting

- **`connection refused` (Redis)**  
  Kiểm tra: `redis-cli ping`. Đảm bảo `REDIS_URL=redis://localhost:6379/0` trong `.env`.

- **Lỗi kết nối Supabase**  
  Kiểm tra `DATABASE_URL` (password, host, port). Thử thêm `?sslmode=require` vào cuối URI. Trong Supabase Dashboard: **Database** → **Connection string** → dùng đúng URI (Transaction pooler 6543 hoặc Session 5432).

- **Celery không nhận task**  
  Worker và Beat dùng cùng `REDIS_URL`. Restart worker sau khi sửa code task.

- **`ModuleNotFoundError`**  
  Đảm bảo đã `pip install -r requirements.txt` và đang trong venv (`source .venv/bin/activate`).

---

*Cập nhật: 2026-03-08*
