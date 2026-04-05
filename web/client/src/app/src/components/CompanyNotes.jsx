// web/client/src/app/src/components/CompanyNotes.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pin, Trash2, Edit2, X, Tag, BookOpen,
  Megaphone, StickyNote, ChevronDown, Clock, History,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider.jsx';

// ── Design tokens ──────────────────────────────────────────────────────────
const INPUT_CLS   = 'w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111113] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] transition-colors';
const LABEL_CLS   = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const GOLD_BTN    = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-[#111113] text-[13px] font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors';
const GHOST_BTN   = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors';

const NOTE_TYPE_META = {
  note:         { label: 'Note',         icon: StickyNote, bg: 'bg-[#f9fafb]',  badge: 'bg-[#f3f4f6] text-[#374151]'  },
  knowledge:    { label: 'Knowledge',    icon: BookOpen,   bg: 'bg-[#eff6ff]',  badge: 'bg-[#dbeafe] text-[#1e40af]'  },
  announcement: { label: 'Announcement', icon: Megaphone,  bg: 'bg-[#fef9ec]',  badge: 'bg-[#fef3c7] text-[#92400e]'  },
};

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── VersionsPanel ────────────────────────────────────────────────────────────
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

// ── SharedNoteForm ────────────────────────────────────────────────────────────
function SharedNoteForm({ initial, isAdmin, categories, onSave, onCancel, saving }) {
  const [title,    setTitle]    = useState(initial?.title    ?? '');
  const [body,     setBody]     = useState(initial?.body     ?? '');
  const [noteType, setNoteType] = useState(initial?.note_type ?? 'note');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [newCat,   setNewCat]   = useState('');
  const [pinned,   setPinned]   = useState(initial?.pinned   ?? false);

  const effectiveCategory = newCat.trim() || category;

  const handleSubmit = () => {
    if (!title.trim() && !body.trim()) return;
    onSave({
      title:     title.trim(),
      body:      body.trim(),
      note_type: isAdmin ? noteType : 'note',
      category:  effectiveCategory || null,
      pinned:    isAdmin ? pinned : false,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm space-y-4">
      <div>
        <label className={LABEL_CLS}>Title</label>
        <input
          className={INPUT_CLS}
          placeholder="Note title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className={LABEL_CLS}>Content</label>
        <textarea
          className={`${INPUT_CLS} resize-none`}
          rows={5}
          placeholder="Write your note…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Type — admin only */}
        {isAdmin && (
          <div className="flex-1 min-w-[160px]">
            <label className={LABEL_CLS}>Type</label>
            <select
              className={INPUT_CLS}
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
            >
              <option value="note">Note</option>
              <option value="knowledge">Knowledge base</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>
        )}

        {/* Category */}
        <div className="flex-1 min-w-[160px]">
          <label className={LABEL_CLS}>Category</label>
          {categories.length > 0 && !newCat ? (
            <select
              className={INPUT_CLS}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">— Select or type new —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : null}
          <input
            className={`${INPUT_CLS} ${categories.length > 0 && !newCat ? 'mt-1.5' : ''}`}
            placeholder={categories.length > 0 ? 'Or type a new category…' : 'Category (optional)'}
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
          />
        </div>

        {/* Pin — admin only */}
        {isAdmin && (
          <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-[#d4a017]"
              checked={pinned}
              onChange={e => setPinned(e.target.checked)}
            />
            <span className="text-[13px] text-[#374151]">Pin as announcement</span>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button className={GOLD_BTN} onClick={handleSubmit} disabled={saving || (!title.trim() && !body.trim())}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add note'}
        </button>
        <button className={OUTLINE_BTN} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── SharedNoteCard ────────────────────────────────────────────────────────────
function SharedNoteCard({ note, isAdmin, currentUserId, onEdit, onDelete, onTogglePin, onViewHistory }) {
  const meta = NOTE_TYPE_META[note.note_type] || NOTE_TYPE_META.note;
  const TypeIcon = meta.icon;
  const canDelete = isAdmin || note.author_id === currentUserId;

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${note.pinned ? 'border-[#d4a017]/50' : 'border-[#e5e7eb]'} ${meta.bg}`}>
      {/* Pinned banner */}
      {note.pinned && (
        <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-[#92400e] uppercase tracking-wider">
          <Pin className="w-3 h-3" /> Pinned announcement
        </div>
      )}

      {/* Type + category badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
          <TypeIcon className="w-3 h-3" />
          {meta.label}
        </span>
        {note.category && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white border border-[#e5e7eb] text-[#6b7280]">
            <Tag className="w-3 h-3" />
            {note.category}
          </span>
        )}
      </div>

      {/* Title + body */}
      {note.title && (
        <h3 className="text-[14px] font-semibold text-[#111113] mb-1">{note.title}</h3>
      )}
      {note.body && (
        <p className="text-[13px] text-[#374151] whitespace-pre-wrap leading-relaxed">{note.body}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
        <div className="text-[11px] text-[#9ca3af]">
          <span className="font-medium text-[#6b7280]">{note.author_name}</span>
          {note.last_edited_by && note.last_edited_by !== note.author_id && (
            <> · edited by <span className="font-medium text-[#6b7280]">{note.last_edited_by_name}</span></>
          )}
          <> · {formatTime(note.updated_at)}</>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={() => onViewHistory(note.id)} className={GHOST_BTN} title="Version history">
            <History className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => onTogglePin(note)} className={GHOST_BTN} title={note.pinned ? 'Unpin' : 'Pin'}>
              <Pin className={`w-4 h-4 ${note.pinned ? 'text-[#d4a017]' : ''}`} />
            </button>
          )}
          <button onClick={() => onEdit(note)} className={GHOST_BTN} title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          {canDelete && (
            <button onClick={() => onDelete(note.id)} className={`${GHOST_BTN} hover:text-red-500`} title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CompanyNotes ──────────────────────────────────────────────────────────────
const CompanyNotes = () => {
  const { user, membership } = useAuth();
  const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
  const currentUserId = user?.id;

  const [notes,      setNotes]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [editingNote,   setEditingNote]   = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [filterType,    setFilterType]    = useState('all');
  const [filterCategory,setFilterCategory]= useState('');
  const [historyNoteId, setHistoryNoteId] = useState(null);

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
        method: 'POST',
        credentials: 'include',
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
    if (!editingNote) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/shared/${editingNote.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update note');
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
      setEditingNote(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await fetch(`/api/notes/shared/${id}`, { method: 'DELETE', credentials: 'include' });
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) { setError(e.message); }
  };

  const handleTogglePin = async (note) => {
    try {
      const res = await fetch(`/api/notes/shared/${note.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
    } catch { setError('Failed to update note'); }
  };

  // Separate pinned announcements from the rest
  const announcements = notes.filter(n => n.pinned && n.note_type === 'announcement');
  const rest          = notes.filter(n => !(n.pinned && n.note_type === 'announcement'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a017]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* History modal */}
      {historyNoteId && (
        <VersionsPanel noteId={historyNoteId} onClose={() => setHistoryNoteId(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#111113]">Company Notes</h2>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Shared with all staff</p>
        </div>
        {!showForm && !editingNote && (
          <button className={GOLD_BTN} onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New note
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-[13px] text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New note form */}
      {showForm && (
        <SharedNoteForm
          isAdmin={isAdmin}
          categories={categories}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex border-b border-[#e5e7eb]">
          {[
            { value: 'all',          label: 'All' },
            { value: 'note',         label: 'Notes' },
            { value: 'knowledge',    label: 'Knowledge' },
            { value: 'announcement', label: 'Announcements' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                filterType === tab.value
                  ? 'border-[#d4a017] text-[#111113]'
                  : 'border-transparent text-[#6b7280] hover:text-[#111113]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <select
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Pinned announcements first */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map(note => (
            editingNote?.id === note.id ? (
              <SharedNoteForm
                key={note.id}
                initial={note}
                isAdmin={isAdmin}
                categories={categories}
                onSave={handleUpdate}
                onCancel={() => setEditingNote(null)}
                saving={saving}
              />
            ) : (
              <SharedNoteCard
                key={note.id}
                note={note}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onEdit={setEditingNote}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onViewHistory={setHistoryNoteId}
              />
            )
          ))}
        </div>
      )}

      {/* Rest of notes */}
      {rest.length === 0 && announcements.length === 0 ? (
        <div className="text-center py-16 text-[#9ca3af]">
          <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No notes yet. Be the first to add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rest.map(note => (
            editingNote?.id === note.id ? (
              <SharedNoteForm
                key={note.id}
                initial={note}
                isAdmin={isAdmin}
                categories={categories}
                onSave={handleUpdate}
                onCancel={() => setEditingNote(null)}
                saving={saving}
              />
            ) : (
              <SharedNoteCard
                key={note.id}
                note={note}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onEdit={setEditingNote}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onViewHistory={setHistoryNoteId}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyNotes;
