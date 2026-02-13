#!/usr/bin/env bash
# =============================================================================
# setup.sh — Initial server setup for Shareable Linear Backlog
# =============================================================================
# Prerequisites: Node.js 20.19+, Docker, Docker Compose
#
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# 1. Check Node.js version
# ---------------------------------------------------------------------------
info "Checking Node.js version..."
if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Please install Node.js >= 20.19.0"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/^v//')
REQUIRED_MAJOR=20
REQUIRED_MINOR=19
MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

if [[ "$MAJOR" -lt "$REQUIRED_MAJOR" ]] || { [[ "$MAJOR" -eq "$REQUIRED_MAJOR" ]] && [[ "$MINOR" -lt "$REQUIRED_MINOR" ]]; }; then
  error "Node.js version $NODE_VERSION is too old. Required: >= $REQUIRED_MAJOR.$REQUIRED_MINOR.0"
  exit 1
fi
info "Node.js $NODE_VERSION — OK"

# ---------------------------------------------------------------------------
# 2. Check Docker and Docker Compose
# ---------------------------------------------------------------------------
info "Checking Docker..."
if ! command -v docker &>/dev/null; then
  error "Docker is not installed. Please install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi
DOCKER_VERSION=$(docker --version 2>/dev/null || echo "unknown")
info "Docker — $DOCKER_VERSION"

info "Checking Docker Compose..."
if docker compose version &>/dev/null; then
  COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
  info "Docker Compose — $COMPOSE_VERSION"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_VERSION=$(docker-compose --version 2>/dev/null || echo "unknown")
  info "Docker Compose (legacy) — $COMPOSE_VERSION"
else
  error "Docker Compose is not installed. Please install Docker Compose."
  exit 1
fi

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Prefer docker compose v2, fall back to legacy docker-compose
if docker compose version &>/dev/null; then
  COMPOSE=(docker compose)
else
  COMPOSE=(docker-compose)
fi

compose() {
  "${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# ---------------------------------------------------------------------------
# 3. Create production environment file
# ---------------------------------------------------------------------------
if [[ ! -f .env.production ]]; then
  info "Creating .env.production from template..."
  cp .env.production.example .env.production

  warn "==================================================================="
  warn "  .env.production has been created from the template."
  warn "  IMPORTANT: Edit .env.production and fill in all required values"
  warn "  before starting the application."
  warn ""
  warn "  At minimum, you must set:"
  warn "    - DATABASE_URL (or DB_PASSWORD)"
  warn "    - LINEAR_API_KEY"
  warn "    - SESSION_SECRET (32+ characters)"
  warn "==================================================================="

  read -rp "Press Enter to continue after editing .env.production (or Ctrl+C to abort)..."
else
  info ".env.production already exists — skipping template copy"
fi

# ---------------------------------------------------------------------------
# 4. Install npm dependencies
# ---------------------------------------------------------------------------
info "Installing npm dependencies..."
npm ci

# ---------------------------------------------------------------------------
# 5. Build the application
# ---------------------------------------------------------------------------
info "Building frontend..."
npm run build -w frontend

info "Building backend..."
npm run build -w backend

# ---------------------------------------------------------------------------
# 6. Start database and run migrations
# ---------------------------------------------------------------------------
info "Starting database container..."
compose up -d db

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

info "Running database migrations..."
./scripts/migrate.sh

# ---------------------------------------------------------------------------
# 7. Summary
# ---------------------------------------------------------------------------
echo ""
info "==================================================================="
info "  Setup complete!"
info ""
info "  To deploy with Docker:"
info "    docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d"
info ""
info "  To deploy without Docker:"
info "    NODE_ENV=production SERVE_STATIC=true npm run start -w backend"
info ""
info "  See docs/deployment/deployment-guide.md for full instructions."
info "==================================================================="
