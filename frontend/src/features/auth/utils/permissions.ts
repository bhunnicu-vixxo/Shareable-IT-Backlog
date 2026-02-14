/**
 * Centralized permission configuration.
 *
 * Maps user roles (expressed as boolean flags) to named capability flags.
 * This is the single source of truth for the privilege matrix:
 *
 * | Capability               | Regular | IT  | Admin |
 * |--------------------------|---------|-----|-------|
 * | canViewLinearLinks       |    ✗    |  ✓  |   ✓   |
 * | canViewMigrationMetadata |    ✗    |  ✓  |   ✓   |
 * | canManageUsers           |    ✗    |  ✗  |   ✓   |
 * | canConfigureSystem       |    ✗    |  ✗  |   ✓   |
 */

export const ALL_PERMISSIONS = [
  'canViewLinearLinks',
  'canViewMigrationMetadata',
  'canManageUsers',
  'canConfigureSystem',
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]

export type Role = 'user' | 'it' | 'admin'

/**
 * Mapping of roles to granted capabilities.
 *
 * Keep this list as the single place to update when adding new permissions.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: [],
  it: ['canViewLinearLinks', 'canViewMigrationMetadata'],
  admin: [
    'canViewLinearLinks',
    'canViewMigrationMetadata',
    'canManageUsers',
    'canConfigureSystem',
  ],
} as const

/**
 * Derive permission flags from the user's role booleans.
 *
 * @param isIT - Whether the user holds the IT role.
 * @param isAdmin - Whether the user holds the Admin role.
 * @returns A record mapping each Permission to its granted/denied state.
 */
export function getPermissions(isIT: boolean, isAdmin: boolean): Record<Permission, boolean> {
  const role: Role = isAdmin ? 'admin' : isIT ? 'it' : 'user'
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role])

  return ALL_PERMISSIONS.reduce(
    (acc, permission) => {
      acc[permission] = granted.has(permission)
      return acc
    },
    {} as Record<Permission, boolean>,
  )
}
