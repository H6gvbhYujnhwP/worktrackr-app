// web/client/src/app/src/components/LeadNotesPanel.jsx
// Phase 8 (Leads) — slide-over Notes panel for a lead. Shows the company's
// activity timeline (notes, logged emails, calls, meetings, tasks), lets the
// salesperson add a note, and accepts emails dragged onto a drop zone (their
// subject + text are logged). Reads GET /api/contacts/:id/history and writes
// POST /api/contacts/:id/notes. The same timeline shows on the company profile.
import React, { useEffect, useState, useCallback } from 'react';
import {
  X, Mail, StickyNote, Phone, Users, Target, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';

const KIND_STYLE = {
  email:     { Icon: Mail,          bg: 'bg-[#FAEEDA]', fg: 'text-[#854F0B]' },
  note:      { Icon: StickyNote,    bg: 'bg-[#E6F1FB]', fg: 'text-[#0C447C]' },
  call:      { Icon: Phone,         bg: 'bg-[#E1F5EE]', fg: 'text-[#0F6E56]' },
  meeting:   { Icon: Users,         bg: 'bg-[#EAF3DE]', fg: 'text-[#3B6D11]' },
  follow_up: { Icon: Target,        bg: 'bg-[#EEEDFE]', fg: 'text-[#26215C]' },
  renewal:   { Icon: AlertTriangle, bg: 'bg-[#FAECE7]', fg: 'text-[#993C1D]' },
  task:      { Icon: CheckCircle,   bg: 'bg-[#EAF3DE]', fg: 'text-[#3B6D11]' },
  other:     { Icon: Clock,         bg: 'bg-[#F1EFE8]', fg: 'text-[#5F5E5A]' },
};

function fmtDate(at) {
  if (!at) return '';
  const d = new Date(at);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function LeadNotesPanel({ lead, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/contacts/${lead.id}/history`, { credentials: 'include' });
      const data = r.ok ? await r.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => { refresh(); }, [refresh]);

  async function postNote(payload) {
    const r = await fetch(`/api/contacts/${lead.id}/notes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  }

  async function saveNote() {
    const body = noteText.trim();
    if (!body) return;
    setSaving(true);
    try {
      await postNote({ kind: 'note', body });
      setNoteText('');
      await refresh();
      onChanged && onChanged();
    } catch {
      /* surfaced via no-op; keep text so it isn't lost */
    } finally {
      setSaving(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    try {
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) {
        for (const f of files) {
          let subject = f.name.replace(/\.(eml|msg|txt)$/i, '');
          let body = '';
          if (/\.(eml|txt)$/i.test(f.name)) {
            const text = await f.text();
            const m = text.match(/^Subject:\s*(.+)$/im);
            if (m) subject = m[1].trim();
            body = text.slice(0, 5000);
          } else {
            body = `Email file attached: ${f.name}`;
          }
          await postNote({ kind: 'email', subject, body });
        }
        await refresh();
        onChanged && onChanged();
        return;
      }
      const text = e.dataTransfer.getData('text');
      if (text && text.trim()) {
        const subject = text.trim().split('\n')[0].slice(0, 120) || 'Email';
        await postNote({ kind: 'email', subject, body: text.trim().slice(0, 5000) });
        await refresh();
        onChanged && onChanged();
      }
    } catch {
      /* ignore drop errors */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="bg-[#E1F5EE] px-5 py-4 flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-medium text-[#04342C] truncate">{lead.name}</div>
            <div className="text-[12px] text-[#0F6E56] truncate">
              {[lead.phone, lead.email].filter(Boolean).join(' · ') || 'No contact details'}
            </div>
          </div>
          <button onClick={onClose} className="ml-auto text-[#0F6E56] hover:text-[#0a4f3e]"><X className="w-5 h-5" /></button>
        </div>

        {/* Add note + email drop */}
        <div className="px-5 py-4 border-b border-gray-100">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#0F6E56] min-h-[60px]"
          />
          <div className="flex items-center gap-2 mt-2">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex-1 border border-dashed rounded-lg px-3 py-2 text-[12px] flex items-center gap-2 ${dragOver ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-300 text-gray-500'}`}
            >
              <Mail className="w-4 h-4" /> Drag an email here to log it
            </div>
            <button
              onClick={saveNote}
              disabled={saving || !noteText.trim()}
              className="h-9 px-4 rounded-lg bg-[#1D9E75] text-white text-[13px] hover:bg-[#16835f] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-3">Activity</div>
          {loading && <div className="text-[13px] text-gray-500">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="text-[13px] text-gray-500">No activity yet. Add a note or drag in an email.</div>
          )}
          <div className="space-y-3">
            {items.map((it) => {
              const st = KIND_STYLE[it.kind] || KIND_STYLE.other;
              const Icon = st.Icon;
              return (
                <div key={it.id} className="flex gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${st.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${st.fg}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] text-gray-800">
                      {it.kind === 'email' && <span className="text-gray-500">Email — </span>}
                      {it.title || '(no text)'}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {[it.actor, fmtDate(it.at)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
