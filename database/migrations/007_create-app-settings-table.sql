-- Up Migration: Create app_settings table
-- Stores application-level configuration (e.g. sync cron schedule) in the database
-- so admins can update settings without redeploying or editing .env files.

CREATE TABLE app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the default sync schedule: every 15 minutes
INSERT INTO app_settings (key, value, description)
VALUES (
  'sync_cron_schedule',
  '*/15 * * * *',
  'Cron expression controlling how often the Linear sync runs. Default: every 15 minutes.'
);

---- Down Migration ----
-- undo the above statements

DROP TABLE IF EXISTS app_settings;
