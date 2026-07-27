"""Application version (repo backend/VERSION, synced from root VERSION)."""

from functools import lru_cache
from pathlib import Path


@lru_cache
def get_app_version() -> str:
    version_path = Path(__file__).resolve().parents[2] / "VERSION"
    if version_path.is_file():
        return version_path.read_text(encoding="utf-8").strip()
    return "0.0.0"
