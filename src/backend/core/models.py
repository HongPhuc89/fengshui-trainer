from django.db import models


class DatabaseBackupProxy(models.Model):
    """Unmanaged proxy model — no DB table. Used only to mount the admin backup page."""

    class Meta:
        managed = False
        verbose_name = "Database Backup"
        verbose_name_plural = "Database Backups"
        app_label = "core"
