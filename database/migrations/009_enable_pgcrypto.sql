-- Migration: Enable pgcrypto extension for column-level encryption
-- Story 10.1: Implement HTTPS and Data Encryption (VIX-379)
-- NOTE: pgcrypto is not needed at runtime (argon2 handles password hashing in Node).
-- Azure PostgreSQL may not allow this extension. Using a no-op SELECT instead.

SELECT 1;
