// web/client/src/app/src/components/TicketsList.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Loader2, RefreshCw, Search, AlertCircle, CheckCircle2 } from 'lucide-react'

// ✅ fix: correct relative path to the API adapter
import { TicketsAPI } from '../../app/api'

const PRIORITY_COLOR = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export default function TicketsList({ onSelectTicket }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tickets, setTickets] = useState([])
  const [query, setQuery] = useState('')

  // Initial load from backend
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const { tickets: rows } = await TicketsAPI.list()
      // Transform API response: assignee_id → assignedTo for frontend compatibility
      const transformedTickets = (rows || []).map(ticket => ({
        ...ticket,
        assignedTo: ticket.assignee_id,
        assignedUser: ticket.assignee_name
      }));
      setTickets(Array.isArray(transformedTickets) ? transformedTickets : [])
    } catch (e) {
      console.error('[TicketsList] load failed', e)
      setError(e?.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter(t =>
      [t.title, t.description, t.priority, t.sector]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    )
  }, [tickets, query])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Tickets</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading} aria-label="Refresh tickets">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <Input placeholder="Search tickets..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No tickets found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Sector</th>
                  <th className="py-2 pr-4">Scheduled</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 pr-4">{t.title}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded ${PRIORITY_COLOR[t.priority || 'medium']}`}>
                        {t.priority || 'medium'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{t.sector || '—'}</td>
                    <td className="py-2 pr-4">
                      {t.scheduled_date ? new Date(t.scheduled_date).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <Button size="sm" variant="outline" onClick={() => onSelectTicket?.(t.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Showing {filtered.length} of {tickets.length}
              </div>
              <div>Auto-refresh is manual for now</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
