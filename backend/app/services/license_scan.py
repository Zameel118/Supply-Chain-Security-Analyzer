"""
License compliance checks against public registry metadata.

Policy (configurable constants below):
- commercial projects: flag GPL / AGPL (and strong copyleft) as "review needed"
- open-source projects: allow copyleft; flag proprietary / missing license lightly
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from app.models import FindingSeverity

NPM_REGISTRY = "https://registry.npmjs.org"
PYPI_JSON = "https://pypi.org/pypi"
RUBYGEMS_API = "https://rubygems.org/api/v1/gems"

# SPDX-ish tokens we treat as strong copyleft (review for commercial use)
COPYLEFT_PATTERNS = (
    r"\bgpl\b",
    r"\bagpl\b",
    r"\blgpl\b",
    r"gnu\s+general\s+public",
    r"gnu\s+affero",
    r"gnu\s+lesser\s+general",
)

PROPRIETARY_PATTERNS = (
    r"\bproprietary\b",
    r"\bunlicensed\b",
    r"\bcommercial\b",
    r"\ball\s+rights\s+reserved\b",
)

MAX_PACKAGES = 80


@dataclass
class LicenseHit:
    dependency_id: UUID
    package_name: str
    license_spdx: str
    severity: FindingSeverity
    title: str
    description: str
    remediation: str


def normalize_license(raw: Any) -> str:
    """Turn registry license fields into a short uppercase label."""
    if raw is None:
        return "UNKNOWN"
    if isinstance(raw, dict):
        # npm often uses {"type": "MIT", "url": "..."}
        for key in ("type", "name", "license"):
            if raw.get(key):
                return normalize_license(raw[key])
        return "UNKNOWN"
    if isinstance(raw, list):
        parts = [normalize_license(x) for x in raw]
        parts = [p for p in parts if p != "UNKNOWN"]
        return " OR ".join(parts) if parts else "UNKNOWN"
    text = str(raw).strip()
    if not text:
        return "UNKNOWN"
    return text


def is_copyleft(license_label: str) -> bool:
    lower = license_label.lower()
    return any(re.search(pat, lower) for pat in COPYLEFT_PATTERNS)


def is_proprietary(license_label: str) -> bool:
    lower = license_label.lower()
    return any(re.search(pat, lower) for pat in PROPRIETARY_PATTERNS)


def fetch_npm_license(name: str, version: str | None, client: httpx.Client) -> str:
    encoded = quote(name, safe="@")
    if name.startswith("@") and "/" in name:
        scope, pkg = name.split("/", 1)
        encoded = f"{quote(scope, safe='')}%2F{quote(pkg, safe='')}"
    url = f"{NPM_REGISTRY}/{encoded}"
    resp = client.get(url, headers={"Accept": "application/json"})
    if resp.status_code != 200:
        return "UNKNOWN"
    data = resp.json()
    if version and isinstance(data.get("versions"), dict) and version in data["versions"]:
        meta = data["versions"][version]
        return normalize_license(meta.get("license") or meta.get("licenses"))
    return normalize_license(data.get("license") or data.get("licenses"))


def fetch_pypi_license(name: str, version: str | None, client: httpx.Client) -> str:
    url = f"{PYPI_JSON}/{name}/json" if not version else f"{PYPI_JSON}/{name}/{version}/json"
    resp = client.get(url)
    if resp.status_code == 404 and version:
        resp = client.get(f"{PYPI_JSON}/{name}/json")
    if resp.status_code != 200:
        return "UNKNOWN"
    data = resp.json()
    info = data.get("info") or {}
    # Prefer classifiers License :: …
    licenses: list[str] = []
    for classifier in info.get("classifiers") or []:
        if isinstance(classifier, str) and classifier.startswith("License ::"):
            licenses.append(classifier.split("::")[-1].strip())
    if info.get("license"):
        licenses.append(str(info["license"]))
    if not licenses:
        return "UNKNOWN"
    return normalize_license(licenses)


def fetch_rubygems_license(name: str, client: httpx.Client) -> str:
    resp = client.get(f"{RUBYGEMS_API}/{name}.json")
    if resp.status_code != 200:
        return "UNKNOWN"
    data = resp.json()
    return normalize_license(data.get("licenses") or data.get("license"))


def fetch_package_license(ecosystem: str, name: str, version: str | None, client: httpx.Client) -> str:
    try:
        if ecosystem == "npm":
            return fetch_npm_license(name, version, client)
        if ecosystem == "PyPI":
            return fetch_pypi_license(name, version, client)
        if ecosystem == "RubyGems":
            return fetch_rubygems_license(name, client)
    except httpx.HTTPError:
        return "UNKNOWN"
    return "UNKNOWN"


def evaluate_license_policy(
    *,
    package_name: str,
    license_label: str,
    project_type: str,
) -> LicenseHit | None:
    """
    Return a LicenseHit if policy says this license needs attention, else None.
    """
    project_type = (project_type or "commercial").lower()
    label = license_label or "UNKNOWN"

    if project_type == "commercial":
        if is_copyleft(label):
            return _hit(
                package_name,
                label,
                FindingSeverity.medium,
                title=f"Copyleft license needs review: {package_name} ({label})",
                description=(
                    f"Package '{package_name}' is licensed as '{label}'. For commercial projects, "
                    "GPL/AGPL/LGPL terms may require disclosing source or other obligations — "
                    "legal review is recommended."
                ),
                remediation=(
                    f"Confirm '{package_name}' usage complies with '{label}', replace it with a "
                    "permissively licensed alternative, or obtain counsel before distributing."
                ),
            )
        if label == "UNKNOWN":
            return _hit(
                package_name,
                label,
                FindingSeverity.low,
                title=f"Unknown license: {package_name}",
                description=(
                    f"Could not determine a license for '{package_name}' from the public registry. "
                    "Commercial use without a clear license is risky."
                ),
                remediation="Check the package homepage / repo LICENSE file before shipping.",
            )
        if is_proprietary(label):
            return _hit(
                package_name,
                label,
                FindingSeverity.high,
                title=f"Proprietary license: {package_name} ({label})",
                description=(
                    f"Package '{package_name}' appears proprietary ('{label}'). "
                    "Ensure you have redistribition rights."
                ),
                remediation="Verify commercial license terms or remove the dependency.",
            )
        return None

    # open-source project type — allow copyleft; still flag proprietary / unknown lightly
    if is_proprietary(label):
        return _hit(
            package_name,
            label,
            FindingSeverity.medium,
            title=f"Proprietary license in open-source project: {package_name}",
            description=(
                f"'{package_name}' uses '{label}', which may conflict with distributing "
                "an open-source project."
            ),
            remediation="Replace with an OSI-approved licensed package if possible.",
        )
    if label == "UNKNOWN":
        return _hit(
            package_name,
            label,
            FindingSeverity.info,
            title=f"Unknown license: {package_name}",
            description=f"No clear license metadata found for '{package_name}'.",
            remediation="Document the license manually if you keep this dependency.",
        )
    return None


def _hit(
    package_name: str,
    label: str,
    severity: FindingSeverity,
    *,
    title: str,
    description: str,
    remediation: str,
) -> LicenseHit:
    # dependency_id filled by caller
    return LicenseHit(
        dependency_id=UUID(int=0),
        package_name=package_name,
        license_spdx=label,
        severity=severity,
        title=title,
        description=description,
        remediation=remediation,
    )


def scan_dependencies_for_licenses(
    deps: list[Any],
    project_type: str,
) -> list[LicenseHit]:
    """
    Fetch licenses for direct deps (capped) and apply project-type policy.
    """
    # Prefer direct dependencies — those are the ones you chose
    ordered = sorted(deps, key=lambda d: (0 if d.is_direct else 1, d.name.lower()))
    candidates: list[Any] = []
    seen: set[tuple[str, str]] = set()
    for dep in ordered:
        if dep.ecosystem not in ("npm", "PyPI", "RubyGems"):
            continue
        key = (dep.ecosystem, dep.name.lower())
        if key in seen:
            continue
        seen.add(key)
        candidates.append(dep)
        if len(candidates) >= MAX_PACKAGES:
            break

    if not candidates:
        return []

    results: list[LicenseHit] = []
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for dep in candidates:
            license_label = fetch_package_license(
                dep.ecosystem, dep.name, dep.version, client
            )
            policy_hit = evaluate_license_policy(
                package_name=dep.name,
                license_label=license_label,
                project_type=project_type,
            )
            if policy_hit is None:
                continue
            policy_hit.dependency_id = dep.id
            results.append(policy_hit)
    return results
