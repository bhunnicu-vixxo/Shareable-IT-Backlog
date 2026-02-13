# Deployment Guide — Shareable Linear Backlog

## Overview

This guide covers deploying the Shareable Linear Backlog application using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- `.env.production` file created from `.env.production.example`
- Database migrations ready

## Deployment Steps

1. **Copy environment file:**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with production values
   ```

2. **Build and start:**
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
   ```

3. **Run database migrations:**
   ```bash
   ./scripts/migrate.sh
   ```

4. **Verify deployment** (see Post-Deployment Verification below)

## Post-Deployment Health Check Verification

After deployment, verify the application is healthy:

```bash
# Full health check
curl -s http://localhost:3000/api/health | jq

# Quick liveness check
curl -s http://localhost:3000/api/health/live

# Readiness check (critical dependencies)
curl -s http://localhost:3000/api/health/ready

# Database connectivity
curl -s http://localhost:3000/api/health/db

# Linear API connectivity
curl -s http://localhost:3000/api/health/linear
```

**Expected full health response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 30,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "ok", "connected": true, "latencyMs": 5 },
    "linear": { "status": "ok", "connected": true, "latencyMs": 150 }
  }
}
```

## Monitoring Setup

### Alert Webhook Configuration

To receive alerts when application health changes:

1. **Set up a webhook endpoint** (Slack, Teams, or custom HTTP endpoint)
2. **Add to `.env.production`:**
   ```env
   ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ALERT_COOLDOWN_MS=300000
   ```
3. **Restart the backend** to pick up new environment variables

### Health Check Tuning

Adjust monitoring intervals in `.env.production`:

```env
# Check every 60 seconds (default)
HEALTH_CHECK_INTERVAL_MS=60000

# Linear API check timeout (default 5s)
HEALTH_CHECK_LINEAR_TIMEOUT_MS=5000
```

For complete monitoring documentation, see [Monitoring Runbook](./monitoring-runbook.md).

## Stopping the Application

```bash
docker compose -f docker-compose.prod.yml down
```

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common issues and solutions.
