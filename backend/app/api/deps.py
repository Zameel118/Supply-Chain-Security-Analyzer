"""
FastAPI dependencies — look up the current user from the session cookie.
"""

from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.session import COOKIE_NAME, decode_session_token
from app.models import User


def get_current_user(
    db: Session = Depends(get_db),
    scsa_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> User:
    if not scsa_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")
    try:
        user_id: UUID = decode_session_token(scsa_session)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session"
        ) from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_optional_user(
    db: Session = Depends(get_db),
    scsa_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> User | None:
    if not scsa_session:
        return None
    try:
        return get_current_user(db=db, scsa_session=scsa_session)
    except HTTPException:
        return None
