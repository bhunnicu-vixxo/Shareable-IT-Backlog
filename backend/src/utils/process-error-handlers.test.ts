import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type http from 'node:http'
import type pg from 'pg'

// Mock logger before importing the module under test
vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}))

import { setupProcessErrorHandlers, resetProcessErrorHandlers } from './process-error-handlers.js'
import { logger } from './logger.js'

describe('setupProcessErrorHandlers', () => {
  let mockServer: http.Server
  let mockPool: pg.Pool
  let processOnSpy: ReturnType<typeof vi.spyOn>
  let processExitSpy: ReturnType<typeof vi.spyOn>
  const registeredHandlers: Record<string, (...args: unknown[]) => void> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset internal state so handlers can be re-registered between tests
    resetProcessErrorHandlers()

    // Mock server.close — calls callback immediately with no error
    mockServer = {
      close: vi.fn((cb?: (err?: Error) => void) => {
        cb?.()
        return mockServer
      }),
    } as unknown as http.Server

    // Mock pool.end — resolves immediately
    mockPool = {
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as pg.Pool

    // Intercept process.on registrations
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(((event: string, handler: (...args: unknown[]) => void) => {
      registeredHandlers[event] = handler
      return process
    }) as typeof process.on)

    // Mock process.exit to prevent actual process termination
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)
  })

  afterEach(() => {
    processOnSpy.mockRestore()
    processExitSpy.mockRestore()
    // Clear registered handlers
    Object.keys(registeredHandlers).forEach((key) => delete registeredHandlers[key])
  })

  it('registers handlers for uncaughtException, unhandledRejection, SIGTERM, and SIGINT', () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    expect(registeredHandlers['uncaughtException']).toBeTypeOf('function')
    expect(registeredHandlers['unhandledRejection']).toBeTypeOf('function')
    expect(registeredHandlers['SIGTERM']).toBeTypeOf('function')
    expect(registeredHandlers['SIGINT']).toBeTypeOf('function')
  })

  it('logs info message when handlers are registered', () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    expect(logger.info).toHaveBeenCalledWith('Process error handlers registered')
  })

  it('logs fatal and initiates shutdown on uncaughtException', async () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    const testError = new Error('test uncaught exception')
    registeredHandlers['uncaughtException'](testError)

    // Wait for async shutdown sequence
    await vi.waitFor(() => {
      expect(logger.fatal).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'uncaughtException' }),
        'Uncaught exception — initiating shutdown',
      )
    })
  })

  it('logs error and initiates shutdown on unhandledRejection', async () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    const testError = new Error('test unhandled rejection')
    registeredHandlers['unhandledRejection'](testError)

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'unhandledRejection' }),
        'Unhandled promise rejection — initiating shutdown',
      )
    })
  })

  it('initiates graceful shutdown on SIGTERM', async () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    registeredHandlers['SIGTERM']()

    await vi.waitFor(() => {
      expect(logger.info).toHaveBeenCalledWith('Received SIGTERM — initiating graceful shutdown')
      expect(mockServer.close).toHaveBeenCalled()
      expect(mockPool.end).toHaveBeenCalled()
    })
  })

  it('initiates graceful shutdown on SIGINT', async () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    registeredHandlers['SIGINT']()

    await vi.waitFor(() => {
      expect(logger.info).toHaveBeenCalledWith('Received SIGINT — initiating graceful shutdown')
      expect(mockServer.close).toHaveBeenCalled()
      expect(mockPool.end).toHaveBeenCalled()
    })
  })

  it('calls server.close and pool.end during shutdown', async () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    registeredHandlers['SIGTERM']()

    await vi.waitFor(() => {
      expect(mockServer.close).toHaveBeenCalledTimes(1)
      expect(mockPool.end).toHaveBeenCalledTimes(1)
    })
  })

  it('calls process.exit with code 0 for signals', async () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    registeredHandlers['SIGTERM']()

    await vi.waitFor(() => {
      expect(processExitSpy).toHaveBeenCalledWith(0)
    })
  })

  it('calls process.exit with code 1 for uncaught exceptions', async () => {
    setupProcessErrorHandlers(mockServer, mockPool)

    registeredHandlers['uncaughtException'](new Error('fatal'))

    await vi.waitFor(() => {
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })
})
