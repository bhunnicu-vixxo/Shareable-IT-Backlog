# Story 5.2: Display Comments from Linear

Linear Issue ID: VIX-351
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to read comments from Linear on items,
so that I can see stakeholder discussions and context.

## Acceptance Criteria

1. **Given** Linear items have comments, **When** I view an item detail, **Then** comments are displayed in chronological order (oldest first for natural reading)
2. **And** each comment shows: author avatar (initials fallback), author name, timestamp, and markdown-formatted content
3. **And** threaded/reply comments are visually nested beneath their parent comment with indentation
4. **And** top-level comments are visually distinct from replies (replies use lighter background, smaller indent)
5. **And** long comment threads (>3 replies) show a "Show N more replies" toggle to avoid overwhelming the detail view
6. **And** timestamps are formatted in user-friendly format (e.g. "Feb 9, 2026 3:45 PM") using existing `formatDateTime`
7. **And** empty comment state shows "No comments yet." (already exists, preserve behavior)
8. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
9. **And** unit tests cover the updated transformer, threaded component, and integration in item-detail-modal

## Tasks / Subtasks

- [x] Task 1: Extend `CommentDto` with threading and avatar fields (AC: #2, #3)
  - [x] 1.1: Add `parentId: string | null` to `CommentDto` in `backend/src/types/linear-entities.types.ts`
  - [x] 1.2: Add `userAvatarUrl: string | null` to `CommentDto` in `backend/src/types/linear-entities.types.ts`
  - [x] 1.3: Update `commentDtoSchema` in `backend/src/types/linear-entities.schemas.ts` to include `parentId` (z.string().nullable()) and `userAvatarUrl` (z.string().nullable())
- [x] Task 2: Update `toCommentDto` transformer (AC: #1, #2, #3)
  - [x] 2.1: In `backend/src/services/sync/linear-transformers.ts`, update `toCommentDto` to resolve `comment.parent` (async relation) for `parentId`
  - [x] 2.2: Extract `user.avatarUrl` from the already-resolved `comment.user` relation
  - [x] 2.3: Use `Promise.all` to resolve `comment.user` and `comment.parent` in parallel (same pattern as `toBacklogItemDto`)
  - [x] 2.4: Handle null parent (top-level comment) and null user (deleted user) gracefully
  - [x] 2.5: Update `toCommentDtos` to sort by `createdAt` ascending (oldest first) for natural reading order
  - [x] 2.6: Add/update unit tests: new fields, parent resolution, sorting, null handling
- [x] Task 3: Update frontend types (AC: #2, #3)
  - [x] 3.1: Add `parentId: string | null` to `BacklogItemComment` in `frontend/src/features/backlog/types/backlog.types.ts`
  - [x] 3.2: Add `userAvatarUrl: string | null` to `BacklogItemComment` in `frontend/src/features/backlog/types/backlog.types.ts`
- [x] Task 4: Create `CommentThread` component (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 4.1: Create `frontend/src/features/backlog/components/comment-thread.tsx`
  - [x] 4.2: Build thread tree: group comments by `parentId` (null = top-level, non-null = reply)
  - [x] 4.3: Render top-level comments in chronological order, each followed by its nested replies
  - [x] 4.4: Display author avatar circle (initials from `userName`, or use `userAvatarUrl` if available) — use Chakra UI `Avatar` component
  - [x] 4.5: Display author name, timestamp (`formatDateTime`), and markdown body (reuse existing `MarkdownContent` from item-detail-modal)
  - [x] 4.6: Replies indented with left margin (ml="8") and lighter background
  - [x] 4.7: When a parent comment has >3 replies, show only the first 2 + a "Show N more replies" toggle
  - [x] 4.8: Show "No comments yet." when comments array is empty
  - [x] 4.9: Use Chakra UI theme tokens only (no hardcoded hex values)
  - [x] 4.10: Accessible: semantic HTML, `role="list"` for comment list, `aria-label`
  - [x] 4.11: Add unit tests for CommentThread (render, threading, empty state, collapse/expand, avatar display, long threads)
- [x] Task 5: Integrate into `ItemDetailModal` (AC: #1, #3)
  - [x] 5.1: Replace inline `CommentBlock` + flat list in `item-detail-modal.tsx` with `<CommentThread comments={comments} />`
  - [x] 5.2: Remove the `CommentBlock` function from `item-detail-modal.tsx` (logic moves to `CommentThread`)
  - [x] 5.3: Keep the "Comments (N)" heading inside `ItemDetailContent` — pass count as prop or compute in `CommentThread`
  - [x] 5.4: Update `ItemDetailModal` tests to verify threaded comment rendering, avatar display, and toggle behavior
  - [x] 5.5: Update any other test files that mock `BacklogItemComment` to include `parentId` and `userAvatarUrl` fields
- [x] Task 6: Build verification (AC: #8, #9)
  - [x] 6.1: Run `npm run build` in both `backend/` and `frontend/`
  - [x] 6.2: Run full test suite in both `backend/` and `frontend/`

## Dev Notes

### What's Already Done (from Stories 1.x–5.1)

| Capability | Story | File |
|---|---|---|
| ItemDetailModal component | 3.4 | `frontend/src/features/backlog/components/item-detail-modal.tsx` |
| `CommentBlock` flat comment rendering | 3.4 | `frontend/src/features/backlog/components/item-detail-modal.tsx` (inline) |
| `MarkdownContent` renderer | 3.4 | `frontend/src/features/backlog/components/item-detail-modal.tsx` (inline) |
| useBacklogItemDetail hook | 3.4 | `frontend/src/features/backlog/hooks/use-backlog-item-detail.ts` |
| BacklogDetailResponse type (frontend) | 5.1 | `frontend/src/features/backlog/types/backlog.types.ts` |
| BacklogDetailResponse type (backend) | 5.1 | `backend/src/types/api.types.ts` |
| BacklogService.getBacklogItemById | 5.1 | `backend/src/services/backlog/backlog.service.ts` |
| GET /api/backlog-items/:id route | 3.4 | `backend/src/routes/backlog.routes.ts` |
| LinearClientService.getIssueComments | 2.x | `backend/src/services/sync/linear-client.service.ts` |
| toCommentDto, toCommentDtos transformers | 2.4 | `backend/src/services/sync/linear-transformers.ts` |
| CommentDto type + commentDtoSchema | 2.4 | `backend/src/types/linear-entities.types.ts`, `linear-entities.schemas.ts` |
| BacklogItemComment frontend type | 3.4 | `frontend/src/features/backlog/types/backlog.types.ts` |
| formatDateTime, formatDateOnly helpers | 3.4 | `frontend/src/utils/formatters.ts` |
| ActivityTimeline component | 5.1 | `frontend/src/features/backlog/components/activity-timeline.tsx` |
| react-markdown + remark-breaks | 3.4 | `frontend/package.json` |

### What This Story Changes

1. **Backend**: Adds `parentId` and `userAvatarUrl` to `CommentDto` + Zod schema
2. **Backend**: Updates `toCommentDto` transformer to resolve `comment.parent` for threading and capture avatar URL
3. **Backend**: Sorts comments chronologically (oldest first) in `toCommentDtos`
4. **Frontend**: Adds `parentId` and `userAvatarUrl` to `BacklogItemComment`
5. **Frontend**: New `CommentThread` component replacing flat `CommentBlock` display
6. **Frontend**: Updated `ItemDetailModal` integration to use threaded comments

### CRITICAL: Linear SDK `Comment.parent` Threading API

The `@linear/sdk` v73+ `Comment` type supports threaded comments. Key fields:

```typescript
// Comment SDK type (simplified, relevant fields only):
interface Comment {
  id: string
  body: string           // Markdown content
  createdAt: Date
  updatedAt: Date
  user: Promise<User>    // Async relation — already resolved in existing transformer
  parent: Promise<Comment | undefined>  // Async relation — NEW: resolve for parentId
}
```

**Updated transformer pattern:**
```typescript
export async function toCommentDto(comment: Comment): Promise<CommentDto> {
  // Resolve user and parent in parallel
  const [user, parent] = await Promise.all([
    comment.user,
    Promise.resolve(comment.parent).catch(() => undefined),
  ])

  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    userId: user?.id ?? null,
    userName: user?.name ?? null,
    userAvatarUrl: user?.avatarUrl ?? null,   // NEW
    parentId: parent?.id ?? null,              // NEW
  }
}
```

**CRITICAL: `comment.parent` is an async relation** in the Linear SDK (same as `comment.user`). It MUST be resolved with `await` and wrapped in `.catch()` for deleted parent comments. Use `Promise.all` for parallel resolution.

### CRITICAL: Thread Tree Construction (Frontend)

Build thread tree from flat array using `parentId`:

```typescript
interface ThreadedComment {
  comment: BacklogItemComment
  replies: BacklogItemComment[]
}

function buildThreadTree(comments: BacklogItemComment[]): ThreadedComment[] {
  const topLevel: BacklogItemComment[] = []
  const repliesMap = new Map<string, BacklogItemComment[]>()

  for (const comment of comments) {
    if (!comment.parentId) {
      topLevel.push(comment)
    } else {
      const existing = repliesMap.get(comment.parentId) ?? []
      existing.push(comment)
      repliesMap.set(comment.parentId, existing)
    }
  }

  return topLevel.map((comment) => ({
    comment,
    replies: repliesMap.get(comment.id) ?? [],
  }))
}
```

**Thread display rules:**
- Top-level comments: full width, `borderColor="gray.200"`, `bg="gray.50"`
- Replies: indented `ml="8"`, `bg="gray.25"` or `bg="white"`, `borderLeft="2px"`, `borderColor="gray.200"`
- Replies sorted chronologically (oldest first, natural conversation flow)
- If >3 replies on a parent, show first 2 + toggle "Show N more replies"

### CRITICAL: Avatar Display

Use Chakra UI `Avatar` component for author display:

```typescript
import { Avatar } from '@chakra-ui/react'

// With avatar URL (if Linear provides one)
<Avatar name={comment.userName ?? 'Unknown'} src={comment.userAvatarUrl ?? undefined} size="sm" />

// Chakra Avatar auto-generates initials from `name` when `src` is null/undefined
```

**Design:** Small avatar (size "sm" = 32px) to the left of author name and timestamp. Keeps consistent with professional comment thread UIs.

### CRITICAL: Reuse `MarkdownContent` Component

The existing `MarkdownContent` component in `item-detail-modal.tsx` is defined as an internal function. For reuse in `CommentThread`, either:

**Option A (recommended):** Extract `MarkdownContent` to a shared location or export it from `item-detail-modal.tsx`.

**Option B:** Duplicate it in `comment-thread.tsx` (acceptable since it's small, but less DRY).

Choose Option A if practical — keep the component in `item-detail-modal.tsx` but `export` it so `comment-thread.tsx` can import it.

### CRITICAL: Collapse/Expand for Long Threads

```typescript
const VISIBLE_REPLIES_THRESHOLD = 3
const INITIALLY_VISIBLE = 2

function ThreadReplies({ replies }: { replies: BacklogItemComment[] }) {
  const [expanded, setExpanded] = useState(false)
  const showToggle = replies.length > VISIBLE_REPLIES_THRESHOLD
  const visibleReplies = expanded ? replies : replies.slice(0, INITIALLY_VISIBLE)
  const hiddenCount = replies.length - INITIALLY_VISIBLE

  return (
    <VStack align="stretch" gap="2" ml="8">
      {visibleReplies.map((reply) => (
        <CommentCard key={reply.id} comment={reply} isReply />
      ))}
      {showToggle && !expanded && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
          Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
        </Button>
      )}
    </VStack>
  )
}
```

### CRITICAL: Sorting Order

- **Comments from API**: `toCommentDtos` sorts ascending by `createdAt` (oldest first)
- **Thread display**: Top-level comments oldest first, replies within each thread oldest first
- This matches natural conversation reading order (chat-style, not feed-style)

### Architecture Compliance

**From architecture.md:**
- Feature components in `features/backlog/components/` ✅
- Backend: DTOs in `types/`, transformers in `services/sync/` ✅
- REST: extends existing GET `/api/backlog-items/:id` response (no new endpoints) ✅
- Use theme tokens — no hardcoded hex ✅
- Routes → Controllers → Services pattern ✅
- Centralized error handling via middleware ✅

**From project-context.md:**
- `camelCase` for JSON fields ✅
- Immutable state updates ✅
- TypeScript strict mode ✅
- Error Boundaries for React components ✅
- Co-located tests (`*.test.ts`, `*.test.tsx`) ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 3.4 Item Detail View | **HARD dependency** | Provides ItemDetailModal, CommentBlock, MarkdownContent, useBacklogItemDetail hook. Story 5.2 replaces CommentBlock with CommentThread. |
| 5.1 Display Activity | **Completed sibling** | Already merged. Provides parallel fetch pattern with `Promise.allSettled`. Activity section is separate — no conflict. |
| 5.3 Handle Deleted Items | Related (sibling) | 404 handling exists from 3.4. No changes needed for 5.2. |
| 2.4 Linear Data Models | Depends on | Provides existing `CommentDto`, `toCommentDto`, `toCommentDtos` transformer patterns. Story 5.2 extends these. |

### Git Intelligence (Recent Patterns)

From recent commits:
- `9597d9f Merge pull request #4` — Story 4.3 sorting, most recent merge to main
- Story 5.1 is on the current branch `rhunnicutt/issue-5-1-display-item-updates-and-notes-from-it` and is marked done
- Pattern: features committed as single feat commits with issue ID reference
- Shared utilities extracted: `status-colors.ts`, `formatters.ts` (3.4)
- Tests co-located with source files

### Previous Story Intelligence (5.1)

**Key learnings from Story 5.1:**
- `Promise.allSettled` pattern in `backlog.service.ts` works well for parallel fetching with graceful degradation — no change needed for 5.2
- The `item-detail-modal.tsx` already accepts `comments` prop and passes to `ItemDetailContent` — 5.2 replaces the rendering, not the data flow
- Test mocks across multiple files need `activities` field (added in 5.1) — 5.2 must also add `parentId` and `userAvatarUrl` to all test mocks that include comments
- Build errors from missing fields in test mocks are the most common blocker — be thorough
- `ActivityTimeline` used `?? []` defensive guard — `CommentThread` should do the same for `comments` prop

**Files that have comment mocks needing update:**
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx`
- `frontend/src/features/backlog/components/backlog-list.test.tsx`
- `frontend/src/features/backlog/hooks/use-backlog-item-detail.test.tsx`
- `backend/src/services/backlog/backlog.service.test.ts`
- `backend/src/routes/backlog.routes.test.ts`
- `backend/src/services/sync/linear-transformers.test.ts`

### Project Structure After This Story

```
backend/src/
├── services/
│   └── sync/
│       ├── linear-transformers.ts         (MODIFIED — update toCommentDto, toCommentDtos)
│       └── linear-transformers.test.ts    (MODIFIED — add parentId/avatar/sorting tests)
├── types/
│   ├── linear-entities.types.ts           (MODIFIED — add parentId, userAvatarUrl to CommentDto)
│   └── linear-entities.schemas.ts         (MODIFIED — update commentDtoSchema)

frontend/src/
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── comment-thread.tsx          (NEW — threaded comment display)
│       │   ├── comment-thread.test.tsx     (NEW)
│       │   ├── item-detail-modal.tsx       (MODIFIED — replace CommentBlock with CommentThread, export MarkdownContent)
│       │   └── item-detail-modal.test.tsx  (MODIFIED — verify threaded rendering)
│       └── types/
│           └── backlog.types.ts           (MODIFIED — add parentId, userAvatarUrl to BacklogItemComment)
```

### What NOT To Do

- **Do NOT** modify the existing Activity section — that's Story 5.1's completed scope
- **Do NOT** create a separate API endpoint for comments — extend the existing GET /api/backlog-items/:id response
- **Do NOT** fetch comments eagerly on list load — only fetch when detail modal opens (lazy load, same as current pattern)
- **Do NOT** hardcode hex colors — use theme tokens (`brand.green`, `brand.gray`, `gray.200`, etc.)
- **Do NOT** break the detail view if comment fetch fails — graceful degradation with empty array already works in `backlog.service.ts`
- **Do NOT** modify `backlog.service.ts` — the `getBacklogItemById` method already fetches comments via `Promise.allSettled` and the transformer changes handle everything
- **Do NOT** modify `linear-client.service.ts` — `getIssueComments` already fetches all comments including replies; threading is resolved in the transformer
- **Do NOT** use `any` type — define proper TypeScript interfaces for thread tree structures
- **Do NOT** deeply nest replies (Linear only supports 1 level of threading) — parent comments + flat replies is the correct model
- **Do NOT** forget to update ALL test mock files that reference `BacklogItemComment` or `CommentDto` — this was the #1 build blocker in Story 5.1

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 5, Story 5.2] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#API Design] — REST patterns, response formats, error handling
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Component patterns, TanStack Query, state management
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy] — Visual design tokens, Chakra UI patterns
- [Source: _bmad-output/project-context.md] — Naming conventions, anti-patterns, testing rules
- [Source: backend/src/services/sync/linear-transformers.ts] — Existing toCommentDto/toCommentDtos transformer to extend
- [Source: backend/src/types/linear-entities.types.ts] — Existing CommentDto type to extend
- [Source: backend/src/types/linear-entities.schemas.ts] — Existing commentDtoSchema to extend
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Existing CommentBlock to replace with CommentThread
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — Existing BacklogItemComment to extend
- [Source: frontend/src/utils/formatters.ts] — Existing formatDateTime for comment timestamps
- [Source: _bmad-output/implementation-artifacts/5-1-display-item-updates-and-notes-from-it.md] — Previous story context, patterns, and learnings

## Dev Agent Record

### Agent Model Used

Claude (claude-4.6-opus-high-thinking)

### Debug Log References

- Fixed frontend circular import risk by extracting shared markdown rendering into `markdown-content.tsx`

### Completion Notes List

- **Task 1:** Extended `CommentDto` and `commentDtoSchema` with `parentId` (nullable string) and `userAvatarUrl` (nullable string)
- **Task 2:** Updated `toCommentDto` to resolve `comment.parent` and `comment.user` in parallel via `Promise.all`; `comment.parent` wrapped in `.catch()` for deleted parent comments; `toCommentDtos` now sorts ascending by `createdAt` (oldest first). Added 5 new unit tests for parentId resolution, avatar extraction, and sorting.
- **Task 3:** Added `parentId` and `userAvatarUrl` to frontend `BacklogItemComment` type
- **Task 4:** Created `CommentThread` component with thread tree builder, avatar display (Chakra Avatar with initials fallback), reply indentation, collapse/expand for >3 replies, empty state, accessibility (role="list", aria-label). 15 unit tests covering render, threading, empty state, collapse/expand, and avatar display.
- **Task 5:** Extracted shared `MarkdownContent` into `markdown-content.tsx` for reuse. Replaced `CommentBlock` with `<CommentThread>`. Removed `CommentBlock` function. Updated `ItemDetailModal` tests (threaded rendering, avatar initials, collapse toggle). Updated all test mock files with new fields.
- **Task 6:** Both `npm run build` pass with zero TypeScript errors. Full test suites pass: 332 backend, 148 frontend (480 total, 0 failures).

### File List

**Backend (modified):**
- `backend/src/types/linear-entities.types.ts` — Added `userAvatarUrl` and `parentId` to `CommentDto`
- `backend/src/types/linear-entities.schemas.ts` — Added `userAvatarUrl` and `parentId` to `commentDtoSchema`
- `backend/src/services/sync/linear-transformers.ts` — Updated `toCommentDto` (parallel parent/user resolution), `toCommentDtos` (ascending sort + controlled concurrency)
- `backend/src/services/sync/linear-transformers.test.ts` — Updated mock, added 5 new tests (parentId, avatarUrl, sorting)
- `backend/src/services/backlog/backlog.service.test.ts` — Updated mock CommentDto with new fields
- `backend/src/routes/backlog.routes.test.ts` — Updated mock CommentDto with new fields

**Frontend (modified):**
- `frontend/src/features/backlog/types/backlog.types.ts` — Added `userAvatarUrl` and `parentId` to `BacklogItemComment`
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — Switched comment rendering to `<CommentThread>` and reused shared `MarkdownContent`
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — Updated mock, added 3 new tests (threading, avatar, toggle)
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — Updated mock comments with `parentId` and `userAvatarUrl` fields
- `frontend/src/features/backlog/hooks/use-backlog-item-detail.test.tsx` — Updated mock comments with `parentId` and `userAvatarUrl` fields

**Frontend (new):**
- `frontend/src/features/backlog/components/comment-thread.tsx` — New threaded comment display component
- `frontend/src/features/backlog/components/comment-thread.test.tsx` — 15 unit tests
- `frontend/src/features/backlog/components/markdown-content.tsx` — Shared markdown renderer (extracted to avoid circular imports)

**Other (modified):**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated 5-2 status to in-progress → review

### Change Log

- **2026-02-10:** Story 5.2 implemented — Added threaded comment display with avatar support, collapse/expand for long threads, chronological sorting. All ACs satisfied, 480 tests passing, zero build errors.
- **2026-02-10:** Code review fixes — Extracted shared `MarkdownContent` to avoid circular imports, hardened backend comment transformation against deleted-user relation failures, added controlled concurrency for comment DTO conversion, and handled orphan replies in the threaded UI. Backend + frontend tests and builds verified.

## Senior Developer Review (AI)

### Review Summary (2026-02-10)

- Fixed a **frontend circular import** between `comment-thread.tsx` and `item-detail-modal.tsx` by extracting shared markdown rendering into `markdown-content.tsx`.
- Hardened backend comment transformation to **gracefully handle deleted users** where `comment.user` rejects.
- Added **controlled concurrency** to `toCommentDtos` to reduce risk of rate limiting on issues with large comment sets.
- Prevented **orphan replies** (missing parent comment) from being silently dropped by rendering them as top-level comments.
- Tightened validation: `userAvatarUrl` must be a valid URL when present.

### Verification

- `backend`: `npm test` + `npm run build` ✅
- `frontend`: `npm test` + `npm run build` ✅
