// web/client/src/app/src/components/CRMCalendar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Calendar, Clock, Plus, Phone, Users, Target,
  AlertTriangle, CheckCircle, X, Edit, Trash2,
  ChevronLeft, ChevronRight, Briefcase, ExternalLink
} from 'lucide-react';

// FIX 1: type values are lowercase to match backend Zod schema
const eventTypes = [
  { value: 'call',       label: 'Call',       icon: Phone,         color: 'bg-[#dbeafe] text-[#1d4ed8]' },
  { value: 'meeting',    label: 'Meeting',     icon: Users,         color: 'bg-[#dcfce7] text-[#15803d]' },
  { value: 'follow_up',  label: 'Follow Up',   icon: Target,        color: 'bg-[#f3e8ff] text-[#7e22ce]' },
  { value: 'renewal',    label: 'Renewal',     icon: AlertTriangle, color: 'bg-[#ffedd5] text-[#c2410c]' },
  { value: 'job',        label: 'Job',         icon: Briefcase,     color: 'bg-[#fef9ee] text-[#b8860b]' },
];

export default function CRMCalendar({ timezone = 'Europe/London' }) {

  const navigate = useNavigate();

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return times;
  };

  // FIX 5: real contacts loaded from API instead of hardcoded fake users
  const [contacts, setContacts] = useState([]);

  const loadEventsFromAPI = async () => {
    try {
      const response = await fetch('/api/crm-events', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch events');
      return await response.json();
    } catch (error) {
      console.error('Error loading CRM events:', error);
      return [];
    }
  };

  const createDateInTimezone = (dateStr, timeStr) => {
    return new Date(`${dateStr}T${timeStr}:00`);
  };

  const addHour = (time) => {
    const [hours, minutes] = time.split(':');
    return `${(parseInt(hours) + 1).toString().padStart(2, '0')}:${minutes}`;
  };

  const [events, setEvents] = useState([]);
  const [jobEvents, setJobEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sendCancellationEmail, setSendCancellationEmail] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState('month');

  // FIX 1: default type is lowercase 'call'
  const [newEvent, setNewEvent] = useState({
    title: '', type: 'call', company: '', contact: '', scheduleTask: '', assignedUser: '', notes: ''
  });
  const [newMeeting, setNewMeeting] = useState({
    title: '', company: '', contact: '', date: '', time: '', assignedUser: '', notes: '', location: ''
  });
  const [scheduleMeeting, setScheduleMeeting] = useState({
    title: '', company: '', contact: '', date: '', time: '', assignedUsers: [], location: '', notes: ''
  });

  // FIX 6: load on mount only — no polling interval
  useEffect(() => {
    const init = async () => {
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);

      // Load scheduled jobs and merge as read-only calendar items
      try {
        const jobsRes = await fetch('/api/jobs?limit=500', { credentials: 'include' });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          const scheduled = (jobsData.jobs || [])
            .filter(j => j.scheduledStart && j.status !== 'cancelled')
            .map(j => ({
              id:           `job-${j.id}`,
              _isJob:       true,
              _jobId:       j.id,
              title:        `${j.jobNumber} — ${j.title}`,
              type:         'job',
              start_at:     j.scheduledStart,
              end_at:       j.scheduledEnd || j.scheduledStart,
              company:      j.contactName || '',
              contact:      j.assignedToName || '',
              status:       j.status,
              jobNumber:    j.jobNumber,
              jobTitle:     j.title,
              jobStatus:    j.status,
              notes:        j.notes || '',
            }));
          setJobEvents(scheduled);
        }
      } catch (err) {
        console.error('[CRMCalendar] Failed to load job events:', err);
      }
    };
    init();
  }, []);

  // FIX 5: load real contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/contacts', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || data || []);
        }
      } catch (err) {
        console.error('Failed to load contacts:', err);
      }
    };
    fetchContacts();
  }, []);

  // FIX 5: returns real contact names from API
  const getAvailableUsers = () => contacts.map(c => c.name).filter(Boolean);

  // FIX 7: check start_at (snake_case — what backend returns)
  const getEventsForDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const crm = events.filter(event => {
      const ts = event.start_at || event.startAt;
      if (ts) return ts.split('T')[0] === dateStr;
      return event.date === dateStr;
    });
    const jobs = jobEvents.filter(j => j.start_at && j.start_at.split('T')[0] === dateStr);
    return [...crm, ...jobs];
  };

  const getEventTypeConfig = (type) => eventTypes.find(t => t.value === type) || eventTypes[0];

  const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    return new Date(dateTimeStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    return new Date(dateTimeStr).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // FIX 2: send start_at / end_at. FIX 1: type is already lowercase 'meeting'
  const createMeeting = async () => {
    if (!newMeeting.title.trim() || !newMeeting.date || !newMeeting.time) return;
    const meetingEntry = {
      title: newMeeting.title,
      type: 'meeting',
      company: newMeeting.company,
      contact: newMeeting.contact,
      start_at: `${newMeeting.date}T${newMeeting.time}:00`,
      end_at: `${newMeeting.date}T${addHour(newMeeting.time)}:00`,
      assigned_user: newMeeting.assignedUser,
      status: 'planned',
      notes: newMeeting.notes,
      location: newMeeting.location
    };
    try {
      await fetch('/api/crm-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(meetingEntry)
      });
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
    setNewMeeting({ title: '', company: '', contact: '', date: '', time: '', assignedUser: '', notes: '', location: '' });
    setShowMeetingModal(false);
  };

  const scheduleFromEvent = (event) => {
    setScheduleMeeting({
      title: `Follow-up meeting for ${event.company}`,
      company: event.company,
      contact: event.contact || '',
      date: '', time: '', assignedUsers: [], location: '',
      notes: `Follow-up for ${event.service || 'service'} renewal`
    });
    setShowScheduleMeetingModal(true);
  };

  // FIX 2: start_at / end_at. FIX 3: sendMeetingInvitations() call removed
  const createScheduledMeeting = async () => {
    if (!scheduleMeeting.title.trim() || !scheduleMeeting.date || !scheduleMeeting.time) return;
    const startDateTime = createDateInTimezone(scheduleMeeting.date, scheduleMeeting.time);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const meetingEntry = {
      title: scheduleMeeting.title,
      type: 'meeting',
      company: scheduleMeeting.company,
      contact: scheduleMeeting.contact,
      start_at: startDateTime.toISOString(),
      end_at: endDateTime.toISOString(),
      assigned_users: scheduleMeeting.assignedUsers,
      status: 'planned',
      notes: scheduleMeeting.notes,
      location: scheduleMeeting.location
    };
    try {
      await fetch('/api/crm-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(meetingEntry)
      });
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error creating scheduled meeting:', error);
    }
    setScheduleMeeting({ title: '', company: '', contact: '', date: '', time: '', assignedUsers: [], location: '', notes: '' });
    setShowScheduleMeetingModal(false);
  };

  const deleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await fetch(`/api/crm-events/${selectedEvent.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
    setShowDeleteConfirm(false);
    setSelectedEvent(null);
    setSendCancellationEmail(true);
  };

  // FIX 7: read start_at from event
  const openEditModal = (event) => {
    const ts = event.start_at || event.startAt;
    setEditingEvent({
      ...event,
      date: ts ? new Date(ts).toISOString().split('T')[0] : '',
      time: ts ? new Date(ts).toTimeString().slice(0, 5) : '',
      assignedUsers: event.assigned_users || event.assignedUsers || []
    });
    setShowEditModal(true);
    setSelectedEvent(null);
  };

  // FIX 2: send start_at / end_at
  const saveEditedEvent = async () => {
    if (!editingEvent.title || !editingEvent.date || !editingEvent.time) {
      alert('Please fill in all required fields');
      return;
    }
    const startDateTime = createDateInTimezone(editingEvent.date, editingEvent.time);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const updatedEvent = {
      ...editingEvent,
      start_at: startDateTime.toISOString(),
      end_at: endDateTime.toISOString()
    };
    try {
      await fetch(`/api/crm-events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedEvent)
      });
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error updating event:', error);
    }
    setShowEditModal(false);
    setEditingEvent(null);
  };

  // FIX 4: mark done handler
  const markEventDone = async (event) => {
    try {
      await fetch(`/api/crm-events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'done' })
      });
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
      setSelectedEvent(prev => prev ? { ...prev, status: 'done' } : null);
    } catch (error) {
      console.error('Error marking event done:', error);
    }
  };

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const days = [];
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    const diff = startOfWeek.getDate() - startOfWeek.getDay();
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const getWeekRange = () => {
    const weekDays = getWeekDays();
    const s = weekDays[0], e = weekDays[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
    }
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const calendarDays = generateCalendarDays();
  const todayEvents = getEventsForDate(selectedDate);

  const inputClass = "w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]";
  const labelClass = "block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111113] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#9ca3af]" />
            CRM Calendar
          </h1>
          <p className="text-[13px] text-[#9ca3af] mt-0.5">Schedule follow-ups, calls, meetings, and renewal reminders</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-28 text-[13px] border-[#e5e7eb]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
          <button
            onClick={() => {
              const dateStr = selectedDate.toISOString().split('T')[0];
              setNewMeeting(prev => ({ ...prev, date: dateStr, time: '09:00' }));
              setShowMeetingModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] hover:bg-[#fafafa] rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Book Meeting
          </button>
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              if (viewMode === 'day') d.setDate(d.getDate() - 1);
              else if (viewMode === 'week') d.setDate(d.getDate() - 7);
              else d.setMonth(d.getMonth() - 1);
              setSelectedDate(d);
            }}
            className="p-1.5 rounded-lg border border-[#e5e7eb] hover:bg-[#fafafa] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#374151]" />
          </button>
          <h2 className="text-[14px] font-semibold text-[#111113] min-w-[200px] text-center">
            {viewMode === 'day' && selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {viewMode === 'week' && getWeekRange()}
            {viewMode === 'month' && selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              if (viewMode === 'day') d.setDate(d.getDate() + 1);
              else if (viewMode === 'week') d.setDate(d.getDate() + 7);
              else d.setMonth(d.getMonth() + 1);
              setSelectedDate(d);
            }}
            className="p-1.5 rounded-lg border border-[#e5e7eb] hover:bg-[#fafafa] transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[#374151]" />
          </button>
        </div>
        <button
          onClick={() => setSelectedDate(new Date())}
          className="px-3 py-1.5 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e5e7eb]">
            <h3 className="text-[13px] font-semibold text-[#374151]">
              {viewMode === 'day' && selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {viewMode === 'week' && `Week — ${getWeekRange()}`}
              {viewMode === 'month' && 'Month View'}
            </h3>
          </div>
          <div className="p-4">

            {/* Day view */}
            {viewMode === 'day' && (
              <div className="space-y-3">
                <div className="text-center p-4 bg-[#fafafa] rounded-lg border border-[#e5e7eb]">
                  <h3 className="text-[14px] font-semibold text-[#374151]">
                    {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="text-[12px] text-[#9ca3af] mt-0.5">
                    {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
                {todayEvents.length === 0 ? (
                  <div className="text-center py-10 text-[13px] text-[#9ca3af]">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    No events scheduled for this day
                  </div>
                ) : (
                  todayEvents.map(event => {
                    const tc = getEventTypeConfig(event.type);
                    const ts = event.start_at || event.startAt;
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="p-4 border border-[#e5e7eb] rounded-lg hover:bg-[#fef9ee] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tc.color}`}>{tc.label}</span>
                            <span className="text-[13px] font-medium text-[#111113]">{event.title}</span>
                          </div>
                          <span className="text-[12px] text-[#9ca3af]">{ts && formatTime(ts)}</span>
                        </div>
                        <div className="mt-2 text-[12px] text-[#6b7280] space-y-0.5">
                          <p><span className="font-medium">Company:</span> {event.company}</p>
                          {event.contact && <p><span className="font-medium">Contact:</span> {event.contact}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Week view */}
            {viewMode === 'week' && (
              <div className="grid grid-cols-7 gap-1">
                {getWeekDays().map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={index} className="border border-[#e5e7eb] rounded-lg p-2 min-h-[100px]">
                      <div className={`text-center mb-2 ${isToday ? 'text-[#d4a017] font-bold' : 'text-[#6b7280]'}`}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider">
                          {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </div>
                        <div className={`text-[14px] mt-0.5 ${isToday ? 'bg-[#d4a017] text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
                          {day.getDate()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const tc = getEventTypeConfig(event.type);
                          const ts = event.start_at || event.startAt;
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`text-[10px] p-1 rounded cursor-pointer truncate ${tc.color}`}
                              title={`${event.title} — ${ts && formatTime(ts)}`}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-[#9ca3af] text-center">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Month view */}
            {viewMode === 'month' && (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="p-2 text-center text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const dayEvents = getEventsForDate(day);
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={`min-h-[72px] p-1 border rounded-lg cursor-pointer transition-colors
                          ${isCurrentMonth ? 'bg-white' : 'bg-[#fafafa] text-[#9ca3af]'}
                          ${isToday ? 'border-[#d4a017] bg-[#fef9ee]' : 'border-[#e5e7eb]'}
                          ${isSelected ? 'ring-2 ring-[#d4a017]/40' : ''}
                          hover:bg-[#fef9ee]`}
                      >
                        <div className="text-[12px] font-medium mb-1">{day.getDate()}</div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map(event => {
                            const tc = getEventTypeConfig(event.type);
                            return (
                              <div key={event.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${tc.color}`} title={event.title}>
                                {event.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-[#9ca3af]">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Events for selected date */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">
                {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>
            <div className="p-4">
              {todayEvents.length === 0 ? (
                <p className="text-[13px] text-[#9ca3af] text-center py-4">No events scheduled</p>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map(event => {
                    const tc = getEventTypeConfig(event.type);
                    const IconComponent = tc.icon;
                    const ts = event.start_at || event.startAt;
                    const te = event.end_at || event.endAt;
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="border border-[#e5e7eb] rounded-lg p-3 hover:bg-[#fef9ee] cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <IconComponent className="w-3.5 h-3.5 text-[#9ca3af]" />
                              <span className="text-[13px] font-medium text-[#111113] truncate">{event.title}</span>
                            </div>
                            <div className="text-[11px] text-[#6b7280] space-y-0.5">
                              {ts && <div>🕐 {formatTime(ts)}{te ? ` – ${formatTime(te)}` : ''}</div>}
                              <div>🏢 {event.company}</div>
                              {event.contact && <div>👤 {event.contact}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${tc.color}`}>
                              {tc.label}
                            </span>
                            {event.status === 'done'
                              ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              : <Clock className="w-3.5 h-3.5 text-[#d4a017]" />
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold text-[#374151]">This Month</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Total Events', value: events.length, color: 'text-[#111113]' },
                // FIX 8: lowercase status values to match backend
                { label: 'Completed', value: events.filter(e => e.status === 'done').length, color: 'text-[#15803d]' },
                { label: 'Pending', value: events.filter(e => e.status === 'planned').length, color: 'text-[#d4a017]' },
                { label: 'Renewals', value: events.filter(e => e.type === 'renewal').length, color: 'text-[#c2410c]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[13px] text-[#6b7280]">{label}</span>
                  <span className={`text-[13px] font-semibold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CREATE ACTIVITY MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h2 className="text-[15px] font-semibold text-[#111113]">Add CRM Activity</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input className={inputClass} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Activity title" />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <Select value={newEvent.type} onValueChange={v => setNewEvent({...newEvent, type: v})}>
                  <SelectTrigger className="text-[13px] border-[#e5e7eb]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Company</label>
                <input className={inputClass} value={newEvent.company} onChange={e => setNewEvent({...newEvent, company: e.target.value})} placeholder="Company name" />
              </div>
              <div>
                <label className={labelClass}>Contact</label>
                <input className={inputClass} value={newEvent.contact} onChange={e => setNewEvent({...newEvent, contact: e.target.value})} placeholder="Contact person" />
              </div>
              <div>
                <label className={labelClass}>Schedule Task *</label>
                <input className={inputClass} type="datetime-local" step="900" value={newEvent.scheduleTask} onChange={e => setNewEvent({...newEvent, scheduleTask: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={inputClass} value={newEvent.notes} onChange={e => setNewEvent({...newEvent, notes: e.target.value})} placeholder="Additional notes..." rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]">Cancel</button>
              <button
                onClick={async () => {
                  if (!newEvent.title.trim() || !newEvent.scheduleTask) {
                    alert('Please fill in Title and Schedule Task');
                    return;
                  }
                  const scheduleDateTime = new Date(newEvent.scheduleTask);
                  const endDateTime = new Date(scheduleDateTime.getTime() + 60 * 60 * 1000);
                  // FIX 1 + FIX 2: lowercase type, snake_case field names
                  const activityEntry = {
                    title: newEvent.title,
                    type: newEvent.type,
                    company: newEvent.company,
                    contact: newEvent.contact,
                    start_at: scheduleDateTime.toISOString(),
                    end_at: endDateTime.toISOString(),
                    assigned_user: newEvent.assignedUser,
                    status: 'planned',
                    notes: newEvent.notes
                  };
                  try {
                    await fetch('/api/crm-events', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(activityEntry)
                    });
                    const eventsData = await loadEventsFromAPI();
                    setEvents(eventsData);
                  } catch (error) {
                    console.error('Error creating event:', error);
                  }
                  setShowCreateModal(false);
                  setNewEvent({ title: '', type: 'call', company: '', contact: '', scheduleTask: '', assignedUser: '', notes: '' });
                }}
                className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg"
              >
                Create Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVENT DETAIL MODAL ── */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h2 className="text-[15px] font-semibold text-[#111113]">
                {selectedEvent._isJob ? 'Scheduled Job' : 'Event Details'}
              </h2>
              <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── JOB variant ── */}
            {selectedEvent._isJob ? (
              <>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#fef9ee] border border-[#d4a017]/20 flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-[#d4a017]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">{selectedEvent.jobNumber}</p>
                      <h3 className="text-[14px] font-semibold text-[#111113] mt-0.5">{selectedEvent.jobTitle}</h3>
                    </div>
                  </div>
                  <div className="space-y-2 text-[13px]">
                    {(selectedEvent.start_at) && (
                      <>
                        <div><span className="font-medium text-[#374151]">Date:</span> <span className="text-[#6b7280]">{formatDate(selectedEvent.start_at)}</span></div>
                        <div>
                          <span className="font-medium text-[#374151]">Time:</span>{' '}
                          <span className="text-[#6b7280]">
                            {formatTime(selectedEvent.start_at)}
                            {selectedEvent.end_at && selectedEvent.end_at !== selectedEvent.start_at
                              ? ` – ${formatTime(selectedEvent.end_at)}`
                              : ''}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedEvent.company && (
                      <div><span className="font-medium text-[#374151]">Contact:</span> <span className="text-[#6b7280]">{selectedEvent.company}</span></div>
                    )}
                    {selectedEvent.contact && (
                      <div><span className="font-medium text-[#374151]">Assigned to:</span> <span className="text-[#6b7280]">{selectedEvent.contact}</span></div>
                    )}
                    <div>
                      <span className="font-medium text-[#374151]">Status:</span>{' '}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ml-1 ${
                        selectedEvent.jobStatus === 'scheduled'   ? 'bg-[#dbeafe] text-[#1d4ed8]' :
                        selectedEvent.jobStatus === 'in_progress' ? 'bg-[#fef3c7] text-[#d97706]' :
                        selectedEvent.jobStatus === 'on_hold'     ? 'bg-[#f3f4f6] text-[#6b7280]' :
                        selectedEvent.jobStatus === 'completed'   ? 'bg-[#dcfce7] text-[#15803d]' :
                        selectedEvent.jobStatus === 'invoiced'    ? 'bg-[#f3e8ff] text-[#7e22ce]' :
                        'bg-[#fee2e2] text-[#dc2626]'
                      }`}>
                        {selectedEvent.jobStatus?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>
                  </div>
                  {selectedEvent.notes && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-[13px] text-[#6b7280]">{selectedEvent.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { setSelectedEvent(null); navigate(`/app/jobs/${selectedEvent._jobId}`); }}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Job
                  </button>
                </div>
              </>
            ) : (
              /* ── CRM event variant (unchanged) ── */
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#111113]">{selectedEvent.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mt-1 ${getEventTypeConfig(selectedEvent.type).color}`}>
                      {getEventTypeConfig(selectedEvent.type).label}
                    </span>
                  </div>
                  <div className="space-y-2 text-[13px]">
                    <div><span className="font-medium text-[#374151]">Company:</span> <span className="text-[#6b7280]">{selectedEvent.company}</span></div>
                    <div><span className="font-medium text-[#374151]">Contact:</span> <span className="text-[#6b7280]">{selectedEvent.contact}</span></div>
                    {(selectedEvent.start_at || selectedEvent.startAt) && (
                      <>
                        <div><span className="font-medium text-[#374151]">Date:</span> <span className="text-[#6b7280]">{formatDate(selectedEvent.start_at || selectedEvent.startAt)}</span></div>
                        <div><span className="font-medium text-[#374151]">Time:</span> <span className="text-[#6b7280]">{formatTime(selectedEvent.start_at || selectedEvent.startAt)} – {formatTime(selectedEvent.end_at || selectedEvent.endAt)}</span></div>
                      </>
                    )}
                    {selectedEvent.assigned_user && (
                      <div><span className="font-medium text-[#374151]">Assigned to:</span> <span className="text-[#6b7280]">{selectedEvent.assigned_user}</span></div>
                    )}
                    {selectedEvent.assigned_users && selectedEvent.assigned_users.length > 0 && (
                      <div><span className="font-medium text-[#374151]">Assigned to:</span> <span className="text-[#6b7280]">{selectedEvent.assigned_users.join(', ')}</span></div>
                    )}
                    <div>
                      <span className="font-medium text-[#374151]">Status:</span>{' '}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${selectedEvent.status === 'done' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fef9ee] text-[#d4a017]'}`}>
                        {selectedEvent.status === 'done' ? 'Done' : 'Planned'}
                      </span>
                    </div>
                    {selectedEvent.location && (
                      <div><span className="font-medium text-[#374151]">Location:</span> <span className="text-[#6b7280]">{selectedEvent.location}</span></div>
                    )}
                  </div>
                  {selectedEvent.notes && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-[13px] text-[#6b7280]">{selectedEvent.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 px-6 py-4 border-t border-[#e5e7eb]">
                  <button
                    onClick={() => scheduleFromEvent(selectedEvent)}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]"
                  >
                    <Calendar className="w-4 h-4" /> Schedule Meeting
                  </button>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => openEditModal(selectedEvent)}
                      className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    {/* FIX 4: Mark Done button now has onClick wired to PUT /api/crm-events/:id */}
                    {selectedEvent.status !== 'done' && (
                      <button
                        onClick={() => markEventDone(selectedEvent)}
                        className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4" /> Mark Done
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BOOK MEETING MODAL ── */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#111113]">Book Customer Meeting</h3>
              <button onClick={() => setShowMeetingModal(false)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Meeting Title</label>
                <input className={inputClass} value={newMeeting.title} onChange={e => setNewMeeting(p => ({...p, title: e.target.value}))} placeholder="e.g. Site visit with Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Company</label>
                  <input className={inputClass} value={newMeeting.company} onChange={e => setNewMeeting(p => ({...p, company: e.target.value}))} placeholder="Company name" />
                </div>
                <div>
                  <label className={labelClass}>Contact</label>
                  <input className={inputClass} value={newMeeting.contact} onChange={e => setNewMeeting(p => ({...p, contact: e.target.value}))} placeholder="Contact name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input className={inputClass} type="date" value={newMeeting.date} onChange={e => setNewMeeting(p => ({...p, date: e.target.value}))} />
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <Select value={newMeeting.time} onValueChange={v => setNewMeeting(p => ({...p, time: v}))}>
                    <SelectTrigger className="text-[13px] border-[#e5e7eb]"><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeOptions().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Assigned User</label>
                <Select value={newMeeting.assignedUser} onValueChange={v => setNewMeeting(p => ({...p, assignedUser: v}))}>
                  <SelectTrigger className="text-[13px] border-[#e5e7eb]"><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {getAvailableUsers().map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input className={inputClass} value={newMeeting.location} onChange={e => setNewMeeting(p => ({...p, location: e.target.value}))} placeholder="Meeting location or address" />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={inputClass} value={newMeeting.notes} onChange={e => setNewMeeting(p => ({...p, notes: e.target.value}))} rows={3} placeholder="Meeting agenda, objectives, etc." />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
              <button onClick={() => setShowMeetingModal(false)} className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]">Cancel</button>
              <button onClick={createMeeting} className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg">Book Meeting</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE MEETING MODAL ── */}
      {showScheduleMeetingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#111113]">Schedule Customer Meeting</h3>
              <button onClick={() => setShowScheduleMeetingModal(false)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Meeting Title</label>
                <input className={inputClass} value={scheduleMeeting.title} onChange={e => setScheduleMeeting(p => ({...p, title: e.target.value}))} placeholder="e.g. Follow-up meeting with customer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Company</label>
                  <input className={inputClass} value={scheduleMeeting.company} onChange={e => setScheduleMeeting(p => ({...p, company: e.target.value}))} placeholder="Company name" />
                </div>
                <div>
                  <label className={labelClass}>Contact</label>
                  <input className={inputClass} value={scheduleMeeting.contact} onChange={e => setScheduleMeeting(p => ({...p, contact: e.target.value}))} placeholder="Contact name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input className={inputClass} type="date" value={scheduleMeeting.date} onChange={e => setScheduleMeeting(p => ({...p, date: e.target.value}))} />
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <Select value={scheduleMeeting.time} onValueChange={v => setScheduleMeeting(p => ({...p, time: v}))}>
                    <SelectTrigger className="text-[13px] border-[#e5e7eb]"><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeOptions().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* FIX 5: real users from contacts API */}
              <div>
                <label className={labelClass}>Assign Users</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {getAvailableUsers().map(user => (
                    <label key={user} className="flex items-center gap-2 cursor-pointer text-[13px]">
                      <input
                        type="checkbox"
                        checked={scheduleMeeting.assignedUsers.includes(user)}
                        onChange={e => {
                          setScheduleMeeting(p => ({
                            ...p,
                            assignedUsers: e.target.checked
                              ? [...p.assignedUsers, user]
                              : p.assignedUsers.filter(u => u !== user)
                          }));
                        }}
                        className="rounded"
                      />
                      <span className="text-[#374151]">{user}</span>
                    </label>
                  ))}
                  {getAvailableUsers().length === 0 && (
                    <p className="text-[12px] text-[#9ca3af] col-span-2">No contacts found — add contacts in the Contacts section first</p>
                  )}
                </div>
              </div>
              {/* FIX 9: free text location input — fake getCustomerLocations() removed */}
              <div>
                <label className={labelClass}>Location</label>
                <input className={inputClass} value={scheduleMeeting.location} onChange={e => setScheduleMeeting(p => ({...p, location: e.target.value}))} placeholder="Enter meeting location or address" />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={inputClass} value={scheduleMeeting.notes} onChange={e => setScheduleMeeting(p => ({...p, notes: e.target.value}))} rows={3} placeholder="Meeting agenda, objectives, preparation notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
              <button onClick={() => setShowScheduleMeetingModal(false)} className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]">Cancel</button>
              <button onClick={createScheduledMeeting} className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg">Schedule Meeting</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#111113]">Delete Event</h3>
              <button onClick={() => { setShowDeleteConfirm(false); setSendCancellationEmail(true); }} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-[#6b7280]">Are you sure you want to delete this event? This action cannot be undone.</p>
              <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-3">
                <p className="text-[13px] font-medium text-[#374151]">{selectedEvent?.title}</p>
                <p className="text-[12px] text-[#9ca3af] mt-0.5">{selectedEvent?.company}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
              <button onClick={() => { setShowDeleteConfirm(false); setSendCancellationEmail(true); }} className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]">Cancel</button>
              <button onClick={deleteEvent} className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete Event</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT EVENT MODAL ── */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#111113]">Edit Event</h3>
              <button onClick={() => { setShowEditModal(false); setEditingEvent(null); }} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#6b7280]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Event Title *</label>
                <input className={inputClass} value={editingEvent.title} onChange={e => setEditingEvent(p => ({...p, title: e.target.value}))} placeholder="Enter event title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Company</label>
                  <input className={inputClass} value={editingEvent.company || ''} onChange={e => setEditingEvent(p => ({...p, company: e.target.value}))} placeholder="Company name" />
                </div>
                <div>
                  <label className={labelClass}>Contact</label>
                  <input className={inputClass} value={editingEvent.contact || ''} onChange={e => setEditingEvent(p => ({...p, contact: e.target.value}))} placeholder="Contact person" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date *</label>
                  <input className={inputClass} type="date" value={editingEvent.date} onChange={e => setEditingEvent(p => ({...p, date: e.target.value}))} />
                </div>
                <div>
                  <label className={labelClass}>Time *</label>
                  <Select value={editingEvent.time} onValueChange={v => setEditingEvent(p => ({...p, time: v}))}>
                    <SelectTrigger className="text-[13px] border-[#e5e7eb]"><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeOptions().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* FIX 5: real users from contacts API in edit modal */}
              <div>
                <label className={labelClass}>Assign Users</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {getAvailableUsers().map(user => (
                    <label key={user} className="flex items-center gap-2 cursor-pointer text-[13px]">
                      <input
                        type="checkbox"
                        checked={(editingEvent.assignedUsers || []).includes(user)}
                        onChange={e => {
                          setEditingEvent(p => ({
                            ...p,
                            assignedUsers: e.target.checked
                              ? [...(p.assignedUsers || []), user]
                              : (p.assignedUsers || []).filter(u => u !== user)
                          }));
                        }}
                        className="rounded"
                      />
                      <span className="text-[#374151]">{user}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input className={inputClass} value={editingEvent.location || ''} onChange={e => setEditingEvent(p => ({...p, location: e.target.value}))} placeholder="Event location" />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={inputClass} value={editingEvent.notes || ''} onChange={e => setEditingEvent(p => ({...p, notes: e.target.value}))} rows={3} placeholder="Additional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#e5e7eb]">
              <button onClick={() => { setShowEditModal(false); setEditingEvent(null); }} className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa]">Cancel</button>
              <button onClick={saveEditedEvent} className="px-4 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
