import { describe, it, expect } from 'vitest'
import { BRAND_COLORS } from './tokens'

// ============================================================================
// WCAG 2.1 Contrast Ratio Calculation
// See: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
// ============================================================================

/**
 * Convert a hex color to relative luminance per WCAG 2.1.
 * Formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getRelativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/**
 * Calculate WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value between 1 and 21.
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1)
  const l2 = getRelativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

const WHITE = '#FFFFFF'

describe('BRAND_COLORS', () => {
  describe('exported values', () => {
    it('exports correct green hex value', () => {
      expect(BRAND_COLORS.green).toBe('#8E992E')
    })

    it('exports correct greenAccessible hex value', () => {
      expect(BRAND_COLORS.greenAccessible).toBe('#6F7B24')
    })

    it('exports correct gray hex value', () => {
      expect(BRAND_COLORS.gray).toBe('#3E4543')
    })

    it('exports correct teal hex value', () => {
      expect(BRAND_COLORS.teal).toBe('#2C7B80')
    })

    it('exports correct yellow hex value', () => {
      expect(BRAND_COLORS.yellow).toBe('#EDA200')
    })

    it('exports correct blue hex value', () => {
      expect(BRAND_COLORS.blue).toBe('#395389')
    })

    it('exports correct copper hex value', () => {
      expect(BRAND_COLORS.copper).toBe('#956125')
    })

    it('exports correct errorRed hex value', () => {
      expect(BRAND_COLORS.errorRed).toBe('#E53E3E')
    })

    it('exports correct errorRedAccessible hex value', () => {
      expect(BRAND_COLORS.errorRedAccessible).toBe('#C53030')
    })
  })

  describe('WCAG contrast ratios on white', () => {
    it('greenAccessible meets WCAG AA for normal text (≥4.5:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.greenAccessible, WHITE)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('gray meets WCAG AA for normal text (≥4.5:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.gray, WHITE)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('teal meets WCAG AA for normal text (≥4.5:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.teal, WHITE)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('blue meets WCAG AA for normal text (≥4.5:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.blue, WHITE)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('errorRed meets WCAG AA for large text (≥3:1)', () => {
      // Standard red #E53E3E is ~4.13:1 — meets large text but not normal text (4.5:1).
      const ratio = getContrastRatio(BRAND_COLORS.errorRed, WHITE)
      expect(ratio).toBeGreaterThanOrEqual(3.0)
    })

    it('errorRedAccessible meets WCAG AA for normal text (≥4.5:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.errorRedAccessible, WHITE)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('green (original) meets WCAG AA for large text (≥3:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.green, WHITE)
      expect(ratio).toBeGreaterThanOrEqual(3.0)
    })

    it('yellow does NOT meet WCAG AA for any text (contrast <3:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.yellow, WHITE)
      expect(ratio).toBeLessThan(3.0)
    })

    it('gray on white has excellent contrast (>9:1)', () => {
      const ratio = getContrastRatio(BRAND_COLORS.gray, WHITE)
      expect(ratio).toBeGreaterThan(9)
    })
  })
})
