# Story 20.1: Design Bridge Logo and Brand Identity

Linear Issue ID: VIX-459
Status: ready-for-dev

## Story

As the IT Lead,
I want a professional logo and brand identity for Bridge,
So that the application looks polished and trustworthy when business stakeholders visit bridge.vixxo.com.

## Acceptance Criteria

**Given** Bridge is being rebranded from Shareable Linear Backlog
**When** the brand identity is designed
**Then** a primary logo is created that evokes the "bridge" metaphor (connection between IT and business)
**And** logo variations are provided: full logo, icon-only, horizontal, and monochrome
**And** the logo works at multiple sizes (favicon 16px through header 200px+)
**And** the design uses Vixxo brand colors (primary: Teal #2C7B80, Green #8E992E; secondary: Gray #3E4543, Blue #395389)
**And** a brand guide is documented covering: logo usage rules, color palette, typography (Arial), spacing guidelines
**And** SVG and PNG exports are provided for all logo variations

## Design Direction

- **Metaphor:** Bridge, connection, visibility, two-way communication
- **Tone:** Professional, approachable, executive-friendly — not overly techy
- **Audience:** VPs/SVPs who are non-technical; the logo should feel like an internal business tool, not a developer product
- **Constraints:** Must complement Vixxo brand colors; should not clash with existing Vixxo corporate identity

## Deliverables

1. Primary logo (SVG + PNG)
2. Icon-only mark (SVG + PNG) — for favicon, app icon
3. Horizontal/inline variant for header use
4. Monochrome variant (for printing, email footers)
5. Brand guide document (colors, spacing, usage rules)

## Technical Notes

- SVG files stored in `frontend/public/` and `frontend/src/assets/`
- PNG exports at 1x, 2x, 3x for retina displays
- Favicon sizes: 16x16, 32x32, 180x180 (apple-touch), 192x192, 512x512

## Dependencies

- None — this is the first story in the epic and unblocks all others
