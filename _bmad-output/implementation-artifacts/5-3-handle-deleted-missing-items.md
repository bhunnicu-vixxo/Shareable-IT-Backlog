# Story 5.3: Handle Deleted/Missing Items

Linear Issue ID: VIX-352
Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want clear feedback when an item no longer exists,
so that I understand why I can't access it and can navigate back to the backlog list.

## Acceptance Criteria

1. **Given** a user tries to access an item that was deleted from Linear, **When** the item detail modal opens, **Then** a user-friendly error message is displayed explaining the item no longer exists (not raw technical error text)
2. **And** the error state is visually distinct from loading and success states — uses an alert/notice component with an appropriate icon (e.g. warning icon)
3. **And** a "Close" or "Back to Backlog" button is prominently displayed so the user can dismiss the modal and return to the list
4. **And** when an item returns 404, the error message specifically says the item was removed or no longer available (not a generic "Something went wrong")
5. **And** when an item returns a non-404 error (network failure, 500, etc.), the error message is different — explains a temporary problem and offers a "Try Again" retry button
6. **And** the backlog list gracefully handles a stale item that no longer exists: clicking it shows the 404 error state, and the user can dismiss and continue browsing
7. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
8. **And** unit tests cover the error state UI, retry behavior, and error type differentiation

## Tasks / Subtasks

- [ ] Task 1: Add error type differentiation to `useBacklogItemDetail` hook (AC: #4, #5)
  - [ ] 1.1: Update `fetchBacklogItemDetail` in `frontend/src/features/backlog/hooks/use-backlog-item-detail.ts` to attach HTTP status code to the thrown Error (e.g., custom `ApiError` class with `status` field)
  - [ ] 1.2: Create `ApiError` class in `frontend/src/utils/api-error.ts` with `message`, `status`, and `code` fields
  - [ ] 1.3: Update the hook's error handling to parse the response status and throw `ApiError` instead of plain `Error`
  - [ ] 1.4: Add unit tests for `useBacklogItemDetail` covering 404 vs 500 vs network error scenarios
- [ ] Task 2: Create `ItemNotFoundState` component (AC: #1, #2, #3, #4)
  - [ ] 2.1: Create `frontend/src/features/backlog/components/item-not-found-state.tsx`
  - [ ] 2.2: Display a user-friendly message: "This item is no longer available. It may have been removed from the backlog."
  - [ ] 2.3: Include a warning/info icon (Chakra UI `WarningIcon` or similar)
  - [ ] 2.4: Include a prominent "Close" button that calls `onClose` to dismiss the modal
  - [ ] 2.5: Use Chakra UI `Alert`, `AlertIcon`, `AlertTitle`, `AlertDescription`, `Button` components with theme tokens only
  - [ ] 2.6: Accessible: proper ARIA roles, keyboard-navigable close button
  - [ ] 2.7: Add unit tests for ItemNotFoundState (render, close callback, accessibility)
- [ ] Task 3: Create `ItemErrorState` component for non-404 errors (AC: #5)
  - [ ] 3.1: Create `frontend/src/features/backlog/components/item-error-state.tsx`
  - [ ] 3.2: Display message: "Unable to load this item right now. Please try again."
  - [ ] 3.3: Include an error icon and the error message (if available) in subdued text
  - [ ] 3.4: Include a "Try Again" button that calls `onRetry` to trigger TanStack Query refetch
  - [ ] 3.5: Include a "Close" button as secondary action
  - [ ] 3.6: Use Chakra UI `Alert` with `status="error"`, `Button` components, theme tokens only
  - [ ] 3.7: Accessible: proper ARIA roles, keyboard navigation
  - [ ] 3.8: Add unit tests for ItemErrorState (render, retry callback, close callback)
- [ ] Task 4: Update `ItemDetailModal` to use error state components (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 4.1: Import `ItemNotFoundState` and `ItemErrorState` into `item-detail-modal.tsx`
  - [ ] 4.2: In the error branch of `ItemDetailContent`, check if `error` is an `ApiError` with `status === 404`
  - [ ] 4.3: Render `<ItemNotFoundState onClose={onClose} />` for 404 errors
  - [ ] 4.4: Render `<ItemErrorState error={error} onRetry={refetch} onClose={onClose} />` for all other errors
  - [ ] 4.5: Pass `refetch` from `useBacklogItemDetail` to `ItemDetailContent` for retry support
  - [ ] 4.6: Remove or simplify the existing inline error display code in `ItemDetailContent`
  - [ ] 4.7: Update `ItemDetailModal` tests to verify 404 error renders `ItemNotFoundState`, other errors render `ItemErrorState`
- [ ] Task 5: Build verification (AC: #7, #8)
  - [ ] 5.1: Run `npm run build` in both `backend/` and `frontend/`
  - [ ] 5.2: Run full test suite in both `backend/` and `frontend/`

## Dev Notes

### What's Already Done (from Stories 1.x–5.2)

| Capability | Story | File |
|---|---|---|
| ItemDetailModal component | 3.4 | `frontend/src/features/backlog/components/item-detail-modal.tsx` |
| useBacklogItemDetail hook (TanStack Query) | 3.4 | `frontend/src/features/backlog/hooks/use-backlog-item-detail.ts` |
| BacklogDetailResponse type (frontend) | 5.1 | `frontend/src/features/backlog/types/backlog.types.ts` |
| BacklogDetailResponse type (backend) | 5.1 | `backend/src/types/api.types.ts` |
| BacklogService.getBacklogItemById | 5.1 | `backend/src/services/backlog/backlog.service.ts` |
| BacklogController.getBacklogItemById (404 + 400 handling) | 3.4 | `backend/src/controllers/backlog.controller.ts` |
| GET /api/backlog-items/:id route | 3.4 | `backend/src/routes/backlog.routes.ts` |
| ApiErrorResponse type (backend) | 3.4 | `backend/src/types/api.types.ts` |
| CommentThread component | 5.2 | `frontend/src/features/backlog/components/comment-thread.tsx` |
| ActivityTimeline component | 5.1 | `frontend/src/features/backlog/components/activity-timeline.tsx` |
| formatDateTime helper | 3.4 | `frontend/src/utils/formatters.ts` |
| react-markdown + remark-breaks | 3.4 | `frontend/package.json` |

### What This Story Changes

1. **Frontend**: New `ApiError` class to carry HTTP status codes from API responses
2. **Frontend**: Updated `useBacklogItemDetail` hook to throw `ApiError` with status info
3. **Frontend**: New `ItemNotFoundState` component for 404 deleted/missing item errors
4. **Frontend**: New `ItemErrorState` component for non-404 transient errors with retry
5. **Frontend**: Updated `ItemDetailModal` to route errors to the appropriate error component

**Backend: NO CHANGES REQUIRED.** The backend already handles this correctly:
- Controller returns `404` with `{ error: { message: 'Backlog item not found', code: 'NOT_FOUND' } }` when `getBacklogItemById` returns `null`
- Controller returns `400` with `{ error: { message: 'Invalid item ID format', code: 'INVALID_PARAMETER' } }` for invalid UUIDs
- Service returns `null` when Linear SDK returns no issue
- Service throws on network/auth failures (propagated as 500 by error middleware)

### CRITICAL: ApiError Class for Status Code Differentiation

The existing `fetchBacklogItemDetail` function in `use-backlog-item-detail.ts` throws a plain `Error` with only the message string. To distinguish 404 from other errors, we need a custom error class:

```typescript
// frontend/src/utils/api-error.ts
export class ApiError extends Error {
  public readonly status: number
  public readonly code: string

  constructor(message: string, status: number, code: string = 'UNKNOWN_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}
```

**Updated fetch function pattern:**
```typescript
// In use-backlog-item-detail.ts
import { ApiError } from '../../../utils/api-error'

async function fetchBacklogItemDetail(itemId: string): Promise<BacklogDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/backlog-items/${itemId}`)

  if (!response.ok) {
    let message = 'Failed to load item details'
    let code = 'UNKNOWN_ERROR'
    try {
      const errorBody = await response.json()
      message = errorBody.error?.message ?? message
      code = errorBody.error?.code ?? code
    } catch {
      // Response body not parseable — use defaults
    }
    throw new ApiError(message, response.status, code)
  }

  return response.json()
}
```

**CRITICAL:** The existing hook already has error parsing logic. Extend it — don't replace it entirely. Keep the existing `response.json()` parsing for the error body, but wrap it in `ApiError` instead of plain `Error`.

### CRITICAL: Error State Component Design

**ItemNotFoundState (404 — deleted/missing items):**
```
┌──────────────────────────────────────┐
│  ⚠  This item is no longer available │
│                                       │
│  It may have been removed from the   │
│  backlog or deleted in Linear.       │
│                                       │
│         [ Close ]                     │
└──────────────────────────────────────┘
```

Design decisions:
- Chakra UI `Alert` with `status="warning"` (not error — deletion is expected, not a failure)
- Single "Close" button that calls modal `onClose`
- Centered layout for clean visual in the modal body
- No retry button (retrying a 404 is pointless unless data is stale, which is rare)
- Calm, professional tone — business users should not feel alarmed

**ItemErrorState (non-404 — network/server errors):**
```
┌──────────────────────────────────────┐
│  ✕  Unable to load this item         │
│                                       │
│  A temporary problem prevented       │
│  loading. Please try again.          │
│                                       │
│  Error: Connection timed out         │
│                                       │
│    [ Try Again ]    [ Close ]         │
└──────────────────────────────────────┘
```

Design decisions:
- Chakra UI `Alert` with `status="error"`
- "Try Again" primary button calls TanStack Query `refetch()`
- "Close" secondary button dismisses modal
- Shows error message in subdued text for debugging context
- Actionable — user can retry immediately

### CRITICAL: TanStack Query Retry + Refetch

TanStack Query already handles retries (default 3 retries). For 404 errors, retrying is wasteful. Configure the query to NOT retry on 404:

```typescript
// In use-backlog-item-detail.ts
export function useBacklogItemDetail(itemId: string | null) {
  return useQuery<BacklogDetailResponse, ApiError>({
    queryKey: ['backlog-item-detail', itemId],
    queryFn: () => fetchBacklogItemDetail(itemId!),
    enabled: !!itemId,
    retry: (failureCount, error) => {
      // Don't retry 404s — item is genuinely gone
      if (error instanceof ApiError && error.isNotFound) return false
      // Retry other errors up to 2 times
      return failureCount < 2
    },
  })
}
```

**CRITICAL:** The `refetch` function returned by `useQuery` is what the "Try Again" button should call. Pass it from the hook through to `ItemDetailContent` → `ItemErrorState`.

### CRITICAL: Handling Stale List Items (AC #6)

When a user clicks an item in the backlog list that was deleted in Linear since the last sync, the detail modal opens and gets a 404. The list itself is NOT updated by this story — sync handles that. The user experience is:

1. User clicks a stale item in the list
2. Modal opens, shows loading spinner (TanStack Query)
3. API returns 404
4. Modal shows `ItemNotFoundState` with "This item is no longer available"
5. User clicks "Close" → modal closes, user is back on the list
6. The stale item remains in the list until next sync refreshes it

This is acceptable for MVP. Do NOT try to remove the item from the list cache on 404 — that's sync's job and would add complexity.

### Architecture Compliance

**From architecture.md:**
- Feature components in `features/backlog/components/` ✅
- Use theme tokens — no hardcoded hex ✅
- Error Boundaries for React components ✅
- User-facing error messages: specific, actionable ✅
- REST: consistent error format `{ error: { message, code } }` ✅
- No generic "Something went wrong" messages ✅

**From project-context.md:**
- `camelCase` for JSON fields ✅
- TypeScript strict mode ✅
- Error Boundaries for React components ✅
- Co-located tests (`*.test.ts`, `*.test.tsx`) ✅
- Custom hooks in `features/*/hooks/` ✅
- PascalCase for components, kebab-case for files ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 3.4 Item Detail View | **HARD dependency** | Provides ItemDetailModal, useBacklogItemDetail hook, GET /api/backlog-items/:id, BacklogController with 404 handling. Must be merged. |
| 5.1 Display Activity | **Completed sibling** | Already done. Provides `Promise.allSettled` pattern, `ActivityTimeline`. No conflict — 5.3 only modifies frontend error display. |
| 5.2 Display Comments | **Sibling (in review)** | Provides `CommentThread`. No conflict — 5.3 doesn't modify comment rendering. Both modify `item-detail-modal.tsx` but different sections (error state vs comment display). |
| 2.3 Error Handling | Depends on (done) | Provides backend error middleware patterns. Backend is already correct for 5.3. |

### Previous Story Intelligence (5.1 + 5.2)

**Key learnings from Story 5.1:**
- Test mocks across multiple files need ALL fields — `activities` was added in 5.1, `parentId`/`userAvatarUrl` in 5.2. Story 5.3 doesn't add new fields to response types, so existing mocks should work as-is
- `ItemDetailContent` has an existing error branch that shows a red text message — this story replaces that with proper components
- Build errors from missing imports or unused variables are the most common blocker

**Key learnings from Story 5.2:**
- `MarkdownContent` was exported from `item-detail-modal.tsx` for reuse in `comment-thread.tsx`
- `item-detail-modal.tsx` now imports `CommentThread` — be careful not to create merge conflicts
- `ItemDetailContent` receives props: `data`, `isLoading`, `isError`, `error`, `onClose` — Story 5.3 needs to add `refetch` prop for retry support

**Files modified by 5.2 that 5.3 also touches:**
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — 5.2 replaced `CommentBlock` with `CommentThread`. 5.3 replaces the inline error display with `ItemNotFoundState`/`ItemErrorState`. **Different sections, minimal conflict risk.**
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — 5.2 added threading tests. 5.3 adds error state tests. **Different test groups, minimal conflict.**

### Git Intelligence (Recent Patterns)

From recent commits:
- `9597d9f Merge pull request #4` — Story 4.3, latest merge to main
- Current branch: `rhunnicutt/issue-5-2-display-comments-from-linear` contains 5.1 (done) + 5.2 (review) changes
- Pattern: single `feat:` commit per story with Linear issue ID
- Tests co-located with source files
- Shared utilities in `frontend/src/utils/`

### Project Structure After This Story

```
frontend/src/
├── utils/
│   └── api-error.ts                    (NEW — ApiError class)
│   └── api-error.test.ts               (NEW — ApiError tests)
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── item-not-found-state.tsx       (NEW — 404 error display)
│       │   ├── item-not-found-state.test.tsx  (NEW)
│       │   ├── item-error-state.tsx           (NEW — non-404 error display)
│       │   ├── item-error-state.test.tsx      (NEW)
│       │   ├── item-detail-modal.tsx          (MODIFIED — use error state components)
│       │   └── item-detail-modal.test.tsx     (MODIFIED — error state tests)
│       └── hooks/
│           ├── use-backlog-item-detail.ts     (MODIFIED — throw ApiError, smart retry)
│           └── use-backlog-item-detail.test.tsx (MODIFIED — 404 vs 500 tests)
```

**Backend: NO FILES MODIFIED** — backend already handles 404 correctly.

### What NOT To Do

- **Do NOT** modify any backend files — the controller already returns proper 404/400/500 responses
- **Do NOT** modify `backlog.service.ts` or `linear-client.service.ts` — item lookup and error propagation already work correctly
- **Do NOT** try to remove stale items from the list cache on 404 — that's sync's responsibility
- **Do NOT** show raw error codes or stack traces to users — transform into human-readable messages
- **Do NOT** use generic "Something went wrong" — be specific about what happened and what to do
- **Do NOT** hardcode hex colors — use Chakra UI theme tokens (`brand.gray`, `gray.200`, etc.)
- **Do NOT** add retry behavior for 404 errors — retrying a deleted item is pointless
- **Do NOT** break the existing loading and success states in `ItemDetailModal` — only modify the error branch
- **Do NOT** use `any` type — define proper TypeScript interfaces for error classes and component props
- **Do NOT** forget to handle the case where `error` is NOT an `ApiError` (e.g., network failures that don't reach the server produce plain `Error`)
- **Do NOT** modify the existing `ActivityTimeline` or `CommentThread` components — those are separate stories' scope

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 5, Story 5.3] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — Error handling standards, HTTP status codes, error format
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Component patterns, TanStack Query, state management
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns] — Error handling patterns, user-facing messages, retry patterns
- [Source: _bmad-output/project-context.md] — Naming conventions, anti-patterns, testing rules, error handling rules
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Existing modal with inline error display to replace
- [Source: frontend/src/features/backlog/hooks/use-backlog-item-detail.ts] — Existing hook to extend with ApiError
- [Source: backend/src/controllers/backlog.controller.ts] — Backend 404 handling (already correct)
- [Source: backend/src/types/api.types.ts] — ApiErrorResponse type for error format reference
- [Source: _bmad-output/implementation-artifacts/5-1-display-item-updates-and-notes-from-it.md] — Previous story patterns and learnings
- [Source: _bmad-output/implementation-artifacts/5-2-display-comments-from-linear.md] — Previous story patterns and learnings

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
