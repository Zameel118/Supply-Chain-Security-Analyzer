# Security

Quaywatch handles GitHub OAuth tokens and scan findings. This document summarizes
how secrets are handled and what to do if something leaks.

## What must never be committed

| Item | Where it lives |
|------|----------------|
| `.env` (local secrets) | Project root — **gitignored** |
| `SECRET_KEY` | Render / local `.env` |
| `TOKEN_ENCRYPTION_KEY` | Render / local `.env` — **rotating this logs all users out** |
| `GITHUB_CLIENT_SECRET` | Render / local `.env` |
| Production Postgres password | Render-managed (`DATABASE_URL`) |
| User GitHub access tokens | Postgres `users.access_token` (Fernet-encrypted) |

`GITHUB_CLIENT_ID` is **public** by design (OAuth apps expose it in authorize URLs).
Still treat production vs development apps separately.

## Repository audit (v1.0.0)

- No production API keys or client secrets are hardcoded in source.
- `.env` is gitignored and was verified **not** tracked in git.
- `docker-compose.yml` and `.env.example` use **local-only** dev defaults
  (`scsa_dev_password`) — not for production.
- Scan output never returns raw secret values from repos (masked in UI).
- Public reports require an unguessable `public_share_token` (192-bit).
- Session cookies: `HttpOnly`, `Secure` on HTTPS, `SameSite=None` for Vercel + Render.
- OAuth CSRF `state` stored in Redis with TTL.
- Rate limits on login and scan creation.

## If a secret leaks

1. **GitHub client secret** — Regenerate in GitHub OAuth app settings; update Render env; redeploy.
2. **SECRET_KEY** — Generate new value; update Render; all users must sign in again.
3. **TOKEN_ENCRYPTION_KEY** — Generate new Fernet key; update Render; users must re-authorize GitHub.
4. **Committed `.env`** — Rotate every value in that file immediately; consider `git filter-repo` if pushed to GitHub.

## Reporting

For this personal / portfolio deployment, track issues in your repo. For a public
fork, open a private security advisory on GitHub if you find a vulnerability.
