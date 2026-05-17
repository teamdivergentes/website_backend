-- Migration: add editorial fields to coaching_staff for parity with team_members
-- Adds nullable columns nationality, birthDate, customFields.
-- Non-destructive: all columns are optional (no backfill required).

ALTER TABLE "coaching_staff" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "coaching_staff" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "coaching_staff" ADD COLUMN IF NOT EXISTS "customFields" JSONB;
