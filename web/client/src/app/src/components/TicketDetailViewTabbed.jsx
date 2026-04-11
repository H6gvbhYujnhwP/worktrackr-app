// web/client/src/app/src/components/TicketDetailViewTabbed.jsx
// Option A redesign:
//   1. Customer / contact strip below title bar (AI auto-matching on load)
//   2. Compose area pinned ABOVE the conversation thread
//   3. ✦ Generate quote button in compose area top-right
//   Audio Stage 2 compose panel preserved exactly.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, Save, Loader2, MessageSquare, DollarSign, Sparkles,
  Paperclip, Shield, Edit3, Send, Lock, Mic, Upload, FileText,
  ChevronDown, ChevronUp, CheckCircle2, X, Building2, User, Phone,
  Mail, Link2, Search, Tag, AlertTriangle,
} from 'lucide-react';
import { useSimulation, useAuth } from '../App.jsx';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select.jsx';
import SafetyTab  from './SafetyTabComprehensive.jsx';
import QuotesTab  from './QuotesTab.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES   = [
  'new', 'open', 'pending', 'awaiting_info', 'in_progress', 'awaiting_quote',
  'quote_sent', 'quote_accepted', 'quote_declined', 'quote_expired',
  'scheduled', 'resolved', 'closed', 'cancelled', 'invoiced',
];
const SECTORS = [
  'Health & Safety Compliance',
  'Construction/Maintenance Work',
  'Field Service Operations',
  'Regulated Industries',
];

const WORKFLOW_STAGES = [
  { id: 'created',     label: 'Ticket created'      },
  { id: 'assigned',    label: 'Assigned to engineer' },
  { id: 'in_progress', label: 'In progress'          },
  { id: 'approval',    label: 'Manager approval'     },
  { id: 'resolved',    label: 'Resolved & closed'    },
];

function statusToStageIndex(status) {
  if (!status || status === 'new')                                           return 0;
  if (['open', 'pending', 'awaiting_info'].includes(status))                return 1;
  if (['in_progress', 'awaiting_quote', 'scheduled',
       'quote_sent', 'quote_accepted', 'quote_declined',
       'quote_expired'].includes(status))                                    return 2;
  if (status === 'awaiting_approval')                                        return 3;
  if (['resolved', 'closed', 'invoiced', 'cancelled'].includes(status))     return 4;
  return 2;
}

const PRIORITY_BADGE = {
  urgent: 'bg-[#fee2e2] text-[#991b1b]',
  high:   'bg-[#fef3c7] text-[#d97706]',
  medium: 'bg-[#dbeafe] text-[#2563eb]',
  low:    'bg-[#dcfce7] text-[#16a34a]',
};
const STATUS_BADGE = {
  open:           'bg-[#dcfce7] text-[#166534]',
  in_progress:    'bg-[#dbeafe] text-[#1e40af]',
  pending:        'bg-[#fef3c7] text-[#92400e]',
  resolved:       'bg-[#dbeafe] text-[#1e40af]',
  closed:         'bg-[#f3f4f6] text-[#6b7280]',
  new:            'bg-[#dbeafe] text-[#1e40af]',
  scheduled:      'bg-[#ede9fe] text-[#6d28d9]',
  invoiced:       'bg-[#d1fae5] text-[#065f46]',
  cancelled:      'bg-[#fee2e2] text-[#991b1b]',
  quote_sent:     'bg-[#fef3c7] text-[#92400e]',
  quote_accepted: 'bg-[#dcfce7] text-[#166534]',
  quote_declined: 'bg-[#fee2e2] text-[#991b1b]',
};

const cap  = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const pill = (cls, text) => (
  <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{text}</span>
);

// ─── Contact picker modal — module-level ─────────────────────────────────────
function ContactPickerModal({ onSelect, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/contacts', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setContacts(d.contacts || d || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.primaryContact || c.primary_contact || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col border border-[#e5e7eb]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <span className="text-[14px] font-semibold text-[#1d1d1f]">Link customer / contact</span>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#6b7280]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-[#e5e7eb]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email…"
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#e5e7eb] rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40 focus:border-[#d4a017]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#d4a017]" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-[13px] text-[#9ca3af] py-8">No contacts found</p>
          )}
          {!loading && filtered.map(c => {
            const isSel  = selected?.id === c.id;
            const person = c.primaryContact || c.primary_contact || '';
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[#f3f4f6] last:border-b-0 transition-colors
                  ${isSel ? 'bg-[#fef9ee]' : 'hover:bg-[#fafafa]'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 mt-0.5
                  ${isSel ? 'bg-[#d4a017]' : 'bg-indigo-400'}`}>
                  {(c.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${isSel ? 'text-[#92400e]' : 'text-[#1d1d1f]'}`}>
                    {c.name}
                    {isSel && <CheckCircle2 className="inline w-3.5 h-3.5 ml-1.5 text-[#d4a017]" />}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {person && <span className="text-[11px] text-[#6b7280]">{person}</span>}
                    {c.email && <span className="text-[11px] text-[#9ca3af]">{c.email}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-[#e5e7eb] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] text-[#6b7280] hover:text-[#374151] border border-[#e5e7eb] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!selected}
            onClick={() => selected && onSelect(selected)}
            className="px-4 py-1.5 text-[13px] bg-[#d4a017] text-white font-medium rounded-md
                       hover:bg-[#c4920f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Link contact
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer strip — module-level ───────────────────────────────────────────
function CustomerStrip({ linkedContact, matchState, mentionedName, aiMatched, onUnlink, onDismissHint, onPickerOpen }) {
  if (matchState === 'loading') {
    return (
      <div className="flex items-center gap-2 px-6 py-2 bg-[#fafafa] border-b border-[#e5e7eb]">
        <Loader2 className="w-3 h-3 animate-spin text-[#9ca3af]" />
        <span className="text-[11px] text-[#9ca3af] italic">Searching for matching customer…</span>
      </div>
    );
  }

  if (matchState === 'hint' && mentionedName && !linkedContact) {
    return (
      <div className="flex items-center gap-3 px-6 py-2 bg-[#fffbeb] border-b border-[#fcd34d]">
        <Building2 className="w-3.5 h-3.5 text-[#d97706] flex-shrink-0" />
        <span className="text-[12px] text-[#92400e] flex-1">
          <span className="font-semibold">{mentionedName}</span> mentioned — not in your database.
        </span>
        <button
          onClick={onPickerOpen}
          className="text-[11px] font-medium text-white bg-[#d4a017] px-2.5 py-1 rounded hover:bg-[#c4920f] transition-colors flex-shrink-0"
        >
          Add customer
        </button>
        <button onClick={onDismissHint} className="text-[#b45309] hover:text-[#92400e] flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (linkedContact) {
    const person  = linkedContact.primaryContact || linkedContact.primary_contact || linkedContact.contact_person || '';
    const phone   = linkedContact.phone   || linkedContact.contact_phone || '';
    const email   = linkedContact.email   || linkedContact.contact_email || '';
    const bizName = linkedContact.name    || linkedContact.contact_name  || '';

    return (
      <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-[#e5e7eb] flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-[#9ca3af] flex-shrink-0" />
          <span className="text-[13px] font-semibold text-[#1d1d1f] truncate">{bizName}</span>
          {aiMatched && (
            <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ml-1">
              ✦ AI matched
            </span>
          )}
        </div>
        {person && (
          <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
            <User className="w-3 h-3 text-[#9ca3af]" />
            <span>{person}</span>
          </div>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#374151] transition-colors">
            <Phone className="w-3 h-3 text-[#9ca3af]" />
            <span>{phone}</span>
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#374151] transition-colors">
            <Mail className="w-3 h-3 text-[#9ca3af]" />
            <span className="truncate max-w-[180px]">{email}</span>
          </a>
        )}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onPickerOpen}
            className="text-[11px] text-[#9ca3af] hover:text-[#6b7280] border border-[#e5e7eb] rounded px-2 py-0.5 transition-colors flex items-center gap-1"
          >
            <Link2 className="w-3 h-3" /> Change
          </button>
          <button onClick={onUnlink} className="text-[#9ca3af] hover:text-[#dc2626] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-6 py-2 bg-white border-b border-[#e5e7eb]">
      <button
        onClick={onPickerOpen}
        className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-[#6b7280] border border-dashed border-[#d1d5db] rounded px-2.5 py-1 transition-colors"
      >
        <Link2 className="w-3 h-3" /> Link customer / contact
      </button>
    </div>
  );
}

// ─── Thread entry — module-level ─────────────────────────────────────────────
function ThreadEntry({ comment, isCurrentUser }) {
  const initials = (comment.author_name || '?').slice(0, 1).toUpperCase();
  const avatarBg = isCurrentUser ? 'bg-[#d4a017]' : 'bg-indigo-500';
  const type     = comment.comment_type || 'update';

  if (type === 'system') {
    return (
      <div className="flex items-center gap-3 py-0.5">
        <div className="w-5 h-5 rounded-full bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#9ca3af]" />
        </div>
        <span className="text-[12px] text-[#9ca3af] italic flex-1">{comment.body}</span>
        <span className="text-[11px] text-[#d1d5db] flex-shrink-0">
          {new Date(comment.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }

  if (type === 'approval_request') {
    return (
      <div className="flex gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 mt-0.5 ${avatarBg}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-semibold text-[#d97706]">{comment.author_name}</span>
            <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded font-medium">Approval request</span>
            <span className="text-[11px] text-[#9ca3af]">
              {new Date(comment.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="bg-[#fefce8] border border-[#fcd34d] rounded-lg p-3">
            <p className="text-[13px] text-[#78350f] leading-relaxed">{comment.body}</p>
            <div className="flex gap-2 mt-3">
              <button className="bg-[#16a34a] text-white text-[12px] font-medium px-3 py-1.5 rounded-md hover:bg-[#15803d] transition-colors">
                ✓ Approve
              </button>
              <button className="border border-[#dc2626] text-[#dc2626] bg-transparent text-[12px] font-medium px-3 py-1.5 rounded-md hover:bg-[#fef2f2] transition-colors">
                ✗ Request changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'audio_note') {
    return <AudioNoteEntry comment={comment} avatarBg={avatarBg} initials={initials} />;
  }

  const isInternal = type === 'internal';
  return (
    <div className="flex gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 mt-0.5 ${avatarBg}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-[12px] font-semibold text-[#1d1d1f]">{comment.author_name}</span>
          {isInternal && (
            <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <Lock size={9} /> Internal
            </span>
          )}
          <span className="text-[11px] text-[#9ca3af]">
            {new Date(comment.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={`rounded-lg p-3 text-[13px] leading-relaxed text-[#374151] border ${
          isInternal ? 'bg-[#fffbeb] border-[#fde68a]' : 'bg-white border-[#e5e7eb]'
        }`}>
          {comment.body}
        </div>
      </div>
    </div>
  );
}

// ─── Audio note renderer — module-level ──────────────────────────────────────
function AudioNoteEntry({ comment, avatarBg, initials }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const body = comment.body || '';
  const sections = [];
  let transcript = '';
  const lines = body.split('\n');
  let currentSection = null;
  let title = '';

  lines.forEach(line => {
    if (line.startsWith('🎙️')) { title = line; return; }
    if (line.startsWith('**') && line.endsWith('**')) {
      const heading = line.replace(/\*\*/g, '');
      currentSection = { heading, items: [] };
      sections.push(currentSection);
      return;
    }
    if (line.startsWith('• ') && currentSection) { currentSection.items.push(line.slice(2)); return; }
    if (line === '---') { currentSection = null; return; }
    if (currentSection === null && line.trim() && !line.startsWith('🎙️')) {
      transcript += line + '\n';
    } else if (currentSection && !line.startsWith('•') && !line.startsWith('**') && line.trim()) {
      if (currentSection.items.length === 0) currentSection.summary = line;
    }
  });

  const sectionBadgeColor = { 'Action Items': 'text-[#dc2626]', 'Follow-ups': 'text-[#d97706]', 'Decisions': 'text-[#7c3aed]' };

  return (
    <div className="flex gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 mt-0.5 ${avatarBg}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-[12px] font-semibold text-[#1d1d1f]">{comment.author_name}</span>
          <span className="text-[10px] bg-[#ede9fe] text-[#6d28d9] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
            <Mic size={9} /> Meeting note
          </span>
          <span className="text-[11px] text-[#9ca3af]">
            {new Date(comment.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="rounded-lg border border-[#ddd6fe] bg-[#faf5ff] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#ddd6fe] bg-[#ede9fe]/40">
            <Mic className="w-3.5 h-3.5 text-[#7c3aed]" />
            <span className="text-[12px] font-semibold text-[#6d28d9]">{title || '🎙️ Meeting Note'}</span>
          </div>
          <div className="px-3 py-3 space-y-3">
            {sections.map((sec, i) => (
              <div key={i}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${sectionBadgeColor[sec.heading] || 'text-[#6b7280]'}`}>
                  {sec.heading}
                </div>
                {sec.summary && <p className="text-[12px] text-[#374151] leading-relaxed">{sec.summary}</p>}
                {sec.items.length > 0 && (
                  <ul className="space-y-0.5">
                    {sec.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-[12px] text-[#374151]">
                        <span className="text-[#9ca3af] flex-shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] text-[#9ca3af] hover:text-[#6b7280] border-t border-[#ddd6fe] transition-colors bg-white/50"
          >
            <FileText className="w-3 h-3" />
            {showTranscript ? 'Hide transcript' : 'Show full transcript'}
            {showTranscript ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          {showTranscript && transcript.trim() && (
            <div className="px-3 py-3 border-t border-[#ddd6fe] bg-white/50">
              <p className="text-[11px] text-[#6b7280] leading-relaxed whitespace-pre-wrap">{transcript.trim()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audio compose panel — module-level ──────────────────────────────────────
function AudioComposePanel({ ticketId, onPost, setGlobalError }) {
  const [inputMode,      setInputMode]      = useState('upload');
  const [audioFile,      setAudioFile]      = useState(null);
  const [pasteText,      setPasteText]      = useState('');
  const [audioState,     setAudioState]     = useState('idle');
  const [extraction,     setExtraction]     = useState(null);
  const [transcript,     setTranscript]     = useState('');
  const [formattedBody,  setFormattedBody]  = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [posting,        setPosting]        = useState(false);
  const [localError,     setLocalError]     = useState('');
  const [dragOver,       setDragOver]       = useState(false);
  const fileInputRef = useRef(null);
  const ACCEPTED_TYPES = '.mp3,.m4a,.wav,.webm';

  function handleFile(file) {
    if (!file) return;
    const ok = /\.(mp3|m4a|wav|webm)$/i.test(file.name);
    if (!ok) { setLocalError('Unsupported file type. Use MP3, M4A, WAV, or WEBM.'); return; }
    if (file.size > 25 * 1024 * 1024) { setLocalError('File too large. Maximum is 25 MB.'); return; }
    setAudioFile(file);
    setLocalError('');
  }

  async function handleProcess() {
    setLocalError('');
    setAudioState('processing');
    try {
      const fd = new FormData();
      if (inputMode === 'upload' && audioFile) {
        fd.append('audio', audioFile);
      } else if (inputMode === 'paste' && pasteText.trim()) {
        fd.append('transcript_text', pasteText.trim());
      } else {
        setLocalError('Please upload a file or paste a transcript first.');
        setAudioState('idle');
        return;
      }
      const res  = await fetch('/api/transcribe/ticket-note', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');
      setExtraction(data.extraction);
      setTranscript(data.transcript);
      setFormattedBody(data.formatted_body);
      setAudioState('review');
    } catch (err) {
      setLocalError(err.message || 'Failed to process. Please try again.');
      setAudioState('idle');
    }
  }

  async function handlePost() {
    setPosting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: formattedBody, comment_type: 'audio_note' }),
      });
      if (!res.ok) throw new Error('Failed to post');
      const data = await res.json();
      onPost(data.comment);
      setAudioFile(null); setPasteText(''); setAudioState('idle');
      setExtraction(null); setTranscript(''); setFormattedBody('');
    } catch {
      setGlobalError('Failed to post audio note — please try again.');
    } finally {
      setPosting(false);
    }
  }

  function handleReset() {
    setAudioState('idle'); setExtraction(null);
    setTranscript(''); setFormattedBody(''); setLocalError('');
  }

  if (audioState === 'review' && extraction) {
    const sections = [
      { label: 'Summary',      items: extraction.summary ? [extraction.summary] : [],  color: 'text-[#1d1d1f]', single: true },
      { label: 'Action Items', items: extraction.action_items || [],                   color: 'text-[#dc2626]'  },
      { label: 'Key Details',  items: extraction.key_details  || [],                   color: 'text-[#2563eb]'  },
      { label: 'Decisions',    items: extraction.decisions    || [],                   color: 'text-[#7c3aed]'  },
      { label: 'Follow-ups',   items: extraction.follow_ups   || [],                   color: 'text-[#d97706]'  },
    ].filter(s => s.items.length > 0);

    return (
      <div className="bg-white">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e7eb] bg-[#faf5ff]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7c3aed]" />
            <span className="text-[13px] font-semibold text-[#6d28d9]">Review before posting</span>
          </div>
          <button onClick={handleReset} className="text-[#9ca3af] hover:text-[#6b7280]"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[280px] overflow-y-auto">
          {sections.map((sec, i) => (
            <div key={i}>
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${sec.color}`}>{sec.label}</div>
              {sec.single
                ? <p className="text-[13px] text-[#374151] leading-relaxed">{sec.items[0]}</p>
                : <ul className="space-y-1">{sec.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-[13px] text-[#374151]">
                      <span className="text-[#9ca3af] flex-shrink-0 mt-0.5">•</span><span>{item}</span>
                    </li>
                  ))}</ul>}
            </div>
          ))}
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-[#6b7280] transition-colors"
          >
            <FileText className="w-3 h-3" />
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
            {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showTranscript && (
            <p className="text-[11px] text-[#6b7280] leading-relaxed bg-[#f9fafb] rounded p-3 whitespace-pre-wrap border border-[#e5e7eb]">
              {transcript}
            </p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-[#e5e7eb] flex justify-end gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-[13px] text-[#6b7280] border border-[#e5e7eb] rounded-md hover:bg-[#f9fafb] transition-colors">
            Re-do
          </button>
          <button
            onClick={handlePost}
            disabled={posting}
            className="flex items-center gap-2 bg-[#7c3aed] text-white text-[13px] font-semibold px-4 py-1.5 rounded-md hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post note
          </button>
        </div>
      </div>
    );
  }

  if (audioState === 'processing') {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#7c3aed]" />
        <p className="text-[13px] text-[#6b7280]">
          {inputMode === 'upload' ? 'Transcribing with Whisper, then extracting with Claude…' : 'Extracting notes with Claude…'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="flex border-b border-[#e5e7eb]">
        {[{ id: 'upload', label: 'Upload audio', Icon: Upload }, { id: 'paste', label: 'Paste transcript', Icon: FileText }].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setInputMode(id); setLocalError(''); }}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-medium border-b-2 transition-colors
              ${inputMode === id ? 'border-[#7c3aed] text-[#6d28d9] bg-white' : 'border-transparent text-[#9ca3af] hover:text-[#6b7280] bg-[#fafafa]'}`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>
      <div className="px-5 py-4 space-y-3">
        {localError && <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-[12px]">{localError}</div>}
        {inputMode === 'upload' ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors
              ${dragOver ? 'border-[#7c3aed] bg-[#faf5ff]' : 'border-[#e5e7eb] hover:border-[#c4b5fd] hover:bg-[#faf5ff]'}`}
          >
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} onChange={e => handleFile(e.target.files[0])} className="hidden" />
            {audioFile ? (
              <div className="flex items-center justify-center gap-2">
                <Mic className="w-5 h-5 text-[#7c3aed]" />
                <div className="text-left">
                  <p className="text-[13px] font-medium text-[#6d28d9]">{audioFile.name}</p>
                  <p className="text-[11px] text-[#9ca3af]">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setAudioFile(null); }} className="ml-2 text-[#9ca3af] hover:text-[#6b7280]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-7 h-7 text-[#c4b5fd] mx-auto mb-2" />
                <p className="text-[13px] text-[#6b7280]">Drop audio file here or <span className="text-[#7c3aed] font-medium">browse</span></p>
                <p className="text-[11px] text-[#9ca3af] mt-1">MP3 · M4A · WAV · WEBM · up to 25 MB</p>
              </>
            )}
          </div>
        ) : (
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Paste your meeting transcript here…"
            rows={4}
            className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-[13px] text-[#374151] placeholder-[#9ca3af] resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed]"
          />
        )}
        <div className="flex justify-end">
          <button
            onClick={handleProcess}
            disabled={(inputMode === 'upload' ? !audioFile : !pasteText.trim())}
            className="flex items-center gap-2 bg-[#7c3aed] text-white text-[13px] font-semibold px-5 py-2 rounded-md hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {inputMode === 'upload' ? 'Transcribe & extract' : 'Extract notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confidence dot — module-level ───────────────────────────────────────────
function ConfidenceDot({ confidence }) {
  const map = {
    high:   { color: 'bg-emerald-500', label: 'High confidence' },
    medium: { color: 'bg-amber-400',   label: 'Medium confidence' },
    low:    { color: 'bg-red-400',     label: 'Low confidence' },
  };
  const cfg = map[confidence] || map.medium;
  return (
    <span title={cfg.label} className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.color}`} />
  );
}

// ─── Review item row — module-level ──────────────────────────────────────────
function ReviewItemRow({ item, onRemove }) {
  const typeLabel = { material: 'Material', labour: 'Labour', expense: 'Expense', subcontractor: 'Sub' };
  const typeCls   = {
    material:      'bg-blue-50 text-blue-700',
    labour:        'bg-purple-50 text-purple-700',
    expense:       'bg-orange-50 text-orange-700',
    subcontractor: 'bg-pink-50 text-pink-700',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${item.flagged ? 'border-amber-300 bg-[#fffbeb]' : 'border-[#e5e7eb] bg-white'}`}>
      <div className="flex items-start gap-2">
        <ConfidenceDot confidence={item.confidence} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#1d1d1f] leading-snug">{item.description}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeCls[item.item_type] || 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                  {typeLabel[item.item_type] || item.item_type}
                </span>
                <span className="text-[11px] text-[#9ca3af]">
                  {item.quantity} {item.unit || 'ea'}
                  {item.unit_price > 0 && ` · £${item.unit_price.toFixed(2)}`}
                  {item.buy_cost  > 0 && ` (cost £${item.buy_cost.toFixed(2)})`}
                </span>
                {item.catalogue_sourced && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    <Tag className="w-2.5 h-2.5" /> Catalogue
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#9ca3af] italic mt-1">{item.source}</p>
            </div>
            <button
              onClick={() => onRemove()}
              title="Remove this item"
              className="text-[#9ca3af] hover:text-red-500 hover:bg-red-50 rounded p-1 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {item.flagged && item.flag_reason && (
            <div className="flex items-start gap-1.5 mt-2 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-snug">{item.flag_reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Generate quote panel — module-level ─────────────────────────────────────
function GenerateQuotePanel({ ticketId, ticketTitle, onClose }) {
  const [panelState,    setPanelState]    = useState('loading'); // loading | review | error
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [removed,       setRemoved]       = useState(new Set());
  const [panelError,    setPanelError]    = useState('');

  useEffect(() => {
    callGenerate();
  }, []);

  async function callGenerate() {
    setPanelState('loading');
    setPanelError('');
    try {
      const res  = await fetch('/api/quotes/generate-from-ticket', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setSuggestedItems(data.line_items || []);
      setPanelState('review');
    } catch (err) {
      setPanelError(err.message || 'Could not generate suggestions. Please try again.');
      setPanelState('error');
    }
  }

  function toggleRemove(idx) {
    setRemoved(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      return next;
    });
  }

  function handleConfirm() {
    const approvedItems = suggestedItems
      .filter((_, idx) => !removed.has(idx))
      .map(item => ({
        description:       item.description,
        item_type:         item.item_type,
        quantity:          item.quantity,
        unit:              item.unit,
        unit_price:        item.unit_price,
        buy_price:         item.buy_cost,
        supplier:          item.supplier || '',
        product_id:        item.product_id || null,
        line_notes:        '',
        discount_percent:  0,
        vat_enabled:       false,
        ai_generated:      true,
        catalogue_sourced: item.catalogue_sourced || false,
        locked:            false,
        _showNotes:        false,
      }));

    const prefill = {
      ticket_id:  ticketId,
      title:      ticketTitle ? `Quote — ${ticketTitle}` : '',
      line_items: approvedItems,
      created_via: 'ai',
    };
    try {
      sessionStorage.setItem('worktrackr_ai_quote_prefill', JSON.stringify(prefill));
    } catch {
      // sessionStorage full — still navigate, form will be blank
    }
    window.location.href = `/app/crm/quotes/new?ticket_id=${ticketId}`;
  }

  const activeCount = suggestedItems.length - removed.size;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-[480px] bg-white border-l border-[#e5e7eb] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fef9ee]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#d4a017]" />
            <span className="text-[14px] font-semibold text-[#1d1d1f]">Generate quote</span>
          </div>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#6b7280] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {panelState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
              <Loader2 className="w-8 h-8 animate-spin text-[#d4a017]" />
              <div className="text-center">
                <p className="text-[13px] font-medium text-[#374151]">Reading ticket and generating suggestions…</p>
                <p className="text-[12px] text-[#9ca3af] mt-1">Claude is reviewing the ticket, thread notes, and your product catalogue</p>
              </div>
            </div>
          )}

          {panelState === 'error' && (
            <div className="px-5 py-8 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
              <p className="text-[13px] text-[#374151] font-medium mb-1">Generation failed</p>
              <p className="text-[12px] text-[#9ca3af] mb-5">{panelError}</p>
              <button
                onClick={callGenerate}
                className="px-4 py-2 text-[13px] font-semibold bg-[#d4a017] text-white rounded-lg hover:bg-[#c4920f] transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {panelState === 'review' && (
            <div className="px-5 py-4">
              {/* Confidence legend */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#f3f4f6]">
                <p className="text-[11px] text-[#9ca3af]">Confidence:</p>
                {[['high','bg-emerald-500','High'], ['medium','bg-amber-400','Medium'], ['low','bg-red-400','Low']].map(([k, cls, label]) => (
                  <span key={k} className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
                    <span className={`w-2 h-2 rounded-full ${cls}`} />{label}
                  </span>
                ))}
              </div>

              {suggestedItems.length === 0 && (
                <p className="text-[13px] text-[#9ca3af] text-center py-8">
                  No line items could be extracted from this ticket. Try adding more detail to the thread notes.
                </p>
              )}

              <div className="space-y-3">
                {suggestedItems.map((item, idx) => (
                  <div key={idx} className={removed.has(idx) ? 'opacity-40 line-through' : ''}>
                    <ReviewItemRow
                      item={item}
                      onRemove={() => toggleRemove(idx)}
                    />
                    {removed.has(idx) && (
                      <button
                        onClick={() => toggleRemove(idx)}
                        className="text-[11px] text-[#d4a017] hover:underline mt-1 ml-4"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {suggestedItems.some(i => i.flagged && !removed.has(suggestedItems.indexOf(i))) && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[12px] text-amber-800">
                    <span className="font-semibold">⚠ Some items are flagged</span> — review them before confirming. Flagged items will open in the quote form with notes for you to fill in.
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-[#f0f9ff] border border-blue-100 rounded-lg">
                <p className="text-[11px] text-[#374151]">
                  <span className="font-semibold text-blue-700">All AI-generated items</span> will carry a gold <span className="font-mono bg-[#fef9ee] px-1 rounded">AI</span> badge in the quote form.
                  Items matched from your <span className="font-mono bg-blue-50 px-1 rounded">Catalogue</span> carry a second badge. Editing any field permanently removes both badges.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {panelState === 'review' && (
          <div className="px-5 py-4 border-t border-[#e5e7eb] bg-[#fafafa] flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#9ca3af]">
              {activeCount} item{activeCount !== 1 ? 's' : ''} selected
              {removed.size > 0 && <span className="ml-1">({removed.size} removed)</span>}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-[13px] text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={activeCount === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold bg-[#d4a017] text-white rounded-lg hover:bg-[#c4920f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Confirm &amp; open quote
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Date divider — module-level ─────────────────────────────────────────────
function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-[#f3f4f6]" />
      <span className="text-[11px] text-[#9ca3af] flex-shrink-0">{label}</span>
      <div className="flex-1 h-px bg-[#f3f4f6]" />
    </div>
  );
}

// ─── Compose tabs config ─────────────────────────────────────────────────────
const COMPOSE_TABS = [
  { id: 'update',           label: 'Update',           placeholder: 'Add an update visible to the whole team…'           },
  { id: 'internal',         label: 'Internal note',    placeholder: 'Add an internal note — not shown outside the team…' },
  { id: 'approval_request', label: 'Request approval', placeholder: 'Describe what approval is needed and why…'          },
  { id: 'audio',            label: 'Audio',            placeholder: null                                                  },
];

function groupByDate(comments) {
  const groups = {};
  comments.forEach(c => {
    const label = new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  });
  return Object.entries(groups);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TicketDetailViewTabbed({ ticketId, onBack }) {
  const { tickets, users, updateTicket } = useSimulation();
  const { user: currentUser } = useAuth();

  const [ticket, setTicket]             = useState(null);
  const [saving, setSaving]             = useState(false);
  const [error,  setError]              = useState('');
  const [summary, setSummary]           = useState('');
  const [summarising, setSummarising]   = useState(false);
  const [mainView, setMainView]         = useState('thread');
  const [editingDesc, setEditingDesc]   = useState(false);
  const [descEdited,  setDescEdited]    = useState(false);
  const originalDesc                    = useRef('');
  const [comments, setComments]               = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [composeTab, setComposeTab]           = useState('update');
  const [composeBody, setComposeBody]         = useState('');
  const [posting, setPosting]                 = useState(false);
  const threadEndRef                          = useRef(null);

  // ── Customer strip ─────────────────────────────────────────────────────────
  const [linkedContact,     setLinkedContact]     = useState(null);
  const [matchState,        setMatchState]        = useState('idle'); // 'idle'|'loading'|'matched'|'hint'|'none'
  const [mentionedName,     setMentionedName]     = useState('');
  const [aiMatched,         setAiMatched]         = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showQuotePanel,    setShowQuotePanel]    = useState(false);
  const aiMatchTriggered                          = useRef(false);

  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', status: 'open',
    sector: '', assignee_id: '', scheduled_date: '', scheduled_duration_mins: '',
    method_statement: null, risk_assessment: null,
  });

  // Load ticket from simulation store
  useEffect(() => {
    const t = tickets.find(t => String(t.id) === String(ticketId));
    if (t) {
      setTicket(t);
      originalDesc.current = t.description || '';
      setDescEdited(false);
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

  // Load comments + hydrate linked contact from API
  useEffect(() => {
    if (!ticketId) return;
    setCommentsLoading(true);
    fetch(`/api/tickets/${ticketId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setComments(data.comments || []);
        const t = data.ticket;
        if (t?.contact_id && t?.contact_name) {
          setLinkedContact({
            id:              t.contact_id,
            name:            t.contact_name,
            email:           t.contact_email || '',
            phone:           t.contact_phone || '',
            primary_contact: t.contact_person || '',
          });
          setMatchState('matched');
          setAiMatched(false);
        }
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [ticketId]);

  // Trigger AI contact matching once when ticket loads and has no linked contact
  useEffect(() => {
    if (!ticket || aiMatchTriggered.current) return;
    if (linkedContact || matchState === 'matched') return;
    aiMatchTriggered.current = true;
    setMatchState('loading');
    fetch(`/api/tickets/${ticketId}/match-contact`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(r => r.json())
      .then(result => {
        if (result.confidence === 'high' && result.matched_contact_id && result.contact_data) {
          setLinkedContact({
            id:              result.contact_data.id,
            name:            result.contact_data.name,
            email:           result.contact_data.email || '',
            phone:           result.contact_data.phone || '',
            primary_contact: result.contact_data.primary_contact || '',
          });
          setAiMatched(true);
          setMatchState('matched');
          // Persist silently
          fetch(`/api/tickets/${ticketId}`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact_id: result.matched_contact_id }),
          }).catch(() => {});
        } else if (result.confidence === 'low' && result.mentioned_name) {
          setMentionedName(result.mentioned_name);
          setMatchState('hint');
        } else {
          setMatchState('none');
        }
      })
      .catch(() => setMatchState('none'));
  }, [ticket, ticketId, linkedContact, matchState]);

  // Expose current ticket ID to VoiceAssistant
  useEffect(() => {
    if (ticketId) window.__worktrackr_current_ticket = ticketId;
    return () => { window.__worktrackr_current_ticket = null; };
  }, [ticketId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const onChange = (field) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm(p => ({ ...p, [field]: v }));
    if (field === 'description') setDescEdited(v !== originalDesc.current);
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
        scheduled_duration_mins: form.scheduled_duration_mins === ''
          ? null : Number(form.scheduled_duration_mins),
        method_statement:        form.method_statement,
        risk_assessment:         form.risk_assessment,
      });
      originalDesc.current = form.description;
      setDescEdited(false);
      setEditingDesc(false);
    } catch (e) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSummarise = async () => {
    setSummarising(true); setSummary('');
    try {
      const res  = await fetch(`/api/summaries/ticket/${ticketId}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarise');
      setSummary(data.summary);
    } catch {
      setSummary('Could not generate summary. Please try again.');
    } finally {
      setSummarising(false);
    }
  };

  const postComment = async () => {
    if (!composeBody.trim()) return;
    setPosting(true); setError('');
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: composeBody.trim(), comment_type: composeTab }),
      });
      if (!res.ok) throw new Error('Failed to post');
      const data = await res.json();
      setComments(prev => [...prev, data.comment]);
      setComposeBody('');
    } catch {
      setError('Failed to post — please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleAudioPost = (comment) => setComments(prev => [...prev, comment]);

  const handleContactSelect = useCallback((contact) => {
    setLinkedContact({
      id:              contact.id,
      name:            contact.name,
      email:           contact.email || '',
      phone:           contact.phone || '',
      primary_contact: contact.primaryContact || contact.primary_contact || '',
    });
    setAiMatched(false);
    setMatchState('matched');
    setShowContactPicker(false);
    fetch(`/api/tickets/${ticketId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contact.id }),
    }).catch(() => {});
  }, [ticketId]);

  const handleContactUnlink = useCallback(() => {
    setLinkedContact(null); setAiMatched(false); setMatchState('none');
    fetch(`/api/tickets/${ticketId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: null }),
    }).catch(() => {});
  }, [ticketId]);

  const handleDismissHint = useCallback(() => { setMatchState('none'); setMentionedName(''); }, []);
  const handleGenerateQuote = () => setShowQuotePanel(true);

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#d4a017]" />
      </div>
    );
  }

  const assignedUser      = users?.find(u => u.id === (form.assignee_id || ticket.assignee_id || ticket.assignedTo));
  const stageIndex        = statusToStageIndex(form.status);
  const dateGroups        = groupByDate(comments);
  const currentComposeTab = COMPOSE_TABS.find(t => t.id === composeTab);
  const isAudioTab        = composeTab === 'audio';

  return (
    <div className="w-full bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">

      {showContactPicker && (
        <ContactPickerModal
          onSelect={handleContactSelect}
          onClose={() => setShowContactPicker(false)}
        />
      )}

      {showQuotePanel && (
        <GenerateQuotePanel
          ticketId={ticketId}
          ticketTitle={ticket?.title}
          onClose={() => setShowQuotePanel(false)}
        />
      )}

      {/* ── Title bar ── */}
      <div className="px-6 py-4 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-[#9ca3af] hover:text-[#6b7280] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tickets
          </button>
          <span className="text-[#d1d5db]">/</span>
          <span className="text-[11px] text-[#9ca3af] font-mono">#{ticket.id?.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[#1d1d1f]">{ticket.title}</h1>
          {pill(PRIORITY_BADGE[ticket.priority || 'medium'], cap(ticket.priority || 'medium'))}
          {pill(STATUS_BADGE[ticket.status || 'open'] || 'bg-[#f3f4f6] text-[#6b7280]', cap(ticket.status || 'open'))}
          <span className="text-[12px] text-[#9ca3af] ml-auto">
            Created {new Date(ticket.created_at).toLocaleDateString('en-GB')}
          </span>
        </div>
      </div>

      {/* ── Customer / contact strip ── */}
      <CustomerStrip
        linkedContact={linkedContact}
        matchState={matchState}
        mentionedName={mentionedName}
        aiMatched={aiMatched}
        onUnlink={handleContactUnlink}
        onDismissHint={handleDismissHint}
        onPickerOpen={() => setShowContactPicker(true)}
      />

      {error && (
        <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-[13px]">
          {error}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex" style={{ minHeight: '640px' }}>

        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#e5e7eb]">

          {/* Job description — always pinned */}
          <div className="bg-[#fffbeb] border-b-2 border-[#fcd34d] px-6 py-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-[#92400e] uppercase tracking-wider">Job description</span>
                  {descEdited && (
                    <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded font-medium">edited</span>
                  )}
                </div>
                {editingDesc ? (
                  <textarea
                    value={form.description}
                    onChange={onChange('description')}
                    rows={3}
                    autoFocus
                    className="w-full text-[13px] text-[#78350f] leading-relaxed bg-white border border-[#fcd34d] rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
                  />
                ) : (
                  <p className="text-[13px] text-[#78350f] leading-relaxed">
                    {form.description
                      ? form.description
                      : <span className="italic text-[#b45309]">No description — click the pencil to add one</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingDesc(v => !v)}
                title={editingDesc ? 'Done editing' : 'Edit job description'}
                className="text-[#b45309] hover:text-[#92400e] flex-shrink-0 mt-0.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Compose area — pinned ABOVE thread ── */}
          {mainView === 'thread' && (
            <div className="border-b-2 border-[#e5e7eb] bg-white">
              {/* Tab row + Generate quote button */}
              <div className="flex items-stretch border-b border-[#e5e7eb]">
                <div className="flex flex-1">
                  {COMPOSE_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setComposeTab(tab.id)}
                      className={`flex items-center gap-1.5 flex-1 py-2 text-[12px] font-medium border-r last:border-r-0 border-[#e5e7eb] transition-colors
                        ${composeTab === tab.id
                          ? `bg-white text-[#1d1d1f] border-b-2 ${tab.id === 'audio' ? 'border-b-[#7c3aed]' : 'border-b-[#d4a017]'}`
                          : 'bg-[#fafafa] text-[#9ca3af] hover:text-[#6b7280] border-b-0'}`}
                    >
                      <span className="mx-auto flex items-center gap-1">
                        {tab.id === 'audio' && <Mic className="w-3 h-3" />}
                        {tab.label}
                      </span>
                    </button>
                  ))}
                </div>
                {/* ✦ Generate quote */}
                <button
                  onClick={handleGenerateQuote}
                  className="flex items-center gap-1.5 px-4 text-[12px] font-semibold text-[#b8860b]
                             bg-[#fef9ee] border-l border-[#e5e7eb] hover:bg-[#fef3c7] transition-colors flex-shrink-0 whitespace-nowrap"
                  title="Generate a quote from this ticket"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ✦ Generate quote
                </button>
              </div>

              {/* Compose body */}
              {isAudioTab ? (
                <AudioComposePanel
                  ticketId={ticketId}
                  onPost={handleAudioPost}
                  setGlobalError={setError}
                />
              ) : (
                <div className={`${
                  composeTab === 'internal'         ? 'bg-[#fffbeb]' :
                  composeTab === 'approval_request' ? 'bg-[#fefce8]' : 'bg-white'
                }`}>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    placeholder={currentComposeTab?.placeholder}
                    rows={3}
                    className="w-full px-4 pt-3 pb-1 text-[13px] bg-transparent resize-none focus:outline-none text-[#374151] placeholder-[#9ca3af]"
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) postComment(); }}
                  />
                  <div className="flex items-center justify-between px-4 pb-3">
                    <button className="flex items-center gap-1.5 text-[12px] text-[#9ca3af] hover:text-[#6b7280] border border-[#e5e7eb] rounded-md px-3 py-1.5 transition-colors bg-white">
                      <Paperclip className="w-3.5 h-3.5" /> Attach
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#9ca3af]">Ctrl+Enter to post</span>
                      <button
                        onClick={postComment}
                        disabled={posting || !composeBody.trim()}
                        className="flex items-center gap-2 bg-[#d4a017] text-white text-[13px] font-semibold px-4 py-1.5 rounded-md
                                   hover:bg-[#c4920f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        {composeTab === 'approval_request' ? 'Send request' : 'Post update'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View toggle: Conversation / Quotes / Safety */}
          <div className="flex border-b border-[#e5e7eb] bg-[#fafafa]">
            {[
              { id: 'thread', label: 'Conversation', Icon: MessageSquare },
              { id: 'quotes', label: 'Quotes',        Icon: DollarSign   },
              { id: 'safety', label: 'Safety',        Icon: Shield       },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setMainView(id)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors
                  ${mainView === id
                    ? 'border-[#d4a017] text-[#1d1d1f] bg-white'
                    : 'border-transparent text-[#9ca3af] hover:text-[#6b7280]'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Thread — now BELOW compose */}
          {mainView === 'thread' && (
            <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: '420px' }}>
              {commentsLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[#d4a017]" />
                </div>
              )}
              {!commentsLoading && comments.length === 0 && (
                <div className="text-center py-14 text-[#9ca3af]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#e5e7eb]" />
                  <p className="text-[13px]">No updates yet — post the first one above</p>
                </div>
              )}
              {!commentsLoading && dateGroups.map(([dateLabel, dayComments]) => (
                <div key={dateLabel} className="space-y-4">
                  <DateDivider label={dateLabel} />
                  {dayComments.map(c => (
                    <ThreadEntry key={c.id} comment={c} isCurrentUser={currentUser?.id === c.author_id} />
                  ))}
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>
          )}

          {mainView === 'quotes' && (
            <div className="flex-1 px-6 py-5">
              <QuotesTab ticketId={ticketId} />
            </div>
          )}

          {mainView === 'safety' && (
            <div className="flex-1 px-6 py-5">
              <SafetyTab
                ticket={ticket}
                onUpdate={(data) => setForm(p => ({ ...p, ...data }))}
              />
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-72 flex-shrink-0 bg-[#fafafa] overflow-y-auto flex flex-col divide-y divide-[#e5e7eb]">

          {/* Workflow */}
          <div className="px-5 py-4">
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Workflow</div>
            <div className="space-y-2.5">
              {WORKFLOW_STAGES.map((stage, i) => {
                const done   = i < stageIndex;
                const active = i === stageIndex;
                return (
                  <div key={stage.id} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0
                      ${done ? 'bg-[#16a34a] text-white' : active ? 'bg-[#d4a017] text-white' : 'border border-[#d1d5db] text-[#9ca3af]'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[12px] ${done || active ? 'font-medium text-[#1d1d1f]' : 'text-[#9ca3af]'}`}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="px-5 py-4 space-y-3">
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Details</div>
            <div>
              <div className="text-[11px] text-[#9ca3af] mb-1">Priority</div>
              <Select value={form.priority} onValueChange={onChange('priority')}>
                <SelectTrigger className="border-[#e5e7eb] h-8 text-[12px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{cap(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[11px] text-[#9ca3af] mb-1">Status</div>
              <Select value={form.status} onValueChange={onChange('status')}>
                <SelectTrigger className="border-[#e5e7eb] h-8 text-[12px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[11px] text-[#9ca3af] mb-1">Sector</div>
              <Select value={form.sector || 'none'} onValueChange={v => onChange('sector')(v === 'none' ? '' : v)}>
                <SelectTrigger className="border-[#e5e7eb] h-8 text-[12px] bg-white"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[11px] text-[#9ca3af] mb-1">Scheduled date</div>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={onChange('scheduled_date')}
                className="w-full border border-[#e5e7eb] rounded-md h-8 px-2 text-[12px] text-[#374151] bg-white focus:outline-none focus:ring-1 focus:ring-[#d4a017]"
              />
            </div>
            <div>
              <div className="text-[11px] text-[#9ca3af] mb-1">Duration (mins)</div>
              <input
                type="number"
                value={form.scheduled_duration_mins}
                onChange={onChange('scheduled_duration_mins')}
                placeholder="e.g. 60"
                className="w-full border border-[#e5e7eb] rounded-md h-8 px-2 text-[12px] text-[#374151] bg-white focus:outline-none focus:ring-1 focus:ring-[#d4a017]"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="px-5 py-4">
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Assigned to</div>
            <Select
              value={form.assignee_id || 'unassigned'}
              onValueChange={v => onChange('assignee_id')(v === 'unassigned' ? '' : v)}
            >
              <SelectTrigger className="border-[#e5e7eb] h-8 text-[12px] bg-white"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {assignedUser && (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
                  {assignedUser.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[12px] font-medium text-[#1d1d1f]">{assignedUser.name}</div>
                  <div className="text-[11px] text-[#9ca3af]">{assignedUser.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="px-5 py-4 space-y-1.5">
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Metadata</div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#9ca3af]">Ticket ID</span>
              <span className="font-mono text-[10px] text-[#9ca3af]">{ticket.id?.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#9ca3af]">Created</span>
              <span className="text-[#374151]">{new Date(ticket.created_at).toLocaleDateString('en-GB')}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#9ca3af]">Updated</span>
              <span className="text-[#374151]">{new Date(ticket.updated_at).toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 space-y-2">
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Actions</div>
            <button
              onClick={onSave}
              disabled={saving || !form.title}
              className="w-full bg-[#d4a017] text-white font-semibold text-[13px] py-2 rounded-lg
                         hover:bg-[#c4920f] disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 transition-colors"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save changes</>}
            </button>
            <button
              onClick={handleSummarise}
              disabled={summarising}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium
                         rounded-lg border border-[#d4a017] text-[#b8860b] hover:bg-[#fef9ee]
                         transition-colors disabled:opacity-50"
            >
              {summarising
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Summarising…</>
                : <><Sparkles className="w-3.5 h-3.5" /> Summarise ticket</>}
            </button>
            {summary && (
              <div className="bg-[#fef9ee] border border-[#d4a017]/30 rounded-lg p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b8860b] mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Summary
                </p>
                <p className="text-[12px] text-[#374151] leading-relaxed">{summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
