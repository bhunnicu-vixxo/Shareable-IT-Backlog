import { describe, it, expect } from 'vitest'
import { STATUS_COLORS, DEFAULT_STATUS_COLORS, getStatusColor } from './status-colors'
import type { StatusColorEntry } from './status-colors'
import { BRAND_COLORS } from '@/theme/tokens'
import type { WorkflowStateType } from '../types/backlog.types'

const GRAY_TOKENS = {
  // Chakra gray palette defaults (used by this project in several places).
  // These are stable and let us compute contrast ratios in unit tests.
  'gray.400': '#CBD5E0',
  'gray.500': '#A0AEC0',
  'gray.700': '#4A5568',
} as const

function hexToRgb(hex: string) {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const srgb = [r, g, b].map((v) => v / 255)
  const linear = srgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(bgHex: string, fgHex: string) {
  const L1 = relativeLuminance(bgHex)
  const L2 = relativeLuminance(fgHex)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

function resolveTokenToHex(token: string): string | null {
  if (token === 'white') return '#FFFFFF'

  // Brand tokens (defined by this project).
  const brandKey = token.startsWith('brand.') ? token.slice('brand.'.length) : null
  if (brandKey && brandKey in BRAND_COLORS) {
    return BRAND_COLORS[brandKey as keyof typeof BRAND_COLORS]
  }

  // Error tokens (defined by this project).
  if (token === 'error.red') return BRAND_COLORS.errorRed
  if (token === 'error.redHover' || token === 'error.redAccessible') return BRAND_COLORS.errorRedAccessible

  // Chakra gray tokens we rely on in this mapping.
  if (token in GRAY_TOKENS) return GRAY_TOKENS[token as keyof typeof GRAY_TOKENS]

  return null
}

describe('STATUS_COLORS', () => {
  it('defines colors for started status', () => {
    expect(STATUS_COLORS.started).toBeDefined()
    expect(STATUS_COLORS.started.bg).toBe('brand.teal')
    expect(STATUS_COLORS.started.color).toBe('white')
  })

  it('defines colors for completed status using accessible green (≥4.5:1 with white)', () => {
    expect(STATUS_COLORS.completed).toBeDefined()
    expect(STATUS_COLORS.completed.bg).toBe('brand.greenAccessible')
    expect(STATUS_COLORS.completed.color).toBe('white')
  })

  it('defines colors for cancelled status with sufficient contrast (≥4.5:1 with white)', () => {
    expect(STATUS_COLORS.cancelled).toBeDefined()
    expect(STATUS_COLORS.cancelled.color).toBe('white')
    expect(STATUS_COLORS.cancelled.bg).toBe('error.redHover')
  })

  it('defines colors for backlog status', () => {
    expect(STATUS_COLORS.backlog).toBeDefined()
    expect(STATUS_COLORS.backlog.bg).toBe('gray.700')
    expect(STATUS_COLORS.backlog.color).toBe('white')
  })

  it('defines colors for unstarted status', () => {
    expect(STATUS_COLORS.unstarted).toBeDefined()
    expect(STATUS_COLORS.unstarted.bg).toBe('brand.blue')
    expect(STATUS_COLORS.unstarted.color).toBe('white')
  })

  it('defines colors for triage status', () => {
    expect(STATUS_COLORS.triage).toBeDefined()
    expect(STATUS_COLORS.triage.bg).toBeTruthy()
    expect(STATUS_COLORS.triage.color).toBe('white')
  })

  it('each entry includes a human-readable label', () => {
    const expectedLabels: Record<WorkflowStateType, string> = {
      backlog: 'Not yet planned',
      triage: 'Triage',
      unstarted: 'Planned',
      started: 'In Progress',
      completed: 'Done',
      cancelled: 'Cancelled',
    }

    for (const key of Object.keys(expectedLabels) as WorkflowStateType[]) {
      expect(STATUS_COLORS[key]).toBeDefined()
      expect(STATUS_COLORS[key].label).toBe(expectedLabels[key])
    }
  })

  it('each entry includes a borderColor for left-border indicator', () => {
    for (const entry of Object.values(STATUS_COLORS)) {
      expect(entry.borderColor).toBeTruthy()
    }
  })

  it('each entry uses an AA-compliant badge contrast pairing', () => {
    for (const entry of Object.values(STATUS_COLORS)) {
      const bgHex = resolveTokenToHex(entry.bg)
      const fgHex = resolveTokenToHex(entry.color)
      expect(bgHex).toBeTruthy()
      expect(fgHex).toBeTruthy()
      if (!bgHex || !fgHex) continue

      // WCAG AA for normal text: 4.5:1
      expect(contrastRatio(bgHex, fgHex)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('DEFAULT_STATUS_COLORS', () => {
  it('provides fallback colors with sufficient contrast', () => {
    expect(DEFAULT_STATUS_COLORS).toBeDefined()
    expect(DEFAULT_STATUS_COLORS.color).toBe('white')
    expect(DEFAULT_STATUS_COLORS.bg).toBe('gray.700')
  })

  it('provides a fallback label', () => {
    expect(DEFAULT_STATUS_COLORS.label).toBe('Unknown')
  })

  it('provides a fallback borderColor', () => {
    expect(DEFAULT_STATUS_COLORS.borderColor).toBeTruthy()
  })
})

describe('getStatusColor', () => {
  it('returns correct entry for each known status type', () => {
    const knownTypes: WorkflowStateType[] = ['backlog', 'triage', 'unstarted', 'started', 'completed', 'cancelled']
    for (const type of knownTypes) {
      const result = getStatusColor(type)
      expect(result).toBe(STATUS_COLORS[type])
    }
  })

  it('returns fallback for unknown status type', () => {
    const result = getStatusColor('some-unknown-status')
    expect(result).toEqual(DEFAULT_STATUS_COLORS)
  })

  it('returns fallback for empty string', () => {
    const result = getStatusColor('')
    expect(result).toEqual(DEFAULT_STATUS_COLORS)
  })

  it('returned entry has all required fields', () => {
    const result: StatusColorEntry = getStatusColor('started')
    expect(result.bg).toBeTruthy()
    expect(result.color).toBeTruthy()
    expect(result.label).toBeTruthy()
    expect(result.borderColor).toBeTruthy()
  })
})
