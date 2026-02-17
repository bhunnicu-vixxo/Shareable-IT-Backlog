-- Up Migration: Create requests table
-- Stores IT requests submitted by business users through the app.
-- Requests go through a triage workflow: submitted → reviewing → approved/rejected/merged.
-- On approval, a Linear issue is created and linked back via linear_issue_id.

CREATE TYPE request_business_impact AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE request_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected', 'merged');

CREATE TABLE requests (
  -- UUIDs are generated in application code to avoid requiring pgcrypto/uuid extensions.
  id            UUID PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  title         VARCHAR(500) NOT NULL,
  description   TEXT NOT NULL,
  business_impact request_business_impact NOT NULL DEFAULT 'medium',
  category      VARCHAR(255),
  urgency       VARCHAR(50),
  status        request_status NOT NULL DEFAULT 'submitted',
  admin_notes   TEXT,
  rejection_reason TEXT,
  reviewed_by   INTEGER REFERENCES users(id),
  linear_issue_id VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at);

---- Down Migration ----
-- undo the above statements

DROP TABLE IF EXISTS requests;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS request_business_impact;
