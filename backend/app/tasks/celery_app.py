"""
Celery application — Redis broker for scan workers + optional beat schedule.
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "supply_chain_analyzer",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    imports=(
        "app.tasks.scan_tasks",
        "app.tasks.periodic_rescan",
    ),
    beat_schedule={
        "enqueue-due-rescans": {
            "task": "app.tasks.periodic_rescan.enqueue_due_rescans",
            # Hourly tick; the task enforces PERIODIC_RESCAN_ENABLED + min age.
            "schedule": crontab(minute=0),
            "options": {"expires": 3500},
        },
    },
)
