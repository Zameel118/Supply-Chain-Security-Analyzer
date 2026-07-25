# Quaywatch

Harbor watch for your software supply chain. Sign in with GitHub, inspect a repository,
and clear or hold cargo — dependency vulnerabilities, typosquats, dependency confusion,
CI/CD risks, secret leaks, and license compliance.

**Static analysis only** — repository code is never executed, installed, or evaluated.

Formerly prototyped as “Supply Chain Security Analyzer”; product name is **Quaywatch**.

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| Jobs | Celery + Redis |
| Database | PostgreSQL |
| Frontend | Next.js (App Router), TypeScript, Tailwind, Recharts, React Flow |
| Vulns | [OSV.dev](https://api.osv.dev) (no API key) |
| Local dev | Docker Compose |

## Phase status

- [x] Phases 0–8 — Core product + Quaywatch UI overhaul
- [ ] Phase 9 — Deployment (Render + Vercel)

## Auth

OAuth runs on **FastAPI**. Default scope is `read:user public_repo`. Private repos need
re-authorize with `?private=true`. `SECRET_KEY` and `TOKEN_ENCRYPTION_KEY` are required.

## Quick start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [GitHub OAuth App](https://github.com/settings/developers) callback
  `http://localhost:8000/api/auth/github/callback`

### Steps

```bash
cp .env.example .env
# fill GITHUB_CLIENT_ID / SECRET, SECRET_KEY, TOKEN_ENCRYPTION_KEY
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| API health | http://localhost:8000/health |
| API docs | http://localhost:8000/docs |

## Features

- Checkpoint belt progress during scans
- Live action feed on the ops console
- Manifest ledger findings with StampBadges
- Dependency graph + severity charts + finding trend sparkline
- Public share links (`/report/{token}`) and embeddable SVG badges
- Since-last-scan regression diff (+new / resolved)

## Security note

Scans read manifests, lockfiles, CI configs, and source text only via the GitHub Contents API.
Dependencies from scanned repos are **never** installed or run.
