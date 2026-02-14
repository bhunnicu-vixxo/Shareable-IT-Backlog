import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getPermissions } from '../utils/permissions'
import type { Permission, Role } from '../utils/permissions'

/**
 * Hook that derives named permission flags from the current user's role.
 *
 * Uses `useAuth()` internally and memoizes the permissions object so that
 * consumers only re-render when the underlying role booleans change.
 *
 * @returns Permission flags plus a convenience `role` field.
 *
 * @example
 * ```tsx
 * const { canViewLinearLinks, role } = usePermissions()
 * if (canViewLinearLinks) { ... }
 * ```
 */
export function usePermissions(): Record<Permission, boolean> & {
  role: Role
} {
  const { isIT, isAdmin } = useAuth()

  return useMemo(() => {
    const role: Role = isAdmin ? 'admin' : isIT ? 'it' : 'user'
    const permissions = getPermissions(isIT, isAdmin)
    return { ...permissions, role }
  }, [isIT, isAdmin])
}
