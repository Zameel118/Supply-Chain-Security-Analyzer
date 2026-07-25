"""
Simple Redis-backed rate limiting for sensitive endpoints.
"""

from __future__ import annotations

import logging

from fastapi import HTTPException, Request, status

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def enforce_rate_limit(key: str, *, limit: int, window_seconds: int) -> None:
    """
    Sliding fixed-window counter. Raises 429 when over limit.
    Fails open (allows request) if Redis is unreachable, after logging.
    """
    try:
        r = get_redis()
        count = r.incr(key)
        if count == 1:
            r.expire(key, window_seconds)
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests — try again shortly",
            )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Rate limiter unavailable; allowing request for key=%s", key)
