import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

import { AlertService } from './alert.service.js'
import type { StatusTransition } from './health-monitor.service.js'

describe('AlertService', () => {
  let alertService: AlertService
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    alertService = new AlertService()

    // Mock global fetch
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.ALERT_WEBHOOK_URL
    delete process.env.ALERT_COOLDOWN_MS
  })

  describe('handleTransition', () => {
    it('sends alert on status transition to unhealthy', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'

      const transition: StatusTransition = {
        from: 'ok',
        to: 'unhealthy',
        timestamp: new Date().toISOString(),
      }

      const sent = await alertService.handleTransition(transition)

      expect(sent).toBe(true)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://hooks.example.com/alert',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        }),
      )

      // Verify payload includes key info
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.status).toBe('unhealthy')
      expect(body.previousStatus).toBe('ok')
      expect(body.isRecovery).toBe(false)
      expect(body.title).toContain('ALERT')
    })

    it('sends alert on recovery', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'

      const transition: StatusTransition = {
        from: 'unhealthy',
        to: 'ok',
        timestamp: new Date().toISOString(),
      }

      const sent = await alertService.handleTransition(transition)

      expect(sent).toBe(true)
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.isRecovery).toBe(true)
      expect(body.title).toContain('RECOVERY')
    })

    it('sends alert on degraded transition', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'

      const transition: StatusTransition = {
        from: 'ok',
        to: 'degraded',
        timestamp: new Date().toISOString(),
      }

      const sent = await alertService.handleTransition(transition)

      expect(sent).toBe(true)
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.status).toBe('degraded')
      expect(body.isRecovery).toBe(false)
    })

    it('respects cooldown and prevents duplicate alerts', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'
      process.env.ALERT_COOLDOWN_MS = '5000'

      // First alert
      const sent1 = await alertService.handleTransition({
        from: 'ok',
        to: 'unhealthy',
        timestamp: new Date().toISOString(),
      })
      expect(sent1).toBe(true)

      // Second alert within cooldown
      const sent2 = await alertService.handleTransition({
        from: 'unhealthy',
        to: 'ok',
        timestamp: new Date().toISOString(),
      })
      expect(sent2).toBe(false) // Should be blocked by cooldown
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('does not suppress escalation to unhealthy during cooldown', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'
      process.env.ALERT_COOLDOWN_MS = '5000'

      // First alert: ok -> degraded
      const sent1 = await alertService.handleTransition({
        from: 'ok',
        to: 'degraded',
        timestamp: new Date().toISOString(),
      })
      expect(sent1).toBe(true)

      // Second alert within cooldown: degraded -> unhealthy (must still send)
      const sent2 = await alertService.handleTransition({
        from: 'degraded',
        to: 'unhealthy',
        timestamp: new Date().toISOString(),
      })
      expect(sent2).toBe(true)
      expect(fetchSpy).toHaveBeenCalledTimes(2)

      const body = JSON.parse(fetchSpy.mock.calls[1][1].body)
      expect(body.status).toBe('unhealthy')
      expect(body.previousStatus).toBe('degraded')
      expect(body.isRecovery).toBe(false)
    })

    it('does not send alert when webhook URL not configured', async () => {
      // ALERT_WEBHOOK_URL is not set
      const sent = await alertService.handleTransition({
        from: 'ok',
        to: 'unhealthy',
        timestamp: new Date().toISOString(),
      })

      expect(sent).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('handles webhook failure gracefully', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'
      fetchSpy.mockRejectedValue(new Error('Network error'))

      const sent = await alertService.handleTransition({
        from: 'ok',
        to: 'unhealthy',
        timestamp: new Date().toISOString(),
      })

      expect(sent).toBe(false)
    })

    it('handles non-OK webhook response', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const sent = await alertService.handleTransition({
        from: 'ok',
        to: 'unhealthy',
        timestamp: new Date().toISOString(),
      })

      expect(sent).toBe(false)
    })
  })

  describe('resetCooldown', () => {
    it('allows alert after cooldown reset', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert'
      process.env.ALERT_COOLDOWN_MS = '300000' // 5 minutes

      // First alert
      await alertService.handleTransition({
        from: 'ok',
        to: 'unhealthy',
        timestamp: new Date().toISOString(),
      })

      // Would normally be blocked by cooldown
      alertService.resetCooldown()

      // After reset, should be able to send
      const sent = await alertService.handleTransition({
        from: 'unhealthy',
        to: 'ok',
        timestamp: new Date().toISOString(),
      })

      expect(sent).toBe(true)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })
  })
})
