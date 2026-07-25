"""
Dependency confusion detection.

If the user declares a private package scope/prefix (e.g. @mycompany/),
we check whether any matching dependency also exists on the *public*
npm / PyPI / RubyGems registry. If it does, an attacker could publish
the same name publicly and trick installs into pulling the wrong package.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from app.models import FindingSeverity

NPM_REGISTRY = "https://registry.npmjs.org"
PYPI_JSON = "https://pypi.org/pypi"
RUBYGEMS_API = "https://rubygems.org/api/v1/gems"


@dataclass
class DepConfusionHit:
    dependency_id: UUID
    package_name: str
    ecosystem: str
    registry_url: str
    severity: FindingSeverity
    title: str
    description: str
    remediation: str


def normalize_prefix(prefix: str | None) -> str | None:
    """
    Accept forms like '@mycompany/*', '@mycompany/', 'mycompany-', 'company.'.
    Returns a lowercase prefix string used with startswith(), or None if empty.
    """
    if not prefix:
        return None
    text = prefix.strip().lower()
    if not text:
        return None
    # Treat trailing /* as /
    if text.endswith("/*"):
        text = text[:-1]  # keep trailing /
    return text


def matches_private_prefix(package_name: str, prefix: str) -> bool:
    name = package_name.lower()
    return name.startswith(prefix)


def public_package_exists(ecosystem: str, name: str, client: httpx.Client) -> tuple[bool, str | None]:
    """
    Return (exists_on_public_registry, url_checked).
    404 → does not exist (good for private-only names).
    200 → publicly available (confusion risk).
    """
    try:
        if ecosystem == "npm":
            # Scoped: @scope/name → @scope%2Fname
            encoded = quote(name, safe="@")
            if name.startswith("@") and "/" in name:
                scope, pkg = name.split("/", 1)
                encoded = f"{quote(scope, safe='')}%2F{quote(pkg, safe='')}"
            url = f"{NPM_REGISTRY}/{encoded}"
            resp = client.get(url, headers={"Accept": "application/json"})
            if resp.status_code == 200:
                return True, url
            if resp.status_code == 404:
                return False, url
            # Other errors: don't flag — avoid false positives on rate limits
            return False, url

        if ecosystem == "PyPI":
            url = f"{PYPI_JSON}/{name}/json"
            resp = client.get(url)
            if resp.status_code == 200:
                return True, url
            if resp.status_code == 404:
                return False, url
            return False, url

        if ecosystem == "RubyGems":
            url = f"{RUBYGEMS_API}/{name}.json"
            resp = client.get(url)
            if resp.status_code == 200:
                return True, url
            if resp.status_code == 404:
                return False, url
            return False, url
    except httpx.HTTPError:
        return False, None

    return False, None


def scan_dependencies_for_confusion(
    deps: list[Any],
    private_prefix: str | None,
) -> list[DepConfusionHit]:
    """
    For each dependency whose name matches the private prefix, check whether
    the same name is resolvable on the public registry for that ecosystem.
    """
    prefix = normalize_prefix(private_prefix)
    if not prefix:
        return []

    # Unique (ecosystem, name) → first dependency id
    candidates: dict[tuple[str, str], Any] = {}
    for dep in deps:
        if dep.ecosystem not in ("npm", "PyPI", "RubyGems"):
            continue
        if not matches_private_prefix(dep.name, prefix):
            continue
        key = (dep.ecosystem, dep.name.lower())
        candidates.setdefault(key, dep)

    if not candidates:
        return []

    hits: list[DepConfusionHit] = []
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for (_eco, _name), dep in candidates.items():
            exists, registry_url = public_package_exists(dep.ecosystem, dep.name, client)
            if not exists:
                continue
            hits.append(
                DepConfusionHit(
                    dependency_id=dep.id,
                    package_name=dep.name,
                    ecosystem=dep.ecosystem,
                    registry_url=registry_url or "",
                    severity=FindingSeverity.high,
                    title=f"Dependency confusion risk: {dep.name}",
                    description=(
                        f"'{dep.name}' matches your private prefix '{prefix}' but also exists "
                        f"on the public {dep.ecosystem} registry"
                        + (f" ({registry_url})" if registry_url else "")
                        + ". An attacker could publish a same-named public package and trick "
                        "installs into pulling the wrong artifact if the registry is "
                        "misconfigured to prefer public over private."
                    ),
                    remediation=(
                        f"Pin installs to your private registry for '{prefix}*' packages, "
                        f"use a scoped registry config (e.g. npm `.npmrc` `@scope:registry=`), "
                        f"and verify '{dep.name}' is published only where you intend."
                    ),
                )
            )
    return hits
