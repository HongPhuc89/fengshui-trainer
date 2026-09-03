import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "db-backup-midnight": {
        "task": "core.backup_database",
        "schedule": crontab(hour=0, minute=0),   # 0h UTC (7h ICT)
    },
    "db-backup-noon": {
        "task": "core.backup_database",
        "schedule": crontab(hour=12, minute=0),  # 12h UTC (19h ICT)
    },
    "backfill-device-geo": {
        "task": "users.backfill_device_geo",
        "schedule": crontab(hour=17, minute=0),  # 17h UTC (0h ICT) daily
    },
    "flush-expired-tokens": {
        "task": "core.flush_expired_tokens",
        "schedule": crontab(hour=18, minute=0, day_of_week=0),  # weekly, Sun 18h UTC (1h ICT Mon)
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
