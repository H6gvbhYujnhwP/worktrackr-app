// web/client/src/app/src/components/TicketDetailViewTabbed.jsx
// REDESIGN Push 2: Single white container, underline tabs, label-value rows.
// All form logic, save/onBack, SafetyTab, QuotesTab completely preserved.

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Save, Loader2, Calendar as CalIcon, FileText, User,
  Shield, MessageSquare, Paperclip, DollarSign
} from 'lucide-react';
import { useSimulation } from '../App.jsx';
import { Input }    from '@/components/ui/input.jsx';
import { Label }    from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select.jsx';
import SafetyTab  from './SafetyTabComprehensive.jsx';
import QuotesTab  from './QuotesTab.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTORS = [
  'Health & Safety Compliance',
  'Construction/Maintenance Work',
  'Field Service Operations',
  'Regulated Industries',
];
const PRIORITIES = ['low','medium','high','urgent'];
const STATUSES   = [
  'new','open','pending','awaiting_info','in_progress','awaiting_quote',
  'quote_sent','quote_accepted','quote_declined','quote_expired',
  'scheduled','resolved','closed','cancelled','invoiced',
];

const TABS = [
  { id: 'details',     label: 'Details',     Icon: FileText      },
  { id: 'scheduling',  label: 'Scheduling',  Icon: CalIcon       },
  { id: 'safety',      label: 'Safety',      Icon: Shield        },
  { id: 'quotes',      label: 'Quotes',      Icon: DollarSign    },
  { id: 'comments',    label: 'Comments',    Icon: MessageSquare },
  { id: 'attachments', label: 'Attachments', Icon: Paperclip     },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIORITY_BADGE = {
  urgent: 'bg-[#fee2e2] text-[#991b1b]',
  high:   'bg-[#fef3c7] text-[#d97706]',
  medium: 'bg-[#dbeafe] text-[#2563eb]',
  low:    'bg-[#dcfce7] text-[#16a34a]',
};
const STATUS_BADGE = {
  open:             'bg-[#dcfce7] text-[#166534]',
  in_progress:      'bg-[#dbeafe] text-[#1e40af]',
  pending:          'bg-[#fef3c7] text-[#92400e]',
  resolved:         'bg-[#dbeafe] text-[#1e40af]',
  closed:           'bg-[#f3f4f6] text-[#6b7280]',
  new:              'bg-[#dbeafe] text-[#1e40af]',
  scheduled:        'bg-[#ede9fe] text-[#6d28d9]',
  invoiced:         'bg-[#d1fae5] text-[#065f46]',
  cancelled:        'bg-[#fee2e2] text-[#991b1b]',
};

const cap  = (s) => (s || '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
const pill = (cls, text) => (
  <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{text}</span>
);

// ─── Field row (label + value) ────────────────────────────────────────────────
const FieldRow = ({ label, children }) => (
  <div className="flex items-start py-3 border-b border-[#f3f4f6] last:border-0">
    <span className="w-[160px] text-[13px] text-[#6b7280] flex-shrink-0 pt-0.5">{label}</span>
    <div className="flex-1 text-[13px] font-medium text-[#1d1d1f]">{children}</div>
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHead = ({ children }) => (
  <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-4 mt-2">
    {children}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export default function TicketDetailViewTabbed({ ticketId, onBack }) {
  const { tickets, users, updateTicket } = useSimulation();
  const [ticket, setTicket]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');
  const [activeTab, setActiveTab] = useState('details');

  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', status: 'open',
    sector: '', assignee_id: '', scheduled_date: '', scheduled_duration_mins: '',
    method_statement: null, risk_assessment: null,
  });

  useEffect(() => {
    const t = tickets.find(t => String(t.id) === String(ticketId));
    if (t) {
      setTicket(t);
      setForm({
        title:                   t.title || '',
        description:             t.description || '',
        priority:                t.priority || 'medium',
        status:                  t.status || 'open',
        sector:                  t.sector || '',
        assignee_id:             t.assignee_id || '',
        scheduled_date:          t.scheduled_date ? ('' + t.scheduled_date).slice(0, 10) : '',
        scheduled_duration_mins: t.scheduled_duration_mins ?? '',
        method_statement:        t.method_statement || { method_statements: [], risk_assessments: [] },
        risk_assessment:         t.risk_assessment  || { method_statements: [], risk_assessments: [] },
      });
    }
  }, [tickets, ticketId]);

  const onChange = (field) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm(p => ({ ...p, [field]: v }));
  };

  const onSave = async () => {
    setSaving(true); setError('');
    try {
      let scheduledDateISO = null;
      if (form.scheduled_date) {
        scheduledDateISO = form.scheduled_date.includes('T')
          ? form.scheduled_date
          : new Date(form.scheduled_date + 'T09:00:00').toISOString();
      }
      await updateTicket(ticketId, {
        title:                   form.title || undefined,
        description:             form.description || undefined,
        priority:                form.priority || undefined,
        status:                  form.status || undefined,
        sector:                  form.sector || null,
        assignee_id:             form.assignee_id || null,
        scheduled_date:          scheduledDateISO,
        scheduled_duration_mins: form.scheduled_duration_mins === '' ? null : Number(form.scheduled_duration_mins),
        method_statement:        form.method_statement,
        risk_assessment:         form.risk_assessment,
      });
      alert('Ticket updated successfully!');
      if (onBack) onBack();
    } catch (e) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#d4a017]" />
      </div>
    );
  }

  const assignedUser = users?.find(u => u.id === (ticket.assignee_id || ticket.assignedTo));

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Record header ── */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <div className="px-7 py-5 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[13px] text-[#9ca3af]
                         hover:text-[#6b7280] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-[11px] text-[#9ca3af] font-mono">#{ticket.id?.slice(0,8)}</span>
          </div>
          <h1 className="text-xl font-bold text-[#1d1d1f]">{ticket.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            {pill(PRIORITY_BADGE[ticket.priority||'medium'], cap(ticket.priority||'medium'))}
            {pill(STATUS_BADGE[ticket.status||'open'] || 'bg-[#f3f4f6] text-[#6b7280]', cap(ticket.status||'open'))}
            <span className="text-[12px] text-[#9ca3af]">
              Created {new Date(ticket.created_at).toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>

        {/* ── Underline tabs ── */}
        <div className="flex gap-0 px-7 border-b border-[#e5e7eb] overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-3 px-1 mr-6 text-[13px] font-medium
                            border-b-2 transition-colors whitespace-nowrap
                            ${activeTab === tab.id
                              ? 'border-[#d4a017] text-[#1d1d1f]'
                              : 'border-transparent text-[#9ca3af] hover:text-[#6b7280]'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mx-7 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* ── Tab content ── */}
        <div className="px-7 py-6">

          {/* Details tab — two column: fields left, sidebar right */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: form fields */}
              <div className="lg:col-span-2">
                <SectionHead>Ticket information</SectionHead>

                <div className="space-y-4">
                  {/* ── Priority / Status / Sector first — most important fields ── */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-[#fafafa] rounded-xl border border-[#e5e7eb]">
                    <div>
                      <Label className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5 block">
                        Priority
                      </Label>
                      <Select value={form.priority} onValueChange={onChange('priority')}>
                        <SelectTrigger className="border-[#e5e7eb] h-9 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => <SelectItem key={p} value={p}>{cap(p)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5 block">
                        Status
                      </Label>
                      <Select value={form.status} onValueChange={onChange('status')}>
                        <SelectTrigger className="border-[#e5e7eb] h-9 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5 block">
                        Sector
                      </Label>
                      <Select value={form.sector || 'none'} onValueChange={v => onChange('sector')(v === 'none' ? '' : v)}>
                        <SelectTrigger className="border-[#e5e7eb] h-9 text-[13px]"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ── Title ── */}
                  <div>
                    <Label className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5 block">
                      Title
                    </Label>
                    <Input
                      value={form.title}
                      onChange={onChange('title')}
                      className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
                    />
                  </div>

                  {/* ── Description ── */}
                  <div>
                    <Label className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5 block">
                      Description
                    </Label>
                    <Textarea
                      value={form.description}
                      onChange={onChange('description')}
                      rows={6}
                      className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
                    />
                  </div>
                </div>

                {/* Customer info if present */}
                {(ticket?.sender_email || ticket?.contact_id) && (
                  <div className="mt-6 pt-6 border-t border-[#f3f4f6]">
                    <SectionHead>Customer information</SectionHead>
                    {ticket.sender_name  && <FieldRow label="Name">{ticket.sender_name}</FieldRow>}
                    {ticket.sender_email && <FieldRow label="Email">{ticket.sender_email}</FieldRow>}
                  </div>
                )}
              </div>

              {/* Right: assignment + metadata + save */}
              <div className="space-y-6">
                <div className="bg-[#fafafa] rounded-xl border border-[#e5e7eb] p-4">
                  <SectionHead>Assignment</SectionHead>
                  <Select value={form.assignee_id || 'unassigned'} onValueChange={v => onChange('assignee_id')(v === 'unassigned' ? '' : v)}>
                    <SelectTrigger className="border-[#e5e7eb]"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {assignedUser && (
                    <div className="mt-3 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center
                                      text-[11px] font-semibold text-white flex-shrink-0">
                        {assignedUser.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-[#1d1d1f]">{assignedUser.name}</div>
                        <div className="text-[11px] text-[#9ca3af]">{assignedUser.email}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#fafafa] rounded-xl border border-[#e5e7eb] p-4">
                  <SectionHead>Metadata</SectionHead>
                  <FieldRow label="Ticket ID">
                    <span className="font-mono text-[11px] text-[#9ca3af]">{ticket.id}</span>
                  </FieldRow>
                  <FieldRow label="Created">
                    {new Date(ticket.created_at).toLocaleString('en-GB')}
                  </FieldRow>
                  <FieldRow label="Updated">
                    {new Date(ticket.updated_at).toLocaleString('en-GB')}
                  </FieldRow>
                </div>

                <button
                  onClick={onSave}
                  disabled={saving || !form.title}
                  className="w-full bg-[#d4a017] text-[#111] font-semibold text-[13px] py-2.5 rounded-lg
                             hover:bg-[#c4920f] transition-all hover:-translate-y-px active:translate-y-0
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save changes</>}
                </button>
              </div>
            </div>
          )}

          {/* Scheduling tab */}
          {activeTab === 'scheduling' && (
            <div className="max-w-lg">
              <SectionHead>Schedule information</SectionHead>
              <div className="space-y-4">
                <div>
                  <Label className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5 block">
                    Scheduled date
                  </Label>
                  <Input
                    type="date"
                    value={form.scheduled_date}
                    onChange={onChange('scheduled_date')}
                    className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5 block">
                    Duration (minutes)
                  </Label>
                  <Input
                    type="number"
                    value={form.scheduled_duration_mins}
                    onChange={onChange('scheduled_duration_mins')}
                    placeholder="e.g. 60"
                    className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
                  />
                </div>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="bg-[#d4a017] text-[#111] font-semibold text-[13px] px-6 py-2.5 rounded-lg
                             hover:bg-[#c4920f] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save</>}
                </button>
              </div>
            </div>
          )}

          {/* Safety tab */}
          {activeTab === 'safety' && (
            <SafetyTab
              ticket={ticket}
              onUpdate={(data) => setForm(p => ({ ...p, ...data }))}
            />
          )}

          {/* Quotes tab */}
          {activeTab === 'quotes' && <QuotesTab ticketId={ticketId} />}

          {/* Comments tab */}
          {activeTab === 'comments' && (
            <div className="py-12 text-center text-[#9ca3af]">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[#e5e7eb]" />
              <p className="text-[13px]">Comments feature coming soon</p>
            </div>
          )}

          {/* Attachments tab */}
          {activeTab === 'attachments' && (
            <div className="py-12 text-center text-[#9ca3af]">
              <Paperclip className="w-10 h-10 mx-auto mb-3 text-[#e5e7eb]" />
              <p className="text-[13px]">Attachments feature coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
