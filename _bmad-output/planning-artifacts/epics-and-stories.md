---
stepsCompleted: ['step-01-validate-prerequisites']
inputDocuments: 
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
linearProjectUrl: 'https://linear.app/vixxo/project/shareable-it-backlog-51d08bd393fa/issues'
---

# Shareable Linear Backlog - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Shareable Linear Backlog, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories ready for Linear import.

## Requirements Inventory

### Functional Requirements (25 Total)

**Backlog Visibility & Display:**
- **FR1:** Business users can view Linear backlog items in list format
- **FR2:** Business users can see the priority/stack rank of items
- **FR3:** Business users can view detailed information for any backlog item
- **FR4:** System can flag new items that need prioritization discussion
- **FR5:** Business users can filter to see only new items requiring discussion

**Filtering & Search:**
- **FR6:** Business users can filter backlog items by business unit/department
- **FR7:** Business users can filter backlog items by keywords or item types
- **FR8:** Business users can sort backlog items by priority, date, or status
- **FR9:** Users see guidance message indicating no results found with suggestions to adjust filters or check business unit assignment

**Data Synchronization:**
- **FR10:** System can automatically sync Linear backlog data on a scheduled basis (1-2x daily)
- **FR11:** Admin can manually trigger a sync to refresh Linear data on-demand
- **FR12:** Users can see when data was last synced from Linear
- **FR13:** System displays error message within 5 seconds of sync failure with error code, timestamp of last successful sync, and retry option
- **FR14:** System handles cases where Linear API is unavailable
- **FR15:** System handles partial sync failures (some data updates, some doesn't)

**User Management & Access Control:**
- **FR16:** Admin can approve users who can access the tool
- **FR17:** Admin can remove or disable user access
- **FR18:** System verifies user is on Vixxo network before allowing access
- **FR19:** System verifies user is approved by admin before allowing access
- **FR20:** Admin can access admin dashboard/interface
- **FR21:** Admin can view list of approved users
- **FR22:** Admin can view sync status and history

**Item Information Access:**
- **FR23:** Business users can see updates and notes from IT team on items
- **FR24:** Business users can read comments from Linear on items
- **FR25:** System handles cases where a user tries to access an item that no longer exists

### Non-Functional Requirements

**Performance:**
- Initial page load completes within 2 seconds
- Filtering operations complete within 500ms
- User interactions respond within 100ms
- Navigation transitions complete within 300ms

**Security:**
- Network-based access control (Vixxo network/VPN verification)
- User approval workflow (admin must approve users)
- Dual verification: Network access + Admin approval required
- Secure authentication for admin functions
- Data encrypted in transit (HTTPS)
- Data encrypted at rest (database encryption)
- Secure storage of Linear API credentials
- Protection of user access credentials
- Audit logging of user access (who accessed what, when)
- Audit logging of admin actions (user approvals, removals, sync triggers)
- Data retention policy for audit logs
- Compliance with internal security policies

**Accessibility:**
- WCAG 2.1 Level A minimum compliance
- Keyboard navigation support for all interactive elements
- Screen reader basics (semantic HTML, ARIA labels where needed)
- Basic accessibility testing required

**Integration:**
- Reliable connection to Linear GraphQL API
- Error handling for API unavailability
- Rate limit handling strategy
- Partial sync failure recovery
- API error recovery with retry logic and exponential backoff
- Automatic sync executes successfully 95% of the time
- Manual sync available as fallback for failed automatic syncs
- Sync status visibility for users and admins
- Error messages include error code, timestamp, and retry option when sync fails

**Reliability:**
- 99% uptime during business hours (not 24/7)
- System displays cached data with freshness indicator when Linear API is unavailable
- Error recovery mechanisms for common failure scenarios
- 100% of Linear items visible in tool (when sync successful)
- 0% data corruption
- Sync verification and validation

### Additional Requirements from Architecture

**Project Setup:**
- Frontend: Vite + React + TypeScript initialization
- Backend: Express + TypeScript initialization
- TypeScript configured with strict mode
- Modern ES2020+ target
- Node.js 20.19+ or 22.12+ runtime
- Development environment setup (HMR, debugging, environment variables)
- Production build configuration

**Database:**
- PostgreSQL database setup
- Schema design for user preferences, admin settings, audit logs
- Data migration strategy
- Backup and recovery procedures

**API Design:**
- REST API endpoints for frontend consumption
- Linear GraphQL API integration layer
- Error handling middleware
- Request/response validation
- API documentation

**Deployment:**
- Internal deployment configuration (Vixxo network)
- Environment configuration management
- Build and deployment pipeline

### Additional Requirements from UX Design

**Design System:**
- Chakra UI integration and customization
- Vixxo brand color system implementation (Green #8E992E, Gray #3E4543, Teal #2C7B80, Yellow #EDA200, Blue #395389, Copper #956125)
- Arial typography system
- 4px spacing scale
- Component theme customization

**Custom Components:**
- StackRankBadge component (priority visualization)
- BacklogItemCard component (item display)
- SyncStatusIndicator component (sync status display)
- BusinessUnitFilter component (filtering interface)
- EmptyStateWithGuidance component (empty states with helpful messages)

**Visual Design:**
- Desktop-first responsive design
- Chakra UI breakpoints (base: 0px, sm: 480px, md: 768px, lg: 992px, xl: 1280px, 2xl: 1536px)
- Visual hierarchy for priority scanning
- Scannable list layouts
- Loading states and skeleton screens
- Error states with guidance

**Accessibility Implementation:**
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus management
- Color contrast compliance (WCAG Level A)

## Epic List

1. **Project Foundation & Setup** - Initialize development environment, project structure, and core infrastructure
2. **Linear API Integration** - Build reliable connection to Linear GraphQL API with sync orchestration
3. **Backlog Display & Visualization** - Core backlog list view with priority visualization
4. **Filtering & Search** - Business unit filtering, keyword search, and sorting capabilities
5. **Item Detail Views** - Detailed item information display with updates and comments
6. **Data Synchronization** - Automatic and manual sync with error handling and status visibility
7. **User Management & Access Control** - Admin dashboard, user approval workflow, and network-based access
8. **Design System & UI Components** - Chakra UI integration, custom components, and visual design implementation
9. **Performance & Optimization** - Performance targets, caching, and optimization strategies
10. **Security & Audit** - Security implementation, audit logging, and compliance
11. **Accessibility & Testing** - WCAG compliance, keyboard navigation, and accessibility testing
12. **Deployment & Operations** - Deployment configuration, monitoring, and operational readiness

## Epic 1: Project Foundation & Setup

**Goal:** Establish the development environment, project structure, and core infrastructure needed to build the Shareable Linear Backlog application. This epic includes frontend and backend initialization, database setup, and development tooling configuration.

**FR Coverage:** Foundation for all FRs

### Story 1.1: Initialize Frontend Project (Vite + React + TypeScript)

As a developer,
I want a properly configured frontend project with Vite, React, and TypeScript,
So that I can build the SPA frontend with modern tooling and fast development experience.

**Acceptance Criteria:**

**Given** the project workspace is ready
**When** I run the frontend initialization commands
**Then** a Vite + React + TypeScript project is created with TypeScript strict mode enabled
**And** the project structure follows React best practices
**And** HMR (Hot Module Replacement) works in development
**And** production build configuration is optimized

**Technical Details:**
- Use `npm create vite@latest frontend -- --template react-ts`
- Configure TypeScript with strict mode
- Set ES2020+ target
- Verify Node.js 20.19+ or 22.12+ compatibility

### Story 1.2: Initialize Backend Project (Express + TypeScript)

As a developer,
I want a properly configured backend project with Express and TypeScript,
So that I can build the API service with type safety and modern Node.js practices.

**Acceptance Criteria:**

**Given** the project workspace is ready
**When** I run the backend initialization commands
**Then** an Express + TypeScript project is created with proper project structure
**And** TypeScript is configured with strict mode
**And** development server supports hot reloading
**And** production build configuration is set up

**Technical Details:**
- Use express-generator-typescript or manual setup
- Configure TypeScript with strict mode
- Set up ts-node and nodemon for development
- Structure: routes, controllers, services organization

### Story 1.3: Set Up PostgreSQL Database

As a developer,
I want a PostgreSQL database configured with initial schema,
So that I can store user preferences, admin settings, and audit logs.

**Acceptance Criteria:**

**Given** PostgreSQL is available
**When** I run database setup scripts
**Then** database is created with proper schema for users, preferences, admin settings, and audit logs
**And** migration system is configured
**And** connection pooling is set up
**And** environment variables are configured for database connection

**Technical Details:**
- Create schema for: users, user_preferences, admin_settings, audit_logs, sync_history
- Set up migration tooling (e.g., node-pg-migrate or Prisma)
- Configure connection pooling
- Set up environment variable management

### Story 1.4: Configure Development Environment

As a developer,
I want a fully configured development environment,
So that I can develop efficiently with debugging, environment variables, and proper tooling.

**Acceptance Criteria:**

**Given** frontend and backend projects are initialized
**When** I start the development environment
**Then** both frontend and backend servers start with HMR enabled
**And** environment variables are loaded from .env files
**And** debugging is configured for VS Code
**And** linting and formatting tools are configured
**And** path aliases are set up for cleaner imports

**Technical Details:**
- Configure .env files for development
- Set up VS Code launch.json for debugging
- Configure ESLint and Prettier
- Set up path aliases (@/components, @/utils, etc.)

## Epic 2: Linear API Integration

**Goal:** Build a reliable, robust integration with Linear GraphQL API that handles rate limits, errors, and provides a clean abstraction layer for the rest of the application.

**FR Coverage:** FR10, FR11, FR12, FR13, FR14, FR15

### Story 2.1: Implement Linear GraphQL Client

As a developer,
I want a Linear GraphQL client that can query Linear's API,
So that I can fetch backlog data reliably.

**Acceptance Criteria:**

**Given** Linear API credentials are configured
**When** the application queries Linear GraphQL API
**Then** queries execute successfully with proper authentication
**And** responses are parsed and validated
**And** GraphQL errors are handled gracefully
**And** rate limit headers are tracked

**Technical Details:**
- Use GraphQL client library (e.g., graphql-request or Apollo Client)
- Implement authentication with Linear API key
- Set up query/mutation definitions
- Handle GraphQL errors and network errors

### Story 2.2: Implement Rate Limit Handling

As a developer,
I want rate limit handling for Linear API calls,
So that the application respects Linear's rate limits and avoids API throttling.

**Acceptance Criteria:**

**Given** Linear API has rate limits
**When** the application makes API calls
**Then** rate limit headers are monitored
**And** requests are throttled when approaching limits
**And** exponential backoff is applied when rate limited
**And** rate limit status is logged for monitoring

**Technical Details:**
- Parse rate limit headers from Linear responses
- Implement token bucket or sliding window rate limiting
- Add exponential backoff on 429 responses
- Log rate limit status for observability

### Story 2.3: Implement Error Handling and Retry Logic

As a developer,
I want robust error handling with retry logic for Linear API calls,
So that transient failures don't break the sync process.

**Acceptance Criteria:**

**Given** Linear API may experience transient failures
**When** an API call fails
**Then** retry logic is applied with exponential backoff
**And** non-retryable errors (4xx) are handled differently than retryable errors (5xx, network)
**And** error details are logged with context
**And** maximum retry attempts are enforced

**Technical Details:**
- Implement exponential backoff (e.g., 1s, 2s, 4s, 8s)
- Distinguish between retryable and non-retryable errors
- Set maximum retry attempts (e.g., 3-5 retries)
- Log errors with full context for debugging

### Story 2.4: Implement Linear Data Models and TypeScript Types

As a developer,
I want TypeScript types for Linear data models,
So that I have type safety when working with Linear data throughout the application.

**Acceptance Criteria:**

**Given** Linear GraphQL schema is available
**When** I work with Linear data in the codebase
**Then** TypeScript types are defined for all Linear entities (Issues, Projects, Teams, etc.)
**And** type safety is enforced throughout the application
**And** GraphQL queries return properly typed data

**Technical Details:**
- Generate TypeScript types from Linear GraphQL schema
- Define interfaces for: Issue, Project, Team, User, Comment, etc.
- Use code generation tooling if available (GraphQL Code Generator)
- Ensure types match Linear's actual schema

## Epic 3: Backlog Display & Visualization

**Goal:** Build the core backlog list view that displays Linear items with priority visualization, enabling business users to quickly scan and understand the IT backlog.

**FR Coverage:** FR1, FR2, FR3, FR4, FR5

### Story 3.1: Implement Backlog List View Component

As a business user,
I want to view Linear backlog items in a list format,
So that I can see all IT backlog items in one place.

**Acceptance Criteria:**

**Given** Linear data has been synced
**When** I navigate to the backlog view
**Then** backlog items are displayed in a scannable list format
**And** each item shows title, priority, status, and business unit
**And** the list is paginated or virtualized for performance
**And** items are sorted by priority by default

**Technical Details:**
- Use Chakra UI List or Table component
- Implement virtual scrolling or pagination for large lists
- Display: title, priority number, status badge, business unit tag
- Default sort: priority (ascending)

### Story 3.2: Implement Priority/Stack Rank Visualization

As a business user,
I want to see the priority/stack rank of items clearly,
So that I can understand what IT is prioritizing.

**Acceptance Criteria:**

**Given** backlog items have priority/stack rank values
**When** I view the backlog list
**Then** priority is displayed using StackRankBadge component
**And** priority numbers are clearly visible and scannable
**And** visual hierarchy emphasizes higher priority items
**And** priority is the primary sort indicator

**Technical Details:**
- Implement StackRankBadge custom component
- Use Vixxo Green (#8E992E) for primary priority indicators
- Ensure numbers are large and readable
- Visual hierarchy: larger badges for higher priority

### Story 3.3: Implement New Item Flagging

As a business user,
I want to see which items are new and need prioritization discussion,
So that I can focus on items requiring attention.

**Acceptance Criteria:**

**Given** items can be flagged as new
**When** I view the backlog list
**Then** new items are visually flagged with indicators
**And** I can filter to see only new items (FR5)
**And** new item indicators are clear but not overwhelming

**Technical Details:**
- Add "new" flag to item data model
- Visual indicator: badge, icon, or highlight
- Use Vixxo Yellow (#EDA200) for attention/flagging
- Implement filter for new items only

### Story 3.4: Implement Item Detail View

As a business user,
I want to view detailed information for any backlog item,
So that I can understand the full context of an item.

**Acceptance Criteria:**

**Given** I am viewing the backlog list
**When** I click on an item
**Then** a detail view/modal opens showing full item information
**And** the detail view shows: title, description, status, priority, business unit, updates, notes, comments
**And** the detail view is accessible via keyboard navigation
**And** I can close the detail view and return to the list

**Technical Details:**
- Implement modal or side panel for detail view
- Display all item fields from Linear
- Use Chakra UI Modal or Drawer component
- Ensure keyboard accessibility (ESC to close, focus trap)

## Epic 4: Filtering & Search

**Goal:** Enable business users to quickly find relevant backlog items through filtering by business unit, keyword search, and sorting capabilities.

**FR Coverage:** FR5, FR6, FR7, FR8, FR9

### Story 4.1: Implement Business Unit Filter

As a business user,
I want to filter backlog items by business unit/department,
So that I can see only items relevant to my department.

**Acceptance Criteria:**

**Given** backlog items have business unit assignments
**When** I select a business unit from the filter dropdown
**Then** the list updates instantly (<500ms) showing only items for that business unit
**And** the filter selection is visually indicated
**And** I can clear the filter to see all items
**And** the filter persists during my session

**Technical Details:**
- Implement BusinessUnitFilter custom component
- Use Chakra UI Select or Menu component
- Client-side filtering for instant response (<500ms)
- Store filter state in component state or URL params
- Visual feedback: highlight selected filter

### Story 4.2: Implement Keyword Search

As a business user,
I want to search backlog items by keywords,
So that I can find specific items quickly.

**Acceptance Criteria:**

**Given** backlog items have titles and descriptions
**When** I type keywords in the search box
**Then** search results update as I type (debounced)
**Then** search completes within 500ms
**And** search matches item titles, descriptions, and other searchable fields
**And** search highlights matching terms
**And** I can clear the search

**Technical Details:**
- Implement search input with debouncing (300-500ms)
- Client-side search for instant results
- Search across: title, description, business unit, status
- Highlight matching terms in results
- Use Chakra UI Input component

### Story 4.3: Implement Sorting

As a business user,
I want to sort backlog items by priority, date, or status,
So that I can view items in the order most useful to me.

**Acceptance Criteria:**

**Given** backlog items have sortable attributes
**When** I select a sort option (priority, date, status)
**Then** the list re-sorts instantly (<500ms)
**And** the current sort is visually indicated
**And** sort direction (ascending/descending) can be toggled
**And** sort preference persists during my session

**Technical Details:**
- Implement sort dropdown/buttons
- Sort options: priority (default), date created, date updated, status
- Toggle ascending/descending
- Client-side sorting for performance
- Visual indicator: arrow icons, active state

### Story 4.4: Implement Empty State with Guidance

As a business user,
I want helpful guidance when filters return no results,
So that I understand why no items are shown and how to adjust my filters.

**Acceptance Criteria:**

**Given** I have applied filters that return no results
**When** the filtered list is empty
**Then** an EmptyStateWithGuidance component is displayed
**And** the message explains why no results were found
**And** suggestions are provided to adjust filters or check business unit assignment
**And** I can easily clear filters from the empty state

**Technical Details:**
- Implement EmptyStateWithGuidance custom component
- Show contextual messages based on active filters
- Provide actionable suggestions
- Include "Clear filters" button
- Use Chakra UI EmptyState patterns

## Epic 5: Item Detail Views

**Goal:** Provide comprehensive item detail views that show all relevant information from Linear, including updates, notes, and comments.

**FR Coverage:** FR3, FR23, FR24, FR25

### Story 5.1: Display Item Updates and Notes from IT

As a business user,
I want to see updates and notes from the IT team on items,
So that I can understand the current status and progress.

**Acceptance Criteria:**

**Given** Linear items have updates and notes from IT
**When** I view an item detail
**Then** updates and notes are displayed in chronological order
**And** each update shows timestamp and author
**And** updates are formatted for readability
**And** technical jargon is minimized or explained

**Technical Details:**
- Parse Linear issue updates/history
- Display in timeline or list format
- Show: timestamp, author, content
- Format dates/times in user-friendly format
- Use Chakra UI Text, Box components

### Story 5.2: Display Comments from Linear

As a business user,
I want to read comments from Linear on items,
So that I can see stakeholder discussions and context.

**Acceptance Criteria:**

**Given** Linear items have comments
**When** I view an item detail
**Then** comments are displayed in chronological order
**And** each comment shows author, timestamp, and content
**And** comments are formatted for readability
**And** long comment threads are easy to navigate

**Technical Details:**
- Parse Linear issue comments
- Display in threaded or chronological format
- Show: author avatar/name, timestamp, content
- Format markdown if Linear supports it
- Use Chakra UI Comment/Thread components or custom

### Story 5.3: Handle Deleted/Missing Items

As a business user,
I want clear feedback when an item no longer exists,
So that I understand why I can't access it.

**Acceptance Criteria:**

**Given** a user tries to access an item that was deleted
**When** the item detail view is requested
**Then** an error message is displayed explaining the item no longer exists
**And** a link/button is provided to return to the backlog list
**And** the error message is user-friendly (not technical)

**Technical Details:**
- Handle 404 or "not found" errors from API
- Display user-friendly error message
- Provide navigation back to list
- Use Chakra UI Alert or custom error component

## Epic 6: Data Synchronization

**Goal:** Implement reliable automatic and manual sync from Linear with error handling, status visibility, and graceful degradation.

**FR Coverage:** FR10, FR11, FR12, FR13, FR14, FR15

### Story 6.1: Implement Scheduled Automatic Sync

As a system,
I want to automatically sync Linear data on a schedule,
So that data stays current without manual intervention.

**Acceptance Criteria:**

**Given** automatic sync is configured
**When** the scheduled time arrives (1-2x daily)
**Then** sync process executes automatically
**And** Linear API is queried for latest data
**And** database is updated with new data
**And** sync status is logged
**And** sync success rate meets 95% target

**Technical Details:**
- Use cron job or scheduled task (node-cron)
- Schedule: 1-2x daily (configurable)
- Query Linear GraphQL API for all issues
- Update database with latest data
- Log sync start, completion, errors
- Store sync history in database

### Story 6.2: Implement Manual Sync Trigger

As an admin,
I want to manually trigger a sync to refresh Linear data,
So that I can ensure data is current before important meetings.

**Acceptance Criteria:**

**Given** I am an admin user
**When** I click "Sync Now" button in admin dashboard
**Then** sync process starts immediately
**And** sync progress is indicated (loading state)
**Then** sync completes and status is displayed
**And** I can see when sync finished and if it succeeded

**Technical Details:**
- Add "Sync Now" button to admin dashboard
- Trigger sync API endpoint
- Show loading state during sync
- Display success/error status after completion
- Use Chakra UI Button, Spinner, Alert components

### Story 6.3: Display Sync Status to Users

As a business user,
I want to see when data was last synced from Linear,
So that I know how current the information is.

**Acceptance Criteria:**

**Given** data has been synced from Linear
**When** I view the backlog
**Then** sync status is displayed showing "Last synced: [timestamp]"
**And** timestamp is formatted in user-friendly format (e.g., "2 hours ago")
**And** sync status is visible but not intrusive

**Technical Details:**
- Store last sync timestamp in database
- Display in header or footer of backlog view
- Format timestamp: "2 hours ago", "Yesterday", "Jan 15, 2026"
- Use relative time formatting (e.g., date-fns formatDistance)
- Use Chakra UI Text component with subtle styling

### Story 6.4: Implement Sync Error Handling and Messages

As a user,
I want clear error messages when sync fails,
So that I understand what went wrong and what to do.

**Acceptance Criteria:**

**Given** a sync operation fails
**When** sync error occurs
**Then** error message is displayed within 5 seconds
**And** error message includes: error code, timestamp of last successful sync, retry option
**And** error message is user-friendly (not technical jargon)
**And** admin sees more detailed error information

**Technical Details:**
- Catch sync errors at API level
- Format error messages for users vs admins
- Include: error code, last successful sync time, retry button
- Use Chakra UI Alert component for errors
- Log detailed errors for admin debugging

### Story 6.5: Handle Linear API Unavailability

As a system,
I want to handle cases where Linear API is unavailable,
So that the application continues to function with cached data.

**Acceptance Criteria:**

**Given** Linear API is unavailable
**When** sync is attempted
**Then** sync failure is detected
**And** cached data continues to be displayed
**And** freshness indicator shows data may be stale
**And** error message explains Linear API is unavailable
**And** retry option is provided

**Technical Details:**
- Detect API unavailability (network errors, 5xx responses)
- Continue serving cached data from database
- Display freshness warning: "Data may be stale - Linear API unavailable"
- Provide retry mechanism
- Log API availability status

### Story 6.6: Handle Partial Sync Failures

As a system,
I want to handle cases where some data updates successfully and some doesn't,
So that partial failures don't corrupt the entire dataset.

**Acceptance Criteria:**

**Given** a sync operation encounters partial failures
**When** some items sync successfully and some fail
**Then** successfully synced items are saved to database
**And** failed items are logged with error details
**And** sync status indicates partial success
**And** admin can see which items failed to sync

**Technical Details:**
- Process items individually or in batches
- Continue processing even if some items fail
- Log failures with item IDs and error details
- Update sync history with partial success status
- Admin dashboard shows sync failure details

## Epic 7: User Management & Access Control

**Goal:** Implement admin dashboard for user management, user approval workflow, and network-based access control with dual verification.

**FR Coverage:** FR16, FR17, FR18, FR19, FR20, FR21, FR22

### Story 7.1: Implement Network-Based Access Verification

As a system,
I want to verify users are on Vixxo network before allowing access,
So that only authorized network users can access the tool.

**Acceptance Criteria:**

**Given** a user attempts to access the application
**When** access is requested
**Then** system verifies user is on Vixxo network/VPN
**And** network verification happens before any other checks
**And** users not on network see "Access denied - Vixxo network required" message

**Technical Details:**
- Implement network verification middleware
- Check IP address against Vixxo network ranges
- Or use VPN detection mechanisms
- Return 403 if not on network
- Display user-friendly error message

### Story 7.2: Implement User Approval Workflow

As an admin,
I want to approve users who can access the tool,
So that I control who has access to IT backlog information.

**Acceptance Criteria:**

**Given** a user is on Vixxo network but not yet approved
**When** user attempts to access the application
**Then** user sees "Access pending approval" message
**And** admin can see pending users in admin dashboard
**And** admin can approve users
**And** approved users can access the application
**And** dual verification (network + approval) is enforced

**Technical Details:**
- Add "approved" flag to user database table
- Check approval status after network verification
- Admin dashboard shows pending users list
- Approve action updates user status
- Access control middleware checks both network + approval

### Story 7.3: Implement Admin Dashboard

As an admin,
I want an admin dashboard interface,
So that I can manage users, view sync status, and configure the system.

**Acceptance Criteria:**

**Given** I am an admin user
**When** I access the admin dashboard
**Then** I see sections for: user management, sync status/history, system settings
**And** I can navigate between sections
**And** admin dashboard is only accessible to admin users
**And** dashboard is responsive and usable

**Technical Details:**
- Create admin dashboard route/page
- Implement admin role check middleware
- Use Chakra UI layout components (Tabs, Box, Grid)
- Sections: Users, Sync, Settings
- Responsive design for admin use

### Story 7.4: Implement User Management Interface

As an admin,
I want to view and manage approved users,
So that I can control access to the tool.

**Acceptance Criteria:**

**Given** I am an admin user
**When** I view the user management section
**Then** I see a list of all approved users
**And** I can see user details: name, email, approval date, last access
**And** I can remove/disable user access
**And** I can undo accidental removals
**And** user management actions are logged in audit log

**Technical Details:**
- Display users in table/list format
- Show: name, email, approved date, last access timestamp
- "Remove" or "Disable" action per user
- Soft delete (disable flag) to allow undo
- Log all user management actions
- Use Chakra UI Table, Button components

### Story 7.5: Display Sync Status and History in Admin Dashboard

As an admin,
I want to view sync status and history,
So that I can monitor sync health and troubleshoot issues.

**Acceptance Criteria:**

**Given** I am an admin user
**When** I view the sync status section
**Then** I see: last sync time, sync status (success/failure), sync history list
**And** sync history shows: timestamp, status, duration, items synced, errors
**And** I can trigger manual sync from this section
**And** failed syncs show error details

**Technical Details:**
- Query sync_history table
- Display in table or timeline format
- Show: timestamp, status, duration, item count, error details
- "Sync Now" button triggers manual sync
- Use Chakra UI Table, Badge, Button components
- Color code: green (success), red (failure), yellow (partial)

### Story 7.6: Admin Label Visibility Configuration

As an admin,
I want to control which Linear labels appear in the end-user label filter,
So that business users only see labels that are meaningful to them and aren't confused by internal IT labels (e.g., "Frontend", "Backend", "Rollover", "Tech Debt").

**Core Design Principle — Opt-In Visibility:**
Labels are **hidden by default**. New labels discovered during sync are added to the admin list but do NOT appear in the end-user filter until an admin explicitly enables them. This means the admin only visits the settings screen when they intentionally want to surface a label — they never have to reactively clean up labels that the IT team created in Linear.

**Acceptance Criteria:**

**Given** I am an admin user on the Settings tab of the admin dashboard
**When** I view the Label Visibility section
**Then** I see a list of all labels that exist in the synced Linear data
**And** each label has a toggle (on/off) indicating whether it is visible to end users
**And** new/unreviewed labels are clearly separated or badged so I can spot them quickly
**And** labels that are toggled ON appear in the public backlog label filter
**And** labels that are toggled OFF are hidden from the public label filter
**And** changes take effect immediately (or on next page load)

**Given** a new label appears during a Linear sync that has never been seen before
**When** the sync completes
**Then** the new label is added to the admin label list with visibility **OFF** (hidden by default)
**And** the label is marked as "new/unreviewed" so the admin can find it easily
**And** end users see no change — the new label does not leak into their filter

**Given** an admin enables a label
**When** they toggle a label to ON
**Then** that label begins appearing in the end-user label filter dropdown
**And** the label filter shows item counts so users know how many items match
**And** the label's "new" badge is cleared (it's been reviewed)

**Given** a business user is viewing the backlog
**When** the label filter dropdown renders
**Then** only admin-approved (toggled ON) labels appear as filter options
**And** items tagged with hidden labels still appear in the backlog list (hiding a label from the filter does NOT hide items — it just removes the filter shortcut)
**And** hidden labels still appear as pills on item cards (or optionally hidden there too — admin configurable)

**Given** no labels have been enabled yet (fresh install or no admin action taken)
**When** a business user views the backlog
**Then** the label filter is either hidden entirely or shows an "All Items" state with no filter options
**And** the experience is clean — no empty dropdown

**Technical Details:**
- Database: Create `label_visibility` table with columns: `id`, `label_name` (unique), `is_visible` (boolean, default **FALSE**), `show_on_cards` (boolean, default TRUE), `first_seen_at` (timestamp), `reviewed_at` (timestamp, nullable — NULL means unreviewed), `updated_at` (timestamp), `updated_by` (user ID)
- Backend: New REST endpoints under admin routes:
  - `GET /api/admin/labels` — returns all known labels with visibility settings (includes unreviewed count)
  - `PATCH /api/admin/labels/:labelName` — toggle visibility for a single label (also sets `reviewed_at`)
  - `PATCH /api/admin/labels/bulk` — bulk update visibility for multiple labels
  - `GET /api/labels/visible` — public endpoint returning only visible label names (used by frontend filter)
- Backend: During sync, upsert any newly discovered labels into `label_visibility` with `is_visible = FALSE` and `reviewed_at = NULL`
- Frontend: Build `LabelVisibilityManager` component for the admin Settings tab (replaces the current placeholder)
  - Two sections: "Unreviewed Labels" (new since last review) and "All Labels" (full list with current toggle states)
  - Toggle switch per label for "Show in filter" and optionally "Show on cards"
  - Show item count per label so admin can make informed decisions about what's useful
  - Search/filter within the admin list for teams with many labels
  - Bulk actions: "Enable All", "Disable All"
  - Badge on the Settings tab itself if there are unreviewed labels (e.g., "Settings (3)")
- Frontend: Update `LabelFilter` component to fetch visible labels from the public API endpoint instead of deriving them solely from item data
- Frontend: If zero labels are enabled, hide the label filter dropdown entirely (clean empty state)
- Apply `requireAdmin()` middleware to admin label endpoints
- Audit log: Record label visibility changes (who toggled what, when)

**UX Considerations:**
- Use the existing admin Settings tab (currently a placeholder) as the home for this feature
- The "unreviewed" section at the top gives the admin a clear call-to-action without requiring them to scan the full list
- Show a notification badge on the Settings tab when new labels are waiting for review (subtle, not intrusive)
- Admin should be able to quickly scan which labels are on/off — consider a two-column layout or compact list with toggles
- Show the count of backlog items using each label so admins know what's worth surfacing
- Consider a "preview" that shows what the end-user filter would look like with current settings

## Epic 8: Design System & UI Components

**Goal:** Implement Chakra UI integration with Vixxo brand customization and build custom components specified in the UX design.

**FR Coverage:** Supports all FRs through UI implementation

### Story 8.1: Integrate and Customize Chakra UI

As a developer,
I want Chakra UI integrated with Vixxo brand customization,
So that I can build consistent UI components using the design system.

**Acceptance Criteria:**

**Given** Chakra UI is installed
**When** I configure the theme
**Then** Vixxo brand colors are applied (Green #8E992E, Gray #3E4543, Teal #2C7B80, Yellow #EDA200, Blue #395389, Copper #956125)
**And** Arial typography is configured
**And** 4px spacing scale is applied
**And** component defaults match Vixxo brand guidelines
**And** theme is accessible (WCAG Level A contrast)

**Technical Details:**
- Install @chakra-ui/react and dependencies
- Create custom theme extending Chakra default
- Configure colors, typography (Arial), spacing (4px base)
- Set component default styles
- Verify contrast ratios meet WCAG Level A

### Story 8.2: Implement StackRankBadge Component

As a developer,
I want a StackRankBadge component for priority visualization,
So that priority numbers are displayed consistently throughout the application.

**Acceptance Criteria:**

**Given** an item has a priority/stack rank value
**When** StackRankBadge is rendered
**Then** priority number is displayed prominently
**And** badge uses Vixxo Green (#8E992E) for primary priority
**And** badge is accessible (keyboard focusable, screen reader friendly)
**And** badge size is appropriate for scanning

**Technical Details:**
- Create StackRankBadge component
- Use Chakra UI Badge or custom styled component
- Props: priority number, size, variant
- Style with Vixxo Green for primary
- Add ARIA labels for accessibility
- Ensure sufficient contrast

### Story 8.3: Implement BacklogItemCard Component

As a developer,
I want a BacklogItemCard component for displaying backlog items,
So that items are displayed consistently in list views.

**Acceptance Criteria:**

**Given** backlog item data is available
**When** BacklogItemCard is rendered
**Then** card displays: title, priority badge, status, business unit, metadata
**And** card is scannable with clear visual hierarchy
**And** card is clickable to open detail view
**And** card is accessible (keyboard navigation, screen reader)
**And** card uses Vixxo brand colors and typography

**Technical Details:**
- Create BacklogItemCard component
- Use Chakra UI Card, Box, Text components
- Display: title (heading), StackRankBadge, status badge, business unit tag, dates
- Make clickable (onClick handler)
- Keyboard accessible (Enter/Space to activate)
- Responsive layout

### Story 8.4: Implement SyncStatusIndicator Component

As a developer,
I want a SyncStatusIndicator component for displaying sync status,
So that users can see data freshness consistently.

**Acceptance Criteria:**

**Given** sync status data is available
**When** SyncStatusIndicator is rendered
**Then** component displays "Last synced: [timestamp]" in user-friendly format
**And** status uses appropriate color (green for recent, yellow for stale, red for error)
**And** component is subtle but visible
**And** timestamp updates dynamically (relative time)

**Technical Details:**
- Create SyncStatusIndicator component
- Use Chakra UI Text, Badge, Icon components
- Format timestamp: "2 hours ago", "Yesterday", etc.
- Color logic: green (<4h), yellow (4-24h), red (error/stale)
- Use date-fns or similar for formatting
- Auto-update relative time

### Story 8.5: Implement BusinessUnitFilter Component

As a developer,
I want a BusinessUnitFilter component for filtering by business unit,
So that filtering is consistent and user-friendly.

**Acceptance Criteria:**

**Given** business units are available
**When** BusinessUnitFilter is rendered
**Then** component displays dropdown/select with business unit options
**And** selected filter is visually indicated
**And** filter updates instantly (<500ms) when changed
**And** component is accessible (keyboard navigation, screen reader)
**And** component uses Chakra UI Select/Menu

**Technical Details:**
- Create BusinessUnitFilter component
- Use Chakra UI Select or Menu component
- Props: options, selected value, onChange handler
- Instant client-side filtering
- ARIA labels for accessibility
- Visual feedback for selection

### Story 8.6: Implement EmptyStateWithGuidance Component

As a developer,
I want an EmptyStateWithGuidance component for empty states,
So that users get helpful guidance when no results are found.

**Acceptance Criteria:**

**Given** a filtered list returns no results
**When** EmptyStateWithGuidance is rendered
**Then** component displays helpful message explaining why no results
**And** suggestions are provided to adjust filters or check business unit
**And** "Clear filters" action is available
**And** component uses Vixxo brand styling
**And** component is accessible

**Technical Details:**
- Create EmptyStateWithGuidance component
- Use Chakra UI EmptyState or custom layout
- Props: message, suggestions, actions
- Display icon, heading, description, action buttons
- Use Vixxo colors and typography
- Keyboard accessible

## Epic 9: Performance & Optimization

**Goal:** Ensure the application meets all performance targets (<2s page load, <500ms filtering, <100ms interactions) through optimization strategies.

**FR Coverage:** NFR Performance requirements

### Story 9.1: Implement Client-Side Caching and State Management

As a developer,
I want efficient client-side caching and state management,
So that the application responds quickly to user interactions.

**Acceptance Criteria:**

**Given** backlog data is loaded
**When** user interacts with filters or views
**Then** interactions respond within 100ms
**And** data is cached to avoid unnecessary API calls
**And** state updates are optimized (no unnecessary re-renders)
**And** filtering happens client-side for instant response

**Technical Details:**
- Use React Context or state management library (Zustand, Redux)
- Cache backlog data in memory
- Implement client-side filtering/sorting
- Optimize re-renders (React.memo, useMemo, useCallback)
- Debounce search inputs

### Story 9.2: Implement Virtual Scrolling or Pagination

As a developer,
I want virtual scrolling or pagination for large lists,
So that the backlog list performs well with many items.

**Acceptance Criteria:**

**Given** backlog may contain hundreds of items
**When** user views the backlog list
**Then** only visible items are rendered
**And** scrolling is smooth and performant
**And** page load completes within 2 seconds
**And** initial render shows items quickly

**Technical Details:**
- Use react-window or react-virtualized for virtual scrolling
- Or implement pagination (e.g., 50 items per page)
- Lazy load items as user scrolls
- Optimize initial render (skeleton screens)
- Measure and verify performance targets

### Story 9.3: Optimize API Response Times

As a developer,
I want optimized API endpoints,
So that data loads quickly and meets performance targets.

**Acceptance Criteria:**

**Given** API endpoints serve backlog data
**When** frontend requests data
**Then** API responds within performance targets
**And** database queries are optimized
**And** response payloads are minimized (only needed fields)
**And** caching is implemented where appropriate

**Technical Details:**
- Optimize database queries (indexes, efficient queries)
- Implement response caching (Redis or in-memory)
- Minimize response payloads (field selection)
- Use compression (gzip)
- Monitor API response times

### Story 9.4: Implement Loading States and Skeleton Screens

As a developer,
I want loading states and skeleton screens,
So that users see immediate feedback while data loads.

**Acceptance Criteria:**

**Given** data is loading
**When** user views a page or triggers an action
**Then** loading indicator or skeleton screen is displayed
**And** loading state is clear and not jarring
**And** skeleton matches final content layout
**And** loading completes within performance targets

**Technical Details:**
- Use Chakra UI Skeleton component
- Show skeletons for list items, cards, etc.
- Use Spinner for button actions
- Match skeleton layout to final content
- Ensure smooth transition from loading to content

## Epic 10: Security & Audit

**Goal:** Implement comprehensive security measures including encryption, audit logging, and compliance with security policies.

**FR Coverage:** NFR Security requirements

### Story 10.1: Implement HTTPS and Data Encryption

As a developer,
I want HTTPS and data encryption configured,
So that data is protected in transit and at rest.

**Acceptance Criteria:**

**Given** the application handles sensitive data
**When** data is transmitted or stored
**Then** HTTPS is enforced for all connections
**And** database encryption is configured
**And** Linear API credentials are encrypted at rest
**And** user credentials are protected

**Technical Details:**
- Configure HTTPS/TLS for Express server
- Enable database encryption (PostgreSQL encryption)
- Encrypt sensitive credentials in environment variables
- Use secure password hashing if storing passwords
- Follow security best practices

### Story 10.2: Implement Audit Logging for User Access

As a developer,
I want audit logging for user access,
So that we can track who accessed what and when.

**Acceptance Criteria:**

**Given** users access the application
**When** a user views backlog items or performs actions
**Then** access is logged with: user ID, timestamp, action, item ID (if applicable)
**And** audit logs are stored in database
**And** audit logs are queryable for reporting
**And** audit logs follow data retention policy

**Technical Details:**
- Create audit_logs table: user_id, timestamp, action, resource, details
- Log: page views, item views, filter usage, etc.
- Implement audit logging middleware
- Store logs in PostgreSQL
- Define retention policy (e.g., 1 year)

### Story 10.3: Implement Audit Logging for Admin Actions

As a developer,
I want audit logging for admin actions,
So that we can track administrative changes for security and compliance.

**Acceptance Criteria:**

**Given** an admin performs administrative actions
**When** admin approves/removes users, triggers sync, changes settings
**Then** action is logged with: admin user ID, timestamp, action type, details
**And** audit logs are stored securely
**And** audit logs are visible to admins in dashboard
**And** audit logs follow data retention policy

**Technical Details:**
- Extend audit_logs table with admin_action flag
- Log: user approvals, user removals, sync triggers, setting changes
- Include before/after values for changes
- Display admin action logs in admin dashboard
- Secure audit logs (admin-only access)

### Story 10.4: Implement Secure Credential Storage

As a developer,
I want secure storage for Linear API credentials,
So that credentials are protected and not exposed.

**Acceptance Criteria:**

**Given** Linear API credentials are required
**When** credentials are stored
**Then** credentials are encrypted at rest
**And** credentials are accessed only when needed
**And** credentials are not logged or exposed in error messages
**And** credential rotation process is documented

**Technical Details:**
- Store credentials in environment variables (encrypted)
- Use secret management best practices
- Never log credentials
- Implement credential rotation process
- Document credential management procedures

## Epic 11: Accessibility & Testing

**Goal:** Ensure WCAG 2.1 Level A compliance with keyboard navigation, screen reader support, and accessibility testing.

**FR Coverage:** NFR Accessibility requirements

### Story 11.1: Implement Keyboard Navigation

As a developer,
I want full keyboard navigation support,
So that users can navigate the application without a mouse.

**Acceptance Criteria:**

**Given** all interactive elements are present
**When** user navigates using keyboard only
**Then** all interactive elements are focusable (Tab key)
**And** focus indicators are visible and clear
**And** keyboard shortcuts work (Enter to activate, ESC to close modals)
**And** focus order is logical
**And** focus traps work in modals

**Technical Details:**
- Ensure all buttons, links, inputs are keyboard accessible
- Add focus styles (Chakra UI default or custom)
- Implement focus trap in modals (focus-trap-react)
- Test with keyboard only
- Document keyboard shortcuts

### Story 11.2: Implement Screen Reader Support

As a developer,
I want screen reader support for all content,
So that visually impaired users can access the application.

**Acceptance Criteria:**

**Given** content is displayed
**When** screen reader accesses the application
**Then** semantic HTML is used (headings, lists, landmarks)
**And** ARIA labels are provided for interactive elements
**And** images have alt text
**And** form inputs have labels
**And** dynamic content updates are announced

**Technical Details:**
- Use semantic HTML (nav, main, article, etc.)
- Add ARIA labels where needed
- Ensure form labels are associated with inputs
- Add alt text to images
- Use ARIA live regions for dynamic updates
- Test with screen reader (NVDA, JAWS, VoiceOver)

### Story 11.3: Ensure Color Contrast Compliance

As a developer,
I want color contrast that meets WCAG Level A standards,
So that text is readable for all users.

**Acceptance Criteria:**

**Given** text is displayed with colors
**When** contrast is measured
**Then** normal text has at least 4.5:1 contrast ratio
**And** large text has at least 3:1 contrast ratio
**And** interactive elements have sufficient contrast
**And** color is not the sole indicator (use icons, text too)

**Technical Details:**
- Verify Vixxo brand colors meet contrast requirements
- Adjust colors if needed (darken for small text)
- Use contrast checking tools
- Ensure color + other indicators (icons, text) for status
- Document contrast ratios

### Story 11.4: Conduct Accessibility Testing

As a developer,
I want accessibility testing performed,
So that we verify WCAG Level A compliance.

**Acceptance Criteria:**

**Given** the application is built
**When** accessibility testing is performed
**Then** automated accessibility tests pass (axe-core, WAVE)
**And** manual keyboard navigation testing passes
**And** screen reader testing passes
**And** accessibility issues are documented and fixed
**And** testing results are recorded

**Technical Details:**
- Run automated accessibility tests (axe-core, eslint-plugin-jsx-a11y)
- Manual testing with keyboard only
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Document findings and fixes
- Create accessibility testing checklist

## Epic 12: Deployment & Operations

**Goal:** Prepare the application for deployment to Vixxo network with monitoring, operational readiness, and documentation.

**FR Coverage:** NFR Reliability and operational requirements

### Story 12.1: Configure Production Build and Deployment

As a developer,
I want production build and deployment configured,
So that the application can be deployed to Vixxo network.

**Acceptance Criteria:**

**Given** development is complete
**When** production build is created
**Then** frontend builds optimized production bundle
**And** backend builds optimized production bundle
**And** environment variables are configured for production
**And** deployment process is documented
**And** application deploys successfully to Vixxo network

**Technical Details:**
- Configure production builds (Vite build, tsc build)
- Set up environment variables for production
- Create deployment scripts/documentation
- Configure server (Express) for production
- Test deployment process

### Story 12.2: Implement Health Checks and Monitoring

As a developer,
I want health checks and monitoring,
So that we can monitor application health and uptime.

**Acceptance Criteria:**

**Given** application is deployed
**When** health checks are performed
**Then** health check endpoint returns application status
**And** database connectivity is checked
**And** Linear API connectivity is checked
**And** monitoring alerts are configured for critical failures
**And** uptime meets 99% target during business hours

**Technical Details:**
- Create /health endpoint
- Check database connection
- Check Linear API connectivity (optional, may be slow)
- Set up monitoring/alerting (if available)
- Log health check results
- Document monitoring procedures

### Story 12.3: Create Deployment Documentation

As a developer,
I want deployment documentation,
So that the application can be deployed and maintained.

**Acceptance Criteria:**

**Given** deployment process is established
**When** documentation is created
**Then** deployment guide is written
**And** environment variable configuration is documented
**And** database setup/migration process is documented
**And** troubleshooting guide is created
**And** operational runbook is available

**Technical Details:**
- Write deployment README
- Document environment variables
- Document database setup and migrations
- Create troubleshooting guide
- Document common issues and solutions
- Create operational runbook

### Story 12.4: Implement Error Recovery Mechanisms

As a developer,
I want error recovery mechanisms,
So that the application handles common failure scenarios gracefully.

**Acceptance Criteria:**

**Given** common failure scenarios may occur
**When** errors occur (database unavailable, Linear API down, network issues)
**Then** application displays cached data with freshness indicator
**And** error messages are user-friendly
**And** retry mechanisms are available
**And** application continues to function where possible
**And** errors are logged for troubleshooting

**Technical Details:**
- Implement graceful degradation
- Display cached data when API unavailable
- Show freshness indicators
- Provide retry mechanisms
- Log errors with context
- Test error scenarios

## Epic 13: Role-Based Privilege System

**Goal:** Extend the existing user model and access control system to support granular role-based privileges (Regular User, IT, Admin), enabling conditional UI features and screen access based on user role.

**FR Coverage:** Extends FR16-FR22 (User Management & Access Control), introduces new privilege tiers

### Story 13.1: Add IT Role to User Model Alongside Admin

As a system administrator,
I want to designate users as IT, Admin, or regular users,
So that I can control access to privileged features based on role.

**Acceptance Criteria:**

**Given** the users table currently only has `is_admin` boolean
**When** I run the new database migration
**Then** an `is_it` boolean column is added to the users table (default FALSE)
**And** existing admins retain their admin privileges
**And** the backend auth service includes `isIT` in the session and API response
**And** the frontend User type and useAuth() hook expose `isIT`
**And** a new `requireIT()` middleware allows IT-or-above access on backend routes

**Technical Details:**
- Database: Add `is_it BOOLEAN NOT NULL DEFAULT FALSE` to `users` table via new migration
- Backend: Update `auth.service.ts` to include `isIT` in user lookup
- Backend: Update session types to include `isIT`
- Backend: Create `requireIT()` middleware (passes if `isIT || isAdmin`)
- Frontend: Add `isIT: boolean` to `User` interface in `auth.types.ts`
- Frontend: Add `isIT` derived state to `useAuth()` hook
- Backward compatible: existing admins still work, `is_it` defaults to FALSE

### Story 13.2: Make Issue Identifiers Clickable Hyperlinks for IT/Admin Users

As an IT or Admin user,
I want issue identifiers (e.g., VIX-265) to be clickable links to Linear,
So that I can quickly navigate to the full Linear issue for context.

**Acceptance Criteria:**

**Given** I am viewing the backlog list or item detail modal
**When** I have an IT or Admin role
**Then** issue identifiers (e.g., VIX-265) render as clickable hyperlinks
**And** clicking the link opens the Linear issue in a new browser tab
**And** the link uses the existing `item.url` field (no new API calls)
**And** the link style matches the existing `mono-id` aesthetic with subtle hover indicator
**And** regular users continue to see plain text (no change)

**Technical Details:**
- Frontend: Update `backlog-item-card.tsx` (line ~147-149) to conditionally render `<Link>` vs `<Text>`
- Frontend: Update `item-detail-modal.tsx` header identifier similarly
- Use `useAuth()` hook to check `isIT || isAdmin`
- `BacklogItem.url` field already contains the Linear deep-link URL
- Style: match `.mono-id` class, add `textDecoration: underline` on hover, `target="_blank"` + `rel="noopener noreferrer"`

### Story 13.3: Implement Role-Based Screen Access and Privilege Levels

As a developer,
I want a centralized permission system that maps roles to capabilities,
So that conditional UI rendering and route protection are consistent and maintainable.

**Acceptance Criteria:**

**Given** users have roles (regular, IT, admin)
**When** the app renders screens and features
**Then** a `usePermissions()` hook provides boolean flags for each capability
**And** a `<RequireRole>` component conditionally renders children based on role
**And** backend routes use role-appropriate middleware guards
**And** the privilege matrix is implemented:
  - View backlog items: all users
  - Linear hyperlinks & "Open in Linear": IT + Admin
  - View migration metadata: IT + Admin
  - User management / approval: Admin only
  - System configuration: Admin only

**Technical Details:**
- Frontend: Create `usePermissions()` hook in `features/auth/hooks/use-permissions.ts`
- Frontend: Create `<RequireRole>` component in `features/auth/components/require-role.tsx`
- Frontend: Permissions config mapping roles to capabilities in `features/auth/utils/permissions.ts`
- Backend: Extend middleware with `requireIT()` for IT-or-above routes
- Backend: Apply middleware to appropriate routes (e.g., migration metadata endpoints)
- Remove `SHOW_OPEN_IN_LINEAR` feature flag — replace with role-based check

---

## FR Coverage Map

**Backlog Visibility & Display (FR1-FR5):**
- Epic 3: Stories 3.1, 3.2, 3.3, 3.4

**Filtering & Search (FR6-FR9):**
- Epic 4: Stories 4.1, 4.2, 4.3, 4.4

**Data Synchronization (FR10-FR15):**
- Epic 6: Stories 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

**User Management & Access Control (FR16-FR22):**
- Epic 7: Stories 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

**Admin Configuration (extends FR7, FR20):**
- Epic 7: Story 7.6 (Label Visibility — admin controls which labels appear in end-user filter)

**Item Information Access (FR23-FR25):**
- Epic 5: Stories 5.1, 5.2, 5.3

**Foundation & Infrastructure:**
- Epic 1: All stories (foundation for all FRs)
- Epic 2: All stories (foundation for sync FRs)

**Design & UX:**
- Epic 8: All stories (UI implementation for all FRs)

**Performance, Security, Accessibility, Operations:**
- Epic 9: All stories (NFR Performance)
- Epic 10: All stories (NFR Security)
- Epic 11: All stories (NFR Accessibility)
- Epic 12: All stories (NFR Reliability/Operations)

---

**Document Status:** Complete epic and story breakdown ready for Linear import and implementation planning.
