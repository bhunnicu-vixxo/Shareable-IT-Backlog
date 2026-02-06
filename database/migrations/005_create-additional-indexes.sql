-- Up Migration: Create composite and partial indexes for common query patterns

-- Composite index for audit log queries filtered by user and time range
CREATE INDEX idx_audit_logs_user_id_created_at ON audit_logs(user_id, created_at);

-- Composite index for sync history queries filtered by status and start time
CREATE INDEX idx_sync_history_status_started_at ON sync_history(status, started_at);

-- Partial index for quickly finding active (non-disabled) approved users
CREATE INDEX idx_users_active_approved ON users(is_approved) WHERE is_disabled = FALSE;

---- Down Migration ----
-- undo the above statements

DROP INDEX IF EXISTS idx_users_active_approved;
DROP INDEX IF EXISTS idx_sync_history_status_started_at;
DROP INDEX IF EXISTS idx_audit_logs_user_id_created_at;
