import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Mock logger
const mockLogger = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../utils/logger.js', () => ({
  logger: mockLogger,
}))

// We need to control what loadNetworkConfig returns for each test
const mockLoadNetworkConfig = vi.hoisted(() => vi.fn())

vi.mock('../config/network.config.js', () => ({
  loadNetworkConfig: mockLoadNetworkConfig,
}))

import {
  networkVerificationMiddleware,
  resetNetworkConfig,
} from './network.middleware.js'

// Helper to create a mock IPCIDR-like object
function createMockCIDR(ranges: string[]) {
  return ranges.map((range) => ({
    contains: (ip: string) => {
      // Simple mock: parse CIDR and check containment
      const [network, bits] = range.split('/')
      const netParts = network.split('.').map(Number)
      const ipParts = ip.split('.').map(Number)
      const mask = parseInt(bits)

      if (mask === 8) return ipParts[0] === netParts[0]
      if (mask === 12)
        return ipParts[0] === netParts[0] && ipParts[1] >= netParts[1] && ipParts[1] <= 31
      if (mask === 16) return ipParts[0] === netParts[0] && ipParts[1] === netParts[1]
      if (mask === 24)
        return (
          ipParts[0] === netParts[0] &&
          ipParts[1] === netParts[1] &&
          ipParts[2] === netParts[2]
        )
      return false
    },
  }))
}

function createMockReq(ip: string, path = '/api/backlog'): Partial<Request> {
  return {
    ip,
    path,
    socket: { remoteAddress: ip } as Request['socket'],
  }
}

function createMockRes(): Partial<Response> & { _statusCode?: number; _body?: unknown } {
  const res: Partial<Response> & { _statusCode?: number; _body?: unknown } = {
    _statusCode: undefined,
    _body: undefined,
  }
  res.status = vi.fn((code: number) => {
    res._statusCode = code
    return res as Response
  })
  res.json = vi.fn((body: unknown) => {
    res._body = body
    return res as Response
  })
  return res
}

describe('networkVerificationMiddleware', () => {
  let next: NextFunction

  beforeEach(() => {
    next = vi.fn()
    resetNetworkConfig()
    mockLoadNetworkConfig.mockClear()
    mockLogger.warn.mockClear()
    mockLogger.debug.mockClear()
  })

  describe('when network check is disabled', () => {
    beforeEach(() => {
      mockLoadNetworkConfig.mockReturnValue({
        enabled: false,
        allowedRanges: [],
        rawRanges: [],
      })
    })

    it('should call next() regardless of IP', () => {
      const req = createMockReq('8.8.8.8')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should log debug message about bypass', () => {
      const req = createMockReq('8.8.8.8')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('bypassed'),
      )
    })
  })

  describe('when network check is enabled', () => {
    beforeEach(() => {
      mockLoadNetworkConfig.mockReturnValue({
        enabled: true,
        allowedRanges: createMockCIDR(['10.0.0.0/8', '192.168.0.0/16']),
        rawRanges: ['10.0.0.0/8', '192.168.0.0/16'],
      })
    })

    it('should allow IP within allowed range and call next()', () => {
      const req = createMockReq('10.1.2.3')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should allow IP from second range', () => {
      const req = createMockReq('192.168.1.50')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should deny IP outside all allowed ranges with 403', () => {
      const req = createMockReq('8.8.8.8')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: expect.stringContaining('Access denied'),
          code: 'NETWORK_ACCESS_DENIED',
        },
      })
    })

    it('should log warn for denied access with client IP', () => {
      const req = createMockReq('8.8.8.8')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ clientIp: '8.8.8.8' }),
        expect.stringContaining('denied'),
      )
    })

    it('should log debug with client IP for verification check', () => {
      const req = createMockReq('10.1.2.3')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ clientIp: '10.1.2.3' }),
        expect.stringContaining('verification'),
      )
    })
  })

  describe('IPv4-mapped IPv6 normalization', () => {
    beforeEach(() => {
      mockLoadNetworkConfig.mockReturnValue({
        enabled: true,
        allowedRanges: createMockCIDR(['10.0.0.0/8']),
        rawRanges: ['10.0.0.0/8'],
      })
    })

    it('should normalize ::ffff: prefixed IPv4-mapped IPv6 addresses', () => {
      const req = createMockReq('::ffff:10.1.2.3')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should deny normalized IPv4-mapped IPv6 outside range', () => {
      const req = createMockReq('::ffff:8.8.8.8')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('IP resolution fallback', () => {
    beforeEach(() => {
      mockLoadNetworkConfig.mockReturnValue({
        enabled: true,
        allowedRanges: createMockCIDR(['10.0.0.0/8']),
        rawRanges: ['10.0.0.0/8'],
      })
    })

    it('should fall back to socket.remoteAddress when req.ip is undefined', () => {
      const req: Partial<Request> = {
        ip: undefined,
        path: '/api/backlog',
        socket: { remoteAddress: '10.1.2.3' } as Request['socket'],
      }
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
    })

    it('should deny empty IP', () => {
      const req: Partial<Request> = {
        ip: undefined,
        path: '/api/backlog',
        socket: { remoteAddress: undefined } as unknown as Request['socket'],
      }
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('config caching', () => {
    it('should only call loadNetworkConfig once (cached)', () => {
      mockLoadNetworkConfig.mockReturnValue({
        enabled: false,
        allowedRanges: [],
        rawRanges: [],
      })

      const req = createMockReq('10.1.2.3')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)
      networkVerificationMiddleware(req as Request, res as Response, next)

      expect(mockLoadNetworkConfig).toHaveBeenCalledTimes(1)
    })

    it('should reload config after resetNetworkConfig()', () => {
      mockLoadNetworkConfig.mockReturnValue({
        enabled: false,
        allowedRanges: [],
        rawRanges: [],
      })

      const req = createMockReq('10.1.2.3')
      const res = createMockRes()

      networkVerificationMiddleware(req as Request, res as Response, next)
      expect(mockLoadNetworkConfig).toHaveBeenCalledTimes(1)

      resetNetworkConfig()
      networkVerificationMiddleware(req as Request, res as Response, next)
      expect(mockLoadNetworkConfig).toHaveBeenCalledTimes(2)
    })
  })
})
