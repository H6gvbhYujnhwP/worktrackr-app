// web/client/src/app/src/components/CompanyNotes.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pin, Trash2, Edit2, X, Tag, BookOpen,
  Megaphone, StickyNote, ChevronDown, History,
  TicketIcon, CornerUpRight, Search, Loader2, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import DictationButton from './DictationButton.jsx';

// ── Design tokens ──────────────────────────────────────────────────────────
const INPUT_CLS   = 'w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111113] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] transition-colors';
const LABEL_CLS   = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const GOLD_BTN    = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-[#111113] text-[13px] font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors';
const GHOST_BTN   = 'inline-flex items-center justify-center w-7 h-7 rounded-md text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors';

const NOTE_TYPE_META = {
  note:         { label: 'Note',         icon: StickyNote, badge: 'bg-[#f3f4f6] text-[#374151]'  },
  knowledge:    { label: 'Knowledge',    icon: BookOpen,   badge: 'bg-[#dbeafe] text-[#1e40af]'  },
  announcement: { label: 'Announcement', icon: Megaphone,  badge: 'bg-[#fef3c7] text-[#92400e]'  },
};

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-[#e5e7eb]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[14px] font-bold text-[#111113] flex items-center gap-2">
            <TicketIcon className="w-4 h-4 text-[#d4a017]" /> Create ticket from note
          </h3>
          <button onClick={onClose} className={GHOST_BTN}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="text-[14px] font-medium text-[#111113]">Ticket created</p>
              <p className="text-[12px] text-[#6b7280]">Reference #{success}</p>
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
                  <div className="rounded-md border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[13px] text-[#6b7280] max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {note.body}
                  </div>
                </div>
              )}
              {error && <p className="text-[12px] text-red-600">{error}</p>}
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-[#e5e7eb]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[14px] font-bold text-[#111113] flex items-center gap-2">
            <CornerUpRight className="w-4 h-4 text-[#d4a017]" /> Add note to ticket
          </h3>
          <button onClick={onClose} className={GHOST_BTN}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="text-[14px] font-medium text-[#111113]">Note added to ticket</p>
              <p className="text-[12px] text-[#6b7280]">Posted as an internal note</p>
              <button className={GOLD_BTN} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
                <input
                  className={`${INPUT_CLS} pl-8`}
                  placeholder="Search tickets…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="border border-[#e5e7eb] rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {loading && <p className="text-[13px] text-[#9ca3af] text-center py-6">Loading tickets…</p>}
                {!loading && filtered.length === 0 && (
                  <p className="text-[13px] text-[#9ca3af] text-center py-6">No tickets found</p>
                )}
                {filtered.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className={`w-full text-left px-4 py-3 border-b border-[#f3f4f6] last:border-0 transition-colors ${
                      selected === t.id ? 'bg-[#fef9ec] border-l-2 border-l-[#d4a017]' : 'hover:bg-[#fafafa]'
                    }`}
                  >
                    <p className="text-[13px] font-medium text-[#111113] truncate">{t.title}</p>
                    <p className="text-[11px] text-[#9ca3af] mt-0.5">#{t.id?.slice(0,8)} · {t.status}</p>
                  </button>
                ))}
              </div>
              {error && <p className="text-[12px] text-red-600">{error}</p>}
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

// ── VersionsPanel — module-level ─────────────────────────────────────────────
function VersionsPanel({ noteId, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`/api/notes/shared/${noteId}/versions`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setVersions(d.versions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [noteId]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-bold text-[#111113] flex items-center gap-2">
            <History className="w-4 h-4" /> Version history
          </h3>
          <button onClick={onClose} className={GHOST_BTN}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <p className="text-[13px] text-[#9ca3af] text-center py-8">Loading…</p>}
          {!loading && versions.length === 0 && (
            <p className="text-[13px] text-[#9ca3af] text-center py-8">No previous versions.</p>
          )}
          {versions.map((v, i) => (
            <div key={v.id} className="border border-[#e5e7eb] rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f9fafb] transition-colors"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#111113]">{v.title || '(no title)'}</p>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">
                    Edited by {v.edited_by_name} · {formatTime(v.edited_at)}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#9ca3af] transition-transform ${expanded === i ? 'rotate-180' : ''}`} />
              </button>
              {expanded === i && (
                <div className="px-4 pb-4 border-t border-[#f3f4f6]">
                  <p className="text-[13px] text-[#6b7280] whitespace-pre-wrap mt-3 leading-relaxed">
                    {v.body || '(empty)'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SharedNoteForm — module-level ─────────────────────────────────────────────
function SharedNoteForm({ initial, isAdmin, categories, onSave, onCancel, saving }) {
  const [title,    setTitle]    = useState(initial?.title    ?? '');
  const [body,     setBody]     = useState(initial?.body     ?? '');
  const [noteType, setNoteType] = useState(initial?.note_type ?? 'note');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [newCat,   setNewCat]   = useState('');
  const [pinned,   setPinned]   = useState(initial?.pinned   ?? false);

  const handleSubmit = () => {
    if (!title.trim() && !body.trim()) return;
    onSave({
      title:     title.trim(),
      body:      body.trim(),
      note_type: isAdmin ? noteType : 'note',
      category:  (newCat.trim() || category) || null,
      pinned:    isAdmin ? pinned : false,
    });
  };

  return (
    <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-4 space-y-3">

      {/* Type pill selector — prominent so it can't be missed */}
      {isAdmin && (
        <div>
          <label className={LABEL_CLS}>Type</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'note',         label: 'General note',   icon: StickyNote },
              { value: 'knowledge',    label: 'Knowledge base',  icon: BookOpen   },
              { value: 'announcement', label: 'Announcement',    icon: Megaphone  },
            ].map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNoteType(opt.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors ${
                    noteType === opt.value
                      ? 'bg-[#d4a017] border-[#d4a017] text-[#111113]'
                      : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db] hover:text-[#374151]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={LABEL_CLS}>Title</label>
          <input className={INPUT_CLS} placeholder="Note title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>
      </div>
      <div>
        <label className={LABEL_CLS}>Content</label>
        <textarea className={`${INPUT_CLS} resize-none`} rows={3} placeholder="Write your note…" value={body} onChange={e => setBody(e.target.value)} />
        <DictationButton
          className="mt-2"
          onResult={text => setBody(prev => prev ? prev.trimEnd() + ' ' + text : text)}
        />
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className={LABEL_CLS}>Category</label>
          <input
            className={INPUT_CLS}
            placeholder={categories.length > 0 ? 'Type or pick a category…' : 'Category (optional)'}
            value={newCat || category}
            onChange={e => { setNewCat(e.target.value); setCategory(''); }}
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 cursor-pointer pb-2 whitespace-nowrap">
            <input type="checkbox" className="w-4 h-4 rounded accent-[#d4a017]" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            <span className="text-[13px] text-[#374151]">Pin as announcement</span>
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className={GOLD_BTN} onClick={handleSubmit} disabled={saving || (!title.trim() && !body.trim())}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add note'}
        </button>
        <button className={OUTLINE_BTN} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── SharedNoteRow — module-level ─────────────────────────────────────────────
function SharedNoteRow({ note, isExpanded, isAdmin, currentUserId, categories, onExpand, onSave, onDelete, onTogglePin, onViewHistory, onCreateTicket, onAddToTicket, saving }) {
  const meta = NOTE_TYPE_META[note.note_type] || NOTE_TYPE_META.note;
  const TypeIcon = meta.icon;
  const canDelete = isAdmin || note.author_id === currentUserId;

  return (
    <>
      <tr className={`border-b border-[#f3f4f6] transition-colors ${note.pinned ? 'bg-[#fffdf5]' : 'hover:bg-[#fafafa]'}`}>

        {/* Type badge */}
        <td className="pl-3 py-2.5 w-28">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
            <TypeIcon className="w-3 h-3 flex-shrink-0" />
            {meta.label}
          </span>
        </td>

        {/* Title + body preview */}
        <td className="py-2.5 px-3 min-w-0 max-w-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {note.pinned && <Pin className="w-3 h-3 text-[#d4a017] flex-shrink-0" />}
            <span className="text-[13px] font-medium text-[#111113] truncate">
              {note.title || <span className="font-normal italic text-[#9ca3af]">Untitled</span>}
            </span>
            {note.body && (
              <span className="text-[12px] text-[#9ca3af] truncate hidden sm:block flex-shrink min-w-0">
                — {note.body}
              </span>
            )}
          </div>
        </td>

        {/* Category */}
        <td className="py-2.5 px-3 w-32 whitespace-nowrap">
          {note.category ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#6b7280] font-medium px-2 py-0.5 rounded-full bg-white border border-[#e5e7eb]">
              <Tag className="w-3 h-3" />{note.category}
            </span>
          ) : (
            <span className="text-[12px] text-[#d1d5db]">—</span>
          )}
        </td>

        {/* Author + date */}
        <td className="py-2.5 px-3 w-40 whitespace-nowrap">
          <p className="text-[12px] text-[#6b7280] truncate">{note.author_name}</p>
          <p className="text-[11px] text-[#9ca3af]">{formatTime(note.updated_at)}</p>
        </td>

        {/* Actions */}
        <td className="py-2.5 pr-3 w-36">
          <div className="flex items-center justify-end gap-0.5">
            <button onClick={() => onCreateTicket(note)} className={GHOST_BTN} title="Create ticket from note">
              <TicketIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onAddToTicket(note)} className={GHOST_BTN} title="Add to existing ticket">
              <CornerUpRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onViewHistory(note.id)} className={GHOST_BTN} title="Version history">
              <History className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button onClick={() => onTogglePin(note)} className={GHOST_BTN} title={note.pinned ? 'Unpin' : 'Pin'}>
                <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'text-[#d4a017]' : ''}`} />
              </button>
            )}
            <button onClick={() => onExpand(note)} className={GHOST_BTN} title="Edit">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {canDelete && (
              <button onClick={() => onDelete(note.id)} className={`${GHOST_BTN} hover:text-red-500`} title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Inline expanded edit form */}
      {isExpanded && (
        <tr className="border-b border-[#e5e7eb]">
          <td colSpan={5} className="px-3 py-3 bg-white">
            <SharedNoteForm
              initial={note}
              isAdmin={isAdmin}
              categories={categories}
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

// ── CompanyNotes ──────────────────────────────────────────────────────────────
const CompanyNotes = () => {
  const { user, membership } = useAuth();
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
  const currentUserId = user?.id;

  const [notes,          setNotes]          = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [showForm,       setShowForm]       = useState(false);
  const [expandedId,     setExpandedId]     = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [filterType,     setFilterType]     = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [historyNoteId,  setHistoryNoteId]  = useState(null);
  const [newTicketNote,  setNewTicketNote]  = useState(null);
  const [addToTicketNote,setAddToTicketNote]= useState(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('note_type', filterType);
      if (filterCategory)       params.set('category', filterCategory);
      const res = await fetch(`/api/notes/shared?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notes');
      const data = await res.json();
      setNotes(data.notes || []);
      setCategories(data.categories || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch('/api/notes/shared', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create note');
      const data = await res.json();
      setNotes(prev => [data.note, ...prev]);
      if (data.note.category && !categories.includes(data.note.category)) {
        setCategories(prev => [...prev, data.note.category].sort());
      }
      setShowForm(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (payload) => {
    if (!expandedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/shared/${expandedId}`, {
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
      await fetch(`/api/notes/shared/${id}`, { method: 'DELETE', credentials: 'include' });
      setNotes(prev => prev.filter(n => n.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e) { setError(e.message); }
  };

  const handleTogglePin = async (note) => {
    try {
      const res = await fetch(`/api/notes/shared/${note.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
    } catch { setError('Failed to update note'); }
  };

  const handleExpand = (note) => setExpandedId(note ? (expandedId === note.id ? null : note.id) : null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a017]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* History modal */}
      {historyNoteId && (
        <VersionsPanel noteId={historyNoteId} onClose={() => setHistoryNoteId(null)} />
      )}

      {/* Ticket modals */}
      {newTicketNote && (
        <NewTicketFromNoteModal note={newTicketNote} onClose={() => setNewTicketNote(null)} />
      )}
      {addToTicketNote && (
        <AddNoteToTicketModal note={addToTicketNote} onClose={() => setAddToTicketNote(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#111113]">Company Notes</h2>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Shared with all staff</p>
        </div>
        {!showForm && (
          <button className={GOLD_BTN} onClick={() => { setShowForm(true); setExpandedId(null); }}>
            <Plus className="w-4 h-4" /> New note
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-[13px] text-red-700">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* New note form — defaults to the active tab's type so context is preserved */}
      {showForm && (
        <SharedNoteForm
          initial={{ note_type: filterType === 'all' ? 'note' : filterType }}
          isAdmin={isAdmin}
          categories={categories}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border-b border-[#e5e7eb]">
          {[
            { value: 'all',          label: 'All' },
            { value: 'note',         label: 'General' },
            { value: 'knowledge',    label: 'Knowledge' },
            { value: 'announcement', label: 'Announcements' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                filterType === tab.value ? 'border-[#d4a017] text-[#111113]' : 'border-transparent text-[#6b7280] hover:text-[#111113]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <select
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {notes.length === 0 ? (
        <div className="text-center py-16 text-[#9ca3af]">
          <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No notes yet. Be the first to add one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
                <th className="text-left pl-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider w-28">Type</th>
                <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Note</th>
                <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider w-32">Category</th>
                <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider w-40">Author</th>
                <th className="w-36 pr-3" />
              </tr>
            </thead>
            <tbody>
              {notes.map(note => (
                <SharedNoteRow
                  key={note.id}
                  note={note}
                  isExpanded={expandedId === note.id}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  categories={categories}
                  onExpand={handleExpand}
                  onSave={handleUpdate}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  onViewHistory={setHistoryNoteId}
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
  );
};

export default CompanyNotes;
