import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import { 
  Calendar,
  Clock,
  Plus,
  Phone,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  X,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// CRM Events are now loaded from database API

const eventTypes = [
  { value: 'Call', label: 'Call', icon: Phone, color: 'bg-blue-100 text-blue-800' },
  { value: 'Meeting', label: 'Meeting', icon: Users, color: 'bg-green-100 text-green-800' },
  { value: 'FollowUp', label: 'Follow Up', icon: Target, color: 'bg-purple-100 text-purple-800' },
  { value: 'Renewal', label: 'Renewal', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' }
];

export default function CRMCalendar({ timezone = 'Europe/London' }) {
  // Generate time options in 15-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(time);
      }
    }
    return times;
  };

  // Load events from database API
  const loadEventsFromAPI = async () => {
    try {
      const response = await fetch('/api/crm-events', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const events = await response.json();
      return events;
    } catch (error) {
      console.error('Error loading CRM events:', error);
      return [];
    }
  };

  // Timezone-aware date formatting functions
  const formatDateInTimezone = (date, tz = timezone) => {
    return new Date(date).toLocaleDateString('en-GB', { 
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTimeInTimezone = (date, tz = timezone) => {
    return new Date(date).toLocaleTimeString('en-GB', { 
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const createDateInTimezone = (dateStr, timeStr, tz = timezone) => {
    // Create date string in local timezone to avoid shifts
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    return new Date(dateTimeStr);
  };

  const getTimezoneOffset = (tz) => {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: tz }));
    return (utc.getTime() - targetTime.getTime()) / 60000;
  };

  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sendCancellationEmail, setSendCancellationEmail] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // week, month, day
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'Call',
    company: '',
    contact: '',
    scheduleTask: '',
    assignedUser: '',
    notes: ''
  });
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    company: '',
    contact: '',
    date: '',
    time: '',
    assignedUser: '',
    notes: '',
    location: ''
  });
  const [scheduleMeeting, setScheduleMeeting] = useState({
    title: '',
    company: '',
    contact: '',
    date: '',
    time: '',
    assignedUsers: [],
    location: '',
    notes: ''
  });

  // Load events from API on mount and refresh periodically
  useEffect(() => {
    const fetchEvents = async () => {
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    };
    
    fetchEvents();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter events for selected date/period
  const getEventsForDate = (date) => {
    // Use local date string to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return events.filter(event => {
      if (event.startAt) {
        // Extract date part from startAt timestamp
        const eventDateStr = event.startAt.split('T')[0];
        return eventDateStr === dateStr;
      }
      return event.date === dateStr;
    });
  };

  const getEventTypeConfig = (type) => {
    return eventTypes.find(t => t.value === type) || eventTypes[0];
  };

  const formatTime = (dateTimeStr) => {
    return new Date(dateTimeStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const createMeeting = () => {
    if (!newMeeting.title.trim() || !newMeeting.date || !newMeeting.time) return;
    
    const meetingEntry = {
      id: `meeting-${Date.now()}`,
      title: newMeeting.title,
      type: 'Meeting',
      company: newMeeting.company,
      contact: newMeeting.contact,
      startAt: `${newMeeting.date}T${newMeeting.time}:00`,
      endAt: `${newMeeting.date}T${addHour(newMeeting.time)}:00`,
      assignedUser: newMeeting.assignedUser,
      status: 'Planned',
      notes: newMeeting.notes,
      location: newMeeting.location
    };
    
    // Save to database via API
    fetch('/api/crm-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(meetingEntry)
    })
    .then(response => response.json())
    .then(async () => {
      // Refresh events from API
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    })
    .catch(error => console.error('Error creating meeting:', error));
    
    // Reset form
    setNewMeeting({
      title: '',
      company: '',
      contact: '',
      date: '',
      time: '',
      assignedUser: '',
      notes: '',
      location: ''
    });
    setShowMeetingModal(false);
  };

  const addHour = (time) => {
    const [hours, minutes] = time.split(':');
    const newHours = (parseInt(hours) + 1).toString().padStart(2, '0');
    return `${newHours}:${minutes}`;
  };

  const scheduleFromEvent = (event) => {
    setScheduleMeeting({
      title: `Follow-up meeting for ${event.company}`,
      company: event.company,
      contact: event.contact || '',
      date: '',
      time: '',
      assignedUsers: [],
      location: '',
      notes: `Follow-up meeting for ${event.service || 'service'} renewal`
    });
    setShowScheduleMeetingModal(true);
  };

  const createScheduledMeeting = () => {
    if (!scheduleMeeting.title.trim() || !scheduleMeeting.date || !scheduleMeeting.time) return;
    
    // Use timezone-aware date creation
    const startDateTime = createDateInTimezone(scheduleMeeting.date, scheduleMeeting.time);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour later
    
    const meetingEntry = {
      id: `scheduled-meeting-${Date.now()}`,
      title: scheduleMeeting.title,
      type: 'Meeting',
      company: scheduleMeeting.company,
      contact: scheduleMeeting.contact,
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString(),
      assignedUsers: scheduleMeeting.assignedUsers,
      status: 'Planned',
      notes: scheduleMeeting.notes,
      location: scheduleMeeting.location
    };
    
    // Save to database via API
    fetch('/api/crm-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(meetingEntry)
    })
    .then(response => response.json())
    .then(async () => {
      // Refresh events from API
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    })
    .catch(error => console.error('Error creating meeting:', error));
    
    // Send email notifications to assigned users
    sendMeetingInvitations(meetingEntry);
    
    // Reset form
    setScheduleMeeting({
      title: '',
      company: '',
      contact: '',
      date: '',
      time: '',
      assignedUsers: [],
      location: '',
      notes: ''
    });
    setShowScheduleMeetingModal(false);
  };

  const deleteEvent = () => {
    if (selectedEvent) {
      // Delete event via API
      fetch(`/api/crm-events/${selectedEvent.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      .then(async () => {
        // Refresh events from API
        const eventsData = await loadEventsFromAPI();
        setEvents(eventsData);
      })
      .catch(error => console.error('Error deleting event:', error));
      
      // Send cancellation emails if toggle is enabled
      if (sendCancellationEmail && selectedEvent.assignedUsers && selectedEvent.assignedUsers.length > 0) {
        const emailUsers = getUsersWithEmailEnabled().filter(user => 
          selectedEvent.assignedUsers.includes(user)
        );
        
        if (emailUsers.length > 0) {
          alert(`📧 Cancellation emails sent to: ${emailUsers.join(', ')}\n\nEvent "${selectedEvent.title}" has been cancelled.`);
        }
      }
      
      // Close modals and reset state
      setShowDeleteConfirm(false);
      setSelectedEvent(null);
      setSendCancellationEmail(true); // Reset to default
    }
  };

  const openEditModal = (event) => {
    setEditingEvent({
      ...event,
      date: event.startAt ? new Date(event.startAt).toISOString().split('T')[0] : '',
      time: event.startAt ? new Date(event.startAt).toTimeString().slice(0, 5) : '',
      assignedUsers: event.assignedUsers || []
    });
    setShowEditModal(true);
    setSelectedEvent(null); // Close event details modal
  };

  const saveEditedEvent = () => {
    if (!editingEvent.title || !editingEvent.date || !editingEvent.time) {
      alert('Please fill in all required fields');
      return;
    }

    // Use timezone-aware date creation
    const startDateTime = createDateInTimezone(editingEvent.date, editingEvent.time);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const updatedEvent = {
      ...editingEvent,
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString()
    };

    // Update event via API
    fetch(`/api/crm-events/${editingEvent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedEvent)
    })
    .then(async () => {
      // Refresh events from API
      const eventsData = await loadEventsFromAPI();
      setEvents(eventsData);
    })
    .catch(error => console.error('Error updating event:', error));
    
    // Send update notifications
    if (updatedEvent.assignedUsers && updatedEvent.assignedUsers.length > 0) {
      const emailUsers = getUsersWithEmailEnabled();
      const notifyUsers = updatedEvent.assignedUsers.filter(user => emailUsers.includes(user));
      
      if (notifyUsers.length > 0) {
        alert(`📧 Event update notifications sent to: ${notifyUsers.join(', ')}`);
      }
    }

    // Close modal
    setShowEditModal(false);
    setEditingEvent(null);
  };

  const sendCancellationEmails = (event) => {
    // Simulate sending cancellation emails
    const emailUsers = getUsersWithEmailEnabled();
    const notifyUsers = event.assignedUsers ? event.assignedUsers.filter(user => emailUsers.includes(user)) : [];
    
    if (notifyUsers.length > 0) {
      console.log(`📧 Cancellation emails sent to: ${notifyUsers.join(', ')}`);
      console.log(`❌ Cancelled: ${event.title}`);
      
      // In a real app, this would send actual emails
      alert(`Cancellation emails sent to: ${notifyUsers.join(', ')}`);
    }
  };

  const getAvailableUsers = () => {
    // Mock function - in real app would fetch from user management
    return ['Sarah Manager', 'Mike Sales', 'John Tech', 'Lisa Admin'];
  };

  const getUsersWithEmailEnabled = () => {
    // Mock function - in real app would check user management settings
    return ['Sarah Manager', 'Mike Sales', 'John Tech', 'Lisa Admin'];
  };

  const getCustomerLocations = (customerName) => {
    // Find the specific customer and return only their address
    const customers = [
      { name: 'Acme Corp', address: '123 Business St, London, SW1A 1AA' },
      { name: 'TechStart Ltd', address: '456 Corporate Ave, Manchester, M1 1AA' },
      { name: 'Global Industries', address: '789 Enterprise Rd, Birmingham, B1 1AA' },
      { name: 'Innovation Hub', address: '321 Tech Park, Leeds, LS1 1AA' },
      { name: 'Future Systems', address: '654 Digital Way, Bristol, BS1 1AA' }
    ];
    
    const customer = customers.find(c => c.name === customerName);
    return customer ? [customer.address] : ['Office Location - TBD'];
  };

  const formatDate = (dateTimeStr) => {
    return new Date(dateTimeStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
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

  // Get week days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // First day is Sunday
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  // Get week range string for display
  const getWeekRange = () => {
    const weekDays = getWeekDays();
    const startDate = weekDays[0];
    const endDate = weekDays[6];
    
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
    } else {
      return `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  };

  const calendarDays = generateCalendarDays();
  const todayEvents = getEventsForDate(selectedDate);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Calendar className="w-6 h-6" />
            <span>CRM Calendar</span>
          </h1>
          <p className="text-gray-600 mt-1">Schedule follow-ups, calls, meetings, and renewal reminders</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Activity</span>
          </Button>
          <Button onClick={() => {
            // Pre-populate the meeting date with the currently selected date
            const dateStr = selectedDate.toISOString().split('T')[0];
            setNewMeeting(prev => ({ ...prev, date: dateStr, time: '09:00' }));
            setShowMeetingModal(true);
          }} className="flex items-center space-x-2" variant="outline">
            <Calendar className="w-4 h-4" />
            <span>Book Meeting</span>
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  if (viewMode === 'day') {
                    newDate.setDate(newDate.getDate() - 1);
                  } else if (viewMode === 'week') {
                    newDate.setDate(newDate.getDate() - 7);
                  } else {
                    newDate.setMonth(newDate.getMonth() - 1);
                  }
                  setSelectedDate(newDate);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {viewMode === 'day' && selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {viewMode === 'week' && getWeekRange()}
                {viewMode === 'month' && selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  if (viewMode === 'day') {
                    newDate.setDate(newDate.getDate() + 1);
                  } else if (viewMode === 'week') {
                    newDate.setDate(newDate.getDate() + 7);
                  } else {
                    newDate.setMonth(newDate.getMonth() + 1);
                  }
                  setSelectedDate(newDate);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === 'day' && `Day View - ${selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
                {viewMode === 'week' && `Week View - ${getWeekRange()}`}
                {viewMode === 'month' && 'Month View'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Day View */}
              {viewMode === 'day' && (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900">
                      {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <p className="text-blue-700">
                      {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''} scheduled
                    </p>
                  </div>
                  
                  {todayEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No events scheduled for this day</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayEvents.map(event => {
                        const typeConfig = getEventTypeConfig(event.type);
                        return (
                          <div
                            key={event.id}
                            className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Badge className={typeConfig.color}>
                                  {typeConfig.label}
                                </Badge>
                                <h4 className="font-medium">{event.title}</h4>
                              </div>
                              <div className="text-sm text-gray-500">
                                {event.startAt && formatTime(event.startAt)}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Company:</strong> {event.company}</p>
                              {event.contact && <p><strong>Contact:</strong> {event.contact}</p>}
                              {event.assignedUser && <p><strong>Assigned to:</strong> {event.assignedUser}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2">
                    {getWeekDays().map((day, index) => {
                      const dayEvents = getEventsForDate(day);
                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <div key={index} className="border rounded-lg p-3">
                          <div className={`text-center mb-2 ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                            <div className="text-xs font-medium">
                              {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg ${isToday ? 'bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                              {day.getDate()}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map(event => {
                              const typeConfig = getEventTypeConfig(event.type);
                              return (
                                <div
                                  key={event.id}
                                  className={`text-xs p-1 rounded cursor-pointer ${typeConfig.color}`}
                                  onClick={() => setSelectedEvent(event)}
                                  title={`${event.title} - ${event.startAt && formatTime(event.startAt)}`}
                                >
                                  <div className="truncate">{event.title}</div>
                                  {event.startAt && (
                                    <div className="text-xs opacity-75">
                                      {formatTime(event.startAt)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Month View */}
              {viewMode === 'month' && (
                <>
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      const isSelected = day.toDateString() === selectedDate.toDateString();
                      const dayEvents = getEventsForDate(day);
                      
                      return (
                        <div
                          key={index}
                          className={`
                            min-h-[80px] p-1 border rounded cursor-pointer transition-colors
                            ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                            ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                            ${isSelected ? 'ring-2 ring-blue-500' : ''}
                            hover:bg-gray-50
                          `}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className="text-sm font-medium mb-1">
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map(event => {
                              const typeConfig = getEventTypeConfig(event.type);
                              return (
                                <div
                                  key={event.id}
                                  className={`text-xs p-1 rounded truncate ${typeConfig.color}`}
                                  title={event.title}
                                >
                                  {event.title}
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                Events for {selectedDate.toLocaleDateString('en-GB', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayEvents.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No events scheduled</p>
                ) : (
                  todayEvents.map(event => {
                    const typeConfig = getEventTypeConfig(event.type);
                    const IconComponent = typeConfig.icon;
                    
                    return (
                      <div
                        key={event.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <IconComponent className="w-4 h-4" />
                              <span className="font-medium text-sm">{event.title}</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>📅 {formatTime(event.startAt) || event.time} {event.endAt ? `- ${formatTime(event.endAt)}` : ''}</div>
                              <div>🏢 {event.company}</div>
                              <div>👤 {event.contact}</div>
                              {event.service && (
                                <div className="flex items-center space-x-2">
                                  <span>🔧 {event.service}</span>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-blue-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      viewServiceNotes(event.company, event.service);
                                    }}
                                  >
                                    View Notes
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Badge 
                              variant="outline" 
                              className={typeConfig.color}
                            >
                              {event.type}
                            </Badge>
                            {event.status === 'Done' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-orange-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Events</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium text-green-600">
                    {events.filter(e => e.status === 'Done').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-medium text-orange-600">
                    {events.filter(e => e.status === 'Planned').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Renewals</span>
                  <span className="font-medium text-red-600">
                    {events.filter(e => e.type === 'Renewal').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add CRM Activity</h2>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Activity title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={newEvent.type} onValueChange={(value) => setNewEvent({...newEvent, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newEvent.company}
                    onChange={(e) => setNewEvent({...newEvent, company: e.target.value})}
                    placeholder="Company name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact">Contact</Label>
                  <Input
                    id="contact"
                    value={newEvent.contact}
                    onChange={(e) => setNewEvent({...newEvent, contact: e.target.value})}
                    placeholder="Contact person"
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduleTask">Schedule Task</Label>
                  <Input
                    id="scheduleTask"
                    type="datetime-local"
                    step="900"
                    value={newEvent.scheduleTask}
                    onChange={(e) => setNewEvent({...newEvent, scheduleTask: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newEvent.notes}
                    onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (!newEvent.title.trim() || !newEvent.scheduleTask) {
                    alert('Please fill in all required fields (Title, Schedule Task)');
                    return;
                  }
                  
                  // Create the new activity with schedule task as both start and end time
                  const scheduleDateTime = new Date(newEvent.scheduleTask);
                  const endDateTime = new Date(scheduleDateTime.getTime() + 60 * 60 * 1000); // 1 hour later
                  
                  const activityEntry = {
                    id: `activity-${Date.now()}`,
                    title: newEvent.title,
                    type: newEvent.type,
                    company: newEvent.company,
                    contact: newEvent.contact,
                    startAt: scheduleDateTime.toISOString(),
                    endAt: endDateTime.toISOString(),
                    scheduleTask: newEvent.scheduleTask,
                    assignedUser: newEvent.assignedUser,
                    status: 'Planned',
                    notes: newEvent.notes
                  };
                  
                  // Save to database via API
                  fetch('/api/crm-events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(activityEntry)
                  })
                  .then(response => response.json())
                  .then(async () => {
                    // Refresh events from API
                    const eventsData = await loadEventsFromAPI();
                    setEvents(eventsData);
                  })
                  .catch(error => console.error('Error creating event:', error));
                  
                  // Close modal and reset form
                  setShowCreateModal(false);
                  setNewEvent({
                    title: '',
                    type: 'Call',
                    company: '',
                    contact: '',
                    scheduleTask: '',
                    assignedUser: '',
                    notes: ''
                  });
                }}>
                  Create Activity
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Event Details</h2>
                <Button variant="ghost" onClick={() => setSelectedEvent(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{selectedEvent.title}</h3>
                  <Badge className={getEventTypeConfig(selectedEvent.type).color}>
                    {selectedEvent.type}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div><strong>Company:</strong> {selectedEvent.company}</div>
                  <div><strong>Contact:</strong> {selectedEvent.contact}</div>
                  {selectedEvent.startAt && selectedEvent.startAt !== 'Invalid Date' && (
                    <>
                      <div><strong>Date:</strong> {formatDate(selectedEvent.startAt)}</div>
                      <div><strong>Time:</strong> {formatTime(selectedEvent.startAt)} - {formatTime(selectedEvent.endAt)}</div>
                    </>
                  )}
                  {selectedEvent.assignedUser && (
                    <div><strong>Assigned to:</strong> {selectedEvent.assignedUser}</div>
                  )}
                  {selectedEvent.assignedUsers && selectedEvent.assignedUsers.length > 0 && (
                    <div><strong>Assigned to:</strong> {selectedEvent.assignedUsers.join(', ')}</div>
                  )}
                  <div><strong>Status:</strong> {selectedEvent.status}</div>
                  {selectedEvent.location && (
                    <div><strong>Location:</strong> {selectedEvent.location}</div>
                  )}
                </div>
                
                {selectedEvent.notes && (
                  <div>
                    <strong>Notes:</strong>
                    <p className="text-sm text-gray-600 mt-1">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-6">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => scheduleFromEvent(selectedEvent)}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Meeting</span>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Close
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(selectedEvent)}
                    className="flex items-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </Button>
                  {selectedEvent.status === 'Planned' && (
                    <Button 
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Done</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Book Customer Meeting</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMeetingModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="meeting-title">Meeting Title</Label>
                <Input
                  id="meeting-title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Site visit with Acme Corp"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meeting-company">Company</Label>
                  <Input
                    id="meeting-company"
                    value={newMeeting.company}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label htmlFor="meeting-contact">Contact Person</Label>
                  <Input
                    id="meeting-contact"
                    value={newMeeting.contact}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meeting-date">Date</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="meeting-time">Time</Label>
                  <Select 
                    value={newMeeting.time} 
                    onValueChange={(value) => setNewMeeting(prev => ({ ...prev, time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeOptions().map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="meeting-user">Assigned User</Label>
                <Select value={newMeeting.assignedUser} onValueChange={(value) => setNewMeeting(prev => ({ ...prev, assignedUser: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sarah Manager">Sarah Manager</SelectItem>
                    <SelectItem value="Mike Sales">Mike Sales</SelectItem>
                    <SelectItem value="John Tech">John Tech</SelectItem>
                    <SelectItem value="Lisa Admin">Lisa Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="meeting-location">Location</Label>
                <Input
                  id="meeting-location"
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Meeting location or address"
                />
              </div>
              
              <div>
                <Label htmlFor="meeting-notes">Notes</Label>
                <Textarea
                  id="meeting-notes"
                  value={newMeeting.notes}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Meeting agenda, objectives, etc."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowMeetingModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createMeeting}>
                  Book Meeting
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Schedule Customer Meeting</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleMeetingModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="schedule-title">Meeting Title</Label>
                <Input
                  id="schedule-title"
                  value={scheduleMeeting.title}
                  onChange={(e) => setScheduleMeeting(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Follow-up meeting with customer"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schedule-company">Company</Label>
                  <Input
                    id="schedule-company"
                    value={scheduleMeeting.company}
                    onChange={(e) => setScheduleMeeting(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label htmlFor="schedule-contact">Contact Person</Label>
                  <Input
                    id="schedule-contact"
                    value={scheduleMeeting.contact}
                    onChange={(e) => setScheduleMeeting(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schedule-date">Date</Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduleMeeting.date}
                    onChange={(e) => setScheduleMeeting(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="schedule-time">Time</Label>
                  <Select 
                    value={scheduleMeeting.time} 
                    onValueChange={(value) => setScheduleMeeting(prev => ({ ...prev, time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeOptions().map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="schedule-users">Assign Users (Multiple Selection)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['Sarah Manager', 'Mike Sales', 'John Tech', 'Lisa Admin'].map(user => (
                    <label key={user} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={scheduleMeeting.assignedUsers.includes(user)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScheduleMeeting(prev => ({
                              ...prev,
                              assignedUsers: [...prev.assignedUsers, user]
                            }));
                          } else {
                            setScheduleMeeting(prev => ({
                              ...prev,
                              assignedUsers: prev.assignedUsers.filter(u => u !== user)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{user}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="schedule-location">Location</Label>
                <Select 
                  value={scheduleMeeting.location} 
                  onValueChange={(value) => setScheduleMeeting(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCustomerLocations(scheduleMeeting.company).map((location, index) => (
                      <SelectItem key={index} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="schedule-notes">Meeting Notes</Label>
                <Textarea
                  id="schedule-notes"
                  value={scheduleMeeting.notes}
                  onChange={(e) => setScheduleMeeting(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Meeting agenda, objectives, preparation notes..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleMeetingModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createScheduledMeeting}>
                  Schedule Meeting
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Delete Event</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSendCancellationEmail(true); // Reset to default
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">{selectedEvent?.title}</p>
                <p className="text-sm text-gray-600">{selectedEvent?.company}</p>
                {selectedEvent?.assignedUsers && selectedEvent.assignedUsers.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Assigned to: {selectedEvent.assignedUsers.join(', ')}
                  </p>
                )}
              </div>
              
              {selectedEvent?.assignedUsers && selectedEvent.assignedUsers.length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Send Cancellation Emails</p>
                      <p className="text-xs text-gray-600">
                        Notify assigned users about the event cancellation
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="emailOption"
                          checked={sendCancellationEmail}
                          onChange={() => setSendCancellationEmail(true)}
                          className="text-blue-600"
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="emailOption"
                          checked={!sendCancellationEmail}
                          onChange={() => setSendCancellationEmail(false)}
                          className="text-blue-600"
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSendCancellationEmail(true); // Reset to default
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteEvent}
                >
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Edit Event</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Event Title *</Label>
                <Input
                  id="edit-title"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-company">Company</Label>
                  <Input
                    id="edit-company"
                    value={editingEvent.company || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact">Contact</Label>
                  <Input
                    id="edit-contact"
                    value={editingEvent.contact || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="Contact person"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-date">Date *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-time">Time *</Label>
                  <Select 
                    value={editingEvent.time} 
                    onValueChange={(value) => setEditingEvent(prev => ({ ...prev, time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeOptions().map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Assign Users</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {getAvailableUsers().map(user => (
                    <label key={user} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingEvent.assignedUsers.includes(user)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingEvent(prev => ({
                              ...prev,
                              assignedUsers: [...prev.assignedUsers, user]
                            }));
                          } else {
                            setEditingEvent(prev => ({
                              ...prev,
                              assignedUsers: prev.assignedUsers.filter(u => u !== user)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{user}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingEvent.location || ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Event location"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingEvent.notes || ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEvent(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveEditedEvent}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

