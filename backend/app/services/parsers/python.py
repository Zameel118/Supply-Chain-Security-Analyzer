"""
Parse Python manifests: requirements.txt, Pipfile.lock, poetry.lock.
"""

from __future__ import annotations

import json
import re
import tomllib
from typing import Any

from app.services.parsers.base import ParsedDependency

ECOSYSTEM = "PyPI"

# name[extra]==1.2.3 ; python_version>="3"
_REQ_LINE = re.compile(
    r"^\s*([A-Za-z0-9][A-Za-z0-9._-]*)"
    r"(?:\[[^\]]*\])?"
    r"\s*(?:===|==|>=|<=|!=|~=|>|<)?\s*"
    r"([^;\\\s]+)?"
)


def _clean_version(raw: str | None) -> str | None:
    if not raw:
        return None
    text = raw.strip().strip(",").strip('"').strip("'")
    if not text or text == "*":
        return None
    # Drop environment markers accidentally captured
    text = text.split(";")[0].strip()
    return text or None


def parse_requirements_txt(content: str) -> list[ParsedDependency]:
    results: list[ParsedDependency] = []
    seen: set[str] = set()
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(("-r ", "-c ", "--", "-e ")):
            continue
        match = _REQ_LINE.match(line)
        if not match:
            continue
        name = match.group(1)
        version = _clean_version(match.group(2))
        key = f"pypi:req:{name.lower()}"
        if key in seen:
            continue
        seen.add(key)
        results.append(
            ParsedDependency(
                name=name,
                version=version,
                ecosystem=ECOSYSTEM,
                is_direct=True,
                depth=0,
                key=key,
                parent_key=None,
            )
        )
    return results


def parse_pipfile_lock(content: str) -> list[ParsedDependency]:
    data = json.loads(content)
    results: list[ParsedDependency] = []
    for section, is_direct in (("default", True), ("develop", True)):
        packages = data.get(section) or {}
        if not isinstance(packages, dict):
            continue
        for name, meta in packages.items():
            version = None
            if isinstance(meta, dict):
                version = _clean_version(str(meta.get("version", "")).lstrip("="))
            key = f"pypi:pipfile:{section}:{name.lower()}"
            results.append(
                ParsedDependency(
                    name=name,
                    version=version,
                    ecosystem=ECOSYSTEM,
                    is_direct=is_direct,
                    depth=0,
                    key=key,
                    parent_key=None,
                )
            )
    return results


def parse_poetry_lock(content: str) -> list[ParsedDependency]:
    data = tomllib.loads(content)
    packages = data.get("package") or []
    # Build name → key map first for parent wiring via dependencies
    by_name: dict[str, dict[str, Any]] = {}
    for pkg in packages:
        if isinstance(pkg, dict) and pkg.get("name"):
            by_name[pkg["name"].lower()] = pkg

    # Direct packages: those not listed solely as someone else's dependency is hard;
    # Poetry marks category. Treat category != "dev" extras carefully — use
    # packages without a parent reference as depth 0, and attach deps as children.
    results: list[ParsedDependency] = []
    name_to_key: dict[str, str] = {}

    for name_lower, pkg in by_name.items():
        name = pkg["name"]
        version = _clean_version(str(pkg.get("version")))
        key = f"pypi:poetry:{name_lower}"
        name_to_key[name_lower] = key
        results.append(
            ParsedDependency(
                name=name,
                version=version,
                ecosystem=ECOSYSTEM,
                is_direct=True,  # refined below
                depth=0,
                key=key,
                parent_key=None,
            )
        )

    # Second pass: if A lists B as dependency, mark B as child of A (first parent wins)
    child_parent: dict[str, str] = {}
    for name_lower, pkg in by_name.items():
        deps = pkg.get("dependencies") or {}
        if not isinstance(deps, dict):
            continue
        parent_key = name_to_key[name_lower]
        for dep_name in deps.keys():
            dep_lower = dep_name.lower()
            if dep_lower in name_to_key and dep_lower not in child_parent:
                child_parent[dep_lower] = parent_key

    refined: list[ParsedDependency] = []
    for dep in results:
        name_lower = dep.name.lower()
        parent_key = child_parent.get(name_lower)
        if parent_key:
            refined.append(
                ParsedDependency(
                    name=dep.name,
                    version=dep.version,
                    ecosystem=ECOSYSTEM,
                    is_direct=False,
                    depth=1,
                    key=dep.key,
                    parent_key=parent_key,
                )
            )
        else:
            refined.append(dep)
    return refined
