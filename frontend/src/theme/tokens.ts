/**
 * Raw brand color constants for use outside Chakra components.
 * Use these for inline styles, third-party libraries, direct CSS, or charting.
 *
 * For Chakra components, prefer the theme tokens (e.g., `brand.green`) instead.
 */
export const BRAND_COLORS = {
  green: '#8E992E',
  greenAccessible: '#6F7B24', // Darkened Vixxo Green — 4.63:1 contrast on white (WCAG AA)
  greenHover: '#7A8528',
  greenActive: '#6B7322',
  greenLight: '#F4F5E9',
  gray: '#3E4543',
  grayLight: '#718096',
  grayBg: '#F7FAFC',
  teal: '#2C7B80',
  tealLight: '#E6F6F7',
  yellow: '#EDA200', // ⚠️ NEVER use as text on white — only as bg/accent with dark text
  yellowLight: '#FFF8E6',
  blue: '#395389',
  copper: '#956125',
  errorRed: '#E53E3E',
  errorRedLight: '#FFF5F5',
  errorRedHover: '#C53030',
  // Accessible error red for text on white (same as hover).
  errorRedAccessible: '#C53030',
} as const
