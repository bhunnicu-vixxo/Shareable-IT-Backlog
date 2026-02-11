import type { Session } from 'express-session'

declare module 'express-serve-static-core' {
  interface Request {
    session: Session & {
      userId?: string
      isAdmin?: boolean
      isApproved?: boolean
      isDisabled?: boolean
      /** Epoch ms when approval status was last verified from DB */
      approvalCheckedAt?: number
    }
  }
}
