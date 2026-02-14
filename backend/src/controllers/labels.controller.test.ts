import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockGetVisibleLabels = vi.fn()

vi.mock('../services/labels/label-visibility.service.js', () => ({
  getVisibleLabels: (...args: unknown[]) => mockGetVisibleLabels(...args),
}))

import { getVisibleLabelsHandler } from './labels.controller.js'

function createMockRes() {
  return {
    json: vi.fn(),
  } as unknown as Response
}

describe('labels.controller', () => {
  let next: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    next = vi.fn()
  })

  it('returns only visible labels for regular users', async () => {
    mockGetVisibleLabels.mockResolvedValueOnce(['Bug'])
    const req = { session: { isAdmin: false, isIT: false } } as unknown as Request
    const res = createMockRes()

    await getVisibleLabelsHandler(req, res, next)

    expect(mockGetVisibleLabels).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(['Bug'])
  })

  it('returns only visible labels for IT users (same as regular)', async () => {
    mockGetVisibleLabels.mockResolvedValueOnce(['Bug'])
    const req = { session: { isIT: true, isAdmin: false } } as unknown as Request
    const res = createMockRes()

    await getVisibleLabelsHandler(req, res, next)

    expect(mockGetVisibleLabels).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(['Bug'])
  })

  it('returns only visible labels for Admin users (same as regular)', async () => {
    mockGetVisibleLabels.mockResolvedValueOnce(['Bug'])
    const req = { session: { isAdmin: true, isIT: false } } as unknown as Request
    const res = createMockRes()

    await getVisibleLabelsHandler(req, res, next)

    expect(mockGetVisibleLabels).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(['Bug'])
  })

  it('passes errors to next middleware', async () => {
    const error = new Error('Database failure')
    mockGetVisibleLabels.mockRejectedValueOnce(error)
    const req = { session: {} } as unknown as Request
    const res = createMockRes()

    await getVisibleLabelsHandler(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
