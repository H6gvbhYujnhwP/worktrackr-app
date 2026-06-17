-- Orders (one-off jobs): header + line items + approval trail.
-- A line's economics are buy-in cost and profit per unit (sell = cost + profit);
-- IDYQ-pulled lines carry source='idyq' and are read-only in WorkTrackr.
-- Single approver for v1, but approvals live in their own table so an approval
-- chain can be added later without reshaping anything.
-- Idempotent. Sorts after create_contacts_table.sql (orders reference contacts).

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,          -- the company
  salesperson_user_id UUID REFERENCES users(id) ON DELETE SET NULL,    -- for commission
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected','ordered','invoiced','paid')),
  notes TEXT,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  supplier_url TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,      -- buy-in ex VAT, per unit
  unit_profit NUMERIC NOT NULL DEFAULT 0,    -- profit ex VAT, per unit (sell = cost + profit)
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','idyq')),
  idyq_quote_id TEXT,                         -- if pulled from an IDYQ quote
  line_type TEXT,                             -- 'one_off' | 'annual' | 'monthly'
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_organisation ON orders(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_contact      ON orders(contact_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_order   ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_approvals_order ON order_approvals(order_id);
