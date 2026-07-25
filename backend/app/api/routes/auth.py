"""
GitHub OAuth routes.

Why FastAPI OAuth (not NextAuth)?
The backend must keep an encrypted GitHub access token so Celery workers can
call the GitHub Contents API during scans. Doing OAuth on FastAPI stores that
token once, in Postgres, next to the User row — simpler than syncing a
NextAuth session into the API.
"""

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user
from app.api.schemas import UserOut
from app.core.config import get_settings
from app.core.database import get_db
from app.core.github import exchange_code_for_token, fetch_github_user, github_authorize_url
from app.core.oauth_state import consume_oauth_state, store_oauth_state
from app.core.rate_limit import client_ip, enforce_rate_limit
from app.core.security import encrypt_token
from app.core.session import COOKIE_NAME, create_session_token
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/github/login")
def github_login(request: Request, private: bool = False) -> RedirectResponse:
    """
    Step 1: send the browser to GitHub's consent screen.

    Default scope is public-only (`read:user public_repo`).
    Pass `?private=true` to request the broader `repo` scope for private repos.
    """
    settings = get_settings()
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env",
        )

    enforce_rate_limit(
        f"rl:auth:login:{client_ip(request)}",
        limit=20,
        window_seconds=60,
    )

    state = secrets.token_urlsafe(24)
    try:
        store_oauth_state(state)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Login temporarily unavailable — please try again",
        ) from None

    return RedirectResponse(url=github_authorize_url(state, private_repos=private))


@router.get("/github/callback")
def github_callback(code: str, state: str, db: Session = Depends(get_db)) -> RedirectResponse:
    """Step 2: GitHub redirects here with a code; we create/update the user and set a cookie."""
    settings = get_settings()
    if not consume_oauth_state(state):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")

    try:
        access_token = exchange_code_for_token(code)
        gh_user = fetch_github_user(access_token)
    except Exception:
        logger.exception("GitHub OAuth callback failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub OAuth failed — please try logging in again",
        ) from None

    github_id = str(gh_user["id"])
    user = db.query(User).filter(User.github_id == github_id).one_or_none()
    if user is None:
        user = User(
            github_id=github_id,
            username=gh_user["login"],
            avatar_url=gh_user.get("avatar_url"),
            access_token=encrypt_token(access_token),
        )
        db.add(user)
    else:
        user.username = gh_user["login"]
        user.avatar_url = gh_user.get("avatar_url")
        user.access_token = encrypt_token(access_token)

    db.commit()
    db.refresh(user)

    session_jwt = create_session_token(user.id)
    response = RedirectResponse(url=f"{settings.frontend_url}/dashboard")
    response.set_cookie(
        key=COOKIE_NAME,
        value=session_jwt,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=60 * 60 * 24 * 7,
        path="/",
    )
    return response


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.get("/me-or-null")
def me_or_null(user: User | None = Depends(get_optional_user)) -> dict:
    """Frontend bootstrap: returns null user without a 401."""
    if user is None:
        return {"user": None}
    return {
        "user": {
            "id": str(user.id),
            "github_id": user.github_id,
            "username": user.username,
            "avatar_url": user.avatar_url,
        }
    }


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"status": "logged_out"}
