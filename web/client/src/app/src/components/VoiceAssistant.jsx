// web/client/src/app/src/components/VoiceAssistant.jsx
//
// Voice Assistant — full hands-free conversational flow
//
// Phase 1: CRM calendar company/contact extraction fix
// Phase 2: Voice confirmation loop (8s yes/no window after TTS)
// Phase 3: Clarification rounds (Claude asks missing fields by voice, max 3)
// Phase 4: Smart auto-save (confidence >= 0.9, all fields present, skip review)
// Phase 5: Compound intents (two actions from one command)
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
  compound:          { label: 'Multiple actions',    colour: 'gray',    Icon: FileText  },
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

// ─── Phase 4: Required fields for auto-save check ─────────────────────────────
const REQUIRED_FIELDS = {
  crm_calendar:      ['start_at', 'title', 'type'],
  new_ticket:        ['title'],
  ticket_note:       ['body'],   // ticket_id may come from context
  personal_reminder: ['title', 'due_date'],
  personal_note:     ['title', 'body'],
  company_note:      ['title', 'body'],
  ticket_calendar:   ['title', 'eventDate', 'startTime'],
};

// Phase 4: Returns true when command is complete and high-confidence enough to skip review
function shouldAutoSave(result) {
  if (!result) return false;
  if (result.intent === 'unknown' || result.intent === 'compound') return false;
  if (!result.confidence || result.confidence < 0.9) return false;
  if (result.clarification_needed) return false;
  const required = REQUIRED_FIELDS[result.intent] || [];
  const data = result.data || {};
  return required.every(f => data[f] != null && data[f] !== '');
}

// ─── Phase 2: Voice confirm affirmative/negative sets ─────────────────────────
const AFFIRMATIVES = new Set([
  'yes', 'yeah', 'yep', 'yup', 'confirm', 'do it', 'correct',
  'ok', 'okay', 'go ahead', 'save', 'save it', 'sounds good', 'perfect', 'great',
]);
const NEGATIVES = new Set([
  'no', 'nope', 'cancel', 'stop', "don't", 'retry', 'try again',
  'back', 'never mind', 'scratch that',
]);

function matchesSet(text, wordSet) {
  const t = text.toLowerCase().trim();
  if (wordSet.has(t)) return true;
  for (const w of wordSet) { if (t.includes(w)) return true; }
  return false;
}

// ─── speak() — browser TTS with optional onEnd callback ──────────────────────
function speak(text, onEnd) {
  if (!window.speechSynthesis || !text) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang   = 'en-GB';
  utt.rate   = 0.95;
  utt.pitch  = 1;
  utt.volume = 1;
  if (onEnd) {
    let fired = false;
    const fire = () => { if (!fired) { fired = true; onEnd(); } };
    utt.onend = fire;
    // Fallback: TTS onend is unreliable on some browsers
    setTimeout(fire, Math.max(2500, text.length * 75));
  }
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1">
      {children}
    </label>
  );
}

// ─── RecordingPanel ───────────────────────────────────────────────────────────
function RecordingPanel({ elapsed, liveText, onStop, onCancel }) {
  const pct       = Math.min((elapsed / 60) * 100, 100);
  const remaining = Math.max(0, 60 - elapsed);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke="#ef4444" strokeWidth="4"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - pct / 100)}
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
      <div className="min-h-[52px] rounded-lg border border-[#d4a017]/40 bg-[#fffdf5] px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4a017] mb-1">Hearing</p>
        <p className="text-[13px] text-[#374151] leading-relaxed">
          {liveText || <span className="text-[#9ca3af] italic">Start speaking…</span>}
        </p>
      </div>
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

// ─── Phase 3: ClarifyingPanel ─────────────────────────────────────────────────
function ClarifyingPanel({ question, micActive, elapsed, liveText, onSkip }) {
  const remaining = Math.max(0, 10 - elapsed);
  const pct       = Math.min((elapsed / 10) * 100, 100);
  return (
    <div className="flex flex-col gap-4">
      {/* Question box */}
      <div className="px-3 py-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Question</p>
        <p className="text-[13px] text-[#374151] font-medium leading-snug">{question}</p>
      </div>

      {/* Mic state */}
      {micActive ? (
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke="#d4a017" strokeWidth="3"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - pct / 100)}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#374151]">
              {remaining}s
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#d4a017] animate-ping" />
              <span className="text-[12px] font-semibold text-[#374151]">Listening for your answer…</span>
            </div>
            {liveText && (
              <p className="text-[12px] text-[#6b7280] mt-0.5 italic">{liveText}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[12px] text-[#9ca3af]">
          <Loader2 size={12} className="animate-spin" />
          Preparing to listen…
        </div>
      )}

      <button
        onClick={onSkip}
        className="text-[12px] text-[#9ca3af] hover:text-[#374151] underline self-start transition-colors"
      >
        Skip and fill in manually →
      </button>
    </div>
  );
}

// ─── Phase 2: VoiceConfirmIndicator ──────────────────────────────────────────
function VoiceConfirmIndicator({ countdown, onHearAgain }) {
  return (
    <div className="mb-4 flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
        <span className="text-[12px] font-semibold text-amber-700">
          Say yes or no — {countdown}s
        </span>
      </div>
      <button
        onClick={onHearAgain}
        className="text-[11px] text-amber-600 hover:text-amber-800 underline transition-colors ml-3 flex-shrink-0"
      >
        Hear again
      </button>
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
      {confidence != null && confidence < 0.7 && (
        <span className="ml-1 text-[10px] opacity-70">(low confidence)</span>
      )}
    </div>
  );
}

// ─── Field components ─────────────────────────────────────────────────────────

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

// Phase 1: added Company and Contact fields
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
      {/* Phase 1: Company + Contact row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Company</FieldLabel>
          <input
            type="text"
            placeholder="Optional"
            value={data.company || ''}
            onChange={e => onChange({ ...data, company: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
        </div>
        <div>
          <FieldLabel>Contact</FieldLabel>
          <input
            type="text"
            placeholder="Optional"
            value={data.contact || ''}
            onChange={e => onChange({ ...data, contact: e.target.value })}
            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] text-[#111113] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/40"
          />
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

// ─── renderIntentFields — shared field renderer by intent ─────────────────────
function renderIntentFields(intent, data, onChange, openTickets) {
  switch (intent) {
    case 'ticket_note':
      return <TicketNoteFields data={data} openTickets={openTickets} onChange={onChange} />;
    case 'new_ticket':
      return <NewTicketFields data={data} onChange={onChange} />;
    case 'personal_note':
      return <PersonalNoteFields data={data} showDueDate={false} onChange={onChange} />;
    case 'personal_reminder':
      return <PersonalNoteFields data={data} showDueDate onChange={onChange} />;
    case 'company_note':
      return <CompanyNoteFields data={data} onChange={onChange} />;
    case 'crm_calendar':
      return <CrmCalendarFields data={data} onChange={onChange} />;
    case 'ticket_calendar':
      return <TicketCalendarFields data={data} onChange={onChange} />;
    default:
      return (
        <p className="text-[13px] text-[#6b7280]">
          Claude couldn't determine what to do. Please try again with a clearer command.
        </p>
      );
  }
}

// ─── ReviewPanel (Phase 2: editData/onEditData lifted to parent; confirmListening) ──
function ReviewPanel({
  result, editData, onEditData, openTickets,
  onConfirm, onRetry, onCancel, saving,
  confirmListening, confirmCountdown, onTtsEnd, onHearAgain,
}) {
  const { intent, confidence, confirmation_message } = result;

  // Speak on mount — fire onTtsEnd when done (triggers voice confirm window)
  useEffect(() => {
    speak(confirmation_message, onTtsEnd);
    return () => stopSpeaking();
  }, [confirmation_message]); // eslint-disable-line

  return (
    <div className="flex flex-col gap-4">
      {/* Phase 2: pulsing confirm indicator when listening */}
      {confirmListening && (
        <VoiceConfirmIndicator countdown={confirmCountdown} onHearAgain={onHearAgain} />
      )}

      {/* Intent badge + TTS confirmation */}
      <div>
        <IntentBadge intent={intent} confidence={confidence} />
        <p className="mt-2 text-[13px] text-[#374151] leading-snug font-medium">
          {confirmation_message}
        </p>
        {!confirmListening && (
          <button
            onClick={() => speak(confirmation_message, onTtsEnd)}
            className="mt-1 text-[11px] text-[#9ca3af] hover:text-[#6b7280] underline transition-colors"
          >
            🔊 Hear again
          </button>
        )}
      </div>

      {/* Editable fields */}
      <div className="flex flex-col gap-3">
        {renderIntentFields(intent, editData, onEditData, openTickets)}
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

// ─── Phase 5: CompoundReviewPanel ─────────────────────────────────────────────
function CompoundReviewPanel({
  result, editItems, onEditItems, openTickets,
  onConfirm, onRetry, onCancel, saving,
  confirmListening, confirmCountdown, onHearAgain,
}) {
  const { confirmation_message, confidence } = result;

  useEffect(() => {
    speak(confirmation_message);
    return () => stopSpeaking();
  }, [confirmation_message]); // eslint-disable-line

  function handleItemChange(idx, newData) {
    const updated = editItems.map((item, i) => i === idx ? { ...item, data: newData } : item);
    onEditItems(updated);
  }

  return (
    <div className="flex flex-col gap-4">
      {confirmListening && (
        <VoiceConfirmIndicator countdown={confirmCountdown} onHearAgain={onHearAgain} />
      )}

      <div>
        <p className="text-[13px] text-[#374151] leading-snug font-medium">{confirmation_message}</p>
        {!confirmListening && (
          <button
            onClick={() => speak(confirmation_message)}
            className="mt-1 text-[11px] text-[#9ca3af] hover:text-[#6b7280] underline transition-colors"
          >
            🔊 Hear again
          </button>
        )}
      </div>

      {/* Each compound item */}
      {editItems.map((item, idx) => (
        <div key={idx} className="border border-[#e5e7eb] rounded-xl p-3 flex flex-col gap-3">
          <IntentBadge intent={item.intent} confidence={confidence} />
          {renderIntentFields(item.intent, item.data, (d) => handleItemChange(idx, d), openTickets)}
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfirm(editItems)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#d4a017] hover:bg-[#c4920f] disabled:opacity-60 text-[#111113] text-[13px] font-semibold transition-colors"
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
            : <><Check size={13} /> Confirm &amp; save all</>
          }
        </button>
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
  // Core phase state machine
  // idle | recording | processing | clarifying | review | voice_confirm | saving | success
  const [phase, setPhase]       = useState('idle');
  const [elapsed, setElapsed]   = useState(0);
  const [liveText, setLiveText] = useState('');
  const [finalBuf, setFinalBuf] = useState('');
  const [result, setResult]     = useState(null);
  const [openTickets, setOpenTickets] = useState([]);
  const [error, setError]       = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isOpen, setIsOpen]     = useState(false);

  // Phase 2: lifted editData (was internal to ReviewPanel)
  const [editData, setEditData] = useState({});

  // Phase 3: clarification state
  const [conversationHistory, setConversationHistory] = useState([]);
  const [clarifyRound, setClarifyRound]               = useState(0);
  const [clarifyMicActive, setClarifyMicActive]       = useState(false);
  const [clarifyElapsed, setClarifyElapsed]           = useState(0);
  const [clarifyLiveText, setClarifyLiveText]         = useState('');

  // Phase 2: voice confirm state
  const [confirmListening, setConfirmListening] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(8);

  // Phase 5: compound items
  const [editItems, setEditItems] = useState([]);

  // ── Refs: recognition instances + timers ────────────────────────────────
  const recognitionRef  = useRef(null);
  const timerRef        = useRef(null);
  const maxTimerRef     = useRef(null);
  const clarifyRecRef   = useRef(null);
  const clarifyTimerRef = useRef(null);
  const confirmRecRef   = useRef(null);
  const confirmTimerRef = useRef(null);

  // ── Stale-closure guard refs (updated inline every render) ─────────────
  const resultRef            = useRef(null);
  const editDataRef          = useRef({});
  const editItemsRef         = useRef([]);
  const handleConfirmRef     = useRef(null);
  const handleRetryRef       = useRef(null);
  const startVoiceConfirmRef = useRef(null);
  const submitTranscriptRef  = useRef(null);
  const startClarifyMicRef   = useRef(null);

  // Keep stale-closure refs in sync with latest values every render
  resultRef.current    = result;
  editDataRef.current  = editData;
  editItemsRef.current = editItems;

  // ── Fetch open tickets for context ────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets?limit=20&status=open', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.tickets || data || []).slice(0, 20).map(t => ({
        id: t.id, title: t.title, status: t.status, ref: t.id?.slice(0, 8),
      }));
      setOpenTickets(list);
    } catch { /* non-fatal */ }
  }, []);

  // ── saveIntent — writes to the correct API ─────────────────────────────
  const saveIntent = useCallback(async (intent, data) => {
    switch (intent) {
      case 'ticket_note': {
        if (!data.ticket_id) throw new Error('No ticket selected');
        const r = await fetch(`/api/tickets/${data.ticket_id}/comments`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: data.body || '', comment_type: data.comment_type || 'internal' }),
        });
        if (!r.ok) throw new Error('Failed to post comment');
        return 'Note added to ticket';
      }
      case 'new_ticket': {
        const r = await fetch('/api/tickets', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title || 'Untitled', description: data.description, priority: data.priority || 'medium' }),
        });
        if (!r.ok) throw new Error('Failed to create ticket');
        const newTicket = await r.json();
        window.dispatchEvent(new CustomEvent('worktrackr:ticket-created', { detail: newTicket }));
        return 'New ticket created';
      }
      case 'personal_note':
      case 'personal_reminder': {
        const r = await fetch('/api/notes/personal', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title || '', body: data.body || '', due_date: data.due_date ?? null }),
        });
        if (!r.ok) throw new Error('Failed to create note');
        return intent === 'personal_reminder' ? 'Reminder saved to My Notes' : 'Note saved to My Notes';
      }
      case 'company_note': {
        const r = await fetch('/api/notes/shared', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title || '', body: data.body || '', note_type: data.note_type || 'note' }),
        });
        if (!r.ok) throw new Error('Failed to create company note');
        return 'Note shared with team';
      }
      case 'crm_calendar': {
        // Phase 1: company + contact now included
        const r = await fetch('/api/crm-events', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:    data.title || 'Event',
            type:     data.type || 'meeting',
            start_at: data.start_at,
            end_at:   data.end_at,
            notes:    data.notes || '',
            company:  data.company || null,
            contact:  data.contact || null,
            status:   'planned',
          }),
        });
        if (!r.ok) throw new Error('Failed to create CRM event');
        return 'CRM event scheduled';
      }
      case 'ticket_calendar': {
        const r = await fetch('/api/calendar', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:       data.title || 'Event',
            eventDate:   data.eventDate,
            startTime:   data.startTime || '09:00',
            endTime:     data.endTime   || '10:00',
            description: data.description || '',
          }),
        });
        if (!r.ok) throw new Error('Failed to create calendar event');
        return 'Calendar event booked';
      }
      default:
        throw new Error('Unknown intent: ' + intent);
    }
  }, []);

  // ── Phase 2: Begin voice confirm recognition (8s window) ──────────────
  const beginConfirmRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    setConfirmListening(true);
    setConfirmCountdown(8);

    const rec = new SpeechRecognitionAPI();
    rec.continuous     = false;
    rec.interimResults = false;
    rec.lang           = 'en-GB';

    let resultFired = false;

    rec.onresult = (event) => {
      if (resultFired) return;
      resultFired = true;
      clearInterval(confirmTimerRef.current);
      confirmRecRef.current = null;
      setConfirmListening(false);
      setConfirmCountdown(8);

      const transcript = event.results[0]?.[0]?.transcript || '';
      if (matchesSet(transcript, AFFIRMATIVES)) {
        // Affirmative — save
        const isCompound = resultRef.current?.intent === 'compound';
        const data = isCompound ? editItemsRef.current : editDataRef.current;
        handleConfirmRef.current && handleConfirmRef.current(data);
      } else if (matchesSet(transcript, NEGATIVES)) {
        // Negative — cancel
        handleRetryRef.current && handleRetryRef.current();
        speak('Cancelled.');
      }
      // Ambiguous: fall through to manual tap
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      clearInterval(confirmTimerRef.current);
      setConfirmListening(false);
      setConfirmCountdown(8);
      setPhase(prev => prev === 'voice_confirm' ? 'review' : prev);
    };

    rec.onend = () => {
      if (!resultFired) {
        // Timeout/no-speech — fall through to tap
        clearInterval(confirmTimerRef.current);
        setConfirmListening(false);
        setConfirmCountdown(8);
        setPhase(prev => prev === 'voice_confirm' ? 'review' : prev);
      }
    };

    confirmRecRef.current = rec;
    rec.start();

    // 8s countdown
    const startMs = Date.now();
    confirmTimerRef.current = setInterval(() => {
      const el = Math.floor((Date.now() - startMs) / 1000);
      setConfirmCountdown(Math.max(0, 8 - el));
      if (el >= 8) {
        clearInterval(confirmTimerRef.current);
        if (confirmRecRef.current && !resultFired) {
          resultFired = true;
          confirmRecRef.current.abort();
          confirmRecRef.current = null;
        }
        setConfirmListening(false);
        setConfirmCountdown(8);
        setPhase(prev => prev === 'voice_confirm' ? 'review' : prev);
      }
    }, 500);
  }, []);

  // Keep ref current so stale closures in Recognition callbacks see latest
  startVoiceConfirmRef.current = beginConfirmRecognition;

  // ── Phase 2: Triggered when TTS ends on ReviewPanel ───────────────────
  const onReviewTtsEnd = useCallback(() => {
    setPhase(prev => {
      if (prev !== 'review') return prev; // don't re-enter if already moved on
      beginConfirmRecognition();
      return 'voice_confirm';
    });
  }, [beginConfirmRecognition]);

  // ── Phase 2: Hear again — re-speak then re-open confirm window ─────────
  const handleHearAgain = useCallback(() => {
    if (confirmRecRef.current) {
      confirmRecRef.current.abort();
      confirmRecRef.current = null;
    }
    clearInterval(confirmTimerRef.current);
    setConfirmListening(false);
    setConfirmCountdown(8);
    setPhase('review');

    const msg = resultRef.current?.confirmation_message;
    if (msg) {
      speak(msg, () => {
        startVoiceConfirmRef.current && startVoiceConfirmRef.current();
        setPhase(prev => prev === 'review' ? 'voice_confirm' : prev);
      });
    }
  }, []);

  // ── Phase 3: Clarify mic — 10s window for spoken answer ───────────────
  const startClarifyMic = useCallback((history, round) => {
    if (!SpeechRecognitionAPI) {
      setPhase('review');
      return;
    }

    setClarifyMicActive(true);
    setClarifyElapsed(0);
    setClarifyLiveText('');

    const rec = new SpeechRecognitionAPI();
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = 'en-GB';

    let finalAnswer = '';
    let endFired    = false;

    rec.onresult = (event) => {
      let interim = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (newFinal += t + ' ') : (interim += t);
      }
      if (newFinal) finalAnswer += newFinal;
      setClarifyLiveText((finalAnswer + interim).trim());
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      clearInterval(clarifyTimerRef.current);
      setClarifyMicActive(false);
      if (e.error !== 'no-speech') setPhase('review');
    };

    rec.onend = () => {
      if (endFired) return;
      endFired = true;
      clearInterval(clarifyTimerRef.current);
      setClarifyMicActive(false);
      clarifyRecRef.current = null;

      const answer = finalAnswer.trim();
      if (!answer) {
        // No answer heard — fall to review panel
        setPhase('review');
        return;
      }

      const updatedHistory = [...history, { role: 'user', content: answer }];
      setConversationHistory(updatedHistory);
      setClarifyRound(round + 1);
      setPhase('processing');
      submitTranscriptRef.current && submitTranscriptRef.current(answer, updatedHistory, round + 1);
    };

    clarifyRecRef.current = rec;
    rec.start();

    // 10s hard limit
    const hardStop = setTimeout(() => {
      if (clarifyRecRef.current) clarifyRecRef.current.stop();
    }, 10_000);

    // Countdown
    const startMs = Date.now();
    clarifyTimerRef.current = setInterval(() => {
      const el = Math.floor((Date.now() - startMs) / 1000);
      setClarifyElapsed(el);
      if (el >= 10) {
        clearInterval(clarifyTimerRef.current);
        clearTimeout(hardStop);
      }
    }, 500);
  }, []);

  startClarifyMicRef.current = startClarifyMic;

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (clarifyRecRef.current)  clarifyRecRef.current.abort();
      if (confirmRecRef.current)  confirmRecRef.current.abort();
      clearInterval(timerRef.current);
      clearTimeout(maxTimerRef.current);
      clearInterval(clarifyTimerRef.current);
      clearInterval(confirmTimerRef.current);
      stopSpeaking();
    };
  }, []);

  // ── Open panel → fetch tickets ─────────────────────────────────────
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setPhase('idle');
    setError('');
    fetchTickets();
  }, [fetchTickets]);

  // ── Start recording ────────────────────────────────────────────────
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

    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    maxTimerRef.current = setTimeout(() => {
      setError('Time limit reached — recording stopped after 60 seconds.');
      stopRecordingRef.current && stopRecordingRef.current();
    }, MAX_RECORD_MS);
  }, []); // eslint-disable-line

  // ── Stop recording → send to Claude ────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setLiveText('');
    setPhase('processing');

    setTimeout(() => {
      setFinalBuf(prev => {
        const transcript = prev.trim();
        if (!transcript) {
          setPhase('idle');
          setError('No speech detected — please try again.');
          return '';
        }
        setConversationHistory([]);
        setClarifyRound(0);
        submitTranscriptRef.current && submitTranscriptRef.current(transcript, [], 0);
        return '';
      });
    }, 400);
  }, []); // eslint-disable-line

  // Ref for use inside maxTimer callback (avoids stale closure)
  const stopRecordingRef = useRef(null);
  stopRecordingRef.current = stopRecording;

  // ── Submit transcript to backend (Phase 3: accepts history + round) ──
  const submitTranscript = useCallback(async (transcript, history, round) => {
    try {
      const now = new Date();
      const dateTime = now.toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      });

      const context = {
        currentView,
        userName:         user?.name || user?.email || 'Unknown',
        dateTime,
        currentTicketId:  window.__worktrackr_current_ticket || null,
        openTickets:      openTickets.slice(0, 15),
      };

      const res = await fetch('/api/transcribe/voice-intent', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          context,
          conversationHistory: history || [],
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      // Phase 5: Handle compound intent
      if (data.intent === 'compound' && Array.isArray(data.compound_items)) {
        const items = data.compound_items.map(ci => ({ intent: ci.intent, data: ci.data || {} }));
        setEditItems(items);
        editItemsRef.current = items;
        const resultData = { ...data, originalTranscript: transcript };
        setResult(resultData);
        resultRef.current = resultData;

        if (data.clarification_needed && (round || 0) < 3 && data.question) {
          setConversationHistory(history || []);
          setClarifyRound(round || 0);
          setPhase('clarifying');
          speak(data.question, () => startClarifyMicRef.current && startClarifyMicRef.current(history || [], round || 0));
        } else {
          setPhase('review');
        }
        return;
      }

      // Single intent
      const resultData = { ...data, originalTranscript: transcript };
      setResult(resultData);
      resultRef.current = resultData;
      setEditData(data.data || {});
      editDataRef.current = data.data || {};

      // Phase 3: Clarification needed
      if (data.clarification_needed && (round || 0) < 3 && data.question) {
        setConversationHistory(history || []);
        setClarifyRound(round || 0);
        setPhase('clarifying');
        speak(data.question, () => startClarifyMicRef.current && startClarifyMicRef.current(history || [], round || 0));
        return;
      }

      // Phase 4: Auto-save when all fields present + high confidence
      if (shouldAutoSave(data)) {
        setPhase('saving');
        // Speak + save simultaneously
        speak(data.confirmation_message);
        try {
          const successText = await saveIntent(data.intent, data.data);
          speak(successText + '. Done!');
          setSuccessMsg(successText);
          setPhase('success');
          setTimeout(() => {
            setIsOpen(false);
            setPhase('idle');
            setResult(null);
            setSuccessMsg('');
          }, 2200);
        } catch (saveErr) {
          setError('Save failed: ' + saveErr.message);
          setPhase('review');
        }
        return;
      }

      // Standard review flow
      setPhase('review');
    } catch (err) {
      console.error('[VoiceAssistant] Submit error:', err);
      setError('Failed to process command — please try again.');
      setPhase('idle');
    }
  }, [currentView, user, openTickets, saveIntent]);

  submitTranscriptRef.current = submitTranscript;

  // ── Confirm & save ─────────────────────────────────────────────────
  const handleConfirm = useCallback(async (dataOrItems) => {
    const res = resultRef.current;
    if (!res) return;
    setPhase('saving');

    // Clean up any open confirm recognition
    if (confirmRecRef.current) {
      confirmRecRef.current.abort();
      confirmRecRef.current = null;
    }
    clearInterval(confirmTimerRef.current);
    setConfirmListening(false);

    try {
      let successText;
      if (res.intent === 'compound') {
        // Phase 5: Save each compound item in sequence
        const items = Array.isArray(dataOrItems) ? dataOrItems : editItemsRef.current;
        const results = [];
        for (const item of items) {
          const msg = await saveIntent(item.intent, item.data);
          results.push(msg);
        }
        successText = results.join(' & ');
      } else {
        successText = await saveIntent(res.intent, dataOrItems);
      }

      stopSpeaking();
      speak(successText + ' — done!');
      setSuccessMsg(successText);
      setPhase('success');
      setTimeout(() => {
        setIsOpen(false);
        setPhase('idle');
        setResult(null);
        setSuccessMsg('');
        setEditData({});
        setEditItems([]);
      }, 2200);
    } catch (err) {
      setError('Save failed: ' + err.message);
      setPhase('review');
    }
  }, [saveIntent]);

  handleConfirmRef.current = handleConfirm;

  // ── Retry — back to idle ──────────────────────────────────────────
  const handleRetry = useCallback(() => {
    stopSpeaking();
    if (confirmRecRef.current)  { confirmRecRef.current.abort();  confirmRecRef.current  = null; }
    if (clarifyRecRef.current)  { clarifyRecRef.current.abort();  clarifyRecRef.current  = null; }
    clearInterval(confirmTimerRef.current);
    clearInterval(clarifyTimerRef.current);
    setConfirmListening(false);
    setConfirmCountdown(8);
    setClarifyMicActive(false);
    setConversationHistory([]);
    setClarifyRound(0);
    setResult(null);
    setEditData({});
    setEditItems([]);
    setError('');
    setPhase('idle');
  }, []);

  handleRetryRef.current = handleRetry;

  // ── Cancel — close panel completely ──────────────────────────────
  const handleCancel = useCallback(() => {
    stopSpeaking();
    if (recognitionRef.current) recognitionRef.current.abort();
    if (confirmRecRef.current)  { confirmRecRef.current.abort();  confirmRecRef.current  = null; }
    if (clarifyRecRef.current)  { clarifyRecRef.current.abort();  clarifyRecRef.current  = null; }
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
    clearInterval(confirmTimerRef.current);
    clearInterval(clarifyTimerRef.current);
    setIsOpen(false);
    setPhase('idle');
    setResult(null);
    setEditData({});
    setEditItems([]);
    setError('');
    setFinalBuf('');
    setLiveText('');
    setConfirmListening(false);
    setConfirmCountdown(8);
    setClarifyMicActive(false);
    setConversationHistory([]);
    setClarifyRound(0);
  }, []);

  // ── Don't render if Web Speech unavailable ────────────────────────
  if (!SpeechRecognitionAPI) return null;

  const isCompound    = result?.intent === 'compound';
  const showReview    = (phase === 'review' || phase === 'saving' || phase === 'voice_confirm') && result != null;
  const isVoicePhase  = phase === 'voice_confirm';

  // ── Render ─────────────────────────────────────────────────────────
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

            {/* idle */}
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

            {/* recording */}
            {phase === 'recording' && (
              <RecordingPanel
                elapsed={elapsed}
                liveText={(finalBuf + liveText).trim()}
                onStop={stopRecording}
                onCancel={handleCancel}
              />
            )}

            {/* processing */}
            {phase === 'processing' && <ProcessingPanel />}

            {/* Phase 3: clarifying */}
            {phase === 'clarifying' && result && (
              <ClarifyingPanel
                question={result.question || 'Could you provide more detail?'}
                micActive={clarifyMicActive}
                elapsed={clarifyElapsed}
                liveText={clarifyLiveText}
                onSkip={() => {
                  if (clarifyRecRef.current) { clarifyRecRef.current.abort(); clarifyRecRef.current = null; }
                  clearInterval(clarifyTimerRef.current);
                  setClarifyMicActive(false);
                  setPhase('review');
                }}
              />
            )}

            {/* review / voice_confirm / saving — single intent */}
            {showReview && !isCompound && (
              <ReviewPanel
                result={result}
                editData={editData}
                onEditData={setEditData}
                openTickets={openTickets}
                onConfirm={handleConfirm}
                onRetry={handleRetry}
                onCancel={handleCancel}
                saving={phase === 'saving'}
                confirmListening={isVoicePhase && confirmListening}
                confirmCountdown={confirmCountdown}
                onTtsEnd={onReviewTtsEnd}
                onHearAgain={handleHearAgain}
              />
            )}

            {/* Phase 5: review / voice_confirm / saving — compound */}
            {showReview && isCompound && (
              <CompoundReviewPanel
                result={result}
                editItems={editItems}
                onEditItems={setEditItems}
                openTickets={openTickets}
                onConfirm={handleConfirm}
                onRetry={handleRetry}
                onCancel={handleCancel}
                saving={phase === 'saving'}
                confirmListening={isVoicePhase && confirmListening}
                confirmCountdown={confirmCountdown}
                onHearAgain={handleHearAgain}
              />
            )}

            {/* success */}
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

      {/* ── Floating Action Button ─────────────────────────────────────────── */}
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

      {/* ── Success toast (shown even when panel closes) ──────────────────── */}
      {phase === 'success' && successMsg && !isOpen && (
        <div className="fixed bottom-6 right-4 md:right-6 z-[9999]">
          <SuccessToast message={successMsg} />
        </div>
      )}
    </>
  );
}
