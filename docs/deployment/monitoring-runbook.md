# Monitoring Runbook — Shareable Linear Backlog

**Related guides:**
- [Deployment Guide](./deployment-guide.md) — Setup and configuration
- [Troubleshooting](./troubleshooting.md) — Issue diagnosis and resolution
- [Operational Runbook](./operational-runbook.md) — Day-to-day operations and emergency procedures
- [Database Guide](./database-guide.md) — Database administration

## Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|---|---|---|
| `GET /api/health` | Full health status | `200` with all component statuses, metrics |
| `GET /api/health/db` | Database connectivity only | `200` if connected, `503` if not |
| `GET /api/health/linear` | Linear API connectivity only | `200` if connected or not configured, `503` if Linear is configured but unavailable |
| `GET /api/health/ready` | Readiness probe (critical deps) | `200` if database is ready, `503` if not |
| `GET /api/health/live` | Liveness probe (process running) | `200` always (unless process hung) |

### Full Health Response Format

```json
{
  "status": "ok",
  "timestamp": "2026-02-13T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "ok",
      "connected": true,
      "latencyMs": 5
    },
    "linear": {
      "status": "ok",
      "connected": true,
      "latencyMs": 150
    }
  },
  "metrics": {
    "database": {
      "totalChecks": 1440,
      "consecutiveFailures": 0,
      "latencySamples": 1440,
      "totalLatencyMs": 7200,
      "averageLatencyMs": 5,
      "lastStatus": "ok"
    },
    "linear": {
      "totalChecks": 1440,
      "consecutiveFailures": 0,
      "latencySamples": 1440,
      "totalLatencyMs": 216000,
      "averageLatencyMs": 150,
      "lastStatus": "ok"
    },
    "totalChecks": 1440,
    "startedAt": "2026-02-12T10:30:00.000Z"
  }
}
```

### Status Definitions

| Status | Meaning | HTTP Code |
|---|---|---|
| `ok` | All components healthy | `200` |
| `degraded` | Non-critical component unavailable (Linear API down, DB up) | `200` |
| `unhealthy` | Critical component unavailable (database down) | `503` |

## Alert Configuration

### Webhook Setup

Set the `ALERT_WEBHOOK_URL` environment variable to receive alerts when health status transitions occur.

**Supported webhook targets:**
- Slack incoming webhooks
- Microsoft Teams incoming webhooks
- Any HTTP endpoint accepting POST with JSON body

**Alert payload format:**

```json
{
  "text": "[ALERT] Shareable Linear Backlog — UNHEALTHY\nApplication health degraded from ok to unhealthy.",
  "title": "[ALERT] Shareable Linear Backlog — UNHEALTHY",
  "status": "unhealthy",
  "previousStatus": "ok",
  "timestamp": "2026-02-13T10:30:00.000Z",
  "message": "Application health degraded from ok to unhealthy.",
  "isRecovery": false
}
```

### Alert Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ALERT_WEBHOOK_URL` | Webhook endpoint for alerts (optional) | Not set (alerts disabled) |
| `ALERT_COOLDOWN_MS` | Cooldown between alerts (ms) | `300000` (5 minutes) |
| `HEALTH_CHECK_INTERVAL_MS` | Interval between automated checks (ms) | `60000` (1 minute) |
| `HEALTH_CHECK_LINEAR_TIMEOUT_MS` | Timeout for Linear API check (ms) | `5000` (5 seconds) |

### Alert Thresholds and Behavior

- **Degradation alerts:** Sent when status transitions from `ok` to `degraded` or `unhealthy`
- **Recovery alerts:** Sent when status transitions back to `ok`
- **Cooldown:** Minimum 5 minutes between alerts (configurable via `ALERT_COOLDOWN_MS`)
- **No duplicate alerts:** Repeated checks with the same status do not trigger new alerts

## Escalation Procedures

### Level 1 — Degraded (Linear API Unavailable)

**Impact:** Application can still serve cached backlog data. New syncs will fail.

**Steps:**
1. Check `/api/health/linear` for details
2. Verify `LINEAR_API_KEY` is still valid
3. Check [Linear Status Page](https://status.linear.app) for outages
4. If Linear is down, wait for recovery (application auto-recovers)
5. If API key expired, rotate the key and restart the application

### Level 2 — Unhealthy (Database Unavailable)

**Impact:** Application cannot function. All API requests will fail.

**Steps:**
1. Check `/api/health/db` for details
2. Verify PostgreSQL is running: `docker compose -f docker-compose.prod.yml ps db`
3. Check database logs: `docker compose -f docker-compose.prod.yml logs db`
4. Verify `DATABASE_URL` is correct
5. Check database disk space and connections
6. If database container crashed, restart: `docker compose -f docker-compose.prod.yml restart db`
7. Verify recovery via `/api/health/ready`

### Level 3 — Process Down (Liveness Probe Failing)

**Impact:** Application completely unresponsive.

**Steps:**
1. Check container status: `docker compose -f docker-compose.prod.yml ps backend`
2. Check backend logs: `docker compose -f docker-compose.prod.yml logs backend --tail=100`
3. Restart the backend: `docker compose -f docker-compose.prod.yml restart backend`
4. If repeated crashes, check for memory issues or uncaught exceptions in logs

## Common Failure Scenarios and Remediation

### Database Connection Timeout

**Symptoms:** `/api/health/db` returns `503`, high `latencyMs` values

**Causes:**
- Database overloaded with queries
- Network connectivity issues between backend and database
- Database max connections reached

**Remediation:**
1. Check active connections: `SELECT count(*) FROM pg_stat_activity;`
2. Check for long-running queries: `SELECT * FROM pg_stat_activity WHERE state = 'active';`
3. Increase `max_connections` if needed (docker-compose.prod.yml)
4. Restart database if connections are stuck

### Linear API Rate Limiting

**Symptoms:** `/api/health/linear` intermittently returns `503`, increasing `latencyMs`

**Causes:**
- Too many API requests to Linear
- Aggressive sync schedule

**Remediation:**
1. Check sync schedule (`SYNC_CRON_SCHEDULE`)
2. Increase `HEALTH_CHECK_LINEAR_TIMEOUT_MS` if timeouts are frequent
3. Reduce sync frequency if rate limited

### Webhook Alert Failures

**Symptoms:** No alerts received despite status transitions

**Causes:**
- `ALERT_WEBHOOK_URL` not configured or invalid
- Webhook endpoint unreachable
- Cooldown period preventing alerts

**Remediation:**
1. Verify `ALERT_WEBHOOK_URL` is set correctly
2. Test webhook URL manually: `curl -X POST -H "Content-Type: application/json" -d '{"text":"test"}' $ALERT_WEBHOOK_URL`
3. Check backend logs for `alert-service` component messages
4. Verify cooldown settings (`ALERT_COOLDOWN_MS`)

## Uptime Tracking

### Business Hours Uptime Target

**Target:** 99% uptime during business hours (8 AM - 6 PM, Monday-Friday)

### Monitoring via Health Check Logs

The health monitor logs structured JSON at configurable intervals (default: 1 minute). To calculate uptime:

1. **Query health check logs** for the desired time period
2. **Count total checks** and **count failed checks** (status = `unhealthy`)
3. **Calculate uptime:** `(total - unhealthy) / total * 100`

### Log Analysis

Health check logs use the `health-monitor` component tag. Filter logs with:

```bash
# Using jq to parse Pino JSON logs
cat app.log | jq 'select(.component == "health-monitor")'

# Count unhealthy checks in the last 24 hours
cat app.log | jq 'select(.component == "health-monitor" and .status == "unhealthy")' | wc -l

# Get average database latency
cat app.log | jq 'select(.component == "health-monitor") | .dbLatencyMs' | awk '{sum+=$1; n++} END {print sum/n}'
```

### Docker Health Check Status

Docker tracks container health independently:

```bash
# Check current health status
docker inspect --format='{{.State.Health.Status}}' slb-backend

# View recent health check results
docker inspect --format='{{json .State.Health}}' slb-backend | jq
```
