#!/usr/bin/env bash
# =============================================================================
# migrate.sh — Run database migrations
# =============================================================================
# Runs node-pg-migrate to apply pending migrations.
#
# Usage:
#   ./scripts/migrate.sh              # Apply pending migrations
#   ./scripts/migrate.sh --status     # Show migration status
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

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

info "Running database migrations..."
info "Database: ${DATABASE_URL%%@*}@***"

if [[ "${1:-}" == "--status" ]]; then
  info "Checking migration status..."
  npm run migrate:up -w backend -- --dry-run 2>&1 || {
    warn "Could not check migration status"
  }
else
  npm run migrate:up -w backend 2>&1
  info "Migrations complete!"
fi
