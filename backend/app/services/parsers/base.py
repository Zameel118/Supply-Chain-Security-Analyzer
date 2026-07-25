"""
Normalized dependency shape returned by every ecosystem parser.
`key` / `parent_key` are temporary strings used to wire parent→child rows in the DB.
"""

from dataclasses import dataclass


@dataclass
class ParsedDependency:
    name: str
    version: str | None
    ecosystem: str  # npm | PyPI | RubyGems | Maven
    is_direct: bool
    depth: int
    key: str
    parent_key: str | None = None
