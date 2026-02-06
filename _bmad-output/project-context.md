---
project_name: 'Shareable Linear Backlog'
user_name: 'Rhunnicutt'
date: '2026-02-05'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 50+
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Core Technologies:**
- **Frontend:** Vite + React + TypeScript
- **Backend:** Express + TypeScript
- **Database:** PostgreSQL 14+ (LTS) or 18.1+ (latest stable)
- **Node.js:** 20.19+ or 22.12+ (required for Vite)

**Key Dependencies:**
- React Router v7.13.0+
- TanStack Query (React Query) v5
- Helmet.js v8.1.0+
- Pino v10.3.0+
- Zod (for runtime validation)

**Version Constraints:**
- TypeScript: Strict mode enabled, ES2020+ target
- All versions verified as current (2026)

## Critical Implementation Rules

### Language-Specific Rules

**TypeScript Configuration:**
- **Strict Mode:** Always enabled (`"strict": true` in tsconfig.json)
- **Target:** ES2020+ with modern module resolution
- **Type Safety:** Use `noImplicitAny` and `strictNullChecks` - never use `any` without explicit reason
- **Import/Export:** Use ES modules (`import`/`export`), not CommonJS (`require`/`module.exports`)

**Error Handling:**
- **Frontend:** Use Error Boundaries for React components, never let errors crash the app
- **Backend:** Always use try-catch with proper error logging via Pino
- **API Errors:** Return consistent error format: `{ error: { message, code, details? } }`
- **User Messages:** Always provide specific, actionable error messages, never generic "Something went wrong"

**Async Patterns:**
- **Frontend:** Use async/await with TanStack Query for API calls
- **Backend:** Use async/await for database operations and API calls
- **Error Handling:** Always handle Promise rejections, never leave unhandled promises

**JSON Handling:**
- **Dates:** Always use ISO 8601 strings (`"2026-02-05T10:30:00Z"`)
- **Null vs Undefined:** Use `null` for missing values in JSON responses, never `undefined`
- **Empty Arrays:** Return `[]` not `null` for empty lists
- **Field Naming:** Use `camelCase` in JSON API responses (e.g., `userId`, `createdAt`)

### Framework-Specific Rules

**React Patterns:**

**Hooks Usage:**
- **State Management:** Use React Context for global state (auth, user), TanStack Query for server state, `useState` for local UI state
- **Loading States:** Always use boolean prefix (`isLoading`, `isFetching`, `isSyncing`)
- **Custom Hooks:** Extract reusable logic to custom hooks in `features/*/hooks/` or `shared/hooks/`

**Component Structure:**
- **Naming:** PascalCase for components (`UserCard`), kebab-case for files (`user-card.tsx`)
- **Props:** Always define TypeScript interfaces for component props
- **Immutable Updates:** Always use immutable state updates - never mutate state directly
  ```typescript
  // ✅ Good
  setItems([...items, newItem]);
  setUser({ ...user, name: 'Updated' });
  
  // ❌ Bad
  items.push(newItem);
  user.name = 'Updated';
  ```

**Performance:**
- **Memoization:** Use `React.memo` and `useMemo` only when beneficial (avoid premature optimization)
- **Code Splitting:** Use route-based lazy loading for components
- **Target Performance:** <2s page load, <500ms filtering, <100ms interactions

**Express Patterns:**

**Route Structure:**
- **Pattern:** Routes → Controllers → Services → Models/Database
- **Naming:** Plural REST endpoints (`/api/users`, `/api/backlog-items`)
- **Route Parameters:** Use Express `:id` format (`/api/users/:id`)
- **Error Handling:** Use centralized error middleware, never throw errors directly from routes

**Middleware:**
- **Order Matters:** Apply middleware in correct order (helmet → cors → auth → routes → error)
- **Auth Middleware:** Always verify network access + admin approval before protected routes
- **Error Middleware:** Must be last middleware, catches all errors and formats responses

**Service Layer:**
- **Business Logic:** All business logic goes in services, controllers only handle HTTP concerns
- **Database Access:** Services call database utilities, never direct queries from controllers
- **Error Propagation:** Services throw errors, controllers catch and format for API

### Testing Rules

**Test Organization:**
- **Co-located Tests:** Place test files alongside source files (`*.test.ts`, `*.test.tsx`)
- **Example:** `user-card.tsx` + `user-card.test.tsx` in same directory
- **Test Utilities:** Shared test helpers in `src/utils/test-utils.ts` or `src/shared/test-helpers.ts`

**Test Structure:**
- **Naming:** Test files match source file names with `.test.` suffix
- **Test Names:** Use descriptive test names that explain what is being tested
- **Coverage:** Focus on critical paths and edge cases, not 100% coverage obsession

**Mock Usage:**
- **API Mocks:** Mock API calls in tests, use MSW (Mock Service Worker) if available
- **Component Mocks:** Mock external dependencies, not internal components
- **Database Mocks:** Use test database or in-memory database for integration tests

### Code Quality & Style Rules

**Naming Conventions:**

**Database:**
- Tables: `snake_case` plural (`users`, `audit_logs`)
- Columns: `snake_case` (`user_id`, `created_at`, `is_admin`)

**API:**
- Endpoints: Plural nouns (`/api/users`, `/api/backlog-items`)
- JSON Fields: `camelCase` (`userId`, `createdAt`, `isAdmin`)

**Code:**
- Components: `PascalCase` (`UserCard`, `BacklogItem`)
- Files: `kebab-case.tsx` (`user-card.tsx`, `backlog-item.tsx`)
- Functions/Variables: `camelCase` (`getUserData`, `userId`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_RETRY_ATTEMPTS`)

**File Organization:**
- **Frontend:** Feature-based (`features/backlog/`, `features/admin/`)
- **Backend:** Layer-based (`routes/`, `controllers/`, `services/`, `models/`)
- **Shared Code:** Common utilities in `shared/` directory
- **Config Files:** Root level or `config/` directory

**Linting/Formatting:**
- **ESLint:** Configured for TypeScript and React
- **Prettier:** Consistent code formatting
- **Pre-commit:** Run linting before commits (if configured)

**Documentation:**
- **Comments:** Use comments for "why", not "what" - code should be self-documenting
- **TypeScript Types:** Use interfaces/types instead of inline types for reusability
- **README:** Keep README updated with setup and development instructions

### Development Workflow Rules

**Git Patterns:**
- **Branch Naming:** Use descriptive branch names (e.g., `feature/backlog-filtering`, `fix/sync-error-handling`)
- **Commit Messages:** Clear, descriptive commit messages explaining what and why
- **PR Requirements:** Code must pass linting and type checking before merge

**Environment Configuration:**
- **Environment Files:** Use `.env` files for configuration, never commit secrets
- **Environment Variables:** Document required env vars in `.env.example`
- **Frontend/Backend:** Separate `.env` files for frontend and backend

**Database Migrations:**
- **Migration Files:** Use migration tools (Prisma Migrate or similar) for schema changes
- **Naming:** Descriptive migration names (`001_create_users_table.sql`)
- **Never:** Never modify existing migrations, create new ones for changes

### Critical Don't-Miss Rules

**Anti-Patterns to Avoid:**

**State Management:**
- ❌ Never mutate state directly (`items.push()`, `user.name = ...`)
- ❌ Never use Redux/Zustand for MVP (use Context + TanStack Query)
- ❌ Never store server state in React state (use TanStack Query)

**API Patterns:**
- ❌ Never return wrapped success responses (return data directly, not `{ data: ... }`)
- ❌ Never use `snake_case` in JSON API responses (use `camelCase`)
- ❌ Never return `undefined` in JSON (use `null`)

**Database:**
- ❌ Never use `camelCase` for database tables/columns (use `snake_case`)
- ❌ Never query database directly from controllers (use service layer)
- ❌ Never skip input validation (use Zod for runtime validation)

**Error Handling:**
- ❌ Never use generic error messages ("Something went wrong")
- ❌ Never expose internal error details to users (log details, show user-friendly message)
- ❌ Never skip error logging (always log errors with context via Pino)

**Security:**
- ❌ Never skip input sanitization (validate all API inputs)
- ❌ Never log sensitive data (passwords, tokens, API keys)
- ❌ Never skip authentication checks (verify network + admin approval)

**Performance:**
- ❌ Never fetch data without caching (use TanStack Query caching)
- ❌ Never skip code splitting for large routes
- ❌ Never use `any` type without explicit reason (defeats TypeScript benefits)

**Edge Cases to Handle:**

**API Edge Cases:**
- Handle Linear API unavailability gracefully (show cached data with freshness indicator)
- Handle partial sync failures (some data updates, some doesn't)
- Handle missing items (404 responses with helpful error messages)

**Frontend Edge Cases:**
- Handle empty states (no results, no data)
- Handle loading states (show spinners, disable interactions)
- Handle error states (show error messages with retry options)

**Database Edge Cases:**
- Handle connection failures (retry logic, graceful degradation)
- Handle constraint violations (user-friendly error messages)
- Handle concurrent updates (optimistic locking if needed)

**Security Considerations:**
- Always verify network access before allowing any request
- Always check admin approval status before admin operations
- Always sanitize user inputs before database queries
- Always use parameterized queries (never string concatenation)
- Always encrypt sensitive data at rest and in transit

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge during implementation

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

**Last Updated:** 2026-02-05
