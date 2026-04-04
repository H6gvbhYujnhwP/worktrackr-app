import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Phone, Mail, DollarSign, Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

const BookingCalendar = ({ businessType = 'electrician' }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week', 'day', 'month'

  // Load bookings from localStorage AND tickets with scheduled dates
  const loadBookingsFromStorage = () => {
    const ticketBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
    const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
    
    // Convert tickets with scheduled_date to booking events
    const ticketEvents = tickets
      .filter(ticket => ticket.scheduled_date)
      .map(ticket => ({
        id: `ticket-${ticket.id}`,
        customerName: ticket.contact || 'Customer',
        customerPhone: '',
        customerEmail: '',
        service: ticket.title || `Ticket #${ticket.id}`,
        date: ticket.scheduled_date.split('T')[0], // Extract date part
        startTime: ticket.scheduled_date.split('T')[1]?.substring(0, 5) || '09:00', // Extract time part
        endTime: ticket.scheduled_date.split('T')[1] ? 
          (parseInt(ticket.scheduled_date.split('T')[1].substring(0, 2)) + 1).toString().padStart(2, '0') + 
          ':' + ticket.scheduled_date.split('T')[1].substring(3, 5) : '10:00',
        duration: 60,
        location: ticket.location || 'TBD',
        status: 'confirmed',
        price: 0,
        notes: ticket.description || '',
        invoiceStatus: 'not_created',
        source: 'ticket' // Mark as coming from ticket system
      }));
    
    return [...sampleBookings, ...ticketBookings, ...ticketEvents];
  };

  // Sample booking data
  const sampleBookings = [
    {
      id: 'BK-001',
      customerName: 'Sarah Johnson',
      customerPhone: '07123 456789',
      customerEmail: 'sarah.johnson@email.com',
      service: 'Electrical Safety Inspection',
      date: '2024-09-14',
      startTime: '09:00',
      endTime: '11:00',
      duration: 120,
      location: '42 Oak Street, Manchester M1 2AB',
      status: 'confirmed',
      price: 150,
      notes: 'Annual safety inspection for rental property',
      invoiceStatus: 'pending'
    },
    {
      id: 'BK-002',
      customerName: 'Mike Thompson',
      customerPhone: '07987 654321',
      customerEmail: 'mike.thompson@email.com',
      service: 'Socket Installation',
      date: '2024-09-14',
      startTime: '14:00',
      endTime: '16:00',
      duration: 120,
      location: '15 High Street, Manchester M2 1AB',
      status: 'confirmed',
      price: 200,
      notes: 'Install 3 new double sockets in kitchen',
      invoiceStatus: 'sent'
    },
    {
      id: 'BK-003',
      customerName: 'Emma Wilson',
      customerPhone: '07555 123456',
      customerEmail: 'emma.wilson@email.com',
      service: 'Emergency Call Out',
      date: '2024-09-15',
      startTime: '10:30',
      endTime: '12:30',
      duration: 120,
      location: '78 Church Lane, Manchester M3 4CD',
      status: 'in_progress',
      price: 300,
      notes: 'Power outage in main fuse box - urgent',
      invoiceStatus: 'draft'
    },
    {
      id: 'BK-004',
      customerName: 'David Brown',
      customerPhone: '07444 987654',
      customerEmail: 'david.brown@email.com',
      service: 'Light Fitting Installation',
      date: '2024-09-15',
      startTime: '15:00',
      endTime: '17:00',
      duration: 120,
      location: '23 Park Road, Manchester M4 5EF',
      status: 'pending',
      price: 180,
      notes: 'Install ceiling lights in 3 bedrooms',
      invoiceStatus: 'not_created'
    }
  ];

  const [bookings, setBookings] = useState(loadBookingsFromStorage());

  // Auto-refresh bookings from localStorage (following CRM calendar pattern)
  useEffect(() => {
    const interval = setInterval(() => {
      setBookings(loadBookingsFromStorage());
    }, 1000); // Check every second for new bookings

    return () => clearInterval(interval);
  }, []);

  // Service types based on business
  const serviceTypes = {
    electrician: [
      { name: 'Electrical Safety Inspection', duration: 120, price: 150 },
      { name: 'Socket Installation', duration: 120, price: 200 },
      { name: 'Light Fitting Installation', duration: 120, price: 180 },
      { name: 'Fuse Box Upgrade', duration: 240, price: 400 },
      { name: 'Emergency Call Out', duration: 120, price: 300 },
      { name: 'Rewiring', duration: 480, price: 800 }
    ],
    plumber: [
      { name: 'Boiler Service', duration: 90, price: 120 },
      { name: 'Leak Repair', duration: 60, price: 80 },
      { name: 'Bathroom Installation', duration: 480, price: 1200 },
      { name: 'Drain Unblocking', duration: 60, price: 100 },
      { name: 'Emergency Call Out', duration: 90, price: 200 }
    ]
  };

  const currentServices = serviceTypes[businessType] || serviceTypes.electrician;

  // Generate time slots for booking
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':   return 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]';
      case 'pending':     return 'bg-[#fef9c3] text-[#854d0e] border-[#fde68a]';
      case 'in_progress': return 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]';
      case 'completed':   return 'bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]';
      case 'cancelled':   return 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]';
      default:            return 'bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]';
    }
  };

  const getInvoiceStatusColor = (status) => {
    switch (status) {
      case 'paid':        return 'bg-[#dcfce7] text-[#166534]';
      case 'sent':        return 'bg-[#dbeafe] text-[#1e40af]';
      case 'pending':     return 'bg-[#fef9c3] text-[#854d0e]';
      case 'draft':       return 'bg-[#f3f4f6] text-[#374151]';
      case 'not_created': return 'bg-[#fee2e2] text-[#991b1b]';
      default:            return 'bg-[#f3f4f6] text-[#374151]';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const isTimeSlotBooked = (date, time) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.some(booking => 
      booking.date === dateString && 
      time >= booking.startTime && 
      time < booking.endTime
    );
  };

  const getBookingsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === dateString);
  };

  const generateWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  const generateMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    const monthDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      monthDays.push({ date, isCurrentMonth: date.getMonth() === month });
    }
    
    return monthDays;
  };

  const weekDays = generateWeekDays();

  const navigatePrev = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month')      newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'week')  newDate.setDate(newDate.getDate() - 7);
    else                           newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month')      newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'week')  newDate.setDate(newDate.getDate() + 7);
    else                           newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111113]">Ticket Calendar</h2>
          <p className="text-sm text-[#6b7280] mt-0.5">Manage your appointments and schedule new tickets</p>
        </div>
        <button
          onClick={() => setShowBookingForm(true)}
          className="px-4 py-2 text-sm font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>

      <div className="p-6 space-y-6">

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Calendar, color: 'text-[#d4a017]', label: "Today's Bookings", value: getBookingsForDate(new Date()).length },
            { icon: DollarSign, color: 'text-[#16a34a]', label: "Today's Revenue", value: `£${getBookingsForDate(new Date()).reduce((sum, b) => sum + b.price, 0)}` },
            { icon: CheckCircle, color: 'text-[#0891b2]', label: 'Completed', value: bookings.filter(b => b.status === 'completed').length },
            { icon: AlertCircle, color: 'text-[#d97706]', label: 'Pending Invoices', value: bookings.filter(b => b.invoiceStatus === 'not_created' || b.invoiceStatus === 'draft').length },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="bg-[#fafafa] border border-[#e5e7eb] rounded-xl p-4 flex items-center gap-3">
              <Icon className={`w-7 h-7 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold text-[#111113] mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between">
          <div className="flex border border-[#e5e7eb] rounded-lg overflow-hidden">
            {['day', 'week', 'month'].map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-4 py-2 text-xs font-medium capitalize transition-colors
                  ${viewMode === v ? 'bg-[#d4a017] text-[#111113]' : 'bg-white text-[#6b7280] hover:bg-[#f9fafb]'}`}
              >
                {v}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrev}
              className="px-3 py-1.5 text-xs font-medium border border-[#e5e7eb] rounded-lg bg-white text-[#374151] hover:bg-[#f9fafb] transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-[#374151] px-2">
              {viewMode === 'month' 
                ? selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : viewMode === 'week'
                ? `Week of ${selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              }
            </span>
            <button
              onClick={navigateNext}
              className="px-3 py-1.5 text-xs font-medium border border-[#e5e7eb] rounded-lg bg-white text-[#374151] hover:bg-[#f9fafb] transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 bg-[#fafafa] border-b border-[#e5e7eb]">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="p-3 text-center text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider border-r border-[#e5e7eb] last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {generateMonthDays().map((day, index) => {
                const dayBookings = getBookingsForDate(day.date);
                const isToday = day.date.toDateString() === new Date().toDateString();
                const isCurrentMonth = day.date.getMonth() === selectedDate.getMonth();
                
                return (
                  <div 
                    key={index} 
                    className={`min-h-[120px] p-2 border-r border-b border-[#e5e7eb] last:border-r-0 transition-colors
                      ${isCurrentMonth ? 'bg-white hover:bg-[#fef9ee]' : 'bg-[#fafafa]'}
                      ${isToday ? 'bg-[#fef9ee]' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-[#d4a017] text-[#111113]' : isCurrentMonth ? 'text-[#111113]' : 'text-[#9ca3af]'}`}>
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map(booking => (
                        <div
                          key={booking.id}
                          className="text-xs p-1 bg-[#dbeafe] text-[#1e40af] rounded cursor-pointer hover:bg-[#bfdbfe] transition-colors truncate"
                          title={`${booking.customerName} - ${booking.service} (${booking.startTime})`}
                        >
                          <div className="font-medium truncate">{booking.startTime}</div>
                          <div className="truncate">{booking.customerName}</div>
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-[#9ca3af] text-center">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-8 gap-3">
            {/* Time Column */}
            <div className="space-y-2">
              <div className="h-12 flex items-center justify-center text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                Time
              </div>
              {timeSlots.filter((_, index) => index % 2 === 0).map(time => (
                <div key={time} className="h-16 flex items-center justify-center text-xs text-[#9ca3af] border-t border-[#e5e7eb]">
                  {time}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="space-y-2">
                <div className="h-12 flex flex-col items-center justify-center bg-[#fafafa] border border-[#e5e7eb] rounded-lg">
                  <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                    {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </div>
                  <div className="text-base font-bold text-[#111113]">
                    {day.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {getBookingsForDate(day).map(booking => (
                    <div
                      key={booking.id}
                      className="p-2 bg-[#dbeafe] border border-[#bfdbfe] rounded-lg text-xs cursor-pointer hover:bg-[#bfdbfe] transition-colors"
                      style={{
                        height: `${(booking.duration / 30) * 16}px`,
                        minHeight: '32px'
                      }}
                    >
                      <div className="font-medium text-[#1e40af] truncate">
                        {booking.customerName}
                      </div>
                      <div className="text-[#2563eb] truncate">
                        {booking.service}
                      </div>
                      <div className="text-[#3b82f6]">
                        {booking.startTime} - {booking.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Today's Bookings */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e5e7eb] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#d4a017]" />
            <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Today's Bookings</span>
          </div>
          <div className="divide-y divide-[#e5e7eb]">
            {getBookingsForDate(new Date()).length === 0 ? (
              <div className="text-center py-10 text-[#9ca3af] text-sm">
                No bookings scheduled for today
              </div>
            ) : (
              getBookingsForDate(new Date()).map(booking => (
                <div key={booking.id} className="p-5 flex items-start justify-between hover:bg-[#fafafa] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold text-[#111113] text-[13px]">{booking.customerName}</h4>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getInvoiceStatusColor(booking.invoiceStatus)}`}>
                        Invoice: {booking.invoiceStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-[#6b7280]">
                      <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />{booking.startTime} - {booking.endTime}</div>
                      <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{booking.customerPhone}</div>
                      <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" />{booking.service}</div>
                      <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{booking.customerEmail}</div>
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{booking.location}</div>
                      <div className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" />£{booking.price}</div>
                    </div>
                    {booking.notes && (
                      <div className="mt-2 px-3 py-2 bg-[#fafafa] border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280]">
                        {booking.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button className="w-8 h-8 flex items-center justify-center border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111113] transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {booking.invoiceStatus === 'not_created' && (
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-colors">
                        Create Invoice
                      </button>
                    )}
                    {booking.invoiceStatus === 'draft' && (
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg transition-colors">
                        Send Invoice
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#111113]">New Booking</h3>
              <p className="text-sm text-[#6b7280] mt-0.5">Schedule a new appointment</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Customer Name</Label>
                  <Input id="customerName" placeholder="Enter customer name" className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]" />
                </div>
                <div>
                  <Label htmlFor="customerPhone" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Phone Number</Label>
                  <Input id="customerPhone" placeholder="07123 456789" className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]" />
                </div>
                <div>
                  <Label htmlFor="customerEmail" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Email Address</Label>
                  <Input id="customerEmail" type="email" placeholder="customer@email.com" className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]" />
                </div>
                <div>
                  <Label htmlFor="service" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Service Type</Label>
                  <select id="service" className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] bg-white text-[#111113]">
                    {currentServices.map(service => (
                      <option key={service.name} value={service.name}>
                        {service.name} - £{service.price} ({service.duration}min)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="date" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Date</Label>
                  <Input id="date" type="date" className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]" />
                </div>
                <div>
                  <Label htmlFor="time" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Time</Label>
                  <select id="time" className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017] bg-white text-[#111113]">
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="location" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Location</Label>
                <Input id="location" placeholder="Customer address" className="border-[#e5e7eb] focus:ring-[#d4a017]/30 focus:border-[#d4a017]" />
              </div>
              <div>
                <Label htmlFor="notes" className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5 block">Notes</Label>
                <textarea 
                  id="notes" 
                  className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a017]/30 focus:border-[#d4a017]" 
                  rows="3"
                  placeholder="Additional notes about the job"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-sm font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8860b] rounded-lg transition-colors"
                >
                  Create Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
