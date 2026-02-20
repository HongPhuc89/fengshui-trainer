# Infrastructure & Deployment

Tài liệu hạ tầng và hướng dẫn chạy dự án Thiên Thư (Feng Shui Trainer).

## Nội dung

| Tài liệu | Mô tả |
|----------|--------|
| [NATIVE-SETUP.md](NATIVE-SETUP.md) | Chạy backend **native** trên Ubuntu: Django, Celery, Redis (DB dùng Supabase) |

## Chạy bằng Docker

Dự án đã có sẵn Docker Compose trong thư mục `docker/`:

- **Web**: Gunicorn (port 8000) – production WSGI, không dùng runserver
- **celery_worker**: Celery worker
- **celery_beat**: Celery beat (periodic tasks)
- **db**: PostgreSQL 17
- **redis**: Redis (broker cho Celery)
- **mailpit**: SMTP + Web UI (dev)

```bash
cd docker
docker compose up -d
# Migrate
docker compose exec web python manage.py migrate
```

Chi tiết xem `docker/docker-compose.yml`.
