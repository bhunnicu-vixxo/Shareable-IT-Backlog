# Story 20.4: Design and Implement Branded Login/Welcome Screen

Linear Issue ID: VIX-462
Status: ready-for-dev

## Story

As a business user visiting bridge.vixxo.com for the first time,
I want to see a professional, branded welcome/login screen,
So that I immediately understand what this tool is, trust it, and know how to get started.

## Acceptance Criteria

**Given** a user navigates to bridge.vixxo.com and is not yet authenticated
**When** the login/welcome page loads
**Then** the Bridge logo is prominently displayed (centered, larger than header size)
**And** a tagline communicates the tool's purpose (e.g., "Your window into IT" or "Connecting business and technology")
**And** the page uses Vixxo brand colors with the Bridge identity
**And** there is a clear call-to-action to proceed (login or request access)
**And** the page loads within 2 seconds
**And** the design is professional and executive-friendly — not overly technical
**And** the page is fully accessible (keyboard navigable, screen reader friendly)

## Design Direction

- Clean, minimal layout — logo + tagline + CTA
- Vixxo Teal (#2C7B80) as primary accent
- Optional: subtle bridge/connection visual motif in background (abstract, not literal)
- No technical jargon — this is for VPs/SVPs
- Consider including a brief one-liner about what Bridge does for first-time visitors

## Technical Details

- Update the existing login/auth gate component
- Ensure the page works as both login screen (for returning users) and landing page (for new visitors requesting access)
- Background should be lightweight (CSS gradient or minimal SVG) — no heavy images
- Test with Vixxo network detection flow

## Dependencies

- Story 20.1 (logo assets)
- Story 20.2 (app naming updated)
