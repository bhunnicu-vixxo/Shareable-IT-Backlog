import type { Session } from 'express-session'

declare module 'express-serve-static-core' {
  interface Request {
    session: Session & {
      userId?: string
      isAdmin?: boolean
    }
  }
}
