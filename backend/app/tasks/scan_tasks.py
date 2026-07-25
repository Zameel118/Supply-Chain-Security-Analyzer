"""
Celery tasks for repository scans.

Phase 1: validate the repo is reachable via GitHub API, then mark complete.
Later phases plug parsers / OSV / typosquat / etc. into run_scan().
"""

from datetime import datetime, timezone
from uuid import UUID

from app.core.database import SessionLocal
from app.core.github import fetch_repo, parse_repo_url
from app.core.security import decrypt_token
from app.models import Scan, ScanStatus, User
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.scan_tasks.ping")
def ping() -> str:
    """Simple health check that the worker is consuming jobs."""
    return "pong"


@celery_app.task(name="app.tasks.scan_tasks.run_scan", bind=True, max_retries=2)
def run_scan(self, scan_id: str) -> dict:
    """
    Background job for one Scan row.
    Phase 1 only confirms the repo exists; analysis arrives in Phases 2–7.
    """
    db = SessionLocal()
    try:
        scan = db.get(Scan, UUID(scan_id))
        if scan is None:
            return {"error": "scan_not_found", "scan_id": scan_id}

        scan.status = ScanStatus.running
        scan.error_message = None
        db.commit()

        user = db.get(User, scan.user_id)
        if user is None or not user.access_token:
            scan.status = ScanStatus.failed
            scan.error_message = "User or GitHub token missing"
            scan.completed_at = datetime.now(timezone.utc)
            db.commit()
            return {"error": "no_token", "scan_id": scan_id}

        token = decrypt_token(user.access_token)
        owner, repo = parse_repo_url(scan.repo_url)
        fetch_repo(token, owner, repo)

        # Phase 1 placeholder success — Phase 2 will parse dependencies here
        scan.status = ScanStatus.complete
        scan.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "complete", "scan_id": scan_id, "repo": f"{owner}/{repo}"}
    except Exception as exc:
        db.rollback()
        scan = db.get(Scan, UUID(scan_id))
        if scan is not None:
            scan.status = ScanStatus.failed
            scan.error_message = str(exc)[:2000]
            scan.completed_at = datetime.now(timezone.utc)
            db.commit()
        return {"error": str(exc), "scan_id": scan_id}
    finally:
        db.close()
