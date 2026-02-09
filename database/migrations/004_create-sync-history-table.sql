-- Up Migration: Create sync_history table
-- Tracks automatic and manual sync operations from Linear API

CREATE TABLE sync_history (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  trigger_type VARCHAR(50) NOT NULL,
  triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_history_status ON sync_history(status);
CREATE INDEX idx_sync_history_started_at ON sync_history(started_at);

---- Down Migration ----
-- undo the above statements

DROP TABLE IF EXISTS sync_history;
