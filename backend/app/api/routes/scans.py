"""
Scan + repo listing routes for Quaywatch.
"""

from __future__ import annotations

import logging
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.api.schemas import (
    ActivityEventOut,
    DependencyOut,
    FindingOut,
    RepoOut,
    ScanCreate,
    ScanDetailOut,
    ScanDiffOut,
    ScanOut,
    ShareToggleOut,
)
from app.core.config import get_settings
from app.core.database import get_db
from app.core.github import list_user_repos, parse_repo_url
from app.core.rate_limit import enforce_rate_limit
from app.core.security import decrypt_token
from app.models import Dependency, Finding, FindingSeverity, FindingType, Scan, ScanStatus, User
from app.tasks.scan_tasks import run_scan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["scans"])


def _finding_key(finding: Finding) -> str:
    dep_name = finding.dependency.name if finding.dependency else ""
    ftype = finding.type.value if hasattr(finding.type, "value") else str(finding.type)
    return f"{ftype}|{dep_name}|{finding.title}".lower()


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
    confusion_count = (
        db.query(func.count(Finding.id))
        .filter(Finding.scan_id == scan.id, Finding.type == FindingType.dep_confusion)
        .scalar()
        or 0
    )
    cicd_count = (
        db.query(func.count(Finding.id))
        .filter(Finding.scan_id == scan.id, Finding.type == FindingType.cicd)
        .scalar()
        or 0
    )
    secret_count = (
        db.query(func.count(Finding.id))
        .filter(Finding.scan_id == scan.id, Finding.type == FindingType.secret)
        .scalar()
        or 0
    )
    license_count = (
        db.query(func.count(Finding.id))
        .filter(Finding.scan_id == scan.id, Finding.type == FindingType.license)
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
        current_phase=scan.current_phase,
        public_share_token=scan.public_share_token,
        created_at=scan.created_at,
        completed_at=scan.completed_at,
        dependency_count=int(dep_count),
        finding_count=int(finding_count),
        vulnerability_count=int(vuln_count),
        typosquat_count=int(typo_count),
        dep_confusion_count=int(confusion_count),
        cicd_count=int(cicd_count),
        secret_count=int(secret_count),
        license_count=int(license_count),
    )


def _finding_out(finding: Finding, *, is_new: bool = False) -> FindingOut:
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
        is_new=is_new,
    )


def _compute_diff(db: Session, scan: Scan, findings: list[Finding]) -> ScanDiffOut:
    previous = (
        db.query(Scan)
        .filter(
            Scan.user_id == scan.user_id,
            Scan.repo_url == scan.repo_url,
            Scan.id != scan.id,
            Scan.status == ScanStatus.complete,
            Scan.created_at < scan.created_at,
        )
        .order_by(Scan.created_at.desc())
        .first()
    )
    if previous is None:
        return ScanDiffOut(
            previous_scan_id=None,
            new_count=len(findings),
            resolved_count=0,
            known_count=0,
            new_finding_ids=[f.id for f in findings],
            resolved_titles=[],
        )

    prev_findings = (
        db.query(Finding)
        .options(joinedload(Finding.dependency))
        .filter(Finding.scan_id == previous.id)
        .all()
    )
    prev_keys = {_finding_key(f): f for f in prev_findings}
    curr_keys = {_finding_key(f): f for f in findings}

    new_ids = [f.id for k, f in curr_keys.items() if k not in prev_keys]
    resolved = [f.title for k, f in prev_keys.items() if k not in curr_keys]
    known = len(curr_keys) - len(new_ids)

    return ScanDiffOut(
        previous_scan_id=previous.id,
        new_count=len(new_ids),
        resolved_count=len(resolved),
        known_count=max(known, 0),
        new_finding_ids=new_ids,
        resolved_titles=resolved[:20],
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
    diff = _compute_diff(db, scan, findings_sorted)
    new_set = set(diff.new_finding_ids)
    return ScanDetailOut(
        **base.model_dump(),
        dependencies=deps,
        findings=[_finding_out(f, is_new=f.id in new_set) for f in findings_sorted],
        diff=diff,
    )


def _badge_label(db: Session, scan: Scan) -> tuple[str, str]:
    """Return (label, fill_color) for SVG badge."""
    critical = (
        db.query(func.count(Finding.id))
        .filter(
            Finding.scan_id == scan.id,
            Finding.severity == FindingSeverity.critical,
        )
        .scalar()
        or 0
    )
    high = (
        db.query(func.count(Finding.id))
        .filter(Finding.scan_id == scan.id, Finding.severity == FindingSeverity.high)
        .scalar()
        or 0
    )
    total = (
        db.query(func.count(Finding.id)).filter(Finding.scan_id == scan.id).scalar() or 0
    )
    if scan.status != ScanStatus.complete:
        return "SCANNING", "#F59E0B"
    if critical:
        return f"{critical} CRITICAL", "#F87171"
    if high:
        return f"{high} HIGH", "#FB923C"
    if total:
        return f"{total} FLAGGED", "#FBBF24"
    return "CLEARED", "#34D399"


@router.get("/repos", response_model=list[RepoOut])
def get_repos(user: User = Depends(get_current_user)) -> list[dict]:
    if not user.access_token:
        raise HTTPException(status_code=400, detail="No GitHub token on file — please log in again")
    token = decrypt_token(user.access_token)
    try:
        repos = list_user_repos(token)
    except Exception:
        logger.exception("GitHub list_user_repos failed for user_id=%s", user.id)
        raise HTTPException(
            status_code=502,
            detail="GitHub API error — please try again, or re-authorize if scanning private repos",
        ) from None

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


@router.get("/activity", response_model=list[ActivityEventOut])
def get_activity(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ActivityEventOut]:
    """Live action feed — recent scan lifecycle events for the signed-in user."""
    scans = (
        db.query(Scan)
        .filter(Scan.user_id == user.id)
        .order_by(Scan.created_at.desc())
        .limit(25)
        .all()
    )
    events: list[ActivityEventOut] = []
    for s in scans:
        status_val = s.status.value if hasattr(s.status, "value") else str(s.status)
        short = s.repo_url.replace("https://github.com/", "")
        if status_val == "complete":
            msg = f"Cleared berth · {short} inspection complete"
        elif status_val == "failed":
            msg = f"Hold · {short} inspection failed"
        elif status_val == "running":
            phase = s.current_phase or "parsing"
            msg = f"On belt · {short} · {phase}"
        else:
            msg = f"Queued · {short} awaiting dock"
        events.append(
            ActivityEventOut(
                id=str(s.id),
                kind="scan",
                message=msg,
                repo_url=s.repo_url,
                scan_id=s.id,
                status=status_val,
                created_at=s.completed_at or s.created_at,
            )
        )
    return events


@router.post("/scans", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
def create_scan(
    request: Request,
    body: ScanCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ScanOut:
    enforce_rate_limit(
        f"rl:scans:create:{user.id}",
        limit=10,
        window_seconds=60,
    )

    try:
        owner, repo = parse_repo_url(body.repo_url)
        normalized = f"https://github.com/{owner}/{repo}"
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    scan = Scan(
        user_id=user.id,
        repo_url=normalized,
        status=ScanStatus.queued,
        current_phase="queued",
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


@router.get("/public/reports/{token}", response_model=ScanDetailOut)
def get_public_report(token: str, db: Session = Depends(get_db)) -> ScanDetailOut:
    scan = db.query(Scan).filter(Scan.public_share_token == token).one_or_none()
    if scan is None or scan.status != ScanStatus.complete:
        raise HTTPException(status_code=404, detail="Report not found")
    return _scan_detail(db, scan)


@router.post("/scans/{scan_id}/share", response_model=ShareToggleOut)
def enable_share(
    scan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShareToggleOut:
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.status != ScanStatus.complete:
        raise HTTPException(status_code=400, detail="Only completed scans can be shared")
    if not scan.public_share_token:
        scan.public_share_token = secrets.token_urlsafe(24)
        db.commit()
        db.refresh(scan)
    settings = get_settings()
    return ShareToggleOut(
        public_share_token=scan.public_share_token,
        public_url=f"{settings.frontend_url}/report/{scan.public_share_token}",
    )


@router.delete("/scans/{scan_id}/share", response_model=ShareToggleOut)
def revoke_share(
    scan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShareToggleOut:
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan.public_share_token = None
    db.commit()
    return ShareToggleOut(public_share_token=None, public_url=None)


@router.get("/scans/{scan_id}/badge.svg")
def scan_badge(
    scan_id: UUID,
    db: Session = Depends(get_db),
) -> Response:
    """Public embeddable SVG badge (works for any scan id — status only, no secrets)."""
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    label, color = _badge_label(db, scan)
    # Escape for SVG text
    safe = (
        label.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    width = max(118, 52 + len(label) * 7)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="28" role="img" aria-label="Quaywatch {safe}">
  <rect width="{width}" height="28" rx="2" fill="#0B1420"/>
  <rect x="1" y="1" width="{width - 2}" height="26" rx="1.5" fill="none" stroke="{color}" stroke-width="1.5"/>
  <text x="10" y="12" fill="#7C8CA6" font-family="ui-monospace,monospace" font-size="8" font-weight="600">QUAYWATCH</text>
  <text x="10" y="23" fill="{color}" font-family="ui-monospace,monospace" font-size="10" font-weight="700">{safe}</text>
</svg>"""
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=120"},
    )


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
    detail = _scan_detail(db, scan)
    return detail.findings
