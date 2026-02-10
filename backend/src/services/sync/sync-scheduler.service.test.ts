import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Use vi.hoisted so mock fns are available in hoisted vi.mock factories
const { mockSchedule, mockValidate, mockRunSync } = vi.hoisted(() => ({
  mockSchedule: vi.fn(),
  mockValidate: vi.fn(),
  mockRunSync: vi.fn(),
}))

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
    validate: mockValidate,
  },
}))

// Mock sync service
vi.mock('./sync.service.js', () => ({
  syncService: {
    runSync: mockRunSync,
  },
}))

// Import after mocking
import { SyncSchedulerService } from './sync-scheduler.service.js'

describe('SyncSchedulerService', () => {
  let scheduler: SyncSchedulerService
  let originalSyncEnabled: string | undefined
  let originalSyncCronSchedule: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    originalSyncEnabled = process.env.SYNC_ENABLED
    originalSyncCronSchedule = process.env.SYNC_CRON_SCHEDULE
    delete process.env.SYNC_ENABLED
    delete process.env.SYNC_CRON_SCHEDULE
    scheduler = new SyncSchedulerService()

    // Default: valid cron, sync resolves
    mockValidate.mockReturnValue(true)
    mockRunSync.mockResolvedValue(undefined)
  })

  afterEach(() => {
    scheduler.stop()

    if (originalSyncEnabled !== undefined) {
      process.env.SYNC_ENABLED = originalSyncEnabled
    } else {
      delete process.env.SYNC_ENABLED
    }
    if (originalSyncCronSchedule !== undefined) {
      process.env.SYNC_CRON_SCHEDULE = originalSyncCronSchedule
    } else {
      delete process.env.SYNC_CRON_SCHEDULE
    }
  })

  describe('start', () => {
    it('should create a cron task when enabled (default)', () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()

      expect(mockValidate).toHaveBeenCalledWith('0 6,12 * * *')
      expect(mockSchedule).toHaveBeenCalledWith(
        '0 6,12 * * *',
        expect.any(Function),
      )
      expect(scheduler.isRunning()).toBe(true)
    })

    it('should use custom SYNC_CRON_SCHEDULE from env', () => {
      process.env.SYNC_CRON_SCHEDULE = '*/30 * * * *'
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()

      expect(mockValidate).toHaveBeenCalledWith('*/30 * * * *')
      expect(mockSchedule).toHaveBeenCalledWith(
        '*/30 * * * *',
        expect.any(Function),
      )
    })

    it('should skip scheduling when SYNC_ENABLED=false', () => {
      process.env.SYNC_ENABLED = 'false'

      scheduler.start()

      expect(mockSchedule).not.toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should treat common falsey values as disabled', () => {
      process.env.SYNC_ENABLED = 'FALSE'

      scheduler.start()

      expect(mockSchedule).not.toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should not skip scheduling when SYNC_ENABLED is any other value', () => {
      process.env.SYNC_ENABLED = 'true'
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()

      expect(mockSchedule).toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(true)
    })

    it('should be idempotent: calling start twice should only schedule once', () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()
      scheduler.start()

      expect(mockSchedule).toHaveBeenCalledTimes(1)
      expect(scheduler.isRunning()).toBe(true)
    })

    it('should log error and not schedule for invalid cron expression', () => {
      mockValidate.mockReturnValue(false)

      scheduler.start()

      expect(mockSchedule).not.toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should fire initial sync on start', () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()

      expect(mockRunSync).toHaveBeenCalledTimes(1)
    })

    it('should not crash if initial sync fails', async () => {
      mockRunSync.mockRejectedValue(new Error('Initial sync failure'))
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      // Should not throw
      scheduler.start()

      // Give the .catch handler time to run
      await vi.waitFor(() => {
        expect(mockRunSync).toHaveBeenCalled()
      })

      expect(scheduler.isRunning()).toBe(true)
    })

    it('should invoke syncService.runSync when cron triggers', async () => {
      let cronCallback: (() => Promise<void>) | undefined
      mockSchedule.mockImplementation((_schedule: string, callback: () => Promise<void>) => {
        cronCallback = callback
        return { stop: vi.fn() }
      })

      scheduler.start()

      // Reset to only track the cron-triggered call
      mockRunSync.mockClear()

      // Simulate cron tick
      await cronCallback!()

      expect(mockRunSync).toHaveBeenCalledTimes(1)
    })
  })

  describe('stop', () => {
    it('should destroy the cron task', () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()
      expect(scheduler.isRunning()).toBe(true)

      scheduler.stop()

      expect(mockTask.stop).toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should be safe to call stop when not running', () => {
      expect(scheduler.isRunning()).toBe(false)

      // Should not throw
      scheduler.stop()

      expect(scheduler.isRunning()).toBe(false)
    })
  })

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should return true after start', () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()

      expect(scheduler.isRunning()).toBe(true)
    })

    it('should return false after stop', () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      scheduler.start()
      scheduler.stop()

      expect(scheduler.isRunning()).toBe(false)
    })
  })
})
