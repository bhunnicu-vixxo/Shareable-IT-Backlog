# Troubleshooting Guide — Shareable Linear Backlog

## Health Check Issues

### Health Endpoint Returning "degraded"

**Symptoms:** `GET /api/health` returns `{ "status": "degraded" }`

**Meaning:** The Linear API is unavailable, but the database is connected. The application can still serve cached data.

**Steps:**
1. Check Linear API status: `curl -s http://localhost:3000/api/health/linear | jq`
2. Verify `LINEAR_API_KEY` is set and valid
3. Check [Linear Status Page](https://status.linear.app) for outages
4. If the key is expired, update `LINEAR_API_KEY` in `.env.production` and restart
5. The application will auto-recover when Linear becomes available

### Health Endpoint Returning "unhealthy"

**Symptoms:** `GET /api/health` returns `{ "status": "unhealthy" }` with HTTP 503

**Meaning:** The database is unreachable. The application cannot function.

**Steps:**
1. Check database status: `curl -s http://localhost:3000/api/health/db | jq`
2. Verify PostgreSQL is running: `docker compose -f docker-compose.prod.yml ps db`
3. Check database logs: `docker compose -f docker-compose.prod.yml logs db --tail=50`
4. Verify `DATABASE_URL` is correct in `.env.production`
5. Check disk space on the database volume
6. Restart database: `docker compose -f docker-compose.prod.yml restart db`
7. Verify recovery: `curl -s http://localhost:3000/api/health/ready`

### Liveness Probe Failing

**Symptoms:** `GET /api/health/live` does not respond or returns non-200

**Meaning:** The backend process is not running or is hung.

**Steps:**
1. Check container status: `docker compose -f docker-compose.prod.yml ps backend`
2. Check backend logs: `docker compose -f docker-compose.prod.yml logs backend --tail=100`
3. Restart backend: `docker compose -f docker-compose.prod.yml restart backend`
4. If repeated crashes, check for out-of-memory errors or uncaught exceptions

### Readiness Probe Failing

**Symptoms:** `GET /api/health/ready` returns 503

**Meaning:** One or more critical dependencies are not available (primarily the database).

**Steps:**
1. Run full health check: `curl -s http://localhost:3000/api/health | jq`
2. Identify which component is failing from the response
3. Follow the appropriate section above for database or Linear issues (note: readiness fails when the database is unavailable)

## Database Connectivity Failures

### Connection Refused

**Symptoms:** Health check shows `"connected": false`, backend logs show "ECONNREFUSED"

**Steps:**
1. Verify PostgreSQL container is running
2. Check if the port is correct (default: 5432)
3. In Docker, ensure both containers are on the same network (`slb-network`)
4. Check `DATABASE_URL` — in Docker Compose, use `db` as hostname, not `localhost`

### Connection Pool Exhausted

**Symptoms:** Intermittent database errors, increasing latency in health checks

**Steps:**
1. Check active connections: Connect to DB and run `SELECT count(*) FROM pg_stat_activity;`
2. Check for idle connections: `SELECT * FROM pg_stat_activity WHERE state = 'idle';`
3. Increase `max_connections` in docker-compose.prod.yml if needed
4. Check for connection leaks in application logs

## Linear API Connectivity Failures

### Authentication Error

**Symptoms:** `/api/health/linear` returns `503`, logs show auth errors

**Steps:**
1. Verify `LINEAR_API_KEY` is set in environment
2. Test the key: `curl -H "Authorization: Bearer $LINEAR_API_KEY" https://api.linear.app/graphql`
3. Rotate the API key in Linear settings if expired
4. Update `.env.production` and restart

### Timeout Errors

**Symptoms:** `/api/health/linear` occasionally times out, `latencyMs` values are high

**Steps:**
1. Check if Linear is experiencing slowness ([status page](https://status.linear.app))
2. Increase timeout: Set `HEALTH_CHECK_LINEAR_TIMEOUT_MS=10000` (10 seconds)
3. If persistent, reduce health check frequency to reduce API load

### "not_configured" Status

**Symptoms:** `/api/health` shows Linear status as `"not_configured"`

**Meaning:** `LINEAR_API_KEY` is not set in the environment. This is not an error — the application can run without Linear sync capability.

**Steps:**
1. If Linear integration is needed, set `LINEAR_API_KEY` in `.env.production`
2. Restart the application

## Alert Webhook Failures

### No Alerts Received

**Steps:**
1. Verify `ALERT_WEBHOOK_URL` is set: `echo $ALERT_WEBHOOK_URL`
2. Test webhook manually:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"text":"Test alert from SLB"}' \
     $ALERT_WEBHOOK_URL
   ```
3. Check backend logs for `alert-service` messages:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | grep "alert-service"
   ```
4. Check cooldown: Alerts have a 5-minute cooldown by default. Reduce with `ALERT_COOLDOWN_MS=60000` for testing.

### Too Many Alerts

**Steps:**
1. Increase cooldown: `ALERT_COOLDOWN_MS=600000` (10 minutes)
2. Investigate and fix the underlying health issue causing frequent transitions
3. Check for flapping (rapid ok/degraded transitions) which may indicate an intermittent issue
