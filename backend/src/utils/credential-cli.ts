#!/usr/bin/env node
/**
 * Credential Management CLI Tool
 *
 * Subcommands:
 *   encrypt       — Read plaintext from stdin, output enc:<base64> encrypted value
 *   validate      — Check all required credentials are present and decryptable
 *   rotate-check  — Verify a new credential value encrypts/decrypts correctly
 *
 * IMPORTANT: The encrypt command reads from stdin (NOT CLI arguments) to avoid
 * exposing secrets in shell history.
 *
 * Usage:
 *   echo "my-secret" | npx ts-node src/utils/credential-cli.ts encrypt
 *   npx ts-node src/utils/credential-cli.ts validate
 *   echo "new-secret" | npx ts-node src/utils/credential-cli.ts rotate-check
 *
 * Requires CREDENTIAL_ENCRYPTION_KEY environment variable for encrypt/rotate-check.
 */

import { createInterface } from 'readline'
import { encryptCredential, decryptCredential } from './credentials.js'

/** Required environment variable credentials. */
const REQUIRED_CREDENTIALS = [
  'DATABASE_URL',
  'LINEAR_API_KEY',
  'SESSION_SECRET',
  'DB_ENCRYPTION_KEY',
] as const

/** All credential env vars that support enc: prefix. */
const ENCRYPTABLE_CREDENTIALS = [
  'DATABASE_URL',
  'LINEAR_API_KEY',
  'SESSION_SECRET',
  'SYNC_TRIGGER_TOKEN',
] as const

function printHelp(): void {
  process.stdout.write(`
Credential Management CLI — Shareable Linear Backlog

Usage:
  npx ts-node src/utils/credential-cli.ts <command>

Commands:
  encrypt       Encrypt a credential value (reads plaintext from stdin)
  validate      Check all required credentials are present and decryptable
  rotate-check  Verify a new credential value encrypts/decrypts correctly
  --help        Show this help message

Examples:
  # Encrypt a credential (reads from stdin to avoid shell history exposure):
  echo "my-api-key" | npx ts-node src/utils/credential-cli.ts encrypt

  # Or interactively:
  npx ts-node src/utils/credential-cli.ts encrypt
  > Enter value to encrypt: [type value, press Enter]

  # Validate all required credentials:
  npx ts-node src/utils/credential-cli.ts validate

  # Check a new credential before rotation:
  echo "new-secret-value" | npx ts-node src/utils/credential-cli.ts rotate-check

Environment:
  CREDENTIAL_ENCRYPTION_KEY  Required for encrypt and rotate-check commands

`)
}

/** Read a line from stdin (supports piped input and interactive prompts). */
function readFromStdin(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(prompt, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/** Encrypt subcommand: read plaintext from stdin, output enc: value. */
async function handleEncrypt(): Promise<void> {
  const plaintext = await readFromStdin('Enter value to encrypt: ')

  if (!plaintext) {
    process.stderr.write('Error: No input provided. Provide plaintext via stdin.\n')
    process.exit(1)
  }

  try {
    const encrypted = encryptCredential(plaintext)
    process.stdout.write(`${encrypted}\n`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`Error: ${message}\n`)
    process.exit(1)
  }
}

/** Validate subcommand: check all required credentials are present and decryptable. */
async function handleValidate(): Promise<void> {
  if (process.env.DB_ENCRYPTION_KEY?.trim().startsWith('enc:')) {
    process.stderr.write('FAIL: DB_ENCRYPTION_KEY does not support enc: prefix\n')
    process.exit(1)
  }
  if (process.env.CREDENTIAL_ENCRYPTION_KEY?.trim().startsWith('enc:')) {
    process.stderr.write('FAIL: CREDENTIAL_ENCRYPTION_KEY must not be encrypted\n')
    process.exit(1)
  }

  const missing: string[] = []
  const encryptedVars: string[] = []
  const decryptionErrors: Array<{ name: string; error: string }> = []

  // Check required credentials
  for (const name of REQUIRED_CREDENTIALS) {
    const value = process.env[name]
    if (!value || value.trim().length === 0) {
      missing.push(name)
    }
  }

  if (missing.length > 0) {
    process.stderr.write(`FAIL: Missing required credentials: ${missing.join(', ')}\n`)
    process.exit(1)
  }

  // Check enc: values can be decrypted
  for (const name of ENCRYPTABLE_CREDENTIALS) {
    const value = process.env[name]
    if (value && value.startsWith('enc:')) {
      encryptedVars.push(name)
      try {
        decryptCredential(value)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        decryptionErrors.push({ name, error: message })
      }
    }
  }

  if (decryptionErrors.length > 0) {
    process.stderr.write('FAIL: Decryption errors:\n')
    for (const { name, error } of decryptionErrors) {
      process.stderr.write(`  ${name}: ${error}\n`)
    }
    process.exit(1)
  }

  process.stdout.write(`All required credentials validated (${REQUIRED_CREDENTIALS.length} required`)
  if (encryptedVars.length > 0) {
    process.stdout.write(`, ${encryptedVars.length} encrypted`)
  }
  process.stdout.write(')\n')
}

/** Rotate-check subcommand: verify a new value can be encrypted and decrypted. */
async function handleRotateCheck(): Promise<void> {
  const plaintext = await readFromStdin('Enter new credential value to verify: ')

  if (!plaintext) {
    process.stderr.write('Error: No input provided. Provide new value via stdin.\n')
    process.exit(1)
  }

  try {
    const encrypted = encryptCredential(plaintext)
    const decrypted = decryptCredential(encrypted)

    if (decrypted !== plaintext) {
      process.stderr.write('FAIL: Round-trip encryption/decryption mismatch.\n')
      process.exit(1)
    }

    process.stdout.write('OK: New credential value encrypts and decrypts correctly.\n')
    process.stdout.write(`Encrypted value: ${encrypted}\n`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`Error: ${message}\n`)
    process.exit(1)
  }
}

/** Main CLI entry point. Exported for testing. */
export async function runCli(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'encrypt':
      await handleEncrypt()
      break
    case 'validate':
      await handleValidate()
      break
    case 'rotate-check':
      await handleRotateCheck()
      break
    case '--help':
    case '-h':
    case undefined:
      printHelp()
      break
    default:
      process.stderr.write(`Unknown command: ${command}\n`)
      printHelp()
      process.exit(1)
  }
}

// Run CLI when invoked directly (not imported for testing).
// Uses import.meta.url to detect direct invocation, avoiding false positives
// when test runners set process.argv to simulate CLI arguments.
import { fileURLToPath } from 'url'
import { resolve } from 'path'

const thisFile = fileURLToPath(import.meta.url)
const argFile = process.argv[1] ? resolve(process.argv[1]) : ''
const isDirectExecution = argFile === thisFile

if (isDirectExecution) {
  runCli().catch((err) => {
    process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  })
}
