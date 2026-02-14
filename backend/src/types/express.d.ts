import type { Session } from 'express-session'

declare module 'express-serve-static-core' {
  interface Request {
    session: Session & {
      userId?: string
      isAdmin?: boolean
      isIT?: boolean
      isApproved?: boolean
      isDisabled?: boolean
      /** Epoch ms when approval status was last verified from DB */
      approvalCheckedAt?: number
      /** Epoch ms when IT/admin role was last verified from DB */
      roleCheckedAt?: number
    }
  }
}
