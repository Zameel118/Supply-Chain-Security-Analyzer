"""
OAuth CSRF `state` storage in Redis with a short TTL.
Survives multi-worker deploys and process restarts (unlike an in-memory set).
"""

from __future__ import annotations

import logging

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

STATE_TTL_SECONDS = 600  # 10 minutes
STATE_KEY_PREFIX = "oauth:state:"


def store_oauth_state(state: str) -> None:
    try:
        get_redis().setex(f"{STATE_KEY_PREFIX}{state}", STATE_TTL_SECONDS, "1")
    except Exception:
        logger.exception("Failed to store OAuth state in Redis")
        raise


def consume_oauth_state(state: str) -> bool:
    """Return True if state was present (and delete it so it cannot be reused)."""
    key = f"{STATE_KEY_PREFIX}{state}"
    try:
        r = get_redis()
        # GETDEL is atomic on Redis >= 6.2; fall back to GET+DEL
        if hasattr(r, "getdel"):
            return r.getdel(key) is not None
        pipe = r.pipeline()
        pipe.get(key)
        pipe.delete(key)
        value, _ = pipe.execute()
        return value is not None
    except Exception:
        logger.exception("Failed to consume OAuth state from Redis")
        return False
