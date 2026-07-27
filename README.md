# Quaywatch

**Version 1.0.0** · Harbor watch for your software supply chain.

Sign in with GitHub, run a static inspection on a repository, and review vulnerabilities,
typosquats, dependency confusion, CI/CD risks, secret patterns, and license holds.
**Scanned code is never executed** — analysis uses the GitHub Contents API and public registries only.

| | |
|---|---|
| **Frontend** | [supply-chain-security-analyzer.vercel.app](https://supply-chain-security-analyzer.vercel.app) |
| **API** | [quaywatch-api.onrender.com](https://quaywatch-api.onrender.com) |
| **Health** | `GET /health` → `status`, `service`, `version` |

---

## Features

- GitHub OAuth (public repos by default; `?private=true` for `repo` scope)
- Seven-stage checkpoint belt (parsing → OSV → typosquats → confusion → CI/CD → secrets → licenses)
- Ops dashboard with live feed, risk pulse, watchlist, and scan history
- Manifest ledger, dependency graph (React Flow), severity charts, trend sparkline
- JSON/PDF export, public share links (`/report/{token}`), embeddable SVG badges
- Scan diff vs previous run on the same repo (+new / resolved)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| API | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| Workers | Celery + Redis (in-process on Render free tier) |
| Database | PostgreSQL |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, Recharts, React Flow |
| Vulnerabilities | [OSV.dev](https://api.osv.dev) (no API key) |
| Local dev | Docker Compose |
| Production | Render (API, Postgres, Redis) + Vercel (frontend) |

---

## Architecture

```
Browser → Vercel (Next.js)
              ↓ credentials: include
         Render (FastAPI + Celery worker in same web dyno on free plan)
              ├── Postgres
              ├── Redis
              └── GitHub API · OSV · npm/PyPI metadata
```

OAuth and session cookies are issued by the **API** host. Production uses
`SameSite=None; Secure` cookies so the Vercel origin can call the API cross-site.

---

## Local development

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- GitHub OAuth app with callback `http://localhost:8000/api/auth/github/callback`

### Setup

```bash
git clone https://github.com/Zameel118/Supply-Chain-Security-Analyzer.git
cd Supply-Chain-Security-Analyzer
cp .env.example .env
```

Generate secrets (no extra Python packages required):

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

Fill `.env`: `SECRET_KEY`, `TOKEN_ENCRYPTION_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

Optional Celery beat (periodic re-scans): `docker compose --profile beat up`

---

## Versioning

Single source of truth: **`VERSION`** at the repo root (currently **1.0.0**).

| Surface | How version is exposed |
|---------|-------------------------|
| UI shell | `v1.0.0` in the ops header (`NEXT_PUBLIC_APP_VERSION`) |
| API | `/health` and OpenAPI `info.version` |
| npm | `frontend/package.json` (synced on build) |

Bump before a release:

```bash
npm run version:patch   # or version:minor / version:major
git add VERSION backend/VERSION frontend/package.json package.json
git commit -m "chore: release v1.0.1"
```

Vercel `prebuild` runs `sync-version` automatically so deploys stay aligned with `VERSION`.

---

## Production deployment

Infrastructure is defined in **`render.yaml`** (free tier: API + Postgres + Redis; Celery runs inside the web service).

### Environment variables

**Render (`quaywatch-api`)**

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | JWT session signing |
| `TOKEN_ENCRYPTION_KEY` | Fernet encryption for GitHub tokens in DB |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth |
| `GITHUB_OAUTH_REDIRECT_URI` | Must match GitHub app callback |
| `FRONTEND_URL` | Vercel URL (no trailing slash) |
| `CORS_ORIGINS` | Same as frontend origin |
| `DATABASE_URL` / `REDIS_URL` | From Blueprint |

**Vercel (`frontend`)**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Render API URL (no trailing slash) |

Use a **production-only** GitHub OAuth app. Never copy local `.env` secrets to Render.

### Credentials to store offline

Use `docs/PRODUCTION_VAULT.template.txt` in your password manager. Keep:

- All Render secret env vars (especially `TOKEN_ENCRYPTION_KEY`)
- GitHub OAuth client ID + **secret**
- Vercel project link and env
- Render blueprint / service IDs (for support tickets)
- Domain URLs and OAuth callback URL

See **[SECURITY.md](./SECURITY.md)** for rotation steps if something leaks.

### Paid Render upgrade

To run a dedicated Celery worker and beat, see **`render.workers.yaml`** (Starter plan+).

---

## Security

- Required `SECRET_KEY` and `TOKEN_ENCRYPTION_KEY` at startup (placeholders rejected)
- GitHub tokens encrypted at rest; never returned by API
- OAuth `state` in Redis; rate limits on auth and scan creation
- Public reports: read-only, token-gated; badge SVG exposes status only
- Activity feed scoped per authenticated user

**Repository hygiene:** `.env` is gitignored. Dev-only passwords in `docker-compose.yml` are not production credentials.

---

## Project layout

```
backend/          FastAPI, Celery tasks, Alembic migrations
frontend/         Next.js App Router UI
render.yaml       Render Blueprint (free tier)
render.workers.yaml   Optional paid workers
scripts/          sync-version.mjs
docs/             PRODUCTION_VAULT.template.txt
VERSION           Release version (edit or bump via npm scripts)
```

---

## License

Portfolio / educational project. Add a license file if you open-source formally.

---

## Changelog

### 1.0.0

- Quaywatch UI overhaul, checkpoint belt, share links, badges, scan diff
- Production deploy on Render + Vercel
- Security hardening (OAuth CSRF, cookie policy, required secrets)
- Unified versioning across API and frontend
