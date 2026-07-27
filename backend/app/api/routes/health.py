"""
Health check route — used by Docker Compose and uptime monitors.
"""

from fastapi import APIRouter

from app.core.version import get_app_version

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "quaywatch", "version": get_app_version()}
