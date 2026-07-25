"""
Celery application — background worker that will run scans (Phase 1+).
Phase 0 only wires Redis; real scan tasks are added later.
"""

from celery import Celery

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
    # Autodiscover tasks in app.tasks package once we add them
    imports=("app.tasks.scan_tasks",),
)
