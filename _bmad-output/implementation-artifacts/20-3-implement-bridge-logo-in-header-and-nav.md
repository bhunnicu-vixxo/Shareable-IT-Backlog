# Story 20.3: Implement Bridge Logo in Application Header and Navigation

Linear Issue ID: VIX-461
Status: ready-for-dev

## Story

As a business user,
I want to see the Bridge logo in the application header,
So that the tool has a clear, professional identity that reinforces trust and recognition.

## Acceptance Criteria

**Given** the Bridge logo assets have been created (Story 20.1)
**When** I load any page of the application
**Then** the Bridge logo appears in the top-left of the header/nav bar
**And** the logo is the inline/horizontal variant sized appropriately for the header
**And** clicking the logo navigates to the home/backlog view
**And** the logo has appropriate alt text ("Bridge - Vixxo IT Portal")
**And** the logo renders crisply on retina displays (2x asset)
**And** the header background and logo colors work together with proper contrast
**And** on smaller viewports, the icon-only variant is used to save horizontal space

## Technical Details

- Update the existing header component (likely in `frontend/src/shared/` or `features/layout/`)
- Replace any text-based app name with the logo `<img>` or inline `<svg>`
- Use responsive logic: full logo at `md+` breakpoints, icon-only at `base`/`sm`
- Ensure logo loads immediately (inline SVG or preloaded asset) — no layout shift
- Add `aria-label` for accessibility

## Dependencies

- Story 20.1 (logo assets must exist first)
- Story 20.2 (app naming updated)
