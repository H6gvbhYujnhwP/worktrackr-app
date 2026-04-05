// web/client/src/app/src/components/VoiceAssistant.jsx
//
// Audio Stage 3 — Voice Dictation Assistant (Mode 2)
//
// Floating mic FAB that appears globally across the app.
// User taps to start recording (up to 60s), taps again to stop.
// Claude receives transcript + app context, determines intent, routes to the
// correct destination. Mandatory review step. Browser TTS speaks confirmation.
//
// Sub-component rule: ALL helper components are defined at module level.
// Props (from AppLayout): currentView (string), user (object)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, X, Check, RefreshCw, Loader2,
  FileText, Ticket, Calendar, Bell, Users, Briefcase,
} from 'lucide-react';

// ─── Web Speech API availability ─────────────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

// ─── Max recording time (ms) ─────────────────────────────────────────────────
const MAX_RECORD_MS = 60_000;

// ─── Intent metadata ──────────────────────────────────────────────────────────
const INTENT_META = {
  ticket_note:       { label: 'Note on ticket',     colour: 'indigo',  Icon: Ticket    },
  new_ticket:        { label: 'New ticket',          colour: 'red',     Icon: Ticket    },
  personal_note:     { label: 'Personal note',       colour: 'amber',   Icon: FileText  },
  personal_reminder: { label: 'Reminder',            colour: 'orange',  Icon: Bell      },
  company_note:      { label: 'Company note',        colour: 'teal',    Icon: Users     },
  crm_calendar:      { label: 'CRM calendar event',  colour: 'purple',  Icon: Calendar  },
  ticket_calendar:   { label: 'Ticket calendar',     colour: 'blue',    Icon: Briefcase },
  unknown:           { label: 'Unknown intent',      colour: 'gray',    Icon: FileText  },
};

const COLOUR_CLASSES = {
  indigo: { badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  red:    { badge: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-500'    },
  amber:  { badge: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-500'  },
  orange: { badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  teal:   { badge: 'bg-teal-100 text-teal-700 border-teal-200',       dot: 'bg-teal-500'   },
  purple: { badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  blue:   { badge: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500'   },
  gray:   { badge: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400'   },
};

// ─── speak() — browser TTS helper ─────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang   = 'en-GB';
  utt.rate   = 0.95;
  utt.pitch  = 1;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ─── Label ────────────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
      {children}
    </label>
  );
}

// ─── RecordingPanel ───────────────────────────────────────────────────────────
function RecordingPanel({ elapsed, liveText, onStop, onCancel }) {
  const pct = Math.min((elapsed / 60) * 100, 100);
  const remaining = Math.max(0, 60 - elapsed);

  return (
    <div className="flex flex-col gap-4">
      {/* Timer arc + status */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke="#ef4444" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#374151]">
            {remaining}s
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[13px] font-semibold text-[#111113]">Listening…</span>
          </div>
          <p className="text-[11px] text-[#6b7280] mt-0.5">Speak your command. Tap stop when done.</p>
        </div>
      </div>

      {/* Live transcript preview */}
      <div className="min-h-[52px] rounded-lg border border-[#d4a017]/40 bg-[#fffdf5] px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4a017] mb-1">Hearing</p>
        <p className="text-[13px] text-[#374151] leading-relaxed">
          {liveText || <span className="text-[#9ca3af] italic">Start speaking…</span>}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onStop}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#d4a017] hover:bg-[#c4920f] text-[#111113] text-[13px] font-semibold transition-colors"
        >
          <MicOff size={14} /> Stop recording
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2.5 rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb] text-[13px] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── ProcessingPanel ──────────────────────────────────────────────────────────
function ProcessingPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <Loader2 size={28} className="text-[#d4a017] animate-spin" />
      <p className="text-[13px] font-medium text-[#374151]">Understanding your request…</p>
      <p className="text-[11px] text-[#9ca3af]">Claude is routing your voice command</p>
    </div>
  );
}

// ─── IntentBadge ─────────────────────────────────────────────────────────────
function IntentBadge({ intent, confidence }) {
  const meta   = INTENT_META[intent] || INTENT_META.unknown;
  const colour = COLOUR_CLASSES[meta.colour] || COLOUR_CLASSES.gray;
  const { Icon } = meta;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${colour.badge}`}>
      <Icon size={11} />
      {meta.label}
      {confidence < 0.7 && (
        <span className="ml-1 text-[10px] opacity-70">(low confidence)</span>
      )}
    </div>
  );
}

// ─── TicketNoteFields ────────────────────────────────────────────────────────
function TicketNoteFields({ data, openTickets, onChange }) {
  return (
    <>
      <div>
        <FieldLabel>Ticket</FieldLabel>
        <select
          value={data.ticket_id || ''}
          onChange={e => onChange({ ...data, ticket_id: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] bg-white focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        >
          <option value="">— Select ticket —</option>
          {openTickets.map(t => (
            <option key={t.id} value={t.id}>{t.title || t.id}</option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Note</FieldLabel>
        <textarea
          rows={3}
          value={data.body || ''}
          onChange={e => onChange({ ...data, body: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div>
        <FieldLabel>Type</FieldLabel>
        <div className="flex gap-2">
          {['update', 'internal'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...data, comment_type: t })}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors capitalize ${
                (data.comment_type || 'internal') === t
                  ? 'bg-[#d4a017] border-[#d4a017] text-[#111113]'
                  : 'border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── NewTicketFields ─────────────────────────────────────────────────────────
function NewTicketFields({ data, onChange }) {
  return (
    <>
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ ...data, title: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          rows={3}
          value={data.description || ''}
          onChange={e => onChange({ ...data, description: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div>
        <FieldLabel>Priority</FieldLabel>
        <div className="flex gap-2 flex-wrap">
          {['low', 'medium', 'high', 'urgent'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...data, priority: p })}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors capitalize ${
                (data.priority || 'medium') === p
                  ? 'bg-[#d4a017] border-[#d4a017] text-[#111113]'
                  : 'border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── PersonalNoteFields ───────────────────────────────────────────────────────
function PersonalNoteFields({ data, showDueDate, onChange }) {
  return (
    <>
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ ...data, title: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div>
        <FieldLabel>Body</FieldLabel>
        <textarea
          rows={3}
          value={data.body || ''}
          onChange={e => onChange({ ...data, body: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      {showDueDate && (
        <div>
          <FieldLabel>Due / Reminder date</FieldLabel>
          <input
            type="datetime-local"
            value={data.due_date ? data.due_date.slice(0, 16) : ''}
            onChange={e => onChange({ ...data, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
        </div>
      )}
    </>
  );
}

// ─── CompanyNoteFields ────────────────────────────────────────────────────────
function CompanyNoteFields({ data, onChange }) {
  return (
    <>
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ ...data, title: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div>
        <FieldLabel>Body</FieldLabel>
        <textarea
          rows={3}
          value={data.body || ''}
          onChange={e => onChange({ ...data, body: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div>
        <FieldLabel>Type</FieldLabel>
        <div className="flex gap-2 flex-wrap">
          {[['note', 'General'], ['knowledge', 'Knowledge base'], ['announcement', 'Announcement']].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...data, note_type: v })}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                (data.note_type || 'note') === v
                  ? 'bg-[#d4a017] border-[#d4a017] text-[#111113]'
                  : 'border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb]'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── CrmCalendarFields ────────────────────────────────────────────────────────
function CrmCalendarFields({ data, onChange }) {
  const startLocal = data.start_at ? new Date(data.start_at).toISOString().slice(0, 16) : '';
  const endLocal   = data.end_at   ? new Date(data.end_at).toISOString().slice(0, 16)   : '';
  return (
    <>
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ ...data, title: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div>
        <FieldLabel>Type</FieldLabel>
        <div className="flex gap-2 flex-wrap">
          {['call', 'meeting', 'follow_up', 'other'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...data, type: t })}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors capitalize ${
                (data.type || 'meeting') === t
                  ? 'bg-[#d4a017] border-[#d4a017] text-[#111113]'
                  : 'border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb]'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Start</FieldLabel>
          <input
            type="datetime-local"
            value={startLocal}
            onChange={e => onChange({ ...data, start_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
        </div>
        <div>
          <FieldLabel>End</FieldLabel>
          <input
            type="datetime-local"
            value={endLocal}
            onChange={e => onChange({ ...data, end_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
        </div>
      </div>
      <div>
        <FieldLabel>Notes</FieldLabel>
        <textarea
          rows={2}
          value={data.notes || ''}
          onChange={e => onChange({ ...data, notes: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
    </>
  );
}

// ─── TicketCalendarFields ─────────────────────────────────────────────────────
function TicketCalendarFields({ data, onChange }) {
  return (
    <>
      <div>
        <FieldLabel>Title</FieldLabel>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ ...data, title: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1">
          <FieldLabel>Date</FieldLabel>
          <input
            type="date"
            value={data.eventDate || ''}
            onChange={e => onChange({ ...data, eventDate: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
        </div>
        <div>
          <FieldLabel>Start</FieldLabel>
          <input
            type="time"
            value={data.startTime || ''}
            onChange={e => onChange({ ...data, startTime: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
        </div>
        <div>
          <FieldLabel>End</FieldLabel>
          <input
            type="time"
            value={data.endTime || ''}
            onChange={e => onChange({ ...data, endTime: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
        </div>
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          rows={2}
          value={data.description || ''}
          onChange={e => onChange({ ...data, description: e.target.value })}
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] resize-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
        />
      </div>
    </>
  );
}

// ─── ReviewPanel ──────────────────────────────────────────────────────────────
function ReviewPanel({ result, openTickets, onConfirm, onRetry, onCancel, saving }) {
  const [editData, setEditData] = useState(result.data || {});
  const { intent, confidence, confirmation_message } = result;

  // Speak on mount
  useEffect(() => {
    speak(confirmation_message);
    return () => stopSpeaking();
  }, [confirmation_message]);

  const renderFields = () => {
    switch (intent) {
      case 'ticket_note':
        return <TicketNoteFields data={editData} openTickets={openTickets} onChange={setEditData} />;
      case 'new_ticket':
        return <NewTicketFields data={editData} onChange={setEditData} />;
      case 'personal_note':
        return <PersonalNoteFields data={editData} showDueDate={false} onChange={setEditData} />;
      case 'personal_reminder':
        return <PersonalNoteFields data={editData} showDueDate onChange={setEditData} />;
      case 'company_note':
        return <CompanyNoteFields data={editData} onChange={setEditData} />;
      case 'crm_calendar':
        return <CrmCalendarFields data={editData} onChange={setEditData} />;
      case 'ticket_calendar':
        return <TicketCalendarFields data={editData} onChange={setEditData} />;
      default:
        return (
          <p className="text-[13px] text-[#6b7280]">
            Claude couldn't determine what to do with that. Please try again with a clearer command.
          </p>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Intent badge + TTS confirmation */}
      <div>
        <IntentBadge intent={intent} confidence={confidence} />
        <p className="mt-2 text-[13px] text-[#374151] leading-snug font-medium">
          {confirmation_message}
        </p>
        <button
          onClick={() => speak(confirmation_message)}
          className="mt-1 text-[11px] text-[#9ca3af] hover:text-[#6b7280] underline transition-colors"
        >
          🔊 Hear again
        </button>
      </div>

      {/* Editable fields */}
      <div className="flex flex-col gap-3">
        {renderFields()}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {intent !== 'unknown' && (
          <button
            onClick={() => onConfirm(editData)}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#d4a017] hover:bg-[#c4920f] disabled:opacity-60 text-[#111113] text-[13px] font-semibold transition-colors"
          >
            {saving
              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
              : <><Check size={13} /> Confirm &amp; save</>
            }
          </button>
        )}
        <button
          onClick={onRetry}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 text-[12px] transition-colors"
        >
          <RefreshCw size={13} /> Try again
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-2.5 rounded-lg border border-[#e5e7eb] text-[#9ca3af] hover:text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── SuccessToast ─────────────────────────────────────────────────────────────
function SuccessToast({ message }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111113] text-white text-[13px] font-medium shadow-xl">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0">
        <Check size={11} strokeWidth={3} />
      </span>
      {message}
    </div>
  );
}

// ─── Main VoiceAssistant ──────────────────────────────────────────────────────
export default function VoiceAssistant({ currentView, user }) {
  const [phase, setPhase]       = useState('idle');   // idle|recording|processing|review|saving|success
  const [elapsed, setElapsed]   = useState(0);
  const [liveText, setLiveText] = useState('');
  const [finalBuf, setFinalBuf] = useState('');
  const [result, setResult]     = useState(null);
  const [openTickets, setOpenTickets] = useState([]);
  const [error, setError]       = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isOpen, setIsOpen]     = useState(false);    // panel visible

  const recognitionRef = useRef(null);
  const timerRef       = useRef(null);
  const maxTimerRef    = useRef(null);

  // ── Fetch open tickets for context ────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets?limit=20&status=open', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.tickets || data || []).slice(0, 20).map(t => ({
        id:     t.id,
        title:  t.title,
        status: t.status,
        ref:    t.id?.slice(0, 8),
      }));
      setOpenTickets(list);
    } catch { /* non-fatal */ }
  }, []);

  // ── Save intent data to the correct API ─────────────────────────────────
  const saveIntent = useCallback(async (intent, data) => {
    switch (intent) {
      case 'ticket_note': {
        if (!data.ticket_id) throw new Error('No ticket selected');
        await fetch(`/api/tickets/${data.ticket_id}/comments`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: data.body || '', comment_type: data.comment_type || 'internal' }),
        }).then(r => { if (!r.ok) throw new Error('Failed to post comment'); });
        return 'Note added to ticket';
      }
      case 'new_ticket': {
        await fetch('/api/tickets', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title || 'Untitled', description: data.description, priority: data.priority || 'medium' }),
        }).then(r => { if (!r.ok) throw new Error('Failed to create ticket'); });
        return 'New ticket created';
      }
      case 'personal_note':
      case 'personal_reminder': {
        await fetch('/api/notes/personal', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title || '', body: data.body || '', due_date: data.due_date ?? null }),
        }).then(r => { if (!r.ok) throw new Error('Failed to create note'); });
        return intent === 'personal_reminder' ? 'Reminder saved to My Notes' : 'Note saved to My Notes';
      }
      case 'company_note': {
        await fetch('/api/notes/shared', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title || '', body: data.body || '', note_type: data.note_type || 'note' }),
        }).then(r => { if (!r.ok) throw new Error('Failed to create company note'); });
        return 'Note shared with team';
      }
      case 'crm_calendar': {
        await fetch('/api/crm-events', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:   data.title || 'Event',
            type:    data.type || 'meeting',
            start_at: data.start_at,
            end_at:   data.end_at,
            notes:   data.notes || '',
            status:  'planned',
          }),
        }).then(r => { if (!r.ok) throw new Error('Failed to create CRM event'); });
        return 'CRM event scheduled';
      }
      case 'ticket_calendar': {
        await fetch('/api/calendar', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:       data.title || 'Event',
            eventDate:   data.eventDate,
            startTime:   data.startTime || '09:00',
            endTime:     data.endTime   || '10:00',
            description: data.description || '',
          }),
        }).then(r => { if (!r.ok) throw new Error('Failed to create calendar event'); });
        return 'Calendar event booked';
      }
      default:
        throw new Error('Unknown intent');
    }
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      clearInterval(timerRef.current);
      clearTimeout(maxTimerRef.current);
      stopSpeaking();
    };
  }, []);

  // ── Open panel → fetch tickets ─────────────────────────────────────────
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setPhase('idle');
    setError('');
    fetchTickets();
  }, [fetchTickets]);

  // ── Start recording ────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Voice dictation requires Chrome or Edge on desktop/Android.');
      return;
    }
    setFinalBuf('');
    setLiveText('');
    setElapsed(0);
    setError('');
    setPhase('recording');

    const rec = new SpeechRecognitionAPI();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'en-GB';

    rec.onresult = (event) => {
      let interim = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (newFinal += t + ' ') : (interim += t);
      }
      if (newFinal) setFinalBuf(prev => prev + newFinal);
      setLiveText(interim);
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(e.error === 'not-allowed' ? 'Microphone access denied.' : `Mic error: ${e.error}`);
      setPhase('idle');
      clearInterval(timerRef.current);
      clearTimeout(maxTimerRef.current);
    };

    rec.onend = () => {
      clearInterval(timerRef.current);
      clearTimeout(maxTimerRef.current);
    };

    recognitionRef.current = rec;
    rec.start();

    // Elapsed counter
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    // Auto-stop at 60s
    maxTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);
  }, []); // eslint-disable-line

  // ── Stop recording → send to Claude ────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setLiveText('');
    setPhase('processing');

    // Give onresult one final cycle to flush
    setTimeout(() => {
      setFinalBuf(prev => {
        const transcript = prev.trim();
        if (!transcript) {
          setPhase('idle');
          setError('No speech detected — please try again.');
          return '';
        }
        submitTranscript(transcript);
        return '';
      });
    }, 400);
  }, []); // eslint-disable-line

  // ── Submit to backend ──────────────────────────────────────────────────
  const submitTranscript = useCallback(async (transcript) => {
    try {
      const now = new Date();
      const dateTime = now.toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      });

      const context = {
        currentView,
        userName: user?.name || user?.email || 'Unknown',
        dateTime,
        currentTicketId: window.__worktrackr_current_ticket || null,
        openTickets: openTickets.slice(0, 15),
      };

      const res = await fetch('/api/transcribe/voice-intent', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, context }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResult({ ...data, originalTranscript: transcript });
      setPhase('review');
    } catch (err) {
      console.error('[VoiceAssistant] Submit error:', err);
      setError('Failed to process command — please try again.');
      setPhase('idle');
    }
  }, [currentView, user, openTickets]);

  // ── Confirm & save ─────────────────────────────────────────────────────
  const handleConfirm = useCallback(async (editedData) => {
    if (!result) return;
    setPhase('saving');
    try {
      const successText = await saveIntent(result.intent, editedData);
      stopSpeaking();
      speak(successText + ' — done!');
      setSuccessMsg(successText);
      setPhase('success');
      setTimeout(() => {
        setIsOpen(false);
        setPhase('idle');
        setResult(null);
        setSuccessMsg('');
      }, 2200);
    } catch (err) {
      setError(`Save failed: ${err.message}`);
      setPhase('review');
    }
  }, [result, saveIntent]);

  // ── Retry — go back to recording ─────────────────────────────────────
  const handleRetry = useCallback(() => {
    stopSpeaking();
    setResult(null);
    setError('');
    setPhase('idle');
  }, []);

  // ── Cancel — close panel ──────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    stopSpeaking();
    if (recognitionRef.current) recognitionRef.current.abort();
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
    setIsOpen(false);
    setPhase('idle');
    setResult(null);
    setError('');
    setFinalBuf('');
    setLiveText('');
  }, []);

  // ── Don't render at all if Web Speech unavailable ─────────────────────
  if (!SpeechRecognitionAPI) return null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 md:right-6 z-[9999] w-[340px] max-w-[calc(100vw-2rem)]
                     bg-white rounded-2xl shadow-2xl border border-[#e5e7eb] overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6] bg-[#fafafa]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#d4a017] flex items-center justify-center">
                <Mic size={12} className="text-[#111113]" />
              </div>
              <span className="text-[13px] font-bold text-[#111113]">Voice Assistant</span>
            </div>
            <button
              onClick={handleCancel}
              className="w-6 h-6 flex items-center justify-center rounded text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Panel body */}
          <div className="p-4">
            {/* Error banner */}
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-600">
                {error}
              </div>
            )}

            {phase === 'idle' && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-[#374151]">
                  Tap the button below and speak your command. I'll route it to the right place automatically.
                </p>
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                  Examples: "Add a note to the VPN ticket" · "Create an urgent ticket for the server outage" · "Remind me to call John next Tuesday" · "Schedule a call with Acme Corp tomorrow at 2pm"
                </p>
                <button
                  onClick={startRecording}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#d4a017] hover:bg-[#c4920f] text-[#111113] text-[13px] font-bold transition-all hover:-translate-y-px active:translate-y-0"
                >
                  <Mic size={15} /> Start recording
                </button>
              </div>
            )}

            {phase === 'recording' && (
              <RecordingPanel
                elapsed={elapsed}
                liveText={(finalBuf + liveText).trim()}
                onStop={stopRecording}
                onCancel={handleCancel}
              />
            )}

            {phase === 'processing' && <ProcessingPanel />}

            {(phase === 'review' || phase === 'saving') && result && (
              <ReviewPanel
                result={result}
                openTickets={openTickets}
                onConfirm={handleConfirm}
                onRetry={handleRetry}
                onCancel={handleCancel}
                saving={phase === 'saving'}
              />
            )}

            {phase === 'success' && (
              <div className="flex flex-col items-center justify-center gap-3 py-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <Check size={20} className="text-green-600" strokeWidth={2.5} />
                </span>
                <p className="text-[13px] font-semibold text-[#111113]">{successMsg}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating Action Button ───────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          title="Voice assistant"
          className="fixed bottom-6 right-4 md:right-6 z-[9999] w-12 h-12 rounded-full shadow-lg
                     bg-[#d4a017] hover:bg-[#c4920f] active:scale-95
                     flex items-center justify-center transition-all duration-150
                     hover:shadow-xl hover:-translate-y-0.5"
          style={{ boxShadow: '0 4px 20px rgba(212,160,23,0.5)' }}
        >
          <Mic size={20} className="text-[#111113]" strokeWidth={2.2} />
        </button>
      )}

      {/* ── Success toast (shown even when panel closes) ─────────────────── */}
      {phase === 'success' && successMsg && !isOpen && (
        <div className="fixed bottom-6 right-4 md:right-6 z-[9999]">
          <SuccessToast message={successMsg} />
        </div>
      )}
    </>
  );
}
