#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Deploy Shareable Linear Backlog (Docker Compose)
# =============================================================================
# Pulls latest code, builds images, runs migrations, and restarts services.
#
# Usage:
#   ./scripts/deploy.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
DEPLOY_START=$(date +%s)

# Prefer docker compose v2, fall back to legacy docker-compose
if docker compose version &>/dev/null; then
  COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
  COMPOSE=(docker-compose)
else
  error "Docker Compose is not installed. Please install Docker Compose."
  exit 1
fi

compose() {
  "${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# ---------------------------------------------------------------------------
# 1. Pre-flight checks
# ---------------------------------------------------------------------------
info "Starting deployment..."

if [[ ! -f "$COMPOSE_FILE" ]]; then
  error "Production compose file not found: $COMPOSE_FILE"
  exit 1
fi

if [[ ! -f ".env.production" ]]; then
  error ".env.production not found. Run ./scripts/setup.sh first."
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Pull latest code
# ---------------------------------------------------------------------------
info "Pulling latest code from git..."
git pull --ff-only || {
  warn "Git pull failed or not a git repository — continuing with current code"
}

# ---------------------------------------------------------------------------
# 3. Start database (required for migrations)
# ---------------------------------------------------------------------------
info "Starting database container..."
compose up -d db

# Wait for Postgres healthcheck
info "Waiting for database to become healthy..."
RETRIES=30
DELAY=2
for _ in $(seq 1 "$RETRIES"); do
  DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' slb-db 2>/dev/null || echo "unknown")
  if [[ "$DB_HEALTH" == "healthy" ]]; then
    info "Database is healthy!"
    break
  fi
  sleep "$DELAY"
done

# ---------------------------------------------------------------------------
# 4. Run database migrations (MUST succeed)
# ---------------------------------------------------------------------------
info "Running database migrations..."
./scripts/migrate.sh

# ---------------------------------------------------------------------------
# 5. Build Docker images
# ---------------------------------------------------------------------------
info "Building Docker images..."
compose build

# ---------------------------------------------------------------------------
# 6. Restart services
# ---------------------------------------------------------------------------
info "Starting services..."
compose up -d

# ---------------------------------------------------------------------------
# 7. Wait for health checks
# ---------------------------------------------------------------------------
info "Waiting for services to become healthy..."
RETRIES=30
DELAY=2
for i in $(seq 1 "$RETRIES"); do
  BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' slb-backend 2>/dev/null || echo "unknown")
  if [[ "$BACKEND_HEALTH" == "healthy" ]]; then
    info "Backend is healthy!"
    break
  fi

  if [[ "$i" -eq "$RETRIES" ]]; then
    warn "Health check did not pass within $(( RETRIES * DELAY ))s — check container logs"
    compose ps
    compose logs --tail=50
    exit 1
  fi

  sleep "$DELAY"
done

# ---------------------------------------------------------------------------
# 8. Deployment summary
# ---------------------------------------------------------------------------
DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$(( DEPLOY_END - DEPLOY_START ))

echo ""
info "==================================================================="
info "  Deployment complete!"
info "  Duration: ${DEPLOY_DURATION}s"
info "  Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
info ""
info "  Services:"
compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
  compose ps
info ""
info "  Logs: docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f"
info "==================================================================="
