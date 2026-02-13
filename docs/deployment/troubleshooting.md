# Troubleshooting Guide — Shareable Linear Backlog

Common deployment issues and their solutions.

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

## Getting Help

1. Check the logs first (see table above)
2. Verify environment variables in `.env.production`
3. Test the health endpoint: `curl http://localhost/api/health`
4. Review this troubleshooting guide for your specific symptom
5. Check the [deployment guide](./deployment-guide.md) for correct setup steps
