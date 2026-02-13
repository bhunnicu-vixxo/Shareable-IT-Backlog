import { logger } from '../../utils/logger.js'
import type { HealthStatus, StatusTransition } from './health-monitor.service.js'

/** Default cooldown period between alerts (ms). */
const DEFAULT_ALERT_COOLDOWN = 300_000 // 5 minutes

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AlertPayload {
  title: string
  status: HealthStatus
  previousStatus: HealthStatus
  timestamp: string
  message: string
  isRecovery: boolean
}

/* ------------------------------------------------------------------ */
/*  Alert Service                                                      */
/* ------------------------------------------------------------------ */

export class AlertService {
  private readonly alertLogger = logger.child({ component: 'alert-service' })
  private lastAlertTime: number = 0

  /**
   * Handle a health status transition and send an alert if appropriate.
   *
   * Alerts are sent when:
   * - Status degrades: ok → degraded, ok → unhealthy, degraded → unhealthy
   * - Status recovers: unhealthy → ok, unhealthy → degraded, degraded → ok
   *
   * A cooldown period prevents alert storms.
   */
  async handleTransition(transition: StatusTransition): Promise<boolean> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL

    if (!webhookUrl) {
      this.alertLogger.debug('No ALERT_WEBHOOK_URL configured, skipping alert')
      return false
    }

    // Always alert on escalation to unhealthy (critical), even during cooldown.
    const isCriticalEscalation = transition.to === 'unhealthy'

    // Check cooldown
    const cooldownMs = parseInt(
      process.env.ALERT_COOLDOWN_MS ?? String(DEFAULT_ALERT_COOLDOWN),
      10,
    )
    const now = Date.now()

    if (now - this.lastAlertTime < cooldownMs) {
      if (isCriticalEscalation) {
        this.alertLogger.warn(
          {
            cooldownMs,
            timeSinceLastAlert: now - this.lastAlertTime,
          },
          'Cooldown active but escalation is unhealthy — sending alert',
        )
      } else {
      this.alertLogger.debug(
        {
          cooldownMs,
          timeSinceLastAlert: now - this.lastAlertTime,
        },
        'Alert skipped — cooldown period active',
      )
      return false
      }
    }

    // Build alert payload
    const isRecovery = this.isRecoveryTransition(transition)
    const payload = this.buildPayload(transition, isRecovery)

    // Send webhook
    const sent = await this.sendWebhook(webhookUrl, payload)

    if (sent) {
      this.lastAlertTime = now
    }

    return sent
  }

  /** Reset cooldown (for testing). */
  resetCooldown(): void {
    this.lastAlertTime = 0
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private isRecoveryTransition(transition: StatusTransition): boolean {
    // Recovery = transitioning TO a healthier state
    const healthOrder: Record<HealthStatus, number> = {
      unhealthy: 0,
      degraded: 1,
      ok: 2,
    }
    return healthOrder[transition.to] > healthOrder[transition.from]
  }

  private buildPayload(transition: StatusTransition, isRecovery: boolean): AlertPayload {
    const appName = 'Shareable Linear Backlog'
    const emoji = isRecovery ? 'RECOVERY' : 'ALERT'
    const title = `[${emoji}] ${appName} — ${transition.to.toUpperCase()}`

    let message: string
    if (isRecovery) {
      message = `Application health recovered from ${transition.from} to ${transition.to}.`
    } else {
      message = `Application health degraded from ${transition.from} to ${transition.to}.`
    }

    return {
      title,
      status: transition.to,
      previousStatus: transition.from,
      timestamp: transition.timestamp,
      message,
      isRecovery,
    }
  }

  private async sendWebhook(url: string, payload: AlertPayload): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10_000)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Generic webhook format (compatible with Slack, Teams, HTTP)
          text: `${payload.title}\n${payload.message}`,
          ...payload,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        this.alertLogger.info(
          { status: payload.status, isRecovery: payload.isRecovery },
          `Alert sent: ${payload.title}`,
        )
        return true
      }

      this.alertLogger.warn(
        { httpStatus: response.status, statusText: response.statusText },
        'Alert webhook returned non-OK status',
      )
      return false
    } catch (err: unknown) {
      this.alertLogger.error({ err }, 'Failed to send alert webhook')
      return false
    }
  }
}

/** Singleton alert service instance. */
export const alertService = new AlertService()
