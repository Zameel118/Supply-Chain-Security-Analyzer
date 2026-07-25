# Cursor AI Build Prompt — Supply Chain Security Analyzer

Paste everything below this line into Cursor's Agent/Composer chat as your starting instruction. Work through it phase by phase — don't ask Cursor to build everything in one shot. After each phase, run the app, confirm it works, commit to git, then move to the next phase.

---

## PROJECT BRIEF

Build a full-stack web application called **Supply Chain Security Analyzer**. It lets a signed-in user submit a GitHub repository and receive a security report covering: dependency vulnerabilities, typosquatting risks, dependency confusion risks, CI/CD pipeline security issues, secret leaks, and open-source license compliance.

I am not an experienced developer. Explain each major step briefly in comments, use clear file/folder names, and avoid unnecessary abstraction. Prioritize a working end-to-end slice over a large amount of half-finished code.

### Tech stack (do not substitute without asking me)
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Alembic (migrations)
- **Background jobs:** Celery + Redis (scans run async, not in the request/response cycle)
- **Database:** PostgreSQL
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + Recharts (charts) + React Flow (dependency graph)
- **Auth:** GitHub OAuth (NextAuth.js on the frontend, or a FastAPI OAuth flow — pick whichever is simpler to wire together and explain your choice)
- **Vulnerability data source:** OSV.dev REST API (https://api.osv.dev) — free, no API key required, covers npm/PyPI/RubyGems/Maven/Go/crates.io
- **Local dev environment:** Docker Compose running postgres, redis, backend, celery worker, frontend — so `docker compose up` starts everything
- **Deployment target:** Frontend on Vercel, backend + worker + Postgres + Redis on Render (free/starter tier). Structure the repo so both can deploy directly from it.

### Critical security constraint
**Never execute, `eval`, or run code pulled from a scanned repository.** All analysis is static: reading file contents (manifests, lockfiles, CI config, source text for secret-pattern matching) via the GitHub REST API or a shallow, read-only `git clone` into a sandboxed temp directory that gets deleted after the scan. No dependency is ever installed or run.

---

## REPO STRUCTURE

```
supply-chain-analyzer/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/          # SQLAlchemy models: User, Scan, Dependency, Finding
│   │   ├── api/routes/      # /scans, /auth, /reports
│   │   ├── services/
│   │   │   ├── parsers/     # npm.py, python.py, ruby.py, maven.py
│   │   │   ├── vuln_scan.py
│   │   │   ├── typosquat.py
│   │   │   ├── dep_confusion.py
│   │   │   ├── cicd_scan.py
│   │   │   ├── secret_scan.py
│   │   │   └── license_scan.py
│   │   ├── tasks/           # celery tasks orchestrating the above services
│   │   └── core/            # config, db session, github client
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/
│   ├── lib/
│   └── package.json
└── README.md
```

---

## DATA MODEL (build this first, in Phase 0)

- **User**: id, github_id, username, avatar_url, access_token (encrypted)
- **Scan**: id, user_id, repo_url, status (queued/running/complete/failed), created_at, completed_at
- **Dependency**: id, scan_id, name, version, ecosystem, is_direct (bool), depth (int), parent_dependency_id (nullable, for the graph)
- **Finding**: id, scan_id, type (vulnerability/typosquat/dep_confusion/cicd/secret/license), severity, title, description, dependency_id (nullable), file_path (nullable), remediation (text)

---

## BUILD PHASES

### Phase 0 — Scaffolding
- Docker Compose with postgres, redis, backend, celery worker, frontend services.
- FastAPI skeleton with a `/health` endpoint.
- Next.js skeleton with a placeholder landing page.
- Alembic set up, initial migration creating the tables above.
- Confirm `docker compose up` brings everything up cleanly before moving on.

### Phase 1 — GitHub OAuth + repo submission
- GitHub OAuth login flow, storing the user and a scoped access token.
- A form where a logged-in user pastes a public repo URL (or picks from their own repos via the GitHub API).
- Submitting creates a `Scan` row (status=queued) and enqueues a Celery task. Return the scan id immediately; frontend polls `/api/scans/{id}` for status.

### Phase 2 — Dependency parsing
- Fetch manifest/lockfile contents via the GitHub Contents API (no full clone needed here): `package.json`/`package-lock.json`, `requirements.txt`/`Pipfile.lock`/`poetry.lock`, `Gemfile.lock`, `pom.xml`.
- Write one parser per ecosystem in `services/parsers/`, each returning a normalized list of `{name, version, ecosystem, is_direct, depth, parent}`.
- Persist as `Dependency` rows. Build the parent/child relationship so the frontend can render a graph.

### Phase 3 — Vulnerability scanning (OSV.dev)
- For every `Dependency`, batch-query OSV.dev's `/v1/querybatch` endpoint with `{package: {name, ecosystem}, version}`.
- Map OSV severity (CVSS vector or database-specific score) into a normalized High/Medium/Low.
- Create `Finding` rows of type `vulnerability`. Mark whether a fixed version exists (from OSV's `affected[].ranges`/`fixed` field) and populate `remediation` with the suggested version bump.
- Propagate: if a transitive dependency has a critical vuln, surface that up to the direct dependency that pulled it in.

### Phase 4 — Typosquatting detection
- Maintain (or fetch on a schedule) a list of the top ~5,000 packages per ecosystem by download count (npm/PyPI expose popularity data).
- For each dependency name, compute Levenshtein distance and a homoglyph-normalized comparison (map lookalike unicode chars, `0`→`o`, `1`→`l`, etc.) against the popular-package list.
- Flag close matches (distance ≤ 2, or normalized match) as `Finding` type `typosquat`, with the suspected legitimate package named in `description`.

### Phase 5 — Dependency confusion detection
- Let the user optionally specify their private package scope/prefix (e.g. `@mycompany/*`) at scan time.
- Check whether any declared "internal" name also exists on the public npm/PyPI registry. If so, raise a `dep_confusion` finding warning that an attacker could publish a same-named public package.

### Phase 6 — CI/CD and secret scanning
- Fetch `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile` via the GitHub Contents API.
- Parse YAML and flag: unpinned third-party actions (no commit SHA), shell steps containing `curl | bash`/`wget | sh`, base64-decode-and-exec patterns, secrets referenced insecurely.
- Run regex-based secret detection (AWS access keys, private key headers, generic high-entropy 32+ char strings, Slack/Stripe/GitHub token patterns) across repository file contents. Report file path + line number, never the secret value itself in the UI (mask it).

### Phase 7 — License compliance
- Pull license metadata per package from the ecosystem's registry API (npm registry, PyPI JSON API, etc.).
- Compare against a configurable policy list (default: flag GPL/AGPL as "review needed" for a "commercial" project type). Let the user pick project type (open-source/commercial) at scan time to adjust flagging.

### Phase 8 — Dashboard & reporting
- Scan results page: summary cards (total deps, vulnerabilities by severity, typosquat/CI/secret/license finding counts).
- Dependency graph visualization (React Flow), color-coded by risk.
- Findings table, filterable by type/severity, each with remediation text.
- Export report as PDF and JSON.
- Scan history list per user.

### Phase 9 — Deployment
- Write Render blueprint (`render.yaml`) for backend + worker + Postgres + Redis.
- Configure Vercel project for the frontend, environment variables pointing at the deployed backend URL.
- Add a scheduled Celery beat task for periodic re-scans of saved repos (optional, only if time allows).
- Write a README covering setup, architecture, and screenshots.

---

## WORKING STYLE FOR THIS SESSION
- Build one phase at a time. After each phase, tell me exactly what to run and what I should see working before we continue.
- If you need an API key or account (GitHub OAuth app, Render, Vercel), stop and tell me exactly what to create and where to put the resulting value — don't invent placeholder secrets and move on silently.
- Prefer boring, well-documented libraries over clever ones.
- Write basic tests for the parsers and the vulnerability-matching logic, since those are the parts most likely to silently break.
