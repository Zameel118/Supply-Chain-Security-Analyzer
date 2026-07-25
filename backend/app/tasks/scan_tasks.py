"""
Celery tasks for repository scans.

Phase 3 pipeline:
  validate repo → parse deps → OSV vulnerability scan → persist findings
"""

from datetime import datetime, timezone
from uuid import UUID

from app.core.database import SessionLocal
from app.core.github import fetch_repo, parse_repo_url
from app.core.security import decrypt_token
from app.models import Scan, ScanStatus, User
from app.services.dependency_persist import persist_dependencies
from app.services.dependency_scan import collect_dependencies
from app.services.finding_persist import persist_vulnerability_findings
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.scan_tasks.ping")
def ping() -> str:
    """Simple health check that the worker is consuming jobs."""
    return "pong"


@celery_app.task(name="app.tasks.scan_tasks.run_scan", bind=True, max_retries=2)
def run_scan(self, scan_id: str) -> dict:
    """Background job: manifests → dependencies → OSV vulns → findings."""
    db = SessionLocal()
    try:
        scan = db.get(Scan, UUID(scan_id))
        if scan is None:
            return {"error": "scan_not_found", "scan_id": scan_id}

        scan.status = ScanStatus.running
        scan.error_message = None
        scan.completed_at = None
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
        repo_meta = fetch_repo(token, owner, repo)
        default_branch = repo_meta.get("default_branch") or "main"

        parsed, files_used = collect_dependencies(token, owner, repo, default_branch)
        persist_dependencies(db, scan, parsed)

        # Re-load scan so findings attach to the same row after persist commit
        db.refresh(scan)
        findings = persist_vulnerability_findings(db, scan)

        scan.status = ScanStatus.complete
        scan.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {
            "status": "complete",
            "scan_id": scan_id,
            "repo": f"{owner}/{repo}",
            "dependency_count": len(parsed),
            "finding_count": len(findings),
            "files": files_used,
        }
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
