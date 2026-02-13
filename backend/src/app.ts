import './config/env.js'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import healthRoutes from './routes/health.routes.js'
import routes from './routes/index.js'
import { healthMonitor } from './services/health/health-monitor.service.js'
import { alertService } from './services/health/alert.service.js'
import {
  initializeNetworkConfig,
  networkVerificationMiddleware,
} from './middleware/network.middleware.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import { responseTimeMiddleware } from './middleware/response-time.middleware.js'
import { auditMiddleware } from './middleware/audit.middleware.js'
import { httpsRedirectMiddleware } from './middleware/https-redirect.middleware.js'
import { createSessionMiddleware } from './config/session.config.js'
import { logger } from './utils/logger.js'

const app = express()

// Trust proxy — required for correct client IP via X-Forwarded-For when behind
// a reverse proxy (nginx, AWS ALB, Azure App Gateway).
// Also needed for secure cookies behind reverse proxy.
app.set('trust proxy', 1)

// Force network config parsing/validation at startup (logs warnings early).
initializeNetworkConfig()

// HTTPS redirect — enforce HTTPS in production (relies on trust proxy above)
app.use(httpsRedirectMiddleware)

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Security headers — explicit CSP for SPA frontend, HSTS for transport security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Chakra UI runtime styles
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    strictTransportSecurity: {
      maxAge: 31_536_000, // 1 year
      includeSubDomains: true,
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  }),
)

// CORS — allow Vixxo network origins (configurable via env)
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:1576'],
    credentials: true,
  }),
)

// Response compression — gzip/brotli for responses >1KB
// MUST be after cors() and BEFORE body parsers so outgoing responses are compressed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(compression({ threshold: 1024 }) as any)

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Response time logging — records duration of every request via Pino and X-Response-Time header.
// Placed after body parsers but before routes so all API requests are measured.
app.use(responseTimeMiddleware)

// Session middleware (after body parsers, before routes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(createSessionMiddleware() as any)

// Health check — BEFORE network verification (must be accessible by load balancers/monitors)
app.use('/api', healthRoutes)

// Network verification — blocks requests from IPs outside allowed CIDR ranges
app.use('/api', networkVerificationMiddleware)

// Audit logging — records user access events AFTER response is sent (non-blocking).
// Placed after session + network verification so only authenticated, network-verified
// requests are audited. Health checks and OPTIONS are excluded internally.
app.use(auditMiddleware)

// Routes (health already mounted above, remaining routes are network-protected)
app.use('/api', routes)

// ---------------------------------------------------------------------------
// Health monitoring — periodic health checks with alert integration
// ---------------------------------------------------------------------------
// Wire alert service to health monitor status transitions.
// The monitor itself is started via startHealthMonitor() from server.ts
// (not at import time, to avoid side-effects in test environments).
healthMonitor.onStatusTransition((transition) => {
  void alertService.handleTransition(transition)
})

/** Start the periodic health monitor. Call from server.ts after listen(). */
export function startHealthMonitor(): void {
  healthMonitor.start()
}

// API not-found handler — ensures unknown /api routes never fall through to SPA
// static serving (when enabled) and always return consistent JSON error format.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } })
})

// ---------------------------------------------------------------------------
// Production static file serving — serve frontend SPA from Express
// ---------------------------------------------------------------------------
// In production Docker deployment, nginx handles static files directly. However,
// for non-Docker deployments (e.g., direct Node.js on Vixxo servers), Express
// can serve the frontend build output. Enable by setting SERVE_STATIC=true.
// ---------------------------------------------------------------------------
if (process.env.SERVE_STATIC === 'true') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const frontendDistPath = process.env.FRONTEND_DIST_PATH ?? path.resolve(__dirname, '../../frontend/dist')

  // Serve hashed assets with long-lived cache (1 year). Vite produces content-
  // hashed filenames so stale cache is not a concern for these files.
  app.use(
    '/assets',
    express.static(path.join(frontendDistPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }),
  )

  // Serve remaining static files (favicon, robots.txt, etc.) with no-cache.
  app.use(express.static(frontendDistPath, { maxAge: 0 }))

  // SPA fallback — serve index.html for all non-API routes so client-side
  // routing works correctly. Set Cache-Control: no-cache so browsers always
  // fetch the latest index.html to pick up new deployments.
  app.get('*', (_req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
      if (err) {
        logger.error({ err }, 'Failed to serve index.html')
        res.status(500).json({ error: { message: 'Failed to serve frontend', code: 'STATIC_SERVE_ERROR' } })
      }
    })
  })

  logger.info({ frontendDistPath }, 'Static file serving enabled')
}

// Error middleware (must be last)
app.use(errorMiddleware)

export default app
