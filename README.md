# Supply Chain Security Analyzer

Full-stack app that scans a GitHub repository for dependency vulnerabilities, typosquatting, dependency confusion, CI/CD risks, secret leaks, and license compliance.

**Static analysis only** — repository code is never executed, installed, or evaluated.

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

- [x] **Phase 0** — Scaffolding
- [x] **Phase 1** — GitHub OAuth + repo submission
- [ ] Phase 2 — Dependency parsing
- [ ] Phase 3 — Vulnerability scanning (OSV.dev)
- [ ] Phase 4 — Typosquatting detection
- [ ] Phase 5 — Dependency confusion detection
- [ ] Phase 6 — CI/CD and secret scanning
- [ ] Phase 7 — License compliance
- [ ] Phase 8 — Dashboard & reporting
- [ ] Phase 9 — Deployment (Render + Vercel)

## Auth choice

OAuth runs on **FastAPI** (not NextAuth). The backend must store an encrypted GitHub
access token for Celery workers to call the GitHub API during scans — keeping login
on the API avoids syncing tokens from a separate NextAuth session.

## Quick start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A [GitHub OAuth App](https://github.com/settings/developers) with callback
  `http://localhost:8000/api/auth/github/callback`

### Steps

1. Copy the example env file and fill in GitHub OAuth values:

```bash
cp .env.example .env
```

(On Windows PowerShell: `Copy-Item .env.example .env`)

2. Start everything:

```bash
docker compose up --build
```

3. When healthy, open:

| Service | URL | What you should see |
|---------|-----|---------------------|
| Frontend | http://localhost:3000 | Landing page + **Login with GitHub** |
| Dashboard | http://localhost:3000/dashboard | Scan form (after login) |
| API health | http://localhost:8000/health | `{"status":"ok",...}` |
| API docs | http://localhost:8000/docs | FastAPI Swagger UI |

4. Confirm containers are up:

```bash
docker compose ps
```

You should see `scsa-postgres`, `scsa-redis`, `scsa-backend`, `scsa-worker`, and `scsa-frontend` all running / healthy.

### Stop

```bash
docker compose down
```

## Project layout

```
supply-chain-analyzer/
├── docker-compose.yml
├── backend/          # FastAPI + Celery + Alembic
├── frontend/         # Next.js App Router
└── README.md
```

## Security note

Scans read manifests, lockfiles, CI configs, and source text only (GitHub Contents API or a shallow read-only clone into a temp directory that is deleted afterward). Dependencies from scanned repos are **never** installed or run.
