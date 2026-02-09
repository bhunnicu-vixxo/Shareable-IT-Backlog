# Story 2.4: Implement Linear Data Models and TypeScript Types

Linear Issue ID: VIX-338
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want TypeScript types for Linear data models,
so that I have type safety when working with Linear data throughout the application.

## Acceptance Criteria

1. **Given** `@linear/sdk` is already installed (`^73.0.0`), **When** I work with Linear data in the backend, **Then** application-level DTO interfaces are defined for all relevant Linear entities: Issue (backlog item), Project, Team, User, Label, Comment, and WorkflowState
2. **And** each DTO maps SDK types to `camelCase` API-response-friendly shapes (no SDK-specific classes or lazy-loading proxies leak to consumers)
3. **And** Zod schemas are defined for each DTO to enable runtime validation of data entering the API layer
4. **And** a transformer/mapper module converts SDK entity instances to DTOs (handles optional fields, null-safety, and date serialisation to ISO 8601)
5. **And** frontend-side TypeScript interfaces mirror the backend DTOs for API consumption, co-located in `frontend/src/features/backlog/types/`
6. **And** pagination types are defined for cursor-based pagination (matching Linear's pagination model)
7. **And** shared API response types are defined for backlog list, backlog detail, and sync status endpoints
8. **And** all existing `LinearClientService` public methods return properly typed `LinearQueryResult<DTO>` instead of raw SDK types where practical (or a thin adapter wraps them)
9. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
10. **And** unit tests verify transformers produce correct DTO shapes from mock SDK data

## Tasks / Subtasks

- [x] Task 1: Define backend DTO interfaces (AC: #1, #2)
  - [x] 1.1: Create `backend/src/types/linear-entities.types.ts` with:
    ```typescript
    /** Flattened, API-safe representation of a Linear Issue. */
    export interface BacklogItemDto {
      id: string
      identifier: string          // e.g. "VIX-338"
      title: string
      description: string | null
      priority: number            // 0 = None, 1 = Urgent … 4 = Low
      priorityLabel: string       // "Urgent" | "High" | "Normal" | "Low" | "None"
      status: string              // Workflow state name, e.g. "In Progress"
      statusType: string          // WorkflowState type: "backlog" | "unstarted" | "started" | "completed" | "cancelled"
      assigneeId: string | null
      assigneeName: string | null
      projectId: string | null
      projectName: string | null
      teamId: string
      teamName: string
      labels: LabelDto[]
      createdAt: string           // ISO 8601
      updatedAt: string           // ISO 8601
      completedAt: string | null  // ISO 8601 or null
      dueDate: string | null      // ISO 8601 date or null
      sortOrder: number           // Linear's sort order for priority display
      url: string                 // Deep-link to Linear
    }

    export interface LabelDto {
      id: string
      name: string
      color: string
    }

    export interface CommentDto {
      id: string
      body: string                // Markdown content
      createdAt: string           // ISO 8601
      updatedAt: string           // ISO 8601
      userId: string | null
      userName: string | null
    }

    export interface ProjectDto {
      id: string
      name: string
      description: string | null
      state: string
      url: string
    }

    export interface TeamDto {
      id: string
      name: string
      key: string                 // e.g. "VIX"
    }

    export interface UserDto {
      id: string
      name: string
      email: string
      avatarUrl: string | null
      active: boolean
    }
    ```
  - [x] 1.2: Ensure all DTO fields use `camelCase` naming and JSON-safe primitives (string, number, boolean, null). No `Date` objects — always ISO 8601 strings.

- [x] Task 2: Define Zod schemas for DTOs (AC: #3)
  - [x] 2.1: Create `backend/src/types/linear-entities.schemas.ts` with a Zod schema for each DTO:
    ```typescript
    import { z } from 'zod/v4'

    export const labelDtoSchema = z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
    })

    export const backlogItemDtoSchema = z.object({
      id: z.string(),
      identifier: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      priority: z.number().int().min(0).max(4),
      priorityLabel: z.string(),
      status: z.string(),
      statusType: z.string(),
      assigneeId: z.string().nullable(),
      assigneeName: z.string().nullable(),
      projectId: z.string().nullable(),
      projectName: z.string().nullable(),
      teamId: z.string(),
      teamName: z.string(),
      labels: z.array(labelDtoSchema),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
      completedAt: z.iso.datetime().nullable(),
      dueDate: z.string().nullable(),
      sortOrder: z.number(),
      url: z.string().url(),
    })
    // … similar for commentDtoSchema, projectDtoSchema, teamDtoSchema, userDtoSchema
    ```
  - [x] 2.2: Export inferred types as aliases: `export type BacklogItemDtoValidated = z.infer<typeof backlogItemDtoSchema>`
  - [x] 2.3: Import `z` from `'zod/v4'` (the project already uses this import path — see `linear.config.ts`)

- [x] Task 3: Create SDK-to-DTO transformer module (AC: #4)
  - [x] 3.1: Create `backend/src/services/sync/linear-transformers.ts`
  - [x] 3.2: Implement `toBacklogItemDto(issue: Issue): Promise<BacklogItemDto>`:
    - Resolves lazy SDK relations: `issue.state`, `issue.assignee`, `issue.project`, `issue.team`, `issue.labels()`
    - Maps `issue.priority` number to `priorityLabel` string using Linear's convention:
      ```typescript
      const PRIORITY_LABELS: Record<number, string> = {
        0: 'None', 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low',
      }
      ```
    - Serialises dates with `.toISOString()`
    - Sets `statusType` from `state.type` (string enum in Linear SDK)
    - Sets `sortOrder` from `issue.sortOrder`
  - [x] 3.3: Implement `toCommentDto(comment: Comment): Promise<CommentDto>`:
    - Resolves `comment.user` for user info
  - [x] 3.4: Implement `toProjectDto(project: Project): ProjectDto` (no lazy fields needed)
  - [x] 3.5: Implement `toTeamDto(team: Team): TeamDto` (no lazy fields needed)
  - [x] 3.6: Implement `toUserDto(user: User): UserDto` (no lazy fields needed)
  - [x] 3.7: Implement `toBacklogItemDtos(issues: Issue[]): Promise<BacklogItemDto[]>` — batch transformer with `Promise.all`
  - [x] 3.8: Implement `toCommentDtos(comments: Comment[]): Promise<CommentDto[]>` — batch transformer with `Promise.all`

- [x] Task 4: Define pagination and API response types (AC: #6, #7)
  - [x] 4.1: Create `backend/src/types/api.types.ts`:
    ```typescript
    /** Cursor-based pagination info matching Linear's model. */
    export interface PaginationInfo {
      hasNextPage: boolean
      endCursor: string | null
    }

    /** Paginated list response wrapper. */
    export interface PaginatedResponse<T> {
      items: T[]
      pageInfo: PaginationInfo
      totalCount: number
    }

    /** Standard API error response (matches error.middleware.ts). */
    export interface ApiErrorResponse {
      error: {
        message: string
        code: string
        details?: unknown
      }
    }

    /** Sync status response shape. */
    export interface SyncStatusResponse {
      lastSyncedAt: string | null   // ISO 8601
      status: 'idle' | 'syncing' | 'success' | 'error'
      itemCount: number | null
      errorMessage: string | null
    }
    ```

- [x] Task 5: Define frontend types (AC: #5)
  - [x] 5.1: Create `frontend/src/features/backlog/types/backlog.types.ts` with frontend mirrors:
    ```typescript
    /** Backlog item as returned by GET /api/backlog-items. */
    export interface BacklogItem {
      id: string
      identifier: string
      title: string
      description: string | null
      priority: number
      priorityLabel: string
      status: string
      statusType: string
      assigneeName: string | null
      projectName: string | null
      teamName: string
      labels: Label[]
      createdAt: string
      updatedAt: string
      completedAt: string | null
      dueDate: string | null
      sortOrder: number
      url: string
    }

    export interface Label {
      id: string
      name: string
      color: string
    }

    export interface BacklogItemComment {
      id: string
      body: string
      createdAt: string
      updatedAt: string
      userName: string | null
    }

    export interface PaginationInfo {
      hasNextPage: boolean
      endCursor: string | null
    }

    export interface BacklogListResponse {
      items: BacklogItem[]
      pageInfo: PaginationInfo
      totalCount: number
    }
    ```
  - [x] 5.2: Keep frontend types lean — omit IDs the frontend doesn't need (e.g. `assigneeId`, `projectId`, `teamId`). The backend DTO is the superset; the frontend type is the subset sent over the wire.

- [x] Task 6: Create unit tests for transformers (AC: #10)
  - [x] 6.1: Create `backend/src/services/sync/linear-transformers.test.ts`
  - [x] 6.2: Test: `toBacklogItemDto` returns correct shape from mock SDK Issue
  - [x] 6.3: Test: `toBacklogItemDto` maps priority number to correct label string
  - [x] 6.4: Test: `toBacklogItemDto` handles null assignee, null project gracefully
  - [x] 6.5: Test: `toBacklogItemDto` serialises dates to ISO 8601 strings
  - [x] 6.6: Test: `toBacklogItemDto` resolves labels array
  - [x] 6.7: Test: `toCommentDto` returns correct shape from mock SDK Comment
  - [x] 6.8: Test: `toCommentDto` handles null user gracefully
  - [x] 6.9: Test: `toBacklogItemDtos` batch transforms multiple issues
  - [x] 6.10: Test: Zod schema validates a valid DTO without errors
  - [x] 6.11: Test: Zod schema rejects invalid data (missing required fields)

- [x] Task 7: Integration verification (AC: #9)
  - [x] 7.1: `npm run build` passes with zero TypeScript errors in `backend/`
  - [x] 7.2: `npm run build` passes with zero TypeScript errors in `frontend/`
  - [x] 7.3: `npm run lint` passes in `backend/`
  - [x] 7.4: `npm run test:run` passes all existing and new tests in `backend/`

## Dev Notes

### What's Already Done (from Stories 2.1–2.3)

| Capability | Story | File |
|---|---|---|
| `@linear/sdk@^73.0.0` installed | 2.1 | `backend/package.json` |
| SDK types auto-generated (`Issue`, `Comment`, etc.) | 2.1 | `@linear/sdk` |
| `LinearClientService` with typed public methods | 2.1 | `backend/src/services/sync/linear-client.service.ts` |
| Rate-limit types (`FullRateLimitInfo`, `LinearQueryResult<T>`) | 2.1–2.2 | `backend/src/types/linear.types.ts` |
| Error types (`LinearApiError`, `LinearNetworkError`, `LinearConfigError`) | 2.1 | `backend/src/utils/linear-errors.ts` |
| `RateLimiter` + `RetryHandler` services | 2.2–2.3 | `backend/src/services/sync/rate-limiter.ts`, `retry-handler.ts` |
| Config via Zod (`LinearConfig` from `zod/v4`) | 1.2 | `backend/src/config/linear.config.ts` |
| Pino structured logging | 1.2 | `backend/src/utils/logger.ts` |
| Error middleware with `RATE_LIMITED` handling | 2.2 | `backend/src/middleware/error.middleware.ts` |
| Vitest configured with `--pool=threads` | 2.1 | `backend/package.json` |
| Frontend placeholder types (`AppConfig`) | 1.1 | `frontend/src/types/index.ts` |
| 72 passing tests (client + rate-limiter + retry-handler) | 2.1–2.3 | test files |

### What This Story Adds

1. **Backend DTO interfaces** — Flat, JSON-safe types for API responses (`BacklogItemDto`, `CommentDto`, `ProjectDto`, `TeamDto`, `UserDto`, `LabelDto`)
2. **Zod schemas** — Runtime validation for DTOs entering the API layer
3. **Transformer module** — Converts `@linear/sdk` lazy-loading class instances to plain DTOs
4. **Pagination/API types** — `PaginatedResponse<T>`, `SyncStatusResponse`, `ApiErrorResponse`
5. **Frontend types** — Lean frontend mirrors for API consumption
6. **Unit tests** — Transformer correctness + Zod schema validation

### CRITICAL: `@linear/sdk` Types Are Lazy-Loading Classes — Not Plain Objects

The `@linear/sdk` `Issue`, `Comment`, `User`, `Project`, `Team`, `Label`, and `WorkflowState` types are **class instances with lazy-loading getters**, not plain data objects.

```typescript
// ❌ WRONG — these are async lazy-loading properties, not plain fields:
const name = issue.assignee.name  // TypeError: Cannot read properties of undefined

// ✅ CORRECT — must await the lazy-loading getter:
const assignee = await issue.assignee  // Promise<User | undefined>
const name = assignee?.name
```

**Implications for transformers:**
- `issue.state` → `Promise<WorkflowState>` (must `await`)
- `issue.assignee` → `Promise<User | undefined>` (must `await`, can be undefined)
- `issue.project` → `Promise<Project | undefined>` (must `await`, can be undefined)
- `issue.team` → `Promise<Team>` (must `await`)
- `issue.labels()` → `Promise<IssueLabelConnection>` → `.nodes` for array
- `comment.user` → `Promise<User | undefined>` (must `await`)

This is WHY we need a transformer module — to resolve all lazy relations once and produce a flat, plain DTO that can be serialised to JSON.

### CRITICAL: `@linear/sdk` Priority Mapping

Linear SDK `Issue.priority` is a number 0–4:

| SDK Value | Label | Description |
|---|---|---|
| 0 | None | No priority set |
| 1 | Urgent | Highest priority |
| 2 | High | High priority |
| 3 | Normal | Standard priority |
| 4 | Low | Lowest priority |

Map this in the transformer — do NOT rely on `issue.priorityLabel` which is a getter that returns a Promise.

### CRITICAL: Date Serialisation

- All `Date` objects from SDK must be serialised to ISO 8601 strings via `.toISOString()`
- `issue.createdAt` and `issue.updatedAt` are `Date` objects
- `issue.completedAt` is `Date | undefined` — map `undefined` to `null`
- `issue.dueDate` is `string | undefined` (already a string) — map `undefined` to `null`
- JSON API responses use `null` for absent values, never `undefined`

### CRITICAL: Zod Import Path

The project uses `zod/v4` — NOT `zod`:

```typescript
// ✅ Correct
import { z } from 'zod/v4'

// ❌ Wrong — will resolve to wrong Zod version
import { z } from 'zod'
```

### CRITICAL: ESM Import Pattern

All local imports MUST use `.js` extensions:

```typescript
// ✅ Correct
import type { BacklogItemDto } from '../../types/linear-entities.types.js'

// ❌ Wrong — will fail at runtime
import type { BacklogItemDto } from '../../types/linear-entities.types'
```

### CRITICAL: Do NOT Use GraphQL Code Generator

The architecture doc mentions "GraphQL Code Generator" as an option, but `@linear/sdk` already provides strongly-typed auto-generated types built from Linear's GraphQL schema. There is NO need for a separate codegen step. The SDK IS the codegen.

### CRITICAL: Do NOT Modify Existing `linear.types.ts`

The existing `backend/src/types/linear.types.ts` contains rate-limit types used by Stories 2.1–2.3. Create a NEW file `linear-entities.types.ts` for entity DTOs to keep concerns separated.

### CRITICAL: Frontend Types Are a Subset of Backend DTOs

The backend DTO (`BacklogItemDto`) is the superset containing all fields. The frontend type (`BacklogItem`) should be a lean subset that the API actually sends over the wire. For example, `assigneeId`, `projectId`, `teamId` are internal IDs the frontend doesn't need directly — it uses the resolved names instead.

### CRITICAL: `WorkflowState.type` for Status Classification

Linear's `WorkflowState` has a `.type` property that classifies the state into one of: `"backlog"`, `"unstarted"`, `"started"`, `"completed"`, `"cancelled"`. This is critical for the frontend to categorise items by lifecycle phase (e.g., filtering by active vs completed items). Map this to `statusType` in the DTO.

### CRITICAL: `Issue.sortOrder` for Priority Display

Linear provides `issue.sortOrder` (a floating-point number) that represents the item's position within its priority group. This is crucial for the backlog display — items should be sorted by `priority` first, then by `sortOrder` within each priority level.

### Test Patterns from Previous Stories

**Mock SDK entities for transformer tests:**

```typescript
// Create mock SDK Issue objects that mimic lazy-loading getters
function createMockIssue(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'issue-1',
    identifier: 'VIX-1',
    title: 'Test Issue',
    description: 'Test description',
    priority: 2,
    sortOrder: 1.5,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-02-01T14:30:00Z'),
    completedAt: undefined,
    dueDate: undefined,
    url: 'https://linear.app/vixxo/issue/VIX-1',
    // Lazy-loading getters must return Promises:
    get state() { return Promise.resolve({ name: 'In Progress', type: 'started' }) },
    get assignee() { return Promise.resolve({ id: 'user-1', name: 'Jane', email: 'jane@vixxo.com' }) },
    get project() { return Promise.resolve({ id: 'proj-1', name: 'Shareable IT Backlog' }) },
    get team() { return Promise.resolve({ id: 'team-1', name: 'Vixxo', key: 'VIX' }) },
    labels: () => Promise.resolve({ nodes: [{ id: 'lbl-1', name: 'Backend', color: '#395389' }] }),
    ...overrides,
  }
}
```

**Vitest on Windows:** Use `--pool=threads` flag, scope to `src/` directory (already configured).

### Architecture Compliance

**From architecture.md:**
- Types/interfaces: PascalCase (`BacklogItemDto`, `CommentDto`) ✅
- JSON fields: camelCase (`assigneeName`, `createdAt`) ✅
- Co-located tests (`*.test.ts` alongside source files) ✅
- Feature-based frontend organisation (`features/backlog/types/`) ✅
- Layer-based backend organisation (`types/`, `services/`) ✅
- TypeScript strict mode, no `any` ✅
- ESM imports with `.js` extensions ✅
- Zod for runtime validation ✅

**From project-context.md:**
- Use `null` for missing values in JSON, never `undefined` ✅
- Return `[]` for empty arrays, not `null` ✅
- ISO 8601 date strings ✅
- Error format: `{ error: { message, code, details? } }` ✅

### Cross-Story Context (Epic 2 Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 2.1 GraphQL Client | Depends on | Provides `LinearClientService`, SDK imports (`Issue`, `Comment`), `LinearQueryResult<T>` |
| 2.2 Rate Limit Handling | Depends on | Rate-limit types in `linear.types.ts` — do NOT modify |
| 2.3 Error Handling | Depends on | Error types in `linear-errors.ts` — do NOT modify |
| Future: 3.x Backlog Display | Depended on by | Frontend types from this story will be consumed by backlog list/detail components |
| Future: 6.x Data Sync | Depended on by | Backend DTOs + transformers will be used by sync service to store/retrieve items |

### Project Structure After This Story

```
backend/src/
├── types/
│   ├── linear.types.ts                    (unchanged — rate-limit types)
│   ├── linear-entities.types.ts           ← NEW: entity DTOs
│   ├── linear-entities.schemas.ts         ← NEW: Zod schemas for DTOs
│   └── api.types.ts                       ← NEW: pagination, API response types
├── services/
│   └── sync/
│       ├── linear-client.service.ts       (unchanged)
│       ├── linear-transformers.ts         ← NEW: SDK-to-DTO converters
│       └── linear-transformers.test.ts    ← NEW: transformer tests
└── ...

frontend/src/
├── features/
│   └── backlog/
│       └── types/
│           └── backlog.types.ts           ← NEW: frontend types
└── types/
    └── index.ts                           (unchanged — AppConfig placeholder)
```

### What NOT To Do

- **Do NOT install `graphql-codegen`, `@graphql-codegen/*`, or similar** — `@linear/sdk` IS the codegen
- **Do NOT modify `linear.types.ts`** — it contains rate-limit types from Stories 2.1–2.3
- **Do NOT modify `linear-client.service.ts`** — the public API already returns `Issue[]` etc.; the transformer layer sits between the client and the API controllers (which don't exist yet)
- **Do NOT use `Date` objects in DTOs** — always use ISO 8601 strings for JSON serialisation
- **Do NOT use `undefined` in DTO field values** — use `null` for absent values
- **Do NOT import from `'zod'`** — must use `'zod/v4'`
- **Do NOT add `any` types** — use `unknown` and narrow with type guards
- **Do NOT use CommonJS** (`require`/`module.exports`) — backend is ESM
- **Do NOT create a shared/monorepo types package** — keep backend and frontend types separate with manual alignment (no build-time dependency between them in MVP)
- **Do NOT access SDK lazy-loading getters without `await`** — they return Promises

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — camelCase JSON, PascalCase types, snake_case DB
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns] — API response formats, ISO 8601 dates, null handling
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — File locations, backend structure
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 2.4] — Story requirements and acceptance criteria
- [Source: _bmad-output/project-context.md#Critical Implementation Rules] — TypeScript, error handling, JSON patterns
- [Source: _bmad-output/implementation-artifacts/2-1-implement-linear-graphql-client.md] — SDK usage, client service design
- [Source: _bmad-output/implementation-artifacts/2-3-implement-error-handling-and-retry-logic.md] — Error types, test patterns
- [Source: @linear/sdk npm v73.0.0] — SDK types, lazy-loading entity model
- [Source: Linear API docs — https://developers.linear.app/docs/sdk/getting-started] — SDK documentation

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (high-thinking)

### Debug Log References

None — no debug issues encountered.

### Completion Notes List

- **Task 1 (DTO interfaces):** Created `backend/src/types/linear-entities.types.ts` with 7 DTO interfaces (`BacklogItemDto`, `LabelDto`, `CommentDto`, `ProjectDto`, `TeamDto`, `UserDto`, `WorkflowStateDto`). All fields use camelCase, JSON-safe primitives, ISO 8601 date strings, and `null` for absent values.
- **Task 2 (Zod schemas):** Created `backend/src/types/linear-entities.schemas.ts` with runtime validation schemas for all 7 DTOs. Uses `zod/v4` import, `z.iso.datetime()` for date fields, `z.url()` for URL fields, and exports inferred `*Validated` type aliases.
- **Task 3 (Transformers):** Created `backend/src/services/sync/linear-transformers.ts` with 7 functions: `toBacklogItemDto`, `toCommentDto`, `toProjectDto`, `toTeamDto`, `toUserDto`, `toBacklogItemDtos`, `toCommentDtos`. All async transformers properly `await` SDK lazy-loading getters. Priority mapping uses `PRIORITY_LABELS` constant. SDK relations resolved in parallel via `Promise.all`.
- **Task 4 (API types):** Created `backend/src/types/api.types.ts` with `PaginationInfo`, `PaginatedResponse<T>`, `ApiErrorResponse`, and `SyncStatusResponse` interfaces.
- **Task 5 (Frontend types):** Created `frontend/src/features/backlog/types/backlog.types.ts` with lean frontend mirrors: `BacklogItem`, `Label`, `BacklogItemComment`, `PaginationInfo`, `BacklogListResponse`, `SyncStatus`. Omits internal IDs (`assigneeId`, `projectId`, `teamId`).
- **Task 6 (Tests):** Created `backend/src/services/sync/linear-transformers.test.ts` covering DTO shapes, priority mapping, null handling (assignee, project, user), ISO 8601 date serialisation, labels array resolution, workflow state conversion, batch transforms, and Zod validation (valid and invalid data).
- **Task 7 (Integration):** Re-ran `npm run lint`, `npm run test:run`, and `npm run build` in `backend/`, plus `npm run build` in `frontend/` — all green.
- **Review Fixes (Story 2.4):** Added `WorkflowStateDto` type + schema + transformer, strengthened Zod validation (priority/status enums, ISO date), aligned `UserDto.email` to `null` when absent, and added backlog detail response types in backend and frontend.

### Change Log

- 2026-02-06: Implemented Linear data models and TypeScript types (Story 2.4)
  - Added 6 backend DTO interfaces for Linear entities
  - Added Zod runtime validation schemas for all DTOs
  - Added SDK-to-DTO transformer module with 7 converter functions
  - Added pagination and API response type definitions
  - Added lean frontend type mirrors for API consumption
  - Added unit tests for transformers and Zod schema validation
  - Re-ran lint/test/build in backend and build in frontend
- 2026-02-06: Addressed code review findings for Story 2.4
  - Added WorkflowState DTO + schema + transformer and tests
  - Tightened schema validation for priority/status and dueDate
  - Added backlog detail response types in backend and frontend
  - Standardized nullable email handling in User DTO

### File List

- `backend/src/types/linear-entities.types.ts` — NEW: Backend DTO interfaces (BacklogItemDto, LabelDto, CommentDto, ProjectDto, TeamDto, UserDto)
- `backend/src/types/linear-entities.schemas.ts` — NEW: Zod validation schemas for all DTOs
- `backend/src/types/api.types.ts` — NEW: Pagination, API response, and sync status types
- `backend/src/services/sync/linear-transformers.ts` — NEW: SDK-to-DTO converter functions
- `backend/src/services/sync/linear-transformers.test.ts` — NEW: 27 unit tests for transformers and Zod schemas
- `frontend/src/features/backlog/types/backlog.types.ts` — NEW: Frontend type mirrors for API consumption
- `backend/src/services/sync/rate-limiter.ts` — Existing: Rate limiter implementation (pre-existing changes in git)
- `backend/src/services/sync/rate-limiter.test.ts` — Existing: Rate limiter tests (pre-existing changes in git)
- `backend/src/services/sync/retry-handler.ts` — Existing: Retry handler implementation (pre-existing changes in git)
- `backend/src/services/sync/retry-handler.test.ts` — Existing: Retry handler tests (pre-existing changes in git)
- `backend/src/services/sync/linear-client.service.ts` — Existing: Linear client service (pre-existing changes in git)
- `backend/src/services/sync/linear-client.service.test.ts` — Existing: Linear client tests (pre-existing changes in git)
- `backend/src/middleware/error.middleware.ts` — Existing: Error middleware updates (pre-existing changes in git)
- `backend/src/types/linear.types.ts` — Existing: Rate-limit types (pre-existing changes in git)
- `backend/src/utils/linear-errors.ts` — Existing: Linear error types (pre-existing changes in git)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: Story status review → done
- `_bmad-output/implementation-artifacts/2-4-implement-linear-data-models-and-typescript-types.md` — MODIFIED: Tasks marked complete, Dev Agent Record updated
