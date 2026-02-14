import { describe, it, expect } from 'vitest'
import { getPermissions } from './permissions'
import { ALL_PERMISSIONS } from './permissions'
import type { Permission } from './permissions'

describe('getPermissions', () => {
  it('returns all permissions as false for regular user (not IT, not Admin)', () => {
    const perms = getPermissions(false, false)

    expect(perms.canViewLinearLinks).toBe(false)
    expect(perms.canViewMigrationMetadata).toBe(false)
    expect(perms.canManageUsers).toBe(false)
    expect(perms.canConfigureSystem).toBe(false)
  })

  it('grants IT-level permissions for IT users', () => {
    const perms = getPermissions(true, false)

    expect(perms.canViewLinearLinks).toBe(true)
    expect(perms.canViewMigrationMetadata).toBe(true)
    expect(perms.canManageUsers).toBe(false)
    expect(perms.canConfigureSystem).toBe(false)
  })

  it('grants all permissions for Admin users', () => {
    const perms = getPermissions(false, true)

    expect(perms.canViewLinearLinks).toBe(true)
    expect(perms.canViewMigrationMetadata).toBe(true)
    expect(perms.canManageUsers).toBe(true)
    expect(perms.canConfigureSystem).toBe(true)
  })

  it('grants all permissions when user is both IT and Admin', () => {
    const perms = getPermissions(true, true)

    expect(perms.canViewLinearLinks).toBe(true)
    expect(perms.canViewMigrationMetadata).toBe(true)
    expect(perms.canManageUsers).toBe(true)
    expect(perms.canConfigureSystem).toBe(true)
  })

  it('returns a Record<Permission, boolean> with exactly 4 keys', () => {
    const perms = getPermissions(false, false)
    const keys = Object.keys(perms)

    expect(keys).toHaveLength(ALL_PERMISSIONS.length)
    for (const permission of ALL_PERMISSIONS) {
      expect(keys).toContain(permission)
    }
  })

  it('Permission type includes all expected capability names', () => {
    // Type-level assertion: if these assignments compile, the Permission type is correct
    const p1: Permission = 'canViewLinearLinks'
    const p2: Permission = 'canViewMigrationMetadata'
    const p3: Permission = 'canManageUsers'
    const p4: Permission = 'canConfigureSystem'

    expect([p1, p2, p3, p4]).toHaveLength(4)
  })
})
