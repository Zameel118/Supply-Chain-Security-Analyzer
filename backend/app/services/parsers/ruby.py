"""
Parse Gemfile.lock (Bundler).
"""

from __future__ import annotations

import re

from app.services.parsers.base import ParsedDependency

ECOSYSTEM = "RubyGems"

_SPEC = re.compile(r"^ {4}([A-Za-z0-9_./-]+) \(([^)]+)\)\s*$")
_DEP = re.compile(r"^ {6}([A-Za-z0-9_./-]+)(?: \(([^)]+)\))?\s*$")


def parse_gemfile_lock(content: str) -> list[ParsedDependency]:
    """
    Walk the GEM specs section. Top-level gems under DEPENDENCIES are direct;
    nested dependency lines under a spec become children (depth 1).
    """
    lines = content.splitlines()
    in_specs = False
    in_dependencies = False
    direct_names: set[str] = set()
    specs: list[tuple[str, str | None]] = []  # (name, version) for gems with depth 0 entries
    # Also collect nested deps: parent_name -> [(child, version_constraint)]
    nested: dict[str, list[str]] = {}
    current_spec: str | None = None

    for line in lines:
        if line.startswith("GEM"):
            in_specs = False
            in_dependencies = False
            continue
        if line.strip() == "specs:":
            in_specs = True
            in_dependencies = False
            current_spec = None
            continue
        if line.startswith("DEPENDENCIES"):
            in_specs = False
            in_dependencies = True
            current_spec = None
            continue
        if line and not line.startswith(" ") and not line.startswith("\t"):
            # New top-level section
            in_specs = False
            if not line.startswith("DEPENDENCIES"):
                in_dependencies = False
            current_spec = None
            continue

        if in_dependencies:
            dep_match = re.match(r"^ {2}([A-Za-z0-9_./-]+)", line)
            if dep_match:
                direct_names.add(dep_match.group(1))
            continue

        if in_specs:
            spec_match = _SPEC.match(line)
            if spec_match:
                name, version = spec_match.group(1), spec_match.group(2)
                current_spec = name
                specs.append((name, version))
                nested.setdefault(name, [])
                continue
            dep_match = _DEP.match(line)
            if dep_match and current_spec:
                nested[current_spec].append(dep_match.group(1))

    # Build unique gem nodes from specs
    results: list[ParsedDependency] = []
    name_to_key: dict[str, str] = {}
    for name, version in specs:
        key = f"rubygems:{name.lower()}@{version}"
        # If duplicate specs (rare), keep first
        if name.lower() in name_to_key:
            continue
        name_to_key[name.lower()] = key
        is_direct = name in direct_names
        results.append(
            ParsedDependency(
                name=name,
                version=version,
                ecosystem=ECOSYSTEM,
                is_direct=is_direct,
                depth=0 if is_direct else 1,
                key=key,
                parent_key=None,
            )
        )

    # Attach first direct parent for non-direct gems when possible
    refined: list[ParsedDependency] = []
    for dep in results:
        if dep.is_direct:
            refined.append(dep)
            continue
        parent_key = None
        for parent_name, children in nested.items():
            if dep.name in children and parent_name.lower() in name_to_key:
                # Prefer a direct parent
                parent_dep_key = name_to_key[parent_name.lower()]
                parent_is_direct = parent_name in direct_names
                if parent_is_direct or parent_key is None:
                    parent_key = parent_dep_key
                    if parent_is_direct:
                        break
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
    return refined
