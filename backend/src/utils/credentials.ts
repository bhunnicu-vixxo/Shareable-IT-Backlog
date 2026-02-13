import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/**
 * AES-256-GCM credential encryption / decryption using Node.js built-in crypto.
 *
 * Encrypted values carry an `enc:` prefix so the system can distinguish them
 * from plaintext.  Plaintext values (without the prefix) pass through unchanged,
 * enabling a smooth migration path and simple development environments.
 *
 * Format of encrypted string:
 *   enc:<base64(salt:iv:authTag:ciphertext)>
 *
 * Requires `CREDENTIAL_ENCRYPTION_KEY` environment variable when decrypting
 * `enc:` values.
 */

const ALGORITHM = 'aes-256-gcm'
const PREFIX = 'enc:'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16
const SALT_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LENGTH)
}

function getCredentialKey(): string {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!key || key.trim().length === 0) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is required to decrypt encrypted credentials. ' +
        'Set this environment variable or use plaintext credentials for development.',
    )
  }
  return key
}

/**
 * Encrypt a plaintext credential.
 * Returns an `enc:` prefixed string safe for storage in .env or config files.
 */
export function encryptCredential(plaintext: string): string {
  const passphrase = getCredentialKey()
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = deriveKey(passphrase, salt)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Pack salt + iv + authTag + ciphertext into one base64 string
  const packed = Buffer.concat([salt, iv, authTag, encrypted])
  return PREFIX + packed.toString('base64')
}

/**
 * Decrypt a credential value.
 *
 * - Values starting with `enc:` are decrypted using AES-256-GCM.
 * - All other values are returned as-is (plaintext fallback for dev).
 */
export function decryptCredential(value: string): string {
  if (!value.startsWith(PREFIX)) {
    return value // Plaintext passthrough
  }

  const passphrase = getCredentialKey()
  const packed = Buffer.from(value.slice(PREFIX.length), 'base64')

  const salt = packed.subarray(0, SALT_LENGTH)
  const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = packed.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  )
  const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  const key = deriveKey(passphrase, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
