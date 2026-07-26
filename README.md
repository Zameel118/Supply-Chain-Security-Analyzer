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
| Jobs | Celery + Redis (+ optional Beat for re-scans) |
| Database | PostgreSQL |
| Frontend | Next.js (App Router), TypeScript, Tailwind, Recharts, React Flow |
| Vulns | [OSV.dev](https://api.osv.dev) (no API key) |
| Local dev | Docker Compose |
| Production | API/worker/DB/Redis on [Render](https://render.com); frontend on [Vercel](https://vercel.com) |

## Architecture

```
Browser ──► Vercel (Next.js) ──► Render web (FastAPI)
                                      │
                                      ├─► Postgres (scans, users, findings)
                                      └─► Redis ──► Celery worker (+ optional beat)
                                              │
                                              └─► GitHub Contents API / OSV / registries
```

OAuth runs on **FastAPI** so workers can use an encrypted GitHub token. The session
cookie is set on the API host; production uses `SameSite=None; Secure` so the Vercel
origin can call the API with `credentials: "include"`.

## Phase status

- [x] Phases 0–8 — Core product + Quaywatch UI overhaul
- [x] Phase 9 — Deployment (Render + Vercel)

## Auth

Default OAuth scope is `read:user public_repo`. Private repos need re-authorize with
`?private=true`. `SECRET_KEY` and `TOKEN_ENCRYPTION_KEY` are required (no placeholders).

## Local quick start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [GitHub OAuth App](https://github.com/settings/developers) with callback
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

Generate secrets:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Features

- Checkpoint belt progress during scans
- Live action feed on the ops console
- Manifest ledger findings with StampBadges
- Dependency graph + severity charts + finding trend sparkline
- Public share links (`/report/{token}`) and embeddable SVG badges
- Since-last-scan regression diff (+new / resolved)
- Optional periodic re-scans via Celery Beat (`PERIODIC_RESCAN_ENABLED=true`)

## Security note

Scans read manifests, lockfiles, CI configs, and source text only via the GitHub Contents API.
Dependencies from scanned repos are **never** installed or run.

---

## Production deploy (Phase 9)

Do **not** copy secrets from your laptop `.env` into Render/Vercel. Generate fresh values.

### 1. GitHub OAuth App (production)

Create a second OAuth app (or update the existing one) at
https://github.com/settings/developers:

| Field | Value |
|-------|--------|
| Homepage URL | your Vercel URL (e.g. `https://quaywatch.vercel.app`) |
| Authorization callback URL | `https://<quaywatch-api>.onrender.com/api/auth/github/callback` |

You will know the exact Render hostname after step 2; you can edit the callback once.

### 2. Render (API + worker + Postgres + Redis)

Blueprint file: [`render.yaml`](./render.yaml)

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → select the repo.
3. Fill **sync: false** env vars when prompted (fresh secrets only):

| Variable | How to set |
|----------|------------|
| `TOKEN_ENCRYPTION_KEY` | New Fernet key (command above) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Production OAuth app |
| `GITHUB_OAUTH_REDIRECT_URI` | `https://<api-host>/api/auth/github/callback` |
| `FRONTEND_URL` | `https://<your-app>.vercel.app` (set after Vercel, or use the planned URL) |
| `CORS_ORIGINS` | Same as `FRONTEND_URL` (comma-separate if you have previews) |

`SECRET_KEY` can use Render’s generated value. `DATABASE_URL` / `REDIS_URL` come from the blueprint.

4. After deploy, open `https://<api-host>/health` — expect `{"status":"ok"}` (or similar).
5. Optional: set `PERIODIC_RESCAN_ENABLED=true` on the API service, ensure **quaywatch-beat** is running.

Free-tier notes: web services may spin down when idle (cold starts); Postgres/Redis free plans have limits. Upgrade plans if you need always-on workers.

### 3. Vercel (frontend)

1. Vercel → **Add New Project** → import the same repo.
2. **Root Directory:** `frontend`
3. Framework: Next.js (auto).
4. Environment variable:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://<quaywatch-api>.onrender.com` (no trailing slash) |

5. Deploy. Copy the production URL into Render’s `FRONTEND_URL` and `CORS_ORIGINS`, then **Manual Deploy** the API so cookies/CORS pick up the change.
6. Confirm GitHub OAuth homepage + callback match the live URLs.

### 4. Smoke checklist

- [ ] `GET /health` on Render returns OK  
- [ ] Landing page loads on Vercel  
- [ ] **Sign in with GitHub** lands on `/dashboard` and stays logged in  
- [ ] Start a public-repo scan; worker moves through checkpoint phases  
- [ ] Open a completed scan; share link + badge SVG work  

### Optional: production frontend Docker

[`frontend/Dockerfile.prod`](./frontend/Dockerfile.prod) builds a standalone Next image if you prefer hosting the UI somewhere other than Vercel. Pass `NEXT_PUBLIC_API_URL` as a build arg.
