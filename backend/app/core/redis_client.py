"""
Shared Redis client (OAuth CSRF state, rate limiting).
Celery already uses REDIS_URL — no extra infrastructure.
"""

from functools import lru_cache

from redis import Redis

from app.core.config import get_settings


@lru_cache
def get_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)
