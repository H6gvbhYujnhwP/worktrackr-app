// web/client/src/app/src/components/TicketDetailView.jsx
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2, Calendar as CalIcon, Clock, FileText, User, Tag } from 'lucide-react';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';

const SECTORS = ['General', 'IT', 'Maintenance', 'Construction', 'Manufacturing', 'Facilities'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'in_progress', 'pending', 'completed', 'closed'];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

function safeParseJson(str) {
  if (!str || !str.trim()) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export default function TicketDetailView({ ticketId, onBack }) {
  console.log('[TicketDetailView] Rendering with ticketId:', ticketId);
  const { tickets, users, updateTicket } = useSimulation();
  const [ticket, setTicket] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    sector: '',
    assignee_id: '',
    scheduled_date: '',
    scheduled_duration_mins: '',
    method_statement: '',
    risk_assessment: ''
  });

  useEffect(() => {
    console.log('[TicketDetailView] useEffect - ticketId:', ticketId, 'tickets count:', tickets.length);
    const t = tickets.find(t => String(t.id) === String(ticketId));
    console.log('[TicketDetailView] Found ticket:', t ? 'YES' : 'NO');
    if (t) {
      setTicket(t);
      setForm({
        title: t.title || '',
        description: t.description || '',
        priority: t.priority || 'medium',
        status: t.status || 'open',
        sector: t.sector || '',
        assignee_id: t.assignee_id || '',
        scheduled_date: t.scheduled_date ? ('' + t.scheduled_date).slice(0, 10) : '',
        scheduled_duration_mins: t.scheduled_duration_mins ?? '',
        method_statement: t.method_statement ? JSON.stringify(t.method_statement, null, 2) : '',
        risk_assessment: t.risk_assessment ? JSON.stringify(t.risk_assessment, null, 2) : ''
      });
    }
  }, [tickets, ticketId]);

  const onChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      const patch = {
        title: form.title || undefined,
        description: form.description || undefined,
        priority: form.priority || undefined,
        status: form.status || undefined,
        sector: form.sector || null,
        assignee_id: form.assignee_id || null,
        scheduled_date: form.scheduled_date || null,
        scheduled_duration_mins:
          form.scheduled_duration_mins === '' ? null : Number(form.scheduled_duration_mins),
        method_statement: safeParseJson(form.method_statement),
        risk_assessment: safeParseJson(form.risk_assessment),
      };
      await updateTicket(ticketId, patch);
      alert('Ticket updated successfully!');
    } catch (e) {
      console.error('[TicketDetailView] save failed', e);
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  const assignedUser = users?.find(u => u.id === ticket.assignee_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ticket #{ticket.id.slice(0, 8)} • Created {new Date(ticket.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={PRIORITY_COLORS[ticket.priority || 'medium']}>
            {(ticket.priority || 'medium').toUpperCase()}
          </Badge>
          <Badge className={STATUS_COLORS[ticket.status || 'open']}>
            {(ticket.status || 'open').replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={onChange('title')}
                  placeholder="Enter ticket title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={onChange('description')}
                  placeholder="Enter ticket description"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={form.priority} onValueChange={onChange('priority')}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={onChange('status')}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="sector">Sector</Label>
                <Select value={form.sector} onValueChange={onChange('sector')}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalIcon className="w-5 h-5" />
                Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={onChange('scheduled_date')}
                />
              </div>

              <div>
                <Label htmlFor="scheduled_duration_mins">Duration (minutes)</Label>
                <Input
                  id="scheduled_duration_mins"
                  type="number"
                  value={form.scheduled_duration_mins}
                  onChange={onChange('scheduled_duration_mins')}
                  placeholder="e.g., 60"
                />
              </div>
            </CardContent>
          </Card>

          {/* Method Statement & Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Safety Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="method_statement">Method Statement (JSON)</Label>
                <Textarea
                  id="method_statement"
                  value={form.method_statement}
                  onChange={onChange('method_statement')}
                  placeholder='{"steps": ["Step 1", "Step 2"]}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="risk_assessment">Risk Assessment (JSON)</Label>
                <Textarea
                  id="risk_assessment"
                  value={form.risk_assessment}
                  onChange={onChange('risk_assessment')}
                  placeholder='{"risks": ["Risk 1", "Risk 2"]}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="assignee_id">Assigned To</Label>
                <Select value={form.assignee_id} onValueChange={onChange('assignee_id')}>
                  <SelectTrigger id="assignee_id">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users?.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {assignedUser && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{assignedUser.name}</div>
                      <div className="text-sm text-gray-500">{assignedUser.email}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500">Ticket ID</div>
                <div className="font-mono text-xs">{ticket.id}</div>
              </div>
              <div>
                <div className="text-gray-500">Created</div>
                <div>{new Date(ticket.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">Last Updated</div>
                <div>{new Date(ticket.updated_at).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={onSave}
                disabled={saving || !form.title}
                className="w-full gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
