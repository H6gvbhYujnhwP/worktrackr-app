-- Phase 10 — billing enforcement foundations.
--
-- Adds two columns to organisations:
--   billing_exempt      BOOLEAN  — when true, the access wall always lets this org through,
--                                  regardless of trial/subscription state. This is the owner
--                                  safety hatch so turning enforcement on can never lock the
--                                  owner's own org out.
--   subscription_status VARCHAR  — a local mirror of Stripe's view of the subscription
--                                  ('active' | 'trialing' | 'past_due' | 'canceled' | etc.),
--                                  kept up to date by the Stripe webhooks. The access wall
--                                  reads THIS instead of calling Stripe live on every request.
--
-- It then flips billing_exempt ON for the owner's dev org (sweetbyteltd) as a one-time,
-- auditable carve-out, so the moment the wall exists the owner is already exempt.
--
-- Order-independent: organisations already exists before any phaseN migration, so this can
-- run at any point. Idempotent: ADD COLUMN IF NOT EXISTS + a targeted UPDATE, safe to re-run.
-- No money values here — only flags and dates.

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS billing_exempt BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20);

-- Owner dev-org carve-out (sweetbyteltd). One-time safety hatch.
UPDATE organisations
   SET billing_exempt = true
 WHERE id = 'a777ef53-e7f9-4d1b-9231-2213aef91c98';
