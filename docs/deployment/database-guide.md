# Database Administration Guide — Shareable Linear Backlog

This guide covers PostgreSQL database administration: schema overview, migrations, backup/restore, connection management, data retention, and maintenance.

**Related guides:**
- [Deployment Guide](./deployment-guide.md) — First-time database setup
- [Environment Variables](./environment-variables.md) — Database-related variables
- [Troubleshooting](./troubleshooting.md) — Database connectivity issues
- [Operational Runbook](./operational-runbook.md) — Scheduled backup and maintenance procedures

---

## Schema Overview

The application uses PostgreSQL with 6 tables and 1 extension. Backlog data is **not** stored in the database — it is fetched live from the Linear API and cached in-memory on the backend.

### Tables

| Table | Purpose | Created In |
|---|---|---|
| `users` | User accounts with approval workflow | Migration 001 |
| `user_preferences` | Per-user JSONB preferences (saved views, filters) | Migration 002 |
| `audit_logs` | User access and admin action audit trail | Migration 003 |
| `sync_history` | Linear sync operation history and status | Migration 004 |
| `session` | Express session store (connect-pg-simple) | Migration 006 |
| `app_settings` | Application-level key-value configuration | Migration 007 |

### Table Details

#### `users`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `SERIAL` | No | Auto-increment | Primary key |
| `email` | `VARCHAR(255)` | No | — | Unique email address |
| `display_name` | `VARCHAR(255)` | Yes | `NULL` | User display name |
| `is_admin` | `BOOLEAN` | No | `FALSE` | Admin privileges flag |
| `is_approved` | `BOOLEAN` | No | `FALSE` | Approval status |
| `is_disabled` | `BOOLEAN` | No | `FALSE` | Account disabled flag |
| `last_access_at` | `TIMESTAMPTZ` | Yes | `NULL` | Last login timestamp |
| `approved_at` | `TIMESTAMPTZ` | Yes | `NULL` | When user was approved |
| `approved_by` | `INTEGER` | Yes | `NULL` | Admin who approved |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update time |

**Indexes:** `idx_users_email` (email), `idx_users_is_approved` (is_approved), `idx_users_active_approved` (partial: is_approved WHERE is_disabled = FALSE)

#### `user_preferences`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `SERIAL` | No | Auto-increment | Primary key |
| `user_id` | `INTEGER` | No | — | FK → users(id), CASCADE delete, unique |
| `preferences` | `JSONB` | No | `'{}'` | Flexible preferences storage |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update time |

#### `audit_logs`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `SERIAL` | No | Auto-increment | Primary key |
| `user_id` | `INTEGER` | Yes | — | FK → users(id), SET NULL on delete |
| `action` | `VARCHAR(100)` | No | — | Action performed (e.g., `user.login`, `admin.approve`) |
| `resource` | `VARCHAR(100)` | Yes | — | Resource type (e.g., `user`, `sync`) |
| `resource_id` | `VARCHAR(255)` | Yes | — | Resource identifier |
| `details` | `JSONB` | Yes | — | Additional action details |
| `ip_address` | `VARCHAR(45)` | Yes | — | Client IP address |
| `is_admin_action` | `BOOLEAN` | No | `FALSE` | Whether this was an admin action |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | When action occurred |

**Indexes:** `idx_audit_logs_user_id`, `idx_audit_logs_action`, `idx_audit_logs_created_at`, `idx_audit_logs_is_admin_action`, `idx_audit_logs_user_id_created_at` (composite), `idx_audit_logs_action_created_at` (composite, DESC)

#### `sync_history`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `SERIAL` | No | Auto-increment | Primary key |
| `status` | `VARCHAR(50)` | No | `'pending'` | Sync status: `pending`, `running`, `completed`, `failed` |
| `trigger_type` | `VARCHAR(50)` | No | — | How sync was triggered: `scheduled`, `manual` |
| `triggered_by` | `INTEGER` | Yes | — | FK → users(id), SET NULL on delete |
| `started_at` | `TIMESTAMPTZ` | No | `NOW()` | Sync start time |
| `completed_at` | `TIMESTAMPTZ` | Yes | — | Sync completion time |
| `duration_ms` | `INTEGER` | Yes | — | Duration in milliseconds |
| `items_synced` | `INTEGER` | Yes | `0` | Number of items synced |
| `items_failed` | `INTEGER` | Yes | `0` | Number of items that failed |
| `error_message` | `TEXT` | Yes | — | Error message if sync failed |
| `error_details` | `JSONB` | Yes | — | Detailed error information |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Record creation time |

**Indexes:** `idx_sync_history_status`, `idx_sync_history_started_at`, `idx_sync_history_status_started_at` (composite)

#### `session`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `sid` | `VARCHAR` | No | — | Session ID (primary key) |
| `sess` | `JSON` | No | — | Session data (serialized) |
| `expire` | `TIMESTAMP(6)` | No | — | Session expiration time |

**Indexes:** `IDX_session_expire` (expire)

Used by `connect-pg-simple` for server-side session storage. Sessions are automatically cleaned up based on the `expire` column.

#### `app_settings`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `key` | `VARCHAR(100)` | No | — | Setting key (primary key) |
| `value` | `TEXT` | No | — | Setting value |
| `description` | `TEXT` | Yes | — | Human-readable description |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update time |

**Seeded with:** `sync_cron_schedule` = `*/15 * * * *` (default sync interval).

### Extensions

| Extension | Purpose | Created In |
|---|---|---|
| `pgcrypto` | Column-level encryption via `pgp_sym_encrypt`/`pgp_sym_decrypt` | Migration 009 |

---

## Migration Procedures

The application uses **node-pg-migrate** for database schema management. Migration files are located in `database/migrations/`.

### Current Migrations

| # | File | Description |
|---|---|---|
| 001 | `001_create-users-table.sql` | Users table with approval workflow |
| 002 | `002_create-user-preferences-table.sql` | User preferences (JSONB) |
| 003 | `003_create-audit-logs-table.sql` | Audit logging for access and admin actions |
| 004 | `004_create-sync-history-table.sql` | Sync operation history |
| 005 | `005_create-additional-indexes.sql` | Composite and partial performance indexes |
| 006 | `006_create-session-table.sql` | Express session store |
| 007 | `007_create-app-settings-table.sql` | App settings with default sync schedule |
| 008 | `008_add_performance_indexes.sql` | Additional performance indexes |
| 009 | `009_enable_pgcrypto.sql` | Enable pgcrypto extension |

### Running Migrations

```bash
# Apply all pending migrations (production)
./scripts/migrate.sh

# Or manually:
DATABASE_URL=postgresql://... npm run migrate:up -w backend

# Check migration status (dry run)
./scripts/migrate.sh --status
```

The `scripts/migrate.sh` script automatically:
1. Sources `.env.production` for `DATABASE_URL`
2. Masks credentials in log output
3. Runs `npm run migrate:up -w backend`

### Rolling Back Migrations

```bash
# Roll back the last migration
npm run migrate:down -w backend

# With explicit DATABASE_URL:
DATABASE_URL=postgresql://... npm run migrate:down -w backend
```

**Caution:** Rolling back a migration may cause data loss if the down migration drops tables or columns. Always back up before rolling back in production.

### Creating New Migrations

```bash
# Create a new migration file
cd backend
npx node-pg-migrate create "description_of_change" --migration-file-language sql
```

This creates a new file in `database/migrations/` with the pattern `NNN_description_of_change.sql`. Add your `CREATE`/`ALTER` statements in the up section and the corresponding `DROP`/`ALTER` rollback in the down section (after `---- Down Migration ----`).

**Rules:**
- Never modify existing migrations — always create new ones
- Use descriptive names (e.g., `010_add_user_avatar_column.sql`)
- Always include a down migration for rollback support
- Test migrations in development before applying to production

---

## Backup & Restore

### Full Database Backup

```bash
# Docker deployment — backup from the db container
docker exec slb-db pg_dump -U slb_user -d shareable_linear_backlog --format=custom \
  > backup_$(date +%Y%m%d_%H%M%S).dump

# Non-Docker — backup directly
pg_dump -U slb_user -d shareable_linear_backlog --format=custom \
  > backup_$(date +%Y%m%d_%H%M%S).dump
```

**Recommended:** Use `--format=custom` for flexible restore options (selective table restore, parallel restore).

### Restore from Backup

```bash
# Docker deployment — restore into the db container
docker exec -i slb-db pg_restore -U slb_user -d shareable_linear_backlog --clean --if-exists \
  < backup_20260213_120000.dump

# Non-Docker — restore directly
pg_restore -U slb_user -d shareable_linear_backlog --clean --if-exists \
  backup_20260213_120000.dump
```

**Flags:**
- `--clean` — Drop existing objects before restoring
- `--if-exists` — Don't error if objects don't exist during drop

### Backup Scheduling

Set up a daily cron job for automated backups:

```bash
# Example crontab entry (daily at 2 AM, retain 30 days)
0 2 * * * docker exec slb-db pg_dump -U slb_user -d shareable_linear_backlog --format=custom > /backups/slb_$(date +\%Y\%m\%d).dump && find /backups -name "slb_*.dump" -mtime +30 -delete
```

### Backup Verification

Periodically test restores to verify backup integrity:

```bash
# Create a temporary database and restore into it
createdb slb_backup_test
pg_restore -d slb_backup_test backup_20260213_120000.dump

# Verify tables exist and have data
psql slb_backup_test -c "SELECT count(*) FROM users;"
psql slb_backup_test -c "SELECT count(*) FROM audit_logs;"

# Clean up
dropdb slb_backup_test
```

See the [Operational Runbook](./operational-runbook.md) for the recommended backup verification schedule.

---

## Connection Management

### Connection Pooling

PostgreSQL is configured with `max_connections=100` in `docker-compose.prod.yml`. The backend uses the `pg` library's built-in connection pooling.

**Connection pool tuning (Docker Compose):**

```yaml
command:
  - "postgres"
  - "-c"
  - "max_connections=100"    # Maximum concurrent connections
  - "-c"
  - "shared_buffers=64MB"   # Shared memory for caching
  - "-c"
  - "effective_cache_size=128MB"  # OS cache estimate
  - "-c"
  - "work_mem=4MB"          # Per-operation memory
```

### DATABASE_URL Format

```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME[?options]
```

**Examples:**

| Context | DATABASE_URL |
|---|---|
| Docker (backend container) | `postgresql://slb_user:PASSWORD@db:5432/shareable_linear_backlog` |
| Host scripts (migrate, seed) | `postgresql://slb_user:PASSWORD@localhost:5432/shareable_linear_backlog` |
| Azure PostgreSQL | `postgresql://user@server:PASSWORD@server.postgres.database.azure.com:5432/db?sslmode=require&uselibpqcompat=true` |

**Important:** In Docker Compose, `docker-compose.prod.yml` overrides the `DATABASE_URL` from `.env.production` to use `db` (the Docker service name) instead of `localhost`. Host scripts (migrate.sh, seed.sh) use the `localhost` URL from `.env.production` directly because they run on the host, connecting to the database via the `127.0.0.1:5432` port binding.

### SSL Connections

For cloud-hosted databases, enable SSL:

```env
DB_SSL_ENABLED=true
```

This is automatically enabled when `NODE_ENV=production`. For Azure PostgreSQL, include SSL parameters in the connection string: `?sslmode=require&uselibpqcompat=true`.

---

## Data Retention

### Audit Logs

Audit logs grow continuously. Implement a retention policy to manage storage:

```sql
-- Delete audit logs older than 90 days
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Check current audit log volume
SELECT
  date_trunc('month', created_at) AS month,
  count(*) AS log_count,
  pg_size_pretty(sum(pg_column_size(audit_logs.*))) AS size_estimate
FROM audit_logs
GROUP BY 1
ORDER BY 1 DESC;
```

**Recommended:** 90-day retention for standard logs, 1-year for admin actions.

### Sync History

```sql
-- Delete sync history older than 30 days
DELETE FROM sync_history WHERE created_at < NOW() - INTERVAL '30 days';

-- Check current sync history volume
SELECT count(*), min(created_at), max(created_at) FROM sync_history;
```

### Session Cleanup

Expired sessions are cleaned up automatically by `connect-pg-simple`. No manual cleanup is needed. To force cleanup:

```sql
-- Remove expired sessions
DELETE FROM session WHERE expire < NOW();
```

### Recommended Retention Schedule

| Data | Retention | Cleanup Frequency |
|---|---|---|
| Audit logs (standard) | 90 days | Weekly |
| Audit logs (admin actions) | 1 year | Monthly |
| Sync history | 30 days | Weekly |
| Sessions | Automatic | Automatic (connect-pg-simple) |

See the [Operational Runbook](./operational-runbook.md) for scheduling cleanup tasks.

---

## Maintenance

### VACUUM and ANALYZE

PostgreSQL auto-vacuum handles routine maintenance, but manual runs may be needed after large deletions:

```bash
# Analyze all tables (update query planner statistics)
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "ANALYZE;"

# Full vacuum (reclaims disk space, locks table briefly)
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "VACUUM FULL audit_logs;"

# Verbose vacuum (shows progress)
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "VACUUM VERBOSE;"
```

### Index Maintenance

Check index health and bloat:

```sql
-- Check index sizes
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Check for unused indexes
SELECT
  indexrelname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Reindex

If indexes become bloated after heavy write activity:

```bash
docker exec slb-db psql -U slb_user -d shareable_linear_backlog -c "REINDEX DATABASE shareable_linear_backlog;"
```

### DB_PASSWORD Character Restriction

The `DB_PASSWORD` must **not** contain URI-reserved characters: `@`, `:`, `/`, `?`, `#`, `%`.

This is because `DB_PASSWORD` is interpolated directly into the `DATABASE_URL` in `docker-compose.prod.yml`. URI-reserved characters would break the connection string parsing. Use alphanumeric characters plus simple symbols (`-`, `_`, `.`).
