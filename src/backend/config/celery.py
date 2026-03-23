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
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
