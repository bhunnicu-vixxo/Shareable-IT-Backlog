# Story 3.4: Implement Item Detail View

Linear Issue ID: VIX-343
Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to view detailed information for any backlog item,
so that I can understand the full context of an item.

## Acceptance Criteria

1. **Given** I am viewing the backlog list, **When** I click on an item, **Then** a detail view/modal opens showing full item information
2. **And** the detail view shows: title, description, status, priority, business unit (team), labels, assignee, dates, identifier, and comments
3. **And** the detail view is accessible via keyboard navigation (Tab, Enter, ESC to close)
4. **And** focus is trapped within the modal when open
5. **And** I can close the detail view and return to the list (ESC, overlay click, or close button)
6. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
7. **And** unit tests cover the detail modal, keyboard accessibility, and API integration

## Tasks / Subtasks

- [x] Task 1: Add backend GET /api/backlog-items/:id endpoint (AC: #1, #2)
  - [x] 1.1: Add `getBacklogItemById(issueId: string)` to `BacklogService` — use `linearClient.getIssueById` + `getIssueComments`, transform with `toBacklogItemDto` and `toCommentDtos`
  - [x] 1.2: Add `getBacklogItemById` handler to `backlog.controller.ts`
  - [x] 1.3: Add route `GET /api/backlog-items/:id` in `backlog.routes.ts`
  - [x] 1.4: Return 404 when issue not found (Linear returns null for non-existent)
  - [x] 1.5: Response shape: `{ item: BacklogItemDto, comments: CommentDto[] }` (matches `BacklogDetailResponse`)
- [x] Task 2: Create ItemDetailModal component (AC: #1, #2, #3, #4, #5)
  - [x] 2.1: Create `frontend/src/features/backlog/components/item-detail-modal.tsx` using Chakra UI Dialog/Modal
  - [x] 2.2: Display all BacklogItem fields: title, description, status, priority, teamName, labels, assigneeName, createdAt, updatedAt, dueDate, identifier, url
  - [x] 2.3: Display comments section (BacklogItemComment[]) with author, timestamp, body
  - [x] 2.4: Implement focus trap, ESC to close, close-on-overlay-click
  - [x] 2.5: Add loading and error states (404 handled gracefully)
- [x] Task 3: Wire click-to-open from BacklogList (AC: #1)
  - [x] 3.1: Add `onItemClick?: (item: BacklogItem) => void` to `BacklogItemCard` — make card clickable (cursor pointer, onClick)
  - [x] 3.2: Add `selectedItemId` state and `ItemDetailModal` to `BacklogList`
  - [x] 3.3: Create `useBacklogItemDetail(id)` hook using TanStack Query to fetch GET /api/backlog-items/:id
  - [x] 3.4: Fetch detail when modal opens (when selectedItemId is set)
- [x] Task 4: Keyboard accessibility (AC: #3, #4, #5)
  - [x] 4.1: Use Chakra UI Modal/Dialog (built-in focus trap)
  - [x] 4.2: Ensure close button and "Open in Linear" link are keyboard-focusable
  - [x] 4.3: Return focus to triggering card on close (Chakra `finalFocusRef` or similar)
- [x] Task 5: Testing and verification (AC: #6, #7)
  - [x] 5.1: Backend: Add tests for `getBacklogItemById`, 404 case, controller, route
  - [x] 5.2: Frontend: Add tests for ItemDetailModal (render, close, keyboard), BacklogItemCard onClick, BacklogList integration
  - [x] 5.3: Run `npm run build` in both backend and frontend
  - [x] 5.4: Run full test suite

## Dev Notes

### What's Already Done (from Stories 1.1–3.3)

| Capability | Story | File |
|---|---|---|
| BacklogItemCard component | 3.1 | `frontend/src/features/backlog/components/backlog-item-card.tsx` |
| BacklogList component | 3.1 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| StackRankBadge, StatusBadge, NewItemBadge | 3.2, 3.3 | `frontend/src/shared/components/ui/` |
| BacklogItem type + BacklogDetailResponse | 2.4 | `frontend/src/features/backlog/types/backlog.types.ts` |
| BacklogItemDto, CommentDto | 2.4 | `backend/src/types/linear-entities.types.ts` |
| toBacklogItemDto, toCommentDto, toCommentDtos | 2.4 | `backend/src/services/sync/linear-transformers.ts` |
| linearClient.getIssueById, getIssueComments | 2.x | `backend/src/services/sync/linear-client.service.ts` |

### What This Story Adds

1. **Backend:** GET /api/backlog-items/:id — fetches single issue + comments from Linear, returns `{ item, comments }`
2. **Frontend:** ItemDetailModal — Chakra UI Modal/Dialog displaying full item + comments
3. **Integration:** BacklogItemCard clickable → opens modal; BacklogList manages selectedItemId and modal state

### CRITICAL: Backend Implementation

**BacklogService.getBacklogItemById(issueId: string):**

```typescript
// In backlog.service.ts
async getBacklogItemById(issueId: string): Promise<{ item: BacklogItemDto; comments: CommentDto[] } | null> {
  const [issueResult, commentsResult] = await Promise.all([
    linearClient.getIssueById(issueId),
    linearClient.getIssueComments(issueId),
  ])
  if (!issueResult.data) return null
  const item = await toBacklogItemDto(issueResult.data)
  const comments = await toCommentDtos(commentsResult.data ?? [])
  return { item, comments }
}
```

**Controller:** Handle 404 when `getBacklogItemById` returns null. Response: `{ item, comments }`.

**Route:** `backlogRoutes.get('/backlog-items/:id', getBacklogItemById)`

**Note:** Use `issue.id` (Linear UUID) for the API — frontend receives items from list with `item.id`. Ensure `/api/backlog-items/:id` uses the same `id` format (Linear issue UUID).

### CRITICAL: Frontend Implementation

**Chakra UI v3 Modal/Dialog:**

- Use `Dialog` or `Modal` from `@chakra-ui/react` (v3). Check current Chakra exports: `DialogRoot`, `DialogContent`, `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogCloseTrigger`.
- If v3 uses different API, refer to [chakra-ui.com/modal](https://chakra-ui.com/modal) or `@chakra-ui/react` exports.
- Built-in: focus trap, ESC to close, overlay click to close. Use `returnFocusOnClose` or equivalent to return focus to the card that was clicked.

**useBacklogItemDetail hook:**

```typescript
// useBacklogItemDetail(id: string | null)
// When id is null, skip fetch. When id is set, fetch GET /api/backlog-items/${id}
// Use TanStack Query: useQuery with queryKey: ['backlog-item', id], enabled: !!id
```

**BacklogItemCard:**

- Add `onClick?: () => void` prop. Wrap content in `Box` or `Flex` with `onClick`, `cursor="pointer"`, `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space to activate).
- Or keep as `role="article"` and add wrapper/button for click. Ensure keyboard: card is focusable, Enter/Space opens detail.

**BacklogList:**

- State: `const [selectedItemId, setSelectedItemId] = useState<string | null>(null)`
- Pass `onItemClick={(item) => setSelectedItemId(item.id)}` to each card
- Render `<ItemDetailModal isOpen={!!selectedItemId} itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />`

### CRITICAL: "Updates" and "Notes" Scope

Epic 3.4 lists "updates, notes, comments". Current `BacklogItemDto` has no `updates` or `notes` fields. Linear Issue may have history/updates via separate API. **For this story:** Display all fields in `BacklogItem` + `comments`. If Linear exposes updates/notes in a straightforward way, include them; otherwise, document as future enhancement (Epic 5). Prioritize: title, description, status, priority, team, labels, assignee, dates, identifier, url, comments.

### Architecture Compliance

**From architecture.md:**

- Component-based frontend ✅
- Feature components in `features/backlog/components/` ✅
- Backend: DTOs in `types/`, transformers in `services/sync/` ✅
- REST: GET `/api/backlog-items/:id` ✅
- Use theme tokens — no hardcoded hex ✅

**From project-context.md:**

- `camelCase` for JSON fields ✅
- Immutable state updates ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 3.1 Backlog List View | Depends on | BacklogList, BacklogItemCard — add click handler |
| 3.2 Priority Visualization | Depends on | StackRankBadge reused in modal header |
| 3.3 New Item Flagging | Depends on | BacklogItemCard already has isNew — may show in modal |
| 5.1 Updates and Notes | Related | Richer updates/notes display; 3.4 uses available fields |
| 5.2 Comments | Related | 3.4 displays comments; 5.2 may enhance formatting |
| 5.3 Deleted Items | Related | 404 from GET :id when item deleted — show friendly message |

### Project Structure After This Story

```
backend/src/
├── routes/
│   └── backlog.routes.ts          (MODIFIED — add GET /backlog-items/:id)
├── controllers/
│   └── backlog.controller.ts     (MODIFIED — add getBacklogItemById handler)
├── services/
│   └── backlog/
│       └── backlog.service.ts    (MODIFIED — add getBacklogItemById)

frontend/src/
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── backlog-item-card.tsx    (MODIFIED — onClick, cursor pointer)
│       │   ├── backlog-list.tsx          (MODIFIED — modal state, ItemDetailModal)
│       │   ├── item-detail-modal.tsx     (NEW)
│       │   └── *.test.tsx                (MODIFIED — new tests)
│       ├── hooks/
│       │   ├── use-backlog-item-detail.ts (NEW)
│       │   └── use-backlog-item-detail.test.ts (NEW)
│       └── types/
│           └── backlog.types.ts   (unchanged — BacklogDetailResponse exists)
```

### What NOT To Do

- **Do NOT** create a new DetailDrawer if Modal satisfies AC — use Modal/Dialog per epics
- **Do NOT** fetch detail on list load — fetch only when user opens modal (lazy load)
- **Do NOT** use `/api/backlog-items?filter=id` — use dedicated GET :id endpoint
- **Do NOT** hardcode hex colors — use theme tokens (brand.green, brand.gray, etc.)
- **Do NOT** skip focus trap or ESC handling — required for accessibility
- **Do NOT** mutate the items array when opening modal — use React state only

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 3.4] — Story requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#API Design] — REST endpoints, GET :id pattern
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility] — Keyboard nav, focus trap, WCAG
- [Source: backend/src/services/sync/linear-client.service.ts] — getIssueById, getIssueComments
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogDetailResponse
- [Source: _bmad-output/implementation-artifacts/3-3-implement-new-item-flagging.md] — Previous story, BacklogItemCard patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Backend: Added GET /api/backlog-items/:id endpoint returning { item, comments }. Service uses getIssueById + getIssueComments, transforms with toBacklogItemDto and toCommentDtos. Returns 404 when issue not found.
- Frontend: ItemDetailModal uses Chakra UI Dialog.Root with controlled open state, focus trap, ESC/overlay close, return focus to triggering card. useBacklogItemDetail hook fetches detail when itemId is set.
- BacklogItemCard: Added optional onClick prop; when provided, card is role="button", tabIndex=0, keyboard-activatable (Enter/Space).
- BacklogList: selectedItemId state, ItemDetailModal, click handler wiring. Card refs for focus return on modal close.
- Tests: Backend tests for getBacklogItemById, controller 200/404/400, service null/empty comments. Frontend tests for BacklogItemCard onClick/Enter/Space, BacklogList modal integration, useBacklogItemDetail, and dedicated ItemDetailModal unit tests.
- Dependencies: Added `react-markdown` ^10.1.0 and `remark-breaks` ^4.0.0 to frontend for rendering item descriptions and comments as Markdown.
- Backend types: Added CommentDto to linear-entities.types.ts and commentDtoSchema to linear-entities.schemas.ts. Updated toCommentDto/toCommentDtos in linear-transformers.ts.
- Frontend types: Added BacklogItemComment and BacklogDetailResponse to backlog.types.ts. Added SHOW_OPEN_IN_LINEAR constant to constants.ts.
- Review fixes: Extracted shared STATUS_COLORS to status-colors.ts (DRY). Extracted formatDateTime/formatDateOnly to utils/formatters.ts. Added UUID validation for :id route parameter. Fixed jsdom resolution for npm workspaces (root devDependency). Added dedicated item-detail-modal.test.tsx.

### File List

- backend/src/services/backlog/backlog.service.ts (modified)
- backend/src/services/backlog/backlog.service.test.ts (modified)
- backend/src/controllers/backlog.controller.ts (modified)
- backend/src/routes/backlog.routes.ts (modified)
- backend/src/routes/backlog.routes.test.ts (modified)
- backend/src/services/sync/linear-transformers.ts (modified — added toCommentDto, toCommentDtos)
- backend/src/services/sync/linear-transformers.test.ts (modified — added comment transformer tests, Zod schema tests)
- backend/src/types/linear-entities.types.ts (modified — added CommentDto)
- backend/src/types/linear-entities.schemas.ts (modified — added commentDtoSchema)
- frontend/package.json (modified — added react-markdown, remark-breaks)
- frontend/src/features/backlog/components/item-detail-modal.tsx (new)
- frontend/src/features/backlog/components/item-detail-modal.test.tsx (new — review fix)
- frontend/src/features/backlog/components/backlog-item-card.tsx (modified)
- frontend/src/features/backlog/components/backlog-item-card.test.tsx (modified)
- frontend/src/features/backlog/components/backlog-list.tsx (modified)
- frontend/src/features/backlog/components/backlog-list.test.tsx (modified)
- frontend/src/features/backlog/hooks/use-backlog-item-detail.ts (new)
- frontend/src/features/backlog/hooks/use-backlog-item-detail.test.tsx (new)
- frontend/src/features/backlog/types/backlog.types.ts (modified — added BacklogItemComment, BacklogDetailResponse)
- frontend/src/features/backlog/utils/status-colors.ts (new — review fix, extracted from card + modal)
- frontend/src/utils/constants.ts (modified — added SHOW_OPEN_IN_LINEAR)
- frontend/src/utils/formatters.ts (new — review fix, shared date formatters)
- frontend/vite.config.ts (modified — vitest config)
- package.json (modified — added jsdom to root devDependencies for workspace resolution)
