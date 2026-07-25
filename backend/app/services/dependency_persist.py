"""
Save ParsedDependency rows onto a Scan, wiring parent_dependency_id from keys.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Dependency, Scan
from app.services.parsers.base import ParsedDependency


def persist_dependencies(
    db: Session, scan: Scan, parsed: list[ParsedDependency]
) -> list[Dependency]:
    # Fresh scan rows shouldn't have deps yet; clear anyway for safe re-runs
    db.query(Dependency).filter(Dependency.scan_id == scan.id).delete()
    db.flush()

    # Insert parents before children by depth
    ordered = sorted(parsed, key=lambda d: (d.depth, d.name.lower()))
    key_to_id: dict[str, UUID] = {}
    created: list[Dependency] = []

    for item in ordered:
        parent_id = key_to_id.get(item.parent_key) if item.parent_key else None
        row = Dependency(
            scan_id=scan.id,
            name=item.name,
            version=item.version,
            ecosystem=item.ecosystem,
            is_direct=item.is_direct,
            depth=item.depth,
            parent_dependency_id=parent_id,
        )
        db.add(row)
        db.flush()  # assign UUID
        key_to_id[item.key] = row.id
        created.append(row)

    db.commit()
    return created
