import * as argon2 from 'argon2'

/**
 * Password hashing utility using Argon2id — the OWASP-recommended algorithm.
 *
 * Parameters follow the first OWASP recommendation:
 *   m = 19 456 KiB  (≈ 19 MiB),  t = 2 iterations,  p = 1 thread
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */

const MIN_PASSWORD_LENGTH = 8

/**
 * Hash a plaintext password with Argon2id.
 *
 * @param password  Plaintext password (minimum 8 characters)
 * @returns Argon2-encoded hash string (includes algorithm, params, salt, and hash)
 * @throws Error if password is empty or too short
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    )
  }

  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456, // 19 MiB  (OWASP recommendation #1)
    timeCost: 2,
    parallelism: 1,
  })
}

/**
 * Verify a plaintext password against an Argon2 hash.
 *
 * @returns `true` when the password matches, `false` otherwise
 */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password)
}
