// web/client/src/app/src/components/IntegratedCalendar.jsx
// REWRITTEN: Now uses /api/calendar/events for all persistence.
// localStorage bridge removed. All three views (day/week/month) fully functional.
// Ticket scheduled_date entries appear automatically as calendar events.
// Push 3: Restyled to Modern Enterprise design system.

import React, { useState, useEffect, useCallback } from 'react';
import { useSimulation } from '../App.jsx';
import {
  Calendar, Clock, Plus, Edit, Trash2, X, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, User
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(date) {
  // Returns YYYY-MM-DD in local time — avoids UTC-shift bugs
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function trimTime(t) {
  // Postgres TIME columns return HH:MM:SS — trim to HH:MM
  if (!t) return '';
  return t.length > 5 ? t.substring(0, 5) : t;
}

function addOneHour(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const newH = Math.min(h + 1, 23);
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateTimeOptions() {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();
const HOUR_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const h = i + 8; // 08:00 – 17:00
  return `${String(h).padStart(2, '0')}:00`;
});

// ─── event type colours ───────────────────────────────────────────────────────

function eventTypeStyle(eventType) {
  switch (eventType) {
    case 'ticket':    return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'work':      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:          return 'bg-teal-100 text-teal-800 border-teal-200';
  }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── component ────────────────────────────────────────────────────────────────

const IntegratedCalendar = ({ currentUser, onTicketClick }) => {
  const { tickets, users } = useSimulation();

  // ── state ──────────────────────────────────────────────────────────────────
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [viewMode, setViewMode]             = useState('week');

  // modal state
  const [showModal, setShowModal]           = useState(false);
  const [editingEvent, setEditingEvent]     = useState(null); // null = new
  const [selectedEvent, setSelectedEvent]   = useState(null); // detail view
  const [formData, setFormData]             = useState({
    title: '', description: '', eventDate: '', startTime: '09:00',
    endTime: '10:00', notes: '', eventType: 'work'
  });
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState('');

  // ── fetch calendar events ──────────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    try {
      const data = await apiFetch('/api/calendar/events');
      setCalendarEvents(data.events || []);
      setError(null);
    } catch (e) {
      console.error('[IntegratedCalendar] fetch error:', e);
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ── build unified event list ───────────────────────────────────────────────
  // Combines DB calendar_events with ticket scheduled_dates so everything
  // appears on the calendar without any localStorage or polling.
  const allEvents = React.useMemo(() => {
    // 1. Standalone calendar events from DB
    const dbEvents = calendarEvents.map(e => ({
      id: `cal-${e.id}`,
      calendarEventId: e.id,
      title: e.title,
      date: (() => {
        // eventDate may be a full ISO string or just YYYY-MM-DD
        const raw = e.eventDate || '';
        return raw.includes('T') ? raw.split('T')[0] : raw.substring(0, 10);
      })(),
      startTime: trimTime(e.startTime),
      endTime: trimTime(e.endTime),
      notes: e.notes || '',
      description: e.description || '',
      eventType: e.eventType || 'work',
      source: 'calendar',
    }));

    // 2. Ticket-based events — tickets that have a scheduled_date
    const ticketEvents = tickets
      .filter(t => t.scheduled_date)
      .map(t => {
        const raw = t.scheduled_date;
        const dateStr = raw.includes('T') ? raw.split('T')[0] : raw.substring(0, 10);
        const timeStr = raw.includes('T') ? raw.split('T')[1].substring(0, 5) : '09:00';
        const assignedUser = users.find(u => u.id === (t.assignedTo || t.assignee_id));
        return {
          id: `ticket-${t.id}`,
          ticketId: t.id,
          title: t.title,
          date: dateStr,
          startTime: timeStr,
          endTime: addOneHour(timeStr),
          notes: t.description || '',
          description: `Ticket — ${t.status || 'open'} | ${t.priority || 'medium'} priority`,
          eventType: 'ticket',
          assignedUserName: assignedUser?.name || '',
          ticket: t,
          source: 'ticket',
        };
      });

    return [...dbEvents, ...ticketEvents].sort((a, b) =>
      (a.date + a.startTime).localeCompare(b.date + b.startTime)
    );
  }, [calendarEvents, tickets, users]);

  // ── date helpers ───────────────────────────────────────────────────────────
  const getEventsForDate = (date) => {
    const ds = toDateStr(date);
    return allEvents.filter(e => e.date === ds);
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    const dow = start.getDay();
    const diff = dow === 0 ? -6 : 1 - dow; // week starts Monday
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const getMonthDays = () => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    const dow = first.getDay();
    start.setDate(first.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, inMonth: d.getMonth() === m };
    });
  };

  const navigate = (dir) => {
    const d = new Date(selectedDate);
    if (viewMode === 'day')   d.setDate(d.getDate() + dir);
    if (viewMode === 'week')  d.setDate(d.getDate() + dir * 7);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

  const headerLabel = () => {
    if (viewMode === 'day')
      return selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (viewMode === 'week') {
      const days = getWeekDays();
      const s = days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const e = days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${s} – ${e}`;
    }
    return selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  // ── modal helpers ──────────────────────────────────────────────────────────
  const openNew = (date = selectedDate, time = '09:00') => {
    setEditingEvent(null);
    setFormData({
      title: '', description: '', eventDate: toDateStr(date),
      startTime: time, endTime: addOneHour(time),
      notes: '', eventType: 'work'
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setSelectedEvent(null);
    setEditingEvent(ev);
    setFormData({
      title: ev.title,
      description: ev.description || '',
      eventDate: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      notes: ev.notes || '',
      eventType: ev.eventType || 'work',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setFormError('');
  };

  // ── save / delete ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.title.trim()) { setFormError('Title is required'); return; }
    if (!formData.eventDate)    { setFormError('Date is required'); return; }
    if (!formData.startTime)    { setFormError('Start time is required'); return; }
    if (!formData.endTime)      { setFormError('End time is required'); return; }
    if (formData.startTime >= formData.endTime) {
      setFormError('End time must be after start time');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body = {
        title:       formData.title.trim(),
        description: formData.description.trim() || null,
        eventDate:   formData.eventDate,
        startTime:   formData.startTime,
        endTime:     formData.endTime,
        notes:       formData.notes.trim() || null,
        eventType:   formData.eventType,
      };

      if (editingEvent && editingEvent.calendarEventId) {
        await apiFetch(`/api/calendar/events/${editingEvent.calendarEventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      await loadEvents();
      closeModal();
    } catch (e) {
      setFormError(e.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev) => {
    if (!ev.calendarEventId) return;
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    try {
      await apiFetch(`/api/calendar/events/${ev.calendarEventId}`, { method: 'DELETE' });
      await loadEvents();
      setSelectedEvent(null);
    } catch (e) {
      alert('Failed to delete event: ' + e.message);
    }
  };

  // ── render helpers ─────────────────────────────────────────────────────────
  // These are plain functions that return JSX, NOT React components.
  // Defining them as const Foo = () => ... inside this function body would
  // give each a new reference every render, causing React to unmount/remount
  // everything inside them on every state change (destroying input focus etc.).
  const renderEventPill = (event, compact = false) => (
    <div
      key={event.id}
      className={`text-xs px-1 py-0.5 rounded border cursor-pointer hover:opacity-80 truncate ${eventTypeStyle(event.eventType)}`}
      title={`${event.title} ${event.startTime}–${event.endTime}`}
      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
    >
      {!compact && <span className="font-medium">{event.startTime} </span>}
      <span>{event.title}</span>
    </div>
  );

  const isToday = (date) => toDateStr(date) === toDateStr(new Date());

  // ── day view ──────────────────────────────────────────────────────────────
  const renderDayView = () => (
    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
      {HOUR_SLOTS.map(slot => {
        const events = getEventsForDate(selectedDate).filter(
          e => e.startTime <= slot && e.endTime > slot
        );
        return (
          <div key={slot} className="grid grid-cols-12 border-b border-[#e5e7eb] min-h-[56px]">
            <div className="col-span-2 p-2 bg-[#fafafa] text-xs text-[#9ca3af] font-medium border-r border-[#e5e7eb] flex items-start pt-2">
              {slot}
            </div>
            <div
              className="col-span-10 p-1 space-y-1 cursor-pointer hover:bg-[#fef9ee] transition-colors"
              onClick={() => openNew(selectedDate, slot)}
            >
              {events.map(ev => (
                <div
                  key={ev.id}
                  className={`p-2 rounded border text-xs cursor-pointer hover:opacity-80 ${eventTypeStyle(ev.eventType)}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                >
                  <div className="font-medium">{ev.title}</div>
                  <div className="opacity-70">{ev.startTime} – {ev.endTime}</div>
                  {ev.assignedUserName && <div className="opacity-60">{ev.assignedUserName}</div>}
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-[#d1d5db] text-xs p-1">+ add event</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── week view ─────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const days = getWeekDays();
    return (
      <div className="border border-[#e5e7eb] rounded-lg overflow-hidden overflow-x-auto">
        {/* header row */}
        <div className="grid border-b border-[#e5e7eb] bg-[#fafafa]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="p-2 border-r border-[#e5e7eb]" />
          {days.map((d, i) => (
            <div
              key={i}
              className={`p-2 text-center border-r border-[#e5e7eb] text-sm font-medium cursor-pointer hover:bg-[#fef9ee] transition-colors ${isToday(d) ? 'text-[#d4a017]' : 'text-[#374151]'}`}
              onClick={() => { setSelectedDate(d); setViewMode('day'); }}
            >
              <div className="text-[11px] uppercase tracking-wider">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
              <div className={`text-lg font-semibold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full mx-auto
                ${isToday(d) ? 'bg-[#d4a017] text-[#111113]' : ''}`}>
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>
        {/* time rows */}
        {HOUR_SLOTS.map(slot => (
          <div key={slot} className="grid border-b border-[#e5e7eb] min-h-[52px]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="p-1 bg-[#fafafa] text-xs text-[#9ca3af] border-r border-[#e5e7eb] flex items-start pt-1">{slot}</div>
            {days.map((d, i) => {
              const events = getEventsForDate(d).filter(
                e => e.startTime <= slot && e.endTime > slot
              );
              return (
                <div
                  key={i}
                  className="p-0.5 border-r border-[#e5e7eb] space-y-0.5 cursor-pointer hover:bg-[#fef9ee] transition-colors"
                  onClick={() => openNew(d, slot)}
                >
                  {events.map(ev => renderEventPill(ev))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ── month view ────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const days = getMonthDays();
    return (
      <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
        {/* header */}
        <div className="grid grid-cols-7 bg-[#fafafa] border-b border-[#e5e7eb]">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="p-2 text-center text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider border-r border-[#e5e7eb] last:border-r-0">{d}</div>
          ))}
        </div>
        {/* days */}
        <div className="grid grid-cols-7">
          {days.map(({ date, inMonth }, idx) => {
            const events = getEventsForDate(date);
            const todayCell = isToday(date);
            return (
              <div
                key={idx}
                className={`min-h-[100px] p-1 border-r border-b border-[#e5e7eb] cursor-pointer transition-colors
                  ${!inMonth ? 'bg-[#fafafa] text-[#9ca3af]' : 'bg-white hover:bg-[#fef9ee]'}
                  ${todayCell ? 'bg-[#fef9ee]' : ''}`}
                onClick={() => { setSelectedDate(date); setViewMode('day'); }}
              >
                <div className={`text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${todayCell ? 'bg-[#d4a017] text-[#111113]' : inMonth ? 'text-[#111113]' : 'text-[#9ca3af]'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map(ev => renderEventPill(ev, true))}
                  {events.length > 3 && (
                    <div className="text-xs text-[#9ca3af] pl-1">+{events.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── modal ─────────────────────────────────────────────────────────────────
  const renderModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#111113]">
            {editingEvent ? 'Edit Event' : 'New Calendar Event'}
          </h3>
          <button
            onClick={closeModal}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-[#111113] hover:bg-[#f3f4f6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {formError && (
            <div className="bg-red-50 text-red-700 text-sm p-2.5 rounded-lg border border-red-200">{formError}</div>
          )}
          <div>
            <Label htmlFor="ev-title" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Title *</Label>
            <Input
              id="ev-title"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="Event title"
              autoFocus
              className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            />
          </div>
          <div>
            <Label htmlFor="ev-date" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Date *</Label>
            <Input
              id="ev-date"
              type="date"
              value={formData.eventDate}
              onChange={e => setFormData(p => ({ ...p, eventDate: e.target.value }))}
              className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Start time *</Label>
              <Select value={formData.startTime} onValueChange={v => setFormData(p => ({ ...p, startTime: v }))}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">End time *</Label>
              <Select value={formData.endTime} onValueChange={v => setFormData(p => ({ ...p, endTime: v }))}>
                <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Event type</Label>
            <Select value={formData.eventType} onValueChange={v => setFormData(p => ({ ...p, eventType: v }))}>
              <SelectTrigger className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-notes" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Notes</Label>
            <Textarea
              id="ev-notes"
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
              className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#e5e7eb]">
          <button
            onClick={closeModal}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── event detail modal ────────────────────────────────────────────────────
  const renderDetailModal = (ev) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#111113]">Event details</h3>
          <button
            onClick={() => setSelectedEvent(null)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-[#111113] hover:bg-[#f3f4f6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2">
            <Badge className={eventTypeStyle(ev.eventType)}>{ev.eventType}</Badge>
            <span className="font-medium text-[#111113]">{ev.title}</span>
          </div>
          <div className="text-sm space-y-1.5 text-[#6b7280]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(ev.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{ev.startTime} – {ev.endTime}</span>
            </div>
            {ev.assignedUserName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{ev.assignedUserName}</span>
              </div>
            )}
          </div>
          {ev.description && (
            <div className="text-sm text-[#6b7280] bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-3">{ev.description}</div>
          )}
          {ev.notes && (
            <div className="text-sm text-[#6b7280]">{ev.notes}</div>
          )}
          {ev.source === 'ticket' && ev.ticket && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-purple-800">Linked ticket</p>
              <p className="text-purple-600 mt-0.5">Status: {ev.ticket.status} | Priority: {ev.ticket.priority}</p>
            </div>
          )}
        </div>
        <div className="flex justify-between px-5 py-4 border-t border-[#e5e7eb]">
          <div className="flex gap-2">
            {ev.source === 'ticket' && ev.ticket && onTicketClick && (
              <button
                onClick={() => { setSelectedEvent(null); onTicketClick(ev.ticket); }}
                className="px-3 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
              >
                Open ticket
              </button>
            )}
            {ev.source === 'calendar' && (
              <>
                <button
                  onClick={() => openEdit(ev)}
                  className="px-3 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />Edit
                </button>
                <button
                  onClick={() => handleDelete(ev)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />Delete
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setSelectedEvent(null)}
            className="px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:text-[#374151] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // ── upcoming sidebar ──────────────────────────────────────────────────────
  const today = toDateStr(new Date());
  const upcomingEvents = allEvents
    .filter(e => e.date >= today)
    .slice(0, 6);

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden p-4 md:p-6 space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#d4a017]" />
          <h2 className="text-[15px] font-semibold text-[#111113]">Ticket Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* view toggle */}
          <div className="flex border border-[#e5e7eb] rounded-lg overflow-hidden">
            {['day','week','month'].map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors
                  ${viewMode === v
                    ? 'bg-[#d4a017] text-[#111113]'
                    : 'bg-white text-[#6b7280] hover:bg-[#f9fafb]'}`}
              >
                {v}
              </button>
            ))}
          </div>
          {/* navigation */}
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center border border-[#e5e7eb] rounded-lg bg-white text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111113] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1.5 text-xs font-medium border border-[#e5e7eb] rounded-lg bg-white text-[#374151] hover:bg-[#f9fafb] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center border border-[#e5e7eb] rounded-lg bg-white text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111113] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* add button */}
          <button
            onClick={() => openNew()}
            className="px-3 py-1.5 text-xs font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />Add event
          </button>
        </div>
      </div>

      {/* current period label */}
      <div className="text-sm font-medium text-[#374151]">{headerLabel()}</div>

      {/* error */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>
      )}

      {/* loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9ca3af]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a017] mr-3" />
          Loading calendar…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* calendar */}
          <div className="lg:col-span-3">
            {viewMode === 'day'   && renderDayView()}
            {viewMode === 'week'  && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </div>

          {/* sidebar */}
          <div className="space-y-4">
            {/* Upcoming */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#d4a017]" />
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Upcoming</span>
              </div>
              <div className="p-3 space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-[#9ca3af]">No upcoming events</p>
                ) : upcomingEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={`text-xs p-2 rounded border cursor-pointer hover:opacity-80 ${eventTypeStyle(ev.eventType)}`}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="opacity-70 mt-0.5">
                      {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' '}{ev.startTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e5e7eb]">
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Legend</span>
              </div>
              <div className="p-3 space-y-1.5 text-xs text-[#6b7280]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-teal-100 border border-teal-200 inline-block flex-shrink-0" />
                  Calendar event
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200 inline-block flex-shrink-0" />
                  Scheduled ticket
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block flex-shrink-0" />
                  Work event
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* modals */}
      {showModal     && renderModal()}
      {selectedEvent && renderDetailModal(selectedEvent)}
    </div>
  );
};

export default IntegratedCalendar;
