# Story 3.1: Implement Backlog List View Component

Linear Issue ID: VIX-340
Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to view Linear backlog items in a list format,
so that I can see all IT backlog items in one place.

## Acceptance Criteria

1. **Given** the backlog page is loaded, **When** I navigate to the root URL (`/`), **Then** backlog items are displayed in a scannable list format with clear visual hierarchy
2. **And** each item shows: priority badge (StackRankBadge), title (prominent), status badge, team name, and labels
3. **And** items are sorted by priority ascending (1 = Urgent first, 4 = Low last), then by `sortOrder` within each priority level, with priority 0 (None) items sorted last
4. **And** the list shows a results count (e.g. "Showing 42 items")
5. **And** initial page load completes within 2 seconds (loading skeleton shown while fetching)
6. **And** a loading skeleton matching the list layout is displayed during data fetching
7. **And** error states display a user-friendly message with a retry button (e.g. "Failed to load backlog items. Please try again.")
8. **And** empty states display helpful guidance when no items exist (e.g. "No backlog items found. Data may not have been synced yet.")
9. **And** a backend REST endpoint `GET /api/backlog-items` serves backlog data from Linear, transformed to `BacklogItemDto[]`, sorted and returned as a `PaginatedResponse<BacklogItemDto>`
10. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
11. **And** unit tests cover the StackRankBadge component, BacklogItemCard component, backlog list rendering, and backend service/controller

## Tasks / Subtasks

- [x] Task 1: Create backend backlog service (AC: #9)
  - [x] 1.1: Create `backend/src/services/backlog/backlog.service.ts`
  - [x] 1.2: Implement `getBacklogItems(options?)` that calls `LinearClientService.getIssuesByProject()`, transforms with `toBacklogItemDtos()`, sorts by priority then sortOrder, returns `PaginatedResponse<BacklogItemDto>`
  - [x] 1.3: Create `backend/src/services/backlog/backlog.service.test.ts`
- [x] Task 2: Create backend backlog controller + routes (AC: #9)
  - [x] 2.1: Create `backend/src/controllers/backlog.controller.ts` with `getBacklogItems` handler
  - [x] 2.2: Create `backend/src/routes/backlog.routes.ts` with `GET /backlog-items`
  - [x] 2.3: Register backlog routes in `backend/src/routes/index.ts`
  - [x] 2.4: Create `backend/src/routes/backlog.routes.test.ts`
- [x] Task 3: Create StackRankBadge shared component (AC: #2)
  - [x] 3.1: Create `frontend/src/shared/components/ui/stack-rank-badge.tsx`
  - [x] 3.2: Create `frontend/src/shared/components/ui/stack-rank-badge.test.tsx`
- [x] Task 4: Create BacklogItemCard feature component (AC: #2)
  - [x] 4.1: Create `frontend/src/features/backlog/components/backlog-item-card.tsx`
  - [x] 4.2: Create `frontend/src/features/backlog/components/backlog-item-card.test.tsx`
- [x] Task 5: Create useBacklogItems hook (AC: #1, #3, #5)
  - [x] 5.1: Create `frontend/src/features/backlog/hooks/use-backlog-items.ts`
  - [x] 5.2: Create `frontend/src/features/backlog/hooks/use-backlog-items.test.tsx`
- [x] Task 6: Create BacklogList component (AC: #1, #3, #4, #6, #7, #8)
  - [x] 6.1: Create `frontend/src/features/backlog/components/backlog-list.tsx`
  - [x] 6.2: Create `frontend/src/features/backlog/components/backlog-list.test.tsx`
- [x] Task 7: Update BacklogPage to compose BacklogList (AC: #1)
  - [x] 7.1: Update `frontend/src/features/backlog/components/backlog-page.tsx`
- [x] Task 8: Integration verification (AC: #10, #11)
  - [x] 8.1: `npm run build` passes in `backend/`
  - [x] 8.2: `npm run build` passes in `frontend/`
  - [x] 8.3: `npm run lint` passes in both
  - [x] 8.4: `npm run test:run` passes all existing and new tests

## Dev Notes

### What's Already Done (from Stories 1.1–2.4)

| Capability | Story | File |
|---|---|---|
| Frontend scaffold (Vite + React + TypeScript) | 1.1 | `frontend/` |
| Chakra UI v3 with Vixxo brand theme (createSystem) | 1.1 | `frontend/src/theme.ts` |
| TanStack Query v5 configured (5 min staleTime) | 1.1 | `frontend/src/main.tsx` |
| React Router v7 with `/` and `/admin` routes | 1.1 | `frontend/src/App.tsx` |
| Placeholder `BacklogPage` component | 1.1 | `frontend/src/features/backlog/components/backlog-page.tsx` |
| Frontend backlog types (`BacklogItem`, `BacklogListResponse`, `SyncStatus`, etc.) | 2.4 | `frontend/src/features/backlog/types/backlog.types.ts` |
| `API_URL` constant (`http://localhost:3000/api`) | 1.1 | `frontend/src/utils/constants.ts` |
| Backend Express + TypeScript project | 1.2 | `backend/` |
| `LinearClientService` (getIssuesByProject, getIssueById, etc.) | 2.1 | `backend/src/services/sync/linear-client.service.ts` |
| `RateLimiter` + `RetryHandler` services | 2.2–2.3 | `backend/src/services/sync/rate-limiter.ts`, `retry-handler.ts` |
| SDK-to-DTO transformers (`toBacklogItemDtos`, etc.) | 2.4 | `backend/src/services/sync/linear-transformers.ts` |
| Backend DTO types (`BacklogItemDto`, `PaginatedResponse<T>`, etc.) | 2.4 | `backend/src/types/linear-entities.types.ts`, `api.types.ts` |
| Zod schemas for all DTOs | 2.4 | `backend/src/types/linear-entities.schemas.ts` |
| Error middleware with `RATE_LIMITED` handling | 2.2 | `backend/src/middleware/error.middleware.ts` |
| Health route (`GET /api/health`) | 1.2 | `backend/src/routes/health.routes.ts` |
| Pino structured logging | 1.2 | `backend/src/utils/logger.ts` |
| Error types (`LinearApiError`, `LinearNetworkError`) | 2.1 | `backend/src/utils/linear-errors.ts` |
| Vitest configured (both frontend and backend) | 1.1–1.2 | `package.json` files |
| 72+ passing tests across backend services | 2.1–2.4 | test files |

### What This Story Adds

1. **Backend backlog service** — Fetches issues from Linear via `LinearClientService`, transforms to DTOs, sorts, and returns paginated response
2. **Backend backlog controller + routes** — `GET /api/backlog-items` REST endpoint
3. **StackRankBadge** — Shared UI component displaying priority number in a Vixxo Green badge
4. **BacklogItemCard** — Feature component displaying a single backlog item in scannable format
5. **useBacklogItems hook** — TanStack Query hook for fetching and caching backlog data
6. **BacklogList** — Main list component composing BacklogItemCard with sorting, loading, error, and empty states
7. **Updated BacklogPage** — Replaces placeholder with real BacklogList

### CRITICAL: Chakra UI v3 API — NOT v2

The project uses **Chakra UI v3** (`@chakra-ui/react` ^3.32.0). v3 has breaking changes from v2:

- **Theme system:** Uses `createSystem` + `defineConfig` (NOT `extendTheme`)
- **Provider:** Uses `Provider` from `@/components/ui/provider` (NOT `ChakraProvider`)
- **No framer-motion:** Removed as a dependency
- **No `@emotion/styled`:** Removed — use only `@emotion/react`
- **Namespaced imports:** Some components use dot notation (e.g. `Table.Root`, `Table.Body`)
- **`asChild` prop:** Replaces `as` prop for polymorphic composition

Existing theme tokens (from `frontend/src/theme.ts`):

```typescript
colors: {
  brand: {
    green: { value: '#8E992E' },   // Primary actions, StackRankBadge
    gray: { value: '#3E4543' },    // Primary text
    teal: { value: '#2C7B80' },    // Info, status indicators
    yellow: { value: '#EDA200' },  // Warnings, attention
    blue: { value: '#395389' },    // Secondary elements
    copper: { value: '#956125' },  // Accents
  },
  error: { red: { value: '#E53E3E' } },
}
```

**Use these tokens** via `color="brand.green"` etc. Do NOT hardcode hex values.

### CRITICAL: Existing Frontend Types — Use Them, Don't Reinvent

Frontend types already exist at `frontend/src/features/backlog/types/backlog.types.ts`:

- `BacklogItem` — main item interface (id, identifier, title, priority, priorityLabel, status, statusType, assigneeName, projectName, teamName, labels, sortOrder, etc.)
- `Label` — label with id, name, color
- `BacklogListResponse` — `{ items: BacklogItem[], pageInfo: PaginationInfo, totalCount: number }`
- `PaginationInfo` — `{ hasNextPage: boolean, endCursor: string | null }`
- `SyncStatus` — sync status type

Import and use these types. Do NOT create duplicate type definitions.

### CRITICAL: Backend Types — Use Existing DTOs

Backend types already exist:

- `BacklogItemDto` in `backend/src/types/linear-entities.types.ts`
- `PaginatedResponse<T>`, `ApiErrorResponse` in `backend/src/types/api.types.ts`
- `toBacklogItemDtos()` in `backend/src/services/sync/linear-transformers.ts`

The backlog service should compose these existing pieces — do NOT create new DTO types.

### CRITICAL: `LinearClientService.getIssuesByProject()` Method Signature

From `backend/src/services/sync/linear-client.service.ts`, the existing method:

```typescript
getIssuesByProject(projectId: string, options?: {
  first?: number
  after?: string
}): Promise<LinearQueryResult<Issue[]>>
```

- Returns `LinearQueryResult<Issue[]>` (wraps result with rate limit info)
- `options.first` = page size (Linear default: 50)
- `options.after` = cursor for pagination
- The `Issue` type is from `@linear/sdk` — these are lazy-loading class instances, NOT plain objects

The backlog service must:
1. Call `linearClient.getIssuesByProject(projectId, options)`
2. Extract `.data` from the `LinearQueryResult`
3. Transform with `toBacklogItemDtos(issues)` (resolves all lazy relations)
4. Sort the resulting DTOs
5. Return as `PaginatedResponse<BacklogItemDto>`

### CRITICAL: Project ID Configuration

The backlog endpoint needs a Linear project ID to fetch issues. Use an environment variable:

```
LINEAR_PROJECT_ID=<uuid>
```

Add this to `backend/.env.example`. The backlog service should read it from `process.env.LINEAR_PROJECT_ID`. If not set, return a clear error.

Alternatively, accept `projectId` as a query parameter on the endpoint: `GET /api/backlog-items?projectId=xxx`. Environment variable serves as the default.

### CRITICAL: Sorting Logic

Items must be sorted for the business user's priority scanning experience:

```typescript
// Sort: priority ascending (1=Urgent first), then sortOrder ascending within priority
// Priority 0 (None) goes LAST
function sortBacklogItems(items: BacklogItemDto[]): BacklogItemDto[] {
  return [...items].sort((a, b) => {
    const aPriority = a.priority === 0 ? 5 : a.priority  // Push "None" after "Low"
    const bPriority = b.priority === 0 ? 5 : b.priority
    if (aPriority !== bPriority) return aPriority - bPriority
    return a.sortOrder - b.sortOrder
  })
}
```

This sorting happens on the backend. The frontend receives pre-sorted items.

### CRITICAL: ESM Import Pattern

All local imports in backend MUST use `.js` extensions:

```typescript
// ✅ Correct
import { linearClient } from '../services/sync/linear-client.service.js'
import type { BacklogItemDto } from '../types/linear-entities.types.js'

// ❌ Wrong — will fail at runtime
import { linearClient } from '../services/sync/linear-client.service'
```

Frontend does NOT use `.js` extensions (Vite handles resolution).

### CRITICAL: Express Route Registration Pattern

Follow the existing pattern in `backend/src/routes/index.ts`:

```typescript
import { Router } from 'express'
import { healthRoutes } from './health.routes.js'
import { backlogRoutes } from './backlog.routes.js'  // ← ADD

const router = Router()
router.use(healthRoutes)
router.use(backlogRoutes)  // ← ADD

export { router }
```

The route file should define the path prefix:

```typescript
// backend/src/routes/backlog.routes.ts
import { Router } from 'express'
import { backlogController } from '../controllers/backlog.controller.js'

const backlogRoutes = Router()
backlogRoutes.get('/backlog-items', backlogController.getBacklogItems)

export { backlogRoutes }
```

The `/api` prefix is applied in `app.ts` when mounting routes.

### CRITICAL: Error Response Format

All API errors must follow the project's standard format (from `error.middleware.ts`):

```json
{
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

The backlog controller should catch errors from the service and let the error middleware handle them, or return specific error responses for business-level errors.

### CRITICAL: Frontend API Client Pattern

No shared `api-client.ts` exists yet. For this story, create a simple fetch wrapper or use fetch directly in the hook:

```typescript
// frontend/src/features/backlog/hooks/use-backlog-items.ts
import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { BacklogListResponse } from '../types/backlog.types'

async function fetchBacklogItems(): Promise<BacklogListResponse> {
  const res = await fetch(`${API_URL}/backlog-items`)
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new Error(errorBody?.error?.message ?? 'Failed to load backlog items')
  }
  return res.json()
}

export function useBacklogItems() {
  return useQuery({
    queryKey: ['backlog-items'],
    queryFn: fetchBacklogItems,
  })
}
```

TanStack Query handles caching (5 min staleTime), loading state, error state, and refetching.

### CRITICAL: StackRankBadge Component Specification

From UX design spec:

- **Size:** 32px × 32px minimum for immediate visibility
- **Style:** Circular badge
- **Colors:** Vixxo Green (`brand.green` / #8E992E) background, white text
- **Content:** Priority numbers 1–4 (not 0)
- **Priority 0 (None):** Show a gray badge or dash instead of "0"
- **Accessibility:** ARIA label "Priority {number}", color not sole indicator
- **Font:** Arial Bold, large enough to scan immediately

```typescript
// Example implementation using Chakra UI v3
interface StackRankBadgeProps {
  priority: number        // 0-4
  priorityLabel: string   // "Urgent" | "High" | "Normal" | "Low" | "None"
}
```

### CRITICAL: BacklogItemCard Layout

From UX design spec — "Clean & Scannable" design direction:

```
┌─────────────────────────────────────────────────────┐
│  [1]  Title of the backlog item                     │
│       Status: In Progress  │  Team: Vixxo  │  VIX-42│
│       Labels: [Backend] [API]                       │
└─────────────────────────────────────────────────────┘
```

- **Left:** StackRankBadge (priority number)
- **Center:** Title (bold, prominent), then metadata row below
- **Metadata row:** Status badge, team name, identifier
- **Labels row:** Colored label badges
- **Spacing:** 16px between items (Chakra spacing `"4"`)
- **Hover:** Subtle background change (prepare for future click-to-detail)
- **Accessibility:** ARIA label with title and priority, keyboard navigable

### CRITICAL: Loading Skeleton Pattern

Use Chakra UI v3 Skeleton components to match the BacklogItemCard layout:

```typescript
// Show 5 skeleton cards during loading
function BacklogListSkeleton() {
  return (
    <VStack gap="4" align="stretch">
      {Array.from({ length: 5 }).map((_, i) => (
        <HStack key={i} p="4" borderWidth="1px" borderRadius="md" gap="4">
          <Skeleton boxSize="8" borderRadius="full" />
          <VStack align="start" flex="1" gap="2">
            <Skeleton height="5" width="60%" />
            <Skeleton height="4" width="40%" />
          </VStack>
        </HStack>
      ))}
    </VStack>
  )
}
```

### CRITICAL: Empty State Pattern

From UX design spec — EmptyStateWithGuidance pattern:

```
┌─────────────────────────────────────────────────────┐
│               🔍                                     │
│         No backlog items found                       │
│                                                      │
│   Data may not have been synced yet.                │
│   Contact your admin to trigger a sync.             │
│                                                      │
│         [ Retry ]                                    │
└─────────────────────────────────────────────────────┘
```

### CRITICAL: Error State Pattern

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Failed to load backlog items                    │
│                                                      │
│  There was a problem connecting to the server.       │
│  Please try again or contact your admin.             │
│                                                      │
│         [ Try Again ]                                │
└─────────────────────────────────────────────────────┘
```

Use Chakra UI v3 `Alert` component with `status="error"`.

### CRITICAL: Vitest + React Testing Library Patterns

Frontend tests use Vitest + React Testing Library. Key patterns:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
```

For components that use TanStack Query, wrap in a test provider:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}
```

For Chakra UI v3, also wrap in the Provider:

```typescript
import { Provider } from '@/components/ui/provider'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <Provider>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </Provider>
  )
}
```

### Test Patterns from Previous Stories (Backend)

Backend tests use Vitest with mocks:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
```

Mock the `LinearClientService`:

```typescript
vi.mock('../../services/sync/linear-client.service.js', () => ({
  linearClient: {
    getIssuesByProject: vi.fn(),
  },
}))
```

### Architecture Compliance

**From architecture.md:**
- REST endpoints: Plural nouns (`/api/backlog-items`) ✅
- Route → Controller → Service pattern ✅
- Feature-based frontend (`features/backlog/components/`) ✅
- Shared UI components (`shared/components/ui/`) ✅
- Co-located tests (`*.test.ts` alongside source) ✅
- PascalCase components, kebab-case files ✅
- camelCase JSON API responses ✅
- TypeScript strict mode, no `any` ✅
- ESM imports with `.js` in backend ✅
- TanStack Query for server state ✅
- Immutable state updates ✅
- Specific, actionable error messages ✅

**From project-context.md:**
- Error format: `{ error: { message, code, details? } }` ✅
- ISO 8601 dates, `null` for absent values ✅
- No Redux/Zustand — use Context + TanStack Query ✅
- Never use generic "Something went wrong" ✅
- Use Pino structured logging in backend ✅

**From UX design spec:**
- "Clean & Scannable" design direction ✅
- StackRankBadge with Vixxo Green (#8E992E) ✅
- 16px spacing between list items ✅
- Arial typography ✅
- Loading skeletons matching final layout ✅
- Empty states with guidance ✅
- Error states with retry ✅
- Results count visible ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 2.1 GraphQL Client | Depends on | `LinearClientService.getIssuesByProject()` for data fetching |
| 2.2 Rate Limit Handling | Depends on | Rate limiting applied automatically by LinearClientService |
| 2.3 Error/Retry Logic | Depends on | Retry logic applied automatically by LinearClientService |
| 2.4 Data Models & Types | Depends on | `BacklogItemDto`, `PaginatedResponse<T>`, `toBacklogItemDtos()`, frontend `BacklogItem` types |
| 1.1 Frontend Project | Depends on | Chakra UI theme, React Router, TanStack Query config |
| 1.2 Backend Project | Depends on | Express app, routes, error middleware, Pino logger |
| 3.2 Priority Visualization | Depended on by | StackRankBadge created here, enhanced in 3.2 with visual hierarchy |
| 3.3 New Item Flagging | Depended on by | BacklogItemCard created here, flagging added in 3.3 |
| 3.4 Item Detail View | Depended on by | BacklogItemCard click handler wired in 3.4 |
| 4.1 Business Unit Filter | Depended on by | BacklogList created here, filtering added in 4.1 |
| 4.2 Keyword Search | Depended on by | BacklogList created here, search added in 4.2 |
| 4.3 Sorting | Depended on by | Default sort implemented here, user-controlled sort in 4.3 |
| 6.x Data Synchronization | Related | Currently fetches directly from Linear API; sync service will pre-cache data later |
| 8.1 Chakra UI Integration | Related | Theme tokens already configured; this story uses them |

### Project Structure After This Story

```
backend/src/
├── routes/
│   ├── index.ts                          (MODIFIED — add backlog routes)
│   ├── health.routes.ts                  (unchanged)
│   └── backlog.routes.ts                 ← NEW: GET /backlog-items
├── controllers/
│   └── backlog.controller.ts             ← NEW: request handling
├── services/
│   ├── backlog/
│   │   ├── backlog.service.ts            ← NEW: business logic
│   │   └── backlog.service.test.ts       ← NEW: service tests
│   └── sync/
│       ├── linear-client.service.ts      (unchanged)
│       ├── linear-transformers.ts        (unchanged)
│       └── ...
└── ...

frontend/src/
├── shared/
│   └── components/
│       └── ui/
│           ├── stack-rank-badge.tsx       ← NEW: priority badge component
│           └── stack-rank-badge.test.tsx  ← NEW: badge tests
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── backlog-page.tsx           (MODIFIED — compose BacklogList)
│       │   ├── backlog-list.tsx           ← NEW: main list component
│       │   ├── backlog-list.test.tsx      ← NEW: list tests
│       │   ├── backlog-item-card.tsx      ← NEW: item card component
│       │   └── backlog-item-card.test.tsx ← NEW: card tests
│       ├── hooks/
│       │   ├── use-backlog-items.ts       ← NEW: TanStack Query hook
│       │   └── use-backlog-items.test.ts  ← NEW: hook tests
│       └── types/
│           └── backlog.types.ts           (unchanged — types already defined)
└── ...
```

### What NOT To Do

- **Do NOT create new type definitions** — use existing `BacklogItem` (frontend) and `BacklogItemDto` (backend) from Story 2.4
- **Do NOT hardcode hex color values** — use Chakra UI theme tokens (`brand.green`, `brand.gray`, etc.)
- **Do NOT use Chakra UI v2 API** — no `extendTheme`, no `ChakraProvider`, no `useColorMode`, no `framer-motion`
- **Do NOT use Redux or Zustand** — use TanStack Query for server state (already configured)
- **Do NOT store fetched data in React state** — TanStack Query manages caching and state
- **Do NOT import from `'zod'`** in backend — must use `'zod/v4'`
- **Do NOT import without `.js` extension** in backend local imports
- **Do NOT mutate arrays** — use spread `[...items].sort()` not `items.sort()` (immutable updates)
- **Do NOT use generic error messages** — be specific ("Failed to load backlog items" not "Something went wrong")
- **Do NOT skip loading/error/empty states** — all three are required for production quality
- **Do NOT modify `linear-client.service.ts`** — compose it through the new backlog service
- **Do NOT modify `linear-transformers.ts`** — use the existing `toBacklogItemDtos()` function
- **Do NOT modify existing types** in `linear-entities.types.ts` or `api.types.ts` — they are stable from Story 2.4
- **Do NOT create a shared api-client utility** in this story — use simple `fetch` in the hook; api-client can be extracted in a future refactor
- **Do NOT implement virtual scrolling/infinite scroll** — that's Story 9.2; use simple list rendering for now (dataset is small enough for MVP)
- **Do NOT implement user-controlled sorting UI** — that's Story 4.3; this story only implements the default priority sort
- **Do NOT implement filtering UI** — that's Stories 4.1–4.2; this story shows all items
- **Do NOT implement click-to-detail** — that's Story 3.4; BacklogItemCard should be visually interactive (hover state) but no click handler yet

### Performance Considerations

- **Backend:** `toBacklogItemDtos()` resolves lazy SDK relations via `Promise.all` — efficient parallel resolution
- **Frontend:** TanStack Query caches results for 5 minutes (staleTime) — no re-fetch on re-render
- **Sorting:** Done on backend before sending to frontend — no client-side sort needed on initial load
- **Bundle size:** Chakra UI v3 is tree-shakeable — only used components are included

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — State management (TanStack Query), component architecture, routing
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST API design, error handling
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — Naming conventions, structure patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — File locations, route patterns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision] — "Clean & Scannable" direction
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Custom Components] — StackRankBadge, BacklogItemCard specs
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns] — Loading states, empty states, error states
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation] — Color system, typography, spacing
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 3.1] — Story requirements and acceptance criteria
- [Source: _bmad-output/project-context.md#Critical Implementation Rules] — TypeScript, error handling, JSON patterns
- [Source: _bmad-output/implementation-artifacts/2-4-implement-linear-data-models-and-typescript-types.md] — DTOs, transformers, type patterns
- [Source: frontend/src/theme.ts] — Chakra UI v3 theme configuration with brand tokens
- [Source: frontend/src/main.tsx] — TanStack Query setup, Provider wrapping
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — Frontend type definitions
- [Source: @chakra-ui/react v3.32.0 docs] — Chakra UI v3 component API
- [Source: @tanstack/react-query v5 docs] — useQuery hook patterns

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- Skeleton test initially used `[data-scope="skeleton"]` selector which doesn't exist in Chakra UI v3; fixed by adding `data-testid="backlog-list-loading"` to the loading container.
- Hook test file initially created as `.ts` but contained JSX for QueryClientProvider wrapper; renamed to `.tsx`.

### Completion Notes List

- **Task 1:** Created `BacklogService` with `getBacklogItems()` method. Composes `LinearClientService.getIssuesByProject()` → `toBacklogItemDtos()` → sort (priority ascending, 0=None last, then sortOrder). Returns `PaginatedResponse<BacklogItemDto>`. 12 unit tests.
- **Task 2:** Created `GET /api/backlog-items` endpoint via `backlog.controller.ts` + `backlog.routes.ts`. Supports `projectId`, `first`, `after` query params. Validates `first` (1-250). Errors delegated to error middleware. Routes registered in `index.ts`. 8 unit tests.
- **Task 3:** Created `StackRankBadge` — 32×32px circular badge with Vixxo Green background for priorities 1-4, gray for 0 (None, displays dash). ARIA label for accessibility. 6 unit tests.
- **Task 4:** Created `BacklogItemCard` — displays priority badge, title, status, team, identifier, and labels in a scannable card layout with hover state. 8 unit tests.
- **Task 5:** Created `useBacklogItems` hook using TanStack Query `useQuery`. Fetches from `${API_URL}/backlog-items` with error message extraction from API error format. 4 unit tests.
- **Task 6:** Created `BacklogList` — main list component composing BacklogItemCard with loading skeleton (5 cards), error state (with Try Again button), empty state (with Retry button and guidance), and results count. 6 unit tests.
- **Task 7:** Updated `BacklogPage` to compose `BacklogList` instead of placeholder text. Added max-width container for readability.
- **Task 8:** All integration checks pass: `npm run build` (0 errors both), `npm run lint` (clean both), `npm run test:run` (122 backend + 25 frontend = 147 total, 0 failures).
- Added `LINEAR_PROJECT_ID` to `backend/.env.example`.

### Change Log

- 2026-02-09: Story 3.1 implementation complete — Backend backlog service + REST endpoint, StackRankBadge, BacklogItemCard, useBacklogItems hook, BacklogList with loading/error/empty states, BacklogPage composition. 44 new tests, 147 total passing.

### File List

**New Files:**
- `backend/src/services/backlog/backlog.service.ts` — Backlog service with sorting logic
- `backend/src/services/backlog/backlog.service.test.ts` — Service tests (12 tests)
- `backend/src/controllers/backlog.controller.ts` — GET /api/backlog-items handler
- `backend/src/routes/backlog.routes.ts` — Backlog route definition
- `backend/src/routes/backlog.routes.test.ts` — Route/controller tests (8 tests)
- `frontend/src/shared/components/ui/stack-rank-badge.tsx` — StackRankBadge component
- `frontend/src/shared/components/ui/stack-rank-badge.test.tsx` — Badge tests (6 tests)
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — BacklogItemCard component
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — Card tests (8 tests)
- `frontend/src/features/backlog/hooks/use-backlog-items.ts` — TanStack Query hook
- `frontend/src/features/backlog/hooks/use-backlog-items.test.tsx` — Hook tests (4 tests)
- `frontend/src/features/backlog/components/backlog-list.tsx` — BacklogList component
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — List tests (6 tests)

**Modified Files:**
- `backend/src/routes/index.ts` — Registered backlog routes
- `backend/.env.example` — Added LINEAR_PROJECT_ID
- `frontend/src/features/backlog/components/backlog-page.tsx` — Replaced placeholder with BacklogList
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story status updated
- `_bmad-output/implementation-artifacts/3-1-implement-backlog-list-view-component.md` — This story file
