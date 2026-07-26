#!/usr/bin/env sh
# Render web service entrypoint: migrate then serve.
set -eu
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
