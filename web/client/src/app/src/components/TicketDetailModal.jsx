// web/client/src/app/src/components/TicketDetailModal.jsx
import React, { useEffect, useState } from 'react'
import { X, Loader2, Save, Calendar as CalIcon, Clock, FileText } from 'lucide-react'
import { useSimulation } from '../App.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select.jsx'

const SECTORS = ['General','IT','Maintenance','Construction','Manufacturing','Facilities']

export default function TicketDetailModal({ ticketId, onClose }) {
  const { tickets, updateTicket } = useSimulation()
  const [ticket, setTicket] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    sector: '',
    scheduled_date: '',
    scheduled_duration_mins: '',
    method_statement: '',
    risk_assessment: ''
  })

  useEffect(() => {
    const t = tickets.find(t => String(t.id) === String(ticketId))
    if (t) {
      setTicket(t)
      setForm({
        title: t.title || '',
        description: t.description || '',
        priority: t.priority || 'medium',
        sector: t.sector || '',
        scheduled_date: t.scheduled_date ? ('' + t.scheduled_date).slice(0,10) : '',
        scheduled_duration_mins: t.scheduled_duration_mins ?? '',
        method_statement: t.method_statement ? JSON.stringify(t.method_statement, null, 2) : '',
        risk_assessment: t.risk_assessment ? JSON.stringify(t.risk_assessment, null, 2) : ''
      })
    }
  }, [tickets, ticketId])

  const onChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const onSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Convert date-only scheduled_date to ISO datetime for backend
      let scheduledDateISO = null;
      if (form.scheduled_date) {
        // If it's already a full datetime, use it; otherwise convert date to datetime
        if (form.scheduled_date.includes('T')) {
          scheduledDateISO = form.scheduled_date;
        } else {
          // Convert date-only (YYYY-MM-DD) to ISO datetime with default time 09:00
          scheduledDateISO = new Date(form.scheduled_date + 'T09:00:00').toISOString();
        }
      }
      
      // Coerce payload to API shape
      const patch = {
        title: form.title || undefined,
        description: form.description || undefined,
        priority: form.priority || undefined,
        sector: form.sector || null,
        scheduled_date: scheduledDateISO,
        scheduled_duration_mins:
          form.scheduled_duration_mins === '' ? null : Number(form.scheduled_duration_mins),
        // Safely parse JSON fields if provided
        method_statement: safeParseJson(form.method_statement),
        risk_assessment: safeParseJson(form.risk_assessment),
      }
      await updateTicket(ticketId, patch)
      onClose()
    } catch (e) {
      console.error('[TicketDetailModal] save failed', e)
      setError(e?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (!ticket) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading ticket…
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Ticket: {ticket.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={onChange('title')} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={5} value={form.description} onChange={onChange('description')} />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={onChange('priority')}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>RAMS & Scheduling</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Sector</Label>
                <Select value={form.sector || 'none'} onValueChange={(val) => onChange('sector')(val === 'none' ? '' : val)}>
                  <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled_date" className="flex items-center gap-2"><CalIcon className="w-4 h-4" /> Scheduled Date</Label>
                  <Input id="scheduled_date" type="date" value={form.scheduled_date} onChange={onChange('scheduled_date')} />
                </div>
                <div>
                  <Label htmlFor="scheduled_duration_mins" className="flex items-center gap-2"><Clock className="w-4 h-4" /> Duration (mins)</Label>
                  <Input id="scheduled_duration_mins" type="number" min="0" step="15" value={form.scheduled_duration_mins} onChange={onChange('scheduled_duration_mins')} />
                </div>
              </div>
              <div>
                <Label htmlFor="method_statement" className="flex items-center gap-2"><FileText className="w-4 h-4" /> Method Statement (JSON)</Label>
                <Textarea id="method_statement" rows={6} value={form.method_statement} onChange={onChange('method_statement')} placeholder='{"tasks":[...], "ppe":[...]}' />
              </div>
              <div>
                <Label htmlFor="risk_assessment" className="flex items-center gap-2"><FileText className="w-4 h-4" /> Risk Assessment (JSON)</Label>
                <Textarea id="risk_assessment" rows={6} value={form.risk_assessment} onChange={onChange('risk_assessment')} placeholder='{"hazards":[...], "mitigations":[...]}' />
              </div>
            </CardContent>
          </Card>
        </div>

        {error && <div className="px-4 pb-2 text-red-600 text-sm">{error}</div>}

        <div className="p-4 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onSave} disabled={saving} className="worktrackr-bg-black hover:bg-gray-800">
            {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>) : (<><Save className="w-4 h-4 mr-2" /> Save Changes</>)}
          </Button>
        </div>
      </div>
    </div>
  )
}

function safeParseJson(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    // If user pasted non-JSON, store as string to avoid data loss
    return trimmed
  }
}
