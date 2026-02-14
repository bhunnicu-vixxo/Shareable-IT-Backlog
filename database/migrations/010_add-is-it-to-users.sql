-- Up Migration: Add is_it boolean to users table
-- Allows users to be designated as IT role alongside existing admin role
-- Part of story 13.1: Add IT Role to User Model

ALTER TABLE users ADD COLUMN is_it BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_users_is_it ON users(is_it);

---- Down Migration ----
-- undo the above statements

DROP INDEX IF EXISTS idx_users_is_it;
ALTER TABLE users DROP COLUMN IF EXISTS is_it;
