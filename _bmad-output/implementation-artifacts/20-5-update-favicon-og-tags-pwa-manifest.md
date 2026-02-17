# Story 20.5: Update Favicon, OpenGraph Tags, and PWA Manifest

Linear Issue ID: VIX-463
Status: ready-for-dev

## Story

As a user,
I want Bridge to have proper favicon, browser tab branding, and link previews,
So that it looks professional in browser tabs, bookmarks, and when URLs are shared in Slack/Teams/email.

## Acceptance Criteria

**Given** the Bridge icon assets exist (Story 20.1)
**When** the favicon and metadata are updated
**Then** the browser tab shows the Bridge icon and "Bridge | Vixxo" title
**And** the favicon renders correctly at all standard sizes (16x16, 32x32)
**And** the Apple touch icon (180x180) uses the Bridge mark
**And** the PWA manifest includes:
  - `name`: "Bridge"
  - `short_name`: "Bridge"
  - `description`: "Your window into Vixxo IT"
  - `theme_color`: "#2C7B80" (Vixxo Teal)
  - `background_color`: "#FFFFFF"
  - Icons at 192x192 and 512x512
**And** OpenGraph meta tags are set:
  - `og:title`: "Bridge | Vixxo"
  - `og:description`: "Your window into Vixxo IT — backlog visibility, project status, and more"
  - `og:site_name`: "Bridge"
  - `og:type`: "website"
  - `og:image`: Bridge logo (1200x630 social preview image)
**And** when a bridge.vixxo.com link is pasted in Slack or Teams, the preview shows the Bridge branding

## Technical Details

- Update `frontend/public/favicon.ico` (or convert to multi-size .ico)
- Add/update `frontend/public/favicon-16x16.png`, `favicon-32x32.png`
- Add/update `frontend/public/apple-touch-icon.png` (180x180)
- Update `frontend/public/manifest.json` with new names, colors, and icon paths
- Update `frontend/index.html` meta tags and link tags
- Create social preview image (1200x630) for `og:image`
- Verify: open bridge.vixxo.com URL in Slack/Teams to test link unfurl

## Dependencies

- Story 20.1 (icon assets in all required sizes)
