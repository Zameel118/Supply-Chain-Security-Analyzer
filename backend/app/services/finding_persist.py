"""
Persist vulnerability hits as Finding rows, and propagate critical/high
transitive vulns up to the direct dependency that pulled them in.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Dependency, Finding, FindingSeverity, FindingType, Scan
from app.services.typosquat import TyposquatHit, scan_dependencies_for_typosquats
from app.services.vuln_scan import VulnHit, scan_dependencies_for_vulns


def _nearest_direct_ancestor(db: Session, dep: Dependency) -> Dependency | None:
    """Walk parent_dependency_id until we find an is_direct package (or give up)."""
    seen: set[UUID] = set()
    current = dep
    while current.parent_dependency_id and current.id not in seen:
        seen.add(current.id)
        parent = db.get(Dependency, current.parent_dependency_id)
        if parent is None:
            return None
        if parent.is_direct:
            return parent
        current = parent
    # If the vuln dep itself is under a depth-0 non-direct (lockfile quirk),
    # find any direct dep with the same scan that we can attribute — skip if none.
    return None


def persist_vulnerability_findings(db: Session, scan: Scan) -> list[Finding]:
    # Clear previous vulnerability findings for safe re-runs
    db.query(Finding).filter(
        Finding.scan_id == scan.id,
        Finding.type == FindingType.vulnerability,
    ).delete()
    db.flush()

    deps = db.query(Dependency).filter(Dependency.scan_id == scan.id).all()
    hits: list[VulnHit] = scan_dependencies_for_vulns(deps)

    # Index deps by id for propagation
    by_id = {d.id: d for d in deps}
    created: list[Finding] = []
    # Avoid duplicate findings on the same direct parent for the same OSV id
    seen_keys: set[tuple[UUID, str]] = set()

    for hit in hits:
        key = (hit.dependency_id, hit.osv_id)
        if key in seen_keys:
            continue
        seen_keys.add(key)

        finding = Finding(
            scan_id=scan.id,
            type=FindingType.vulnerability,
            severity=hit.severity,
            title=hit.title,
            description=hit.description,
            remediation=hit.remediation,
            dependency_id=hit.dependency_id,
        )
        db.add(finding)
        created.append(finding)

        dep = by_id.get(hit.dependency_id)
        if dep is None or dep.is_direct:
            continue
        if hit.severity not in (FindingSeverity.critical, FindingSeverity.high):
            continue

        direct = _nearest_direct_ancestor(db, dep)
        if direct is None:
            continue
        prop_key = (direct.id, hit.osv_id)
        if prop_key in seen_keys:
            continue
        seen_keys.add(prop_key)

        propagated = Finding(
            scan_id=scan.id,
            type=FindingType.vulnerability,
            severity=hit.severity,
            title=f"{hit.osv_id} via transitive {dep.name}@{dep.version}",
            description=(
                f"Direct dependency {direct.name}@{direct.version} pulls in "
                f"{dep.name}@{dep.version}, which is affected by {hit.osv_id}. "
                f"{hit.description}"
            ),
            remediation=(
                f"Upgrade or replace {direct.name} so it no longer depends on a vulnerable "
                f"{dep.name}. Upstream fix hint: {hit.remediation}"
            ),
            dependency_id=direct.id,
        )
        db.add(propagated)
        created.append(propagated)

    db.commit()
    return created


def persist_typosquat_findings(db: Session, scan: Scan) -> list[Finding]:
    """Flag dependency names that look like popular packages (typosquats)."""
    db.query(Finding).filter(
        Finding.scan_id == scan.id,
        Finding.type == FindingType.typosquat,
    ).delete()
    db.flush()

    deps = db.query(Dependency).filter(Dependency.scan_id == scan.id).all()
    # Prefer direct deps — typosquats matter most when you chose the name yourself.
    # Still scan transitive ones at depth 0/1 to catch lockfile-pulled lookalikes.
    candidates = [d for d in deps if d.is_direct or d.depth <= 1]
    hits: list[TyposquatHit] = scan_dependencies_for_typosquats(candidates)

    created: list[Finding] = []
    for hit in hits:
        finding = Finding(
            scan_id=scan.id,
            type=FindingType.typosquat,
            severity=hit.severity,
            title=hit.title,
            description=hit.description,
            remediation=hit.remediation,
            dependency_id=hit.dependency_id,
        )
        db.add(finding)
        created.append(finding)

    db.commit()
    return created
