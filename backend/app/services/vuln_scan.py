"""
Query OSV.dev for known vulnerabilities in scanned dependencies.

API docs: https://api.osv.dev
- POST /v1/querybatch  → vulnerability IDs per package/version
- GET  /v1/vulns/{id}  → full record (severity, fixed versions, summary)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import httpx

from app.models import FindingSeverity

OSV_API = "https://api.osv.dev"
BATCH_SIZE = 80

# Our ecosystem labels already match OSV's names for these four.
OSV_ECOSYSTEMS = {"npm", "PyPI", "RubyGems", "Maven"}


@dataclass
class VulnHit:
    osv_id: str
    dependency_id: UUID
    package_name: str
    package_version: str | None
    severity: FindingSeverity
    title: str
    description: str
    fixed_version: str | None
    remediation: str | None


def map_cvss_score(score: float) -> FindingSeverity:
    """Normalize a CVSS base score into our severity enum."""
    if score >= 9.0:
        return FindingSeverity.critical
    if score >= 7.0:
        return FindingSeverity.high
    if score >= 4.0:
        return FindingSeverity.medium
    if score > 0:
        return FindingSeverity.low
    return FindingSeverity.info


def map_severity_label(label: str) -> FindingSeverity | None:
    text = label.strip().upper()
    mapping = {
        "CRITICAL": FindingSeverity.critical,
        "HIGH": FindingSeverity.high,
        "MEDIUM": FindingSeverity.medium,
        "MODERATE": FindingSeverity.medium,
        "LOW": FindingSeverity.low,
        "INFO": FindingSeverity.info,
        "UNKNOWN": None,
    }
    return mapping.get(text)


def severity_from_osv(vuln: dict[str, Any]) -> FindingSeverity:
    """
    Prefer explicit severity entries, then database_specific scores, then CVSS.
    Defaults to medium when OSV gives no usable severity signal.
    """
    # 1) Top-level database_specific.severity (common on GHSA)
    db_specific = vuln.get("database_specific") or {}
    if isinstance(db_specific, dict):
        if isinstance(db_specific.get("severity"), str):
            mapped = map_severity_label(db_specific["severity"])
            if mapped:
                return mapped
        # Nested cvss score number
        cvss = db_specific.get("cvss")
        if isinstance(cvss, dict) and cvss.get("score") is not None:
            try:
                return map_cvss_score(float(cvss["score"]))
            except (TypeError, ValueError):
                pass

    # 2) severity[] array
    for entry in vuln.get("severity") or []:
        if not isinstance(entry, dict):
            continue
        score = entry.get("score")
        if isinstance(score, (int, float)):
            return map_cvss_score(float(score))
        if isinstance(score, str):
            label = map_severity_label(score)
            if label:
                return label
            # Plain numeric string e.g. "7.5"
            try:
                return map_cvss_score(float(score))
            except ValueError:
                pass

    # 3) Nested database_specific blobs from other DBs
    if isinstance(db_specific, dict):
        for meta in db_specific.values():
            if not isinstance(meta, dict):
                continue
            if isinstance(meta.get("severity"), str):
                mapped = map_severity_label(meta["severity"])
                if mapped:
                    return mapped

    # 4) ecosystem_specific
    for meta in (vuln.get("ecosystem_specific") or {}).values():
        if isinstance(meta, dict) and isinstance(meta.get("severity"), str):
            mapped = map_severity_label(meta["severity"])
            if mapped:
                return mapped

    return FindingSeverity.medium


def extract_fixed_versions(vuln: dict[str, Any], ecosystem: str, package_name: str) -> list[str]:
    """Collect fixed version strings from affected[].ranges[].events."""
    fixed: list[str] = []
    for affected in vuln.get("affected") or []:
        pkg = affected.get("package") or {}
        if pkg.get("ecosystem") and pkg.get("ecosystem") != ecosystem:
            continue
        if pkg.get("name") and pkg.get("name").lower() != package_name.lower():
            # Maven / npm names should match; skip unrelated packages in multi-package vulns
            continue
        for range_obj in affected.get("ranges") or []:
            for event in range_obj.get("events") or []:
                if isinstance(event, dict) and event.get("fixed"):
                    fixed.append(str(event["fixed"]))
        # Sometimes listed under versions with introduced/fixed in database_specific
    # Deduplicate while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for ver in fixed:
        if ver not in seen:
            seen.add(ver)
            out.append(ver)
    return out


def build_query(ecosystem: str, name: str, version: str | None) -> dict[str, Any] | None:
    if ecosystem not in OSV_ECOSYSTEMS:
        return None
    if not name or not version:
        # OSV versioned query needs a concrete version for useful results
        return None
    return {
        "package": {"name": name, "ecosystem": ecosystem},
        "version": version,
    }


def query_osv_batch(queries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Call /v1/querybatch. Returns a list aligned with `queries`,
    each item like {"vulns": [{"id": "...", ...}, ...]}.
    """
    if not queries:
        return []

    results: list[dict[str, Any]] = [{"vulns": []} for _ in queries]
    # Process in chunks
    for start in range(0, len(queries), BATCH_SIZE):
        chunk = queries[start : start + BATCH_SIZE]
        chunk_results = _query_batch_with_pagination(chunk)
        for offset, item in enumerate(chunk_results):
            results[start + offset] = item
    return results


def _query_batch_with_pagination(queries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    aggregated: list[dict[str, Any]] = [{"vulns": []} for _ in queries]
    pending: list[tuple[int, dict[str, Any]]] = list(enumerate(queries))

    with httpx.Client(timeout=60.0) as client:
        while pending:
            payload_queries = []
            index_map: list[int] = []
            for idx, q in pending:
                payload_queries.append(q)
                index_map.append(idx)

            response = client.post(f"{OSV_API}/v1/querybatch", json={"queries": payload_queries})
            response.raise_for_status()
            body = response.json()
            page_results = body.get("results") or []

            next_pending: list[tuple[int, dict[str, Any]]] = []
            for i, result in enumerate(page_results):
                orig_idx = index_map[i]
                vulns = result.get("vulns") or []
                aggregated[orig_idx]["vulns"].extend(vulns)
                token = result.get("next_page_token")
                if token:
                    # Re-query only this package with the page token
                    continued = dict(queries[orig_idx] if orig_idx < len(queries) else payload_queries[i])
                    # Use the query we actually sent
                    continued = dict(payload_queries[i])
                    continued["page_token"] = token
                    next_pending.append((orig_idx, continued))
            pending = next_pending

    return aggregated


def fetch_vuln(osv_id: str, client: httpx.Client, cache: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    if osv_id in cache:
        return cache[osv_id]
    response = client.get(f"{OSV_API}/v1/vulns/{osv_id}")
    if response.status_code == 404:
        return None
    response.raise_for_status()
    data = response.json()
    cache[osv_id] = data
    return data


def scan_dependencies_for_vulns(
    deps: list[Any],
) -> list[VulnHit]:
    """
    `deps` are SQLAlchemy Dependency rows (need id, name, version, ecosystem).
    Returns VulnHit list ready to persist as Finding rows.
    """
    # Build queries only for deps with a concrete version
    indexed: list[tuple[Any, dict[str, Any]]] = []
    for dep in deps:
        query = build_query(dep.ecosystem, dep.name, dep.version)
        if query:
            indexed.append((dep, query))

    if not indexed:
        return []

    batch_results = query_osv_batch([q for _, q in indexed])
    hits: list[VulnHit] = []
    cache: dict[str, dict[str, Any]] = {}

    with httpx.Client(timeout=60.0) as client:
        for (dep, _query), result in zip(indexed, batch_results, strict=True):
            for vuln_ref in result.get("vulns") or []:
                osv_id = vuln_ref.get("id")
                if not osv_id:
                    continue
                vuln = fetch_vuln(osv_id, client, cache)
                if not vuln:
                    continue

                severity = severity_from_osv(vuln)
                fixed_versions = extract_fixed_versions(vuln, dep.ecosystem, dep.name)
                fixed = fixed_versions[0] if fixed_versions else None
                summary = (vuln.get("summary") or vuln.get("details") or "").strip()
                if len(summary) > 1500:
                    summary = summary[:1500] + "…"
                title = f"{osv_id} in {dep.name}@{dep.version}"
                description = summary or f"OSV reports {osv_id} affects {dep.name}@{dep.version}."
                if fixed:
                    remediation = f"Upgrade {dep.name} to {fixed} (or later)."
                else:
                    remediation = (
                        f"Review {osv_id} on https://osv.dev/vulnerability/{osv_id} "
                        f"and upgrade {dep.name} when a fix is available."
                    )

                hits.append(
                    VulnHit(
                        osv_id=osv_id,
                        dependency_id=dep.id,
                        package_name=dep.name,
                        package_version=dep.version,
                        severity=severity,
                        title=title,
                        description=description,
                        fixed_version=fixed,
                        remediation=remediation,
                    )
                )
    return hits
