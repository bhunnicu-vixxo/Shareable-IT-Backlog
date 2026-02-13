import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { pool } from '../utils/database.js'
import { decryptCredential } from '../utils/credentials.js'

const PgSession = connectPgSimple(session)

/**
 * Creates and configures the express-session middleware with PostgreSQL backing store.
 *
 * Session data is stored in the `session` table (managed via migration 006).
 * Cookie name is `slb.sid` (custom, not default `connect.sid`).
 * Sessions are not created for unauthenticated requests (saveUninitialized: false).
 *
 * The session secret is passed through `decryptCredential()` so it can be
 * stored encrypted (with `enc:` prefix) in environment variables.
 */
export function createSessionMiddleware() {
  const rawSecret = process.env.SESSION_SECRET
  const sessionSecret = rawSecret ? decryptCredential(rawSecret) : rawSecret

  if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret.trim().length < 32)) {
    throw new Error('SESSION_SECRET must be set to a strong secret (32+ chars) in production')
  }

  return session({
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: false,
    }),
    secret: sessionSecret || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'slb.sid',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
}
