-- Up Migration: Create backlog_items table
-- Persists a lightweight copy of synced Linear issues so that SQL queries
-- (e.g. unseen-count WHERE created_at > $1) work without hitting the API.
-- The sync service upserts rows on every sync cycle.

CREATE TABLE IF NOT EXISTS backlog_items (
  id          TEXT PRIMARY KEY,           -- Linear issue UUID
  identifier  TEXT NOT NULL,              -- e.g. "VIX-338"
  title       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backlog_items_created_at ON backlog_items (created_at);

---- Down Migration ----
-- undo the above statements

DROP TABLE IF EXISTS backlog_items;
