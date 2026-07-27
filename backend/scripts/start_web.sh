#!/usr/bin/env sh
# Render free-tier entrypoint: migrate, start Celery worker in-process, then serve API.
#
# Background Workers are NOT available on Render's free plan, so the worker
# shares the web dyno. Upgrade to a paid Worker later if you outgrow this.
set -eu

alembic upgrade head

# Single concurrency keeps memory low on free instances
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=1 &
CELERY_PID=$!

# If Celery dies, bring the web process down so Render restarts the service
trap 'kill "$CELERY_PID" 2>/dev/null || true' EXIT INT TERM

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
