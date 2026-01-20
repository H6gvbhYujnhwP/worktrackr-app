import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Phone, Mail, DollarSign, Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
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
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInvoiceStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'not_created': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    // Generate 42 days (6 weeks) to fill the calendar grid
    const monthDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      monthDays.push({ date, isCurrentMonth: date.getMonth() === month });
    }
    
    return monthDays;
  };

  const weekDays = generateWeekDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Ticket Calendar</CardTitle>
              <CardDescription className="text-lg mt-2">
                Manage your appointments and schedule new tickets
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setShowBookingForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant={viewMode === 'day' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('day')}
          >
            Day
          </Button>
          <Button 
            variant={viewMode === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
          <Button 
            variant={viewMode === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => {
            const newDate = new Date(selectedDate);
            if (viewMode === 'month') {
              newDate.setMonth(newDate.getMonth() - 1);
            } else if (viewMode === 'week') {
              newDate.setDate(newDate.getDate() - 7);
            } else {
              newDate.setDate(newDate.getDate() - 1);
            }
            setSelectedDate(newDate);
          }}>
            Previous
          </Button>
          <span className="text-lg font-medium px-4">
            {viewMode === 'month' 
              ? selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              : viewMode === 'week'
              ? `Week of ${selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            }
          </span>
          <Button variant="outline" size="sm" onClick={() => {
            const newDate = new Date(selectedDate);
            if (viewMode === 'month') {
              newDate.setMonth(newDate.getMonth() + 1);
            } else if (viewMode === 'week') {
              newDate.setDate(newDate.getDate() + 7);
            } else {
              newDate.setDate(newDate.getDate() + 1);
            }
            setSelectedDate(newDate);
          }}>
            Next
          </Button>
        </div>
      </div>

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-lg border">
          {/* Month Header */}
          <div className="grid grid-cols-7 gap-0 border-b">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="p-4 text-center font-medium text-gray-700 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 gap-0">
            {generateMonthDays().map((day, index) => {
              const dayBookings = getBookingsForDate(day.date);
              const isToday = day.date.toDateString() === new Date().toDateString();
              const isCurrentMonth = day.date.getMonth() === selectedDate.getMonth();
              
              return (
                <div 
                  key={index} 
                  className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  } ${isToday ? 'text-blue-600' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <div
                        key={booking.id}
                        className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors truncate"
                        title={`${booking.customerName} - ${booking.service} (${booking.startTime})`}
                      >
                        <div className="font-medium truncate">{booking.startTime}</div>
                        <div className="truncate">{booking.customerName}</div>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
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
        <div className="grid grid-cols-8 gap-4">
          {/* Time Column */}
          <div className="space-y-2">
            <div className="h-12 flex items-center justify-center font-medium text-gray-700">
              Time
            </div>
            {timeSlots.filter((_, index) => index % 2 === 0).map((time) => (
              <div key={time} className="h-16 flex items-center justify-center text-sm text-gray-600 border-t">
                {time}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="space-y-2">
              {/* Day Header */}
              <div className="h-12 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">
                  {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {day.getDate()}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-1">
                {getBookingsForDate(day).map((booking) => (
                  <div
                    key={booking.id}
                    className="p-2 bg-blue-100 border border-blue-200 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                    style={{
                      height: `${(booking.duration / 30) * 16}px`,
                      minHeight: '32px'
                    }}
                  >
                    <div className="font-medium text-blue-900 truncate">
                      {booking.customerName}
                    </div>
                    <div className="text-blue-700 truncate">
                      {booking.service}
                    </div>
                    <div className="text-blue-600">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Today's Bookings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getBookingsForDate(new Date()).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No bookings scheduled for today
              </div>
            ) : (
              getBookingsForDate(new Date()).map((booking) => (
                <Card key={booking.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{booking.customerName}</h4>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getInvoiceStatusColor(booking.invoiceStatus)}>
                            Invoice: {booking.invoiceStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>{booking.startTime} - {booking.endTime}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span>{booking.service}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span>{booking.location}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4" />
                              <span>{booking.customerPhone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4" />
                              <span>{booking.customerEmail}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4" />
                              <span>£{booking.price}</span>
                            </div>
                          </div>
                        </div>
                        
                        {booking.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <strong>Notes:</strong> {booking.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {booking.invoiceStatus === 'not_created' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Create Invoice
                          </Button>
                        )}
                        {booking.invoiceStatus === 'draft' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Send Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
                <p className="text-2xl font-bold">{getBookingsForDate(new Date()).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold">
                  £{getBookingsForDate(new Date()).reduce((sum, booking) => sum + booking.price, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.invoiceStatus === 'not_created' || b.invoiceStatus === 'draft').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>New Booking</CardTitle>
              <CardDescription>Schedule a new appointment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input id="customerName" placeholder="Enter customer name" />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input id="customerPhone" placeholder="07123 456789" />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email Address</Label>
                  <Input id="customerEmail" type="email" placeholder="customer@email.com" />
                </div>
                <div>
                  <Label htmlFor="service">Service Type</Label>
                  <select id="service" className="w-full p-2 border border-gray-300 rounded-md">
                    {currentServices.map((service) => (
                      <option key={service.name} value={service.name}>
                        {service.name} - £{service.price} ({service.duration}min)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <select id="time" className="w-full p-2 border border-gray-300 rounded-md">
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Customer address" />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea 
                  id="notes" 
                  className="w-full p-2 border border-gray-300 rounded-md" 
                  rows="3"
                  placeholder="Additional notes about the job"
                ></textarea>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowBookingForm(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowBookingForm(false)}>
                  Create Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;

