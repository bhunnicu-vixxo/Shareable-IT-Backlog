import { testConnection } from '../../utils/database.js'
import { linearClient } from '../sync/linear-client.service.js'
import { logger } from '../../utils/logger.js'

/** Default interval between automated health checks (ms). */
const DEFAULT_HEALTH_CHECK_INTERVAL = 60_000

/** Default timeout for Linear API check during monitoring (ms). */
const DEFAULT_LINEAR_TIMEOUT = 5_000

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ComponentMetrics {
  totalChecks: number
  consecutiveFailures: number
  latencySamples: number
  totalLatencyMs: number
  averageLatencyMs: number | null
  lastStatus: 'ok' | 'error' | 'not_configured'
}

export interface HealthMetrics {
  database: ComponentMetrics
  linear: ComponentMetrics
  totalChecks: number
  startedAt: string
}

export type HealthStatus = 'ok' | 'degraded' | 'unhealthy'

export interface HealthCheckResult {
  status: HealthStatus
  timestamp: string
  checks: {
    database: { status: 'ok' | 'error'; connected: boolean; latencyMs?: number }
    linear: { status: 'ok' | 'error' | 'not_configured'; connected: boolean; latencyMs?: number }
  }
  metrics: HealthMetrics
}

export type StatusTransition = {
  from: HealthStatus
  to: HealthStatus
  timestamp: string
}

/* ------------------------------------------------------------------ */
/*  Health Monitor Service                                             */
/* ------------------------------------------------------------------ */

export class HealthMonitorService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private readonly healthLogger = logger.child({ component: 'health-monitor' })
  private previousStatus: HealthStatus = 'ok'
  private statusListeners: Array<(transition: StatusTransition) => void> = []

  /** Metrics tracking */
  private metrics: HealthMetrics = {
    database: {
      totalChecks: 0,
      consecutiveFailures: 0,
      latencySamples: 0,
      totalLatencyMs: 0,
      averageLatencyMs: null,
      lastStatus: 'ok',
    },
    linear: {
      totalChecks: 0,
      consecutiveFailures: 0,
      latencySamples: 0,
      totalLatencyMs: 0,
      averageLatencyMs: null,
      lastStatus: 'ok',
    },
    totalChecks: 0,
    startedAt: new Date().toISOString(),
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Start periodic health check monitoring.
   * @param intervalMs - Interval between checks (default from env or 60s).
   */
  start(intervalMs?: number): void {
    if (this.intervalId) {
      this.healthLogger.warn('Health monitor already running')
      return
    }

    const interval =
      intervalMs ??
      parseInt(process.env.HEALTH_CHECK_INTERVAL_MS ?? String(DEFAULT_HEALTH_CHECK_INTERVAL), 10)

    this.healthLogger.info({ intervalMs: interval }, 'Starting health monitor')

    // Run immediately, then on interval
    void this.runCheck()
    this.intervalId = setInterval(() => void this.runCheck(), interval)
  }

  /** Stop periodic health monitoring. */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      this.healthLogger.info('Health monitor stopped')
    }
  }

  /** Check if the monitor is currently running. */
  isRunning(): boolean {
    return this.intervalId !== null
  }

  /** Register a listener for status transitions. */
  onStatusTransition(listener: (transition: StatusTransition) => void): void {
    this.statusListeners.push(listener)
  }

  /** Get current metrics snapshot. */
  getMetrics(): HealthMetrics {
    // Deep copy so callers can’t mutate our internal counters.
    const snapshot: HealthMetrics = {
      database: { ...this.metrics.database },
      linear: { ...this.metrics.linear },
      totalChecks: this.metrics.totalChecks,
      startedAt: this.metrics.startedAt,
    }

    snapshot.database.averageLatencyMs =
      snapshot.database.latencySamples > 0
        ? Math.round(snapshot.database.totalLatencyMs / snapshot.database.latencySamples)
        : null

    snapshot.linear.averageLatencyMs =
      snapshot.linear.latencySamples > 0
        ? Math.round(snapshot.linear.totalLatencyMs / snapshot.linear.latencySamples)
        : null

    return snapshot
  }

  /* ------------------------------------------------------------------ */
  /*  Core health check logic                                            */
  /* ------------------------------------------------------------------ */

  async runCheck(): Promise<HealthCheckResult> {
    const linearTimeoutMs = parseInt(
      process.env.HEALTH_CHECK_LINEAR_TIMEOUT_MS ?? String(DEFAULT_LINEAR_TIMEOUT),
      10,
    )

    const [dbResult, linearResult] = await Promise.all([
      this.checkDatabase(),
      this.checkLinear(linearTimeoutMs),
    ])

    // Update metrics
    this.metrics.totalChecks++
    this.updateComponentMetrics('database', dbResult.connected, dbResult.latencyMs)
    this.updateComponentMetrics(
      'linear',
      linearResult.status === 'ok',
      linearResult.latencyMs,
      linearResult.status,
    )

    // Determine overall status
    const status = this.determineStatus(dbResult.connected, linearResult.status)
    const timestamp = new Date().toISOString()

    const result: HealthCheckResult = {
      status,
      timestamp,
      checks: {
        database: {
          status: dbResult.connected ? 'ok' : 'error',
          connected: dbResult.connected,
          latencyMs: dbResult.latencyMs,
        },
        linear: {
          status: linearResult.status,
          connected: linearResult.status === 'ok',
          latencyMs: linearResult.latencyMs,
        },
      },
      metrics: this.getMetrics(),
    }

    // Log with appropriate level
    this.logResult(result)

    // Detect status transitions
    if (status !== this.previousStatus) {
      const transition: StatusTransition = {
        from: this.previousStatus,
        to: status,
        timestamp,
      }
      this.healthLogger.warn(
        { transition },
        `Health status transition: ${transition.from} → ${transition.to}`,
      )
      this.previousStatus = status

      // Notify listeners
      for (const listener of this.statusListeners) {
        try {
          listener(transition)
        } catch (err) {
          this.healthLogger.error({ err }, 'Error in status transition listener')
        }
      }
    }

    return result
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private async checkDatabase(): Promise<{ connected: boolean; latencyMs?: number }> {
    return testConnection()
  }

  private async checkLinear(
    timeoutMs: number,
  ): Promise<{ status: 'ok' | 'error' | 'not_configured'; latencyMs?: number }> {
    // If the API key is not configured, avoid calling the Linear client entirely.
    if (!process.env.LINEAR_API_KEY) {
      return { status: 'not_configured' }
    }

    const start = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Linear health check timed out')), timeoutMs)
      })

      const result = await Promise.race([
        linearClient.verifyAuth(),
        timeoutPromise,
      ])

      if (result?.data) {
        return { status: 'ok', latencyMs: Date.now() - start }
      }
      return { status: 'error', latencyMs: Date.now() - start }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.name === 'LinearConfigError' || err.message.includes('LINEAR_API_KEY'))
      ) {
        return { status: 'not_configured' }
      }
      return { status: 'error', latencyMs: Date.now() - start }
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  private determineStatus(
    dbConnected: boolean,
    linearStatus: 'ok' | 'error' | 'not_configured',
  ): HealthStatus {
    if (!dbConnected) return 'unhealthy'
    if (linearStatus === 'error') return 'degraded'
    return 'ok'
  }

  private updateComponentMetrics(
    component: 'database' | 'linear',
    isHealthy: boolean,
    latencyMs?: number,
    rawStatus?: 'ok' | 'error' | 'not_configured',
  ): void {
    const m = this.metrics[component]
    m.totalChecks++
    m.lastStatus = rawStatus ?? (isHealthy ? 'ok' : 'error')

    if (isHealthy || rawStatus === 'not_configured') {
      m.consecutiveFailures = 0
    } else {
      m.consecutiveFailures++
    }

    if (latencyMs !== undefined) {
      m.latencySamples++
      m.totalLatencyMs += latencyMs
    }

    // Keep average updated so periodic log lines and consumers stay consistent.
    m.averageLatencyMs =
      m.latencySamples > 0 ? Math.round(m.totalLatencyMs / m.latencySamples) : null
  }

  private logResult(result: HealthCheckResult): void {
    const logData = {
      status: result.status,
      dbConnected: result.checks.database.connected,
      dbLatencyMs: result.checks.database.latencyMs,
      linearStatus: result.checks.linear.status,
      linearLatencyMs: result.checks.linear.latencyMs,
      totalChecks: result.metrics.totalChecks,
      dbConsecutiveFailures: result.metrics.database.consecutiveFailures,
      linearConsecutiveFailures: result.metrics.linear.consecutiveFailures,
    }

    switch (result.status) {
      case 'ok':
        this.healthLogger.info(logData, 'Health check: ok')
        break
      case 'degraded':
        this.healthLogger.warn(logData, 'Health check: degraded')
        break
      case 'unhealthy':
        this.healthLogger.error(logData, 'Health check: unhealthy')
        break
    }
  }
}

/** Singleton health monitor instance. */
export const healthMonitor = new HealthMonitorService()
