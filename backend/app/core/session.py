"""
Session JWT helpers — after GitHub OAuth we give the browser a signed cookie
so later API calls know which user is logged in (without re-hitting GitHub).
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"
COOKIE_NAME = "scsa_session"
TOKEN_TTL_HOURS = 24 * 7  # 1 week


def create_session_token(user_id: UUID) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_session_token(token: str) -> UUID:
    settings = get_settings()
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    return UUID(payload["sub"])
