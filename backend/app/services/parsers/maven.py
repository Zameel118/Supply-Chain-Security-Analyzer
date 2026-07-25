"""
Parse Maven pom.xml dependency declarations (direct deps only).
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

from app.services.parsers.base import ParsedDependency

ECOSYSTEM = "Maven"


def _local(tag: str) -> str:
    """Strip XML namespace from a tag if present."""
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def parse_pom_xml(content: str) -> list[ParsedDependency]:
    root = ET.fromstring(content)
    results: list[ParsedDependency] = []
    seen: set[str] = set()

    # Prefer top-level <dependencies> under the project root
    project_deps: list[ET.Element] = []
    for child in list(root):
        if _local(child.tag) == "dependencies":
            project_deps.extend([c for c in child if _local(c.tag) == "dependency"])

    # Fallback: any <dependency> that has groupId+artifactId (may include plugins)
    if not project_deps:
        for elem in root.iter():
            if _local(elem.tag) == "dependency":
                project_deps.append(elem)

    for dep in project_deps:
        group_id = artifact_id = version = None
        for child in list(dep):
            local = _local(child.tag)
            if local == "groupId":
                group_id = (child.text or "").strip()
            elif local == "artifactId":
                artifact_id = (child.text or "").strip()
            elif local == "version":
                version = (child.text or "").strip()
        if not group_id or not artifact_id:
            continue
        if version and version.startswith("${"):
            version = None
        name = f"{group_id}:{artifact_id}"
        key = f"maven:{name}"
        if key in seen:
            continue
        seen.add(key)
        results.append(
            ParsedDependency(
                name=name,
                version=version or None,
                ecosystem=ECOSYSTEM,
                is_direct=True,
                depth=0,
                key=key,
                parent_key=None,
            )
        )
    return results
