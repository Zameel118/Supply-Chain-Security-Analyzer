"""
Periodic re-scan of previously inspected GitHub repos.

Enabled via PERIODIC_RESCAN_ENABLED=true. Celery beat enqueues this on an interval;
the task creates a new Scan per (user, repo) whose last completed scan is older
than PERIODIC_RESCAN_MIN_AGE_HOURS, then hands work to run_scan.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models import Scan, ScanStatus, User
from app.tasks.celery_app import celery_app
from app.tasks.scan_tasks import run_scan


@celery_app.task(name="app.tasks.periodic_rescan.enqueue_due_rescans")
def enqueue_due_rescans() -> dict[str, Any]:
    settings = get_settings()
    if not settings.periodic_rescan_enabled:
        return {"skipped": True, "reason": "periodic_rescan_disabled"}

    min_age = timedelta(hours=max(1, settings.periodic_rescan_min_age_hours))
    cutoff = datetime.now(timezone.utc) - min_age

    db = SessionLocal()
    queued: list[str] = []
    try:
        # Latest completed scan per (user_id, repo_url)
        latest_completed = (
            db.query(
                Scan.user_id.label("user_id"),
                Scan.repo_url.label("repo_url"),
                func.max(Scan.completed_at).label("last_completed"),
            )
            .filter(Scan.status == ScanStatus.complete, Scan.completed_at.isnot(None))
            .group_by(Scan.user_id, Scan.repo_url)
            .all()
        )

        for row in latest_completed:
            if row.last_completed is None or row.last_completed > cutoff:
                continue

            # Skip if a scan is already queued/running for this pair
            in_flight = (
                db.query(Scan.id)
                .filter(
                    Scan.user_id == row.user_id,
                    Scan.repo_url == row.repo_url,
                    Scan.status.in_([ScanStatus.queued, ScanStatus.running]),
                )
                .first()
            )
            if in_flight:
                continue

            user = db.get(User, row.user_id)
            if user is None or not user.access_token:
                continue

            prior = (
                db.query(Scan)
                .filter(
                    Scan.user_id == row.user_id,
                    Scan.repo_url == row.repo_url,
                    Scan.status == ScanStatus.complete,
                )
                .order_by(Scan.completed_at.desc())
                .first()
            )
            if prior is None:
                continue

            scan = Scan(
                user_id=row.user_id,
                repo_url=row.repo_url,
                status=ScanStatus.queued,
                current_phase="queued",
                private_package_prefix=prior.private_package_prefix,
                project_type=prior.project_type or "commercial",
            )
            db.add(scan)
            db.commit()
            db.refresh(scan)
            run_scan.delay(str(scan.id))
            queued.append(str(scan.id))

        return {"queued": len(queued), "scan_ids": queued}
    finally:
        db.close()
