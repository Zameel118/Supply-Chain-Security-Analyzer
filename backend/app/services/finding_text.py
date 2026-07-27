"""Normalize finding text before DB insert (defense in depth)."""

from __future__ import annotations

TITLE_SOFT_MAX = 4000
PATH_SOFT_MAX = 1020


def clip_text(value: str | None, max_len: int) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1] + "…"


def prepare_finding_fields(
    *,
    title: str,
    description: str,
    remediation: str | None = None,
    file_path: str | None = None,
) -> dict[str, str | None]:
    return {
        "title": clip_text(title, TITLE_SOFT_MAX) or "",
        "description": clip_text(description, 50_000) or "",
        "remediation": clip_text(remediation, 20_000) if remediation else None,
        "file_path": clip_text(file_path, PATH_SOFT_MAX) if file_path else None,
    }
