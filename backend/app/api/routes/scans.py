"""
Scan + repo listing routes.
Creating a scan enqueues a Celery job and returns the scan id immediately.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.api.schemas import (
    DependencyOut,
    FindingOut,
    RepoOut,
    ScanCreate,
    ScanDetailOut,
    ScanOut,
)
from app.core.database import get_db
from app.core.github import list_user_repos, parse_repo_url
from app.core.security import decrypt_token
from app.models import Dependency, Finding, FindingType, Scan, ScanStatus, User
from app.tasks.scan_tasks import run_scan

router = APIRouter(prefix="/api", tags=["scans"])


def _scan_out(db: Session, scan: Scan) -> ScanOut:
    dep_count = (
        db.query(func.count(Dependency.id)).filter(Dependency.scan_id == scan.id).scalar() or 0
    )
    finding_count = (
        db.query(func.count(Finding.id)).filter(Finding.scan_id == scan.id).scalar() or 0
    )
    vuln_count = (
        db.query(func.count(Finding.id))
        .filter(Finding.scan_id == scan.id, Finding.type == FindingType.vulnerability)
        .scalar()
        or 0
    )
    typo_count = (
        db.query(func.count(Finding.id))
        .filter(Finding.scan_id == scan.id, Finding.type == FindingType.typosquat)
        .scalar()
        or 0
    )
    return ScanOut(
        id=scan.id,
        repo_url=scan.repo_url,
        status=scan.status.value if hasattr(scan.status, "value") else str(scan.status),
        private_package_prefix=scan.private_package_prefix,
        project_type=scan.project_type,
        error_message=scan.error_message,
        created_at=scan.created_at,
        completed_at=scan.completed_at,
        dependency_count=int(dep_count),
        finding_count=int(finding_count),
        vulnerability_count=int(vuln_count),
        typosquat_count=int(typo_count),
    )


def _finding_out(finding: Finding) -> FindingOut:
    dep = finding.dependency
    return FindingOut(
        id=finding.id,
        type=finding.type.value if hasattr(finding.type, "value") else str(finding.type),
        severity=(
            finding.severity.value if hasattr(finding.severity, "value") else str(finding.severity)
        ),
        title=finding.title,
        description=finding.description,
        remediation=finding.remediation,
        dependency_id=finding.dependency_id,
        file_path=finding.file_path,
        line_number=finding.line_number,
        dependency_name=dep.name if dep else None,
        dependency_version=dep.version if dep else None,
    )


def _scan_detail(db: Session, scan: Scan) -> ScanDetailOut:
    base = _scan_out(db, scan)
    deps = (
        db.query(Dependency)
        .filter(Dependency.scan_id == scan.id)
        .order_by(Dependency.depth.asc(), Dependency.name.asc())
        .all()
    )
    findings = (
        db.query(Finding)
        .options(joinedload(Finding.dependency))
        .filter(Finding.scan_id == scan.id)
        .order_by(Finding.severity.asc(), Finding.title.asc())
        .all()
    )
    # Order severity critical→info manually (enum alpha order is wrong)
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    findings_sorted = sorted(
        findings,
        key=lambda f: (
            severity_rank.get(
                f.severity.value if hasattr(f.severity, "value") else str(f.severity), 9
            ),
            f.title,
        ),
    )
    return ScanDetailOut(
        **base.model_dump(),
        dependencies=deps,
        findings=[_finding_out(f) for f in findings_sorted],
    )


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
) -> ScanOut:
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

    run_scan.delay(str(scan.id))
    return _scan_out(db, scan)


@router.get("/scans", response_model=list[ScanOut])
def list_scans(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ScanOut]:
    scans = (
        db.query(Scan)
        .filter(Scan.user_id == user.id)
        .order_by(Scan.created_at.desc())
        .limit(50)
        .all()
    )
    return [_scan_out(db, s) for s in scans]


@router.get("/scans/{scan_id}", response_model=ScanDetailOut)
def get_scan(
    scan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ScanDetailOut:
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    return _scan_detail(db, scan)


@router.get("/scans/{scan_id}/dependencies", response_model=list[DependencyOut])
def get_scan_dependencies(
    scan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Dependency]:
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    return (
        db.query(Dependency)
        .filter(Dependency.scan_id == scan.id)
        .order_by(Dependency.depth.asc(), Dependency.name.asc())
        .all()
    )


@router.get("/scans/{scan_id}/findings", response_model=list[FindingOut])
def get_scan_findings(
    scan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FindingOut]:
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    findings = (
        db.query(Finding)
        .options(joinedload(Finding.dependency))
        .filter(Finding.scan_id == scan.id)
        .all()
    )
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    findings_sorted = sorted(
        findings,
        key=lambda f: (
            severity_rank.get(
                f.severity.value if hasattr(f.severity, "value") else str(f.severity), 9
            ),
            f.title,
        ),
    )
    return [_finding_out(f) for f in findings_sorted]
