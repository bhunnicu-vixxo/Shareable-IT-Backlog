# Story 11.4: Conduct Accessibility Testing

Linear Issue ID: VIX-387
Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want accessibility testing performed,
so that we verify WCAG Level A compliance across the entire application.

## Acceptance Criteria

1. **Given** the application is built, **When** automated accessibility tests are run with axe-core, **Then** all pages and components pass with zero critical or serious violations at WCAG 2.1 Level A.

2. **Given** eslint-plugin-jsx-a11y is configured, **When** the linter runs, **Then** zero accessibility-related lint errors are reported across all JSX files.

3. **Given** automated axe-core tests are integrated into the test suite, **When** `npm run test` is executed, **Then** accessibility tests run as part of the standard test pipeline and pass.

4. **Given** the application is loaded in a browser, **When** manual keyboard navigation testing is performed, **Then** all interactive elements are reachable via Tab, activatable via Enter/Space, modals trap focus, ESC closes overlays, and focus order is logical.

5. **Given** a screen reader (VoiceOver on macOS) is used to navigate the application, **When** all pages and components are traversed, **Then** all content is announced correctly, ARIA labels are meaningful, dynamic content updates are announced via live regions, and landmarks are properly identified.

6. **Given** accessibility testing is complete, **When** results are compiled, **Then** an accessibility testing checklist document exists in `docs/` recording all test results, tools used, issues found, and fixes applied.

7. **And** all existing frontend and backend tests continue to pass (no regressions).

## Tasks / Subtasks

### Task 1: Install and Configure Automated Accessibility Testing Tools (AC: #1, #2, #3)

- [x] 1.1: Install axe-core and vitest-axe as dev dependencies in the frontend workspace:
  ```bash
  npm install --save-dev axe-core vitest-axe -w frontend
  ```
  - axe-core v4.11.1+ (latest stable, supports WCAG 2.0/2.1/2.2 A/AA/AAA)
  - vitest-axe (Vitest-compatible fork of jest-axe, same API)
- [x] 1.2: Configure vitest-axe in the test setup file:
  - Add `import "vitest-axe/extend-expect";` to the Vitest setup file (e.g., `frontend/src/utils/test-utils.tsx` or a dedicated `vitest.setup.ts`)
  - **CRITICAL:** Ensure Vitest uses `jsdom` environment (NOT Happy DOM) — vitest-axe has a known bug with Happy DOM's `Node.prototype.isConnected` implementation
  - Verify vitest.config.ts has `environment: 'jsdom'`
- [x] 1.3: Install and configure eslint-plugin-jsx-a11y v6.10.2+:
  ```bash
  npm install --save-dev eslint-plugin-jsx-a11y -w frontend
  ```
  - Add `plugin:jsx-a11y/recommended` to the ESLint configuration
  - If using flat config (`eslint.config.js`), import and spread the recommended config
  - Run lint and verify zero a11y errors (fix any that arise)
- [x] 1.4: Create a shared accessibility test helper utility:
  - File: `frontend/src/shared/utils/a11y-test-helpers.ts`
  - Export a `checkAccessibility` wrapper function that renders a component and runs `axe()` on it
  - Export axe configuration presets (e.g., WCAG A only, WCAG AA, full)
  - Include helper to configure axe rules (disable specific rules if needed with documented justification)

### Task 2: Write Automated Accessibility Tests for Core Pages (AC: #1, #3)

- [x] 2.1: Create accessibility test for BacklogPage (`frontend/src/features/backlog/components/backlog-page.a11y.test.tsx`):
  - Test the full backlog page rendering with mock data
  - Verify no axe violations
  - Test with filters active (business unit filter, keyword search, sort)
  - Test with empty state (EmptyStateWithGuidance rendered)
  - Test with loading state (skeleton screens rendered)
- [x] 2.2: Create accessibility test for ItemDetailModal (`frontend/src/features/backlog/components/item-detail-modal.a11y.test.tsx`):
  - Test modal open state with full item data
  - Test with comments section populated
  - Test with markdown content rendered
  - Test focus trap behavior (axe checks focus management)
- [x] 2.3: Create accessibility test for AdminDashboard (`frontend/src/features/admin/components/admin-dashboard.a11y.test.tsx`):
  - Test all admin tabs (Users, Sync, Audit)
  - Test user management list with various user states
  - Test sync control panel
  - Test audit log list
- [x] 2.4: Create accessibility test for Auth pages (`frontend/src/features/auth/components/auth-pages.a11y.test.tsx`):
  - Test identify form (login)
  - Test access denied page
  - Test pending approval page
- [x] 2.5: Create accessibility test for shared layout components (`frontend/src/shared/components/layout/layout.a11y.test.tsx`):
  - Test header with navigation
  - Test main layout structure
  - Test skip link functionality

### Task 3: Write Automated Accessibility Tests for Custom UI Components (AC: #1, #3)

- [x] 3.1: Create accessibility test for StackRankBadge (`frontend/src/shared/components/ui/stack-rank-badge.a11y.test.tsx`):
  - Test all variants (solid, outline, subtle)
  - Test with various priority numbers
  - Test isNone state
  - Verify ARIA labels present
- [x] 3.2: Create accessibility test for BacklogItemCard (`frontend/src/features/backlog/components/backlog-item-card.a11y.test.tsx`):
  - Test card with full data
  - Test card with "new" flag
  - Test keyboard interaction (clickable card)
  - Verify semantic structure (heading levels, link text)
- [x] 3.3: Create accessibility test for SyncStatusIndicator (`frontend/src/features/backlog/components/sync-status-indicator.a11y.test.tsx`):
  - Test all status states (synced, warning, error, unknown)
  - Verify decorative dots are `aria-hidden`
  - Verify text alternatives present
- [x] 3.4: Create accessibility test for BusinessUnitFilter (`frontend/src/features/backlog/components/business-unit-filter.a11y.test.tsx`):
  - Test dropdown/select accessibility
  - Test with options selected
  - Test keyboard interaction
- [x] 3.5: Create accessibility test for EmptyStateWithGuidance (`frontend/src/shared/components/ui/empty-state-with-guidance.a11y.test.tsx`):
  - Test with various message types
  - Verify action buttons are accessible

### Task 4: Conduct Manual Keyboard Navigation Testing (AC: #4)

- [ ] 4.1: Test keyboard navigation on Backlog page:
  - Tab through all interactive elements (skip link, nav, filters, search, sort, backlog items)
  - Verify focus indicators are visible on all focusable elements
  - Verify focus order follows visual layout (top→bottom, left→right)
  - Test Enter/Space to open item detail modal
  - Document results in checklist
- [ ] 4.2: Test keyboard navigation on Item Detail Modal:
  - Verify focus moves to modal on open
  - Verify focus is trapped within modal
  - Verify ESC closes modal
  - Verify Tab cycles through modal content
  - Verify return focus to trigger element on close
  - Document results in checklist
- [ ] 4.3: Test keyboard navigation on Admin Dashboard:
  - Tab through tab navigation (Users, Sync, Audit tabs)
  - Verify tab switching via arrow keys
  - Test all buttons in user management (approve, remove)
  - Test sync trigger button
  - Document results in checklist
- [ ] 4.4: Test keyboard navigation on Auth pages:
  - Test identify form input and submit
  - Test error message accessibility
  - Document results in checklist
- [ ] 4.5: Fix any keyboard navigation issues found and document fixes

### Task 5: Conduct Screen Reader Testing (AC: #5)

- [ ] 5.1: Test with VoiceOver (macOS) on Backlog page:
  - Verify page landmarks are announced (header, main, navigation)
  - Verify backlog items are announced with meaningful content
  - Verify filter/search controls are labeled
  - Verify sync status is announced
  - Verify skip link works
  - Document results in checklist
- [ ] 5.2: Test with VoiceOver on Item Detail Modal:
  - Verify modal is announced as dialog with title
  - Verify all content sections are readable
  - Verify comments/updates are announced
  - Verify close button is announced
  - Document results in checklist
- [ ] 5.3: Test with VoiceOver on Admin Dashboard:
  - Verify tab panel structure is announced
  - Verify table data is readable
  - Verify action buttons are announced with context
  - Document results in checklist
- [ ] 5.4: Test with VoiceOver on Auth pages:
  - Verify form inputs are labeled
  - Verify error messages are announced
  - Verify status messages (pending approval, access denied) are clear
  - Document results in checklist
- [ ] 5.5: Fix any screen reader issues found and document fixes

### Task 6: Create Accessibility Testing Checklist Document (AC: #6)

- [x] 6.1: Create `docs/accessibility-testing-checklist.md` with:
  - **Testing Tools:** List of all tools used with versions (axe-core, vitest-axe, eslint-plugin-jsx-a11y, VoiceOver)
  - **Automated Test Results:** Summary of axe-core test results per page/component
  - **Lint Results:** eslint-plugin-jsx-a11y results
  - **Keyboard Navigation Results:** Checklist per page with pass/fail
  - **Screen Reader Results:** Checklist per page with pass/fail
  - **Issues Found:** Table of issues found (severity, location, description, fix applied)
  - **WCAG Compliance Summary:** Level A compliance status per criterion
  - **Known Limitations:** Any intentional deviations with justification
- [x] 6.2: Include cross-references to previous story work:
  - Story 11.1 (Keyboard Navigation) — implementation details
  - Story 11.2 (Screen Reader Support) — ARIA implementation details
  - Story 11.3 (Color Contrast Compliance) — contrast audit results and fixes

### Task 7: Run Regression Tests (AC: #7)

- [x] 7.1: Run full frontend test suite including new a11y tests:
  - `npm run test:run -w frontend` — all tests must pass (590+ existing + new a11y tests)
  - `npm run lint -w frontend` — 0 errors (with new jsx-a11y rules)
- [x] 7.2: Run full backend test suite:
  - `npm run test:run -w backend` — 598+ tests must pass
- [x] 7.3: Verify no regressions from any new dependencies or config changes

### Review Follow-ups (AI)

- [ ] [AI-Review][High] Perform **manual keyboard-only** testing in a real browser and record results in `docs/accessibility-testing-checklist.md` (AC #4).
- [ ] [AI-Review][High] Perform **VoiceOver (macOS)** testing across Backlog, Item Detail Modal, Admin, and Auth pages and record results in `docs/accessibility-testing-checklist.md` (AC #5).

## Dev Notes

### What's Already Done (CRITICAL — extend, don't recreate)

**Story 11.1 (Keyboard Navigation) established:**
- All interactive elements are keyboard accessible (Tab, Enter, Space, ESC)
- Focus indicators visible on all focusable elements
- Focus trap implemented in modals (item detail modal)
- Skip link component (`skip-link.tsx`) for bypassing navigation
- Logical focus order throughout the app
- Keyboard shortcuts documented

**Story 11.2 (Screen Reader Support) established:**
- Semantic HTML structure throughout (nav, main, article, headings)
- ARIA labels on all interactive elements
- ARIA live regions for dynamic content updates (sync status, filter results)
- Form inputs properly labeled
- Images have alt text (or are decorative with `aria-hidden`)
- Landmark roles properly assigned

**Story 11.3 (Color Contrast Compliance) established:**
- All text meets WCAG AA contrast (4.5:1 normal, 3:1 large text)
- Non-text UI elements meet 3:1 contrast
- Color is never the sole indicator — text labels, icons accompany all color cues
- Comprehensive contrast documentation in `theme.ts` header
- Accessible color variants: `brand.greenAccessible` (#6F7B24), `error.redAccessible` (#C53030)
- Status colors audited and fixed: `status-colors.ts`

**Test infrastructure:**
- Vitest configured as test runner
- React Testing Library for component tests
- 590+ frontend tests, 598+ backend tests all passing
- Co-located test files (`*.test.tsx`)
- Test utilities in `frontend/src/utils/test-utils.tsx`

### Key Guardrails (Disaster Prevention)

- **Do NOT reinstall or reconfigure existing accessibility features.** Stories 11.1-11.3 implemented keyboard nav, screen reader support, and color contrast. This story TESTS and VERIFIES those implementations, adding automated testing infrastructure.
- **Do NOT use Happy DOM with vitest-axe.** There is a known bug with `Node.prototype.isConnected`. Use `jsdom` as the Vitest test environment.
- **Do NOT install `@axe-core/react`** (the runtime dev-mode scanner). This story is about test infrastructure, not dev-time scanning. Use `axe-core` + `vitest-axe` for automated test-time scanning.
- **Do NOT modify the existing 590+ frontend tests.** New a11y tests should be additive (`*.a11y.test.tsx` files).
- **Keep error response format unchanged:** `{ error: { message, code, details? } }`.
- **Keep Pino as the only logger** — do not introduce console.log or other logging.
- **Primarily a frontend story** — no backend code changes expected. The only backend interaction is running existing backend tests to verify no regressions.
- **Do NOT modify existing component implementations** unless accessibility testing reveals genuine WCAG Level A violations. Stories 11.1-11.3 should have addressed all issues. If new issues are found, document them and fix minimally.
- **axe-core can find ~57% of WCAG issues automatically** — the remaining issues require manual testing (Tasks 4 and 5). Do not assume passing automated tests equals full compliance.
- **ESLint jsx-a11y catches static issues only** — it cannot detect runtime accessibility problems (wrong ARIA states, dynamic content issues). Combine with axe-core for comprehensive coverage.

### Architecture Compliance

- **Frontend structure:** Feature-based (`features/backlog/`, `features/admin/`, `shared/components/`)
- **Test files:** Co-located with source files using `.a11y.test.tsx` suffix for accessibility-specific tests
- **Naming conventions:**
  - Files: `kebab-case.tsx` / `kebab-case.a11y.test.tsx`
  - Components: `PascalCase`
  - Functions: `camelCase` (`checkAccessibility`, `renderWithProviders`)
  - Constants: `UPPER_SNAKE_CASE` (`AXE_RUN_OPTIONS_WCAG_A`)
- **Styling:** No style changes expected — this is a testing story
- **TypeScript:** Strict mode, no `any`. Define interfaces for test helper params.
- **State management:** No new global state needed.

### Library / Framework Requirements

**New dependencies (dev only):**
- `axe-core` v4.11.1+ — Accessibility testing engine (WCAG 2.0/2.1/2.2, A/AA/AAA)
- `vitest-axe` (latest) — Vitest-compatible custom matchers for axe-core (fork of jest-axe)
- `eslint-plugin-jsx-a11y` v6.10.2+ — Static JSX accessibility linting

**Existing dependencies (already installed, no changes):**
- `vitest` — Test runner
- `@testing-library/react` — Component rendering for tests
- `@testing-library/jest-dom` — DOM assertion matchers
- `jsdom` — DOM environment for tests

**Do NOT install:**
- `@axe-core/react` — Runtime dev-mode scanner, not needed for test infrastructure
- `pa11y` — Server-side accessibility testing, not applicable
- `jest-axe` — Use `vitest-axe` instead (jest-axe conflicts with Vitest environment)

### File Structure Requirements

New files:
```
frontend/src/shared/utils/a11y-test-helpers.ts                              # Shared axe-core test utilities
frontend/src/features/backlog/components/backlog-page.a11y.test.tsx          # Backlog page a11y tests
frontend/src/features/backlog/components/item-detail-modal.a11y.test.tsx     # Item detail modal a11y tests
frontend/src/features/backlog/components/backlog-item-card.a11y.test.tsx     # BacklogItemCard a11y tests
frontend/src/features/backlog/components/sync-status-indicator.a11y.test.tsx # SyncStatusIndicator a11y tests
frontend/src/features/backlog/components/business-unit-filter.a11y.test.tsx  # BusinessUnitFilter a11y tests
frontend/src/features/admin/components/admin-dashboard.a11y.test.tsx         # Admin dashboard a11y tests
frontend/src/features/auth/components/auth-pages.a11y.test.tsx               # Auth pages a11y tests
frontend/src/shared/components/layout/layout.a11y.test.tsx                   # Layout components a11y tests
frontend/src/shared/components/ui/stack-rank-badge.a11y.test.tsx             # StackRankBadge a11y tests
frontend/src/shared/components/ui/empty-state-with-guidance.a11y.test.tsx    # EmptyState a11y tests
docs/accessibility-testing-checklist.md                                      # Testing results document
```

Modified files (expected):
```
frontend/vitest.config.ts (or vite.config.ts)   # Ensure jsdom environment, add vitest-axe setup
frontend/src/utils/test-utils.tsx                # Add vitest-axe extend-expect import (or separate setup file)
frontend/.eslintrc.cjs (or eslint.config.js)     # Add jsx-a11y plugin configuration
frontend/package.json                            # New dev dependencies
```

### Testing Requirements

- **New a11y test files** use `.a11y.test.tsx` suffix to distinguish from existing functional tests.
- **Shared test helper** (`a11y-test-helpers.ts`) provides consistent axe configuration across all tests.
- **Every a11y test** should:
  1. Render the component with realistic mock data using the existing `renderWithProviders` wrapper
  2. Run `expect(container).toHaveNoViolations()` (vitest-axe matcher)
  3. Test multiple states (loading, error, empty, populated)
- **Mock API calls** — do NOT require a running backend. Use existing MSW or mock patterns.
- **Existing test suites must pass** without modification (backward compatibility).
- **Pre-existing known issues:**
  - 1 ESLint warning in `backlog-list.tsx` (react-hooks/incompatible-library for `useVirtualizer`) — known, unrelated
  - 1 pre-existing timeout in `network-integration.test.ts` — known, unrelated

### Previous Story Intelligence (11.3 — Color Contrast Compliance)

Key learnings directly applicable to this story:
- **The entire codebase has been audited for color contrast** — 9 failing pairings were fixed. All brand colors now meet WCAG AA requirements for their usage contexts (normal text, large text, non-text UI).
- **Accessible color variants exist:** `brand.greenAccessible` (#6F7B24, 4.63:1), `error.redAccessible` (#C53030, 5.47:1). These are used for normal-sized text. Base `brand.green` is reserved for large text and backgrounds.
- **Theme documentation is comprehensive** — `theme.ts` header has full WCAG contrast tables.
- **Test count:** 590 frontend + 598 backend = 1,188 tests all passing.
- **Commit format:** `feat: <description> (Story X.Y, VIX-NNN)`.
- **Branch pattern:** Feature branch per story, single PR.
- **Status colors were fixed** — `status-colors.ts` uses accessible alternatives (`brand.greenAccessible`, `gray.700`, `gray.600`).
- **Sync status indicator** — warning/stale dots changed from `brand.yellow` to `brand.copper` for non-text contrast.

### Git Intelligence

Recent commits show Epic 11 (Accessibility) is nearly complete:
- `3536b6f feat: ensure color contrast compliance (Story 11.3, VIX-386)` ← most recent
- `a35df7c fix: update toggle button aria-label to include current state`
- `3c21b3f fix: correct ARIA accessibility issues in backlog components`
- `ea8008c fix: correct accessibility issues in backlog page and identify form`
- `4bbd994 feat: implement screen reader support (Story 11.2, VIX-385)`
- `f45eb82 Merge pull request #24 — keyboard navigation (Story 11.1, VIX-384)`

**Pattern:** Stories 11.1-11.3 progressively built accessibility infrastructure. This story is the capstone that validates everything with automated + manual testing.

Create branch `bobby/vix-387-conduct-accessibility-testing` (matching Linear's suggested branch name).

### Latest Technical Context (2026)

**axe-core v4.11.1:**
- Supports WCAG 2.0, 2.1, and 2.2 at all levels (A, AA, AAA)
- Can automatically detect ~57% of WCAG issues
- Built-in TypeScript declarations
- ~4.9M weekly downloads, industry standard

**vitest-axe:**
- Fork of jest-axe for Vitest compatibility
- Same API: `expect(container).toHaveNoViolations()`
- **CRITICAL:** Known bug with Happy DOM — MUST use jsdom environment
- Setup: `import "vitest-axe/extend-expect"` in test setup file

**eslint-plugin-jsx-a11y v6.10.2:**
- Static JSX accessibility linting (~23.9M weekly downloads)
- Provides `recommended` and `strict` configs
- Catches: missing alt text, invalid ARIA, missing form labels, etc.
- Supports both legacy `.eslintrc` and flat config
- Complements axe-core (static vs runtime analysis)

**What automated testing CANNOT catch (requires manual testing):**
- Logical reading order and content flow
- Quality/meaningfulness of alt text and labels
- Keyboard navigation logical flow
- Screen reader announcement quality
- Complex interaction patterns (drag-and-drop, custom widgets)
- Content comprehensibility

### WCAG 2.1 Level A Criteria Quick Reference

| Principle | Key Criteria | Automated? |
|-----------|-------------|------------|
| 1.1.1 Non-text Content | Alt text for images | Partial (axe detects missing, not quality) |
| 1.3.1 Info and Relationships | Semantic HTML, headings, lists | Partial |
| 1.3.2 Meaningful Sequence | Logical DOM order | Manual |
| 1.4.1 Use of Color | Color not sole indicator | Manual |
| 2.1.1 Keyboard | All functionality via keyboard | Manual |
| 2.1.2 No Keyboard Trap | Focus not trapped (except modals) | Manual |
| 2.4.1 Bypass Blocks | Skip navigation link | Automated |
| 2.4.2 Page Titled | Descriptive page titles | Automated |
| 2.4.3 Focus Order | Logical focus sequence | Manual |
| 2.4.4 Link Purpose | Links have meaningful text | Partial |
| 3.1.1 Language of Page | `lang` attribute on html | Automated |
| 3.3.1 Error Identification | Errors described in text | Manual |
| 3.3.2 Labels or Instructions | Form inputs have labels | Automated |
| 4.1.1 Parsing | Valid HTML | Automated |
| 4.1.2 Name, Role, Value | ARIA for custom widgets | Partial |

### Project Structure Notes

- All new files are test files or documentation — no production component changes expected.
- New test files use `.a11y.test.tsx` convention to keep them separate from functional tests.
- Accessibility test helper utility goes in `shared/utils/` per project conventions.
- Accessibility checklist document goes in `docs/` per architecture spec.
- All changes align with existing feature-based frontend structure.
- No backend changes. No database migrations. No new production dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 11.4] — Story requirements and ACs
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] — Accessibility: WCAG 2.1 Level A minimum, basic accessibility testing required
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — React + Vite + TypeScript, Vitest, feature-based structure, co-located tests
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions, test organization, file structure
- [Source: _bmad-output/project-context.md] — Critical implementation rules, TypeScript strict mode, test patterns
- [Source: _bmad-output/implementation-artifacts/11-3-ensure-color-contrast-compliance.md] — Previous story with color contrast fixes, accessible color variants, test patterns
- [Source: _bmad-output/implementation-artifacts/11-3-ensure-color-contrast-compliance.md#Dev Notes] — Brand color contrast ratios, key guardrails, "do not install axe-core" note (deferred to this story)
- [Source: frontend/src/theme.ts] — WCAG contrast documentation, brand tokens, accessible variants
- [Source: frontend/src/theme/tokens.ts] — Raw brand color constants
- [Source: frontend/src/shared/components/layout/skip-link.tsx] — Skip link implementation
- [Source: frontend/src/features/backlog/components/backlog-page.tsx] — Main backlog page
- [Source: frontend/src/features/admin/components/admin-dashboard.tsx] — Admin dashboard
- [Source: frontend/src/features/auth/components/identify-form.tsx] — Auth identify form

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor IDE)

### Debug Log References

- vitest-axe v0.1.0 has an empty `extend-expect.js` dist file — the `import "vitest-axe/extend-expect"` approach documented in README does not work. Fixed by manually importing `toHaveNoViolations` from `vitest-axe/matchers` and calling `expect.extend({ toHaveNoViolations })` in `vitest.setup.ts`.
- `jsx-a11y/no-autofocus` lint error on `identify-form.tsx` — replaced `autoFocus` prop with `useRef` + `useEffect` programmatic focus (same UX, lint-compliant).
- `EmptyStateWithGuidance` lives in `features/backlog/components/` not `shared/components/ui/` — a11y test file placed co-located with the component.

### Completion Notes List

- **Task 1:** Installed axe-core v4.11.1, vitest-axe v0.1.0, eslint-plugin-jsx-a11y ^6.10.2. Configured vitest-axe matchers in `vitest.setup.ts`. Added `jsx-a11y/recommended` to ESLint flat config. Fixed `jsx-a11y/no-autofocus` by replacing `autoFocus` with programmatic focus. Added `<main id="main-content">` landmarks to auth full-page views. Updated shared a11y helper to scope axe runs to WCAG 2.1 A tags and assert **no critical/serious violations**.
- **Task 2:** Core page a11y tests created and refactored to use the shared helper. Page-level tests run under `AppLayout` so landmark checks are meaningful.
- **Task 3:** UI component a11y tests created and refactored to use the shared helper (landmark wrapper used for component contexts).
- **Task 4:** **PENDING manual execution.** Checklist prepared in `docs/accessibility-testing-checklist.md` for real-browser keyboard-only verification (AC #4).
- **Task 5:** **PENDING manual execution.** Checklist prepared in `docs/accessibility-testing-checklist.md` for VoiceOver (macOS) verification (AC #5).
- **Task 6:** `docs/accessibility-testing-checklist.md` updated with tools, automated results, and explicit manual verification sections/status.
- **Task 7:** Regression suite verified: frontend lint passes (1 pre-existing warning), 642 frontend tests pass, 598 backend tests pass.

### Change Log

- 2026-02-13: Implemented accessibility testing infrastructure and validation (Story 11.4, VIX-387)
- 2026-02-13: Senior review fixes — scope axe runs to WCAG A tags, stop blanket-disabling landmarks, refactor a11y tests to shared helper, add `<main>` landmarks to auth pages (Story 11.4, VIX-387)

### File List

New files:
- `frontend/src/shared/utils/a11y-test-helpers.ts`
- `frontend/src/features/backlog/components/backlog-page.a11y.test.tsx`
- `frontend/src/features/backlog/components/item-detail-modal.a11y.test.tsx`
- `frontend/src/features/backlog/components/backlog-item-card.a11y.test.tsx`
- `frontend/src/features/backlog/components/sync-status-indicator.a11y.test.tsx`
- `frontend/src/features/backlog/components/business-unit-filter.a11y.test.tsx`
- `frontend/src/features/backlog/components/empty-state-with-guidance.a11y.test.tsx`
- `frontend/src/features/admin/components/admin-dashboard.a11y.test.tsx`
- `frontend/src/features/auth/components/auth-pages.a11y.test.tsx`
- `frontend/src/shared/components/layout/layout.a11y.test.tsx`
- `frontend/src/shared/components/ui/stack-rank-badge.a11y.test.tsx`
- `docs/accessibility-testing-checklist.md`

Modified files:
- `frontend/vitest.setup.ts` (added vitest-axe matcher registration)
- `frontend/eslint.config.js` (added jsx-a11y recommended config)
- `frontend/package.json` (added axe-core, vitest-axe, eslint-plugin-jsx-a11y dev dependencies)
- `frontend/src/features/auth/components/identify-form.tsx` (replaced autoFocus with programmatic focus)
- `frontend/src/features/auth/components/pending-approval.tsx` (added `<main>` landmark, removed redundant aria-label)
- `frontend/src/features/auth/components/access-denied.tsx` (added `<main>` landmark)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status: review → in-progress)
- `_bmad-output/implementation-artifacts/11-4-conduct-accessibility-testing.md` (task checkboxes, dev agent record)

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-13_

### Summary

- Refactored a11y tests to use the shared helper (`frontend/src/shared/utils/a11y-test-helpers.ts`) consistently.
- Scoped axe runs to WCAG 2.1 Level A tags (`wcag2a`, `wcag21a`) and aligned assertions with AC language (no critical/serious violations).
- Removed blanket disabling of landmark/region checks (allowed only for modal/unit-test portal limitations with justification).
- Added explicit `<main id="main-content">` landmarks to standalone auth full-page views.

### Remaining blockers

- Manual keyboard-only browser testing (AC #4) is still **pending**.
- Manual VoiceOver (macOS) testing (AC #5) is still **pending**.

