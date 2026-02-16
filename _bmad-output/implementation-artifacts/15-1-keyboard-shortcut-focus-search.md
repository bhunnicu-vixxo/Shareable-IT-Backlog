# Story 15.1: Add "/" Keyboard Shortcut to Focus Search Bar

Linear Issue ID: VIX-434
Status: done

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

- [x] Task 1: Add global keyboard listener for `/` (AC: #1, #2, #3)
  - [x] In `KeywordSearch` component (or a new `useSearchShortcut` hook), add a `keydown` event listener
  - [x] Check `event.key === '/'` AND `document.activeElement` is NOT an input/textarea/contenteditable/select
  - [x] Check no modal is currently open (check for modal overlay or use a context flag)
  - [x] Call `event.preventDefault()` and focus the search input via ref
  - [x] Clean up listener on unmount
- [x] Task 2: Add `Escape` to blur search (AC: #4)
  - [x] In `KeywordSearch`, add `onKeyDown` handler on the input
  - [x] If `event.key === 'Escape'`, call `inputRef.current?.blur()`
- [x] Task 3: Add visual shortcut hint (AC: #5)
  - [x] Add a subtle `kbd` badge (e.g., `<Kbd>/</Kbd>`) inside or next to the search input placeholder area
  - [x] Use Chakra's `Kbd` component or a small styled `<span>` with monospace font
  - [x] Hide the hint when the search input is focused (it's obvious at that point)
- [x] Task 4: Update keyboard shortcuts documentation (AC: #5)
  - [x] Update `docs/keyboard-shortcuts.md` with the new `/` shortcut
- [x] Task 5: Write tests (AC: #6)
  - [x] Create or update `frontend/src/features/backlog/components/keyword-search.test.tsx`
  - [x] Test: pressing `/` when no input focused calls focus on search input
  - [x] Test: pressing `/` when an input is focused does NOT steal focus
  - [x] Test: pressing `Escape` while search focused blurs the input
  - [x] Test: shortcut hint badge is visible when search is not focused
  - [x] Test: shortcut hint badge is hidden when search is focused

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
Claude claude-4.6-opus (via Cursor)

### Debug Log References
No debug issues encountered. All tests passed on first implementation attempt.

### Completion Notes List
- ✅ Task 1: Added global `keydown` listener in a `useEffect` hook within `KeywordSearch`. Checks `event.key === '/'`, guards against active inputs/textareas/selects/contenteditable elements, and checks for open Chakra Dialog via `document.querySelector('[data-scope="dialog"]')`. Calls `preventDefault()` and focuses the input via `useRef`. Cleans up listener on unmount.
- ✅ Task 2: Modified existing `onKeyDown` handler to always blur the input on Escape (not just clear). If value exists, calls `onClear()` first, then blurs. If no value, just blurs.
- ✅ Task 3: Added `Kbd` component from Chakra UI showing `/` hint badge positioned at right end of search input. Hidden when input is focused (via `isFocused` state) or when a search value is present.
- ✅ Task 4: Updated `docs/keyboard-shortcuts.md` with `/` shortcut in General Navigation table, also clarified Escape behavior.
- ✅ Task 5: Added 9 new tests (18 total): slash shortcut focus, no-hijack when input/textarea focused, no-trigger when modal open, Escape blur with/without value, hint badge visibility/hide/restore.
- ✅ Full test suite: 66 test files, 742 tests, all passing, zero regressions.
- ✅ Build: Both frontend (`tsc -b && vite build`) and backend (`tsc -b`) pass with zero TypeScript errors.

### Change Log
- 2026-02-16: Implemented "/" keyboard shortcut to focus search, Escape blur, visual Kbd hint, docs update, 9 new tests. All ACs satisfied.
- 2026-02-16: Senior dev review fixes — harden contenteditable detection, require dialog open-state for modal guard, hide visual hint from screen readers, ignore modified/repeat shortcuts; added tests; ignore unrelated Cursor/agent artifacts.

## Senior Developer Review (AI)

**Reviewer:** Rhunnicutt (AI)  
**Date:** 2026-02-16  
**Outcome:** Approved after fixes

### Fixes applied

- **Contenteditable hijack guard (AC #2)**: The `/` shortcut now detects `contenteditable` via `isContentEditable`, attribute presence (including `plaintext-only`), and `closest()` to handle nested editable nodes.
- **Modal guard (AC #3)**: The shortcut no longer blocks merely because dialog nodes exist; it only blocks when a Chakra/Ark dialog is actually open (`data-state="open"`).
- **Accessibility (AC #5)**: The visual `/` hint is now `aria-hidden` so screen readers don’t announce it as stray content.
- **Key handling**: Ignore modified shortcuts (Ctrl/Cmd/Alt) and key repeats to reduce collisions and accidental focus stealing.
- **Repo hygiene**: Added `.gitignore` entries for unrelated `.agents/`, `.cursor/docs/`, `.cursor/skills/` artifacts to prevent accidental inclusion in PRs.

### File List
- `frontend/src/features/backlog/components/keyword-search.tsx` (modified — added useRef, useEffect listener, Escape blur, Kbd hint, focus state tracking)
- `frontend/src/features/backlog/components/keyword-search.test.tsx` (modified — added 9 new tests for shortcut, escape blur, and hint badge)
- `docs/keyboard-shortcuts.md` (modified — added `/` shortcut entry)
- `_bmad-output/implementation-artifacts/15-1-keyboard-shortcut-focus-search.md` (modified — status, tasks, dev agent record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status ready-for-dev → review)
