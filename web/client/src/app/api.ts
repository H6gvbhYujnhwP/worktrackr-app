// web/client/src/app/api.ts
export type Ticket = {
  id?: string
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string | null
  queueId?: string | null
  sector?: string | null
  scheduled_date?: string | null
  scheduled_duration_mins?: number | null
  method_statement?: any
  risk_assessment?: any
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `HTTP ${r.status}`)
  }
  return r.json() as Promise<T>
}

export const TicketsAPI = {
  list: (params?: Record<string, string>) =>
    http<{ tickets: Ticket[]; pagination: any }>(
      `/api/tickets${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  get: (id: string) =>
    http<{ ticket: Ticket; comments: any[]; attachments: any[] }>(
      `/api/tickets/${id}`
    ),
  create: (t: Ticket) =>
    http<{ ticket: Ticket }>(`/api/tickets`, {
      method: 'POST',
      body: JSON.stringify(t),
    }),
  update: (id: string, patch: Partial<Ticket>) =>
    http<{ ticket: Ticket }>(`/api/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
}
