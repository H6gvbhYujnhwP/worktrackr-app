// web/client/src/app/src/components/PersonalNotes.jsx
//
// Workspace › My Notes — private notes with reminders, pin, complete, and
// ticket integration (create-ticket-from-note + add-note-to-ticket) and voice
// dictation. Data: /api/notes/personal (GET/POST/PATCH/DELETE). Ticket flows hit
// /api/tickets and /api/tickets/:id/comments.
//
// v3.8 — DARK reskin only. ALL behaviour is preserved verbatim (every fetch,
// handler, flow and prop is unchanged) — only the styling tokens + classNames
// are darkened. Manus drew a two-pane editor with categories + rich-text; those
// don't exist in the data model and building them would drop the real features
// above, so the existing structure is kept and themed (see roadmap §17).
// Flows verified against mounted routes: GET/POST/PATCH/DELETE /api/notes/personal,
// POST /api/tickets, GET /api/tickets, POST /api/tickets/:id/comments.
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pin, Trash2, Edit2, X,
  StickyNote, Bell, CheckCircle2, Circle,
  TicketIcon, CornerUpRight, Search, Loader2, CheckCircle,
} from 'lucide-react';
import DictationButton from './DictationButton.jsx';
import PageHero, { HeroButtonPrimary } from './PageHero.jsx';

// ── Design tokens (dark) ───────────────────────────────────────────────────
const INPUT_CLS   = 'w-full rounded-md border border-[#2e2e4a] bg-[#242438] px-3 py-2 text-[13px] text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b] transition-colors';
const LABEL_CLS   = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const GOLD_BTN    = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f59e0b] text-[#1a1a2e] text-[13px] font-semibold hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#2e2e4a] bg-[#242438] text-[#cbd5e1] text-[13px] font-medium hover:bg-[#2a2a48] transition-colors';
const GHOST_BTN   = 'inline-flex items-center justify-center w-7 h-7 rounded-md text-[#6b7280] hover:bg-[#2a2a48] hover:text-white transition-colors';

function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const isOverdue = d < new Date();
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return { label, isOverdue };
}

// ── NewTicketFromNoteModal — module-level ─────────────────────────────────────
function NewTicketFromNoteModal({ note, onClose }) {
  const [title,   setTitle]   = useState(note.title || note.body?.slice(0, 80) || 'New ticket');
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(null);
  const [error,   setError]   = useState('');

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: note.body || '', priority: 'medium' }),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      const data = await res.json();
      setSuccess(data.ticket?.id?.slice(0, 8) || 'created');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div className="bg-[#242438] rounded-xl w-full max-w-md shadow-xl border border-[#2e2e4a]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e4a]">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <TicketIcon className="w-4 h-4 text-[#f59e0b]" /> Create ticket from note
          </h3>
          <button onClick={onClose} className={GHOST_BTN}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-10 h-10 text-[#10b981]" />
              <p className="text-[14px] font-medium text-white">Ticket created</p>
              <p className="text-[12px] text-[#94a3b8]">Reference #{success}</p>
              <button className={GOLD_BTN} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div>
                <label className={LABEL_CLS}>Ticket title</label>
                <input className={INPUT_CLS} value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              </div>
              {note.body && (
                <div>
                  <label className={LABEL_CLS}>Description (from note)</label>
                  <div className="rounded-md border border-[#2e2e4a] bg-[#1f1f33] px-3 py-2 text-[13px] text-[#94a3b8] max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {note.body}
                  </div>
                </div>
              )}
              {error && <p className="text-[12px] text-[#fca5a5]">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button className={GOLD_BTN} onClick={handleCreate} disabled={saving || !title.trim()}>
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><TicketIcon className="w-3.5 h-3.5" /> Create ticket</>}
                </button>
                <button className={OUTLINE_BTN} onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AddNoteToTicketModal — module-level ───────────────────────────────────────
function AddNoteToTicketModal({ note, onClose }) {
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    fetch('/api/tickets?limit=50', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setTickets(d.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = tickets.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    const body = note.title
      ? `**${note.title}**\n\n${note.body || ''}`
      : (note.body || '');
    try {
      const res = await fetch(`/api/tickets/${selected}/comments`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, comment_type: 'internal' }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setSuccess(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div className="bg-[#242438] rounded-xl w-full max-w-md shadow-xl border border-[#2e2e4a]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e4a]">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <CornerUpRight className="w-4 h-4 text-[#f59e0b]" /> Add note to ticket
          </h3>
          <button onClick={onClose} className={GHOST_BTN}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-10 h-10 text-[#10b981]" />
              <p className="text-[14px] font-medium text-white">Note added to ticket</p>
              <p className="text-[12px] text-[#94a3b8]">Posted as an internal note</p>
              <button className={GOLD_BTN} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280]" />
                <input
                  className={`${INPUT_CLS} pl-8`}
                  placeholder="Search tickets…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="border border-[#2e2e4a] rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {loading && <p className="text-[13px] text-[#6b7280] text-center py-6">Loading tickets…</p>}
                {!loading && filtered.length === 0 && (
                  <p className="text-[13px] text-[#6b7280] text-center py-6">No tickets found</p>
                )}
                {filtered.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className={`w-full text-left px-4 py-3 border-b border-[#2e2e4a] last:border-0 transition-colors ${
                      selected === t.id ? 'bg-[rgba(245,158,11,0.12)] border-l-2 border-l-[#f59e0b]' : 'hover:bg-[#2a2a48]'
                    }`}
                  >
                    <p className="text-[13px] font-medium text-white truncate">{t.title}</p>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">#{t.id?.slice(0,8)} · {t.status}</p>
                  </button>
                ))}
              </div>
              {error && <p className="text-[12px] text-[#fca5a5]">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button className={GOLD_BTN} onClick={handleAdd} disabled={saving || !selected}>
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><CornerUpRight className="w-3.5 h-3.5" /> Add to ticket</>}
                </button>
                <button className={OUTLINE_BTN} onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NoteForm — module-level, never defined inside a parent function ──────────
function NoteForm({ initial, onSave, onCancel, saving }) {
  const [title,   setTitle]   = useState(initial?.title    ?? '');
  const [body,    setBody]    = useState(initial?.body     ?? '');
  const [pinned,  setPinned]  = useState(initial?.pinned   ?? false);
  const [dueDate, setDueDate] = useState(
    initial?.due_date ? initial.due_date.slice(0, 10) : ''
  );

  const handleSubmit = () => {
    if (!title.trim() && !body.trim()) return;
    onSave({
      title:    title.trim(),
      body:     body.trim(),
      pinned,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });
  };

  return (
    <div className="bg-[#1f1f33] border border-[#2e2e4a] rounded-lg p-4 space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={LABEL_CLS}>Title</label>
          <input
            className={INPUT_CLS}
            placeholder="Note title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="w-44">
          <label className={LABEL_CLS}>Due date</label>
          <input type="date" className={INPUT_CLS} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL_CLS}>Note</label>
        <textarea
          className={`${INPUT_CLS} resize-none`}
          rows={3}
          placeholder="Write your note…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <DictationButton
          dark
          className="mt-2"
          onResult={text => setBody(prev => prev ? prev.trimEnd() + ' ' + text : text)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button className={GOLD_BTN} onClick={handleSubmit} disabled={saving || (!title.trim() && !body.trim())}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add note'}
        </button>
        <button className={OUTLINE_BTN} onClick={onCancel}>Cancel</button>
        <label className="flex items-center gap-2 cursor-pointer ml-2">
          <input type="checkbox" className="w-4 h-4 rounded accent-[#f59e0b]" checked={pinned} onChange={e => setPinned(e.target.checked)} />
          <span className="text-[13px] text-[#cbd5e1]">Pin to top</span>
        </label>
      </div>
    </div>
  );
}

// ── NoteRow — module-level ───────────────────────────────────────────────────
function NoteRow({ note, isExpanded, onExpand, onSave, onDelete, onTogglePin, onToggleComplete, onCreateTicket, onAddToTicket, saving }) {
  const due = formatDueDate(note.due_date);

  return (
    <>
      <tr className={`border-b border-[#2e2e4a] transition-colors ${note.pinned ? 'bg-[rgba(245,158,11,0.06)]' : 'hover:bg-[#2a2a48]'} ${note.completed ? 'opacity-50' : ''}`}>

        {/* Complete toggle */}
        <td className="w-8 pl-3 py-2.5">
          <button onClick={() => onToggleComplete(note)} className="text-[#6b7280] hover:text-[#f59e0b] transition-colors" title={note.completed ? 'Mark incomplete' : 'Mark complete'}>
            {note.completed
              ? <CheckCircle2 className="w-4 h-4 text-[#f59e0b]" />
              : <Circle className="w-4 h-4" />}
          </button>
        </td>

        {/* Title + body preview */}
        <td className="py-2.5 px-3 min-w-0 max-w-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {note.pinned && <Pin className="w-3 h-3 text-[#f59e0b] flex-shrink-0" />}
            <span className={`text-[13px] font-medium truncate ${note.completed ? 'line-through text-[#6b7280]' : 'text-white'}`}>
              {note.title || <span className="font-normal italic text-[#6b7280]">Untitled</span>}
            </span>
            {note.body && (
              <span className="text-[12px] text-[#6b7280] truncate hidden sm:block flex-shrink min-w-0">
                — {note.body}
              </span>
            )}
          </div>
        </td>

        {/* Due date */}
        <td className="py-2.5 px-3 w-36 whitespace-nowrap">
          {due ? (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${due.isOverdue && !note.completed ? 'bg-[rgba(239,68,68,0.18)] text-[#fca5a5]' : 'bg-[rgba(245,158,11,0.18)] text-[#fcd34d]'}`}>
              <Bell className="w-3 h-3 flex-shrink-0" />
              {due.isOverdue && !note.completed ? 'Overdue' : due.label}
            </span>
          ) : (
            <span className="text-[12px] text-[#4b5563]">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="py-2.5 pr-3 w-32">
          <div className="flex items-center justify-end gap-0.5">
            <button onClick={() => onCreateTicket(note)} className={GHOST_BTN} title="Create ticket from note">
              <TicketIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onAddToTicket(note)} className={GHOST_BTN} title="Add to existing ticket">
              <CornerUpRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onTogglePin(note)} className={GHOST_BTN} title={note.pinned ? 'Unpin' : 'Pin'}>
              <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'text-[#f59e0b]' : ''}`} />
            </button>
            <button onClick={() => onExpand(note)} className={GHOST_BTN} title="Edit">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(note.id)} className={`${GHOST_BTN} hover:text-[#fca5a5]`} title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Inline expanded edit form */}
      {isExpanded && (
        <tr className="border-b border-[#2e2e4a]">
          <td colSpan={4} className="px-3 py-3 bg-[#242438]">
            <NoteForm
              initial={note}
              onSave={onSave}
              onCancel={() => onExpand(null)}
              saving={saving}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── PersonalNotes ──────────────────────────────────────────────────────────────
const PersonalNotes = () => {
  const [notes,       setNotes]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [filter,      setFilter]      = useState('all');
  const [newTicketNote, setNewTicketNote] = useState(null);
  const [addToTicketNote, setAddToTicketNote] = useState(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes/personal', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Refresh when VoiceAssistant creates a personal note
  useEffect(() => {
    const handler = () => fetchNotes();
    window.addEventListener('worktrackr:personal-note-created', handler);
    return () => window.removeEventListener('worktrackr:personal-note-created', handler);
  }, [fetchNotes]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch('/api/notes/personal', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create note');
      const data = await res.json();
      setNotes(prev => [data.note, ...prev]);
      setShowForm(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (payload) => {
    if (!expandedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/personal/${expandedId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update note');
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
      setExpandedId(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await fetch(`/api/notes/personal/${id}`, { method: 'DELETE', credentials: 'include' });
      setNotes(prev => prev.filter(n => n.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e) { setError(e.message); }
  };

  const handleTogglePin = async (note) => {
    try {
      const res = await fetch(`/api/notes/personal/${note.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
    } catch { setError('Failed to update note'); }
  };

  const handleToggleComplete = async (note) => {
    try {
      const res = await fetch(`/api/notes/personal/${note.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !note.completed }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
    } catch { setError('Failed to update note'); }
  };

  const handleExpand = (note) => setExpandedId(note ? (expandedId === note.id ? null : note.id) : null);

  const filtered = notes.filter(n => {
    if (filter === 'pinned')    return n.pinned;
    if (filter === 'reminders') return !!n.due_date && !n.completed;
    if (filter === 'completed') return n.completed;
    return !n.completed;
  });

  const overdueCount = notes.filter(n => n.due_date && !n.completed && new Date(n.due_date) < new Date()).length;

  if (loading) {
    return (
      <div className="min-h-full bg-[#1a1a2e] flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#1a1a2e] p-5 md:p-7">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Modals */}
        {newTicketNote && (
          <NewTicketFromNoteModal note={newTicketNote} onClose={() => setNewTicketNote(null)} />
        )}
        {addToTicketNote && (
          <AddNoteToTicketModal note={addToTicketNote} onClose={() => setAddToTicketNote(null)} />
        )}

        {/* Header */}
        <PageHero
          title="My Notes"
          icon={StickyNote}
          meta={[{ label: 'Private — only you can see these' }]}
          actions={!showForm ? (
            <HeroButtonPrimary icon={Plus} onClick={() => { setShowForm(true); setExpandedId(null); }}>New note</HeroButtonPrimary>
          ) : null}
          compact
        />

        {/* Error */}
        {error && (
          <div className="bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.4)] rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] text-[#fca5a5]">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4 text-[#fca5a5]" /></button>
          </div>
        )}

        {/* Overdue banner */}
        {overdueCount > 0 && (
          <div className="bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.4)] rounded-lg px-4 py-2.5 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
            <span className="text-[13px] text-[#fca5a5] font-medium">
              {overdueCount} overdue reminder{overdueCount > 1 ? 's' : ''}
            </span>
            <button onClick={() => setFilter('reminders')} className="ml-auto text-[12px] text-[#fca5a5] underline hover:no-underline">
              View
            </button>
          </div>
        )}

        {/* New note form */}
        {showForm && (
          <NoteForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
        )}

        {/* Filter tabs */}
        <div className="flex border-b border-[#2e2e4a]">
          {[
            { value: 'all',       label: 'Active' },
            { value: 'pinned',    label: 'Pinned' },
            { value: 'reminders', label: 'Reminders' },
            { value: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                filter === tab.value ? 'border-[#f59e0b] text-white' : 'border-transparent text-[#94a3b8] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#6b7280]">
            <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-[14px]">{filter === 'all' ? 'No notes yet. Create your first one above.' : `No ${filter} notes.`}</p>
          </div>
        ) : (
          <div className="bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-[#1f1f33] border-b border-[#2e2e4a]">
                  <th className="w-8 pl-3 py-2" />
                  <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Note</th>
                  <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider w-36">Due</th>
                  <th className="w-32 pr-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(note => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    isExpanded={expandedId === note.id}
                    onExpand={handleExpand}
                    onSave={handleUpdate}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    onToggleComplete={handleToggleComplete}
                    onCreateTicket={setNewTicketNote}
                    onAddToTicket={setAddToTicketNote}
                    saving={saving}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalNotes;
