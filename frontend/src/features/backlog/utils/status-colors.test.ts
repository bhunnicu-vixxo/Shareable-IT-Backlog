import { describe, it, expect } from 'vitest'
import { STATUS_COLORS, DEFAULT_STATUS_COLORS } from './status-colors'

describe('STATUS_COLORS', () => {
  it('defines colors for started status', () => {
    expect(STATUS_COLORS.started).toBeDefined()
    expect(STATUS_COLORS.started.bg).toBe('brand.teal')
    expect(STATUS_COLORS.started.color).toBe('white')
  })

  it('defines colors for completed status using accessible green (≥4.5:1 with white)', () => {
    expect(STATUS_COLORS.completed).toBeDefined()
    // brand.greenAccessible (#6F7B24) provides 4.63:1 contrast with white text
    // brand.green (#8E992E) only provides 3.11:1 which fails AA for normal text
    expect(STATUS_COLORS.completed.bg).toBe('brand.greenAccessible')
    expect(STATUS_COLORS.completed.color).toBe('white')
  })

  it('defines colors for cancelled status with sufficient contrast (≥4.5:1 with white)', () => {
    expect(STATUS_COLORS.cancelled).toBeDefined()
    expect(STATUS_COLORS.cancelled.color).toBe('white')
    // gray.500 (#718096) is ~4.02:1 on white and fails AA for normal-size text.
    // gray.700 is safely AA-compliant with white text.
    expect(STATUS_COLORS.cancelled.bg).toBe('gray.700')
  })

  it('defines colors for backlog status', () => {
    expect(STATUS_COLORS.backlog).toBeDefined()
    expect(STATUS_COLORS.backlog.bg).toBe('gray.600')
    expect(STATUS_COLORS.backlog.color).toBe('white')
  })

  it('defines colors for unstarted status', () => {
    expect(STATUS_COLORS.unstarted).toBeDefined()
    expect(STATUS_COLORS.unstarted.bg).toBe('brand.blue')
    expect(STATUS_COLORS.unstarted.color).toBe('white')
  })
})

describe('DEFAULT_STATUS_COLORS', () => {
  it('provides fallback colors with sufficient contrast', () => {
    expect(DEFAULT_STATUS_COLORS).toBeDefined()
    expect(DEFAULT_STATUS_COLORS.color).toBe('white')
    // Keep fallback consistent with backlog: gray.600 has strong contrast with white.
    expect(DEFAULT_STATUS_COLORS.bg).toBe('gray.600')
  })
})
