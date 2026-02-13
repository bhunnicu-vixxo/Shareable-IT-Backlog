# Operational Runbook — Shareable Linear Backlog

Day-to-day operations, backup schedules, log management, upgrade procedures, scaling guidance, and emergency procedures for the Shareable Linear Backlog application.

**Related guides:**
- [Deployment Guide](./deployment-guide.md) — Initial setup and deployment
- [Monitoring Runbook](./monitoring-runbook.md) — Health checks, alerts, and escalation
- [Troubleshooting](./troubleshooting.md) — Issue diagnosis and resolution
- [Database Guide](./database-guide.md) — Schema, migrations, backup/restore details
- [Environment Variables](./environment-variables.md) — Configuration reference

---

## Daily Operations

### Health Check Review

Verify the application is healthy at the start of each business day:

```bash
# Quick health check
curl -s http://localhost/api/health | jq '.status'

# Full health check with component details
curl -s http://localhost/api/health | jq
```

**Expected:** `status: "ok"`. If `degraded` or `unhealthy`, follow [Monitoring Runbook escalation procedures](./monitoring-runbook.md#escalation-procedures).

### Log Review

Check for errors or warnings in the past 24 hours:

```bash
# Backend errors (last 24 hours)
docker compose -f docker-compose.prod.yml logs backend --since 24h --no-log-prefix | \
  jq 'select(.level >= 50)' 2>/dev/null

# Alternatively, check for error-level messages
docker compose -f docker-compose.prod.yml logs backend --since 24h 2>&1 | grep -i "error\|fatal"
```

For structured Pino JSON log analysis, see [Log Management](#log-management) below.

### Sync Verification

Confirm that Linear sync is running on schedule:

```bash
# Check sync status
curl -s http://localhost/api/sync/status | jq

# Check recent sync history
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT id, status, trigger_type, started_at, duration_ms, items_synced FROM sync_history ORDER BY started_at DESC LIMIT 5;"
```

**Expected:** Recent `completed` syncs within the configured schedule. If no recent syncs, see [Troubleshooting — Sync Scheduling Issues](./troubleshooting.md#sync-scheduling-issues).

---

## Weekly Operations

### Backup Verification

Verify that automated backups are running and recent:

```bash
# Check backup directory for recent files
ls -la /backups/slb_*.dump | tail -5

# Verify latest backup is not corrupted (quick check)
pg_restore --list /backups/slb_$(date +%Y%m%d).dump > /dev/null 2>&1 && echo "OK" || echo "CORRUPT"
```

If no automated backups are configured, see [Database Guide — Backup Scheduling](./database-guide.md#backup-scheduling).

### Disk Space Check

```bash
# Check Docker disk usage
docker system df

# Check database volume size
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT pg_size_pretty(pg_database_size('shareable_linear_backlog'));"

# Check host disk usage
df -h /var/lib/docker
```

**Action thresholds:**
- **>70% full:** Plan cleanup or expansion
- **>85% full:** Urgent — run data retention cleanup immediately
- **>95% full:** Emergency — see [Emergency Procedures](#disk-space-emergency)

### Performance Review

```bash
# Check container resource usage
docker stats --no-stream slb-frontend slb-backend slb-db

# Check database connection count
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# Check average health check latency
curl -s http://localhost/api/health | jq '.metrics.database.averageLatencyMs, .metrics.linear.averageLatencyMs'
```

### Data Retention Cleanup

Run retention cleanup for audit logs and sync history:

```bash
# Clean up audit logs older than 90 days (keep admin actions for 1 year)
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days'
  AND is_admin_action = FALSE;"

docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year'
  AND is_admin_action = TRUE;"

# Clean up sync history older than 30 days
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
DELETE FROM sync_history WHERE created_at < NOW() - INTERVAL '30 days';"

# Verify cleanup
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
SELECT 'audit_logs' AS table_name, count(*) FROM audit_logs
UNION ALL
SELECT 'sync_history', count(*) FROM sync_history;"
```

See [Database Guide — Data Retention](./database-guide.md#data-retention) for full retention policy details.

---

## Monthly Operations

### Security Updates

```bash
# Check for Node.js updates
node -v

# Check for npm dependency updates
npm outdated

# Check for Docker image updates
docker pull postgres:16-alpine
docker pull node:20-alpine
```

**Process:**
1. Review changelogs for security fixes
2. Test updates in development/staging first
3. Apply via the standard [Upgrade Procedure](#upgrade-procedures) below

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update within semver ranges
npm update

# For major version updates, review changelogs first
npm outdated --long
```

### Certificate Renewal Check

If using HTTPS with manually managed certificates:

```bash
# Check certificate expiration
openssl x509 -enddate -noout -in /path/to/cert.crt
```

**Action:** Renew certificates at least 30 days before expiration. If using Let's Encrypt with `certbot`, verify auto-renewal is working:

```bash
certbot renew --dry-run
```

### Database Maintenance

```bash
# Run ANALYZE to update query planner statistics
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "ANALYZE;"

# Check for bloated indexes
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
SELECT
  indexrelname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;"
```

See [Database Guide — Maintenance](./database-guide.md#maintenance) for VACUUM and REINDEX procedures.

---

## Backup Procedures

### Manual Backup

```bash
# Full database backup (custom format for flexible restore)
docker exec slb-db pg_dump -U slb_user -d shareable_linear_backlog --format=custom \
  > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Automated Backup

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2 AM, retain 30 days
0 2 * * * docker exec slb-db pg_dump -U slb_user -d shareable_linear_backlog --format=custom > /backups/slb_$(date +\%Y\%m\%d).dump && find /backups -name "slb_*.dump" -mtime +30 -delete
```

### Backup Storage

- Store backups on a separate disk or network storage
- Keep at least 30 days of daily backups
- Keep monthly backups for 1 year
- Test restore from backup quarterly (see [Database Guide — Backup Verification](./database-guide.md#backup-verification))

### Pre-Upgrade Backup

Always create a backup before upgrading:

```bash
docker exec slb-db pg_dump -U slb_user -d shareable_linear_backlog --format=custom \
  > backup_pre_upgrade_$(date +%Y%m%d_%H%M%S).dump
```

---

## Log Management

### Log Locations

| Service | Access Method | Format |
|---|---|---|
| Backend | `docker compose -f docker-compose.prod.yml logs backend` | Pino JSON |
| Frontend (nginx) | `docker compose -f docker-compose.prod.yml logs frontend` | nginx access/error |
| Database | `docker compose -f docker-compose.prod.yml logs db` | PostgreSQL text |
| All services | `docker compose -f docker-compose.prod.yml logs -f` | Mixed |

### Log Analysis with jq

Backend logs are structured JSON (Pino). Use `jq` for analysis:

```bash
# View formatted logs
docker compose -f docker-compose.prod.yml logs backend --no-log-prefix | jq '.'

# Filter by log level (50 = error, 60 = fatal)
docker compose -f docker-compose.prod.yml logs backend --no-log-prefix | \
  jq 'select(.level >= 50)'

# Filter by component
docker compose -f docker-compose.prod.yml logs backend --no-log-prefix | \
  jq 'select(.component == "health-monitor")'

# Filter by time range (last hour)
docker compose -f docker-compose.prod.yml logs backend --since 1h --no-log-prefix | \
  jq 'select(.component == "sync")'

# Count errors by component
docker compose -f docker-compose.prod.yml logs backend --no-log-prefix | \
  jq 'select(.level >= 50) | .component' | sort | uniq -c | sort -rn
```

### Log Rotation

Configure Docker log rotation to prevent disk space issues. Add to `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

Restart Docker after changes: `sudo systemctl restart docker`

### Using pino-pretty for Human-Readable Logs

```bash
# Install pino-pretty (one-time)
npm install -g pino-pretty

# View formatted backend logs
docker compose -f docker-compose.prod.yml logs backend --no-log-prefix | pino-pretty
```

---

## Upgrade Procedures

### Pre-Upgrade Checklist

- [ ] Back up the database (see [Pre-Upgrade Backup](#pre-upgrade-backup))
- [ ] Check release notes / changelog for breaking changes
- [ ] Check for new required environment variables in `.env.production.example`
- [ ] Verify current health: `curl -s http://localhost/api/health | jq`
- [ ] Notify users of planned maintenance window (if applicable)

### Standard Upgrade (Using deploy.sh)

```bash
# The deploy script handles everything: pull, migrate, build, restart, verify
./scripts/deploy.sh
```

The `scripts/deploy.sh` script performs:
1. `git pull --ff-only` — Pull latest code
2. Start database container (if not running)
3. `./scripts/migrate.sh` — Run pending migrations
4. `docker compose build` — Build new Docker images
5. `docker compose up -d` — Restart services
6. Health check verification (waits up to 60 seconds)

### Manual Upgrade

```bash
# 1. Back up
docker exec slb-db pg_dump -U slb_user -d shareable_linear_backlog --format=custom \
  > backup_pre_upgrade_$(date +%Y%m%d_%H%M%S).dump

# 2. Pull latest code
git pull --ff-only

# 3. Check for new env vars
diff .env.production .env.production.example

# 4. Run migrations
./scripts/migrate.sh

# 5. Rebuild and restart
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d

# 6. Verify
curl -s http://localhost/api/health | jq
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

### Post-Upgrade Verification

```bash
# Verify health
curl -s http://localhost/api/health | jq

# Check version (should reflect new version)
curl -s http://localhost/api/health | jq '.version'

# Verify all containers are healthy
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# Check for errors in logs
docker compose -f docker-compose.prod.yml logs backend --since 5m --no-log-prefix | \
  jq 'select(.level >= 50)'

# Verify sync is working
curl -s http://localhost/api/sync/status | jq
```

### Rollback Procedure

If the upgrade fails:

```bash
# 1. Stop services
docker compose -f docker-compose.prod.yml down

# 2. Revert code
git checkout <previous-commit-or-tag>

# 3. Roll back migration (if new version added one)
npm run migrate:down -w backend

# 4. Rebuild and restart
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d

# 5. Verify
curl -s http://localhost/api/health | jq
```

See [Troubleshooting — Upgrade Issues](./troubleshooting.md#upgrade-issues) for common upgrade problems.

---

## Scaling Guidance

### When to Scale

| Indicator | Threshold | Action |
|---|---|---|
| Response time (P95) | > 2 seconds | Scale backend or optimize queries |
| CPU usage (backend) | > 80% sustained | Increase CPU limit or add instance |
| Memory usage (backend) | > 450 MB (of 512 MB limit) | Increase memory limit |
| Database connections | > 80 active | Increase `max_connections` |
| Database latency | > 50 ms average | Scale database or add indexes |

### Horizontal Scaling (Backend)

The backend is stateless (sessions stored in PostgreSQL) and can be scaled horizontally:

1. **Add backend instances** in `docker-compose.prod.yml`:

```yaml
backend:
  deploy:
    replicas: 2
    resources:
      limits:
        memory: 512M
        cpus: "1.0"
```

2. **Load balance** with nginx (already the frontend proxy):

The frontend nginx already proxies `/api` to the backend. For multiple backend instances, update the nginx configuration to upstream multiple backends.

### Vertical Scaling (Resource Limits)

Adjust resource limits in `docker-compose.prod.yml`:

```yaml
# Backend — increase memory and CPU
backend:
  deploy:
    resources:
      limits:
        memory: 1G      # Default: 512M
        cpus: "2.0"     # Default: 1.0

# Database — increase memory for larger datasets
db:
  deploy:
    resources:
      limits:
        memory: 512M    # Default: 256M
        cpus: "1.0"     # Default: 0.5
```

### Database Connection Pool Tuning

Adjust PostgreSQL settings in `docker-compose.prod.yml`:

```yaml
db:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"       # Default: 100
    - "-c"
    - "shared_buffers=128MB"     # Default: 64MB
    - "-c"
    - "effective_cache_size=256MB" # Default: 128MB
    - "-c"
    - "work_mem=8MB"             # Default: 4MB
```

**Rule of thumb:** `shared_buffers` should be ~25% of available memory; `effective_cache_size` should be ~50-75% of available memory.

---

## Emergency Procedures

### Application Down (Health Check Failures)

**Priority:** Immediate

```bash
# 1. Check what's running
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# 2. Check health endpoint
curl -s http://localhost/api/health | jq

# 3. If no response, restart all services
docker compose --env-file .env.production -f docker-compose.prod.yml restart

# 4. If still down, check logs
docker compose -f docker-compose.prod.yml logs --tail=100

# 5. If services won't start, rebuild
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

Follow the [Monitoring Runbook escalation procedures](./monitoring-runbook.md#escalation-procedures) based on severity.

### Database Corruption Recovery

**Priority:** Critical

```bash
# 1. Stop the application (prevent further writes)
docker compose -f docker-compose.prod.yml stop backend frontend

# 2. Attempt database repair
docker exec slb-db pg_isready -U slb_user -d shareable_linear_backlog

# 3. If database is running but corrupted, try REINDEX
docker exec slb-db psql -U slb_user -d shareable_linear_backlog \
  -c "REINDEX DATABASE shareable_linear_backlog;"

# 4. If repair fails, restore from backup
docker compose -f docker-compose.prod.yml stop db
docker volume rm $(docker volume ls -q | grep pgdata-prod)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d db

# Wait for DB to be healthy, then restore
docker exec -i slb-db pg_restore -U slb_user -d shareable_linear_backlog --clean --if-exists \
  < /backups/slb_latest.dump

# 5. Run migrations (in case backup is from an older version)
./scripts/migrate.sh

# 6. Restart application
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

### Linear API Outage Response

**Priority:** Low (application continues to serve cached data)

```bash
# 1. Verify Linear is the issue
curl -s http://localhost/api/health/linear | jq

# 2. Check Linear status page
# https://status.linear.app

# 3. No action needed — application auto-recovers when Linear is available again
# Sync will resume automatically on the next scheduled run
```

**Impact:** No new data syncs until Linear recovers. Existing cached backlog data remains available. The health status will show `degraded` but the application remains functional.

### Security Incident Response

**Priority:** Critical

```bash
# 1. Assess the incident
# Check audit logs for suspicious activity
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
SELECT * FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;"

# 2. If credentials are compromised:
# a. Rotate SESSION_SECRET (invalidates all sessions)
# b. Rotate LINEAR_API_KEY (revoke old key in Linear settings)
# c. Rotate DB_PASSWORD (update .env.production and Docker Compose)
# d. Restart all services
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d

# 3. If unauthorized access detected:
# a. Disable affected user accounts
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
UPDATE users SET is_disabled = TRUE WHERE email = 'compromised@example.com';"

# b. Review network access controls
grep ALLOWED_NETWORKS .env.production

# 4. Document the incident and notify stakeholders
```

### Disk Space Emergency

**Priority:** High

```bash
# 1. Identify what's consuming space
docker system df -v
df -h

# 2. Quick cleanup — remove old Docker resources
docker system prune -f

# 3. Aggressive data cleanup
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days' AND is_admin_action = FALSE;
DELETE FROM sync_history WHERE created_at < NOW() - INTERVAL '7 days';
DELETE FROM session WHERE expire < NOW();
VACUUM FULL;"

# 4. Truncate Docker logs (emergency only)
truncate -s 0 /var/lib/docker/containers/*/*-json.log

# 5. Verify space recovered
df -h
```

---

## Escalation Contacts

> **Note:** Fill in your team's actual contact information below.

| Role | Name | Contact | When to Escalate |
|---|---|---|---|
| Primary On-Call | _TBD_ | _TBD_ | Application down, database issues |
| Database Admin | _TBD_ | _TBD_ | Database corruption, performance issues |
| Network/Infrastructure | _TBD_ | _TBD_ | Network access issues, SSL/TLS problems |
| Security | _TBD_ | _TBD_ | Security incidents, unauthorized access |
| Linear Admin | _TBD_ | _TBD_ | Linear API key issues, project access |

---

## Operations Calendar

| Frequency | Task | Reference |
|---|---|---|
| **Daily** | Health check review | [Daily Operations](#daily-operations) |
| **Daily** | Log review for errors | [Daily Operations](#daily-operations) |
| **Daily** | Sync verification | [Daily Operations](#daily-operations) |
| **Weekly** | Backup verification | [Weekly Operations](#weekly-operations) |
| **Weekly** | Disk space check | [Weekly Operations](#weekly-operations) |
| **Weekly** | Data retention cleanup | [Weekly Operations](#weekly-operations) |
| **Weekly** | Performance review | [Weekly Operations](#weekly-operations) |
| **Monthly** | Security updates | [Monthly Operations](#monthly-operations) |
| **Monthly** | Dependency updates | [Monthly Operations](#monthly-operations) |
| **Monthly** | Certificate renewal check | [Monthly Operations](#monthly-operations) |
| **Monthly** | Database maintenance (ANALYZE) | [Monthly Operations](#monthly-operations) |
| **Quarterly** | Backup restore test | [Database Guide](./database-guide.md#backup-verification) |
