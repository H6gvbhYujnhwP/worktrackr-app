-- Tasks: a to-do linked to a company/contact, assigned to a user, with due date,
-- priority and open/done status. Powers the "My Tasks" dashboard and the tasks
-- section on the company profile. Idempotent. Sorts after create_contacts_table.sql
-- (depends on contacts) — users already exists.

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,        -- linked company/person
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_organisation ON tasks(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee     ON tasks(organisation_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contact      ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(organisation_id, status);
