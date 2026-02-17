-- Up Migration: Add last_seen_at column to users table
-- Supports per-user "What's New" badge by tracking when a user last viewed the backlog.
-- Items with created_at > last_seen_at are considered "unseen."

ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ;

---- Down Migration ----
-- undo the above statements

ALTER TABLE users DROP COLUMN IF EXISTS last_seen_at;
