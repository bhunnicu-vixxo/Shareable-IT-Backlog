# Story 14.1: Shareable URL for Filtered Backlog Views

Linear Issue ID: VIX-432
Status: ready-for-dev

## Story

As a business user,
I want the current filter, sort, and search state to be reflected in the URL,
so that I can share a link to a specific backlog view with a colleague or bookmark a view I use frequently.

## Acceptance Criteria

1. **Given** I apply one or more label filters, **When** I look at the URL bar, **Then** the URL query parameters reflect the selected labels (e.g., `?labels=Siebel,Dynamics`).
2. **Given** I apply a sort option, **When** I look at the URL bar, **Then** the URL includes the sort field and direction (e.g., `&sort=priority&dir=asc`).
3. **Given** I type a search term, **When** I look at the URL bar, **Then** the URL includes the search term (e.g., `&q=migration`).
4. **Given** I toggle "New items only," **When** I look at the URL bar, **Then** the URL includes that state (e.g., `&new=1`).
5. **Given** I toggle "Hide done items," **When** I look at the URL bar, **Then** the URL includes that state (e.g., `&hideDone=1`).
6. **Given** I open a URL with filter parameters, **When** the page loads, **Then** the filters/sort/search are applied automatically from the URL.
7. **Given** I copy the URL and send it to a colleague, **When** they open the link (with access), **Then** they see the same filtered view.
8. URL parameters must be human-readable (not encoded as opaque blobs).
9. Clearing all filters returns the URL to the base path with no query parameters.
10. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Create `useFilterParams` custom hook (AC: #1, #2, #3, #4, #5, #6, #8, #9)
  - [ ] Create `frontend/src/features/backlog/hooks/use-filter-params.ts`
  - [ ] Use React Router v7's `useSearchParams` hook for bidirectional URL sync
  - [ ] Define parameter mapping: `labels` (comma-separated), `sort`, `dir`, `q`, `new`, `hideDone`
  - [ ] Parse URL params on mount → return initial filter state
  - [ ] Provide setter functions that update URL with `replace` (not `push`) to avoid history pollution
  - [ ] Clear empty/default values from URL (no `?q=&labels=` clutter)
  - [ ] Return typed state object matching `BacklogList` filter state shape
- [ ] Task 2: Integrate `useFilterParams` into `BacklogList` (AC: #1-#9)
  - [ ] Replace standalone `useState` calls for `selectedLabels`, `sortField`, `sortDirection`, `searchTerm`, `showNewOnly`, `hideDone` with `useFilterParams` hook
  - [ ] Ensure all filter change handlers call the hook's setters (which update both state and URL)
  - [ ] Verify `displayedItems` useMemo still works with the new state source
  - [ ] Verify `handleClearAll` resets URL to base path
  - [ ] Test bidirectional sync: changing URL in address bar updates filters, changing filters updates URL
- [ ] Task 3: Write tests (AC: #10)
  - [ ] Create `frontend/src/features/backlog/hooks/use-filter-params.test.ts`
  - [ ] Test: URL params initialize filter state correctly
  - [ ] Test: Filter changes update URL params
  - [ ] Test: Clearing all filters removes all query params
  - [ ] Test: Multiple labels encode as comma-separated
  - [ ] Test: Empty/default values are not included in URL
  - [ ] Test: Invalid URL params are handled gracefully (no crash)
  - [ ] Update `backlog-list.test.tsx` to wrap test renders with `MemoryRouter` if not already

## Dev Notes

### Architecture Compliance

- **Component location**: New hook in `frontend/src/features/backlog/hooks/use-filter-params.ts` — follows feature-based hook organization
- **React Router v7**: Project uses `react-router` v7.13.0. Use `useSearchParams()` which returns `[searchParams, setSearchParams]`. Call `setSearchParams(params, { replace: true })` to avoid history stack pollution.
- **State management**: This replaces local `useState` in `BacklogList` with URL-synchronized state. No API changes needed. No new dependencies required.
- **Chakra UI**: No Chakra changes — this is purely state management/routing.

### Critical Implementation Details

- **Current filter state in `backlog-list.tsx`**: The component currently manages these as independent `useState` hooks:
  - `selectedLabels: string[]` (default `[]`)
  - `sortField: string` (default `'stackRank'`)
  - `sortDirection: 'asc' | 'desc'` (default `'asc'`)
  - `searchTerm: string` (default `''`)
  - `showNewOnly: boolean` (default `false`)
  - `hideDone: boolean` (default `true`)
- **URL parameter format**: Keep it simple and human-readable:
  - `?labels=Siebel,Gateway` (comma-separated, URL-encoded if needed)
  - `&sort=priority&dir=desc`
  - `&q=migration`
  - `&new=1` (presence = true, absence = false)
  - `&hideDone=0` (only include when false, since default is true)
- **Replace vs push**: Use `{ replace: true }` on `setSearchParams` so every filter tweak doesn't add a browser history entry. Users shouldn't have to click "Back" 15 times.
- **Default value optimization**: Don't include default values in URL. If `sort=stackRank&dir=asc`, omit them (they're defaults). Only include non-default state. This keeps URLs clean.
- **MemoryRouter in tests**: If `backlog-list.test.tsx` doesn't already wrap renders in a router, add `MemoryRouter` wrapper. Check existing test setup first — there may be a shared test wrapper.

### Existing Code to Reuse

- `BacklogList` at `frontend/src/features/backlog/components/backlog-list.tsx` — current filter state management to replace
- React Router already installed and configured in `App.tsx` with route definitions
- `useSearchParams` from `react-router` — already a dependency, no install needed
- Filter state types already defined inline in `BacklogList` — extract to hook return type

### Anti-Patterns to Avoid

- Do NOT use `window.location` or manual URL manipulation — use React Router's `useSearchParams`
- Do NOT use `push` navigation for filter changes — use `replace` to prevent history pollution
- Do NOT encode filters as a single base64/JSON blob — keep individual human-readable params
- Do NOT store URL state AND local state simultaneously — the URL IS the state source
- Do NOT break the existing `displayedItems` filter chain — preserve the exact same filtering logic
- Do NOT add any backend changes — this is 100% frontend state management

### Project Structure Notes

**New files:**
- `frontend/src/features/backlog/hooks/use-filter-params.ts`
- `frontend/src/features/backlog/hooks/use-filter-params.test.ts`

**Modified files:**
- `frontend/src/features/backlog/components/backlog-list.tsx` (replace useState with useFilterParams)
- `frontend/src/features/backlog/components/backlog-list.test.tsx` (add router wrapper if needed)

### References

- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Current filter state (useState hooks), displayedItems useMemo, filter change handlers
- [Source: frontend/src/App.tsx] — React Router configuration, route definitions
- [Source: _bmad-output/planning-artifacts/architecture.md] — React Router v7.13.0, feature-based organization, client-side state management
- [Source: frontend/package.json] — react-router v7.13.0 already installed

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
