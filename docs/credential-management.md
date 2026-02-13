# Credential Management Guide

_Shareable Linear Backlog — Security & Operations_

---

## Credential Inventory

| Credential | Purpose | Where Used | `enc:` Support | Required |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `backend/src/config/database.config.ts` | Yes | Yes |
| `LINEAR_API_KEY` | Linear API authentication | `backend/src/config/linear.config.ts` | Yes | Yes |
| `SESSION_SECRET` | Express session cookie signing | `backend/src/config/session.config.ts` | Yes | Yes |
| `DB_ENCRYPTION_KEY` | PostgreSQL column-level encryption (pgcrypto) | `backend/src/utils/encryption.ts` | No | Yes |
| `CREDENTIAL_ENCRYPTION_KEY` | Master key for `enc:` credential decryption | `backend/src/utils/credentials.ts` | No | Conditional |
| `SYNC_TRIGGER_TOKEN` | Protect manual sync trigger endpoint | `backend/src/controllers/sync.controller.ts` | Yes | No (optional) |

### Key Points

- **`CREDENTIAL_ENCRYPTION_KEY`** is required only when any other credential uses the `enc:` prefix. It is NOT itself encrypted.
- **`DB_ENCRYPTION_KEY`** is passed directly to pgcrypto functions — it is NOT an `enc:`-encrypted value.
- All required credentials are validated at application startup via `credential-validator.ts`. Missing credentials cause immediate exit with a descriptive error (credential name only, never value).

---

## Encryption Guide

### How `enc:` Prefix Encryption Works

The application supports optional encryption for credential environment variables using AES-256-GCM with scrypt key derivation.

**Format:** `enc:<base64(salt:iv:authTag:ciphertext)>`

- **Plaintext passthrough:** Values without the `enc:` prefix are used as-is (development mode).
- **Encrypted values:** Values starting with `enc:` are automatically decrypted using `CREDENTIAL_ENCRYPTION_KEY`.

### Encrypting a Credential Using the CLI Tool

```bash
# Interactive mode (recommended — avoids shell history exposure):
npx ts-node src/utils/credential-cli.ts encrypt
> Enter value to encrypt: [type your secret, press Enter]
enc:abc123...  # Output: encrypted value

# Piped mode:
echo "your-secret-value" | npx ts-node src/utils/credential-cli.ts encrypt
```

**IMPORTANT:** Never pass secrets as CLI arguments (e.g., `encrypt my-secret`). The CLI reads from stdin to prevent shell history exposure.

### Validating All Credentials

```bash
# Check that all required credentials are present and decryptable:
npx ts-node src/utils/credential-cli.ts validate
```

### Verifying Round-Trip Before Rotation

```bash
# Verify a new value encrypts and decrypts correctly:
echo "new-secret" | npx ts-node src/utils/credential-cli.ts rotate-check
```

---

## Rotation Procedures

### General Rotation Principles

1. **Generate new value first** — never invalidate the old value before the new one is deployed.
2. **Encrypt if applicable** — use the CLI tool to encrypt the new value with `enc:` prefix.
3. **Update environment** — set the new value in the deployment environment (.env, secrets manager, etc.).
4. **Restart/redeploy** — the application must restart to pick up new credential values.
5. **Verify** — confirm the application starts successfully and functions correctly.
6. **Invalidate old value** — only after verifying the new value works.

### LINEAR_API_KEY

| Step | Action |
|---|---|
| 1 | Generate a new API key in Linear (Settings > API > Personal API Keys) |
| 2 | Encrypt: `echo "lin_api_NEW_KEY" \| npx ts-node src/utils/credential-cli.ts encrypt` |
| 3 | Update `LINEAR_API_KEY` in the deployment environment with the `enc:` value |
| 4 | Restart the application / redeploy |
| 5 | Verify: check that data sync completes successfully (GET /api/sync/status) |
| 6 | Revoke the old API key in Linear |

### SESSION_SECRET

| Step | Action |
|---|---|
| 1 | Generate a random 32+ character string: `openssl rand -base64 48` |
| 2 | Encrypt: `echo "NEW_SECRET" \| npx ts-node src/utils/credential-cli.ts encrypt` |
| 3 | Update `SESSION_SECRET` in the deployment environment |
| 4 | Restart the application / redeploy |
| 5 | Verify: confirm the application starts and sessions work |
| 6 | **Note:** All existing user sessions will be invalidated — users must re-authenticate |

### DATABASE_URL

| Step | Action |
|---|---|
| 1 | Coordinate with DBA to create new database credentials |
| 2 | Construct the new connection string: `postgresql://newuser:newpass@host:5432/dbname` |
| 3 | Encrypt (optional): `echo "postgresql://..." \| npx ts-node src/utils/credential-cli.ts encrypt` |
| 4 | Update `DATABASE_URL` in the deployment environment |
| 5 | Restart the application / redeploy |
| 6 | Verify: confirm database connectivity (application starts, health check passes) |
| 7 | Coordinate with DBA to revoke old database credentials |

**Risk:** Downtime if the new connection string is incorrect. Test connectivity before deploying to production.

### DB_ENCRYPTION_KEY

> **HIGH RISK** — Changing this key requires re-encryption of all encrypted database columns.

| Step | Action |
|---|---|
| 1 | Generate a new encryption key |
| 2 | Write a migration script to decrypt all encrypted columns with the old key and re-encrypt with the new key |
| 3 | Run the migration in a maintenance window |
| 4 | Update `DB_ENCRYPTION_KEY` in the deployment environment |
| 5 | Restart the application / redeploy |
| 6 | Verify: confirm encrypted data can be read correctly |
| 7 | **Important:** Keep the old key documented securely until migration is verified |

**Recommendation:** Schedule a maintenance window. Test the migration thoroughly in staging first.

### CREDENTIAL_ENCRYPTION_KEY

> **HIGH RISK** — Changing this key requires re-encryption of all `enc:` values in the environment.

| Step | Action |
|---|---|
| 1 | Generate a new master encryption key |
| 2 | For each `enc:` value in the environment: decrypt with old key, re-encrypt with new key |
| 3 | Use the CLI for batch re-encryption: `CREDENTIAL_ENCRYPTION_KEY=old-key npx ts-node src/utils/credential-cli.ts validate` (verify old key works first) |
| 4 | Re-encrypt each value: set new key in env, pipe plaintext values through `encrypt` command |
| 5 | Update ALL `enc:` values AND `CREDENTIAL_ENCRYPTION_KEY` in the deployment environment simultaneously |
| 6 | Restart the application / redeploy |
| 7 | Verify: `npx ts-node src/utils/credential-cli.ts validate` confirms all credentials decryptable |

### SYNC_TRIGGER_TOKEN

| Step | Action |
|---|---|
| 1 | Generate a new random token: `openssl rand -hex 32` |
| 2 | Encrypt (optional): `echo "NEW_TOKEN" \| npx ts-node src/utils/credential-cli.ts encrypt` |
| 3 | Update `SYNC_TRIGGER_TOKEN` in the deployment environment |
| 4 | Restart the application / redeploy |
| 5 | Verify: test sync trigger endpoint with new token (`Authorization: Bearer NEW_TOKEN`) |
| 6 | Update any external systems / CI pipelines that use the old token |

---

## Emergency Procedures

### Credential Compromise Response

If a credential is suspected to be compromised:

1. **Immediately rotate the compromised credential** using the appropriate procedure above
2. **Revoke/invalidate the old credential** as soon as the new one is deployed
3. **Review audit logs** for unauthorized access (`GET /api/admin/audit-logs`)
4. **Check sync history** for any unauthorized sync operations
5. **Document the incident** including: what was exposed, when, how, impact, and remediation steps
6. **Notify stakeholders** per your organization's incident response policy

### If CREDENTIAL_ENCRYPTION_KEY is Compromised

This is the most critical scenario — an attacker with this key can decrypt all `enc:` values:

1. Immediately generate a new CREDENTIAL_ENCRYPTION_KEY
2. Re-encrypt ALL `enc:` credential values with the new key
3. Rotate ALL credentials that were protected by the compromised key (LINEAR_API_KEY, SESSION_SECRET, DATABASE_URL, SYNC_TRIGGER_TOKEN)
4. Deploy the complete set of new credentials simultaneously
5. Verify application functionality
6. Investigate how the key was exposed and remediate the vulnerability

---

## Production Deployment Checklist

Before deploying to production, verify:

- [ ] All required credentials are set: `DATABASE_URL`, `LINEAR_API_KEY`, `SESSION_SECRET`, `DB_ENCRYPTION_KEY`
- [ ] `CREDENTIAL_ENCRYPTION_KEY` is set if any credential uses `enc:` prefix
- [ ] Run `npx ts-node src/utils/credential-cli.ts validate` to confirm all credentials are valid
- [ ] `SESSION_SECRET` is at least 32 characters
- [ ] No credential values appear in source code, git history, or CI logs
- [ ] `.env` files are in `.gitignore` and NOT committed
- [ ] Credential rotation procedures are documented and accessible to the ops team
- [ ] Audit logging is enabled for access and admin operations

---

## Future Enhancements

The current `enc:` prefix approach provides pragmatic encryption for an internal tool. For enhanced security, consider:

- **Managed secrets services:** AWS Secrets Manager, Azure Key Vault, Google Secret Manager, or HashiCorp Vault
- **Automatic credential rotation:** Integration with secrets managers that support automatic rotation
- **Short-lived credentials:** Use temporary tokens with automatic refresh instead of long-lived API keys
- **File permission hardening:** Set `chmod 600` on credential files per OWASP 2024+ guidance
- **Audit trail on configuration access:** Log when credentials are read (currently only validated at startup)
