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
import { validateCredentials } from '../config/credential-validator.js'

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
  const isInteractive = process.stdin.isTTY
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: isInteractive ? process.stdout : undefined,
    })
    if (isInteractive) {
      rl.question(prompt, (answer: string) => {
        rl.close()
        resolve(answer.trim())
      })
    } else {
      // Non-interactive: read the first line without prompt
      rl.once('line', (line: string) => {
        rl.close()
        resolve(line.trim())
      })
      rl.once('close', () => {
        resolve('')
      })
    }
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
  // Use the same validation logic as server startup to ensure consistency.
  // validateCredentials() calls process.exit(1) on failure and logs success.
  validateCredentials()
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
