# Story 1.2: Initialize Backend Project (Express + TypeScript)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a properly configured backend project with Express and TypeScript,
So that I can build the API service with type safety and modern Node.js practices.

## Acceptance Criteria

1. **Given** the project workspace is ready, **When** I run the backend initialization commands, **Then** an Express + TypeScript project is created in `backend/` with proper project structure
2. **And** TypeScript is configured with strict mode
3. **And** development server supports hot reloading
4. **And** production build configuration is set up
5. **And** core dependencies are installed: Express, Pino logger, Helmet.js, Zod, and Express session middleware
6. **And** project structure follows architecture's layer-based organization pattern (`routes/`, `controllers/`, `services/`, `models/`, `middleware/`, `utils/`, `types/`, `config/`)
7. **And** ESLint + Prettier are configured for TypeScript and Node.js
8. **And** environment variable management is set up with `.env` and `.env.example` files
9. **And** basic health check endpoint is implemented at `/api/health`

## Tasks / Subtasks

- [x] Task 1: Initialize Express + TypeScript project (AC: #1, #2)
  - [x] 1.1: Verify Node.js version is 20.19+ or 22.12+ (required by architecture)
  - [x] 1.2: Create `backend/` directory in project root
  - [x] 1.3: Run `npm init -y` to create `package.json`
  - [x] 1.4: Install Express and TypeScript dependencies: `express`, `typescript`, `@types/express`, `@types/node`
  - [x] 1.5: Configure TypeScript with strict mode in `tsconfig.json` (ES2020+ target, module: ES2020, moduleResolution: bundler or node16)
  - [x] 1.6: Create `src/` directory structure with initial folders
  - [x] 1.7: Create `src/app.ts` and `src/server.ts` entry points
  - [x] 1.8: Verify TypeScript compilation succeeds (`tsc -b` passes)

- [x] Task 2: Configure development hot reloading (AC: #3)
  - [x] 2.1: Install development dependencies: `tsx` (modern TypeScript runner) OR `ts-node` + `nodemon` (alternative)
  - [x] 2.2: Configure development script in `package.json` using tsx (`tsx watch src/server.ts`) OR nodemon (`nodemon --exec ts-node src/server.ts`)
  - [x] 2.3: Create `nodemon.json` config file if using nodemon (watch `src/`, ignore `dist/`, exec `ts-node`)
  - [x] 2.4: Verify dev server starts and hot reloads on file changes

- [x] Task 3: Configure production build (AC: #4)
  - [x] 3.1: Configure TypeScript output directory to `dist/` in `tsconfig.json`
  - [x] 3.2: Add build script: `"build": "tsc"` in `package.json`
  - [x] 3.3: Add production start script: `"start": "node dist/server.js"` in `package.json`
  - [x] 3.4: Add `.gitignore` entry for `dist/` directory
  - [x] 3.5: Verify production build completes successfully (`npm run build`)

- [x] Task 4: Install and configure core dependencies (AC: #5)
  - [x] 4.1: Install Express: `express@^4.21.2` (latest stable)
  - [x] 4.2: Install Pino logger: `pino@^10.3.0` and `pino-pretty@^13.1.3` (dev dependency)
  - [x] 4.3: Install Helmet.js: `helmet@^8.1.0` (security headers)
  - [x] 4.4: Install Zod: `zod@^4.3.6` (runtime validation)
  - [x] 4.5: Install Express session: `express-session@^1.18.1` and `@types/express-session@^1.18.0`
  - [x] 4.6: Install dotenv: `dotenv@^16.4.7` (environment variables)
  - [x] 4.7: Install CORS: `cors@^2.8.5` and `@types/cors@^2.8.17` (for Vixxo network CORS)
  - [x] 4.8: Verify all dependencies install without conflicts

- [x] Task 5: Set up project folder structure (AC: #6)
  - [x] 5.1: Create `src/routes/` directory with `index.ts` placeholder
  - [x] 5.2: Create `src/controllers/` directory
  - [x] 5.3: Create `src/services/` directory with subdirectories: `auth/`, `users/`, `sync/`, `backlog/`
  - [x] 5.4: Create `src/models/` directory
  - [x] 5.5: Create `src/middleware/` directory
  - [x] 5.6: Create `src/utils/` directory
  - [x] 5.7: Create `src/types/` directory with `express.d.ts` for Express type extensions
  - [x] 5.8: Create `src/config/` directory
  - [x] 5.9: Add `.gitkeep` files in empty directories to preserve structure

- [x] Task 6: Configure Express app with middleware (AC: #5)
  - [x] 6.1: Set up Express app in `src/app.ts` with basic middleware chain
  - [x] 6.2: Configure Helmet.js middleware (security headers)
  - [x] 6.3: Configure CORS middleware (allow Vixxo network origins)
  - [x] 6.4: Configure Express JSON body parser middleware
  - [x] 6.5: Configure Express URL-encoded body parser middleware
  - [x] 6.6: Set up basic error handling middleware (placeholder for future error middleware)
  - [x] 6.7: Configure routes mounting at `/api` prefix

- [x] Task 7: Implement basic health check endpoint (AC: #9)
  - [x] 7.1: Create `src/routes/health.routes.ts` with GET `/health` route
  - [x] 7.2: Create `src/controllers/health.controller.ts` with health check handler
  - [x] 7.3: Return JSON response: `{ status: "ok", timestamp: ISO8601 }`
  - [x] 7.4: Mount health route at `/api/health` in `src/app.ts`
  - [x] 7.5: Verify health endpoint responds correctly (`curl http://localhost:3000/api/health`)

- [x] Task 8: Configure Pino logger (AC: #5)
  - [x] 8.1: Create `src/utils/logger.ts` with Pino logger instance
  - [x] 8.2: Configure Pino for development (pretty printing) and production (JSON)
  - [x] 8.3: Set log level from environment variable (`LOG_LEVEL` defaulting to `info`)
  - [x] 8.4: Export logger instance for use throughout application
  - [x] 8.5: Add logging to server startup and health check endpoint

- [x] Task 9: Configure ESLint and Prettier (AC: #7)
  - [x] 9.1: Install ESLint: `eslint@^9.18.0`, `@typescript-eslint/parser@^8.18.0`, `@typescript-eslint/eslint-plugin@^8.18.0`
  - [x] 9.2: Create ESLint config file (`.eslintrc.cjs` or `eslint.config.js` flat config)
  - [x] 9.3: Install Prettier: `prettier@^3.8.1`
  - [x] 9.4: Create `.prettierrc` config file (match frontend config: no semi, single quotes, trailing commas)
  - [x] 9.5: Add npm scripts: `"lint": "eslint src"`, `"format": "prettier --write src"`
  - [x] 9.6: Verify linting passes on all source files

- [x] Task 10: Configure environment variables (AC: #8)
  - [x] 10.1: Create `backend/.env` with basic variables: `PORT=3000`, `NODE_ENV=development`, `LOG_LEVEL=info`
  - [x] 10.2: Create `backend/.env.example` documenting all env vars (PORT, NODE_ENV, LOG_LEVEL, future: DATABASE_URL, LINEAR_API_KEY)
  - [x] 10.3: Add `.env` to `.gitignore`
  - [x] 10.4: Load environment variables in `src/server.ts` using `dotenv.config()`
  - [x] 10.5: Use environment variables in server configuration (PORT from env)

- [x] Task 11: Verify complete setup (AC: #1-#9)
  - [x] 11.1: Dev server starts successfully (`npm run dev`)
  - [x] 11.2: Hot reloading works (modify file, verify server restarts)
  - [x] 11.3: Production build completes (`npm run build`)
  - [x] 11.4: Production server starts (`npm start`)
  - [x] 11.5: Health check endpoint responds (`GET /api/health`)
  - [x] 11.6: TypeScript type checking passes (`tsc -b` exit code 0)
  - [x] 11.7: ESLint passes (`npm run lint`)

## Dev Notes

### Architecture Requirements

**Technology Stack (verified current as of 2026-02-05):**
- **Express:** v4.21.2+ (latest stable) — REST API framework
- **TypeScript:** Strict mode, ES2020+ target, modern module resolution
- **Node.js:** 20.19+ or 22.12+ (required by architecture, matches frontend requirement)
- **Pino:** v10.3.0+ — High-performance structured logging (5x faster than Winston)
- **Helmet.js:** v8.1.0+ — Security headers middleware
- **Zod:** v4.3.6+ — Runtime validation for API inputs
- **Express Session:** v1.18.1+ — Session-based authentication (per architecture)

**Development Tools:**
- **tsx:** Modern TypeScript runner (2026 best practice) OR **ts-node + nodemon** (alternative)
- **ESLint:** v9+ with TypeScript support
- **Prettier:** v3.8.1+ — Code formatting

### CRITICAL: Express + TypeScript Setup Patterns

**2026 Best Practice: Use tsx for Development**
The modern approach (2026) uses `tsx` instead of `ts-node + nodemon` for better performance and native hot-reloading:
```bash
npm install -D tsx
# package.json script: "dev": "tsx watch src/server.ts"
```

**Alternative: Traditional ts-node + nodemon**
Still viable, but requires more configuration:
```bash
npm install -D ts-node nodemon
# package.json script: "dev": "nodemon --exec ts-node src/server.ts"
# Requires nodemon.json config file
```

**TypeScript Configuration:**
- **Strict Mode:** Always enabled (`"strict": true` in tsconfig.json)
- **Target:** ES2020+ with modern module resolution
- **Output:** `dist/` directory for compiled JavaScript
- **Source:** `src/` directory for TypeScript source files
- **Module:** ES2020 (ES modules, not CommonJS)
- **Module Resolution:** `bundler` or `node16` (modern resolution)

**Express App Structure:**
```typescript
// src/app.ts - Express app configuration
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './utils/logger';

const app = express();

// Middleware order matters: helmet → cors → body parsers → routes → error
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error middleware (must be last)
app.use(errorMiddleware);

export default app;
```

**Server Entry Point:**
```typescript
// src/server.ts - Server startup
import dotenv from 'dotenv';
import app from './app';
import { logger } from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
```

### Backend Project Structure (from architecture)

```
backend/
├── package.json
├── package-lock.json
├── tsconfig.json
├── nodemon.json (if using nodemon)
├── .eslintrc.cjs (or eslint.config.js)
├── .prettierrc
├── .env
├── .env.example
├── .gitignore
│
└── src/
    ├── server.ts              (Server entry point)
    ├── app.ts                 (Express app configuration)
    │
    ├── routes/
    │   ├── index.ts           (Route aggregator)
    │   ├── health.routes.ts
    │   ├── users.routes.ts    (Future)
    │   ├── backlog.routes.ts  (Future)
    │   ├── sync.routes.ts     (Future)
    │   └── admin.routes.ts    (Future)
    │
    ├── controllers/
    │   ├── health.controller.ts
    │   ├── users.controller.ts    (Future)
    │   ├── backlog.controller.ts  (Future)
    │   ├── sync.controller.ts     (Future)
    │   └── admin.controller.ts    (Future)
    │
    ├── services/
    │   ├── auth/
    │   │   ├── auth.service.ts
    │   │   └── session.service.ts
    │   ├── users/
    │   │   └── user.service.ts
    │   ├── sync/
    │   │   ├── sync.service.ts
    │   │   ├── sync-scheduler.service.ts
    │   │   └── linear-client.service.ts
    │   └── backlog/
    │       └── backlog.service.ts
    │
    ├── models/
    │   ├── user.model.ts
    │   ├── sync-status.model.ts
    │   └── audit-log.model.ts
    │
    ├── middleware/
    │   ├── auth.middleware.ts
    │   ├── error.middleware.ts
    │   ├── validation.middleware.ts
    │   └── rate-limit.middleware.ts
    │
    ├── utils/
    │   ├── logger.ts           (Pino logger instance)
    │   ├── database.ts        (Future: PostgreSQL client)
    │   ├── cache.ts           (Future: In-memory cache)
    │   └── errors.ts          (Error utilities)
    │
    ├── types/
    │   ├── express.d.ts       (Express type extensions)
    │   ├── database.types.ts
    │   └── api.types.ts
    │
    └── config/
        ├── database.config.ts  (Future)
        ├── linear.config.ts    (Future)
        └── app.config.ts
```

### Coding Standards (from project-context.md)

**Express Patterns:**
- **Route Structure:** Routes → Controllers → Services → Models/Database
- **Naming:** Plural REST endpoints (`/api/users`, `/api/backlog-items`)
- **Route Parameters:** Use Express `:id` format (`/api/users/:id`)
- **Error Handling:** Use centralized error middleware, never throw errors directly from routes
- **Middleware Order:** helmet → cors → auth → routes → error (order matters!)

**TypeScript Configuration:**
- **Strict Mode:** Always enabled (`"strict": true` in tsconfig.json)
- **Target:** ES2020+ with modern module resolution
- **Type Safety:** Use `noImplicitAny` and `strictNullChecks` - never use `any` without explicit reason
- **Import/Export:** Use ES modules (`import`/`export`), not CommonJS (`require`/`module.exports`)

**Error Handling:**
- **Backend:** Always use try-catch with proper error logging via Pino
- **API Errors:** Return consistent error format: `{ error: { message, code, details? } }`
- **User Messages:** Always provide specific, actionable error messages, never generic "Something went wrong"

**Logging Patterns:**
- **Structured Logging:** Use Pino's structured JSON logging
- **Log Levels:** Use standard levels: `error`, `warn`, `info`, `debug`
- **Context Fields:** Include `userId`, `requestId`, `action`, `timestamp` where relevant
- **Never Log:** Passwords, tokens, API keys, or sensitive user data

**Naming Conventions:**
- **API Endpoints:** Plural nouns (`/api/users`, `/api/backlog-items`)
- **JSON Fields:** `camelCase` (`userId`, `createdAt`, `isAdmin`)
- **Functions/Variables:** `camelCase` (`getUserData`, `userId`)
- **Constants:** `UPPER_SNAKE_CASE` (`MAX_RETRY_ATTEMPTS`)
- **Types/Interfaces:** `PascalCase` (`User`, `BacklogItem`, `SyncStatus`)

### Previous Story Intelligence (Story 1.1 Learnings)

**Key Learnings from Frontend Initialization:**
1. **Node.js Version:** Must be 20.19+ or 22.12+ (verified requirement)
2. **TypeScript Strict Mode:** Already configured correctly in template, verify same pattern
3. **Path Aliases:** Frontend uses `@/*` mapping - backend can use same pattern if helpful
4. **ESLint Flat Config:** Modern ESLint uses flat config (eslint.config.js) - use same pattern
5. **Prettier Config:** Match frontend config (no semi, single quotes, trailing commas) for consistency
6. **Environment Variables:** Use `.env` files, document in `.env.example`, never commit `.env`
7. **Git Structure:** Backend goes in `backend/` directory as sibling to `frontend/` directory
8. **Package.json:** Backend has its own `package.json`, don't modify root-level one

**What NOT To Do (from Story 1.1):**
- Do NOT create CommonJS files (require/module.exports) — ES modules only
- Do NOT add frontend code to the backend directory
- Do NOT commit `.env` files — only `.env.example`
- Do NOT use `any` type without explicit reason
- Do NOT skip error logging (always log errors with context via Pino)

### Project Structure Notes

- This story creates the `backend/` directory inside the project root (`Shareable Linear Backlog/`)
- The existing project root contains `_bmad/`, `_bmad-output/`, `frontend/`, and Linear import scripts
- The backend goes in a new `backend/` subdirectory as sibling to `frontend/`
- The root-level `package.json` already exists for Linear import scripts — do NOT modify it; the backend has its own `package.json`
- Future Story 1.3 will set up PostgreSQL database (database connection will be added in that story)

### Architecture Compliance Requirements

**Middleware Chain Order (CRITICAL):**
1. Helmet.js (security headers)
2. CORS (Vixxo network origins)
3. Body parsers (JSON, URL-encoded)
4. Session middleware (future, Story 7+)
5. Auth middleware (future, Story 7+)
6. Routes (`/api` prefix)
7. Error middleware (must be last)

**API Response Format:**
- **Success:** Return data directly without wrapper (not `{ data: ... }`)
- **Error:** Consistent format: `{ error: { message, code, details? } }`
- **JSON Fields:** Use `camelCase` in API responses (`userId`, `createdAt`, `isAdmin`)
- **Dates:** ISO 8601 strings (`"2026-02-05T10:30:00Z"`)
- **Null vs Undefined:** Use `null` for missing values in JSON, never `undefined`

**Service Layer Pattern:**
- **Routes** → **Controllers** → **Services** → **Models/Database**
- Controllers handle HTTP concerns (request/response)
- Services contain business logic
- Models handle data access
- Never query database directly from controllers

### Security Considerations

**Helmet.js Configuration:**
- Configure security headers (Content-Security-Policy, X-Frame-Options, etc.)
- Default Helmet config is good starting point, customize as needed

**CORS Configuration:**
- Allow only Vixxo network origins (configure via `ALLOWED_ORIGINS` env var)
- Use comma-separated list: `ALLOWED_ORIGINS=http://localhost:5173,https://internal.vixxo.com`

**Environment Variables:**
- Never commit secrets to git
- Use `.env` files for local development
- Document all required env vars in `.env.example`
- Load env vars using `dotenv.config()` at server startup

### Testing Standards (Future)

**Test Organization:**
- Co-located tests alongside source files (`*.test.ts`)
- Example: `health.controller.ts` + `health.controller.test.ts`
- Test utilities in `src/utils/test-helpers.ts` if needed

**Test Structure:**
- Use descriptive test names
- Focus on critical paths and edge cases
- Mock external dependencies (database, Linear API)

**Note:** Testing setup will be added in future stories. This story focuses on project initialization.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation] — Express + TypeScript selection rationale
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — Full backend structure specification
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — Naming and coding conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST API design, error handling standards
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — Pino logging, security middleware
- [Source: _bmad-output/project-context.md] — Coding standards, Express patterns, anti-patterns
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 1.2] — Story requirements and acceptance criteria
- [Source: _bmad-output/implementation-artifacts/1-1-initialize-frontend-project.md] — Previous story learnings and patterns

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- Node.js v25.2.1 verified (exceeds 22.12+ requirement)
- pino-pretty v14.0.0 does not exist; used ^13.1.3 (latest available)
- esbuild native binary blocked by sandbox; applied esbuild-wasm override (matching frontend pattern)
- TypeScript module: Node16 / moduleResolution: Node16 chosen over ES2020/bundler for correct Node.js ESM runtime resolution (.js extensions in imports)

### Completion Notes List

- All 11 tasks and 58 subtasks completed successfully
- Express + TypeScript backend initialized in `backend/` with ES module support (`"type": "module"`)
- TypeScript strict mode enabled with ES2022 target, Node16 module resolution
- tsx used for development hot-reloading (`tsx watch src/server.ts`)
- Production build via `tsc -b` outputs to `dist/`, runs via `node dist/server.js`
- All core dependencies installed: Express 4.21.2, Pino 10.3.0, Helmet 8.1.0, Zod 4.3.6, express-session 1.18.1, cors 2.8.5, dotenv 16.4.7
- Layer-based folder structure created: routes/, controllers/, services/ (auth, users, sync, backlog), models/, middleware/, utils/, types/, config/
- ESLint 9 flat config with typescript-eslint (matching frontend pattern), Prettier config matches frontend (no semi, single quotes, trailing commas)
- Environment variables managed via dotenv with `.env` and `.env.example`
- Health endpoint verified: `GET /api/health` returns `{ status: "ok", timestamp: "<ISO8601>" }`
- Error middleware returns consistent `{ error: { message, code, details? } }` format per architecture
- Middleware chain order: helmet → cors → body parsers → routes → error (per architecture spec)
- All verifications passed: tsc -b exit 0, npm run lint exit 0, dev server starts, production build + start works, health endpoint responds

### File List

- `backend/package.json` — NEW — npm project config with all dependencies and scripts
- `backend/tsconfig.json` — NEW — TypeScript strict config (ES2022, Node16)
- `backend/eslint.config.js` — NEW — ESLint 9 flat config for TypeScript/Node.js
- `backend/.prettierrc` — NEW — Prettier config (matches frontend)
- `backend/.env` — NEW — Development environment variables
- `backend/.env.example` — NEW — Environment variable documentation
- `backend/.gitignore` — NEW — Backend-specific git ignores
- `backend/src/server.ts` — NEW — Server entry point (early env load + startup logging)
- `backend/src/app.ts` — NEW — Express app with middleware chain + normalized CORS origins
- `backend/src/routes/index.ts` — NEW — Route aggregator
- `backend/src/routes/health.routes.ts` — NEW — Health check route
- `backend/src/controllers/health.controller.ts` — NEW — Health check handler
- `backend/src/middleware/error.middleware.ts` — NEW — Centralized error handler (actionable 500 messaging)
- `backend/src/utils/logger.ts` — NEW — Pino logger (pretty dev, JSON prod; reads env after dotenv load)
- `backend/src/types/express.d.ts` — NEW — Express session type extensions
- `backend/src/services/auth/.gitkeep` — NEW — Placeholder
- `backend/src/services/users/.gitkeep` — NEW — Placeholder
- `backend/src/services/sync/.gitkeep` — NEW — Placeholder
- `backend/src/services/backlog/.gitkeep` — NEW — Placeholder
- `backend/src/models/.gitkeep` — NEW — Placeholder
- `backend/src/config/.gitkeep` — NEW — Placeholder
- `backend/src/config/env.ts` — NEW — Early dotenv loader for Node ESM import-order safety

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-06_

### Summary

This implementation is broadly on track for Story 1.2, but the initial setup had a few critical correctness issues (dotenv + Node ESM import ordering, and Express type mismatch) plus some quality/predictability gaps. Those issues have been fixed in-code/config below.

### Findings Fixed (HIGH/MEDIUM)

- **HIGH**: `.env` values could be ignored due to Node ESM import ordering. Fixed by introducing an early env loader and importing it where env is read.
- **HIGH**: Express v4 runtime with `@types/express` v5 types. Fixed by aligning to `@types/express@4`.
- **MEDIUM**: Non-deterministic `esbuild-wasm@latest` override. Fixed by pinning the override and adding `esbuild-wasm` as an explicit dev dependency.
- **MEDIUM**: CORS origin parsing was naive (no trimming / empty filtering). Fixed by normalizing values from `ALLOWED_ORIGINS`.
- **MEDIUM**: 500 error response message was too generic and not aligned with project-context guidance. Fixed to be more actionable while still not leaking internals.
- **MEDIUM**: `@types/node` was ahead of the target Node runtime range. Fixed by aligning to `@types/node@22`.

### Evidence / Notes

- Build + lint were re-run after fixes (`npm run lint`, `npm run build`) and output artifacts were generated under `backend/dist/`.

## Change Log

- **2026-02-06**: Senior Developer Review (AI) — fixed dotenv/ESM env loading order, aligned Express/node types, pinned esbuild-wasm override, improved CORS origin parsing, and made 500 error messaging more actionable.
