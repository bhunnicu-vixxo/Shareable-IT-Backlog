import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import routes from './routes/index.js'
import { errorMiddleware } from './middleware/error.middleware.js'

import './config/env.js'

const app = express()

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

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api', routes)

// Error middleware (must be last)
app.use(errorMiddleware)

export default app
