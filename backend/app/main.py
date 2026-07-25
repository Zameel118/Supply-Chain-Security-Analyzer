"""
FastAPI entrypoint.
Phase 1: health + auth (GitHub OAuth) + scans.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, scans
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Quaywatch",
    description="Harbor watch for your software supply chain — dependencies, CI/CD, secrets, licenses.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,  # needed so the browser sends the session cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(scans.router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Quaywatch API",
        "docs": "/docs",
        "health": "/health",
    }
