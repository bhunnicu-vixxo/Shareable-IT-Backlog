# Story 7.6: Admin Label Visibility Configuration

Linear Issue ID: VIX-428
Status: ready-for-dev

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

- [ ] Task 1: Define label visibility configuration model
  - [ ] 1.1: Decide config shape (e.g., hidden label IDs, hidden label names, or both)
  - [ ] 1.2: Store config in existing settings store (db-backed preferred)
  - [ ] 1.3: Add API endpoint(s) to read/update config (admin-only)

- [ ] Task 2: Admin UI for configuration
  - [ ] 2.1: Add admin screen/section to manage label visibility
  - [ ] 2.2: Provide search + multi-select UX for labels
  - [ ] 2.3: Save + confirmation toast, handle errors cleanly

- [ ] Task 3: Apply visibility rules in backlog UI
  - [ ] 3.1: Filter labels in `backlog-item-card.tsx` for regular users
  - [ ] 3.2: Filter labels in `item-detail-modal.tsx` for regular users
  - [ ] 3.3: Ensure privileged users see unfiltered labels

- [ ] Task 4: Tests
  - [ ] 4.1: Add tests for label filtering on card for regular vs privileged
  - [ ] 4.2: Add tests for label filtering in modal for regular vs privileged
  - [ ] 4.3: Add tests for admin config save/load behavior (where applicable)

## Dev Notes

- This story is about **visibility**, not changing labels in Linear.
- Prefer filtering by **label id** if available to avoid name collisions/renames.

## Dev Agent Record

### Agent Model Used

TBD

### Completion Notes List

- TBD

### File List

- TBD

### Change Log

- **2026-02-14:** Drafted story file for upcoming admin label visibility configuration.

# Story 7.6: Admin Label Visibility Configuration

Linear Issue ID: VIX-428
Status: ready-for-dev

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

- [ ] Task 1: Database migration for `label_visibility` table (AC: #1, #5)
  - [ ] 1.1: Create `database/migrations/011_create-label-visibility-table.sql`
    - Table: `label_visibility` with columns: `id SERIAL PRIMARY KEY`, `label_name VARCHAR(255) NOT NULL UNIQUE`, `is_visible BOOLEAN NOT NULL DEFAULT FALSE`, `show_on_cards BOOLEAN NOT NULL DEFAULT TRUE`, `first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `reviewed_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_by INTEGER REFERENCES users(id)`
    - Index on `is_visible` for the public query
    - Down migration: `DROP TABLE IF EXISTS label_visibility`

- [ ] Task 2: Backend label visibility service (AC: #1, #2, #3, #4, #7)
  - [ ] 2.1: Create `backend/src/services/labels/label-visibility.service.ts`
  - [ ] 2.2: Implement `listAllLabels()` — returns all labels with visibility settings, item counts, and unreviewed flag. Query: `SELECT lv.*, COUNT(...)` joining against cached item data or a subquery. Return `LabelVisibilityEntry[]` with `camelCase` mapping
  - [ ] 2.3: Implement `updateLabelVisibility(labelName, isVisible, adminUserId)` — updates `is_visible`, sets `reviewed_at = NOW()` if previously NULL, sets `updated_at = NOW()`, sets `updated_by`
  - [ ] 2.4: Implement `bulkUpdateVisibility(updates: {labelName, isVisible}[], adminUserId)` — batch update within a transaction
  - [ ] 2.5: Implement `getVisibleLabels()` — returns just visible label names: `SELECT label_name FROM label_visibility WHERE is_visible = TRUE ORDER BY label_name`
  - [ ] 2.6: Implement `upsertLabelsFromSync(labelNames: string[])` — for each label, `INSERT ... ON CONFLICT (label_name) DO NOTHING` (new labels get `is_visible = FALSE`, existing labels are untouched)
  - [ ] 2.7: Implement `getUnreviewedCount()` — `SELECT COUNT(*) FROM label_visibility WHERE reviewed_at IS NULL`
  - [ ] 2.8: Create `backend/src/services/labels/label-visibility.service.test.ts` — mock `query`/`pool.connect()` following the pattern in `user.service.test.ts`

- [ ] Task 3: Integrate label discovery into sync service (AC: #5)
  - [ ] 3.1: Update `backend/src/services/sync/sync.service.ts` — after `toBacklogItemDtosResilient()` completes, collect all unique label names from the DTOs
  - [ ] 3.2: Call `labelVisibilityService.upsertLabelsFromSync(uniqueLabelNames)` to persist newly discovered labels
  - [ ] 3.3: Add tests to `sync.service.test.ts` verifying label upsert is called with correct label names

- [ ] Task 4: Backend API endpoints (AC: #1, #3, #4, #7)
  - [ ] 4.1: Add admin endpoints to `backend/src/routes/admin.routes.ts`:
    - `GET /api/admin/settings/labels` → `getLabels` handler
    - `PATCH /api/admin/settings/labels/:labelName` → `updateLabel` handler
    - `PATCH /api/admin/settings/labels/bulk` → `bulkUpdateLabels` handler
  - [ ] 4.2: Add public endpoint to `backend/src/routes/` (new file or existing):
    - `GET /api/labels/visible` → returns visible label names (authenticated but not admin-only)
  - [ ] 4.3: Add controller handlers in `backend/src/controllers/admin.controller.ts`:
    - `getLabels`: call `listAllLabels()`, return array directly
    - `updateLabel`: validate `labelName` param, call `updateLabelVisibility()`, audit log, return updated entry
    - `bulkUpdateLabels`: validate body `{ labels: [{labelName, isVisible}] }`, call `bulkUpdateVisibility()`, audit log, return updated entries
  - [ ] 4.4: Use `auditService.logAdminAction()` for all state-changing label operations
  - [ ] 4.5: Add tests in `backend/src/routes/admin.routes.test.ts` and `backend/src/controllers/admin.controller.test.ts`

- [ ] Task 5: Frontend types and API hook (AC: #1, #2, #3)
  - [ ] 5.1: Add types to `frontend/src/features/admin/types/admin.types.ts`:
    - `LabelVisibilityEntry`: `{ labelName, isVisible, showOnCards, firstSeenAt, reviewedAt, updatedAt, updatedBy, itemCount }`
  - [ ] 5.2: Create `frontend/src/features/admin/hooks/use-label-visibility.ts`:
    - TanStack Query hook fetching `GET /api/admin/settings/labels` with `credentials: 'include'`
    - Returns `{ labels, unreviewedCount, isLoading, error, refetch }`
  - [ ] 5.3: Create mutation hook `useLabelVisibilityMutation` for `PATCH` calls
    - On success: invalidate the `admin-labels` query key AND the `visible-labels` public query key
  - [ ] 5.4: Create `frontend/src/shared/hooks/use-visible-labels.ts`:
    - TanStack Query hook fetching `GET /api/labels/visible` (public endpoint)
    - Returns `{ visibleLabels: string[], isLoading }`
  - [ ] 5.5: Add tests for hooks

- [ ] Task 6: Admin Settings tab — LabelVisibilityManager component (AC: #1, #2, #3, #4, #7)
  - [ ] 6.1: Create `frontend/src/features/admin/components/label-visibility-manager.tsx`
  - [ ] 6.2: Layout: Two sections — "Unreviewed Labels" (if any) at top, "All Labels" below
  - [ ] 6.3: Each label row: colored dot (reuse `getLabelColor`), label name, item count, toggle switch
  - [ ] 6.4: Unreviewed labels get a "New" badge; toggling any label marks it as reviewed
  - [ ] 6.5: Search/filter input to find labels by name (client-side filtering)
  - [ ] 6.6: Bulk actions: "Enable All" / "Disable All" buttons
  - [ ] 6.7: Use Chakra UI components: `Switch`, `Badge`, `Input`, `Box`, `Flex`, `Text`, `Button`
  - [ ] 6.8: Create `frontend/src/features/admin/components/label-visibility-manager.test.tsx`

- [ ] Task 7: Replace Settings tab placeholder with LabelVisibilityManager (AC: #1)
  - [ ] 7.1: Update `frontend/src/features/admin/components/admin-page.tsx`:
    - Import and render `<LabelVisibilityManager />` in the Settings tab content (replace the placeholder VStack)
  - [ ] 7.2: Add unreviewed count badge to Settings tab trigger (e.g., "Settings (3)" or a small Badge next to the text)
  - [ ] 7.3: Update `admin-page.test.tsx` to verify LabelVisibilityManager renders in Settings tab

- [ ] Task 8: Update LabelFilter to use visible labels API (AC: #3, #4, #6)
  - [ ] 8.1: Update `frontend/src/features/backlog/components/label-filter.tsx`:
    - Fetch visible labels via `useVisibleLabels()` hook
    - Filter `labelOptions` to only include labels that are in the visible list
    - If `visibleLabels` is empty (or loading), hide the filter entirely
  - [ ] 8.2: Update `frontend/src/features/backlog/components/label-filter.test.tsx` (or create if missing) to verify filtering behavior

- [ ] Task 9: Build + test verification (AC: #8, #9)
  - [ ] 9.1: Run `npm run build` in `backend/`
  - [ ] 9.2: Run `npm run test:run` in `backend/`
  - [ ] 9.3: Run `npm run build` in `frontend/`
  - [ ] 9.4: Run `npm run test:run` in `frontend/`

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
→ string[] (visible label names)
```

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

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created with full codebase pattern analysis, existing file references, API contracts, database schema, and testing guidance.

### File List
