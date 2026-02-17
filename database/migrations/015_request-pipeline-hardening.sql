-- Up Migration: Request pipeline hardening
-- - Avoid pgcrypto dependency for request UUID defaults (generate UUIDs in app)
-- - Store Linear issue identifier + URL for request approvals/merges
-- - Persist Linear status in backlog_items to power duplicate detection suggestions

-- 1) Requests: drop gen_random_uuid() default (pgcrypto may not exist)
ALTER TABLE requests
  ALTER COLUMN id DROP DEFAULT;

-- 2) Requests: store extra Linear metadata for user-facing linking
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS linear_issue_identifier VARCHAR(64),
  ADD COLUMN IF NOT EXISTS linear_issue_url TEXT;

CREATE INDEX IF NOT EXISTS idx_requests_linear_issue_identifier ON requests(linear_issue_identifier);

-- 3) Backlog items: store status for lightweight duplicate detection responses
ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_backlog_items_title ON backlog_items(title);

---- Down Migration ----
-- undo the above statements

ALTER TABLE backlog_items
  DROP COLUMN IF EXISTS status;

DROP INDEX IF EXISTS idx_backlog_items_title;
DROP INDEX IF EXISTS idx_requests_linear_issue_identifier;

ALTER TABLE requests
  DROP COLUMN IF EXISTS linear_issue_identifier,
  DROP COLUMN IF EXISTS linear_issue_url;

-- NOTE: We do not restore the previous UUID default here; defaults should be set
-- only when the required database extensions are guaranteed to exist.

