-- Migration: Enable pgcrypto extension for column-level encryption
-- Story 10.1: Implement HTTPS and Data Encryption (VIX-379)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
