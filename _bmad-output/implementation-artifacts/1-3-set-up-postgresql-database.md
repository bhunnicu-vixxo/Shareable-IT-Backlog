# Story 1.3: Set Up PostgreSQL Database

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a PostgreSQL database configured with initial schema, migration tooling, and connection pooling,
So that I can store user preferences, admin settings, audit logs, and sync history for the Shareable Linear Backlog application.

## Acceptance Criteria

1. **Given** PostgreSQL is available at the configured `DATABASE_URL`, **When** the backend starts, **Then** a connection pool is established and the health check endpoint reports database connectivity status
2. **And** the database connection uses `pg` (node-postgres) with a configured `Pool` for connection pooling
3. **And** `node-pg-migrate` is configured as the migration tooling with npm scripts for `migrate:up`, `migrate:down`, and `migrate:create`
4. **And** initial migration files create the following tables: `users`, `user_preferences`, `audit_logs`, `sync_history`
5. **And** all table and column names follow `snake_case` naming conventions per architecture specification
6. **And** proper indexes are created on frequently queried columns (e.g., `idx_users_email`, `idx_audit_logs_user_id`, `idx_sync_history_status`)
7. **And** foreign key constraints are defined with descriptive names per architecture naming patterns
8. **And** `DATABASE_URL` environment variable is documented in `.env.example` and loaded via the existing dotenv configuration
9. **And** the database utility module (`src/utils/database.ts`) exports a `Pool` instance and a `query` helper function
10. **And** database connection errors are logged via Pino and do not crash the server (graceful degradation)

## Tasks / Subtasks

- [x] Task 1: Install PostgreSQL dependencies (AC: #2)
  - [x] 1.1: Install `pg@^8.17.2` as a production dependency
  - [x] 1.2: Install `@types/pg` as a dev dependency
  - [x] 1.3: Install `node-pg-migrate@^8.0.4` as a dev dependency
  - [x] 1.4: Verify all dependencies install without conflicts (check esbuild-wasm override still works)

- [x] Task 2: Configure database connection module (AC: #1, #2, #9, #10)
  - [x] 2.1: Create `src/utils/database.ts` with `pg.Pool` instance reading from `DATABASE_URL` env var
  - [x] 2.2: Configure pool settings: `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`
  - [x] 2.3: Add pool error event handler that logs via Pino (never crashes server)
  - [x] 2.4: Export a `query` helper function that acquires a client from the pool, executes, and releases
  - [x] 2.5: Export pool instance for direct use when transactions are needed
  - [x] 2.6: Add a `testConnection` function that runs `SELECT NOW()` and returns success/failure
  - [x] 2.7: Import `'./config/env.js'` at the top of `database.ts` to ensure dotenv is loaded (matches existing pattern from Story 1.2)

- [x] Task 3: Configure node-pg-migrate (AC: #3)
  - [x] 3.1: Add npm scripts to `package.json`:
    - `"migrate:up": "node-pg-migrate up"`
    - `"migrate:down": "node-pg-migrate down"`
    - `"migrate:create": "node-pg-migrate create --migration-file-language sql"`
  - [x] 3.2: Create `node-pg-migrate` configuration — either via `.node-pg-migraterc` or `package.json` config pointing to `database/migrations/` directory
  - [x] 3.3: Configure migration directory at project root: `database/migrations/` (per architecture spec — outside `backend/src/`)
  - [x] 3.4: Verify `npm run migrate:create -- my-test-migration` generates a file in the correct directory

- [x] Task 4: Create initial migration — users table (AC: #4, #5, #6, #7)
  - [x] 4.1: Create migration `001_create-users-table.sql` with:
    ```sql
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255),
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      is_approved BOOLEAN NOT NULL DEFAULT FALSE,
      is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
      last_access_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      approved_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_is_approved ON users(is_approved);
    ```
  - [x] 4.2: Add down migration: `DROP TABLE IF EXISTS users;`

- [x] Task 5: Create initial migration — user_preferences table (AC: #4, #5, #7)
  - [x] 5.1: Create migration `002_create-user-preferences-table.sql` with:
    ```sql
    CREATE TABLE user_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      preferences JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
    );
    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
    ```
  - [x] 5.2: Add down migration: `DROP TABLE IF EXISTS user_preferences;`

- [x] Task 6: Create initial migration — audit_logs table (AC: #4, #5, #6, #7)
  - [x] 6.1: Create migration `003_create-audit-logs-table.sql` with:
    ```sql
    CREATE TABLE audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100),
      resource_id VARCHAR(255),
      details JSONB,
      ip_address VARCHAR(45),
      is_admin_action BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX idx_audit_logs_is_admin_action ON audit_logs(is_admin_action);
    ```
  - [x] 6.2: Add down migration: `DROP TABLE IF EXISTS audit_logs;`

- [x] Task 7: Create initial migration — sync_history table (AC: #4, #5, #6, #7)
  - [x] 7.1: Create migration `004_create-sync-history-table.sql` with:
    ```sql
    CREATE TABLE sync_history (
      id SERIAL PRIMARY KEY,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      trigger_type VARCHAR(50) NOT NULL,
      triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      duration_ms INTEGER,
      items_synced INTEGER DEFAULT 0,
      items_failed INTEGER DEFAULT 0,
      error_message TEXT,
      error_details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_sync_history_status ON sync_history(status);
    CREATE INDEX idx_sync_history_started_at ON sync_history(started_at);
    ```
  - [x] 7.2: Add down migration: `DROP TABLE IF EXISTS sync_history;`

- [x] Task 8: Create indexes migration (AC: #6)
  - [x] 8.1: Create migration `005_create-additional-indexes.sql` for any composite or partial indexes useful for common queries (e.g., `idx_audit_logs_user_id_created_at` composite index)
  - [x] 8.2: Add down migration dropping those indexes

- [x] Task 9: Update environment configuration (AC: #8)
  - [x] 9.1: Verify `DATABASE_URL` is already in `backend/.env` (done in earlier conversation — `postgresql://tadmin:F%23Dkjw8id78@10.14.17.4:5432/linear`)
  - [x] 9.2: Update `backend/.env.example` to uncomment/add `DATABASE_URL=postgresql://user:password@localhost:5432/shareable_linear_backlog`
  - [x] 9.3: Verify dotenv loads `DATABASE_URL` correctly (URL-encoded `#` as `%23` in password must decode properly)

- [x] Task 10: Update health check to include database status (AC: #1)
  - [x] 10.1: Modify `src/controllers/health.controller.ts` to call `testConnection()` from `database.ts`
  - [x] 10.2: Return database status in health response: `{ status: "ok", timestamp: "...", database: { connected: true, latencyMs: N } }`
  - [x] 10.3: If database is unreachable, health endpoint still returns 200 but with `database: { connected: false, error: "..." }` — app should not fail to start if DB is down

- [x] Task 11: Create database config module (AC: #2)
  - [x] 11.1: Create `src/config/database.config.ts` that exports pool configuration parsed from `DATABASE_URL`
  - [x] 11.2: Use this config in `src/utils/database.ts` (separation of config from utility)

- [x] Task 12: Run migrations and verify (AC: #1-#10)
  - [x] 12.1: Run `npm run migrate:up` against the target database (`10.14.17.4:5432/linear`)
  - [x] 12.2: Verify all tables are created with correct schemas
  - [x] 12.3: Verify indexes exist
  - [x] 12.4: Run `npm run migrate:down` to verify rollback works
  - [x] 12.5: Run `npm run migrate:up` again to verify idempotent migration
  - [x] 12.6: Start dev server (`npm run dev`) and verify health endpoint reports database connected
  - [x] 12.7: Verify `npm run build` (tsc) compiles without errors
  - [x] 12.8: Verify `npm run lint` passes

## Dev Notes

### Architecture Requirements

**Database Technology (from architecture.md):**
- **PostgreSQL 14+** (LTS through 2026) or latest stable (18.1+)
- Leverages existing Vixxo PostgreSQL infrastructure
- Use Cases: user preferences, admin settings, audit logs, sync history

**Target Database (user-provided):**
- **Host:** `10.14.17.4`
- **Port:** `5432`
- **Database Name:** `linear`
- **Username:** `tadmin`
- **DATABASE_URL:** Already configured in `backend/.env` (password contains `#` URL-encoded as `%23`)

**Dependencies (verified current as of 2026-02-06):**
- **pg:** v8.17.2 — Node.js PostgreSQL client with built-in connection pooling
- **@types/pg:** Latest — TypeScript type definitions
- **node-pg-migrate:** v8.0.4 — PostgreSQL migration management (requires Node 20.11+, PostgreSQL 13+)

### CRITICAL: Database Naming Conventions (from architecture.md)

These naming conventions are MANDATORY and enforced across all migrations:

- **Tables:** `snake_case` plural (`users`, `audit_logs`, `sync_history`)
- **Columns:** `snake_case` (`user_id`, `created_at`, `is_admin`)
- **Foreign Keys:** `snake_case` with `_id` suffix (`user_id`, `backlog_item_id`)
- **Indexes:** `idx_` prefix + table + column (`idx_users_email`, `idx_audit_logs_user_id`)
- **Constraints:** Descriptive names (`users_email_unique`, `audit_logs_user_id_fk`)

**Anti-pattern:** Never use `camelCase` for database tables/columns.

### CRITICAL: Connection Pooling Pattern

PostgreSQL connections require a 20-30ms handshake per new connection. The `pg.Pool` manages a pool of reusable connections:

```typescript
// src/utils/database.ts
import '../config/env.js' // Ensure dotenv loaded (matches Story 1.2 pattern)
import pg from 'pg'
import { logger } from './logger.js'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error')
  // Do NOT process.exit — graceful degradation
})

export async function query(text: string, params?: unknown[]) {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start
  logger.debug({ text, duration, rows: result.rowCount }, 'Executed query')
  return result
}

export async function testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  try {
    const start = Date.now()
    await pool.query('SELECT NOW()')
    return { connected: true, latencyMs: Date.now() - start }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ err }, 'Database connection test failed')
    return { connected: false, error: message }
  }
}

export { pool }
```

### CRITICAL: Migration File Structure

Per the architecture spec, migrations live in a `database/migrations/` directory at the **project root level** (not inside `backend/src/`):

```
shareable-linear-backlog/
├── backend/
│   ├── package.json        (npm scripts point to ../database/migrations)
│   └── src/
├── database/
│   ├── migrations/
│   │   ├── 001_create-users-table.sql
│   │   ├── 002_create-user-preferences-table.sql
│   │   ├── 003_create-audit-logs-table.sql
│   │   ├── 004_create-sync-history-table.sql
│   │   └── 005_create-additional-indexes.sql
│   └── seeds/
│       └── seed.sql        (future — admin seed data)
└── ...
```

**node-pg-migrate configuration** in `backend/package.json`:
```json
{
  "scripts": {
    "migrate:up": "node-pg-migrate up --migrations-dir ../database/migrations",
    "migrate:down": "node-pg-migrate down --migrations-dir ../database/migrations",
    "migrate:create": "node-pg-migrate create --migrations-dir ../database/migrations --migration-file-language sql"
  }
}
```

### CRITICAL: ES Module Imports

The backend uses ES modules (`"type": "module"` in `package.json`). All local imports MUST use `.js` extensions:
```typescript
import '../config/env.js'   // ✅ Correct
import '../config/env'      // ❌ Will fail at runtime
```

This matches the pattern established in Story 1.2.

### CRITICAL: Error Handling Pattern

Database errors must follow the project's error handling standards:
- **Log** full error details via Pino (structured, with context)
- **Return** user-friendly errors via the API (never expose internal DB details)
- **Graceful degradation:** App should start and serve health checks even if DB is unreachable
- **Never** log the `DATABASE_URL` (contains credentials)

```typescript
// ❌ Bad — exposes internals
res.status(500).json({ error: { message: err.message } })

// ✅ Good — user-friendly, logs details internally
logger.error({ err, context: 'database-query' }, 'Database query failed')
res.status(500).json({
  error: {
    message: 'Failed to retrieve data. Please try again or contact admin.',
    code: 'DATABASE_ERROR'
  }
})
```

### Database Schema Design Rationale

**`users` table:**
- `is_approved` + `is_disabled` flags support the dual verification workflow (FR16-FR19): network access + admin approval
- `approved_by` tracks which admin approved the user (audit trail)
- `last_access_at` supports user management dashboard (FR21)
- Soft delete via `is_disabled` flag (not hard delete) allows undo per FR17

**`user_preferences` table:**
- JSONB `preferences` column for flexible storage (saved views, filter defaults — Phase 2)
- One-to-one with `users` via unique constraint on `user_id`
- CASCADE delete when user is removed

**`audit_logs` table:**
- Supports both user access logging (FR: who accessed what, when) and admin action logging (FR: user approvals, removals, sync triggers)
- `is_admin_action` flag distinguishes between user and admin audit entries
- `SET NULL` on user delete — audit logs survive user deletion
- `ip_address` for network-based access audit trail
- `details` JSONB for before/after values on admin changes

**`sync_history` table:**
- Tracks automatic and manual sync operations (FR10-FR15)
- `trigger_type`: 'automatic' or 'manual'
- `triggered_by`: NULL for automatic, user ID for manual triggers
- Supports admin dashboard sync status/history view (FR22)
- `items_synced` / `items_failed` counts for partial sync failure tracking (FR15)

### Previous Story Intelligence (Story 1.2 Learnings)

**Key Patterns to Reuse:**
1. **Early dotenv loading:** Import `./config/env.js` at top of any module that reads `process.env` (Story 1.2 pattern)
2. **ES modules with .js extensions:** All local imports must use `.js` extensions (TypeScript Node16 resolution)
3. **esbuild-wasm override:** Already configured in `package.json` — verify new deps don't break it
4. **Pino logger:** Already configured in `src/utils/logger.ts` — reuse for database logging
5. **Health endpoint pattern:** Already at `GET /api/health` — extend, don't replace
6. **Error middleware:** Already returns `{ error: { message, code, details? } }` format

**What NOT To Do:**
- Do NOT create a separate ORM layer (architecture specifies direct `pg` queries via service layer)
- Do NOT put migration files inside `backend/src/` (they go in `database/migrations/` at project root)
- Do NOT use Prisma or Drizzle (architecture chose `pg` + `node-pg-migrate` for simplicity)
- Do NOT hard-code database credentials anywhere (always use `DATABASE_URL` env var)
- Do NOT make the app crash if the database is unreachable (graceful degradation)
- Do NOT log the `DATABASE_URL` or any credentials

### Project Structure Notes

- The `backend/` directory already exists with Express + TypeScript (Story 1.2 complete)
- This story creates the `database/` directory at the project root level per architecture spec
- The `database/migrations/` directory holds SQL migration files managed by node-pg-migrate
- The `database/seeds/` directory is created for future seeding scripts
- Two new files in `backend/src/`: `utils/database.ts` and `config/database.config.ts`
- Modified files: `controllers/health.controller.ts` (add DB status), `package.json` (add deps + scripts), `.env.example` (document DATABASE_URL)

### Architecture Compliance Requirements

**Service Layer Pattern (CRITICAL for future stories):**
- Routes → Controllers → Services → Models/Database
- `database.ts` is a utility used by the **service layer** only
- Controllers NEVER import `database.ts` directly (except health check as a special case)
- Services use `query()` helper for simple queries and `pool` for transactions

**Data Flow:**
- `DATABASE_URL` → `config/database.config.ts` → `utils/database.ts` (Pool) → Services → Controllers → API

**API Response Format for Health Check:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T10:30:00.000Z",
  "database": {
    "connected": true,
    "latencyMs": 12
  }
}
```

### Security Considerations

- `DATABASE_URL` contains credentials — never log it
- Always use parameterized queries (`$1`, `$2`, etc.) — never string concatenation
- The `pg` library automatically handles parameterized query escaping
- `audit_logs.ip_address` stores IPv4/IPv6 for access auditing
- Database encryption at rest is a PostgreSQL server-level configuration (out of scope for this story)

### Testing Standards (Future)

- Database tests will use a separate test database or mock the `pg.Pool`
- Co-located test files: `database.ts` → `database.test.ts`
- Mock `pool.query` in unit tests, use real database in integration tests

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — PostgreSQL selection rationale, migration strategy
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — Database naming conventions (snake_case tables/columns, idx_ indexes)
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — database/migrations/ location
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points] — Backend → Database communication pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries] — Table schemas (users, audit_logs, sync_history, user_preferences)
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 1.3] — Story requirements and acceptance criteria
- [Source: _bmad-output/project-context.md#Database] — Database anti-patterns and naming rules
- [Source: _bmad-output/implementation-artifacts/1-2-initialize-backend-project.md] — Previous story patterns (dotenv, ES modules, esbuild-wasm)

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- PostgreSQL server at 10.14.17.4 requires SSL; initial connection failed with `no pg_hba.conf entry ... no encryption`
- Added `?sslmode=require` to DATABASE_URL but got `ERR_TLS_CERT_ALTNAME_INVALID` — Azure private endpoint cert doesn't match IP address
- Resolved with `?sslmode=require&uselibpqcompat=true` to use standard libpq SSL semantics (encrypt without hostname verification)
- node-pg-migrate emits `Can't determine timestamp` warnings for non-timestamped migration filenames — harmless, migrations still execute in correct order
- pg v8.17.2, @types/pg, node-pg-migrate v8.0.4 installed without conflicts (esbuild-wasm override intact)

### Completion Notes List

- All 12 tasks and 42 subtasks completed successfully
- Installed pg v8.17.2, @types/pg, node-pg-migrate v8.0.4
- Created `src/config/database.config.ts` — pool configuration parsed from `DATABASE_URL`
- Created `src/utils/database.ts` — `pg.Pool` instance with `query()` helper and `testConnection()` probe; pool error handler logs via Pino without crashing
- Configured node-pg-migrate with npm scripts (`migrate:up`, `migrate:down`, `migrate:create`) pointing to `../database/migrations/`
- Created 5 SQL migration files: users, user_preferences, audit_logs, sync_history, additional composite/partial indexes
- All tables use `snake_case` naming per architecture spec; indexes use `idx_` prefix convention
- Foreign keys with `ON DELETE CASCADE` (user_preferences) and `ON DELETE SET NULL` (audit_logs, sync_history)
- Updated health check controller to async, returns `{ status, timestamp, database: { connected, latencyMs } }`
- Updated `.env.example` to document `DATABASE_URL` (no longer commented as "Future")
- Updated `.env` with SSL parameters for Azure PostgreSQL private endpoint
- All migrations verified: up (5 tables + indexes), down (all 5 rolled back), up again (re-applied idempotently)
- Health endpoint verified: `GET /api/health` → `{"status":"ok","timestamp":"...","database":{"connected":true,"latencyMs":891}}`
- `npm run build` (tsc -b) passes with exit code 0
- `npm run lint` (eslint) passes with exit code 0

### File List

- `backend/package.json` — MODIFIED — Added pg, @types/pg, node-pg-migrate dependencies; added migrate:up/down/create npm scripts
- `backend/src/config/database.config.ts` — NEW — Pool configuration parsed from DATABASE_URL
- `backend/src/utils/database.ts` — NEW — pg.Pool instance, query() helper, testConnection() probe
- `backend/src/controllers/health.controller.ts` — MODIFIED — Now async; includes database connectivity status in response
- `backend/.env` — MODIFIED — Added DATABASE_URL with SSL params (sslmode=require&uselibpqcompat=true)
- `backend/.env.example` — MODIFIED — Uncommented DATABASE_URL documentation
- `database/migrations/001_create-users-table.sql` — NEW — Users table with email, admin/approval/disabled flags, timestamps
- `database/migrations/002_create-user-preferences-table.sql` — NEW — User preferences table with JSONB column, FK to users
- `database/migrations/003_create-audit-logs-table.sql` — NEW — Audit logs table for user access and admin action logging
- `database/migrations/004_create-sync-history-table.sql` — NEW — Sync history table for automatic/manual sync tracking
- `database/migrations/005_create-additional-indexes.sql` — NEW — Composite and partial indexes for common query patterns
- `database/seeds/` — NEW — Empty directory for future seed scripts
