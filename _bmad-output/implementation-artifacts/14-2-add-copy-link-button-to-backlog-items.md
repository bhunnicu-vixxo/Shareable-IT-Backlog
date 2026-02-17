# Story 14.2: Add "Copy Link" Button to Backlog Items

Linear Issue ID: VIX-433
Status: done

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

- [x] Task 1: Add item deep-link route support (AC: #4)
  - [x] Add query parameter support to the backlog page route: `?item={identifier}` (e.g., `?item=VIX-338`)
  - [x] In `BacklogPage` or `BacklogList`, on mount check for `item` query param
  - [x] If `item` param exists, auto-open the `ItemDetailModal` for that identifier
  - [x] Handle invalid identifiers gracefully (item not found → show toast or ignore)
- [x] Task 2: Create `CopyLinkButton` component (AC: #1, #2, #3, #5, #6, #7)
  - [x] Create `frontend/src/features/backlog/components/copy-link-button.tsx`
  - [x] Accept props: `identifier: string` (the VIX-XXX identifier), `variant?: 'icon' | 'button'`
  - [x] Build link: `${window.location.origin}/backlog?item=${identifier}`
  - [x] Use `navigator.clipboard.writeText()` with try/catch
  - [x] On success: show Chakra `toaster` toast — "Link copied!" (2s auto-dismiss)
  - [x] On failure: show error toast — "Could not copy link"
  - [x] Use Lucide `Link` icon, matching existing icon button sizing
  - [x] ARIA label: "Copy link to {identifier}"
- [x] Task 3: Integrate into `BacklogItemCard` (AC: #1)
  - [x] Add `CopyLinkButton` to `BacklogItemCard`, visible on hover/focus
  - [x] Position in the card action area (alongside existing actions if any)
  - [x] Use `variant="icon"` for compact list display
- [x] Task 4: Integrate into `ItemDetailModal` (AC: #2)
  - [x] Add `CopyLinkButton` to the modal header, next to the title/identifier
  - [x] Use `variant="button"` or `variant="icon"` depending on header space
- [x] Task 5: Write tests (AC: #8)
  - [x] Create `frontend/src/features/backlog/components/copy-link-button.test.tsx`
  - [x] Test: renders link icon button
  - [x] Test: has correct ARIA label
  - [x] Test: calls navigator.clipboard.writeText with correct URL
  - [x] Test: shows success toast on clipboard write
  - [x] Test: shows error toast on clipboard failure
  - [x] Update `backlog-list.test.tsx` or `backlog-page.test.tsx`: test that `?item=VIX-338` opens detail modal

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

Claude claude-4.6-opus

### Debug Log References

- Fixed nested-interactive a11y violation by moving CopyLinkButton outside the card's `role="button"` Flex, positioned absolutely as a sibling
- Fixed toast test approach: spy on `toaster.create` instead of checking DOM (Toaster component not in test Provider)
- Fixed `useFilterParams` to preserve `?item=` query param when syncing filter state to URL
- Extracted `copyToClipboard` and `buildItemLink` into separate `utils/clipboard.ts` for clean module-level mocking in tests

### Completion Notes List

- **Task 1**: Deep-link support via `?item=VIX-XXX` query parameter. When the backlog page loads with this param, the matching item's detail modal auto-opens. Invalid identifiers are silently ignored. The param is preserved (so refresh retains the deep-link and filter URL readability is not broken by re-encoding).
- **Task 2**: Created `CopyLinkButton` component using Chakra `IconButton` (list) + Chakra `Button` (modal header) + Lucide `Link` icon. Set up global toaster infrastructure (`createToaster` from Chakra v3) with `Toaster` component rendered in `main.tsx`. Clipboard utility extracted to `utils/clipboard.ts` and now respects Vite `BASE_URL` for subpath deployments.
- **Task 3**: Integrated into `BacklogItemCard` with hover/focus reveal. Button is positioned absolutely outside the card's `role="button"` element to avoid nested-interactive a11y violation. Uses CSS opacity transition on parent `.card-wrapper` hover and `_focusWithin` for keyboard users.
- **Task 4**: Integrated into `ItemDetailModal` header, positioned in the metadata row next to the identifier badge. Always visible (no hover reveal needed since modal is already focused).
- **Task 5**: 9 unit tests for CopyLinkButton (render, ARIA, clipboard mock, success/error toast spy, keyboard Enter/Space, URL building). 2 integration tests in backlog-list for deep-link (match opens modal, non-match does not). All 775 tests pass.
- **Build**: `npm run build` passes with zero TS errors for both frontend and backend.

### File List

**New files:**
- `frontend/src/components/ui/toaster.tsx` — Chakra v3 toaster setup (createToaster + Toaster component)
- `frontend/src/features/backlog/components/copy-link-button.tsx` — CopyLinkButton component
- `frontend/src/features/backlog/components/copy-link-button.test.tsx` — 9 tests for CopyLinkButton
- `frontend/src/features/backlog/utils/clipboard.ts` — copyToClipboard + buildItemLink utilities

**Modified files:**
- `frontend/src/main.tsx` — Added `<Toaster />` to app render tree
- `frontend/src/features/backlog/components/backlog-list.tsx` — Added deep-link `?item=` param handling with useSearchParams
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — Added 2 deep-link integration tests
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — Added CopyLinkButton with hover/focus reveal, wrapped card in positioned container for a11y
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — Added CopyLinkButton in modal header
- `frontend/src/features/backlog/hooks/use-filter-params.ts` — Added `item` param key, preserve `?item=` param during filter URL sync
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status
- `_bmad-output/implementation-artifacts/14-2-add-copy-link-button-to-backlog-items.md` — Updated story file

## Change Log

- 2026-02-17: Implemented story 14.2 — Copy link button + deep-link support for backlog items
- 2026-02-17: Senior developer review fixes — focus reveal on card, modal text button variant, persistent deep-link URL, BASE_URL-safe link building, toast key stability

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-17_

- Fixed **AC #1/#5**: Copy link button is now revealed on **keyboard focus** (not just hover) in `BacklogItemCard`.
- Fixed **AC #2**: Modal header now shows a true **Copy link** button variant (text + icon), not only an icon.
- Kept `?item=` in the URL for deep links to remain persistent across refresh and to avoid re-encoding other query params.
- Hardened `buildItemLink()` to respect Vite `BASE_URL` for subpath deployments.
- Improved toast rendering stability by adding a `key` to each rendered toast root.

**Verification**
- `npm -C frontend test`
- `npm -C frontend run build`
- `npm -C backend run build`
