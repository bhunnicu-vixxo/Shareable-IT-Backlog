# Story 20.2: Rename Application from SLB to Bridge Across Codebase

Linear Issue ID: VIX-460
Status: ready-for-dev

## Story

As a developer,
I want all references to "Shareable Linear Backlog" (and "SLB") updated to "Bridge" throughout the codebase,
So that the application identity is consistent everywhere users and developers encounter it.

## Acceptance Criteria

**Given** the application is currently named "Shareable Linear Backlog" in many places
**When** the rename is complete
**Then** the following are updated:
- `<title>` tag in `index.html` → "Bridge | Vixxo"
- Application header text → "Bridge"
- `package.json` name fields (frontend + backend) → descriptive bridge names
- Login/welcome screen copy → references Bridge, not SLB
- Alt text on any existing logo/images → "Bridge"
- Any user-facing error messages that reference the app name
- OpenGraph meta tags (`og:title`, `og:site_name`) → "Bridge"
- `manifest.json` name and short_name → "Bridge"
**And** internal code comments referencing "Shareable Linear Backlog" are updated where they appear in user-facing context
**And** the repo-level README is updated to reference Bridge
**And** no functional behavior changes — this is a naming-only change

## Technical Details

- Search codebase for: "Shareable Linear Backlog", "SLB", "shareable-linear-backlog", "shareableLinearBacklog"
- Update frontend: `index.html`, `App.tsx`, header component, any hardcoded strings
- Update backend: any response headers, server name references, health check responses
- Update config: `package.json` (both), `vite.config.ts` app title if set, `manifest.json`
- Update docs: `README.md`, any developer-facing documentation
- DO NOT rename the GitHub repo or Linear project — those are separate decisions

## Dependencies

- None (can be done independently of logo work)
