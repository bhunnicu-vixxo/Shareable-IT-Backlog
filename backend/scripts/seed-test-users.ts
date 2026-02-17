/**
 * Seed script: creates test users in various lifecycle states so you can
 * exercise the admin user-management UI (Story 7.7).
 *
 * Usage:  npx tsx backend/scripts/seed-test-users.ts
 *
 * Safe to run repeatedly — uses ON CONFLICT to upsert.
 */
import '../src/config/env.js'
import pg from 'pg'
import { poolConfig } from '../src/config/database.config.js'

const pool = new pg.Pool(poolConfig)

interface SeedUser {
  email: string
  display_name: string
  is_admin: boolean
  is_approved: boolean
  is_disabled: boolean
  is_it: boolean
}

const testUsers: SeedUser[] = [
  // 1. Active admin (you probably already exist, but just in case)
  {
    email: 'admin-test@vixxo.com',
    display_name: 'Test Admin',
    is_admin: true,
    is_approved: true,
    is_disabled: false,
    is_it: true,
  },
  // 2. Active regular user (approved, not admin)
  {
    email: 'regular-user@vixxo.com',
    display_name: 'Regular User',
    is_admin: false,
    is_approved: true,
    is_disabled: false,
    is_it: false,
  },
  // 3. Active IT user (approved, IT role, not admin)
  {
    email: 'it-user@vixxo.com',
    display_name: 'IT Staff Member',
    is_admin: false,
    is_approved: true,
    is_disabled: false,
    is_it: true,
  },
  // 4. Pending user (not approved, not disabled — shows in approval queue)
  {
    email: 'pending-user@vixxo.com',
    display_name: 'Pending User',
    is_admin: false,
    is_approved: false,
    is_disabled: false,
    is_it: false,
  },
  // 5. Another pending user
  {
    email: 'pending-user-2@vixxo.com',
    display_name: 'Another Pending User',
    is_admin: false,
    is_approved: false,
    is_disabled: false,
    is_it: false,
  },
  // 6. Disabled/rejected user (was pending, got rejected → disabled)
  {
    email: 'rejected-user@vixxo.com',
    display_name: 'Rejected User',
    is_admin: false,
    is_approved: false,
    is_disabled: true,
    is_it: false,
  },
  // 7. Disabled approved user (was active, then disabled by admin)
  {
    email: 'disabled-user@vixxo.com',
    display_name: 'Disabled Active User',
    is_admin: false,
    is_approved: true,
    is_disabled: true,
    is_it: false,
  },
  // 8. Second admin (so you can test demoting without hitting last-admin guard)
  {
    email: 'second-admin@vixxo.com',
    display_name: 'Second Admin',
    is_admin: true,
    is_approved: true,
    is_disabled: false,
    is_it: false,
  },
]

async function seed() {
  const client = await pool.connect()
  try {
    console.log('Seeding test users into the database...\n')

    for (const u of testUsers) {
      const result = await client.query(
        `INSERT INTO users (email, display_name, is_admin, is_approved, is_disabled, is_it, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           is_admin     = EXCLUDED.is_admin,
           is_approved  = EXCLUDED.is_approved,
           is_disabled  = EXCLUDED.is_disabled,
           is_it        = EXCLUDED.is_it,
           updated_at   = NOW()
         RETURNING id, email, is_admin, is_approved, is_disabled, is_it`,
        [u.email, u.display_name, u.is_admin, u.is_approved, u.is_disabled, u.is_it],
      )
      const row = result.rows[0]
      const flags = [
        row.is_admin ? 'ADMIN' : null,
        row.is_it ? 'IT' : null,
        row.is_approved ? 'approved' : 'pending',
        row.is_disabled ? 'DISABLED' : null,
      ]
        .filter(Boolean)
        .join(', ')

      console.log(`  ✓ id=${row.id}  ${row.email}  [${flags}]`)
    }

    console.log(`\nDone — ${testUsers.length} test users seeded.`)
    console.log('\nUser states you can now test:')
    console.log('  • admin-test@vixxo.com        → Active admin (self-protection: can\'t disable/demote yourself)')
    console.log('  • regular-user@vixxo.com      → Approved user (Disable, Make Admin, Grant IT)')
    console.log('  • it-user@vixxo.com           → Approved IT user (Disable, Make Admin, Revoke IT)')
    console.log('  • pending-user@vixxo.com      → Pending (Approve or Reject in approval queue)')
    console.log('  • pending-user-2@vixxo.com    → Pending (Approve or Reject)')
    console.log('  • rejected-user@vixxo.com     → Rejected/disabled pending (Enable or Remove)')
    console.log('  • disabled-user@vixxo.com     → Disabled approved user (Enable or Remove)')
    console.log('  • second-admin@vixxo.com      → Second admin (Demote, Disable — tests last-admin guard)')
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
