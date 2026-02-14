# Story 13.2: Make Issue Identifiers Clickable Hyperlinks for IT/Admin Users

Linear Issue ID: VIX-426
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an IT or Admin user,
I want issue identifiers (e.g., VIX-265) to be clickable links to Linear,
So that I can quickly navigate to the full Linear issue for context.

## Acceptance Criteria

1. **IT/Admin see clickable identifiers:** In the backlog card and item detail modal, issue identifiers (e.g., VIX-265) render as clickable hyperlinks for users with `isIT` or `isAdmin` roles.
2. **Links open Linear in new tab:** Clicking the identifier opens the corresponding Linear issue URL (`item.url`) in a new browser tab (`target="_blank"`, `rel="noopener noreferrer"`).
3. **Regular users see plain text:** Non-IT, non-Admin users continue to see the identifier as plain text — no change to their experience.
4. **No new API calls:** Links use the existing `item.url` field already present on `BacklogItem` — no additional API endpoints needed.
5. **Subtle hover styling:** Hover state is visually clear (e.g., underline, slight color change) but does not disrupt the layout or spacing.
6. **"Open in Linear" footer link also role-gated:** The existing `SHOW_OPEN_IN_LINEAR` feature-flag gate in the item detail modal footer is replaced with a role-based check (`isIT || isAdmin`), so the footer "Open in Linear →" link also respects user roles.

## Tasks / Subtasks

- [x] Task 1: Update backlog-item-card identifier rendering (AC: #1, #2, #3, #4, #5)
  - [x] 1.1: Import `useAuth` hook and Chakra `Link` component in `backlog-item-card.tsx`
  - [x] 1.2: Get `isIT` and `isAdmin` from `useAuth()` inside the component
  - [x] 1.3: Replace the `<Text>` at lines 145-148 with conditional rendering: `<Link>` for IT/Admin, `<Text>` for regular users
  - [x] 1.4: Apply `mono-id` class and matching styles to both `<Link>` and `<Text>` variants
  - [x] 1.5: Add `target="_blank"` and `rel="noopener noreferrer"` to the Link
  - [x] 1.6: Add subtle hover styles (`textDecoration: 'underline'`, slight opacity or color shift)
- [x] Task 2: Update item-detail-modal header identifier rendering (AC: #1, #2, #3, #4, #5)
  - [x] 2.1: Import `useAuth` hook in `item-detail-modal.tsx` (if not already imported)
  - [x] 2.2: Get `isIT` and `isAdmin` from `useAuth()` inside the component
  - [x] 2.3: Replace the header `<Text>` at lines 191-194 with conditional rendering: `<Link>` for IT/Admin, `<Text>` for regular users
  - [x] 2.4: Apply same `mono-id` styling and hover behavior as the card
- [x] Task 3: Replace SHOW_OPEN_IN_LINEAR feature flag with role check (AC: #6)
  - [x] 3.1: In `item-detail-modal.tsx`, replace `SHOW_OPEN_IN_LINEAR` condition (lines 233-244) with `(isIT || isAdmin)` check
  - [x] 3.2: Remove the `SHOW_OPEN_IN_LINEAR` constant/import if it is no longer used anywhere
  - [x] 3.3: Verify the "Open in Linear →" footer link still renders correctly for IT/Admin and is hidden for regular users
- [x] Task 4: Tests (AC: #1, #2, #3, #5)
  - [x] 4.1: Add tests for `backlog-item-card` — IT user sees clickable link with correct href
  - [x] 4.2: Add tests for `backlog-item-card` — Admin user sees clickable link with correct href
  - [x] 4.3: Add tests for `backlog-item-card` — Regular user sees plain text, no link
  - [x] 4.4: Add tests for `item-detail-modal` — IT/Admin sees clickable identifier in header
  - [x] 4.5: Add tests for `item-detail-modal` — Regular user sees plain text identifier in header
  - [x] 4.6: Add tests for `item-detail-modal` — "Open in Linear" footer link shown for IT/Admin, hidden for regular users (no longer depends on env var)
  - [x] 4.7: Run full test suite to confirm zero regressions

## Dev Notes

### Architecture Compliance

- **Component pattern:** Conditional rendering based on role — use ternary or `&&` operator, not separate components
- **Auth hook:** `useAuth()` from `frontend/src/features/auth/hooks/use-auth.ts` already exposes `isIT: boolean` and `isAdmin: boolean`
- **Styling convention:** `mono-id` CSS class in `frontend/src/index.css` (lines 149-154) provides monospace font styling for identifiers
- **Link component:** Use Chakra UI `Link` component (not HTML `<a>`) for consistent styling
- **JSON API fields:** `BacklogItem.url` (camelCase) contains the Linear deep-link URL — no transformation needed

### Critical Implementation Details

- **Backlog card identifier location:** `frontend/src/features/backlog/components/backlog-item-card.tsx` lines 145-148 — currently `<Text fontSize="sm" color="fg.brandMuted" className="mono-id">{item.identifier}</Text>`
- **Item modal identifier location:** `frontend/src/features/backlog/components/item-detail-modal.tsx` lines 191-194 — same pattern as card
- **"Open in Linear" feature flag:** `item-detail-modal.tsx` lines 233-244 — currently gated by `SHOW_OPEN_IN_LINEAR` env var (`VITE_SHOW_OPEN_IN_LINEAR === 'true'`). This should be replaced with role check.
- **BacklogItem.url field:** Defined in `frontend/src/features/backlog/types/backlog.types.ts` line 50 — `url: string` with JSDoc `/** Deep-link URL to the issue in Linear */`
- **The card does NOT currently use `item.url`** — it only renders `item.identifier` as text. The URL is available but unused in the card.
- **useAuth() does NOT trigger additional API calls** — it reads from the cached TanStack Query session data

### Anti-Patterns to Avoid

- Do NOT create a new component for the clickable identifier — keep it inline with conditional rendering
- Do NOT add a new API endpoint for link URLs — `BacklogItem.url` already has the data
- Do NOT use React Context or useState for role checks — use `useAuth()` hook directly
- Do NOT create a feature flag for this — it's role-gated, not feature-flagged
- Do NOT change the visual weight of the identifier for regular users — their experience must be unchanged
- Do NOT add underline by default — only on hover, to keep the clean aesthetic
- Do NOT use `window.open()` — use `<Link>` with `target="_blank"` for proper accessibility

### Previous Story Intelligence (13-1)

From story 13.1 (completed):
- `isIT` field added to User type, useAuth() hook, backend session, and API response
- `requireIT()` middleware created at `backend/src/middleware/it.middleware.ts` — allows IT or Admin
- Admin UI shows IT role toggle with purple badge
- Migration `010_add-is-it-to-users.sql` added `is_it BOOLEAN NOT NULL DEFAULT FALSE`
- Pattern for role-conditional UI: check `isIT || isAdmin` from useAuth()
- All existing tests pass after 13-1 implementation

### Project Structure Notes

Files to modify:
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — add conditional Link rendering for identifier
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — add role-based rendering tests
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — add conditional Link rendering + replace feature flag
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — add role-based rendering tests

Files to potentially remove/clean up:
- Remove `SHOW_OPEN_IN_LINEAR` / `VITE_SHOW_OPEN_IN_LINEAR` references if no longer used elsewhere

No new files needed.

### References

- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx#L145-148] — Current identifier rendering
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx#L191-194] — Modal header identifier
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx#L233-244] — "Open in Linear" with feature flag
- [Source: frontend/src/features/backlog/types/backlog.types.ts#L50] — BacklogItem.url field
- [Source: frontend/src/features/auth/hooks/use-auth.ts#L94] — isIT derived boolean
- [Source: frontend/src/index.css#L149-154] — mono-id CSS class
- [Source: _bmad-output/implementation-artifacts/13-1-add-it-role-to-user-model.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- ✅ Task 1: Backlog card identifier now conditionally renders as `<Link>` for IT/Admin users (when `item.url` is present), `<Text>` for regular users (and fallback when URL is missing). Uses `useAuth()` hook, `mono-id` class on both variants, `target="_blank"` + `rel="noopener noreferrer"`, and subtle hover underline + color shift. `stopPropagation` on link click prevents card onClick from firing.
- ✅ Task 2: Item detail modal header identifier uses identical conditional rendering pattern with the same URL-present guard.
- ✅ Task 3: Replaced `SHOW_OPEN_IN_LINEAR` env-var feature flag with `isPrivileged` role check in modal footer. Removed `SHOW_OPEN_IN_LINEAR` constant from `constants.ts` and its import from `item-detail-modal.tsx` since no other source files reference it.
- ✅ Task 4: Added/updated tests covering IT/Admin link rendering, regular-user plain text, missing-URL fallback, mono-id class, link click isolation, and footer link visibility + external-link attributes. Full suite: 666 tests pass, 0 regressions.

### File List

- `frontend/src/features/backlog/components/backlog-item-card.tsx` — Modified: added conditional Link/Text rendering for identifier based on user role
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — Modified: added 5 role-based rendering tests + useAuth mock
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — Modified: added conditional Link/Text for header identifier + replaced SHOW_OPEN_IN_LINEAR with role check in footer
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — Modified: added 4 role-based rendering tests + useAuth mock
- `frontend/src/utils/constants.ts` — Modified: removed SHOW_OPEN_IN_LINEAR constant (no longer used)
- `frontend/.env.example` — Modified: removed `VITE_SHOW_OPEN_IN_LINEAR` (no longer used)
- `docs/deployment/environment-variables.md` — Modified: removed `VITE_SHOW_OPEN_IN_LINEAR` documentation (no longer used)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Modified: updated 13-2 status to in-progress → review → done
- `_bmad-output/implementation-artifacts/13-2-make-issue-identifiers-clickable-for-privileged-users.md` — Modified: updated tasks, Dev Agent Record, File List, Change Log, Status

### Change Log

- **2026-02-14:** Implemented role-based clickable identifiers for IT/Admin users in backlog card and item detail modal. Replaced SHOW_OPEN_IN_LINEAR feature flag with role-based check. Added 9 new tests. All 664 tests pass.
- **2026-02-14:** Code review follow-ups: guard link rendering when URL is missing, assert external link attributes in tests, and remove stale `VITE_SHOW_OPEN_IN_LINEAR` docs/env references. All 666 tests pass.
