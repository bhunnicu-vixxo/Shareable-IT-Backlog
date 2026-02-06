# Shareable Linear Backlog

A web application that enables business users to view and interact with the IT backlog managed in Linear, without requiring direct Linear access.

## Prerequisites

- **Node.js** 20.19+ or 22.12+
- **PostgreSQL** 14+ (or 18.1+ latest stable)
- **VS Code** (recommended) with recommended extensions

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/bhunnicu-vixxo/Shareable-IT-Backlog.git
cd Shareable-IT-Backlog

# 2. Install all dependencies (workspaces handle frontend + backend)
npm install

# 3. Set up environment variables
# PowerShell (Windows)
Copy-Item .env.example frontend\.env
Copy-Item backend\.env.example backend\.env
#
# Bash (macOS/Linux)
# cp .env.example frontend/.env
# cp backend/.env.example backend/.env

# 4. Run database migrations
npm run migrate:up -w backend

# 5. Start both dev servers
npm run dev
```

Frontend runs on **http://localhost:5173** and backend on **http://localhost:3000**.

## Available Scripts

Run from the **project root**:

| Script | Description |
|---|---|
| `npm run dev` | Start frontend + backend dev servers concurrently |
| `npm run dev:debug` | Start with backend Node.js inspector enabled (port 9229) |
| `npm run import` | Import epics/stories from markdown into Linear |
| `npm run update-issue` | Update a Linear issue from the command line |

Run from **frontend/** or **backend/** (or use `-w` flag from root):

| Script | Workspace | Description |
|---|---|---|
| `npm run dev` | both | Start individual dev server |
| `npm run build` | both | Production build |
| `npm run lint` | both | Run ESLint |
| `npm run format` | both | Run Prettier |
| `npm run test` | frontend | Run Vitest in watch mode |
| `npm run test:run` | frontend | Run Vitest once |
| `npm run migrate:up` | backend | Run database migrations up |
| `npm run migrate:down` | backend | Roll back last migration |

## Project Structure

```
shareable-linear-backlog/
├── .vscode/              # VS Code debug configs, settings, extensions
├── frontend/             # Vite + React + TypeScript (port 5173)
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── features/     # Feature-based modules (backlog, admin, etc.)
│   │   ├── shared/       # Shared utilities, hooks, types
│   │   └── App.tsx       # Root component
│   └── package.json
├── backend/              # Express + TypeScript (port 3000)
│   ├── src/
│   │   ├── config/       # Database, app configuration
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── middleware/    # Express middleware (cors, auth, errors)
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic layer
│   │   └── server.ts     # Entry point
│   └── package.json
├── database/
│   └── migrations/       # SQL migration files (node-pg-migrate)
├── .env.example          # All environment variables documented
├── package.json          # Root workspace config + dev scripts
└── README.md
```

## Debugging

VS Code launch configurations are pre-configured in `.vscode/launch.json`:

| Configuration | Description |
|---|---|
| **Debug Backend** | Launch backend with Node.js inspector via tsx |
| **Debug Frontend (Chrome)** | Launch Chrome pointing to Vite dev server |
| **Debug Backend (Attach)** | Attach to a running backend process (port 9229) |
| **Debug All** | Compound: launch backend + frontend Chrome together |

**To debug the backend:**
1. Use the "Debug Backend" launch config, or
2. Run `npm run dev:debug` then use "Debug Backend (Attach)"

**To debug the frontend:**
1. Use the "Debug Frontend (Chrome)" launch config (it starts the Vite dev server automatically)

## Environment Variables

See [`.env.example`](.env.example) for all required environment variables. Each sub-project also has its own `.env.example`:

- `frontend/.env.example` — Frontend configuration (API URL)
- `backend/.env.example` — Backend configuration (port, database, Linear API key, CORS)

> **Note:** For Azure PostgreSQL, the `DATABASE_URL` must include `?sslmode=require&uselibpqcompat=true`.

## Tech Stack

- **Frontend:** Vite, React 19, TypeScript, Chakra UI, TanStack Query, React Router v7
- **Backend:** Express, TypeScript, Pino (logging), Zod (validation), pg (PostgreSQL)
- **Database:** PostgreSQL with node-pg-migrate
- **Tooling:** ESLint 9, Prettier, Vitest, tsx
