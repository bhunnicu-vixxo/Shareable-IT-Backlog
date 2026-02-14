# Story 14.2: Add "Copy Link" Button to Backlog Items

Linear Issue ID: VIX-433
Status: ready-for-dev

## Story

As a business user,
I want a one-click button to copy a direct link to a specific backlog item,
so that I can quickly share it in Slack, email, or meetings without asking others to search for it by identifier.

## Acceptance Criteria

1. **Given** I am viewing the backlog list, **When** I hover over or focus on an item, **Then** I see a "Copy link" icon button.
2. **Given** I am viewing an item's detail modal, **When** I look at the modal header, **Then** I see a "Copy link" button.
3. **Given** I click the "Copy link" button, **When** the clipboard write succeeds, **Then** a brief toast confirms "Link copied!"
4. **Given** a colleague opens the copied link, **When** they have access to the app, **Then** they are taken directly to that item's detail modal.
5. The button must be keyboard accessible (focusable, activatable with Enter/Space).
6. The button must use the existing Lucide icon style (`Link` or `Copy` icon).
7. **Given** the clipboard API is unavailable, **When** I click "Copy link," **Then** a fallback is used or an error toast is shown.
8. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Add item deep-link route support (AC: #4)
  - [ ] Add query parameter support to the backlog page route: `?item={identifier}` (e.g., `?item=VIX-338`)
  - [ ] In `BacklogPage` or `BacklogList`, on mount check for `item` query param
  - [ ] If `item` param exists, auto-open the `ItemDetailModal` for that identifier
  - [ ] Handle invalid identifiers gracefully (item not found → show toast or ignore)
- [ ] Task 2: Create `CopyLinkButton` component (AC: #1, #2, #3, #5, #6, #7)
  - [ ] Create `frontend/src/features/backlog/components/copy-link-button.tsx`
  - [ ] Accept props: `identifier: string` (the VIX-XXX identifier), `variant?: 'icon' | 'button'`
  - [ ] Build link: `${window.location.origin}/backlog?item=${identifier}`
  - [ ] Use `navigator.clipboard.writeText()` with try/catch
  - [ ] On success: show Chakra `toaster` toast — "Link copied!" (2s auto-dismiss)
  - [ ] On failure: show error toast — "Could not copy link"
  - [ ] Use Lucide `Link` icon, matching existing icon button sizing
  - [ ] ARIA label: "Copy link to {identifier}"
- [ ] Task 3: Integrate into `BacklogItemCard` (AC: #1)
  - [ ] Add `CopyLinkButton` to `BacklogItemCard`, visible on hover/focus
  - [ ] Position in the card action area (alongside existing actions if any)
  - [ ] Use `variant="icon"` for compact list display
- [ ] Task 4: Integrate into `ItemDetailModal` (AC: #2)
  - [ ] Add `CopyLinkButton` to the modal header, next to the title/identifier
  - [ ] Use `variant="button"` or `variant="icon"` depending on header space
- [ ] Task 5: Write tests (AC: #8)
  - [ ] Create `frontend/src/features/backlog/components/copy-link-button.test.tsx`
  - [ ] Test: renders link icon button
  - [ ] Test: has correct ARIA label
  - [ ] Test: calls navigator.clipboard.writeText with correct URL
  - [ ] Test: shows success toast on clipboard write
  - [ ] Test: shows error toast on clipboard failure
  - [ ] Update `backlog-list.test.tsx` or `backlog-page.test.tsx`: test that `?item=VIX-338` opens detail modal

## Dev Notes

### Architecture Compliance

- **Component location**: `frontend/src/features/backlog/components/copy-link-button.tsx` — follows feature-based component organization
- **Chakra UI v3**: Use `IconButton` from Chakra for the button, `toaster` from `@chakra-ui/react` for toast notifications
- **Deep linking**: Pairs with Story 14.1 (URL filter state). If 14.1 is done first, the `?item=` param integrates into the existing `useSearchParams` flow. If 14.2 is done first, add standalone URL param handling.
- **No backend changes**: Clipboard API is browser-only. Deep link resolution happens client-side.

### Critical Implementation Details

- **Clipboard API**: `navigator.clipboard.writeText()` returns a Promise. It requires HTTPS or localhost. Wrap in try/catch for environments where it's unavailable.
- **Link format**: Use `?item=VIX-338` query parameter approach (not a separate route like `/backlog/VIX-338`). This keeps the SPA routing simple — the backlog page reads the param and opens the modal.
- **Toast pattern**: The project uses Chakra UI v3 `toaster` (not `useToast` from v2). Pattern: `toaster.create({ title: "Link copied!", type: "success", duration: 2000 })`.
- **Hover reveal**: On `BacklogItemCard`, show the copy button on hover using CSS `opacity: 0` → `opacity: 1` on parent hover. Keep it always visible on focus (for keyboard users).
- **ItemDetailModal**: Located at `frontend/src/features/backlog/components/item-detail-modal.tsx`. The modal receives the full `BacklogItem` object. Add `CopyLinkButton` in the header area near the identifier display.
- **Lucide icons**: Project uses `lucide-react`. Import `Link` or `LinkIcon` from `lucide-react`.

### Existing Code to Reuse

- `ItemDetailModal` at `frontend/src/features/backlog/components/item-detail-modal.tsx` — modal header where button goes
- `BacklogItemCard` at `frontend/src/features/backlog/components/backlog-item-card.tsx` — card where hover button goes
- Chakra `IconButton` component — already used in other components
- Lucide icon library — already installed (`lucide-react`)
- Chakra `toaster` — check existing usage for toast pattern consistency
- `BacklogItem.identifier` field — the VIX-XXX string to use in URLs

### Anti-Patterns to Avoid

- Do NOT create a new route for individual items (`/backlog/VIX-338`) — use query parameter approach (`?item=VIX-338`)
- Do NOT use `document.execCommand('copy')` — it's deprecated; use `navigator.clipboard.writeText()` with proper error handling
- Do NOT show the copy button permanently on every card — use hover/focus reveal for clean UX
- Do NOT hardcode the base URL — use `window.location.origin` to build the full link
- Do NOT skip the error handling on clipboard write — some browsers restrict clipboard access

### Project Structure Notes

**New files:**
- `frontend/src/features/backlog/components/copy-link-button.tsx`
- `frontend/src/features/backlog/components/copy-link-button.test.tsx`

**Modified files:**
- `frontend/src/features/backlog/components/backlog-item-card.tsx` (add CopyLinkButton)
- `frontend/src/features/backlog/components/item-detail-modal.tsx` (add CopyLinkButton in header)
- `frontend/src/features/backlog/components/backlog-page.tsx` or `backlog-list.tsx` (handle `?item=` param)

### References

- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — Card component, action area for hover button
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Modal header, identifier display
- [Source: frontend/src/features/backlog/components/backlog-page.tsx] — Page component, potential location for item param handling
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem.identifier type
- [Source: _bmad-output/planning-artifacts/architecture.md] — Chakra UI v3, Lucide icons, feature-based organization

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
