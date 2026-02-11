import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger before importing the module under test
const mockLogger = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../utils/logger.js', () => ({
  logger: mockLogger,
}))

// Dynamic import so we can manipulate env vars before each test
let loadNetworkConfig: typeof import('./network.config.js').loadNetworkConfig

beforeEach(async () => {
  vi.resetModules()
  mockLogger.warn.mockClear()
  mockLogger.debug.mockClear()

  // Re-import to pick up fresh env vars
  const mod = await import('./network.config.js')
  loadNetworkConfig = mod.loadNetworkConfig
})

afterEach(() => {
  // Clean up env vars
  delete process.env.NETWORK_CHECK_ENABLED
  delete process.env.ALLOWED_NETWORKS
})

describe('loadNetworkConfig', () => {
  describe('enabled flag', () => {
    it('should default to enabled in production when NETWORK_CHECK_ENABLED is not set', () => {
      const originalNodeEnv = process.env.NODE_ENV
      delete process.env.NETWORK_CHECK_ENABLED
      process.env.NODE_ENV = 'production'
      const config = loadNetworkConfig()
      expect(config.enabled).toBe(true)
      if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv
      else delete process.env.NODE_ENV
    })

    it('should be enabled when NETWORK_CHECK_ENABLED is "true"', () => {
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.enabled).toBe(true)
    })

    it('should be disabled when NETWORK_CHECK_ENABLED is "false"', () => {
      process.env.NETWORK_CHECK_ENABLED = 'false'
      const config = loadNetworkConfig()
      expect(config.enabled).toBe(false)
    })

    it('should default to disabled in non-production when NETWORK_CHECK_ENABLED is not set', () => {
      const originalNodeEnv = process.env.NODE_ENV
      delete process.env.NETWORK_CHECK_ENABLED
      process.env.NODE_ENV = 'test'
      const config = loadNetworkConfig()
      expect(config.enabled).toBe(false)
      if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv
      else delete process.env.NODE_ENV
    })
  })

  describe('CIDR range parsing', () => {
    it('should parse valid CIDR ranges', () => {
      process.env.ALLOWED_NETWORKS = '10.0.0.0/8,172.16.0.0/12'
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges).toHaveLength(2)
      expect(config.rawRanges).toEqual(['10.0.0.0/8', '172.16.0.0/12'])
    })

    it('should handle spaces around CIDR ranges', () => {
      process.env.ALLOWED_NETWORKS = ' 10.0.0.0/8 , 172.16.0.0/12 '
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges).toHaveLength(2)
      expect(config.rawRanges).toEqual(['10.0.0.0/8', '172.16.0.0/12'])
    })

    it('should return empty ranges when ALLOWED_NETWORKS is not set', () => {
      delete process.env.ALLOWED_NETWORKS
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges).toHaveLength(0)
      expect(config.rawRanges).toEqual([])
    })

    it('should return empty ranges when ALLOWED_NETWORKS is empty string', () => {
      process.env.ALLOWED_NETWORKS = ''
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges).toHaveLength(0)
      expect(config.rawRanges).toEqual([])
    })

    it('should skip invalid CIDR entries and log warnings', () => {
      process.env.ALLOWED_NETWORKS = '10.0.0.0/8,invalid-range,172.16.0.0/12'
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges).toHaveLength(2)
      expect(config.rawRanges).toEqual(['10.0.0.0/8', 'invalid-range', '172.16.0.0/12'])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { range: 'invalid-range' },
        expect.stringContaining('Invalid CIDR'),
      )
    })

    it('should handle all invalid entries', () => {
      process.env.ALLOWED_NETWORKS = 'bad1,bad2'
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges).toHaveLength(0)
      expect(mockLogger.warn).toHaveBeenCalledTimes(3) // 2 invalid + 1 "no valid ranges" warning
    })

    it('should parse single CIDR range', () => {
      process.env.ALLOWED_NETWORKS = '192.168.0.0/16'
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges).toHaveLength(1)
      expect(config.rawRanges).toEqual(['192.168.0.0/16'])
    })
  })

  describe('warnings', () => {
    it('should warn when enabled but no valid ALLOWED_NETWORKS configured', () => {
      process.env.NETWORK_CHECK_ENABLED = 'true'
      delete process.env.ALLOWED_NETWORKS
      loadNetworkConfig()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no valid ALLOWED_NETWORKS'),
      )
    })

    it('should NOT warn when disabled and no ALLOWED_NETWORKS configured', () => {
      process.env.NETWORK_CHECK_ENABLED = 'false'
      delete process.env.ALLOWED_NETWORKS
      loadNetworkConfig()
      // Should not warn about missing networks when check is disabled
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('no valid ALLOWED_NETWORKS'),
      )
    })
  })

  describe('CIDR range containment', () => {
    it('should correctly contain IPs within a /8 range', () => {
      process.env.ALLOWED_NETWORKS = '10.0.0.0/8'
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges[0].contains('10.1.2.3')).toBe(true)
      expect(config.allowedRanges[0].contains('10.255.255.255')).toBe(true)
      expect(config.allowedRanges[0].contains('11.0.0.1')).toBe(false)
    })

    it('should correctly contain IPs within a /16 range', () => {
      process.env.ALLOWED_NETWORKS = '192.168.0.0/16'
      process.env.NETWORK_CHECK_ENABLED = 'true'
      const config = loadNetworkConfig()
      expect(config.allowedRanges[0].contains('192.168.1.1')).toBe(true)
      expect(config.allowedRanges[0].contains('192.169.0.1')).toBe(false)
    })
  })
})
