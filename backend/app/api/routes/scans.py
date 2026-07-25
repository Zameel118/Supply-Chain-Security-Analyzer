"""
Scan + repo listing routes.
Creating a scan enqueues a Celery job and returns the scan id immediately.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import RepoOut, ScanCreate, ScanOut
from app.core.database import get_db
from app.core.github import list_user_repos, parse_repo_url
from app.core.security import decrypt_token
from app.models import Scan, ScanStatus, User
from app.tasks.scan_tasks import run_scan

router = APIRouter(prefix="/api", tags=["scans"])


@router.get("/repos", response_model=list[RepoOut])
def get_repos(user: User = Depends(get_current_user)) -> list[dict]:
    if not user.access_token:
        raise HTTPException(status_code=400, detail="No GitHub token on file — please log in again")
    token = decrypt_token(user.access_token)
    try:
        repos = list_user_repos(token)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {exc}") from exc

    return [
        {
            "full_name": r["full_name"],
            "html_url": r["html_url"],
            "private": r.get("private", False),
            "description": r.get("description"),
            "language": r.get("language"),
            "updated_at": r.get("updated_at"),
        }
        for r in repos
    ]


@router.post("/scans", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
def create_scan(
    body: ScanCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Scan:
    # Normalize / validate the URL shape early (existence check happens in the worker)
    try:
        owner, repo = parse_repo_url(body.repo_url)
        normalized = f"https://github.com/{owner}/{repo}"
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    scan = Scan(
        user_id=user.id,
        repo_url=normalized,
        status=ScanStatus.queued,
        private_package_prefix=body.private_package_prefix or None,
        project_type=body.project_type,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Hand off to Celery — do not run the scan inside this HTTP request
    run_scan.delay(str(scan.id))
    return scan


@router.get("/scans", response_model=list[ScanOut])
def list_scans(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Scan]:
    return (
        db.query(Scan)
        .filter(Scan.user_id == user.id)
        .order_by(Scan.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/scans/{scan_id}", response_model=ScanOut)
def get_scan(
    scan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Scan:
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
