# Troubleshooting Guide — Shareable Linear Backlog

Common deployment issues and their solutions.

**Related guides:**
- [Deployment Guide](./deployment-guide.md) — Setup and configuration
- [Environment Variables](./environment-variables.md) — Variable reference
- [Monitoring Runbook](./monitoring-runbook.md) — Health check details and alert configuration
- [Database Guide](./database-guide.md) — Database administration and migrations

---

## Quick Reference

Most common issues and one-liner fixes:

| Symptom | Likely Cause | Quick Fix |
|---|---|---|
| Containers in `Restarting` loop | Missing/invalid `.env.production` | Verify `.env.production` exists and required keys are present (**avoid printing secrets**): `test -f .env.production && echo "found" || echo "missing"`; `grep -q '^DATABASE_URL=' .env.production && echo "DATABASE_URL set" || echo "DATABASE_URL missing"` |
| Backend `unhealthy` | Database not ready | Wait 30s or check: `docker exec slb-db pg_isready -U slb_user` |
| `/api/health` returns `degraded` | Linear API unavailable | Check: `curl -s http://localhost/api/health/linear \| jq` |
| `/api/health` returns `unhealthy` | Database unreachable | Check: `docker compose -f docker-compose.prod.yml ps db` |
| CORS errors in browser | `ALLOWED_ORIGINS` mismatch | Set to exact origin including protocol |
| Blank page after deploy | Frontend build failed | Rebuild: `docker compose -f docker-compose.prod.yml build frontend` |
| Migration fails | DB not running or wrong URL | Verify: `psql "$DATABASE_URL" -c "SELECT 1;"` |
| Users blocked by network check | IP not in `ALLOWED_NETWORKS` | Add CIDR range or set `NETWORK_CHECK_ENABLED=false` |
| Session/auth failures | Invalid `SESSION_SECRET` | Regenerate: `openssl rand -base64 48` and restart |

## Container Issues

### Containers won't start

**Symptoms:** `docker compose ps` shows containers in `Restarting` or `Exit` state.

**Check logs:**
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs db
```

**Common causes:**
- Missing `.env.production` file → Run `./scripts/setup.sh`
- Invalid environment variable values → Check `.env.production`
- Port conflicts → Check if ports 80 or 5432 are already in use: `lsof -i :80`

### Backend health check fails

**Symptoms:** Backend container shows `unhealthy` status.

**Check:**
```bash
# Test health endpoint directly
docker exec slb-backend wget -qO- http://localhost:3000/api/health

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=50
```

**Common causes:**
- Database not ready yet → Backend retries connection automatically; wait for db health check
- Missing `DATABASE_URL` → Verify `.env.production` has correct connection string
- Missing `SESSION_SECRET` → Production requires 32+ character secret

## Health Check & Monitoring Issues

### `/api/health` returns `degraded`

**Meaning:** Linear API is unavailable but the database is connected (non-critical).

**Steps:**
1. Check Linear health: `curl -s http://localhost/api/health/linear | jq`
2. Verify `LINEAR_API_KEY` is set and valid
3. Check [Linear Status Page](https://status.linear.app) for outages
4. If API key expired, rotate and restart the backend

### `/api/health` returns `unhealthy` (HTTP 503)

**Meaning:** Database is unreachable (critical dependency).

**Steps:**
1. Check DB health: `curl -s http://localhost/api/health/db | jq`
2. Check DB logs: `docker compose -f docker-compose.prod.yml logs db --tail=50`
3. Verify database env vars / connection string
4. Verify readiness: `curl -s http://localhost/api/health/ready | jq`

### Readiness probe failing (`/api/health/ready` returns 503)

**Meaning:** Critical dependencies aren’t ready (primarily database).

**Steps:**
1. Run full health check: `curl -s http://localhost/api/health | jq`
2. Fix database availability first; readiness will recover automatically.

### Liveness probe failing (`/api/health/live` non-200 or no response)

**Meaning:** Backend process is not running or is hung.

**Steps:**
1. Check backend container: `docker compose -f docker-compose.prod.yml ps backend`
2. Check logs: `docker compose -f docker-compose.prod.yml logs backend --tail=100`
3. Restart backend: `docker compose -f docker-compose.prod.yml restart backend`

### Linear shows `not_configured`

**Meaning:** `LINEAR_API_KEY` is not set. This is not an error; app can run but can’t sync.

**Steps:**
1. Set `LINEAR_API_KEY` in `.env.production`
2. Restart the backend container

### No webhook alerts received

**Steps:**
1. Verify `ALERT_WEBHOOK_URL` is set
2. Test manually:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"text":"Test alert from SLB"}' "$ALERT_WEBHOOK_URL"
```

3. Check backend logs for `alert-service` messages
4. Reduce cooldown during testing: `ALERT_COOLDOWN_MS=60000`

## Database Issues

### Cannot connect to database

**Symptoms:** `ECONNREFUSED` or `connection refused` errors in backend logs.

**In Docker deployment:**
```bash
# Check database container status
docker compose -f docker-compose.prod.yml ps db

# Test database connectivity
docker exec slb-db pg_isready -U slb_user -d shareable_linear_backlog
```

**Common causes:**
- Database container not running → `docker compose -f docker-compose.prod.yml up -d db`
- Wrong `DATABASE_URL` → For host scripts, `localhost` is correct (Postgres is bound to 127.0.0.1 only). For the backend container, Docker Compose overrides `DATABASE_URL` to use `db` (service name) automatically.
- PostgreSQL not finished initializing → Wait for health check (up to 50s)

### Migration failures

**Symptoms:** `./scripts/migrate.sh` fails with errors.

**Check:**
```bash
# Verify database is accessible
psql "$DATABASE_URL" -c "SELECT 1;"

# Check migration status
npm run migrate:up -w backend -- --dry-run
```

**Common causes:**
- Database doesn't exist → Create it: `createdb shareable_linear_backlog`
- Permission denied → Check `DB_USER` has CREATE/ALTER privileges
- Migration already applied → This is normal; migrations are idempotent

### Database data loss after restart

**Symptoms:** Data disappears after `docker compose down && docker compose up`.

**Fix:** Never use `docker compose down -v` in production — the `-v` flag removes data volumes.

```bash
# Safe restart (preserves data):
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# DANGEROUS — removes all data:
# docker compose -f docker-compose.prod.yml down -v
```

## Linear API Issues

### Sync not working

**Symptoms:** No data appearing, sync status shows errors.

**Check:**
```bash
# Check sync status via API
curl http://localhost/api/sync/status

# Check backend logs for sync errors
docker compose -f docker-compose.prod.yml logs backend | grep -i sync
```

**Common causes:**
- Invalid `LINEAR_API_KEY` → Verify key is valid and has read access
- Network firewall blocking Linear API → Ensure outbound HTTPS to `api.linear.app` is allowed
- `SYNC_ENABLED=false` → Set to `true` in `.env.production`
- Rate limited → Check logs for 429 responses; sync will auto-retry with backoff

### Linear API rate limiting

**Symptoms:** `429 Too Many Requests` or `RATE_LIMITED` errors in logs.

The application handles rate limiting automatically with exponential backoff. If you see persistent rate limiting:
- Reduce sync frequency: increase `SYNC_CRON_SCHEDULE` interval
- Check if other services share the same Linear API key

## Frontend Issues

### Blank page after deployment

**Symptoms:** Browser shows white page, no content loads.

**Check:**
```bash
# Verify frontend files exist in container
docker exec slb-frontend ls /usr/share/nginx/html/

# Check nginx logs
docker compose -f docker-compose.prod.yml logs frontend

# Test if index.html is served
curl -I http://localhost/
```

**Common causes:**
- Frontend build failed → Rebuild: `docker compose -f docker-compose.prod.yml build frontend`
- nginx configuration error → Check nginx logs for syntax errors
- JavaScript errors → Open browser DevTools console

### API calls failing (CORS errors)

**Symptoms:** Browser console shows CORS policy errors.

**Fix:** Ensure `ALLOWED_ORIGINS` in `.env.production` matches the exact origin the user accesses:
```bash
# Must match EXACTLY (including protocol and port)
ALLOWED_ORIGINS=https://backlog.vixxo.internal
```

### Stale content after update

**Symptoms:** Old version of the app still showing after deployment.

**Fix:** The `index.html` is served with `Cache-Control: no-cache`, so a hard refresh (Ctrl+Shift+R) should load the latest version. Hashed asset filenames ensure CSS/JS are never stale.

## Log Locations

| Service | How to access |
|---|---|
| Backend (Pino JSON) | `docker compose -f docker-compose.prod.yml logs backend` |
| Frontend (nginx) | `docker compose -f docker-compose.prod.yml logs frontend` |
| Database (PostgreSQL) | `docker compose -f docker-compose.prod.yml logs db` |
| All services | `docker compose -f docker-compose.prod.yml logs -f` |

### Reading Pino JSON logs

Backend logs are in JSON format (Pino). To read them in a human-friendly format:

```bash
# Install pino-pretty globally (one-time)
npm install -g pino-pretty

# Pipe logs through pino-pretty
docker compose -f docker-compose.prod.yml logs backend --no-log-prefix | pino-pretty
```

## Network Issues

### Users can't access the application

**Check:**
- Is the server reachable on the Vixxo network? `ping <server-ip>`
- Is port 80 open? `curl http://<server-ip>/api/health`
- Is `NETWORK_CHECK_ENABLED=true` blocking the user's IP? Check allowed CIDR ranges in `ALLOWED_NETWORKS`
- Is the user's IP in the allowed range? Check backend logs for network verification failures

### HTTPS not working

HTTPS is typically handled by a reverse proxy (nginx, Azure App Gateway) in front of the Docker deployment. The Docker containers serve HTTP internally. Ensure:
- The reverse proxy terminates TLS
- `X-Forwarded-Proto` header is set to `https`
- `trust proxy` is configured in Express (already set to `1`)

## SSL/TLS Issues

### HTTPS not working

**Symptoms:** Browser shows "Not Secure" or connection refused on port 443.

**Diagnosis:**

1. Verify the reverse proxy is running and configured
2. Check certificate validity: `openssl s_client -connect backlog.vixxo.internal:443 -brief`
3. Check certificate expiration: `openssl x509 -enddate -noout -in /path/to/cert.crt`

**Common causes:**
- Reverse proxy not configured — see [SSL/TLS Configuration](./deployment-guide.md#ssltls-configuration)
- Certificate expired — renew and restart the reverse proxy
- Certificate doesn't match domain — regenerate with correct Subject Alternative Names

**Prevention:** Set up automatic certificate renewal and add expiration monitoring to your [Operational Runbook](./operational-runbook.md).

### Mixed content warnings

**Symptoms:** Browser console shows "Mixed Content" errors; some resources loaded over HTTP.

**Fix:** Ensure `ALLOWED_ORIGINS` uses `https://` protocol and the `X-Forwarded-Proto` header is set by the reverse proxy. Express reads this header when `trust proxy` is enabled (already configured).

## Session & Authentication Issues

### Users cannot log in / session not persisting

**Symptoms:** Users are redirected back to login, session cookies not being set or accepted.

**Diagnosis:**

```bash
# Check if sessions table exists
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT count(*) FROM session;"

# Check for expired sessions
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT count(*) FROM session WHERE expire < NOW();"
```

**Common causes:**
- `SESSION_SECRET` not set or using default value in production
- `SESSION_SECRET` changed (invalidates all existing sessions) — users must re-authenticate
- Cookies blocked by browser (third-party cookie settings)
- Missing HTTPS — session cookies have `secure: true` in production, requiring HTTPS
- Database connection issue — sessions are stored in PostgreSQL

**Resolution:**
1. Verify `SESSION_SECRET` is set to a strong value (32+ characters)
2. Ensure HTTPS is configured (cookies require it in production)
3. Restart the backend after changing `SESSION_SECRET`

### User access denied despite being on allowed network

**Symptoms:** 403 Forbidden responses even though the user's IP should be allowed.

**Diagnosis:**

```bash
# Check backend logs for network verification details
docker compose -f docker-compose.prod.yml logs backend | grep -i "network"

# Verify ALLOWED_NETWORKS is correct
grep ALLOWED_NETWORKS .env.production
```

**Common causes:**
- User's actual IP not in `ALLOWED_NETWORKS` CIDR range — check if behind a VPN or NAT
- `X-Forwarded-For` header not set by reverse proxy — backend sees the proxy IP, not the user's IP
- `trust proxy` misconfigured — Express is set to trust 1 proxy hop by default

**Resolution:**
1. Add the user's network range to `ALLOWED_NETWORKS`
2. Ensure the reverse proxy sets `X-Forwarded-For` header
3. Temporarily set `NETWORK_CHECK_ENABLED=false` to diagnose (re-enable after)

### Admin approval not working

**Symptoms:** New users stuck in pending state; admin cannot approve users.

**Diagnosis:**

```bash
# Check user records
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT email, is_admin, is_approved, is_disabled FROM users;"
```

**Common causes:**
- No admin user exists — seed one with `./scripts/seed.sh`
- Admin user is disabled — re-enable in database
- Session expired — admin must re-authenticate

## Sync Scheduling Issues

### Scheduled sync not triggering

**Symptoms:** No new sync history records; backlog data is stale.

**Diagnosis:**

```bash
# Check sync status
curl -s http://localhost/api/sync/status | jq

# Check if sync is enabled
grep SYNC_ENABLED .env.production

# Check backend logs for sync-related messages
docker compose -f docker-compose.prod.yml logs backend | grep -i "sync\|cron"

# Check the cron schedule in app_settings
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT * FROM app_settings WHERE key = 'sync_cron_schedule';"
```

**Common causes:**
- `SYNC_ENABLED=false` — set to `true` in `.env.production`
- Invalid cron expression in `app_settings` table or `SYNC_CRON_SCHEDULE` env var
- Backend container restarting (sync scheduler resets on restart)
- `LINEAR_API_KEY` not configured — sync runs but fails silently

**Resolution:**
1. Verify `SYNC_ENABLED=true` in `.env.production`
2. Check the cron schedule is valid (e.g., `0 8,16 * * 1-5` for 8 AM and 4 PM weekdays)
3. Restart the backend to re-initialize the sync scheduler
4. Trigger a manual sync to test: `curl -X POST http://localhost/api/sync/trigger`

## Disk Space Issues

### Database running out of disk space

**Symptoms:** Write errors, "no space left on device" in PostgreSQL logs, container crashes.

**Diagnosis:**

```bash
# Check Docker volume usage
docker system df -v

# Check database size
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT pg_size_pretty(pg_database_size('shareable_linear_backlog'));"

# Check table sizes
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
SELECT
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;"
```

**Common causes:**
- Audit logs growing without retention policy — see [Database Guide](./database-guide.md#data-retention)
- Sync history accumulating — clean up old records
- WAL logs accumulating — may indicate replication issues

**Resolution:**
1. Implement data retention policies (see [Database Guide](./database-guide.md#data-retention))
2. Run `VACUUM FULL` on large tables to reclaim space
3. Increase Docker volume size if needed
4. Monitor disk usage as part of [weekly operations](./operational-runbook.md)

### Log files consuming disk space

**Symptoms:** Host disk filling up with Docker container logs.

**Diagnosis:**

```bash
# Check Docker log sizes
du -sh /var/lib/docker/containers/*/
```

**Resolution:**

Configure Docker log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

Restart Docker after changing: `sudo systemctl restart docker`

## Upgrade Issues

### Migration errors during upgrade

**Symptoms:** `./scripts/deploy.sh` fails at the migration step.

**Diagnosis:**

```bash
# Check migration status (dry run)
./scripts/migrate.sh --status

# Check which migrations have been applied
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT * FROM pgmigrations ORDER BY id;"
```

**Common causes:**
- New migration has a syntax error — check migration file SQL
- Database connection lost during migration — migration may be partially applied
- Conflicting schema changes — manual intervention needed

**Resolution:**
1. Fix the migration SQL error
2. If partially applied, manually complete or roll back the migration
3. Re-run: `./scripts/migrate.sh`

### Application fails to start after upgrade

**Symptoms:** Backend container crashes after pulling new code and rebuilding.

**Diagnosis:**

```bash
# Check backend logs for startup errors
docker compose -f docker-compose.prod.yml logs backend --tail=100

# Check if migrations were run
./scripts/migrate.sh --status
```

**Common causes:**
- Migrations not run — new code expects schema changes that haven't been applied
- New environment variables required — check release notes for new required variables
- Breaking dependency change — rebuild images from scratch

**Resolution:**
1. Run migrations: `./scripts/migrate.sh`
2. Check `.env.production.example` for new variables and add them to `.env.production`
3. Rebuild images: `docker compose -f docker-compose.prod.yml build --no-cache`

### Rolling back an upgrade

If an upgrade causes issues and you need to roll back:

```bash
# 1. Stop services
docker compose -f docker-compose.prod.yml down

# 2. Revert to previous code
git checkout <previous-commit-or-tag>

# 3. Roll back the last migration (if the new version added one)
npm run migrate:down -w backend

# 4. Rebuild and restart
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d

# 5. Verify
curl -s http://localhost/api/health | jq
```

**Caution:** Rolling back migrations may cause data loss. Always back up before upgrading. See the [Database Guide](./database-guide.md#backup--restore) for backup procedures.

## Getting Help

1. Check the logs first (see table above)
2. Verify environment variables in `.env.production`
3. Test the health endpoint: `curl http://localhost/api/health`
4. Review this troubleshooting guide for your specific symptom
5. Check the [Deployment Guide](./deployment-guide.md) for correct setup steps
6. Check the [Database Guide](./database-guide.md) for database-specific issues
7. Check the [Monitoring Runbook](./monitoring-runbook.md) for health check details
8. Check the [Operational Runbook](./operational-runbook.md) for operational procedures
