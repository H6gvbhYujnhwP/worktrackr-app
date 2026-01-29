import React, { useState, useEffect } from 'react';
import { useSimulation } from '../App.jsx';
import { Calendar, Clock, User, MapPin, Plus, Edit, Trash2, CheckCircle, AlertCircle, Filter, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

const IntegratedCalendar = ({ currentUser, onTicketClick, timezone = 'Europe/London' }) => {
  const { tickets, users, updateTicket } = useSimulation();
  
  // State for standalone calendar events (not tied to tickets)
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week', 'day', 'month'
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    title: '' // For standalone events
  });
  const [isStandaloneEvent, setIsStandaloneEvent] = useState(false);

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
    // Create date string in format that respects the timezone
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    const date = new Date(dateTimeStr);
    
    // Adjust for timezone offset to ensure the date appears correctly
    const userTimezoneOffset = date.getTimezoneOffset();
    const targetOffset = getTimezoneOffset(tz);
    const offsetDiff = (userTimezoneOffset - targetOffset) * 60000;
    
    return new Date(date.getTime() + offsetDiff);
  };

  const getTimezoneOffset = (tz) => {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: tz }));
    return (utc.getTime() - targetTime.getTime()) / 60000;
  };

  // Fetch standalone calendar events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        const response = await fetch('/api/calendar/events', {
          credentials: 'include'
        });
        if (response.ok) {
          const { events } = await response.json();
          console.log('[IntegratedCalendar] Fetched standalone calendar events:', events);
          setCalendarEvents(events || []);
        }
      } catch (error) {
        console.error('[IntegratedCalendar] Error fetching calendar events:', error);
      }
    };
    
    fetchCalendarEvents();
  }, [refreshTrigger]);

  // Auto-refresh calendar every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render by updating a dummy state
      setSelectedDate(prev => new Date(prev));
      setRefreshTrigger(prev => prev + 1); // Also refresh standalone events
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get calendar events from tickets and standalone calendar events
  const getCalendarEvents = () => {
    // Get ticket-based events
    const ticketEvents = tickets
      .filter(ticket => {
        // Filter based on view preference
        if (showAssignedOnly && ticket.assignedTo !== currentUser.id) {
          return false;
        }
        // Include tickets with due dates, scheduled dates, or scheduled work
        return ticket.dueDate || ticket.scheduled_date || (ticket.scheduledWork && ticket.scheduledWork.length > 0);
      })
      .map(ticket => {
        const assignedUser = users.find(u => u.id === ticket.assignedTo);
        const events = [];
        
        if (ticket.dueDate) {
          let dueDateStr = ticket.dueDate;
          if (dueDateStr.includes('T')) dueDateStr = dueDateStr.split('T')[0];
          events.push({
            id: `due-${ticket.id}`,
            ticketId: ticket.id,
            title: `${ticket.title}`,
            type: 'due',
            date: dueDateStr,
            time: ticket.dueDate.includes('T') ? ticket.dueDate.split('T')[1].substring(0, 5) : '23:59',
            ticket: ticket,
            assignedUser: assignedUser,
            status: ticket.status
          });
        }
        
        if (ticket.scheduled_date) {
          let scheduledDateStr = ticket.scheduled_date;
          if (scheduledDateStr.includes('T')) scheduledDateStr = scheduledDateStr.split('T')[0];
          events.push({
            id: `scheduled-${ticket.id}`,
            ticketId: ticket.id,
            title: `${ticket.title}`,
            type: 'scheduled',
            date: scheduledDateStr,
            time: ticket.scheduled_date.includes('T') ? ticket.scheduled_date.split('T')[1].substring(0, 5) : '09:00',
            ticket: ticket,
            assignedUser: assignedUser,
            status: ticket.status
          });
        }
        
        if (ticket.scheduledWork && Array.isArray(ticket.scheduledWork)) {
          ticket.scheduledWork.forEach((work, index) => {
            events.push({
              id: `work-${ticket.id}-${index}`,
              ticketId: ticket.id,
              title: `${ticket.title}`,
              type: 'work',
              date: work.date,
              startTime: work.startTime,
              endTime: work.endTime,
              notes: work.notes,
              ticket: ticket,
              assignedUser: assignedUser,
              status: ticket.status
            });
          });
        }
        
        return events;
      })
      .flat();
    
    // Add standalone calendar events (not tied to tickets)
    const standaloneEvents = calendarEvents.map(event => {
      // Handle date formatting - eventDate might be a Date object or string
      let dateStr = event.eventDate;
      if (dateStr && typeof dateStr === 'object') {
        dateStr = dateStr.toISOString().split('T')[0];
      } else if (dateStr && dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }
      
      // Handle time formatting - might include seconds
      let startTime = event.startTime || '09:00';
      let endTime = event.endTime || '10:00';
      if (startTime.length > 5) startTime = startTime.substring(0, 5);
      if (endTime.length > 5) endTime = endTime.substring(0, 5);
      
      return {
        id: `calendar-${event.id}`,
        calendarEventId: event.id,
        title: event.title,
        type: 'calendar-work',
        date: dateStr,
        startTime: startTime,
        endTime: endTime,
        notes: event.notes,
        description: event.description,
        assignedUser: users.find(u => u.id === event.userId) || { name: event.userName || 'Unknown' },
        status: 'scheduled',
        isStandalone: true
      };
    });
    
    return [...ticketEvents, ...standaloneEvents];
  };

  // Generate time slots for a day
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return getCalendarEvents().filter(event => event.date === dateStr);
  };

  // Get current week dates
  const getCurrentWeekDates = () => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  // Handle scheduling work for a ticket or standalone event
  const handleScheduleWork = (ticket, standalone = false) => {
    setSelectedTicket(ticket);
    setIsStandaloneEvent(standalone);
    
    // Calculate start and end time based on clicked time slot
    const clickedTime = ticket.clickedTime || '09:00';
    const [hours, minutes] = clickedTime.split(':');
    const startHour = parseInt(hours);
    const endHour = Math.min(startHour + 1, 23); // Cap at 23:00
    const defaultStartTime = `${hours}:${minutes}`;
    const defaultEndTime = `${endHour.toString().padStart(2, '0')}:${minutes}`;
    
    setScheduleData({
      date: ticket.dueDate || '',
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      notes: '',
      title: standalone ? '' : ticket.title
    });
    setShowScheduleModal(true);
  };

  // Save scheduled work (handles both new and edited entries, and standalone events)
  const handleSaveSchedule = async () => {
    if (!scheduleData.date || !scheduleData.startTime || !scheduleData.endTime) {
      return;
    }
    
    // Handle standalone calendar events (not tied to tickets)
    if (isStandaloneEvent) {
      if (!scheduleData.title) {
        alert('Please enter a title for the event');
        return;
      }
      
      try {
        const response = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: scheduleData.title,
            eventDate: scheduleData.date,
            startTime: scheduleData.startTime,
            endTime: scheduleData.endTime,
            notes: scheduleData.notes,
            eventType: 'work'
          })
        });
        
        if (response.ok) {
          console.log('[IntegratedCalendar] Standalone event created successfully');
          setRefreshTrigger(prev => prev + 1); // Refresh calendar events
        } else {
          const error = await response.json();
          console.error('[IntegratedCalendar] Error creating event:', error);
          alert('Failed to create event: ' + (error.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('[IntegratedCalendar] Error creating standalone event:', error);
        alert('Failed to create event');
      }
      
      setShowScheduleModal(false);
      setSelectedTicket(null);
      setIsStandaloneEvent(false);
      setScheduleData({ date: '', startTime: '', endTime: '', notes: '', title: '' });
      return;
    }
    
    // Handle ticket-based scheduled work
    if (!selectedTicket) {
      return;
    }

    // Use timezone-aware date creation for scheduled work
    const startDateTime = createDateInTimezone(scheduleData.date, scheduleData.startTime);
    const endDateTime = createDateInTimezone(scheduleData.date, scheduleData.endTime);

    // Check if we're editing an existing entry
    const existingWorkIndex = selectedTicket.scheduledWork?.findIndex(work => 
      work.date === scheduleData.originalDate && 
      work.startTime === scheduleData.originalStartTime &&
      work.endTime === scheduleData.originalEndTime
    );

    let updatedScheduledWork;
    
    if (existingWorkIndex !== undefined && existingWorkIndex >= 0) {
      // Update existing entry
      updatedScheduledWork = [...(selectedTicket.scheduledWork || [])];
      updatedScheduledWork[existingWorkIndex] = {
        date: scheduleData.date,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        notes: scheduleData.notes,
        scheduledBy: currentUser.id,
        scheduledAt: new Date().toISOString()
      };
    } else {
      // Add new entry
      updatedScheduledWork = [
        ...(selectedTicket.scheduledWork || []),
        {
          date: scheduleData.date,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          notes: scheduleData.notes,
          scheduledBy: currentUser.id,
          scheduledAt: new Date().toISOString()
        }
      ];
    }

    updateTicket(selectedTicket.id, {
      scheduledWork: updatedScheduledWork
    });
    
    setShowScheduleModal(false);
    setSelectedTicket(null);
    setIsStandaloneEvent(false);
    setScheduleData({ date: '', startTime: '', endTime: '', notes: '', title: '' });
  };

  // Remove scheduled work
  const handleRemoveScheduledWork = (ticketId, workIndex) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    updateTicket(ticketId, {
      scheduledWork: ticket.scheduledWork.filter((_, index) => index !== workIndex)
    });
  };

  // Get status color
  const getStatusColor = (status, type) => {
    if (type === 'due') {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800 border-green-200';
        case 'parked': return 'bg-gray-100 text-gray-600 border-gray-200';
        case 'closed': return 'bg-gray-100 text-gray-600 border-gray-200';
        default: return 'bg-red-100 text-red-800 border-red-200';
      }
    } else if (type === 'scheduled') {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800 border-green-200';
        case 'parked': return 'bg-gray-100 text-gray-600 border-gray-200';
        case 'closed': return 'bg-gray-100 text-gray-600 border-gray-200';
        default: return 'bg-purple-100 text-purple-800 border-purple-200';
      }
    } else if (type === 'calendar-work') {
      // Standalone calendar events - use teal/cyan color to distinguish from ticket work
      return 'bg-teal-100 text-teal-800 border-teal-200';
    } else {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800 border-green-200';
        case 'parked': return 'bg-gray-100 text-gray-600 border-gray-200';
        case 'closed': return 'bg-gray-100 text-gray-600 border-gray-200';
        default: return 'bg-blue-100 text-blue-800 border-blue-200';
      }
    }
  };

  // Get event background color for inline styles
  const getEventColor = (event) => {
    if (event.type === 'calendar-work') {
      return '#ccfbf1'; // teal-100 for standalone calendar events
    } else if (event.type === 'due') {
      switch (event.status) {
        case 'completed': return '#dcfce7'; // green-100
        case 'parked': return '#f3f4f6'; // gray-100
        case 'closed': return '#f3f4f6'; // gray-100
        default: return '#fecaca'; // red-100
      }
    } else if (event.type === 'scheduled') {
      switch (event.status) {
        case 'completed': return '#dcfce7'; // green-100
        case 'parked': return '#f3f4f6'; // gray-100
        case 'closed': return '#f3f4f6'; // gray-100
        default: return '#f3e8ff'; // purple-100
      }
    } else {
      switch (event.status) {
        case 'completed': return '#dcfce7'; // green-100
        case 'parked': return '#f3f4f6'; // gray-100
        case 'closed': return '#f3f4f6'; // gray-100
        default: return '#dbeafe'; // blue-100
      }
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const weekDates = getCurrentWeekDates();
  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-6 min-h-screen">
      {/* Calendar Header */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <CardTitle className="text-base sm:text-lg">Ticket Calendar</CardTitle>
            </div>
            
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showAssignedOnly}
                  onCheckedChange={setShowAssignedOnly}
                />
                <Label className="text-xs sm:text-sm">
                  {showAssignedOnly ? 'Assigned to me only' : 'Show all'}
                </Label>
              </div>
              
              {/* View Mode Buttons */}
              <div className="flex space-x-1">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="text-xs px-2 py-1"
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="text-xs px-2 py-1"
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="text-xs px-2 py-1 hidden sm:inline-flex"
                >
                  Month
                </Button>
              </div>
            </div>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 7);
                setSelectedDate(newDate);
              }}
            >
              Previous Week
            </Button>
            
            <h3 className="text-lg font-medium">
              {selectedDate.toLocaleDateString('en-GB', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h3>
            
            <Button
              variant="outline"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 7);
                setSelectedDate(newDate);
              }}
            >
              Next Week
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Week View */}
      {viewMode === 'week' && (
        <Card>
          <CardContent className="p-0">
            {/* Mobile: Stack days vertically */}
            <div className="block sm:hidden">
              {weekDates.map((date, dateIndex) => (
                <div key={dateIndex} className="border-b">
                  <div className="p-3 bg-gray-50 border-b">
                    <div className="text-sm font-medium text-center">{formatDate(date)}</div>
                  </div>
                  <div className="space-y-1 p-2">
                    {getEventsForDate(date).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className="p-2 rounded text-xs cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: getEventColor(event) }}
                        onClick={() => {
                          if (event.type === 'due') {
                            onTicketClick(event.ticket);
                          } else if (event.type === 'work') {
                            onTicketClick(event.ticket);
                          }
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {event.assignedUser && (
                          <div className="text-gray-600 truncate">{event.assignedUser.name || 'Unassigned'}</div>
                        )}
                        {event.time && (
                          <div className="text-gray-600">{event.time}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-8 border-b">
                <div className="p-3 border-r bg-gray-50">
                  <span className="text-sm font-medium text-gray-600">Time</span>
                </div>
                {weekDates.map((date, index) => (
                  <div key={index} className="p-3 border-r bg-gray-50 text-center">
                    <div className="text-sm font-medium">{formatDate(date)}</div>
                  </div>
                ))}
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {timeSlots.map((time) => (
                  <div key={time} className="grid grid-cols-8 border-b min-h-[60px]">
                  <div className="p-2 border-r bg-gray-50 text-xs text-gray-600">
                    {time}
                  </div>
                  {weekDates.map((date, dateIndex) => {
                    const allEvents = getEventsForDate(date);
                    const workEvents = allEvents.filter(event => {
                      if (event.type === 'work') {
                        return event.startTime <= time && event.endTime > time;
                      }
                      return false;
                    });
                    
                    // Also show due dates at the top of the day
                    const dueEvents = time === '08:00' ? allEvents.filter(event => event.type === 'due') : [];
                    const eventsToShow = [...workEvents, ...dueEvents];
                    
                    return (
                      <div 
                        key={dateIndex} 
                        className="p-1 border-r relative cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          // Click on day box to show detailed day view
                          if (eventsToShow.length === 0) {
                            setSelectedDate(date);
                            setViewMode('day');
                          }
                        }}
                      >
                        {eventsToShow.map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs p-2 rounded mb-1 border cursor-pointer hover:opacity-80 ${getStatusColor(event.status, event.type)}`}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent day click
                              console.log('[IntegratedCalendar] Event clicked:', event);
                              console.log('[IntegratedCalendar] onTicketClick exists:', !!onTicketClick);
                              console.log('[IntegratedCalendar] event.ticket:', event.ticket);
                              
                              // Open ticket modal for any calendar event
                              if (onTicketClick && event.ticket) {
                                console.log('[IntegratedCalendar] Calling onTicketClick with ticket:', event.ticket.id);
                                onTicketClick(event.ticket);
                              } else if (event.type === 'work') {
                                // Allow editing of scheduled work
                                setSelectedTicket(event.ticket);
                                setScheduleData({
                                  date: event.date,
                                  startTime: event.startTime,
                                  endTime: event.endTime,
                                  notes: event.notes || '',
                                  originalDate: event.date,
                                  originalStartTime: event.startTime,
                                  originalEndTime: event.endTime
                                });
                                setShowScheduleModal(true);
                              }
                            }}
                          >
                            <div className="font-medium truncate" title={event.title}>
                              {event.title}
                            </div>
                            <div className="text-xs opacity-75" title={event.assignedUser?.name || 'Unassigned'}>
                              {event.assignedUser?.name || 'Unassigned'}
                            </div>
                            {event.type === 'work' && (
                              <div className="text-xs opacity-60">
                                {event.startTime} - {event.endTime}
                              </div>
                            )}
                            {event.type === 'due' && (
                              <div className="text-xs opacity-60">
                                Due Today
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Day View - {formatDate(selectedDate)}</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setSelectedDate(newDate);
                  }}
                >
                  Previous Day
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setSelectedDate(newDate);
                  }}
                >
                  Next Day
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {timeSlots.map((time) => {
                const dayEvents = getEventsForDate(selectedDate);
                const workEvents = dayEvents.filter(event => {
                  if (event.type === 'work' || event.type === 'calendar-work') {
                    return event.startTime <= time && event.endTime > time;
                  }
                  return false;
                });
                
                const dueEvents = time === '08:00' ? dayEvents.filter(event => event.type === 'due') : [];
                const eventsToShow = [...workEvents, ...dueEvents];
                
                return (
                  <div key={time} className="grid grid-cols-12 border-b min-h-[60px] hover:bg-gray-50">
                    <div className="col-span-2 p-3 border-r bg-gray-50 text-sm font-medium text-gray-600">
                      {time}
                    </div>
                    <div 
                      className="col-span-10 p-2 cursor-pointer"
                      onClick={() => {
                        // Click on time slot to create new standalone event at this time
                        const newEvent = {
                          id: Date.now(),
                          title: '',
                          dueDate: selectedDate.toISOString().split('T')[0],
                          assignedTo: currentUser.id,
                          clickedTime: time // Pass the clicked time slot
                        };
                        handleScheduleWork(newEvent, true); // true = standalone event
                      }}
                    >
                      {eventsToShow.map((event) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded mb-2 border cursor-pointer hover:opacity-80 ${getStatusColor(event.status, event.type)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onTicketClick && event.ticket) {
                              onTicketClick(event.ticket);
                            }
                          }}
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm opacity-75">
                            {event.assignedUser?.name || 'Unassigned'}
                          </div>
                          {(event.type === 'work' || event.type === 'calendar-work') && (
                            <div className="text-sm opacity-60">
                              {event.startTime} - {event.endTime}
                            </div>
                          )}
                          {event.type === 'due' && (
                            <div className="text-sm opacity-60">
                              Due: {event.time}
                            </div>
                          )}
                          {event.type === 'calendar-work' && (
                            <div className="text-xs opacity-50 italic">
                              Calendar Event
                            </div>
                          )}
                        </div>
                      ))}
                      {eventsToShow.length === 0 && (
                        <div className="text-gray-400 text-sm p-2">
                          Click to add event
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Month View - {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                >
                  Previous Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                >
                  Next Month
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Month Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border">
              {/* Day Headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="p-3 text-center font-medium text-gray-700 border-b bg-gray-50">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {(() => {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                
                // Start from Monday of the week containing the first day
                const startDate = new Date(firstDay);
                const dayOfWeek = firstDay.getDay();
                const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate.setDate(firstDay.getDate() - daysToSubtract);
                
                // Generate 42 days (6 weeks) to fill the calendar grid
                const monthDays = [];
                for (let i = 0; i < 42; i++) {
                  const date = new Date(startDate);
                  date.setDate(startDate.getDate() + i);
                  monthDays.push({ date, isCurrentMonth: date.getMonth() === month });
                }
                
                return monthDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day.date);
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  const isCurrentMonth = day.isCurrentMonth;
                  
                  return (
                    <div 
                      key={index} 
                      className={`min-h-[120px] p-2 border-b border-r cursor-pointer hover:bg-gray-50 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        setSelectedDate(day.date);
                        setViewMode('day');
                      }}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate ${getStatusColor(event.status, event.type)}`}
                            title={`${event.title} - ${event.assignedUser?.name || 'Unassigned'} ${event.type === 'work' ? `(${event.startTime})` : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('[IntegratedCalendar Month] Event clicked:', event);
                              console.log('[IntegratedCalendar Month] onTicketClick exists:', !!onTicketClick);
                              console.log('[IntegratedCalendar Month] event.ticket:', event.ticket);
                              
                              if (onTicketClick && event.ticket) {
                                console.log('[IntegratedCalendar Month] Calling onTicketClick with ticket:', event.ticket.id);
                                onTicketClick(event.ticket);
                              }
                            }}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {event.type === 'work' && (
                              <div className="truncate">{event.startTime}</div>
                            )}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Dates and Scheduled Work Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Due Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>Upcoming Due Dates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getCalendarEvents()
                .filter(event => event.type === 'due' && event.status !== 'completed')
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 5)
                .map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{event.ticket.title}</p>
                      <p className="text-sm text-gray-600">
                        Due: {new Date(event.date).toLocaleDateString('en-GB')}
                      </p>
                      <p className="text-xs text-gray-500">
                        Assigned to: {event.assignedUser?.name || 'Unassigned'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleScheduleWork(event.ticket)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Work */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Scheduled Work</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getCalendarEvents()
                .filter(event => event.type === 'work')
                .sort((a, b) => new Date(a.date + ' ' + a.startTime) - new Date(b.date + ' ' + b.startTime))
                .slice(0, 5)
                .map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{event.ticket.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(event.date).toLocaleDateString('en-GB')} 
                        {' '}{event.startTime} - {event.endTime}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.assignedUser?.name || 'Unassigned'}
                      </p>
                    </div>
                    <Badge variant={event.status === 'completed' ? 'default' : 'secondary'}>
                      {event.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Work Modal */}
      {showScheduleModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {isStandaloneEvent ? 'Create Calendar Event' : `Schedule Work: ${selectedTicket.title}`}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setIsStandaloneEvent(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title field for standalone events */}
              {isStandaloneEvent && (
                <div>
                  <Label>Event Title</Label>
                  <Input
                    value={scheduleData.title}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title"
                  />
                </div>
              )}
              
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Select 
                    value={scheduleData.startTime} 
                    onValueChange={(value) => setScheduleData(prev => ({ ...prev, startTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeOptions().map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>End Time</Label>
                  <Select 
                    value={scheduleData.endTime} 
                    onValueChange={(value) => setScheduleData(prev => ({ ...prev, endTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
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
                <Label>Notes (Optional)</Label>
                <Input
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this work session"
                />
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSaveSchedule} className="flex-1">
                  {isStandaloneEvent ? 'Create Event' : (scheduleData.originalDate ? 'Update Work' : 'Schedule Work')}
                </Button>
                {!isStandaloneEvent && scheduleData.originalDate && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const workIndex = selectedTicket.scheduledWork?.findIndex(work => 
                        work.date === scheduleData.originalDate && 
                        work.startTime === scheduleData.originalStartTime &&
                        work.endTime === scheduleData.originalEndTime
                      );
                      if (workIndex !== undefined && workIndex >= 0) {
                        handleRemoveScheduledWork(selectedTicket.id, workIndex);
                      }
                      setShowScheduleModal(false);
                    }}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setIsStandaloneEvent(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default IntegratedCalendar;

