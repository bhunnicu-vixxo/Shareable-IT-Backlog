-- Up Migration: Create label_visibility table
-- Stores admin-configured label visibility settings for the public backlog filter
-- Part of story 7.6: Admin Label Visibility Configuration
-- Core design: Labels are hidden by default (opt-in visibility)

CREATE TABLE IF NOT EXISTS label_visibility (
    id SERIAL PRIMARY KEY,
    label_name VARCHAR(255) NOT NULL UNIQUE,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    show_on_cards BOOLEAN NOT NULL DEFAULT TRUE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_label_visibility_is_visible ON label_visibility(is_visible);

---- Down Migration ----
-- undo the above statements

DROP INDEX IF EXISTS idx_label_visibility_is_visible;
DROP TABLE IF EXISTS label_visibility;
