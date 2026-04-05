// web/client/src/app/src/components/PersonalNotes.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pin, Calendar, Check, Trash2, Edit2, X, ChevronDown,
  StickyNote, Bell, CheckCircle2, Circle,
} from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────────────────
const INPUT_CLS  = 'w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111113] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] transition-colors';
const LABEL_CLS  = 'block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5';
const GOLD_BTN   = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4a017] text-[#111113] text-[13px] font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const OUTLINE_BTN = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] transition-colors';
const GHOST_BTN  = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors';

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const isOverdue = d < now;
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return { label, isOverdue };
}

// ── NoteForm (create / edit) ─────────────────────────────────────────────────
function NoteForm({ initial, onSave, onCancel, saving }) {
  const [title,    setTitle]    = useState(initial?.title    ?? '');
  const [body,     setBody]     = useState(initial?.body     ?? '');
  const [pinned,   setPinned]   = useState(initial?.pinned   ?? false);
  const [dueDate,  setDueDate]  = useState(
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
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm space-y-4">
      <div>
        <label className={LABEL_CLS}>Title</label>
        <input
          className={INPUT_CLS}
          placeholder="Note title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className={LABEL_CLS}>Note</label>
        <textarea
          className={`${INPUT_CLS} resize-none`}
          rows={4}
          placeholder="Write your note..."
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className={LABEL_CLS}>Due date (reminder)</label>
          <input
            type="date"
            className={INPUT_CLS}
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-5">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-[#d4a017]"
            checked={pinned}
            onChange={e => setPinned(e.target.checked)}
          />
          <span className="text-[13px] text-[#374151]">Pin to top</span>
        </label>
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

// ── NoteCard ─────────────────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onTogglePin, onToggleComplete }) {
  const due = formatDueDate(note.due_date);

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${
      note.completed ? 'opacity-60 border-[#e5e7eb]' : note.pinned ? 'border-[#d4a017]/40' : 'border-[#e5e7eb]'
    }`}>
      {/* Top row */}
      <div className="flex items-start gap-2">
        {/* Complete toggle */}
        <button
          onClick={() => onToggleComplete(note)}
          className="mt-0.5 flex-shrink-0 text-[#9ca3af] hover:text-[#d4a017] transition-colors"
          title={note.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {note.completed
            ? <CheckCircle2 className="w-5 h-5 text-[#d4a017]" />
            : <Circle className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          {note.title && (
            <h3 className={`text-[14px] font-semibold text-[#111113] mb-1 ${note.completed ? 'line-through text-[#9ca3af]' : ''}`}>
              {note.title}
            </h3>
          )}
          {note.body && (
            <p className="text-[13px] text-[#6b7280] whitespace-pre-wrap leading-relaxed">{note.body}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onTogglePin(note)} className={GHOST_BTN} title={note.pinned ? 'Unpin' : 'Pin'}>
            <Pin className={`w-4 h-4 ${note.pinned ? 'text-[#d4a017]' : ''}`} />
          </button>
          <button onClick={() => onEdit(note)} className={GHOST_BTN} title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(note.id)} className={`${GHOST_BTN} hover:text-red-500`} title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Due date badge */}
      {due && (
        <div className={`mt-2 ml-7 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
          due.isOverdue && !note.completed
            ? 'bg-red-50 text-red-600'
            : 'bg-[#fef9ec] text-[#92400e]'
        }`}>
          <Bell className="w-3 h-3" />
          {due.isOverdue && !note.completed ? 'Overdue · ' : ''}{due.label}
        </div>
      )}
    </div>
  );
}

// ── PersonalNotes ─────────────────────────────────────────────────────────────
const PersonalNotes = () => {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState('all'); // all | pinned | reminders | completed

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

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch('/api/notes/personal', {
        method: 'POST',
        credentials: 'include',
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
    if (!editingNote) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/personal/${editingNote.id}`, {
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
      await fetch(`/api/notes/personal/${id}`, { method: 'DELETE', credentials: 'include' });
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) { setError(e.message); }
  };

  const handleTogglePin = async (note) => {
    try {
      const res = await fetch(`/api/notes/personal/${note.id}`, {
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

  const handleToggleComplete = async (note) => {
    try {
      const res = await fetch(`/api/notes/personal/${note.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !note.completed }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
    } catch { setError('Failed to update note'); }
  };

  // Filter
  const filtered = notes.filter(n => {
    if (filter === 'pinned')    return n.pinned;
    if (filter === 'reminders') return !!n.due_date && !n.completed;
    if (filter === 'completed') return n.completed;
    return !n.completed; // 'all' hides completed by default
  });

  const overdueCount = notes.filter(n => n.due_date && !n.completed && new Date(n.due_date) < new Date()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a017]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#111113]">My Notes</h2>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Private — only you can see these</p>
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

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-[13px] text-red-700 font-medium">
            {overdueCount} overdue reminder{overdueCount > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setFilter('reminders')}
            className="ml-auto text-[12px] text-red-600 underline hover:no-underline"
          >
            View
          </button>
        </div>
      )}

      {/* New note form */}
      {showForm && (
        <NoteForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Filter tabs */}
      <div className="flex border-b border-[#e5e7eb]">
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
              filter === tab.value
                ? 'border-[#d4a017] text-[#111113]'
                : 'border-transparent text-[#6b7280] hover:text-[#111113]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9ca3af]">
          <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">
            {filter === 'all' ? 'No notes yet. Create your first one above.' : `No ${filter} notes.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            editingNote?.id === note.id ? (
              <NoteForm
                key={note.id}
                initial={note}
                onSave={handleUpdate}
                onCancel={() => setEditingNote(null)}
                saving={saving}
              />
            ) : (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={setEditingNote}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onToggleComplete={handleToggleComplete}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonalNotes;
