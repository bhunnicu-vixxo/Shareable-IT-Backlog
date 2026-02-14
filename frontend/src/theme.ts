import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
  defineSlotRecipe,
} from '@chakra-ui/react'

// ============================================================================
// WCAG 2.1 Contrast Compliance Summary (Story 11.3, VIX-386)
// ============================================================================
//
// COLOR ON WHITE (#FFFFFF) — Contrast Ratios:
// ┌──────────────────────────┬──────────┬─────────┬────────────────────────────┐
// │ Color                    │ Hex      │ Ratio   │ WCAG AA Status             │
// ├──────────────────────────┼──────────┼─────────┼────────────────────────────┤
// │ Green                    │ #8E992E  │ 3.11:1  │ ⚠️ Large text only (≥3:1)  │
// │ Green Accessible         │ #6F7B24  │ 4.63:1  │ ✅ Normal text (≥4.5:1)    │
// │ Green Hover              │ #7A8528  │ 4.03:1  │ ⚠️ Large text only         │
// │ Green Active             │ #6B7322  │ 5.12:1  │ ✅ Normal text             │
// │ Gray (primary text)      │ #3E4543  │ 9.83:1  │ ✅ Excellent               │
// │ Gray Light               │ #718096  │ 4.02:1  │ ⚠️ Large text only         │
// │ Teal                     │ #2C7B80  │ 4.94:1  │ ✅ Normal text             │
// │ Yellow                   │ #EDA200  │ 2.15:1  │ ❌ NEVER as text           │
// │ Blue                     │ #395389  │ 7.57:1  │ ✅ Normal text             │
// │ Copper                   │ #956125  │ 5.23:1  │ ✅ Normal text             │
// │ Error Red                │ #E53E3E  │ 4.13:1  │ ⚠️ Large text only         │
// │ Error Red Accessible     │ #C53030  │ 5.47:1  │ ✅ Normal text             │
// └──────────────────────────┴──────────┴─────────┴────────────────────────────┘
//
// LIGHT BG PAIRINGS — Text on tinted backgrounds:
// ┌──────────────────────────┬──────────────────────┬─────────┬────────────────┐
// │ Text Color               │ Background           │ Ratio   │ Status         │
// ├──────────────────────────┼──────────────────────┼─────────┼────────────────┤
// │ greenAccessible (#6F7B24)│ greenLight (#F4F5E9) │ ~4.2:1  │ ⚠️ Borderline  │
// │ redAccessible (#C53030)  │ redLight (#FFF5F5)   │ ~5.2:1  │ ✅ Passes      │
// │ gray (#3E4543)           │ yellowLight (#FFF8E6)│ ~11.8:1 │ ✅ Excellent    │
// │ teal (#2C7B80)           │ tealLight (#E6F6F7)  │ ~4.5:1  │ ✅ Borderline   │
// │ gray (#3E4543)           │ grayBg (#F7FAFC)     │ ~12.0:1 │ ✅ Excellent    │
// └──────────────────────────┴──────────────────────┴─────────┴────────────────┘
//
// WHITE TEXT ON COLORED BG — Button/badge backgrounds:
// ┌──────────────────────────┬─────────┬────────────────────────────────────────┐
// │ Background               │ Ratio   │ Status / Notes                         │
// ├──────────────────────────┼─────────┼────────────────────────────────────────┤
// │ brand.green (#8E992E)    │ 3.11:1  │ ⚠️ Buttons: bold ≥14px = large text OK │
// │ brand.greenAccessible    │ 4.63:1  │ ✅ Status badges (completed)            │
// │ brand.teal (#2C7B80)     │ 4.80:1  │ ✅ Status badges (started)              │
// │ brand.blue (#395389)     │ 6.60:1  │ ✅ Status badges (unstarted)            │
// │ error.red (#E53E3E)      │ 4.13:1  │ ⚠️ Buttons: bold ≥14px = large text OK │
// │ error.redHover (#C53030) │ 5.47:1  │ ✅ Button hover state                   │
// │ gray.700                 │ ~12.0:1 │ ✅ Status badges (cancelled)             │
// │ gray.600                 │ ~7.50:1 │ ✅ Status badges (backlog/default)       │
// └──────────────────────────┴─────────┴────────────────────────────────────────┘
//
// USAGE RULES:
// - brand.green: ONLY for backgrounds, non-text UI (focus outlines), large text (≥14px bold)
// - brand.greenAccessible: For ALL normal-size text on white/light backgrounds
// - error.red: ONLY for non-text indicators, large text, or dark backgrounds
// - error.redAccessible: For ALL normal-size text on white/light backgrounds
// - brand.yellow: NEVER as text. Only as background with brand.gray text, or decorative.
//   For non-text indicators (dots), use brand.copper (#956125, 5.23:1) instead.
// ============================================================================

// ---------------------------------------------------------------------------
// Palette utilities (AC: #1)
// - Generates 50–950 shade scales WITHOUT external deps.
// - We keep existing flat tokens (brand.green, etc.) for backwards compatibility.
// ---------------------------------------------------------------------------
function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function hexToRgb(hex: string) {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => clampByte(v).toString(16).padStart(2, '0').toUpperCase()
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixHex(hexA: string, hexB: string, t: number) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  )
}

const PALETTE_TINTS = {
  50: 0.95,
  100: 0.9,
  200: 0.75,
  300: 0.6,
  400: 0.3,
  500: 0,
} as const

const PALETTE_SHADES = {
  600: 0.12,
  700: 0.24,
  800: 0.38,
  900: 0.52,
  950: 0.66,
} as const

function createPaletteTokens(baseHex: string) {
  const WHITE = '#FFFFFF'
  const BLACK = '#000000'

  return {
    '50': { value: mixHex(baseHex, WHITE, PALETTE_TINTS[50]) },
    '100': { value: mixHex(baseHex, WHITE, PALETTE_TINTS[100]) },
    '200': { value: mixHex(baseHex, WHITE, PALETTE_TINTS[200]) },
    '300': { value: mixHex(baseHex, WHITE, PALETTE_TINTS[300]) },
    '400': { value: mixHex(baseHex, WHITE, PALETTE_TINTS[400]) },
    '500': { value: baseHex.toUpperCase() },
    '600': { value: mixHex(baseHex, BLACK, PALETTE_SHADES[600]) },
    '700': { value: mixHex(baseHex, BLACK, PALETTE_SHADES[700]) },
    '800': { value: mixHex(baseHex, BLACK, PALETTE_SHADES[800]) },
    '900': { value: mixHex(baseHex, BLACK, PALETTE_SHADES[900]) },
    '950': { value: mixHex(baseHex, BLACK, PALETTE_SHADES[950]) },
  } as const
}

// ---------------------------------------------------------------------------
// Button recipe — brand-consistent variants (AC: #5)
// ---------------------------------------------------------------------------
const buttonRecipe = defineRecipe({
  variants: {
    variant: {
      // Primary — Vixxo Green bg, white text, darkened hover/active
      brand: {
        bg: 'brand.green',
        color: 'white',
        // Enforce WCAG "large text" threshold (≥14px bold) so 3.11:1 is acceptable.
        // This prevents size="xs" (12px) from accidentally falling below the large-text rule.
        fontSize: 'sm',
        fontWeight: 'bold',
        borderColor: 'transparent',
        _hover: { bg: 'brand.greenHover' },
        _active: { bg: 'brand.greenActive' },
        _disabled: { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' },
      },
      // Secondary — gray outlined, gray text
      outline: {
        borderWidth: '1px',
        borderColor: 'brand.gray',
        color: 'brand.gray',
        bg: 'transparent',
        _hover: { bg: 'brand.grayBg' },
        _active: { bg: 'brand.grayBg' },
        _disabled: { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' },
      },
      // Tertiary — text-link style, accessible green text
      ghost: {
        bg: 'transparent',
        color: 'brand.greenAccessible',
        borderColor: 'transparent',
        _hover: { textDecoration: 'underline', bg: 'transparent' },
        _active: { textDecoration: 'underline', bg: 'transparent' },
        _disabled: { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' },
      },
      // Destructive — red bg, white text for admin delete actions
      danger: {
        bg: 'error.red',
        color: 'white',
        // Enforce WCAG "large text" threshold (≥14px bold) for contrast rationale.
        fontSize: 'sm',
        fontWeight: 'bold',
        borderColor: 'transparent',
        _hover: { bg: 'error.redHover' },
        _active: { bg: 'error.redHover' },
        _disabled: { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Badge recipe — status color coding (AC: #5)
// ---------------------------------------------------------------------------
const badgeRecipe = defineRecipe({
  variants: {
    variant: {
      success: {
        bg: 'brand.greenLight',
        color: 'brand.greenAccessible',
      },
      error: {
        bg: 'error.redLight',
        color: 'error.redAccessible',
      },
      warning: {
        // Yellow on white fails WCAG — use as bg with dark text
        bg: 'brand.yellowLight',
        color: 'brand.gray',
      },
      info: {
        bg: 'brand.tealLight',
        color: 'brand.teal',
      },
      neutral: {
        bg: 'brand.grayBg',
        color: 'brand.gray',
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Alert slot recipe — brand feedback messages (AC: #5)
// ---------------------------------------------------------------------------
const alertRecipe = defineSlotRecipe({
  slots: ['root', 'indicator', 'title', 'description', 'content'],
  variants: {
    status: {
      success: {
        root: {
          bg: 'brand.greenLight',
          borderLeftWidth: '4px',
          borderLeftColor: 'brand.green',
          color: 'brand.gray',
        },
        indicator: { color: 'brand.green' },
      },
      error: {
        root: {
          bg: 'error.redLight',
          borderLeftWidth: '4px',
          borderLeftColor: 'error.red',
          color: 'brand.gray',
        },
        indicator: { color: 'error.red' },
      },
      warning: {
        root: {
          bg: 'brand.yellowLight',
          borderLeftWidth: '4px',
          borderLeftColor: 'brand.yellow',
          color: 'brand.gray',
        },
        indicator: { color: 'brand.yellow' },
      },
      info: {
        root: {
          bg: 'brand.tealLight',
          borderLeftWidth: '4px',
          borderLeftColor: 'brand.teal',
          color: 'brand.gray',
        },
        indicator: { color: 'brand.teal' },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Theme configuration (Tasks 1–6)
// ---------------------------------------------------------------------------
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // === Brand Colors (KEEP existing flat tokens — used as bg="brand.green") ===
        brand: {
          green: { value: '#8E992E' },           // Vixxo Green — primary brand
          greenLight: { value: '#F4F5E9' },       // Light bg tint for alerts/badges
          greenHover: { value: '#7A8528' },       // Darkened for button hover
          greenActive: { value: '#6B7322' },      // Darker for button active/press
          greenAccessible: { value: '#6F7B24' },  // ≥4.5:1 contrast on white for text (4.63:1)
          gray: { value: '#3E4543' },             // Vixxo Gray — primary text
          grayLight: { value: '#718096' },        // Secondary text color
          grayBg: { value: '#F7FAFC' },           // Subtle background
          teal: { value: '#2C7B80' },             // Vixxo Teal — info/success accent
          tealLight: { value: '#E6F6F7' },        // Light tint for info alerts
          yellow: { value: '#EDA200' },           // Vixxo Yellow — warning accent ONLY
          yellowLight: { value: '#FFF8E6' },      // Light tint for warning alerts
          blue: { value: '#395389' },             // Vixxo Blue — info accent
          copper: { value: '#956125' },           // Vixxo Copper
        },
        // Full 50–950 palettes for each brand color (AC: #1)
        // Use e.g. `brandPalette.green.600` for darker hover/active choices.
        brandPalette: {
          green: createPaletteTokens('#8E992E'),
          gray: createPaletteTokens('#3E4543'),
          teal: createPaletteTokens('#2C7B80'),
          yellow: createPaletteTokens('#EDA200'),
          blue: createPaletteTokens('#395389'),
          copper: createPaletteTokens('#956125'),
        },
        error: {
          red: { value: '#E53E3E' },              // Error red
          redLight: { value: '#FFF5F5' },         // Light tint for error alerts
          redHover: { value: '#C53030' },         // Darker for hover
          redAccessible: { value: '#C53030' },    // ≥4.5:1 contrast on white for text (5.47:1)
        },
        // Surface & atmosphere tokens for layered depth
        surface: {
          page: { value: '#FAFAF7' },             // Warm off-white page background
          raised: { value: '#FFFFFF' },           // Cards, modals, elevated surfaces
          sunken: { value: '#F4F3EF' },           // Inset areas, code blocks
          overlay: { value: 'rgba(62,69,67,0.6)' }, // Modal backdrop
          headerDark: { value: '#2D3331' },       // Dark header — deeper than brand.gray
        },
      },
      fonts: {
        heading: {
          value:
            '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        body: {
          value:
            '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        mono: {
          value:
            '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
        },
      },
      // UX type scale (AC: #2)
      fontSizes: {
        xs: { value: '12px' },   // Tiny
        sm: { value: '14px' },   // Small
        md: { value: '16px' },   // Body
        lg: { value: '20px' },   // H3
        xl: { value: '24px' },   // H2
        '2xl': { value: '32px' }, // H1
      },
      // Line heights per UX spec (AC: #2)
      lineHeights: {
        tight: { value: '1.2' },   // H1
        snug: { value: '1.3' },    // H2, H3
        normal: { value: '1.5' },  // Body, Small
      },
      // 4px spacing scale (AC: #3)
      spacing: {
        '1': { value: '4px' },
        '2': { value: '8px' },
        '3': { value: '12px' },
        '4': { value: '16px' },
        '6': { value: '24px' },
        '8': { value: '32px' },
        '12': { value: '48px' },
      },
    },

    // Semantic color tokens (AC: #4)
    // Supports light/dark mode via Chakra _dark condition.
    semanticTokens: {
      colors: {
        'brand.primary': { value: '{colors.brand.green}' },
        'brand.primaryHover': { value: '{colors.brand.greenHover}' },
        'brand.success': { value: '{colors.brand.teal}' },
        // WARNING: Yellow is not accessible for text on white. Use as background.
        'brand.warning': { value: { _light: '{colors.brand.yellowLight}', _dark: '#3D3010' } },
        'brand.warningAccent': { value: '{colors.brand.yellow}' },
        // DANGER: Provide accessible red for text usage.
        'brand.danger': { value: '{colors.error.redAccessible}' },
        'brand.dangerBg': { value: { _light: '{colors.error.redLight}', _dark: '#2D1A1A' } },
        'brand.info': { value: '{colors.brand.teal}' },
        // Foreground (text) — dark mode uses warm near-white tones
        'fg.brand': { value: { _light: '{colors.brand.gray}', _dark: '#E2E5E4' } },
        'fg.brandMuted': { value: { _light: '{colors.brand.grayLight}', _dark: '#8A9290' } },
        'fg.link': { value: { _light: '{colors.brand.greenAccessible}', _dark: '#A3B235' } },
        // Surface semantics — dark mode uses layered warm charcoal tones
        'surface.page': { value: { _light: '#F7F7F7', _dark: '#141716' } },
        'surface.raised': { value: { _light: '#FFFFFF', _dark: '#1E2220' } },
        'surface.sunken': { value: { _light: '#EFEFEF', _dark: '#181B19' } },
        'surface.hover': { value: { _light: '#FFFFFF', _dark: '#262A28' } },
        'surface.overlay': { value: { _light: 'rgba(62,69,67,0.6)', _dark: 'rgba(0,0,0,0.75)' } },
        'surface.headerDark': { value: { _light: '#2D3331', _dark: '#0F1110' } },
        // Border semantics
        'border.default': { value: { _light: '#E2E8F0', _dark: '#2E3230' } },
        'border.subtle': { value: { _light: '#EDF0EE', _dark: '#252928' } },
      },
    },

    // Component recipes (AC: #5)
    recipes: {
      button: buttonRecipe,
      badge: badgeRecipe,
    },
    slotRecipes: {
      alert: alertRecipe,
    },
  },

  // Global CSS (AC: #6)
  globalCss: {
    // Page background with warm surface tone
    'html, body': {
      bg: 'surface.page',
    },
    // Focus-visible indicator: Vixxo Green 2px outline (AC: #6)
    '*:focus-visible': {
      outline: '2px solid',
      outlineColor: 'brand.green',
      outlineOffset: '2px',
    },
    // Text selection using brand green
    '::selection': {
      bg: 'brand.green',
      color: 'white',
    },
    // Global link styles
    'a': {
      color: 'fg.link',
      _hover: {
        textDecoration: 'underline',
      },
    },
    // Smooth heading rendering
    'h1, h2, h3, h4, h5, h6': {
      fontFamily: 'heading',
      letterSpacing: '-0.02em',
    },
  },
})

export const system = createSystem(defaultConfig, config)
