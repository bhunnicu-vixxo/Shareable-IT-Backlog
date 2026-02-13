# Deployment Documentation — Shareable Linear Backlog

Complete documentation for deploying, operating, and troubleshooting the Shareable Linear Backlog application.

## Quick Links

| Guide | Description | When to Use |
|---|---|---|
| [Deployment Guide](./deployment-guide.md) | First-time setup, Docker and non-Docker deployment, environment configuration, security checklist | Setting up or deploying the application |
| [Environment Variables](./environment-variables.md) | Comprehensive reference for every environment variable with descriptions, defaults, and valid values | Configuring the application |
| [Database Guide](./database-guide.md) | Schema overview, migration procedures, backup/restore, connection management, data retention, maintenance | Database administration tasks |
| [Troubleshooting](./troubleshooting.md) | Common issues with symptoms, diagnosis steps, and resolution procedures | Something is broken or not working as expected |
| [Monitoring Runbook](./monitoring-runbook.md) | Health check endpoints, alert configuration, escalation procedures, uptime tracking | Setting up monitoring or responding to alerts |
| [Operational Runbook](./operational-runbook.md) | Day-to-day operations, backup schedules, log management, upgrades, scaling, emergency procedures | Running and maintaining the application |

## Recommended Reading Order

**For new team members:**

1. **[Deployment Guide](./deployment-guide.md)** — Understand the architecture and how to deploy
2. **[Environment Variables](./environment-variables.md)** — Learn what each configuration option does
3. **[Database Guide](./database-guide.md)** — Understand the data model and migration system
4. **[Monitoring Runbook](./monitoring-runbook.md)** — Set up monitoring and understand health checks
5. **[Operational Runbook](./operational-runbook.md)** — Learn day-to-day procedures and emergency response
6. **[Troubleshooting](./troubleshooting.md)** — Reference when issues arise

**For quick deployment:**

1. [Deployment Guide — First-Time Setup](./deployment-guide.md#first-time-setup)
2. [Environment Variables](./environment-variables.md)
3. [Deployment Guide — Verify Deployment](./deployment-guide.md#6-verify-deployment)

**For incident response:**

1. [Troubleshooting — Quick Reference](./troubleshooting.md#quick-reference)
2. [Monitoring Runbook — Escalation Procedures](./monitoring-runbook.md#escalation-procedures)
3. [Operational Runbook — Emergency Procedures](./operational-runbook.md#emergency-procedures)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   Database      │
│   (nginx)       │────▶│   (Express)     │────▶│   (PostgreSQL)  │
│   Port 80       │     │   Port 3000     │     │   Port 5432     │
│   Static SPA    │     │   API Server    │     │   Data Store    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        └── Docker Network ─────┘                       │
                                │                       │
                          Linear API              Data Volume
                       (External Sync)          (Persistent)
```

- **Frontend** — nginx serves the Vite-built React SPA and proxies `/api/*` to the backend
- **Backend** — Express API server with Linear sync, session management, health monitoring, and audit logging
- **Database** — PostgreSQL stores users, sessions, audit logs, sync history, and app settings
- **Linear API** — External data source; backlog items are fetched live and cached in-memory

## Key Files

| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | Production Docker Compose configuration |
| `.env.production.example` | Production environment variable template |
| `scripts/setup.sh` | First-time server setup script |
| `scripts/deploy.sh` | Deployment/update script |
| `scripts/migrate.sh` | Database migration runner |
| `scripts/seed.sh` | Database seeding (admin user, default settings) |
