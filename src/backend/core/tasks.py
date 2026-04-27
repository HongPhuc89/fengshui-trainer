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
    """Create boto3 S3 client pointed at Supabase — same pattern as config/storage.py."""
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3",
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
        region_name=getattr(settings, "SUPABASE_REGION", "ap-southeast-1"),
    )


def _delete_old_backups(retention_days: int = 30):
    """Delete backups older than retention_days from Supabase Storage."""
    s3 = _s3_client()
    bucket = settings.SUPABASE_BACKUP_BUCKET
    resp = s3.list_objects_v2(Bucket=bucket, Prefix="db-backups/")
    objects = resp.get("Contents", [])
    if not objects:
        return

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    to_delete = [{"Key": obj["Key"]} for obj in objects if obj["LastModified"] < cutoff]
    if not to_delete:
        return

    keys = [obj["Key"] for obj in to_delete]
    logger.info("Deleting %d old backups: %s", len(keys), ", ".join(keys))
    # Supabase S3-compatible API does not support bulk delete_objects; delete one by one.
    for key in keys:
        s3.delete_object(Bucket=bucket, Key=key)
    logger.info("Deleted %d old backups", len(keys))


@shared_task(name="core.backup_database", bind=True, max_retries=2)
def backup_database(self):
    """
    Dump PostgreSQL database, gzip compress, upload to Supabase Storage.
    Deletes backups older than 30 days after upload.
    Only runs in production (APP_ENV=production).
    """
    if getattr(settings, "APP_ENV", "development") != "production":
        logger.info("Skipping backup: APP_ENV is not production.")
        return {"skipped": True, "reason": "not production"}

    app_env = getattr(settings, "APP_ENV", "development")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"db-backups/{app_env}/backup_{timestamp}.sql.gz"
    database_url = os.environ.get("DATABASE_URL", "")
    tmp_path = None
    compressed = None

    try:
        result = subprocess.run(
            ["pg_dump", "--no-password", "--no-owner", "--no-privileges", database_url],
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
