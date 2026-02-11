-- Migration: 006_create-session-table.sql
-- Description: Create session table for connect-pg-simple (express-session PostgreSQL store)
-- Story: 7.2 — Implement User Approval Workflow (VIX-362)

CREATE TABLE "session" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX "IDX_session_expire" ON "session" ("expire");
