-- Phase 5 — Contracts (recurring): header + recurring service lines + a manager
-- manual-£ override per contract per commission period.
--
-- A Contract tracks ONGOING monthly profit for a company (a contacts row with
-- type='company' — never the dropped customers table). It is the recurring
-- counterpart to a one-off Order. Recurring lines only: a line is monthly or
-- annual. One-off lines from a pulled IdoYourQuotes quote do NOT live here — the
-- contracts route sends them to a one-off Order instead, so a contract's monthly
-- figures stay honest.
--
-- NOTHING about any organisation's commission scheme is in this file. No rate,
-- no amount. Every money column defaults to 0 and is filled in-app per org.
--
-- Filename starts 'phase5_' so it sorts AFTER create_orders_tables.sql and the
-- idyq_* migrations (this file references orders, contacts and users that those
-- create). Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,           -- the company
  salesperson_user_id UUID REFERENCES users(id) ON DELETE SET NULL,     -- for recurring commission
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','cancelled')),
  source_idyq_quote_id TEXT,                 -- the IdoYourQuotes quote it was created from (if any)
  notes TEXT,
  started_at TIMESTAMPTZ,                     -- first time it became active
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring service lines. unit_cost / unit_profit are stored at the line's OWN
-- interval (a monthly line holds its monthly figures; an annual line holds its
-- annual figures). The route and screens normalise annual ÷ 12 when they need a
-- per-month figure (Decision 2). sell = unit_cost + unit_profit.
CREATE TABLE IF NOT EXISTS contract_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,      -- buy-in ex VAT, per unit, at this line's interval
  unit_profit NUMERIC NOT NULL DEFAULT 0,    -- profit ex VAT, per unit, at this line's interval
  billing_interval TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_interval IN ('monthly','annual')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','idyq')),
  idyq_quote_id TEXT,                         -- if pulled from an IdoYourQuotes quote
  sort_order INTEGER DEFAULT 0
);

-- Optional manual £ a manager sets for one contract's recurring commission in one
-- period — the "every bonus/wage figure has a manual £ field" rule, for contracts.
-- Wired by the commission engine in Phase 5 batch 2.
CREATE TABLE IF NOT EXISTS contract_commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  manual_amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  set_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contract_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_contracts_organisation ON contracts(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_contact      ON contracts(contact_id);
CREATE INDEX IF NOT EXISTS idx_contracts_salesperson  ON contracts(salesperson_user_id);
CREATE INDEX IF NOT EXISTS idx_contract_lines_contract ON contract_lines(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_overrides_lookup ON contract_commission_overrides(organisation_id, contract_id, period_start);
