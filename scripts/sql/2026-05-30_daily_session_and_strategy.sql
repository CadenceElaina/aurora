-- Manual DDL for the 2026-05-30 session (T-030 + T4-A).
--
-- WHY THIS FILE EXISTS: `npx drizzle-kit push` currently crashes while introspecting
-- this database (TypeError parsing a pre-existing CHECK constraint, drizzle-kit bin.cjs).
-- Until that's fixed, apply schema changes with this idempotent SQL instead. It matches
-- drizzle's naming conventions, so a future working `drizzle-kit push` will diff clean.
--
-- APPLY:  psql "$DATABASE_URL" -f scripts/sql/2026-05-30_daily_session_and_strategy.sql
--   (or run the statements via any client against your DATABASE_URL)

-- ── T-030: daily session state (cross-day session integrity) ──────────────────
CREATE TABLE IF NOT EXISTS "daily_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "date" varchar(10) NOT NULL,
  "planned_review_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "planned_new_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "acted_review_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "acted_new_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "daily_session" ADD CONSTRAINT "daily_session_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "daily_session_user_date_unique"
  ON "daily_session" ("user_id", "date");

-- ── T4-A: explicit session strategy on users ──────────────────────────────────
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "strategy" varchar(20) DEFAULT 'balanced' NOT NULL;
