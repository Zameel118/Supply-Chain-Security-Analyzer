#!/usr/bin/env sh
# Render free-tier entrypoint: migrate, start Celery worker in-process, then serve API.
#
# Background Workers are NOT available on Render's free plan, so the worker
# shares the web dyno. Upgrade to a paid Worker later if you outgrow this.
#
# Both processes run in the background. If either exits, we kill the other and
# exit non-zero so Render restarts the service (avoids silent "API up, worker
# dead" failures where scans stay queued forever).
set -eu

alembic upgrade head

# Single concurrency keeps memory low on free instances
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=1 &
CELERY_PID=$!

uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" &
UVICORN_PID=$!

# POSIX-portable: dash/sh has no `wait -n`. Poll until either child dies.
while kill -0 "$CELERY_PID" 2>/dev/null && kill -0 "$UVICORN_PID" 2>/dev/null; do
  sleep 2
done

kill "$CELERY_PID" "$UVICORN_PID" 2>/dev/null || true
wait "$CELERY_PID" 2>/dev/null || true
wait "$UVICORN_PID" 2>/dev/null || true
exit 1
