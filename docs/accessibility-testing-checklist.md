# Accessibility Testing Checklist

**Project:** Shareable IT Backlog
**Date:** 2026-02-13
**WCAG Target:** 2.1 Level A (minimum)
**Story:** 11.4 — Conduct Accessibility Testing (VIX-387)

---

## Testing Tools

| Tool | Version | Purpose |
|------|---------|---------|
| axe-core | 4.11.1 | Automated WCAG accessibility engine |
| vitest-axe | 0.1.0 | Vitest custom matchers for axe-core |
| eslint-plugin-jsx-a11y | ^6.10.2 | Static JSX accessibility linting |
| VoiceOver (macOS) | Built-in | Manual screen reader testing |
| Keyboard | N/A | Manual keyboard navigation testing |

---

## Automated Test Results

### axe-core Test Results (vitest-axe)

All automated axe-core accessibility tests pass.

- **Rule scope**: Runs are scoped to WCAG **2.0 A** + **2.1 A** tagged rules (`wcag2a`, `wcag21a`).
- **Pass criteria**: No **critical** or **serious** violations (matches story AC language).

| Test File | Component(s) | Tests | Status |
|-----------|-------------|-------|--------|
| `backlog-page.a11y.test.tsx` | BacklogPage | 1 | PASS |
| `item-detail-modal.a11y.test.tsx` | ItemDetailModal (data + loading) | 2 | PASS |
| `admin-dashboard.a11y.test.tsx` | AdminPage (Users, Sync, Audit, Settings tabs) | 4 | PASS |
| `auth-pages.a11y.test.tsx` | IdentifyForm, PendingApproval, AccessDenied | 6 | PASS |
| `layout.a11y.test.tsx` | AppLayout, SkipLink, AppHeader | 3 | PASS |
| `stack-rank-badge.a11y.test.tsx` | StackRankBadge (all variants + priorities) | 6 | PASS |
| `backlog-item-card.a11y.test.tsx` | BacklogItemCard (full, new, clickable, compact) | 5 | PASS |
| `sync-status-indicator.a11y.test.tsx` | SyncStatusIndicator (success, error, idle, loading) | 5 | PASS |
| `business-unit-filter.a11y.test.tsx` | BusinessUnitFilter (no selection, selected, compact) | 3 | PASS |
| `empty-state-with-guidance.a11y.test.tsx` | EmptyStateWithGuidance (keyword, BU, new, all, compact) | 6 | PASS |

**Total: 41 automated a11y tests, all passing**

#### Axe configuration notes

- The shared helper `frontend/src/shared/utils/a11y-test-helpers.ts` defines `AXE_RUN_OPTIONS_WCAG_A` using `runOnly` tags.
- Landmark/region checks are enabled by default. The `ItemDetailModal` tests disable the `region` rule because Chakra Dialog portals outside landmarks in jsdom (portal location makes the rule non-actionable in that unit test context).

### ESLint jsx-a11y Results

| Metric | Count |
|--------|-------|
| Errors | 0 |
| Warnings | 0 (a11y-related) |
| Rules applied | `plugin:jsx-a11y/recommended` (full set) |

**Note:** 1 pre-existing non-a11y warning exists in `backlog-list.tsx` (`react-hooks/incompatible-library` for `useVirtualizer`). This is unrelated to accessibility.

**Fix applied:** `identify-form.tsx` had `autoFocus` prop which triggered `jsx-a11y/no-autofocus`. Replaced with `useRef` + `useEffect` programmatic focus — same UX behavior, lint-compliant.

---

## Keyboard Navigation Results

**Manual keyboard navigation testing is still required to fully satisfy Story 11.4 AC #4.**

Story 11.1 implemented comprehensive keyboard support; the items below represent the **manual browser verification checklist** to run (and record) before marking the story complete.

### Backlog Page

| Test | Status | Notes |
|------|--------|-------|
| Tab through skip link, header nav, filters, search, sort, items | PENDING | Verify in a real browser |
| Focus indicators visible on all focusable elements | PENDING | Verify on Chrome/Edge/Firefox |
| Enter/Space opens item detail modal from card | PENDING | Verify modal opens and receives focus |
| ArrowUp/ArrowDown navigates between backlog items | PENDING | Verify list navigation behavior |
| Home/End jumps to first/last item | PENDING | Verify list navigation behavior |

### Item Detail Modal

| Test | Status | Notes |
|------|--------|-------|
| Focus moves to modal on open | PENDING | Verify in a real browser |
| Focus is trapped within modal | PENDING | Verify focus trap behavior |
| ESC closes modal | PENDING | Verify ESC closes and restores focus |
| Tab cycles through modal content | PENDING | Verify tab order is logical |
| Focus returns to trigger element on close | PENDING | Verify focus restoration |

### Admin Dashboard

| Test | Status | Notes |
|------|--------|-------|
| Tab through tab navigation | PENDING | Verify focus and keyboard navigation |
| Arrow keys switch between tabs | PENDING | Verify tabs behavior in browser |
| All buttons in user management accessible | PENDING | Verify focus + activation |
| Sync trigger button accessible | PENDING | Verify focus + activation |

### Auth Pages

| Test | Status | Notes |
|------|--------|-------|
| Identify form input and submit via keyboard | PENDING | Verify Tab/Enter behavior |
| Error message displayed accessibly | PENDING | Verify focus/announcement doesn’t block keyboard usage |
| Programmatic focus on email input | PENDING | Verify initial focus behavior |

**Execution note:** Record tester name, browser, and date/time once the manual run is performed.

---

## Screen Reader Results

**Manual screen reader testing (VoiceOver on macOS) is still required to fully satisfy Story 11.4 AC #5.**

Story 11.2 implemented comprehensive screen reader support; the items below represent the **manual VoiceOver verification checklist** to run (and record) before marking the story complete.

### Backlog Page

| Test | Status | Notes |
|------|--------|-------|
| Page landmarks announced (header, main, navigation) | PENDING | Verify with VoiceOver |
| Backlog items announced with meaningful content | PENDING | Verify announcements are meaningful |
| Filter/search controls labeled | PENDING | Verify labels read correctly |
| Sync status announced | PENDING | Verify live region announcements |
| Skip link works | PENDING | Verify skip link focus + announcement |

### Item Detail Modal

| Test | Status | Notes |
|------|--------|-------|
| Modal announced as dialog with title | PENDING | Verify with VoiceOver |
| All content sections readable | PENDING | Verify reading order and headings |
| Comments/activities announced | PENDING | Verify content is traversable |
| Close button announced | PENDING | Verify announcement + activation |

### Admin Dashboard

| Test | Status | Notes |
|------|--------|-------|
| Tab panel structure announced | PENDING | Verify roles announced correctly |
| Table data readable | PENDING | Verify header associations and reading order |
| Action buttons announced with context | PENDING | Verify “Remove” has enough context |
| Admin sections labeled | PENDING | Verify label announced |

### Auth Pages

| Test | Status | Notes |
|------|--------|-------|
| Form inputs labeled | PENDING | Verify label announced correctly |
| Error messages announced | PENDING | Verify `role="alert"` announcement |
| Status messages clear | PENDING | Verify headings/content clear |
| Decorative icons hidden | PENDING | Verify icons not announced |

**Execution note:** Record tester name, VoiceOver settings, and date/time once the manual run is performed.

---

## Issues Found and Fixes Applied

| # | Severity | Location | Description | Fix Applied |
|---|----------|----------|-------------|-------------|
| 1 | Medium | `identify-form.tsx` | `autoFocus` prop violates `jsx-a11y/no-autofocus` | Replaced with `useRef` + `useEffect` programmatic focus |
| 2 | Medium | `identify-form.tsx`, `pending-approval.tsx`, `access-denied.tsx` | Auth pages lacked an explicit `<main>` landmark in standalone/full-page views | Added `as="main"` + `id="main-content"` to the top-level container |

### Code Review Observations (Not WCAG Level A violations)

These are Level AA or best practice recommendations documented for future improvement:

| # | Category | Location | Observation |
|---|----------|----------|-------------|
| 1 | Best Practice | `backlog-list.tsx` | Virtual list uses `role="list"` but children are `div`, not `li` |
| 2 | Level AA | `app-header.tsx` | Active navigation links could use `aria-current="page"` |
| 3 | Best Practice | `item-detail-modal.tsx` | Metadata fields could use `dl`/`dt`/`dd` for semantic structure |
| 4 | Best Practice | `admin-page.tsx` | Settings section heading is `Text`, not `h2` |

---

## WCAG 2.1 Level A Compliance Summary

| Criterion | Description | Status | Method |
|-----------|-------------|--------|--------|
| 1.1.1 | Non-text Content | PASS | Automated (axe) |
| 1.3.1 | Info and Relationships | PASS | Automated (axe) |
| 1.3.2 | Meaningful Sequence | PENDING | Manual browser + screen reader verification |
| 1.4.1 | Use of Color | PENDING | Manual verification (Story 11.3 implemented fixes) |
| 2.1.1 | Keyboard | PENDING | Manual keyboard-only verification (Story 11.1 implemented support) |
| 2.1.2 | No Keyboard Trap | PENDING | Manual keyboard-only verification |
| 2.4.1 | Bypass Blocks | PASS | Automated (axe) + manual spot-check recommended |
| 2.4.2 | Page Titled | PASS | Automated (axe) |
| 2.4.3 | Focus Order | PENDING | Manual keyboard-only verification |
| 2.4.4 | Link Purpose | PENDING | Manual verification (axe is partial) |
| 3.1.1 | Language of Page | PASS | Automated (axe) |
| 3.3.1 | Error Identification | PENDING | Manual verification |
| 3.3.2 | Labels or Instructions | PASS | Automated (axe) + unit tests |
| 4.1.1 | Parsing | PASS | Automated (axe) |
| 4.1.2 | Name, Role, Value | PASS | Automated (axe) + unit tests (partial) |

**Overall Level A Compliance: PARTIAL (automated PASS, manual verification pending)**

---

## Known Limitations

1. **Automated testing coverage:** axe-core can detect approximately 57% of WCAG issues. The remaining issues require manual testing (Tasks 4 and 5 above).
2. **Screen reader testing scope:** VoiceOver testing is required to validate announcement quality, reading order, and dynamic content updates (pending in this checklist).
3. **Virtual scrolling:** The backlog list uses `@tanstack/react-virtual` for performance. Virtual list items use `role="list"` with `div` children rather than `ul`/`li`. This is a known trade-off for performance vs. strict semantic list structure.
4. **Color contrast:** Story 11.3 audited and fixed all color contrast issues. 9 failing color pairings were corrected. All text meets WCAG AA requirements (4.5:1 for normal text, 3:1 for large text), and non-text UI meets 3:1.

---

## Cross-References

- **Story 11.1 — Keyboard Navigation:** Implemented Tab, Enter, Space, ESC, ArrowUp/ArrowDown keyboard interactions, focus indicators, focus trap in modals, skip link component.
- **Story 11.2 — Screen Reader Support:** Implemented semantic HTML, ARIA labels, live regions, landmark roles, form labeling.
- **Story 11.3 — Color Contrast Compliance:** Audited and fixed 9 color pairings, documented contrast ratios in `theme.ts`, created accessible color variants (`brand.greenAccessible`, `error.redAccessible`).

---

## Test Execution Details

```
Frontend test suite: 642 tests (601 existing + 41 new a11y tests), all passing
ESLint jsx-a11y: 0 errors, 0 a11y warnings
Backend test suite: 598 tests, all passing
```
