# Story 15.1: Add "/" Keyboard Shortcut to Focus Search Bar

Linear Issue ID: VIX-434
Status: ready-for-dev

## Story

As a power user,
I want to press `/` from anywhere on the backlog page to instantly focus the search bar,
so that I can start searching without reaching for the mouse.

## Acceptance Criteria

1. **Given** I am on the backlog page with no input focused, **When** I press `/`, **Then** the search input receives focus and I can start typing immediately.
2. **Given** I am already typing in the search bar or another input field, **When** I press `/`, **Then** it types a literal `/` character (no hijacking).
3. **Given** I am in the item detail modal, **When** I press `/`, **Then** it does not trigger (modal has its own focus context).
4. **Given** I press `Escape` while the search bar is focused, **When** the event fires, **Then** the search bar loses focus.
5. A visual hint appears near the search bar (e.g., a subtle `/` badge) indicating the shortcut is available.
6. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Add global keyboard listener for `/` (AC: #1, #2, #3)
  - [ ] In `KeywordSearch` component (or a new `useSearchShortcut` hook), add a `keydown` event listener
  - [ ] Check `event.key === '/'` AND `document.activeElement` is NOT an input/textarea/contenteditable/select
  - [ ] Check no modal is currently open (check for modal overlay or use a context flag)
  - [ ] Call `event.preventDefault()` and focus the search input via ref
  - [ ] Clean up listener on unmount
- [ ] Task 2: Add `Escape` to blur search (AC: #4)
  - [ ] In `KeywordSearch`, add `onKeyDown` handler on the input
  - [ ] If `event.key === 'Escape'`, call `inputRef.current?.blur()`
- [ ] Task 3: Add visual shortcut hint (AC: #5)
  - [ ] Add a subtle `kbd` badge (e.g., `<Kbd>/</Kbd>`) inside or next to the search input placeholder area
  - [ ] Use Chakra's `Kbd` component or a small styled `<span>` with monospace font
  - [ ] Hide the hint when the search input is focused (it's obvious at that point)
- [ ] Task 4: Update keyboard shortcuts documentation (AC: #5)
  - [ ] Update `docs/keyboard-shortcuts.md` with the new `/` shortcut
- [ ] Task 5: Write tests (AC: #6)
  - [ ] Create or update `frontend/src/features/backlog/components/keyword-search.test.tsx`
  - [ ] Test: pressing `/` when no input focused calls focus on search input
  - [ ] Test: pressing `/` when an input is focused does NOT steal focus
  - [ ] Test: pressing `Escape` while search focused blurs the input
  - [ ] Test: shortcut hint badge is visible when search is not focused
  - [ ] Test: shortcut hint badge is hidden when search is focused

## Dev Notes

### Architecture Compliance

- **Component location**: Modify `frontend/src/features/backlog/components/keyword-search.tsx` — the existing search component
- **No new dependencies**: Uses standard DOM `addEventListener` and React `useEffect`/`useRef`
- **Accessibility**: This follows established patterns (GitHub, Slack, Linear all use `/` for search focus). Documented in `docs/keyboard-shortcuts.md`.

### Critical Implementation Details

- **KeywordSearch component**: Located at `frontend/src/features/backlog/components/keyword-search.tsx`. It already has a search input — add a `ref` to it (or use an existing ref) for programmatic focus.
- **Active element check**: Use `const active = document.activeElement; const tag = active?.tagName?.toLowerCase();` and check against `['input', 'textarea', 'select']`. Also check `active?.getAttribute('contenteditable') === 'true'`.
- **Modal detection**: Check if a modal overlay exists in the DOM: `document.querySelector('[data-scope="dialog"]')` or check for Chakra's dialog presence. Alternatively, scope the listener to only fire when `BacklogPage` is the active view.
- **Event listener scope**: Add listener to `document` in a `useEffect` within `KeywordSearch` or `BacklogList`. Remove on cleanup.
- **Escape handling**: The search input likely already handles some keyboard events. Add `onKeyDown` with Escape check — don't override existing handlers.
- **Kbd visual hint**: Chakra UI v3 has `Kbd` component. Style it as a small, muted badge: `<Kbd fontSize="xs" opacity={0.5}>/</Kbd>`. Position it at the right end of the search input or as part of the placeholder.

### Existing Code to Reuse

- `KeywordSearch` at `frontend/src/features/backlog/components/keyword-search.tsx` — main component to modify
- `docs/keyboard-shortcuts.md` — existing keyboard shortcut documentation
- Chakra `Kbd` component — available in `@chakra-ui/react`
- Existing keyboard navigation patterns from Story 11.1

### Anti-Patterns to Avoid

- Do NOT add a global listener that fires inside modals — check for active modal/dialog
- Do NOT hijack `/` when the user is typing in ANY input — always check `document.activeElement`
- Do NOT use `keypress` event — use `keydown` (keypress is deprecated)
- Do NOT use `push` history when focusing search — this is just a focus action, not navigation
- Do NOT add a separate component for this — extend the existing `KeywordSearch`

### Project Structure Notes

**Modified files:**
- `frontend/src/features/backlog/components/keyword-search.tsx` (add shortcut listener, Escape blur, visual hint)
- `frontend/src/features/backlog/components/keyword-search.test.tsx` (add shortcut tests)
- `docs/keyboard-shortcuts.md` (document new shortcut)

### References

- [Source: frontend/src/features/backlog/components/keyword-search.tsx] — Existing search input component
- [Source: docs/keyboard-shortcuts.md] — Existing keyboard shortcut documentation
- [Source: _bmad-output/planning-artifacts/architecture.md] — Chakra UI v3, accessibility standards
- [Source: _bmad-output/implementation-artifacts/11-1-implement-keyboard-navigation.md] — Previous keyboard navigation patterns

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
