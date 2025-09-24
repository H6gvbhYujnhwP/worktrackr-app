// web/client/src/app/src/components/TicketsList.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Loader2, RefreshCw, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { TicketsAPI } from '../app/api'

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
      setTickets(Array.isArray(rows) ? rows : [])
    } catch (e) {
      console.error('[TicketsList] failed to load', e)
      setError(e?.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter(t =>
      [t.title, t.description, t.sector, t.priority]
        .filter(Boolean)
        .some(val => String(val).toLowerCase().includes(q))
    )
  }, [tickets, query])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Tickets</CardTitle>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search title, description, sector…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading} title="Refresh">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No tickets found{query ? ' for your search.' : '.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Sector</th>
                  <th className="py-2 px-3">Scheduled</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{t.title}</div>
                      {t.description && (
                        <div className="text-gray-500 line-clamp-1">{t.description}</div>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full ${PRIORITY_COLOR[t.priority] || 'bg-gray-100 text-gray-800'}`}>
                        {String(t.priority || '').toUpperCase() || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{t.sector || '—'}</td>
                    <td className="py-2 px-3">
                      {t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString() : '—'}
                      {t.scheduled_duration_mins ? ` · ${t.scheduled_duration_mins}m` : ''}
                    </td>
                    <td className="py-2 px-3">
                      {t.status ? (
                        <Badge variant="secondary">{t.status}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <Button size="sm" onClick={() => onSelectTicket?.(t)}>
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
