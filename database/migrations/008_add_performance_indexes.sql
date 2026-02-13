-- Up Migration: Add performance indexes for common query patterns (Story 9.3)
--
-- Most indexes were already created in earlier migrations:
--   - users(email)                           → 001
--   - audit_logs(user_id, created_at)        → 005
--   - sync_history(started_at)               → 004
--
-- This migration adds the remaining composite index for audit log
-- queries filtered by action and ordered by time.

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON audit_logs(action, created_at DESC);

---- Down Migration ----
-- undo the above statements

DROP INDEX IF EXISTS idx_audit_logs_action_created_at;
