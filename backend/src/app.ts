import './config/env.js'

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import healthRoutes from './routes/health.routes.js'
import routes from './routes/index.js'
import {
  initializeNetworkConfig,
  networkVerificationMiddleware,
} from './middleware/network.middleware.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import { responseTimeMiddleware } from './middleware/response-time.middleware.js'
import { createSessionMiddleware } from './config/session.config.js'

const app = express()

// Trust proxy — required for correct client IP via X-Forwarded-For when behind
// a reverse proxy (nginx, AWS ALB, Azure App Gateway).
// Also needed for secure cookies behind reverse proxy.
app.set('trust proxy', 1)

// Force network config parsing/validation at startup (logs warnings early).
initializeNetworkConfig()

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Security headers
app.use(helmet())

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

// Routes (health already mounted above, remaining routes are network-protected)
app.use('/api', routes)

// Error middleware (must be last)
app.use(errorMiddleware)

export default app
