import { query } from './database.js'

/**
 * Column-level encryption / decryption via PostgreSQL pgcrypto.
 *
 * Requires:
 *  - `pgcrypto` extension enabled (migration 009)
 *  - `DB_ENCRYPTION_KEY` environment variable set
 *
 * Uses AES-128 symmetric PGP encryption (`pgp_sym_encrypt` / `pgp_sym_decrypt`).
 * Encrypted values are stored as `bytea` in the database.
 */

function getEncryptionKey(): string {
  const key = process.env.DB_ENCRYPTION_KEY
  if (!key || key.trim().length === 0) {
    throw new Error(
      'DB_ENCRYPTION_KEY is not configured. Set this environment variable to enable database column encryption.',
    )
  }
  return key
}

/**
 * Encrypt a plaintext string using pgcrypto `pgp_sym_encrypt`.
 * Returns the encrypted value as a hex-encoded string suitable for database storage.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = getEncryptionKey()
  const result = await query(
    'SELECT encode(pgp_sym_encrypt($1, $2), \'hex\') AS encrypted',
    [plaintext, key],
  )
  const encrypted = result.rows[0]?.encrypted
  if (typeof encrypted !== 'string') {
    throw new Error('Encryption failed: pgp_sym_encrypt returned no result')
  }
  return encrypted
}

/**
 * Decrypt a hex-encoded encrypted value using pgcrypto `pgp_sym_decrypt`.
 * Returns the original plaintext string.
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = getEncryptionKey()
  const result = await query(
    'SELECT pgp_sym_decrypt(decode($1, \'hex\'), $2) AS decrypted',
    [encrypted, key],
  )
  const decrypted = result.rows[0]?.decrypted
  if (typeof decrypted !== 'string') {
    throw new Error('Decryption failed: pgp_sym_decrypt returned no result')
  }
  return decrypted
}
