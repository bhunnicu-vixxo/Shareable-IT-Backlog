#!/usr/bin/env bash
# =============================================================================
# seed.sh — Seed initial data for Shareable Linear Backlog
# =============================================================================
# Seeds the database with initial configuration and admin user.
# Run AFTER migrations have been applied.
#
# Usage:
#   ./scripts/seed.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Prefer docker compose v2, fall back to legacy docker-compose
if docker compose version &>/dev/null; then
  COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
  COMPOSE=(docker-compose)
else
  COMPOSE=()
fi

compose() {
  "${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# Run psql either inside the db container (preferred for Docker deploys) or on host.
run_psql() {
  if [[ "${#COMPOSE[@]}" -gt 0 ]] && compose ps -q db &>/dev/null; then
    compose exec -T db psql "$DATABASE_URL"
    return
  fi

  if command -v psql &>/dev/null; then
    psql "$DATABASE_URL"
    return
  fi

  error "psql is not available. Install PostgreSQL client tools or run with Docker Compose running."
  exit 1
}

# Load production env if available
if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

# Check DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  error "DATABASE_URL is not set. Set it in .env.production or export it."
  exit 1
fi

info "Seeding database..."

SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-}"
SEED_ADMIN_DISPLAY_NAME="${SEED_ADMIN_DISPLAY_NAME:-}"

# Escape single quotes for safe SQL interpolation (prevents SQL injection)
escape_sql() {
  echo "${1//\'/\'\'}"
}
SAFE_ADMIN_EMAIL=$(escape_sql "$SEED_ADMIN_EMAIL")
SAFE_ADMIN_DISPLAY_NAME=$(escape_sql "$SEED_ADMIN_DISPLAY_NAME")

# Seed default application settings (sync schedule, etc.) and optionally bootstrap
# the first admin user for initial access.
#
# Note: the app_settings table is seeded by migration 007, but this script ensures
# default values exist if they were accidentally deleted.
run_psql <<SQL
-- Ensure default sync schedule exists
INSERT INTO app_settings (key, value, description)
VALUES ('sync_cron_schedule', '*/15 * * * *', 'Cron expression for automatic Linear sync')
ON CONFLICT (key) DO NOTHING;

-- Optional: bootstrap an initial admin user (helps first-time setup)
-- Usage:
--   SEED_ADMIN_EMAIL=you@vixxo.com SEED_ADMIN_DISPLAY_NAME="Your Name" ./scripts/seed.sh
DO \$\$
BEGIN
  IF '$SAFE_ADMIN_EMAIL' <> '' THEN
    INSERT INTO users (email, display_name, is_admin, is_approved, is_disabled, approved_at, created_at, updated_at)
    VALUES ('$SAFE_ADMIN_EMAIL', NULLIF('$SAFE_ADMIN_DISPLAY_NAME', ''), TRUE, TRUE, FALSE, NOW(), NOW(), NOW())
    ON CONFLICT (email) DO UPDATE
      SET is_admin = TRUE,
          is_approved = TRUE,
          is_disabled = FALSE,
          display_name = COALESCE(EXCLUDED.display_name, users.display_name),
          approved_at = COALESCE(users.approved_at, NOW()),
          updated_at = NOW();
  END IF;
END \$\$;

-- Log the seed
DO \$\$
BEGIN
  RAISE NOTICE 'Database seeded successfully at %', now();
END \$\$;
SQL

info "Database seeded successfully!"
info ""
info "Next steps:"
info "  1. Start the application"
info "  2. Access the app and register as the first admin user"
info "  3. Approve additional users via the admin dashboard"
