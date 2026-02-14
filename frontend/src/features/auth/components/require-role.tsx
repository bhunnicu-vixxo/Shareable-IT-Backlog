import type { ReactNode } from 'react'
import { usePermissions } from '@/features/auth/hooks/use-permissions'

export interface RequireRoleProps {
  /** Minimum role required: 'it' = IT or Admin; 'admin' = Admin only. */
  role: 'it' | 'admin'
  /** Content rendered when the user meets the role requirement. */
  children: ReactNode
  /** Optional fallback rendered when the user does NOT meet the role requirement. */
  fallback?: ReactNode
}

/**
 * Conditionally renders children based on the current user's role.
 *
 * Uses `usePermissions()` internally — never duplicates role-check logic.
 *
 * @example
 * ```tsx
 * <RequireRole role="it">
 *   <Link href={item.url}>Open in Linear</Link>
 * </RequireRole>
 * ```
 */
export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const { role: userRole } = usePermissions()

  const hasAccess =
    role === 'admin' ? userRole === 'admin' : userRole === 'it' || userRole === 'admin'

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
