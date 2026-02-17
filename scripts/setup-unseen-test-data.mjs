#!/usr/bin/env node
/**
 * Setup test data for manual testing of VIX-436 "What's New" badge.
 *
 * Usage:
 *   node scripts/setup-unseen-test-data.mjs [--reset]
 *
 *   --reset   Clear last_seen_at for your user (makes everything "unseen")
 *   (default) Set last_seen_at to 7 days ago so only recent items are unseen
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(filepath) {
  try {
    const content = readFileSync(filepath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch { /* ignore missing files */ }
}

loadEnv(resolve(__dirname, '../backend/.env'))

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Check backend/.env')
  process.exit(1)
}

const resetMode = process.argv.includes('--reset')

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('🔌 Connected to database\n')

    // ── 1. Ensure migration 012 (last_seen_at) is applied ──
    const colCheck = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'last_seen_at'`
    )
    if (colCheck.rows.length === 0) {
      console.log('⚙️  Applying migration 012: adding last_seen_at column...')
      await client.query('ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ')
      console.log('   ✅ Done\n')
    }

    // ── 2. Ensure backlog_items table exists (migration 013) ──
    const tableCheck = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables WHERE table_name = 'backlog_items'
       ) AS exists`
    )
    if (!tableCheck.rows[0].exists) {
      console.log('⚙️  Creating backlog_items table (migration 013)...')
      await client.query(`
        CREATE TABLE backlog_items (
          id          TEXT PRIMARY KEY,
          identifier  TEXT NOT NULL,
          title       TEXT NOT NULL DEFAULT '',
          created_at  TIMESTAMPTZ NOT NULL,
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query('CREATE INDEX IF NOT EXISTS idx_backlog_items_created_at ON backlog_items (created_at)')
      console.log('   ✅ Done\n')
    }

    // ── 3. Check existing backlog_items count ──
    const countRes = await client.query('SELECT COUNT(*)::int AS count FROM backlog_items')
    const existingCount = countRes.rows[0].count
    console.log(`📋 backlog_items table has ${existingCount} rows.`)

    if (existingCount === 0) {
      console.log('   Inserting synthetic test items...')

      // Generate 25 items: 15 older than 7 days, 10 within the last 7 days
      const items = []
      for (let i = 1; i <= 15; i++) {
        const daysAgo = 8 + i // 9-23 days ago
        items.push({
          id: `test-old-${i}`,
          identifier: `VIX-OLD-${i}`,
          title: `Older backlog item #${i}`,
          daysAgo,
        })
      }
      for (let i = 1; i <= 10; i++) {
        const daysAgo = Math.max(0, 7 - i) // 6 down to 0 days ago
        items.push({
          id: `test-new-${i}`,
          identifier: `VIX-NEW-${i}`,
          title: `Recent backlog item #${i} (should be unseen)`,
          daysAgo,
        })
      }

      const values = []
      const placeholders = []
      for (let j = 0; j < items.length; j++) {
        const item = items[j]
        const offset = j * 4
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, NOW() - INTERVAL '${item.daysAgo} days')`)
        values.push(item.id, item.identifier, item.title)
      }

      // Build a simplified INSERT (created_at uses SQL expression, not a param)
      for (const item of items) {
        await client.query(
          `INSERT INTO backlog_items (id, identifier, title, created_at)
           VALUES ($1, $2, $3, NOW() - $4::INTERVAL)
           ON CONFLICT (id) DO NOTHING`,
          [item.id, item.identifier, item.title, `${item.daysAgo} days`]
        )
      }

      const newCount = await client.query('SELECT COUNT(*)::int AS count FROM backlog_items')
      console.log(`   ✅ Inserted ${newCount.rows[0].count} test items\n`)
    }

    // ── 4. Show users ──
    const usersRes = await client.query(
      `SELECT id, email, display_name, is_approved, is_admin, last_seen_at
       FROM users ORDER BY id`
    )
    console.log(`\n👤 Users (${usersRes.rows.length}):`)
    console.table(usersRes.rows.map(r => ({
      id: r.id,
      email: r.email,
      approved: r.is_approved,
      admin: r.is_admin,
      last_seen_at: r.last_seen_at ? new Date(r.last_seen_at).toISOString() : '(null)',
    })))

    // ── 5. Update the first approved user ──
    const approvedUsers = usersRes.rows.filter(u => u.is_approved)
    if (approvedUsers.length === 0) {
      console.log('\n⚠️  No approved users found.')
      return
    }

    const targetUser = approvedUsers[0]
    console.log(`🎯 Targeting user: ${targetUser.email} (id=${targetUser.id})`)

    if (resetMode) {
      await client.query(
        'UPDATE users SET last_seen_at = NULL, updated_at = NOW() WHERE id = $1',
        [targetUser.id]
      )
      console.log('✅ Set last_seen_at = NULL → ALL items appear unseen')
    } else {
      await client.query(
        `UPDATE users SET last_seen_at = NOW() - INTERVAL '7 days', updated_at = NOW() WHERE id = $1`,
        [targetUser.id]
      )
      const updated = await client.query('SELECT last_seen_at FROM users WHERE id = $1', [targetUser.id])
      console.log(`✅ Set last_seen_at = ${new Date(updated.rows[0].last_seen_at).toISOString()}`)
      console.log('   Items created in the last 7 days will appear unseen.')
    }

    // ── 6. Show expected unseen count ──
    const seenRes = await client.query('SELECT last_seen_at FROM users WHERE id = $1', [targetUser.id])
    const lastSeen = seenRes.rows[0].last_seen_at
    let unseenCount
    if (lastSeen) {
      const c = await client.query(
        'SELECT COUNT(*)::int AS count FROM backlog_items WHERE created_at > $1', [lastSeen]
      )
      unseenCount = c.rows[0].count
    } else {
      const c = await client.query('SELECT COUNT(*)::int AS count FROM backlog_items')
      unseenCount = c.rows[0].count
    }
    console.log(`\n🔢 Expected unseen count: ${unseenCount}`)

    // ── 7. Show some recent items ──
    const recentRes = await client.query(
      'SELECT identifier, title, created_at FROM backlog_items ORDER BY created_at DESC LIMIT 5'
    )
    if (recentRes.rows.length > 0) {
      console.log('\n📋 Most recent backlog_items:')
      console.table(recentRes.rows.map(r => ({
        identifier: r.identifier,
        title: r.title?.slice(0, 50),
        created_at: new Date(r.created_at).toISOString(),
      })))
    }

    console.log('\n────────────────────────────────────────────')
    console.log('Manual test steps:')
    console.log('  1. Start backend:   cd backend && npm run dev')
    console.log('  2. Start frontend:  cd frontend && npm run dev')
    console.log('  3. Open http://localhost:1576 and log in')
    console.log('  4. Check the "What\'s New" badge in the header → should show ' + unseenCount)
    console.log('  5. Click the badge → unseen filter activates')
    console.log('  6. Scroll the list or open an item → badge count should decrement')
    console.log('  7. Refresh the page → badge should be gone (items marked seen)')
    console.log('────────────────────────────────────────────')
    console.log('\nRe-run commands:')
    console.log('  All unseen:    node scripts/setup-unseen-test-data.mjs --reset')
    console.log('  7-day window:  node scripts/setup-unseen-test-data.mjs')

  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
