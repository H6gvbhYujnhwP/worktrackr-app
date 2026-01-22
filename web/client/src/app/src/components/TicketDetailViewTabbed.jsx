import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2, Calendar as CalIcon, Clock, FileText, User, Tag, Shield, MessageSquare, Paperclip, Plus, Trash2, Edit2, DollarSign } from 'lucide-react';
import { useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import SafetyTab from './SafetyTabComprehensive.jsx';
import QuotesTab from './QuotesTab.jsx';

const SECTORS = [
  'Health & Safety Compliance',
  'Construction/Maintenance Work',
  'Field Service Operations',
  'Regulated Industries'
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = [
  'new',
  'open', 
  'pending', 
  'awaiting_info',
  'in_progress',
  'awaiting_quote',
  'quote_sent',
  'quote_accepted',
  'quote_declined',
  'quote_expired',
  'scheduled',
  'resolved',
  'closed',
  'cancelled',
  'invoiced'
];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  awaiting_info: 'bg-orange-100 text-orange-800 border-orange-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  awaiting_quote: 'bg-amber-100 text-amber-800 border-amber-200',
  quote_sent: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  quote_accepted: 'bg-green-100 text-green-800 border-green-200',
  quote_declined: 'bg-red-100 text-red-800 border-red-200',
  quote_expired: 'bg-orange-100 text-orange-800 border-orange-200',
  scheduled: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  invoiced: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function safeParseJson(str) {
  if (!str || !str.trim()) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export default function TicketDetailViewTabbed({ ticketId, onBack }) {
  const { tickets, users, updateTicket } = useSimulation();
  const [ticket, setTicket] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    sector: '',
    assignee_id: '',
    scheduled_date: '',
    scheduled_duration_mins: '',
    method_statement: null,
    risk_assessment: null
  });

  useEffect(() => {
    const t = tickets.find(t => String(t.id) === String(ticketId));
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
        method_statement: t.method_statement || { method_statements: [], risk_assessments: [] },
        risk_assessment: t.risk_assessment || { method_statements: [], risk_assessments: [] }
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
        method_statement: form.method_statement,
        risk_assessment: form.risk_assessment,
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
        {/* Main Content with Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="details" className="gap-2">
                <FileText className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="scheduling" className="gap-2">
                <CalIcon className="w-4 h-4" />
                Scheduling
              </TabsTrigger>
              <TabsTrigger value="safety" className="gap-2">
                <Shield className="w-4 h-4" />
                Safety
              </TabsTrigger>
              <TabsTrigger value="quotes" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Quotes
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Information</CardTitle>
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
                      rows={8}
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
                    <Select value={form.sector || 'none'} onValueChange={(val) => onChange('sector')(val === 'none' ? '' : val)}>
                      <SelectTrigger id="sector">
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {SECTORS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info in Details Tab */}
              {(ticket?.sender_email || ticket?.contact_id) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ticket?.sender_name && (
                      <div>
                        <Label className="text-xs text-gray-500">Name</Label>
                        <p className="text-sm font-medium">{ticket.sender_name}</p>
                      </div>
                    )}
                    {ticket?.sender_email && (
                      <div>
                        <Label className="text-xs text-gray-500">Email</Label>
                        <p className="text-sm">{ticket.sender_email}</p>
                      </div>
                    )}
                    {!ticket?.contact_id && ticket?.sender_email && (
                      <div className="pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => console.log('Add/Link Contact clicked')}
                        >
                          <User className="w-4 h-4 mr-2" />
                          Link to Contact
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Scheduling Tab */}
            <TabsContent value="scheduling" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalIcon className="w-5 h-5" />
                    Schedule Information
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
            </TabsContent>

            {/* Safety Tab */}
            <TabsContent value="safety" className="space-y-6">
              <SafetyTab 
                ticket={ticket}
                onUpdate={(data) => {
                  setForm(prev => ({
                    ...prev,
                    ...data
                  }));
                }}
              />
            </TabsContent>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="space-y-6">
              <QuotesTab ticketId={ticketId} />
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Comments & Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Comments feature coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>File Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <Paperclip className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Attachments feature coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Always Visible */}
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
                <Select value={form.assignee_id || 'unassigned'} onValueChange={(val) => onChange('assignee_id')(val === 'unassigned' ? '' : val)}>
                  <SelectTrigger id="assignee_id">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
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


