# Story 5.1: Display Item Updates and Notes from IT

Linear Issue ID: VIX-350
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to see updates and notes from the IT team on items,
so that I can understand the current status and progress.

## Acceptance Criteria

1. **Given** Linear items have activity history (state changes, assignments, priority changes), **When** I view an item detail, **Then** an "Activity" section displays these updates in reverse-chronological order (newest first)
2. **And** each activity entry shows: timestamp, author name, and a human-readable description of what changed (e.g. "Status changed from Backlog to In Progress")
3. **And** timestamps are formatted in user-friendly format (e.g. "Feb 9, 2026 3:45 PM")
4. **And** technical jargon is minimized — use business-friendly language (e.g. "Assigned to Jane Smith" not "fromAssigneeId changed to abc-123")
5. **And** the activity section is visually distinct from the existing Comments section (separate heading, different styling)
6. **And** empty activity state shows a helpful message ("No activity recorded yet")
7. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
8. **And** unit tests cover the activity timeline component, backend endpoint changes, and transformer logic

## Tasks / Subtasks

- [x] Task 1: Add `getIssueHistory` method to `LinearClientService` (AC: #1)
  - [x] 1.1: Add `getIssueHistory(issueId: string)` to `linear-client.service.ts` — call `issue.history()` from `@linear/sdk`, return `IssueHistory[]` nodes
  - [x] 1.2: Add unit test for `getIssueHistory` (success + empty history cases)
- [x] Task 2: Create `IssueActivityDto` type and transformer (AC: #1, #2, #3, #4)
  - [x] 2.1: Add `IssueActivityDto` interface to `backend/src/types/linear-entities.types.ts` with fields: `id`, `createdAt`, `actorName`, `type`, `description`
  - [x] 2.2: Add `issueActivityDtoSchema` Zod schema to `backend/src/types/linear-entities.schemas.ts`
  - [x] 2.3: Add `toIssueActivityDto` and `toIssueActivityDtos` transformer functions to `backend/src/services/sync/linear-transformers.ts`
  - [x] 2.4: Transformer must resolve `IssueHistory` fields into human-readable descriptions:
    - State changes: "Status changed from {fromState} to {toState}"
    - Assignee changes: "Assigned to {toAssignee}" / "Unassigned from {fromAssignee}"
    - Priority changes: "Priority changed from {fromPriority} to {toPriority}"
    - Label changes: "Label added: {labelName}" / "Label removed: {labelName}"
    - Other changes: "Updated by {actorName}"
  - [x] 2.5: Filter out irrelevant/noisy history entries (e.g. auto-sorting, internal metadata changes)
  - [x] 2.6: Add unit tests for all transformer paths (state, assignee, priority, labels, unknown, empty)
- [x] Task 3: Update backend endpoint to include activity (AC: #1, #7)
  - [x] 3.1: Update `BacklogService.getBacklogItemById` to also call `linearClient.getIssueHistory(issueId)` and transform results
  - [x] 3.2: Update `BacklogDetailResponse` in `backend/src/types/api.types.ts` to add `activities: IssueActivityDto[]`
  - [x] 3.3: Response shape becomes: `{ item: BacklogItemDto, comments: CommentDto[], activities: IssueActivityDto[] }`
  - [x] 3.4: Use `Promise.all` to fetch issue, comments, and history in parallel for performance
  - [x] 3.5: If history fetch fails, return empty activities array (graceful degradation — don't break the detail view)
  - [x] 3.6: Update existing controller/route tests to verify activities in response
- [x] Task 4: Update frontend types (AC: #1)
  - [x] 4.1: Add `IssueActivity` interface to `frontend/src/features/backlog/types/backlog.types.ts` with fields: `id`, `createdAt`, `actorName`, `type`, `description`
  - [x] 4.2: Update `BacklogDetailResponse` to add `activities: IssueActivity[]`
- [x] Task 5: Create `ActivityTimeline` component (AC: #1, #2, #3, #4, #5, #6)
  - [x] 5.1: Create `frontend/src/features/backlog/components/activity-timeline.tsx`
  - [x] 5.2: Display activities in reverse-chronological list with: timestamp (formatted via `formatDateTime`), actor name, human-readable description
  - [x] 5.3: Use visual styling distinct from comments: lighter background, smaller text, timeline/list layout with subtle left border or dots
  - [x] 5.4: Show "No activity recorded yet" when activities array is empty
  - [x] 5.5: Use Chakra UI components (Box, Text, VStack, Flex) with theme tokens only
  - [x] 5.6: Ensure accessible: semantic HTML, screen-reader friendly text
  - [x] 5.7: Add unit tests for ActivityTimeline (render, empty state, multiple entries, formatting)
- [x] Task 6: Integrate into `ItemDetailModal` (AC: #1, #5)
  - [x] 6.1: Update `ItemDetailContent` in `item-detail-modal.tsx` to accept and render `activities`
  - [x] 6.2: Add "Activity" section between Description and Comments, with its own heading
  - [x] 6.3: Pass `data.activities` from `useBacklogItemDetail` response to `ItemDetailContent`
  - [x] 6.4: Update `ItemDetailModal` tests to verify activity section renders
- [x] Task 7: Build verification (AC: #7, #8)
  - [x] 7.1: Run `npm run build` in both `backend/` and `frontend/`
  - [x] 7.2: Run full test suite in both `backend/` and `frontend/`

## Dev Notes

### What's Already Done (from Stories 1.x–4.x)

| Capability | Story | File |
|---|---|---|
| ItemDetailModal component | 3.4 | `frontend/src/features/backlog/components/item-detail-modal.tsx` |
| useBacklogItemDetail hook | 3.4 | `frontend/src/features/backlog/hooks/use-backlog-item-detail.ts` |
| BacklogDetailResponse type (frontend) | 3.4 | `frontend/src/features/backlog/types/backlog.types.ts` |
| BacklogDetailResponse type (backend) | 3.4 | `backend/src/types/api.types.ts` |
| BacklogService.getBacklogItemById | 3.4 | `backend/src/services/backlog/backlog.service.ts` |
| GET /api/backlog-items/:id route | 3.4 | `backend/src/routes/backlog.routes.ts` |
| LinearClientService (getIssueById, getIssueComments) | 2.x | `backend/src/services/sync/linear-client.service.ts` |
| toBacklogItemDto, toCommentDto, toCommentDtos | 2.4 | `backend/src/services/sync/linear-transformers.ts` |
| BacklogItemDto, CommentDto types | 2.4 | `backend/src/types/linear-entities.types.ts` |
| Zod schemas (backlogItemDtoSchema, commentDtoSchema) | 2.4 | `backend/src/types/linear-entities.schemas.ts` |
| MarkdownContent renderer | 3.4 | `frontend/src/features/backlog/components/item-detail-modal.tsx` |
| formatDateTime, formatDateOnly helpers | 3.4 | `frontend/src/utils/formatters.ts` |
| STATUS_COLORS mapping | 3.4 | `frontend/src/features/backlog/utils/status-colors.ts` |
| react-markdown + remark-breaks | 3.4 | `frontend/package.json` |

### What This Story Adds

1. **Backend:** New `getIssueHistory` method on `LinearClientService` to fetch `IssueHistory` nodes from Linear SDK
2. **Backend:** New `IssueActivityDto` type + Zod schema + transformer that converts raw `IssueHistory` into human-readable activity descriptions
3. **Backend:** Updated `getBacklogItemById` service to fetch history in parallel with issue + comments, returning `{ item, comments, activities }`
4. **Frontend:** New `IssueActivity` type and updated `BacklogDetailResponse`
5. **Frontend:** New `ActivityTimeline` component displaying formatted activity entries
6. **Frontend:** Updated `ItemDetailModal` to render the activity section

### CRITICAL: Linear SDK `issue.history()` API

The `@linear/sdk` v73+ exposes issue history via the `issue.history()` method:

```typescript
// In linear-client.service.ts — new method
async getIssueHistory(issueId: string): Promise<LinearQueryResult<IssueHistory[]>> {
  const client = this.getClient()
  return this.executeWithRateTracking('getIssueHistory', async () => {
    const issue = await client.issue(issueId)
    const history = await issue.history()
    return history.nodes
  })
}
```

**IssueHistory fields available from Linear SDK:**
- `id` — unique history entry ID
- `createdAt` — when the change occurred (Date)
- `actor` — relation to User who made the change (async, call `await entry.actor`)
- `fromState` / `toState` — relation to WorkflowState (async, for state transitions)
- `fromAssignee` / `toAssignee` — relation to User (async, for assignment changes)
- `fromPriority` / `toPriority` — number (priority level changes)
- `addedLabels` / `removedLabels` — relations to Label collections (async)
- `archived` — boolean (archival events)
- `autoArchived` / `autoUnarchived` — boolean
- `source` — JSON metadata about change source

**CRITICAL: Async resolution.** Many `IssueHistory` fields are async relations in the Linear SDK (just like `Issue.state`). The transformer MUST `await` these relations to get actual names. Use `Promise.all` for parallel resolution.

```typescript
// Transformer pattern — resolve async relations
async function toIssueActivityDto(entry: IssueHistory): Promise<IssueActivityDto> {
  const [actor, fromState, toState, fromAssignee, toAssignee] = await Promise.all([
    entry.actor?.catch(() => null),
    entry.fromState?.catch(() => null),
    entry.toState?.catch(() => null),
    entry.fromAssignee?.catch(() => null),
    entry.toAssignee?.catch(() => null),
  ])

  const actorName = actor?.name ?? 'System'
  const description = buildActivityDescription(entry, { fromState, toState, fromAssignee, toAssignee })

  return {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    actorName,
    type: classifyActivityType(entry, { fromState, toState, fromAssignee, toAssignee }),
    description,
  }
}
```

### CRITICAL: Human-Readable Activity Descriptions

Business users need plain-language descriptions, NOT technical field names. The transformer must produce descriptions like:

| Change Type | Description Format | Example |
|---|---|---|
| State change | "Status changed from {from} to {to}" | "Status changed from Backlog to In Progress" |
| Assignment | "Assigned to {name}" or "Unassigned" | "Assigned to Jane Smith" |
| Priority change | "Priority changed from {from} to {to}" | "Priority changed from Normal to High" |
| Label added | "Label added: {name}" | "Label added: Frontend" |
| Label removed | "Label removed: {name}" | "Label removed: Bug" |
| Created | "Issue created" | "Issue created" |
| Archived | "Item archived" / "Item unarchived" | "Item archived" |
| Other/unknown | "Updated by {actor}" | "Updated by John Doe" |

**Priority labels mapping** (reuse from existing `PriorityLabel` type in `linear-entities.types.ts`):
- 0 = "No priority"
- 1 = "Urgent"
- 2 = "High"
- 3 = "Normal" (was "Medium" in some contexts)
- 4 = "Low"

### CRITICAL: Filtering Noisy History Entries

Linear records many internal changes that are meaningless to business users. The transformer MUST filter out:
- Auto-sort order changes (changes to `sortOrder` with no other visible change)
- Subscriber list changes
- Internal metadata-only updates
- Duplicate entries (same change within seconds)

**Filtering logic:**
```typescript
function isRelevantActivity(entry: IssueHistory, resolved: ResolvedRelations): boolean {
  // Keep: state changes, assignment changes, priority changes, label changes, creation, archival
  if (resolved.fromState || resolved.toState) return true
  if (resolved.fromAssignee || resolved.toAssignee) return true
  if (entry.fromPriority !== undefined || entry.toPriority !== undefined) return true
  if (entry.addedLabelIds?.length || entry.removedLabelIds?.length) return true
  if (entry.archived !== undefined) return true
  // Filter: everything else is internal noise
  return false
}
```

### CRITICAL: Graceful Degradation

If `issue.history()` fails (API error, permissions, SDK issue), the detail view MUST NOT break. Return empty activities array and log the error:

```typescript
// In backlog.service.ts
async getBacklogItemById(issueId: string) {
  const [issueResult, commentsResult, historyResult] = await Promise.allSettled([
    linearClient.getIssueById(issueId),
    linearClient.getIssueComments(issueId),
    linearClient.getIssueHistory(issueId),
  ])

  // Issue is required — if it fails, return null (404)
  if (issueResult.status === 'rejected' || !issueResult.value.data) return null

  // Comments and history degrade gracefully
  const comments = commentsResult.status === 'fulfilled'
    ? await toCommentDtos(commentsResult.value.data ?? [])
    : []
  const activities = historyResult.status === 'fulfilled'
    ? await toIssueActivityDtos(historyResult.value.data ?? [])
    : []

  if (historyResult.status === 'rejected') {
    logger.warn({ issueId, error: historyResult.reason }, 'Failed to fetch issue history')
  }

  const item = await toBacklogItemDto(issueResult.value.data)
  return { item, comments, activities }
}
```

### CRITICAL: Frontend ActivityTimeline Component

```typescript
// frontend/src/features/backlog/components/activity-timeline.tsx
// Key design decisions:
// - Reverse-chronological order (newest first)
// - Distinct visual styling from Comments (lighter, smaller, timeline dots)
// - Use existing formatDateTime from utils/formatters.ts
// - Use Chakra UI theme tokens only (no hardcoded hex)
// - Accessible: semantic HTML, ARIA labels
```

**Visual design (from UX spec):**
- Use a subtle left border (2px, gray.200) for timeline feel
- Each entry: small dot indicator, timestamp (gray.500, xs font), actor name (gray.700, sm font), description (gray.800, sm font)
- Section heading: "Activity" with count, matching the "Comments (N)" pattern
- Vixxo Gray (#3E4543 = `brand.gray`) for primary text
- Keep entries compact — this is supplementary info, not the main content

**Integration into ItemDetailModal layout order:**
1. Metadata grid (existing)
2. Labels (existing)
3. Description (existing)
4. **Activity (NEW — this story)**
5. Comments (existing)

### Architecture Compliance

**From architecture.md:**
- Feature components in `features/backlog/components/` ✅
- Backend: DTOs in `types/`, transformers in `services/sync/` ✅
- REST: extend GET `/api/backlog-items/:id` response ✅
- Use theme tokens — no hardcoded hex ✅
- Routes → Controllers → Services pattern ✅
- Centralized error handling via middleware ✅
- Structured Pino logging ✅

**From project-context.md:**
- `camelCase` for JSON fields ✅
- Immutable state updates ✅
- TypeScript strict mode ✅
- Error Boundaries for React components ✅
- Co-located tests (`*.test.ts`, `*.test.tsx`) ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 3.4 Item Detail View | **HARD dependency** | Must be merged first. Provides ItemDetailModal, useBacklogItemDetail hook, GET /api/backlog-items/:id endpoint, BacklogDetailResponse types. Currently in `review` status. |
| 5.2 Display Comments | Related (sibling) | May enhance comment display. Story 5.1 does NOT modify existing comment rendering — only adds new Activity section. |
| 5.3 Handle Deleted Items | Related (sibling) | 404 handling already exists from 3.4. No changes needed for 5.1. |
| 2.4 Linear Data Models | Depends on | Provides existing transformer patterns (`toBacklogItemDto`, `toCommentDtos`). Follow same patterns for `toIssueActivityDtos`. |
| 2.1-2.3 Linear Client | Depends on | `LinearClientService` with `executeWithRateTracking` wrapper. New `getIssueHistory` method follows exact same pattern. |

### Git Intelligence (Recent Patterns)

From recent commits:
- `bd73a7e feat: add guided empty state for filtered backlog` — Most recent, Story 4.4
- `38e5a70 feat: implement item detail view with review fixes (VIX-343)` — Story 3.4, directly relevant
- Pattern: features committed as single feat commits with issue ID reference
- Review fixes applied in same commit or follow-up
- Dependencies added: `react-markdown`, `remark-breaks` (3.4)
- Shared utilities extracted: `status-colors.ts`, `formatters.ts` (3.4 review fixes)
- Tests co-located with source files

### Project Structure After This Story

```
backend/src/
├── services/
│   ├── sync/
│   │   ├── linear-client.service.ts       (MODIFIED — add getIssueHistory)
│   │   ├── linear-client.service.test.ts  (MODIFIED — add getIssueHistory tests)
│   │   ├── linear-transformers.ts         (MODIFIED — add toIssueActivityDto, toIssueActivityDtos)
│   │   └── linear-transformers.test.ts    (MODIFIED — add activity transformer tests)
│   └── backlog/
│       ├── backlog.service.ts             (MODIFIED — fetch history in parallel)
│       └── backlog.service.test.ts        (MODIFIED — verify activities in response)
├── types/
│   ├── linear-entities.types.ts           (MODIFIED — add IssueActivityDto)
│   ├── linear-entities.schemas.ts         (MODIFIED — add issueActivityDtoSchema)
│   └── api.types.ts                       (MODIFIED — add activities to BacklogDetailResponse)
├── controllers/
│   └── backlog.controller.ts              (unchanged — already returns service result)
└── routes/
    └── backlog.routes.ts                  (unchanged — endpoint already exists)

frontend/src/
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── activity-timeline.tsx       (NEW)
│       │   ├── activity-timeline.test.tsx  (NEW)
│       │   ├── item-detail-modal.tsx       (MODIFIED — add Activity section)
│       │   └── item-detail-modal.test.tsx  (MODIFIED — verify activity rendering)
│       └── types/
│           └── backlog.types.ts           (MODIFIED — add IssueActivity, update BacklogDetailResponse)
```

### What NOT To Do

- **Do NOT** modify the existing Comments section — that's Story 5.2's scope
- **Do NOT** create a separate API endpoint for history — extend the existing GET /api/backlog-items/:id
- **Do NOT** fetch history eagerly on list load — only fetch when detail modal opens (lazy load, same as current pattern)
- **Do NOT** hardcode hex colors — use theme tokens (`brand.green`, `brand.gray`, `gray.200`, etc.)
- **Do NOT** break the detail view if history fetch fails — graceful degradation with empty array
- **Do NOT** show raw Linear field names to users — transform everything to human-readable
- **Do NOT** display subscriber changes, sort order changes, or metadata-only updates — filter these out
- **Do NOT** use `any` type — define proper TypeScript interfaces for all history data
- **Do NOT** block on async relation resolution sequentially — use `Promise.all` for parallel resolution
- **Do NOT** forget to handle the case where `entry.actor` is null (system-generated changes)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 5, Story 5.1] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#API Design] — REST patterns, response formats, error handling
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Component patterns, TanStack Query, state management
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy] — Visual design tokens, Chakra UI patterns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns] — Empty state patterns, loading states
- [Source: _bmad-output/project-context.md] — Naming conventions, anti-patterns, testing rules
- [Source: backend/src/services/sync/linear-client.service.ts] — Existing LinearClientService pattern for new getIssueHistory method
- [Source: backend/src/services/sync/linear-transformers.ts] — Existing transformer patterns for toIssueActivityDto
- [Source: backend/src/types/linear-entities.types.ts] — Existing DTO pattern for IssueActivityDto
- [Source: backend/src/services/backlog/backlog.service.ts] — Existing getBacklogItemById to extend with history
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Existing modal to add Activity section
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — Existing types to extend with IssueActivity
- [Source: frontend/src/utils/formatters.ts] — Existing formatDateTime for activity timestamps
- [Source: _bmad-output/implementation-artifacts/3-4-implement-item-detail-view.md] — Previous story context, implementation patterns

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- Fixed frontend build error: unused `IssueActivity` import in `item-detail-modal.test.tsx`
- Fixed frontend build error: missing `activities` field in `use-backlog-item-detail.test.tsx` mock
- Fixed test failure in `backlog-list.test.tsx`: mock detail response missing `activities` field — added defensive `?? []` guard to `ActivityTimeline` component

### Completion Notes List

- **Task 1:** Added `getIssueHistory` method to `LinearClientService` following exact same pattern as `getIssueComments` — calls `issue.history()` from `@linear/sdk` and returns nodes via `executeWithRateTracking`. 2 tests added (success + empty).
- **Task 2:** Created `IssueActivityDto` interface with `IssueActivityType` union type, Zod schema `issueActivityDtoSchema`, and transformer functions `toIssueActivityDto`/`toIssueActivityDtos`. Transformer resolves async SDK relations (actor, fromState, toState, fromAssignee, toAssignee) in parallel, builds human-readable descriptions, and filters out irrelevant noise. 15 tests added covering all transformer paths.
- **Task 3:** Refactored `getBacklogItemById` to use `Promise.allSettled` for parallel fetching of issue, comments, and history with graceful degradation — if history or comments fail, empty arrays returned. Updated `BacklogDetailResponse` to include `activities`. 6 backend tests updated/added.
- **Task 4:** Added `IssueActivity` interface and `IssueActivityType` type to frontend types. Updated `BacklogDetailResponse` to include `activities`.
- **Task 5:** Created `ActivityTimeline` component with timeline layout (left border + dots), reverse-chronological order, formatted timestamps, actor names, and descriptions. Accessible with `role="list"` and `aria-label`. Defensive `?? []` guard for undefined activities. 6 tests added.
- **Task 6:** Integrated `ActivityTimeline` into `ItemDetailModal` between Description and Comments sections. Updated all existing test mocks to include `activities` field. 2 new tests added for activity rendering.
- **Task 7:** Both `npm run build` (backend + frontend) pass with zero TypeScript errors. Full test suite: 316 backend tests + 130 frontend tests = 446 total, all passing.

### Change Log

- 2026-02-09: Story 5.1 implementation — Added issue activity/history display to item detail view. Backend: new `getIssueHistory` method, `IssueActivityDto` type + schema + transformer with human-readable descriptions and noise filtering, parallel history fetching with graceful degradation. Frontend: new `ActivityTimeline` component, integrated into `ItemDetailModal` between Description and Comments.
- 2026-02-10: Code review fixes — Fixed label activity resolution to correctly handle Linear SDK label relations, added controlled concurrency for history relation resolution to reduce rate-limit risk, corrected backend error handling so issue fetch failures return 5xx (not 404), and tightened frontend types (`PriorityLabel`, `WorkflowStateType`) for safer UI usage.

### File List

**Backend (modified):**
- `backend/src/services/sync/linear-client.service.ts` — Added `getIssueHistory` method, imported `IssueHistory` type
- `backend/src/services/sync/linear-client.service.test.ts` — Added `getIssueHistory` tests (success + empty)
- `backend/src/services/sync/linear-transformers.ts` — Added `toIssueActivityDto`, `toIssueActivityDtos`, activity filtering/classification/description logic
- `backend/src/services/sync/linear-transformers.test.ts` — Added 15 tests for activity transformer paths + Zod validation
- `backend/src/services/backlog/backlog.service.ts` — Refactored `getBacklogItemById` to use `Promise.allSettled` for parallel fetching with graceful degradation
- `backend/src/services/backlog/backlog.service.test.ts` — Updated tests for activities, added graceful degradation tests
- `backend/src/types/linear-entities.types.ts` — Added `IssueActivityType`, `IssueActivityDto`
- `backend/src/types/linear-entities.schemas.ts` — Added `issueActivityDtoSchema`
- `backend/src/types/api.types.ts` — Added `activities` to `BacklogDetailResponse`
- `backend/src/routes/backlog.routes.test.ts` — Updated test mock to include activities

**Frontend (new):**
- `frontend/src/features/backlog/components/activity-timeline.tsx` — New `ActivityTimeline` component
- `frontend/src/features/backlog/components/activity-timeline.test.tsx` — 6 tests for ActivityTimeline

**Frontend (modified):**
- `frontend/src/features/backlog/types/backlog.types.ts` — Added `IssueActivityType`, `IssueActivity`, updated `BacklogDetailResponse`
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — Integrated `ActivityTimeline` between Description and Comments
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — Updated all mocks with `activities`, added 2 activity tests
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — Updated mock to include `activities`
- `frontend/src/features/backlog/hooks/use-backlog-item-detail.test.tsx` — Updated mock to include `activities`

**Other:**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story 5-1 status to done

## Senior Developer Review (AI)

### Review Summary (2026-02-10)

- **AC coverage validated**: Activity timeline appears in item detail view; entries are human-readable; timestamps use existing `formatDateTime`; empty state message present; backend returns activities; tests cover backend/client/transformers and frontend component integration.
- **Critical fixes applied**:
  - Fixed label-added/label-removed activity descriptions to correctly resolve label relations from the Linear SDK (robust to different SDK shapes).
  - Added controlled concurrency for resolving lazy `IssueHistory` relations to reduce rate-limit risk on issues with large history.
  - Corrected backend behavior so *issue fetch failures* (network/auth) no longer masquerade as 404 “not found”.
  - Tightened frontend types (`PriorityLabel`, `WorkflowStateType`) to match backend DTO constraints.
- **Verification**: `backend` + `frontend` unit tests passing after fixes.
