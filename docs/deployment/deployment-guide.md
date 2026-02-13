# Deployment Guide — Shareable Linear Backlog

This guide covers deploying the Shareable Linear Backlog application to the Vixxo network.

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Node.js | >= 20.19.0 | Build tooling and backend runtime |
| Docker | >= 24.x | Container runtime |
| Docker Compose | >= 2.x | Multi-container orchestration |
| PostgreSQL | 16+ (via Docker or standalone) | Application database |
| Git | >= 2.x | Source code management |
| Vixxo network access | — | Internal network deployment |

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   Database      │
│   (nginx)       │────▶│   (Express)     │────▶│   (PostgreSQL)  │
│   Port 80       │     │   Port 3000     │     │   Port 5432     │
│   Static SPA    │     │   API Server    │     │   Data Store    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        └── Docker Network ─────┘
```

- **Frontend** — nginx serves the Vite-built SPA and proxies `/api/*` requests to the backend
- **Backend** — Express API server with Linear sync, session management, and audit logging
- **Database** — PostgreSQL stores backlog data, sessions, user approvals, and audit logs

## First-Time Setup

### 1. Clone the Repository

```bash
git clone https://github.com/bhunnicu-vixxo/Shareable-IT-Backlog.git
cd Shareable-IT-Backlog
```

### 2. Run the Setup Script

The setup script checks prerequisites, creates the environment file, installs dependencies, builds the application, and runs database migrations:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Configure Environment Variables

Edit `.env.production` and fill in all required values:

```bash
# Required — you MUST set these:
DATABASE_URL=postgresql://slb_user:YOUR_STRONG_PASSWORD@localhost:5432/shareable_linear_backlog
DB_PASSWORD=YOUR_STRONG_PASSWORD
LINEAR_API_KEY=lin_api_YOUR_KEY
SESSION_SECRET=$(openssl rand -base64 48)

# Recommended — configure for your network:
ALLOWED_ORIGINS=https://backlog.vixxo.internal
ALLOWED_NETWORKS=10.0.0.0/8,172.16.0.0/12
NETWORK_CHECK_ENABLED=true
```

See `.env.production.example` for the full list of variables with descriptions.

### 4. Deploy with Docker Compose

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

### 5. Verify Deployment

```bash
# Check all services are running and healthy
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# Check backend health endpoint
curl http://localhost/api/health

# View logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

## Deployment Methods

### Method A: Docker Compose (Recommended)

Uses `docker-compose.prod.yml` to run frontend (nginx), backend (Express), and database (PostgreSQL) as Docker containers.

```bash
# Deploy or update
./scripts/deploy.sh

# Or manually:
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

### Method B: Direct Node.js (Non-Docker)

For environments without Docker, run the backend directly with Node.js and serve the frontend from Express.

```bash
# 1. Install dependencies
npm ci

# 2. Build both packages
npm run build -w frontend
npm run build -w backend

# 3. Run database migrations
DATABASE_URL=postgresql://... npm run migrate:up -w backend

# 4. Start the server (Express serves frontend static files)
NODE_ENV=production SERVE_STATIC=true PORT=3000 node backend/dist/server.js
```

## Updating / Redeploying

### Using the Deploy Script

```bash
./scripts/deploy.sh
```

This script:
1. Pulls latest code from git
2. Builds Docker images
3. Runs database migrations
4. Restarts services
5. Verifies health checks

### Manual Update

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

### Database Migrations Only

```bash
./scripts/migrate.sh
```

## Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Set to `production` for deployment |
| `PORT` | No | `3000` | Backend API port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `LINEAR_API_KEY` | Yes | — | Linear API key for data sync |
| `SESSION_SECRET` | Yes (prod) | — | Session cookie signing (32+ chars) |
| `ALLOWED_ORIGINS` | Recommended | `localhost:1576` | CORS allowed origins |
| `ALLOWED_NETWORKS` | Recommended | — | CIDR ranges for network access control |
| `NETWORK_CHECK_ENABLED` | No | `true` (prod) | Enable/disable IP-based access control |
| `SYNC_ENABLED` | No | `true` | Enable scheduled Linear sync |
| `SYNC_CRON_SCHEDULE` | No | `*/15 * * * *` | Cron schedule for sync |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `SERVE_STATIC` | No | `false` | Express serves frontend (non-Docker) |
| `FRONTEND_PORT` | No | `80` | Docker nginx exposed port |

## Build Commands Reference

| Command | Description |
|---|---|
| `npm run build -w frontend` | Build frontend production bundle |
| `npm run build -w backend` | Compile backend TypeScript |
| `npm run start -w backend` | Start backend server |
| `npm run start:prod -w backend` | Start with NODE_ENV=production |
| `npm run migrate:up -w backend` | Run database migrations |
| `npm run test:run -w frontend` | Run frontend tests |
| `npm run test:run -w backend` | Run backend tests |

## Security Checklist

Before going to production, verify:

- [ ] `SESSION_SECRET` is a strong random value (32+ characters)
- [ ] `DATABASE_URL` uses a strong password
- [ ] `LINEAR_API_KEY` is a production key with appropriate scopes
- [ ] `NETWORK_CHECK_ENABLED=true` with correct `ALLOWED_NETWORKS`
- [ ] `ALLOWED_ORIGINS` is set to the production domain
- [ ] `.env.production` is NOT committed to git
- [ ] PostgreSQL port is NOT exposed externally (Docker internal network only)
- [ ] HTTPS is configured (via reverse proxy or load balancer)
