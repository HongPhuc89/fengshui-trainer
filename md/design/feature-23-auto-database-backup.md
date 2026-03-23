# Feature 23 — Auto Database Backup to Supabase Storage

**Ngày:** 2026-03-23
**Scope:** Tự động backup PostgreSQL database lên Supabase Storage 2 lần/ngày, có thể trigger thủ công từ Django Admin.

---

## Tóm tắt

Tận dụng **Celery Beat** (đã có sẵn) để schedule backup định kỳ. `pg_dump` đã available trong container (`postgresql-client` đã install trong Dockerfile). Backup file được nén gzip rồi upload lên **Supabase Storage** qua **boto3 S3-compatible API** — cùng pattern với avatar upload hiện tại (`config/storage.py`). Admin có thể trigger backup thủ công từ trang Django Admin.

---

## Yêu cầu

| # | Yêu cầu | Ghi chú |
|---|---|---|
| 1 | Auto backup 2 lần/ngày | 0h và 12h UTC |
| 2 | Upload lên Supabase Storage | Bucket `db-backups` (private, tách riêng với `media`) |
| 3 | Backup file được nén | `.sql.gz` để giảm dung lượng |
| 4 | Manual trigger từ Django Admin | Button "Backup Now" trong admin page |
| 5 | Retention: giữ tối đa 30 ngày | Tự động xóa backup cũ hơn 30 ngày |
| 6 | Hoạt động trong Docker | `DATABASE_URL` env var đã có sẵn |
| 7 | Hoạt động trong production | `DATABASE_URL` trỏ localhost native PostgreSQL |

---

## Kiến trúc

```
Celery Beat (scheduler)
    ├─ 0h UTC → task: backup_database
    └─ 12h UTC → task: backup_database

Django Admin (manual)
    └─ Button "Backup Now" → gọi backup_database.delay()

Task: backup_database
    ├─ 1. subprocess: pg_dump (từ DATABASE_URL)
    ├─ 2. gzip compress → file .sql.gz
    ├─ 3. boto3 put_object → Supabase S3 bucket "db-backups"
    ├─ 4. xóa file temp local
    └─ 5. xóa backup cũ > 30 ngày (list_objects + delete_objects)
```

---

## Database — Không cần model mới

Không cần thêm model. Backup history log qua Django logging / Sentry (đã có sẵn).

---

## Backend

### 1. Env vars mới

Chỉ cần thêm **1 env var** — các biến S3 (`SUPABASE_PROJECT_REF`, `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY`, `SUPABASE_REGION`) đã có sẵn.

Thêm vào `docker/.env` và production `.env`:

```env
SUPABASE_BACKUP_BUCKET=db-backups
```

### 2. Django Settings — `config/settings.py`

```python
# Thêm vào sau SUPABASE_STORAGE_BUCKET
SUPABASE_BACKUP_BUCKET = env("SUPABASE_BACKUP_BUCKET", default="db-backups")
```

### 3. Celery Task — `core/tasks.py`

Dùng lại pattern `_s3_client()` giống hệt `config/storage.py`:

```python
import gzip
import logging
import os
import subprocess
import tempfile
from datetime import datetime, timezone, timedelta

import boto3
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


def _s3_client():
    """Tạo boto3 S3 client trỏ tới Supabase — giống config/storage.py."""
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3",
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
        region_name=getattr(settings, "SUPABASE_REGION", "ap-southeast-1"),
    )


def _delete_old_backups(retention_days: int = 30):
    """Xóa backup cũ hơn retention_days ngày."""
    s3 = _s3_client()
    bucket = settings.SUPABASE_BACKUP_BUCKET

    resp = s3.list_objects_v2(Bucket=bucket, Prefix="backup_")
    objects = resp.get("Contents", [])
    if not objects:
        return

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    to_delete = [
        {"Key": obj["Key"]}
        for obj in objects
        if obj["LastModified"] < cutoff
    ]
    if not to_delete:
        return

    keys = [obj["Key"] for obj in to_delete]
    logger.info("Deleting %d old backups: %s", len(keys), ", ".join(keys))
    s3.delete_objects(Bucket=bucket, Delete={"Objects": to_delete})
    logger.info("Deleted %d old backups", len(keys))


@shared_task(name="core.backup_database", bind=True, max_retries=2)
def backup_database(self):
    """
    Dump PostgreSQL database, nén gzip, upload lên Supabase Storage.
    Xóa backup cũ hơn 30 ngày.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql.gz"
    database_url = os.environ.get("DATABASE_URL", "")
    tmp_path = None

    try:
        result = subprocess.run(
            ["pg_dump", "--no-password", database_url],
            capture_output=True,
            timeout=300,
        )
        if result.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {result.stderr.decode()}")

        compressed = gzip.compress(result.stdout, compresslevel=6)

        with tempfile.NamedTemporaryFile(suffix=".sql.gz", delete=False) as tmp:
            tmp.write(compressed)
            tmp_path = tmp.name

        _s3_client().put_object(
            Bucket=settings.SUPABASE_BACKUP_BUCKET,
            Key=filename,
            Body=compressed,
            ContentType="application/gzip",
        )
        logger.info("Database backup uploaded: %s (%.1f KB)", filename, len(compressed) / 1024)

        _delete_old_backups(retention_days=30)

    except Exception as exc:
        logger.error("Backup failed: %s", exc)
        raise self.retry(exc=exc, countdown=60)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return {"filename": filename, "size_kb": round(len(compressed) / 1024, 1)}
```

### 4. Celery Beat Schedule — `config/celery.py`

```python
from celery.schedules import crontab

app.conf.beat_schedule.update({
    "db-backup-midnight": {
        "task": "core.backup_database",
        "schedule": crontab(hour=0, minute=0),   # 0h UTC
    },
    "db-backup-noon": {
        "task": "core.backup_database",
        "schedule": crontab(hour=12, minute=0),  # 12h UTC
    },
})
```

### 5. Django Admin — Manual Trigger

**Proxy model** (không tạo DB table) — `core/models.py`:

```python
class DatabaseBackupProxy(models.Model):
    """Proxy model không có table, chỉ dùng để mount trang admin."""
    class Meta:
        managed = False
        verbose_name = "Database Backup"
        verbose_name_plural = "Database Backups"
        app_label = "core"
```

**Admin class** — `core/admin.py`:

```python
from django.contrib import admin, messages
from django.shortcuts import redirect
from .models import DatabaseBackupProxy
from .tasks import backup_database


@admin.register(DatabaseBackupProxy)
class DatabaseBackupAdmin(admin.ModelAdmin):
    change_list_template = "admin/core/backup_list.html"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        if request.method == "POST" and "trigger_backup" in request.POST:
            backup_database.delay()
            self.message_user(request, "Backup đã được đưa vào queue.", messages.SUCCESS)
            return redirect(".")
        return super().changelist_view(request, extra_context)
```

**Template** — `src/backend/templates/admin/core/backup_list.html`:

```html
{% extends "admin/base_site.html" %}
{% block content %}
<h1>Database Backup</h1>
<p>Backup tự động chạy lúc <strong>0h UTC</strong> và <strong>12h UTC</strong> mỗi ngày.</p>
<p>Backup được lưu trên Supabase Storage bucket <code>db-backups</code>, giữ tối đa 30 ngày.</p>

<form method="post">
  {% csrf_token %}
  <button type="submit" name="trigger_backup"
    style="background:#417690;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;font-size:14px;">
    ▶ Backup Now
  </button>
</form>

<p style="margin-top:1rem;color:#666;font-size:13px;">
  Backup chạy async trong Celery Worker. Kiểm tra Celery log hoặc Sentry để xem kết quả.
</p>
{% endblock %}
```

---

## Checklist setup Supabase Storage

1. Vào Supabase Dashboard → **Storage**
2. Tạo bucket `db-backups`, chọn **Private**
3. Không cần key mới — dùng lại `SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY` đã có
4. Thêm vào `.env`: `SUPABASE_BACKUP_BUCKET=db-backups`

---

## Lưu ý Production

App và database đều chạy **native** (không qua Docker). `pg_dump` gọi thẳng tới `localhost` mà không cần cấu hình Docker network.

```env
# Production .env
DATABASE_URL=postgres://postgres:<password>@localhost:5432/fengshui_prod
```

Không cần thay đổi `docker-compose.yml` cho production.

---

## Files cần tạo/sửa

| File | Thay đổi |
|---|---|
| `docker/.env` + production `.env` | Thêm `SUPABASE_BACKUP_BUCKET=db-backups` |
| `config/settings.py` | Thêm `SUPABASE_BACKUP_BUCKET` setting |
| `config/celery.py` | Thêm 2 beat schedule entries |
| `core/tasks.py` | Thêm task `backup_database` + helpers |
| `core/models.py` | Thêm `DatabaseBackupProxy` |
| `core/admin.py` | Register `DatabaseBackupAdmin` |
| `templates/admin/core/backup_list.html` | Tạo mới template |

---

## Out of scope

- Restore từ backup (thủ công qua `psql`)
- Backup history log trong DB
- Notification khi backup thất bại (Sentry đã catch)
- Encryption backup file
