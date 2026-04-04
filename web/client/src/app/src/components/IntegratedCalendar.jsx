// web/client/src/app/src/components/IntegratedCalendar.jsx
// REWRITTEN: Now uses /api/calendar/events for all persistence.
// localStorage bridge removed. All three views (day/week/month) fully functional.
// Ticket scheduled_date entries appear automatically as calendar events.

import React, { useState, useEffect, useCallback } from 'react';
import { useSimulation } from '../App.jsx';
import {
  Calendar, Clock, Plus, Edit, Trash2, X, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
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
    <div className="border rounded-lg overflow-hidden">
      {HOUR_SLOTS.map(slot => {
        const events = getEventsForDate(selectedDate).filter(
          e => e.startTime <= slot && e.endTime > slot
        );
        return (
          <div key={slot} className="grid grid-cols-12 border-b min-h-[56px]">
            <div className="col-span-2 p-2 bg-gray-50 text-xs text-gray-500 font-medium border-r flex items-start pt-2">
              {slot}
            </div>
            <div
              className="col-span-10 p-1 space-y-1 cursor-pointer hover:bg-gray-50"
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
                <div className="text-gray-300 text-xs p-1">+ add event</div>
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
      <div className="border rounded-lg overflow-hidden overflow-x-auto">
        {/* header row */}
        <div className="grid border-b bg-gray-50" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="p-2 border-r" />
          {days.map((d, i) => (
            <div
              key={i}
              className={`p-2 text-center border-r text-sm font-medium cursor-pointer hover:bg-gray-100 ${isToday(d) ? 'text-blue-600' : 'text-gray-700'}`}
              onClick={() => { setSelectedDate(d); setViewMode('day'); }}
            >
              <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
              <div className={`text-lg ${isToday(d) ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>
        {/* time rows */}
        {HOUR_SLOTS.map(slot => (
          <div key={slot} className="grid border-b min-h-[52px]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="p-1 bg-gray-50 text-xs text-gray-500 border-r flex items-start pt-1">{slot}</div>
            {days.map((d, i) => {
              const events = getEventsForDate(d).filter(
                e => e.startTime <= slot && e.endTime > slot
              );
              return (
                <div
                  key={i}
                  className="p-0.5 border-r space-y-0.5 cursor-pointer hover:bg-gray-50"
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
      <div className="border rounded-lg overflow-hidden">
        {/* header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-gray-500 border-r last:border-r-0">{d}</div>
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
                className={`min-h-[100px] p-1 border-r border-b cursor-pointer hover:bg-gray-50
                  ${!inMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  ${todayCell ? 'bg-blue-50' : ''}`}
                onClick={() => { setSelectedDate(date); setViewMode('day'); }}
              >
                <div className={`text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${todayCell ? 'bg-blue-600 text-white' : inMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map(ev => renderEventPill(ev, true))}
                  {events.length > 3 && (
                    <div className="text-xs text-gray-400 pl-1">+{events.length - 3} more</div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {editingEvent ? 'Edit Event' : 'New Calendar Event'}
          </h3>
          <Button variant="ghost" size="sm" onClick={closeModal}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-4 space-y-3">
          {formError && (
            <div className="bg-red-50 text-red-700 text-sm p-2 rounded border border-red-200">{formError}</div>
          )}
          <div>
            <Label htmlFor="ev-title">Title *</Label>
            <Input
              id="ev-title"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="Event title"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="ev-date">Date *</Label>
            <Input
              id="ev-date"
              type="date"
              value={formData.eventDate}
              onChange={e => setFormData(p => ({ ...p, eventDate: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start time *</Label>
              <Select value={formData.startTime} onValueChange={v => setFormData(p => ({ ...p, startTime: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End time *</Label>
              <Select value={formData.endTime} onValueChange={v => setFormData(p => ({ ...p, endTime: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Event type</Label>
            <Select value={formData.eventType} onValueChange={v => setFormData(p => ({ ...p, eventType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-notes">Notes</Label>
            <Textarea
              id="ev-notes"
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── event detail modal ────────────────────────────────────────────────────
  const renderDetailModal = (ev) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Event details</h3>
          <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Badge className={eventTypeStyle(ev.eventType)}>{ev.eventType}</Badge>
            <span className="font-medium">{ev.title}</span>
          </div>
          <div className="text-sm space-y-1 text-gray-600">
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
            <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">{ev.description}</div>
          )}
          {ev.notes && (
            <div className="text-sm text-gray-600">{ev.notes}</div>
          )}
          {ev.source === 'ticket' && ev.ticket && (
            <div className="bg-purple-50 border border-purple-200 rounded p-2 text-sm">
              <p className="font-medium text-purple-800">Linked ticket</p>
              <p className="text-purple-600">Status: {ev.ticket.status} | Priority: {ev.ticket.priority}</p>
            </div>
          )}
        </div>
        <div className="flex justify-between p-4 border-t">
          <div className="flex gap-2">
            {ev.source === 'ticket' && ev.ticket && onTicketClick && (
              <Button size="sm" variant="outline" onClick={() => { setSelectedEvent(null); onTicketClick(ev.ticket); }}>
                Open ticket
              </Button>
            )}
            {ev.source === 'calendar' && (
              <>
                <Button size="sm" variant="outline" onClick={() => openEdit(ev)}>
                  <Edit className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(ev)}>
                  <Trash2 className="w-3 h-3 mr-1" />Delete
                </Button>
              </>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelectedEvent(null)}>Close</Button>
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
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Ticket Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* view toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            {['day','week','month'].map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors
                  ${viewMode === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {v}
              </button>
            ))}
          </div>
          {/* navigation */}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {/* add button */}
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="w-4 h-4 mr-1" />Add event
          </Button>
        </div>
      </div>

      {/* current period label */}
      <div className="text-base font-medium text-gray-700">{headerLabel()}</div>

      {/* error */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded border border-red-200">{error}</div>
      )}

      {/* loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-gray-400">No upcoming events</p>
                ) : upcomingEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={`text-xs p-2 rounded border cursor-pointer hover:opacity-80 ${eventTypeStyle(ev.eventType)}`}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="opacity-70">
                      {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' '}{ev.startTime}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-teal-100 border border-teal-200 inline-block" />
                  Calendar event
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200 inline-block" />
                  Scheduled ticket
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" />
                  Work event
                </div>
              </CardContent>
            </Card>
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
