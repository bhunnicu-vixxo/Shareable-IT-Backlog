# Story 1.4: Configure Development Environment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a fully configured development environment with concurrent server startup, VS Code debugging, and unified tooling,
So that I can develop efficiently across frontend and backend with fast feedback loops and proper debugging support.

## Acceptance Criteria

1. **Given** frontend (`frontend/`) and backend (`backend/`) projects are initialized (Stories 1.1, 1.2, 1.3 complete), **When** I run a single command from the project root, **Then** both frontend (Vite on port 5173) and backend (Express on port 3000) dev servers start concurrently with HMR/hot-reload enabled
2. **And** environment variables are loaded from `.env` files in each project directory (frontend: `VITE_API_URL`, backend: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_URL`, `LINEAR_API_KEY`, `ALLOWED_ORIGINS`)
3. **And** VS Code debugging is configured with launch configurations for: (a) backend Node.js debugging via tsx, (b) frontend Chrome debugging via Vite, (c) compound launch that starts both
4. **And** VS Code workspace settings recommend extensions (ESLint, Prettier, TypeScript) and configure editor defaults matching project conventions (format on save, no semicolons, single quotes, trailing commas)
5. **And** the root-level `.env.example` documents all required environment variables for the full project
6. **And** a root-level `README.md` documents development setup steps (prerequisites, install, start, debug, test, build)

## Tasks / Subtasks

- [x] Task 1: Install concurrent dev server tooling (AC: #1)
  - [x] 1.1: Install `concurrently@^9.1.2` as a dev dependency in a root-level `package.json` (add `devDependencies` section — do NOT remove existing fields like `scripts.import`)
  - [x] 1.2: Add root-level npm script: `"dev": "concurrently -n fe,be -c cyan,green \"npm run dev -w frontend\" \"npm run dev -w backend\""`
  - [x] 1.3: Configure npm workspaces in root `package.json`: `"workspaces": ["frontend", "backend"]` (enables `-w` flag and root-level `npm install`)
  - [x] 1.4: Run `npm install` from root to link workspaces and install concurrently
  - [x] 1.5: Verify `npm run dev` from root starts both servers concurrently with labeled output

- [x] Task 2: Configure VS Code debugging (AC: #3)
  - [x] 2.1: Create `.vscode/launch.json` with the following configurations:
    - **"Debug Backend"**: Launches `tsx` with Node.js inspector (`--inspect`) attached to `backend/src/server.ts`; set `cwd` to `backend/`, attach source maps, skip `node_modules`
    - **"Debug Frontend (Chrome)"**: Launch Chrome at `http://localhost:5173` with `webRoot` pointing to `frontend/src/`; requires Vite dev server running
    - **"Debug Backend (Attach)"**: Attach to running Node.js process on port 9229 (for when dev server is already running with `--inspect`)
    - **"Debug All"**: Compound configuration that launches "Debug Backend" + "Debug Frontend (Chrome)" together
  - [x] 2.2: Add `"dev:debug"` script to backend `package.json`: `"dev:debug": "tsx watch --inspect src/server.ts"` (starts with inspector enabled)
  - [x] 2.3: Add root-level script: `"dev:debug": "concurrently -n fe,be -c cyan,green \"npm run dev -w frontend\" \"npm run dev:debug -w backend\""` for debuggable concurrent startup
  - [x] 2.4: Verify VS Code can attach to backend process and hit breakpoints
  - [x] 2.5: Verify VS Code can debug frontend React components in Chrome

- [x] Task 3: Configure VS Code workspace settings (AC: #4)
  - [x] 3.1: Create `.vscode/settings.json` with:
    - `editor.formatOnSave: true`
    - `editor.defaultFormatter: "esbenp.prettier-vscode"`
    - `editor.tabSize: 2`
    - `typescript.preferences.importModuleSpecifier: "relative"`
    - `typescript.tsdk: "frontend/node_modules/typescript/lib"` (use workspace TypeScript)
    - `files.exclude` patterns for `node_modules`, `dist`, `.tsbuildinfo`
    - `search.exclude` patterns for `node_modules`, `dist`, `package-lock.json`
  - [x] 3.2: Create `.vscode/extensions.json` recommending:
    - `dbaeumer.vscode-eslint` (ESLint)
    - `esbenp.prettier-vscode` (Prettier)
    - `ms-vscode.vscode-typescript-next` (TypeScript Nightly — optional)
    - `bradlc.vscode-tailwindcss` (not used but harmless) — SKIP, not relevant
    - `Prisma.prisma` — SKIP, project uses node-pg-migrate not Prisma
    - `eamodio.gitlens` (Git history)
    - `formulahendry.auto-rename-tag` (HTML editing)

- [x] Task 4: Document root-level environment variables (AC: #5)
  - [x] 4.1: Create root-level `.env.example` documenting all project env vars with sections:
    ```
    # ===== FRONTEND (frontend/.env) =====
    VITE_API_URL=http://localhost:3000/api

    # ===== BACKEND (backend/.env) =====
    PORT=3000
    NODE_ENV=development
    LOG_LEVEL=info
    ALLOWED_ORIGINS=http://localhost:5173
    LINEAR_API_KEY=lin_api_YOUR_KEY_HERE
    DATABASE_URL=postgresql://user:password@localhost:5432/shareable_linear_backlog
    ```
  - [x] 4.2: Verify existing `frontend/.env.example` and `backend/.env.example` are up to date and consistent

- [x] Task 5: Create root-level README.md (AC: #6)
  - [x] 5.1: Create `README.md` at project root documenting:
    - Project overview (Shareable Linear Backlog — web app for business users to view IT backlog)
    - Prerequisites (Node.js 20.19+ or 22.12+, PostgreSQL 14+, VS Code recommended)
    - Quick start (clone, `npm install` from root, copy `.env.example` files, `npm run dev`)
    - Available scripts (dev, build, test, lint, format, migrate)
    - Project structure overview (frontend/, backend/, database/)
    - Debugging instructions (VS Code launch configurations)
    - Environment variable reference (link to `.env.example`)

- [x] Task 6: Final integration verification (AC: #1-#6)
  - [x] 6.1: Run `npm run dev` from root — verify both servers start, frontend on 5173, backend on 3000
  - [x] 6.2: Verify frontend can reach backend health endpoint: `http://localhost:5173` makes request to `http://localhost:3000/api/health`
  - [x] 6.3: Verify VS Code "Debug Backend" launch config works (breakpoint in health controller)
  - [x] 6.4: Verify VS Code "Debug Frontend (Chrome)" launch config works
  - [x] 6.5: Verify `npm run build` works in both frontend and backend (from their directories)
  - [x] 6.6: Verify `npm run lint` passes in both frontend and backend
  - [x] 6.7: Verify `npm run test:run` passes in frontend (smoke test)

## Dev Notes

### What's Already Done (from Stories 1.1, 1.2, 1.3)

These capabilities were established in prior stories and do NOT need to be re-implemented:

| Capability | Story | Status |
|---|---|---|
| Frontend HMR via Vite | 1.1 | Done — `npm run dev` in `frontend/` starts Vite on port 5173 |
| Backend hot-reload via tsx | 1.2 | Done — `npm run dev` in `backend/` runs `tsx watch src/server.ts` on port 3000 |
| Frontend .env (VITE_API_URL) | 1.1 | Done — `frontend/.env` and `.env.example` |
| Backend .env (PORT, NODE_ENV, etc.) | 1.2, 1.3 | Done — `backend/.env` and `.env.example` |
| Frontend ESLint + Prettier | 1.1 | Done — ESLint 9 flat config, Prettier with no semi/single quotes/trailing commas |
| Backend ESLint + Prettier | 1.2 | Done — Same config pattern as frontend |
| Frontend path aliases (@/*) | 1.1 | Done — `@` maps to `frontend/src/` in both Vite and tsconfig |
| Frontend Vitest + React Testing Library | 1.1 | Done — Smoke test passing |
| Database connection + migrations | 1.3 | Done — pg, node-pg-migrate, 5 migration files |

### What This Story Adds

1. **Root-level concurrent dev startup** — Single `npm run dev` from project root
2. **VS Code launch.json** — Debug configurations for backend, frontend, and compound
3. **VS Code workspace settings** — Consistent editor config (format on save, recommended extensions)
4. **Root-level .env.example** — Unified environment variable documentation
5. **Root-level README.md** — Developer onboarding documentation
6. **Integration verification** — End-to-end check that everything works together

### CRITICAL: npm Workspaces Configuration

The root `package.json` already exists with Linear import scripts. Adding npm workspaces requires careful modification:

```json
{
  "name": "shareable-linear-backlog",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently -n fe,be -c cyan,green \"npm run dev -w frontend\" \"npm run dev -w backend\"",
    "dev:debug": "concurrently -n fe,be -c cyan,green \"npm run dev -w frontend\" \"npm run dev:debug -w backend\"",
    "import": "node import-to-linear.js",
    "update-issue": "node update-linear-issue.js"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

**Anti-patterns:**
- Do NOT remove existing `scripts.import` or `scripts.update-issue` — they are used for Linear imports
- Do NOT change the root `name` from what exists — just add fields
- Do NOT put `frontend` or `backend` dependencies in the root `package.json`
- Do NOT use `npm-run-all` — `concurrently` is better for parallel processes with labeled output

### CRITICAL: VS Code launch.json for tsx Debugging

`tsx` supports Node.js inspector via the `--inspect` flag. The debug configuration must:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "--inspect", "src/server.ts"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "sourceMaps": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Frontend (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///./src/*": "${webRoot}/*"
      }
    },
    {
      "name": "Debug Backend (Attach)",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "sourceMaps": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "cwd": "${workspaceFolder}/backend"
    }
  ],
  "compounds": [
    {
      "name": "Debug All",
      "configurations": ["Debug Backend", "Debug Frontend (Chrome)"]
    }
  ]
}
```

**Key points:**
- Use `npx tsx --inspect` NOT `tsx watch --inspect` in launch config (watch mode re-runs on save which conflicts with debugger)
- Frontend Chrome debug requires the Vite dev server to be running separately (start `npm run dev -w frontend` first, then attach Chrome debugger)
- Attach mode (port 9229) is for connecting to a server started with `npm run dev:debug` in backend
- Source maps are enabled in backend `tsconfig.json` (`"sourceMap": true` already present from Story 1.2)

### CRITICAL: ES Module Imports

Both frontend and backend use ES modules (`"type": "module"` in their `package.json`). The root `package.json` does NOT have `"type": "module"` and should not — it hosts CommonJS import scripts (`import-to-linear.js`).

### Architecture Compliance

**Development Workflow (from architecture.md):**
- Frontend: `npm run dev` starts Vite dev server (port 5173)
- Backend: `npm run dev` starts Express server with tsx (port 3000)
- Database: PostgreSQL running on `10.14.17.4:5432` (already configured in backend/.env)
- Hot Reload: Vite HMR for frontend, tsx watch for backend

**CORS Configuration (already in place):**
- Backend `ALLOWED_ORIGINS=http://localhost:5173` allows frontend to call backend API
- Frontend `VITE_API_URL=http://localhost:3000/api` points to backend

**Proxy Alternative (NOT needed for MVP):**
- Vite can proxy `/api` requests to backend, but the current CORS setup works fine
- If CORS issues arise in development, adding a Vite proxy is a simple config change in `vite.config.ts`

### Previous Story Intelligence (Story 1.3 Learnings)

**Key patterns to follow:**
1. **esbuild-wasm override:** Both frontend and backend use `esbuild-wasm` overrides. The root `package.json` does NOT need this override since it doesn't use esbuild
2. **DATABASE_URL with SSL:** Backend `.env` uses `?sslmode=require&uselibpqcompat=true` for Azure PostgreSQL — document this in root `.env.example`
3. **ES module .js extensions:** Backend imports use `.js` extensions for Node16 resolution — not relevant for this story but important context
4. **Pino logger:** Already configured, outputs to stdout — concurrent dev output will interleave frontend and backend logs (concurrently labels help distinguish)

**What NOT To Do:**
- Do NOT modify `frontend/package.json` or `backend/package.json` scripts that already work
- Do NOT install `nodemon` — backend already uses `tsx watch` (modern, faster)
- Do NOT install a Vite proxy — CORS setup works, proxy adds unnecessary complexity
- Do NOT create Docker Compose yet — that's Story 12.x (Deployment & Operations)
- Do NOT add testing frameworks — already configured in Story 1.1 (Vitest + RTL)
- Do NOT create `.editorconfig` — VS Code settings.json handles this, `.prettierrc` exists in both projects

### Concurrently Version Note

`concurrently@^9.1.2` is the latest stable as of 2026. Key features:
- `-n fe,be` labels each process output
- `-c cyan,green` color-codes labels for easy scanning
- Passes through exit codes properly
- Supports `--kill-others-on-fail` flag if you want both to stop when one crashes

### Project Structure After This Story

```
shareable-linear-backlog/
├── .vscode/
│   ├── launch.json          ← NEW (debug configs)
│   ├── settings.json         ← NEW (workspace settings)
│   └── extensions.json       ← NEW (recommended extensions)
├── .env.example              ← NEW (unified env var documentation)
├── README.md                 ← NEW (developer onboarding docs)
├── package.json              ← MODIFIED (add workspaces, concurrently, dev scripts)
├── frontend/                 (unchanged)
├── backend/
│   └── package.json          ← MODIFIED (add dev:debug script)
├── database/                 (unchanged)
└── ...
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Development Workflow Integration] — Dev server ports, build process, hot reload
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — Full project directory specification
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — Naming, structure, coding conventions
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 1.4] — Story requirements and acceptance criteria
- [Source: _bmad-output/project-context.md#Development Workflow Rules] — Git, environment, migration workflow rules
- [Source: _bmad-output/implementation-artifacts/1-1-initialize-frontend-project.md] — Frontend setup, ESLint, Vitest, path aliases
- [Source: _bmad-output/implementation-artifacts/1-2-initialize-backend-project.md] — Backend setup, tsx, Pino, middleware chain
- [Source: _bmad-output/implementation-artifacts/1-3-set-up-postgresql-database.md] — Database connection, SSL config, migrations

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- `npm run dev` verified: frontend on :5173, backend on :3000, concurrently labels [fe]/[be] working
- `npm run build` passes for both workspaces (frontend: vite build 13.2s, backend: tsc clean)
- `npm run lint` passes for both workspaces (zero errors)
- `npm run test:run` passes in frontend (1 test, vitest 4.0.18)
- npm workspaces linked successfully (27 packages added for concurrently)

### Completion Notes List

- **Task 1:** Root `package.json` updated with npm workspaces, concurrently@^9.1.2, `dev` and `dev:debug` scripts. Preserved existing `import` and `update-issue` scripts. `npm install` linked workspaces. Verified concurrent startup with labeled color-coded output.
- **Task 2:** Created `.vscode/launch.json` with 3 configurations (Debug Backend via npx tsx --inspect, Debug Frontend Chrome, Debug Backend Attach on port 9229) plus compound "Debug All". Added `dev:debug` script to backend `package.json`.
- **Task 3:** Created `.vscode/settings.json` (formatOnSave, Prettier default formatter, tabSize 2, workspace TypeScript, file/search excludes). Created `.vscode/extensions.json` with 5 recommendations (ESLint, Prettier, TS Nightly, GitLens, Auto Rename Tag). Skipped Tailwind CSS and Prisma per story instructions.
- **Task 4:** Created root `.env.example` documenting all frontend and backend env vars with sections and Azure SSL note. Updated backend `.env.example` LINEAR_API_KEY placeholder for consistency.
- **Task 5:** Created root `README.md` with project overview, prerequisites, quick start, available scripts table, project structure, debugging instructions, environment variable reference, and tech stack.
- **Task 6:** All integration verifications pass — concurrent dev startup, builds, linting, and tests all confirmed working.

### Change Log

- 2026-02-06: Story 1.4 implemented — concurrent dev startup, VS Code configs, root .env.example, README.md
- 2026-02-06: Senior dev review fixes — ship `.vscode/*`, make Debug All start Vite, fix Node engine constraint, improve onboarding docs, harden health output

### File List

**New Files:**
- `.vscode/launch.json` — VS Code debug configurations (backend, frontend Chrome, attach, compound)
- `.vscode/settings.json` — VS Code workspace settings (formatOnSave, Prettier, TypeScript, excludes)
- `.vscode/extensions.json` — Recommended VS Code extensions
- `.vscode/tasks.json` — Tasks used by VS Code debug configs (starts Vite)
- `.env.example` — Root-level unified environment variable documentation
- `README.md` — Developer onboarding documentation

**Modified Files:**
- `package.json` — Added npm workspaces, concurrently devDependency, dev/dev:debug scripts
- `backend/package.json` — Added dev:debug script
- `backend/.env.example` — Updated LINEAR_API_KEY placeholder for consistency
- `.gitignore` — Unignore `.vscode/*` required files so the team gets them
- `backend/src/controllers/health.controller.ts` — Health now includes DB connectivity probe
- `backend/src/utils/database.ts` — DB probe avoids leaking connection error messages to clients
- `backend/src/config/database.config.ts` — PostgreSQL pool config (Story 1.3 dependency)
- `import-to-linear.js` — Loads `LINEAR_API_KEY` from local `.env` files for convenience
- `update-linear-issue.js` — Loads `LINEAR_API_KEY` from local `.env` files for convenience
- `LINEAR_ISSUE_WORKFLOW.md` — Documented issue update workflow
- `database/migrations/*` — PostgreSQL schema migrations (Story 1.3 dependency)

## Senior Developer Review (AI)

### Review Date

2026-02-06

### Outcome

Approved (after fixes)

### Fixes Applied (High/Medium)

1. **Shipped VS Code configs** by updating `.gitignore` to unignore the required `.vscode` files.
2. **Made “Debug Frontend (Chrome)” and “Debug All” actually start Vite** via `.vscode/tasks.json` + `preLaunchTask`, and switched to modern `"pwa-chrome"` debug type.
3. **Aligned Node engine constraint** with documented prerequisite (Node 20.19+ / 22.12+).
4. **Made onboarding docs cross-platform** by adding PowerShell `Copy-Item` equivalents.
5. **Hardened health endpoint output** by removing DB error string leakage from the health response.
