# Environment Variables Reference — Shareable Linear Backlog

Comprehensive reference for every environment variable used by the application. Variables are sourced from `.env.example`, `.env.production.example`, `backend/.env.example`, and `frontend/.env.example`.

For a quick summary table, see the [Deployment Guide](./deployment-guide.md#environment-variable-reference).

---

## Core / Server

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `NODE_ENV` | Yes | `development` | `development`, `production` | Controls logging, security defaults, and optimizations. Set to `production` for deployment. |
| `PORT` | No | `3000` | Any valid port | Express backend API server port. |
| `LOG_LEVEL` | No | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal` | Pino log level. Use `info` in production, `debug` for troubleshooting. |

## Database

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string | Format: `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`. For Azure PostgreSQL, append `?sslmode=require&uselibpqcompat=true`. Supports `enc:` prefix for encrypted storage. |
| `DB_USER` | Docker only | `slb_user` | Any string | PostgreSQL user. Used by Docker Compose to create the database user. |
| `DB_PASSWORD` | Docker only | — | Alphanumeric + `-`, `_`, `.` | PostgreSQL password. **Must NOT contain URI-reserved characters** (`@`, `:`, `/`, `?`, `#`, `%`) because it is interpolated directly into `DATABASE_URL` in `docker-compose.prod.yml`. |
| `DB_NAME` | Docker only | `shareable_linear_backlog` | Any string | PostgreSQL database name. Used by Docker Compose. |
| `DB_PORT` | No | `5432` | Any valid port | PostgreSQL port. In Docker, bound to `127.0.0.1` only (not exposed externally). |
| `DB_SSL_ENABLED` | No | `false` (auto `true` in prod) | `true`, `false` | Enable SSL for PostgreSQL connections. Automatically enabled when `NODE_ENV=production`. Required for cloud-hosted databases. |
| `DB_ENCRYPTION_KEY` | No | — | Any strong passphrase | Key used by pgcrypto `pgp_sym_encrypt`/`pgp_sym_decrypt` for column-level encryption. Required if using database column encryption features. |

## Linear API

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `LINEAR_API_KEY` | Yes | — | `lin_api_...` format | Linear API key for syncing backlog data. Must have read access to the target project. Supports `enc:` prefix for encrypted storage. |
| `LINEAR_PROJECT_ID` | No | — | Linear project UUID | Linear project UUID for backlog sync. Used to scope which project's issues are synced. |

## Security & Authentication

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `SESSION_SECRET` | Yes (prod) | `change-me-in-production` | 32+ character string | Secret key for signing session cookies. **Must be changed in production.** Generate with `openssl rand -base64 48`. Supports `enc:` prefix for encrypted storage. |
| `ALLOWED_ORIGINS` | Recommended | `http://localhost:1576` | Comma-separated URLs | CORS allowed origins. Must match the exact origin users access (including protocol and port). Example: `https://backlog.vixxo.internal`. |
| `ALLOWED_NETWORKS` | Recommended | — | Comma-separated CIDR ranges | IP ranges allowed to access the API (except `/api/health`). Example: `10.0.0.0/8,172.16.0.0/12`. |
| `NETWORK_CHECK_ENABLED` | No | `true` (prod), `false` (dev) | `true`, `false` | Enable IP-based network access control. When `true`, only IPs within `ALLOWED_NETWORKS` can access the API. |
| `CREDENTIAL_ENCRYPTION_KEY` | No | — | Any strong passphrase | Passphrase for encrypting/decrypting env var values with `enc:` prefix (AES-256-GCM). When set, `LINEAR_API_KEY`, `SESSION_SECRET`, `DATABASE_URL`, and `SYNC_TRIGGER_TOKEN` can be stored encrypted. See `docs/credential-management.md`. |

## Sync Configuration

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `SYNC_ENABLED` | No | `true` | `true`, `false` | Enable or disable scheduled automatic sync from Linear. |
| `SYNC_CRON_SCHEDULE` | No | `*/15 * * * *` | Cron expression | Cron schedule for automatic sync. The schedule is also stored in the database (`app_settings` table, key: `sync_cron_schedule`); this env var is a fallback when the DB setting is missing. Production example: `0 8,16 * * 1-5` (8 AM and 4 PM weekdays). |
| `SYNC_TRIGGER_TOKEN` | No | — | Any string | Token to protect the manual sync trigger endpoint (`POST /api/sync/trigger`). When set, requests require `Authorization: Bearer <token>` or `X-Sync-Trigger-Token: <token>`. Also suppresses technical error details in `GET /api/sync/status`. Supports `enc:` prefix. |

## Health Check & Monitoring

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `HEALTH_CHECK_INTERVAL_MS` | No | `60000` | Milliseconds | Interval between automated health checks (1 minute default). |
| `HEALTH_CHECK_LINEAR_TIMEOUT_MS` | No | `5000` | Milliseconds | Timeout for Linear API health check (5 seconds default). |
| `ALERT_WEBHOOK_URL` | No | — | HTTPS URL | Webhook endpoint for health status alerts (Slack, Teams, or generic HTTP). Leave unset to disable alerts. |
| `ALERT_COOLDOWN_MS` | No | `300000` | Milliseconds | Minimum cooldown between alerts (5 minutes default). |
| `APP_VERSION` | No | From `package.json` | Semver string | Version reported in `/api/health` response. Overrides the version from `package.json`. |

## Frontend

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:1576/api` | URL | Base URL for backend API calls. **In Docker deployment, this value is baked into the frontend build at image build time** (default is `/api`, and nginx proxies `/api` to the backend). To override in Docker, rebuild the frontend image with a build arg (e.g., `docker compose build --build-arg VITE_API_URL=https://backlog.vixxo.internal/api frontend`). For non-Docker production, set to your backend URL (e.g., `https://backlog.vixxo.internal/api`) before building. |
| `VITE_PROXY_TARGET` | No | `http://localhost:3000` | URL | Override Vite dev server proxy target. Development only. |
| `VITE_SYNC_TRIGGER_TOKEN` | No | — | Any string | Admin-only token for triggering sync and viewing detailed sync errors from the frontend. Must match backend's `SYNC_TRIGGER_TOKEN`. |

## Docker Compose

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `FRONTEND_PORT` | No | `80` | Any valid port | Port to expose the frontend nginx container. |
| `SERVE_STATIC` | No | `false` | `true`, `false` | Set to `true` to have Express serve frontend static files. Use for non-Docker deployments only; in Docker, nginx serves static files. |
| `FRONTEND_DIST_PATH` | No | — | Absolute path | Override path to frontend `dist` directory. For non-Docker deployments with `SERVE_STATIC=true`. |

## Seeding

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `SEED_ADMIN_EMAIL` | No | — | Email address | Initial admin user email for `scripts/seed.sh`. When set, creates or promotes a user to admin. |
| `SEED_ADMIN_DISPLAY_NAME` | No | — | Any string | Display name for the seeded admin user. |

## Backlog Display

| Variable | Required | Default | Valid Values | Description |
|---|---|---|---|---|
| `NEW_ITEM_DAYS_THRESHOLD` | No | `7` | Number (days) | Items created within this many days are flagged as "new" in the backlog view. |

---

## Security Notes

- **Never commit** `.env`, `.env.production`, or any file containing actual secrets to git.
- Variables marked as supporting `enc:` prefix can be stored encrypted using AES-256-GCM. See [`docs/credential-management.md`](../../docs/credential-management.md) for the encryption guide.
- Generate strong secrets: `openssl rand -base64 48`
- `DB_PASSWORD` character restriction: avoid `@`, `:`, `/`, `?`, `#`, `%` — these break the `DATABASE_URL` interpolation in Docker Compose.

## Files Reference

| File | Purpose | Context |
|---|---|---|
| `.env.example` | Development template (all variables) | Root-level, covers Docker + backend + frontend |
| `.env.production.example` | Production template | Copy to `.env.production` for deployment |
| `backend/.env.example` | Backend-specific template | Used by `npm run dev -w backend` |
| `frontend/.env.example` | Frontend-specific template | Used by `npm run dev -w frontend` |
