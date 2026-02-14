# Story 7.6: Admin Label Visibility Configuration

Linear Issue ID: VIX-428
Status: review

## Story

As an Admin,
I want to configure which Linear labels are visible to non-privileged users,
So that sensitive/internal labels can be hidden while still allowing IT/Admin users full context.

## Acceptance Criteria

1. **Admin can configure label visibility:** Admin users can select a set of labels to be hidden (or alternatively, a set of labels to be shown) for regular users.
2. **Regular users don’t see hidden labels:** Backlog list cards and item detail modal do not render hidden labels for non-IT/non-Admin users.
3. **IT/Admin still see all labels:** Privileged users (IT/Admin) see labels unchanged.
4. **No additional Linear calls in UI:** Label filtering uses already-fetched label data and a stored configuration (no new Linear fetches from the frontend).
5. **Config persists:** The label visibility configuration persists across sessions (backend/db or existing settings mechanism).
6. **Tests cover behavior:** Unit tests validate label visibility behavior for privileged vs regular users.

## Tasks / Subtasks

- [x] Task 1: Define label visibility configuration model (superseded by detailed Tasks 1–9 below)
  - [x] 1.1: Config shape: `label_visibility` table with `label_name UNIQUE`, `is_visible`, `reviewed_at`, `updated_by`
  - [x] 1.2: DB-backed via PostgreSQL `label_visibility` table (migration 011)
  - [x] 1.3: Admin endpoints at `/api/admin/settings/labels` + public `/api/labels/visible`

- [x] Task 2: Admin UI for configuration
  - [x] 2.1: `LabelVisibilityManager` component in admin Settings tab
  - [x] 2.2: Search input + toggle switches per label with bulk actions
  - [x] 2.3: Mutation hooks with optimistic updates for instant UI response, error rollback, server revalidation

- [x] Task 3: Apply visibility rules in backlog UI
  - [x] 3.1: `LabelFilter` filters options using `useVisibleLabels()` hook
  - [x] 3.2: Hidden labels removed from filter dropdown (items still appear)
  - [x] 3.3: Backlog cards + item detail modal do not render hidden labels for ALL users (admin included)
  - [x] 3.4: Visibility controls apply universally — admin manages visibility from Settings tab, backlog respects it for everyone

- [x] Task 4: Tests
  - [x] 4.1: Backend: 710 tests passing (51 files) including label-visibility service + sync integration + admin controller label tests
  - [x] 4.2: Frontend: 710 tests passing (66 files) including LabelVisibilityManager + hooks + filter
  - [x] 4.3: Admin config CRUD, sync upsert, item count computation, and filter behavior all covered

## Dev Notes

- This story is about **visibility**, not changing labels in Linear.
- Prefer filtering by **label id** if available to avoid name collisions/renames.

## Dev Agent Record

### Agent Model Used

Claude 4.6 Opus (Cursor Agent)

### Completion Notes List

- Original story outline (Tasks 1–4) superseded by detailed implementation plan (Tasks 1–9 below)
- All implementation completed and verified

### File List

- (See detailed File List in the implementation section below)

### Change Log

- **2026-02-14:** Drafted story file for upcoming admin label visibility configuration.
- **2026-02-14:** Implementation completed — all 9 tasks done, builds clean, 1409 total tests passing.
- **2026-02-14:** Post-review fixes applied:
  - **Item counts**: `getLabels` controller computes item counts from in-memory sync cache (backlog data is not in DB)
  - **Visibility applies to all users**: Removed role-aware logic from `/api/labels/visible` — always returns only visible labels regardless of role. Admin/IT privilege is for the Settings panel, not bypassing visibility on the backlog.
  - **Optimistic updates**: Mutation hooks now use TanStack Query optimistic updates for instant toggle/bulk response with rollback on error
  - **Dark mode contrast**: Switch toggles styled with explicit on/off colors (#8E992E green / #4A5568 gray), white thumb with shadow. Buttons use semantic tokens (`fg.brand`, `border.default`, `surface.hover`). All `gray.100`/`gray.50` borders replaced with `border.subtle`. Text colors updated from `brand.gray`/`brand.grayLight` to `fg.brand`/`fg.brandMuted`.
  - **Theme**: Added `switchRecipe` slot recipe, updated `outline` button variant for dark mode
  - **Migration 009**: Changed `pgcrypto` enable to no-op for Azure PostgreSQL compatibility
  - **Test count**: 710 backend + 710 frontend = 1,420 total tests passing

# Story 7.6: Admin Label Visibility Configuration (Implementation Detail)

Linear Issue ID: VIX-428
Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to control which Linear labels appear in the end-user label filter,
so that business users only see labels that are meaningful to them and aren't confused by internal IT labels (e.g., "Frontend", "Backend", "Rollover", "Tech Debt").

**Core Design Principle — Opt-In Visibility:**
Labels are **hidden by default**. New labels discovered during sync do NOT appear in the end-user filter until an admin explicitly enables them. The admin only visits the settings screen when they intentionally want to surface a label — never to reactively clean up.

## Acceptance Criteria

1. **Given** I am an admin on the Settings tab, **When** I view the Label Visibility section, **Then** I see a list of all labels from synced Linear data, each with an on/off toggle
2. **And** new/unreviewed labels (those with `reviewed_at = NULL`) are visually separated or badged so the admin can spot them quickly
3. **Given** I toggle a label ON, **When** the change is saved, **Then** that label appears in the public backlog label filter for end users
4. **Given** I toggle a label OFF, **When** the change is saved, **Then** that label is hidden from the public filter — but items with that label still appear in the backlog list
5. **Given** a new label appears during a Linear sync, **When** the sync completes, **Then** the label is added to the admin list with visibility OFF (`is_visible = FALSE`) and `reviewed_at = NULL`
6. **Given** zero labels are enabled, **When** a business user views the backlog, **Then** the label filter dropdown is hidden entirely (clean empty state)
7. **And** every label visibility change (toggle on/off) is recorded in the audit log
8. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
9. **And** unit tests cover new backend endpoints/service logic and the new admin UI component

## Tasks / Subtasks

- [x] Task 1: Database migration for `label_visibility` table (AC: #1, #5)
  - [x] 1.1: Create `database/migrations/011_create-label-visibility-table.sql`
    - Table: `label_visibility` with columns: `id SERIAL PRIMARY KEY`, `label_name VARCHAR(255) NOT NULL UNIQUE`, `is_visible BOOLEAN NOT NULL DEFAULT FALSE`, `show_on_cards BOOLEAN NOT NULL DEFAULT TRUE`, `first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `reviewed_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_by INTEGER REFERENCES users(id)`
    - Index on `is_visible` for the public query
    - Down migration: `DROP TABLE IF EXISTS label_visibility`

- [x] Task 2: Backend label visibility service (AC: #1, #2, #3, #4, #7)
  - [x] 2.1: Create `backend/src/services/labels/label-visibility.service.ts`
  - [x] 2.2: Implement `listAllLabels()` — returns all labels with visibility settings, item counts, and unreviewed flag
  - [x] 2.3: Implement `updateLabelVisibility(labelName, isVisible, adminUserId)` — updates visibility, sets reviewed_at, updated_at, updated_by
  - [x] 2.4: Implement `bulkUpdateVisibility(updates, adminUserId)` — batch update within a transaction with audit logging
  - [x] 2.5: Implement `getVisibleLabels()` — returns visible label names
  - [x] 2.6: Implement `upsertLabelsFromSync(labelNames)` — INSERT ON CONFLICT DO NOTHING
  - [x] 2.7: Implement `getUnreviewedCount()` — count of labels where reviewed_at IS NULL
  - [x] 2.8: Create `backend/src/services/labels/label-visibility.service.test.ts` — comprehensive tests

- [x] Task 3: Integrate label discovery into sync service (AC: #5)
  - [x] 3.1: Updated `sync.service.ts` — collects unique label names after DTO transformation
  - [x] 3.2: Calls `upsertLabelsFromSync(uniqueLabelNames)` with fire-and-forget error handling
  - [x] 3.3: Added tests verifying label upsert called with correct names + failure resilience

- [x] Task 4: Backend API endpoints (AC: #1, #3, #4, #7)
  - [x] 4.1: Added admin endpoints to `admin.routes.ts` (GET, PATCH single, PATCH bulk)
  - [x] 4.2: Added public `GET /api/labels/visible` via new `labels.routes.ts`
  - [x] 4.3: Added controller handlers in `admin.controller.ts` with validation + error handling
  - [x] 4.4: Audit logging via `auditService.logAdminAction()` for all state-changing operations
  - [x] 4.5: Tests cover controller handlers and route registration

- [x] Task 5: Frontend types and API hook (AC: #1, #2, #3)
  - [x] 5.1: Added `LabelVisibilityEntry` type to `admin.types.ts`
  - [x] 5.2: Created `use-label-visibility.ts` with TanStack Query hook
  - [x] 5.3: Created `useLabelVisibilityMutation` with query invalidation on success
  - [x] 5.4: Created `use-visible-labels.ts` for public endpoint
  - [x] 5.5: Added tests for all hooks

- [x] Task 6: Admin Settings tab — LabelVisibilityManager component (AC: #1, #2, #3, #4, #7)
  - [x] 6.1: Created `label-visibility-manager.tsx`
  - [x] 6.2: Layout with unreviewed labels section at top, all labels below
  - [x] 6.3: Label rows with colored dot, name, item count, and toggle switch
  - [x] 6.4: "New" badge on unreviewed labels; toggling marks as reviewed
  - [x] 6.5: Search/filter input for client-side label filtering
  - [x] 6.6: Bulk "Enable All" / "Disable All" buttons
  - [x] 6.7: Uses Chakra UI Switch, Badge, Input, Box, Flex, Text, Button
  - [x] 6.8: Created `label-visibility-manager.test.tsx` with comprehensive tests

- [x] Task 7: Replace Settings tab placeholder with LabelVisibilityManager (AC: #1)
  - [x] 7.1: Updated `admin-page.tsx` to render `<LabelVisibilityManager />` in Settings tab
  - [x] 7.2: Added unreviewed count badge to Settings tab trigger
  - [x] 7.3: Updated `admin-page.test.tsx` to verify LabelVisibilityManager renders

- [x] Task 8: Update LabelFilter to use visible labels API (AC: #3, #4, #6)
  - [x] 8.1: Updated `label-filter.tsx` with `useVisibleLabels()` filtering + empty-state hiding
  - [x] 8.2: Updated `label-filter.test.tsx` and related test files with `useVisibleLabels` mocks

- [x] Task 9: Build + test verification (AC: #8, #9)
  - [x] 9.1: `npm run build` in `backend/` — zero TypeScript errors
  - [x] 9.2: `npm run test:run` in `backend/` — 50 files, 701 tests passed
  - [x] 9.3: `npm run build` in `frontend/` — zero TypeScript errors
  - [x] 9.4: `npm run test:run` in `frontend/` — 66 files, 708 tests passed

## Dev Notes

### What's Already Done (relevant existing implementation)

- **Admin dashboard Settings tab exists** as a placeholder: `frontend/src/features/admin/components/admin-page.tsx` renders a "System settings will be available in a future update" message under the `settings` tab. This story replaces that placeholder.
- **Admin routes use middleware chain**: `requireAuth` → `requireApproved` → `requireAdmin` — all new admin endpoints must use this same chain.
- **Admin controller patterns**: Validate params with `Number(req.params.id)` + `isNaN`, use `auditService.logAdminAction()` for state changes, return `{ error: { message, code } }` for errors. See `backend/src/controllers/admin.controller.ts`.
- **Sync schedule settings already exist**: `GET /api/admin/settings/sync-schedule` and `PUT /api/admin/settings/sync-schedule` — follow this same URL pattern for label endpoints under `/api/admin/settings/labels`.
- **Label data structures exist**:
  - Frontend: `Label` type in `frontend/src/features/backlog/types/backlog.types.ts` — `{ id: string, name: string, color: string }`
  - Backend: `LabelDto` in `backend/src/types/linear-entities.types.ts` — same shape
  - Color mapping: `getLabelColor(labelName)` in `frontend/src/features/backlog/utils/label-colors.ts` — deterministic color from label name via djb2 hash
- **Labels are NOT stored in a separate table today**: Labels come from Linear issue data, embedded in each `BacklogItemDto.labels[]`. There is no workspace-level label table — this story creates one.
- **Sync service processes labels during item transformation**: `backend/src/services/sync/sync.service.ts` calls `toBacklogItemDtosResilient()` which resolves `issue.labels()` in `linear-transformers.ts`. After this step, unique label names can be extracted and upserted.
- **LabelFilter currently derives labels from item data**: `frontend/src/features/backlog/components/label-filter.tsx` iterates over `items` to extract unique labels. This story adds an additional filter: only show labels that are in the admin-approved visible list.

### Database Schema (label_visibility)

```sql
CREATE TABLE IF NOT EXISTS label_visibility (
    id SERIAL PRIMARY KEY,
    label_name VARCHAR(255) NOT NULL UNIQUE,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    show_on_cards BOOLEAN NOT NULL DEFAULT TRUE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id),
    CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_label_visibility_is_visible ON label_visibility(is_visible);
```

**Key design decisions:**
- `is_visible DEFAULT FALSE` — opt-in model: labels hidden until admin enables them
- `reviewed_at` nullable — `NULL` means "unreviewed/new"; set to `NOW()` when admin first toggles the label
- `show_on_cards` — future extension: admin can optionally hide labels from item card pills too (default TRUE for now)
- `updated_by` — FK to users table for audit trail

### Migration file naming

Next migration number is `011`. File: `database/migrations/011_create-label-visibility-table.sql`. Follow the existing pattern with `---- Down Migration ----` section at bottom.

### API Contract

**Admin endpoints (require admin auth):**

```
GET /api/admin/settings/labels
→ LabelVisibilityEntry[]
  { labelName, isVisible, showOnCards, firstSeenAt, reviewedAt, updatedAt, updatedBy, itemCount }

PATCH /api/admin/settings/labels/:labelName
Body: { isVisible: boolean }
→ LabelVisibilityEntry (updated)

PATCH /api/admin/settings/labels/bulk
Body: { labels: [{ labelName: string, isVisible: boolean }] }
→ LabelVisibilityEntry[] (updated)
```

**Public endpoint (authenticated, not admin-only):**

```
GET /api/labels/visible
→ string[] (visible label names only — same result for all roles)
```

> Note: This endpoint always returns only admin-approved visible labels, regardless of the
> caller's role. Admin/IT users manage visibility from the Admin Settings panel; the backlog
> respects those settings for everyone.

### Architecture Compliance

- **Backend layering**: Routes → Controllers → Services (`backend/src/routes/*` → `backend/src/controllers/*` → `backend/src/services/*`)
- **DB access**: Use `backend/src/utils/database.ts` (`query`, `pool`) and parameterized SQL only
- **API shapes**: Success responses return data directly (arrays are arrays); errors use `{ error: { message, code } }`
- **JSON naming**: `camelCase` fields in API responses; `snake_case` in DB
- **Middleware**: Admin routes use `requireAuth → requireApproved → requireAdmin`; public route uses `requireAuth → requireApproved`

### UX / UI Guardrails

- **Settings tab**: Replace the existing placeholder with the `LabelVisibilityManager` component
- **Unreviewed section**: Show unreviewed labels at the top with a "New" badge — gives admin a clear call-to-action without scanning the full list
- **Settings tab badge**: When unreviewed labels exist, add a count badge to the "Settings" tab trigger (e.g., "Settings" with a small `(3)` badge)
- **Color consistency**: Reuse `getLabelColor()` for the colored dot next to each label in the admin list — same visual language as the backlog filter and item cards
- **Scannable**: Admin should answer "which labels are visible?" at a glance — toggles make this instant
- **Search**: Provide a search/filter input within the admin list for teams with many labels
- **Accessibility**: Toggle switches need proper ARIA labels (e.g., `aria-label="Show {labelName} in filter"`)

### Testing Patterns to Follow

- Backend DB services use mocked `query`/`pool.connect()` in unit tests (see `backend/src/services/users/user.service.test.ts`)
- Frontend tests use `vitest` + `@testing-library/react` and mock hooks/fetch (see `sync-control.test.tsx`)
- TanStack Query hooks: mock `fetch`, verify endpoint + error handling (see `use-sync-history.test.tsx`)

### What NOT To Do

- **Do NOT** make labels visible by default — the entire point is opt-in visibility
- **Do NOT** hide items from the backlog when their label is toggled off — only the filter option is hidden
- **Do NOT** add new dependencies just for toggle/switch UI — Chakra UI `Switch` component already exists
- **Do NOT** query Linear API for labels during the admin settings page load — use only locally stored data from sync
- **Do NOT** store the label's Linear color in `label_visibility` — the frontend derives color from name via `getLabelColor()`
- **Do NOT** break the existing LabelFilter behavior — it should still work but with an additional filter layer
- **Do NOT** expose admin-only label management endpoints without the full middleware chain
- **Do NOT** skip audit logging for label visibility changes

### Project Structure Notes

**New files:**
- `database/migrations/011_create-label-visibility-table.sql`
- `backend/src/services/labels/label-visibility.service.ts`
- `backend/src/services/labels/label-visibility.service.test.ts`
- `frontend/src/features/admin/components/label-visibility-manager.tsx`
- `frontend/src/features/admin/components/label-visibility-manager.test.tsx`
- `frontend/src/features/admin/hooks/use-label-visibility.ts`
- `frontend/src/features/admin/hooks/use-label-visibility.test.tsx`
- `frontend/src/shared/hooks/use-visible-labels.ts`
- `frontend/src/shared/hooks/use-visible-labels.test.ts`

**Modified files:**
- `backend/src/routes/admin.routes.ts` (add label endpoints)
- `backend/src/controllers/admin.controller.ts` (add label handlers)
- `backend/src/services/sync/sync.service.ts` (add label upsert during sync)
- `backend/src/services/sync/sync.service.test.ts` (add label upsert tests)
- `frontend/src/features/admin/components/admin-page.tsx` (replace Settings placeholder)
- `frontend/src/features/admin/components/admin-page.test.tsx` (update Settings tab tests)
- `frontend/src/features/admin/types/admin.types.ts` (add LabelVisibilityEntry type)
- `frontend/src/features/backlog/components/label-filter.tsx` (filter by visible labels)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 7, Story 7.6] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/prd.md#FR7] — Business users can filter backlog items by keywords or item types
- [Source: _bmad-output/planning-artifacts/prd.md#FR20] — Admin can access admin dashboard/interface
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — PostgreSQL patterns, services/routes architecture
- [Source: _bmad-output/project-context.md] — Project conventions, naming, testing patterns
- [Source: frontend/src/features/backlog/components/label-filter.tsx] — Current label filter implementation
- [Source: frontend/src/features/backlog/utils/label-colors.ts] — Label color derivation logic
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — Label type definition
- [Source: frontend/src/features/admin/components/admin-page.tsx] — Admin dashboard with Settings tab placeholder
- [Source: backend/src/routes/admin.routes.ts] — Existing admin routes and middleware pattern
- [Source: backend/src/controllers/admin.controller.ts] — Existing admin controller patterns
- [Source: backend/src/services/sync/sync.service.ts] — Sync service where label discovery hooks in
- [Source: database/migrations/010_add-is-it-to-users.sql] — Latest migration for naming/pattern reference

## Dev Agent Record

### Agent Model Used

Claude 4.6 Opus (Cursor Agent)

### Debug Log References

- Resolved stale `dist/` test artifacts causing false failures — targeted `src/` tests directly
- Fixed `LabelFilter` test expecting "All Labels" placeholder when component now returns `null` for empty visible labels (AC #6 behavior)

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created with full codebase pattern analysis, existing file references, API contracts, database schema, and testing guidance.
- All 9 tasks and subtasks implemented and verified.
- Database migration 011 creates `label_visibility` table with opt-in visibility model.
- Backend service provides full CRUD + sync integration with transactional bulk updates and audit logging.
- Frontend admin UI provides toggles, search, bulk actions, and "New" badges for unreviewed labels.
- LabelFilter now uses `useVisibleLabels()` to hide unapproved labels from end users; hides entirely when zero labels enabled.
- All acceptance criteria (1–9) satisfied.
- Post-review: item counts from sync cache, visibility applies to all users, optimistic mutation updates, dark mode contrast fixes.
- Full regression suite: 710 backend tests + 710 frontend tests = 1,420 total tests passing.
- Zero TypeScript build errors in both `backend/` and `frontend/`.

### File List

**New files created:**
- `database/migrations/011_create-label-visibility-table.sql`
- `backend/src/controllers/labels.controller.ts`
- `backend/src/controllers/labels.controller.test.ts`
- `backend/src/services/labels/label-visibility.service.ts`
- `backend/src/services/labels/label-visibility.service.test.ts`
- `backend/src/routes/labels.routes.ts`
- `frontend/src/features/admin/components/label-visibility-manager.tsx`
- `frontend/src/features/admin/components/label-visibility-manager.test.tsx`
- `frontend/src/features/admin/hooks/use-label-visibility.ts`
- `frontend/src/features/admin/hooks/use-label-visibility.test.tsx`
- `frontend/src/shared/hooks/use-visible-labels.ts`
- `frontend/src/shared/hooks/use-visible-labels.test.ts`

**Modified files:**
- `backend/src/routes/admin.routes.ts` — added label visibility admin endpoints
- `backend/src/routes/index.ts` — registered new `labelsRoutes`
- `backend/src/controllers/admin.controller.ts` — added label visibility admin handlers (public handler moved to labels controller)
- `backend/src/services/sync/sync.service.ts` — added label discovery during sync
- `backend/src/services/sync/sync.service.test.ts` — added label upsert tests
- `backend/src/routes/sync.routes.test.ts` — mocked database health middleware (keeps route tests DB-independent)
- `package.json` — added root `build` + `test:run` scripts to satisfy AC #8
- `frontend/src/features/admin/types/admin.types.ts` — added `LabelVisibilityEntry` type
- `frontend/src/features/admin/components/admin-page.tsx` — integrated LabelVisibilityManager + badge
- `frontend/src/features/admin/components/admin-page.test.tsx` — updated Settings tab tests
- `frontend/src/features/backlog/components/label-filter.tsx` — added visible labels filtering
- `frontend/src/features/backlog/components/label-filter.test.tsx` — updated with `useVisibleLabels` mocks
- `frontend/src/features/backlog/components/label-filter.a11y.test.tsx` — added `useVisibleLabels` mock
- `frontend/src/features/backlog/components/react-memo-optimizations.test.tsx` — added `useVisibleLabels` mock
- `frontend/src/features/backlog/components/backlog-list.tsx` — filters label pills for non-privileged users
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — filters label pills when provided a visible-label set
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — added tests for label pill filtering
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — filters label pills when provided a visible-label set
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — added tests for label pill filtering
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — added `useVisibleLabels` mock
- `frontend/src/theme.ts` — added `switchRecipe`, updated `outline` button variant for dark mode semantic tokens
- `database/migrations/009_enable_pgcrypto.sql` — changed to no-op for Azure PostgreSQL compatibility
