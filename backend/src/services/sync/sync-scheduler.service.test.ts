import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Use vi.hoisted so mock fns are available in hoisted vi.mock factories
const { mockSchedule, mockValidate, mockRunSync, mockGetSyncCronSchedule } = vi.hoisted(() => ({
  mockSchedule: vi.fn(),
  mockValidate: vi.fn(),
  mockRunSync: vi.fn(),
  mockGetSyncCronSchedule: vi.fn(),
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

// Mock app-settings service
vi.mock('../settings/app-settings.service.js', () => ({
  getSyncCronSchedule: mockGetSyncCronSchedule,
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

    // Default: valid cron, sync resolves, DB returns schedule
    mockValidate.mockReturnValue(true)
    mockRunSync.mockResolvedValue(undefined)
    mockGetSyncCronSchedule.mockResolvedValue('*/15 * * * *')
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
    it('should read schedule from database and create a cron task', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()

      expect(mockGetSyncCronSchedule).toHaveBeenCalledOnce()
      expect(mockValidate).toHaveBeenCalledWith('*/15 * * * *')
      expect(mockSchedule).toHaveBeenCalledWith(
        '*/15 * * * *',
        expect.any(Function),
      )
      expect(scheduler.isRunning()).toBe(true)
      expect(scheduler.getSchedule()).toBe('*/15 * * * *')
    })

    it('should use schedule returned by getSyncCronSchedule', async () => {
      mockGetSyncCronSchedule.mockResolvedValue('0 */6 * * *')
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()

      expect(mockValidate).toHaveBeenCalledWith('0 */6 * * *')
      expect(mockSchedule).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function),
      )
    })

    it('should fall back to hardcoded default when getSyncCronSchedule throws', async () => {
      mockGetSyncCronSchedule.mockRejectedValue(new Error('DB connection failed'))
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()

      expect(mockValidate).toHaveBeenCalledWith('*/15 * * * *')
      expect(mockSchedule).toHaveBeenCalledWith(
        '*/15 * * * *',
        expect.any(Function),
      )
      expect(scheduler.isRunning()).toBe(true)
    })

    it('should skip scheduling when SYNC_ENABLED=false', async () => {
      process.env.SYNC_ENABLED = 'false'

      await scheduler.start()

      expect(mockGetSyncCronSchedule).not.toHaveBeenCalled()
      expect(mockSchedule).not.toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should treat common falsey values as disabled', async () => {
      process.env.SYNC_ENABLED = 'FALSE'

      await scheduler.start()

      expect(mockSchedule).not.toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should not skip scheduling when SYNC_ENABLED is any other value', async () => {
      process.env.SYNC_ENABLED = 'true'
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()

      expect(mockSchedule).toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(true)
    })

    it('should be idempotent: calling start twice should only schedule once', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()
      await scheduler.start()

      expect(mockSchedule).toHaveBeenCalledTimes(1)
      expect(scheduler.isRunning()).toBe(true)
    })

    it('should log error and not schedule for invalid cron expression', async () => {
      mockValidate.mockReturnValue(false)

      await scheduler.start()

      expect(mockSchedule).not.toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should fire initial sync on start', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()

      expect(mockRunSync).toHaveBeenCalledTimes(1)
    })

    it('should not crash if initial sync fails', async () => {
      mockRunSync.mockRejectedValue(new Error('Initial sync failure'))
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      // Should not throw
      await scheduler.start()

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

      await scheduler.start()

      // Reset to only track the cron-triggered call
      mockRunSync.mockClear()

      // Simulate cron tick
      await cronCallback!()

      expect(mockRunSync).toHaveBeenCalledTimes(1)
    })
  })

  describe('stop', () => {
    it('should destroy the cron task and clear schedule', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()
      expect(scheduler.isRunning()).toBe(true)
      expect(scheduler.getSchedule()).toBe('*/15 * * * *')

      scheduler.stop()

      expect(mockTask.stop).toHaveBeenCalled()
      expect(scheduler.isRunning()).toBe(false)
      expect(scheduler.getSchedule()).toBeNull()
    })

    it('should be safe to call stop when not running', () => {
      expect(scheduler.isRunning()).toBe(false)

      // Should not throw
      scheduler.stop()

      expect(scheduler.isRunning()).toBe(false)
    })
  })

  describe('restart', () => {
    it('should stop and then start with new schedule', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      // First start with default schedule
      await scheduler.start()
      expect(scheduler.getSchedule()).toBe('*/15 * * * *')

      // Change the schedule returned by DB
      mockGetSyncCronSchedule.mockResolvedValue('*/30 * * * *')
      const newMockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(newMockTask)

      await scheduler.restart()

      expect(mockTask.stop).toHaveBeenCalled()
      expect(scheduler.getSchedule()).toBe('*/30 * * * *')
      expect(scheduler.isRunning()).toBe(true)
    })
  })

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(scheduler.isRunning()).toBe(false)
    })

    it('should return true after start', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()

      expect(scheduler.isRunning()).toBe(true)
    })

    it('should return false after stop', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()
      scheduler.stop()

      expect(scheduler.isRunning()).toBe(false)
    })
  })

  describe('getSchedule', () => {
    it('should return null when not running', () => {
      expect(scheduler.getSchedule()).toBeNull()
    })

    it('should return the active schedule when running', async () => {
      const mockTask = { stop: vi.fn() }
      mockSchedule.mockReturnValue(mockTask)

      await scheduler.start()

      expect(scheduler.getSchedule()).toBe('*/15 * * * *')
    })
  })
})
