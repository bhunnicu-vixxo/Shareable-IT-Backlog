import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'

// Use vi.hoisted so mock fns are available in hoisted vi.mock factories
const { mockTestConnection, mockVerifyAuth } = vi.hoisted(() => ({
  mockTestConnection: vi.fn(),
  mockVerifyAuth: vi.fn(),
}))

// Mock the database utility
vi.mock('../../utils/database.js', () => ({
  testConnection: mockTestConnection,
}))

// Mock the Linear client service
vi.mock('../sync/linear-client.service.js', () => ({
  linearClient: {
    verifyAuth: mockVerifyAuth,
  },
}))

// Mock the logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

import { HealthMonitorService } from './health-monitor.service.js'

describe('HealthMonitorService', () => {
  let monitor: HealthMonitorService
  const originalLinearApiKey = process.env.LINEAR_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    monitor = new HealthMonitorService()

    process.env.LINEAR_API_KEY = 'test-linear-key'

    // Default: healthy state
    mockTestConnection.mockResolvedValue({ connected: true, latencyMs: 5 })
    mockVerifyAuth.mockResolvedValue({
      data: { id: '1', name: 'Test', email: 'test@test.com' },
      rateLimit: null,
    })
  })

  afterEach(() => {
    monitor.stop()
    vi.useRealTimers()
  })

  afterAll(() => {
    if (originalLinearApiKey !== undefined) process.env.LINEAR_API_KEY = originalLinearApiKey
    else delete process.env.LINEAR_API_KEY
  })

  describe('runCheck', () => {
    it('performs a health check and returns result', async () => {
      const result = await monitor.runCheck()

      expect(result.status).toBe('ok')
      expect(result.checks.database.connected).toBe(true)
      expect(result.checks.linear.connected).toBe(true)
      expect(result.timestamp).toBeTruthy()
    })

    it('returns degraded when Linear is down but DB is up', async () => {
      mockVerifyAuth.mockRejectedValue(new Error('Linear unavailable'))

      const result = await monitor.runCheck()

      expect(result.status).toBe('degraded')
      expect(result.checks.database.connected).toBe(true)
      expect(result.checks.linear.connected).toBe(false)
    })

    it('returns unhealthy when database is down', async () => {
      mockTestConnection.mockResolvedValue({ connected: false })

      const result = await monitor.runCheck()

      expect(result.status).toBe('unhealthy')
      expect(result.checks.database.connected).toBe(false)
    })
  })

  describe('periodic health check execution', () => {
    it('starts and stops periodic checks', () => {
      monitor.start(1000)
      expect(monitor.isRunning()).toBe(true)

      monitor.stop()
      expect(monitor.isRunning()).toBe(false)
    })

    it('runs check immediately on start', async () => {
      monitor.start(60000)

      // Flush the microtask queue to allow the initial check to complete
      await vi.advanceTimersByTimeAsync(0)

      expect(mockTestConnection).toHaveBeenCalledTimes(1)
    })

    it('runs checks at configured interval', async () => {
      monitor.start(1000)

      // Flush initial check
      await vi.advanceTimersByTimeAsync(0)
      expect(mockTestConnection).toHaveBeenCalledTimes(1)

      // Advance timer by 1 interval
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockTestConnection).toHaveBeenCalledTimes(2)

      // Advance timer by another interval
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockTestConnection).toHaveBeenCalledTimes(3)
    })

    it('does not start twice', () => {
      monitor.start(1000)
      monitor.start(1000) // Second call should be a no-op

      expect(monitor.isRunning()).toBe(true)
    })
  })

  describe('consecutive failure tracking', () => {
    it('tracks consecutive database failures', async () => {
      mockTestConnection.mockResolvedValue({ connected: false })

      await monitor.runCheck()
      await monitor.runCheck()
      await monitor.runCheck()

      const metrics = monitor.getMetrics()
      expect(metrics.database.consecutiveFailures).toBe(3)
    })

    it('resets consecutive failures on recovery', async () => {
      mockTestConnection.mockResolvedValue({ connected: false })
      await monitor.runCheck()
      await monitor.runCheck()

      expect(monitor.getMetrics().database.consecutiveFailures).toBe(2)

      // Recover
      mockTestConnection.mockResolvedValue({ connected: true, latencyMs: 5 })
      await monitor.runCheck()

      expect(monitor.getMetrics().database.consecutiveFailures).toBe(0)
    })

    it('tracks consecutive Linear failures', async () => {
      mockVerifyAuth.mockRejectedValue(new Error('Linear unavailable'))

      await monitor.runCheck()
      await monitor.runCheck()

      const metrics = monitor.getMetrics()
      expect(metrics.linear.consecutiveFailures).toBe(2)
    })
  })

  describe('metrics collection', () => {
    it('increments total check count', async () => {
      await monitor.runCheck()
      await monitor.runCheck()
      await monitor.runCheck()

      const metrics = monitor.getMetrics()
      expect(metrics.totalChecks).toBe(3)
      expect(metrics.database.totalChecks).toBe(3)
      expect(metrics.linear.totalChecks).toBe(3)
    })

    it('tracks cumulative latency', async () => {
      mockTestConnection.mockResolvedValue({ connected: true, latencyMs: 10 })

      await monitor.runCheck()
      await monitor.runCheck()

      const metrics = monitor.getMetrics()
      expect(metrics.database.totalLatencyMs).toBe(20)
      expect(metrics.database.latencySamples).toBe(2)
      expect(metrics.database.averageLatencyMs).toBe(10)
    })

    it('includes startedAt timestamp', () => {
      const metrics = monitor.getMetrics()
      expect(metrics.startedAt).toBeTruthy()
      // Should be a valid ISO date
      expect(new Date(metrics.startedAt).toISOString()).toBe(metrics.startedAt)
    })

    it('returns a snapshot that does not allow callers to mutate internal state', async () => {
      await monitor.runCheck()

      const snapshot1 = monitor.getMetrics()
      snapshot1.database.totalChecks = 999
      snapshot1.database.totalLatencyMs = 999

      const snapshot2 = monitor.getMetrics()
      expect(snapshot2.database.totalChecks).not.toBe(999)
      expect(snapshot2.database.totalLatencyMs).not.toBe(999)
    })
  })

  describe('status transitions', () => {
    it('notifies listeners on status transition', async () => {
      const listener = vi.fn()
      monitor.onStatusTransition(listener)

      // First check is ok
      await monitor.runCheck()
      expect(listener).not.toHaveBeenCalled()

      // Second check transitions to degraded
      mockVerifyAuth.mockRejectedValue(new Error('Linear down'))
      await monitor.runCheck()

      expect(listener).toHaveBeenCalledWith({
        from: 'ok',
        to: 'degraded',
        timestamp: expect.any(String),
      })
    })

    it('notifies on recovery transition', async () => {
      const listener = vi.fn()
      monitor.onStatusTransition(listener)

      // Go to degraded
      mockVerifyAuth.mockRejectedValue(new Error('Linear down'))
      await monitor.runCheck()

      // Recover
      mockVerifyAuth.mockResolvedValue({
        data: { id: '1', name: 'Test', email: 'test@test.com' },
        rateLimit: null,
      })
      await monitor.runCheck()

      expect(listener).toHaveBeenCalledTimes(2)
      expect(listener).toHaveBeenLastCalledWith({
        from: 'degraded',
        to: 'ok',
        timestamp: expect.any(String),
      })
    })
  })
})
