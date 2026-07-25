"""
SQLAlchemy engine and session helpers.
Every request (and Celery task) gets its own short-lived DB session.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# create_engine opens a connection pool to Postgres
engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class all ORM models inherit from."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a DB session, then close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
