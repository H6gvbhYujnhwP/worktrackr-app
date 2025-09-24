/**
 * Utility functions to convert tickets with scheduled dates to booking calendar events
 * Following the CRM calendar integration pattern
 */

// Generate unique booking ID from ticket ID
const generateBookingId = (ticketId) => {
  return `BK-${ticketId}`;
};

// Convert ticket priority to booking status
const mapTicketPriorityToStatus = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
    case 'high':
      return 'confirmed';
    case 'medium':
      return 'pending';
    case 'low':
      return 'pending';
    default:
      return 'pending';
  }
};

// Extract service type from ticket category or description
const extractServiceType = (ticket) => {
  // Check if category matches common service types
  const category = ticket.category?.toLowerCase() || '';
  const description = ticket.description?.toLowerCase() || '';
  
  // Common electrical services
  if (category.includes('electrical') || description.includes('electrical')) {
    if (description.includes('inspection') || description.includes('safety')) {
      return 'Electrical Safety Inspection';
    }
    if (description.includes('socket') || description.includes('outlet')) {
      return 'Socket Installation';
    }
    if (description.includes('light') || description.includes('fitting')) {
      return 'Light Fitting Installation';
    }
    if (description.includes('fuse') || description.includes('box')) {
      return 'Fuse Box Upgrade';
    }
    if (description.includes('emergency') || description.includes('urgent')) {
      return 'Emergency Call Out';
    }
    if (description.includes('rewiring') || description.includes('rewire')) {
      return 'Rewiring';
    }
    return 'Electrical Service';
  }
  
  // Common plumbing services
  if (category.includes('plumbing') || description.includes('plumbing')) {
    if (description.includes('boiler')) {
      return 'Boiler Service';
    }
    if (description.includes('leak')) {
      return 'Leak Repair';
    }
    if (description.includes('bathroom')) {
      return 'Bathroom Installation';
    }
    if (description.includes('drain') || description.includes('block')) {
      return 'Drain Unblocking';
    }
    if (description.includes('emergency') || description.includes('urgent')) {
      return 'Emergency Call Out';
    }
    return 'Plumbing Service';
  }
  
  // Default service based on category or generic
  return ticket.category || 'General Service';
};

// Calculate estimated duration based on service type and priority
const calculateDuration = (ticket) => {
  const serviceType = extractServiceType(ticket);
  const priority = ticket.priority?.toLowerCase() || 'medium';
  
  // Base durations for different service types (in minutes)
  const baseDurations = {
    'Electrical Safety Inspection': 120,
    'Socket Installation': 120,
    'Light Fitting Installation': 120,
    'Fuse Box Upgrade': 240,
    'Emergency Call Out': 120,
    'Rewiring': 480,
    'Boiler Service': 90,
    'Leak Repair': 60,
    'Bathroom Installation': 480,
    'Drain Unblocking': 60,
    'Electrical Service': 120,
    'Plumbing Service': 90,
    'General Service': 120
  };
  
  let duration = baseDurations[serviceType] || 120;
  
  // Adjust duration based on priority
  if (priority === 'urgent' || priority === 'high') {
    duration = Math.max(60, duration * 0.8); // Urgent jobs might be shorter
  }
  
  return Math.round(duration);
};

// Calculate estimated price based on service type and duration
const calculatePrice = (ticket, duration) => {
  const serviceType = extractServiceType(ticket);
  const priority = ticket.priority?.toLowerCase() || 'medium';
  
  // Base hourly rates
  const hourlyRate = 75; // £75 per hour base rate
  const emergencyMultiplier = 1.5;
  
  let basePrice = Math.round((duration / 60) * hourlyRate);
  
  // Emergency surcharge
  if (priority === 'urgent' || serviceType.includes('Emergency')) {
    basePrice = Math.round(basePrice * emergencyMultiplier);
  }
  
  // Minimum charge
  return Math.max(80, basePrice);
};

// Parse scheduled date and time
const parseScheduledDateTime = (scheduledDate) => {
  if (!scheduledDate) return null;
  
  try {
    const date = new Date(scheduledDate);
    if (isNaN(date.getTime())) return null;
    
    return {
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      startTime: date.toTimeString().substring(0, 5), // HH:MM format
      endTime: null // Will be calculated based on duration
    };
  } catch (error) {
    console.error('Error parsing scheduled date:', error);
    return null;
  }
};

// Calculate end time based on start time and duration
const calculateEndTime = (startTime, durationMinutes) => {
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60000));
    
    return endDate.toTimeString().substring(0, 5); // HH:MM format
  } catch (error) {
    console.error('Error calculating end time:', error);
    return startTime; // Fallback to start time
  }
};

/**
 * Convert a ticket with scheduled date to a booking calendar event
 * @param {Object} ticket - The ticket object
 * @returns {Object|null} - Booking event object or null if no scheduled date
 */
export const convertTicketToBookingEvent = (ticket) => {
  if (!ticket || !ticket.scheduled_date) {
    return null;
  }
  
  const scheduledDateTime = parseScheduledDateTime(ticket.scheduled_date);
  if (!scheduledDateTime) {
    return null;
  }
  
  const duration = calculateDuration(ticket);
  const endTime = calculateEndTime(scheduledDateTime.startTime, duration);
  const serviceType = extractServiceType(ticket);
  const price = calculatePrice(ticket, duration);
  
  // Extract customer information from contact details or ticket
  const customerName = ticket.contactDetails?.companyName || 
                      ticket.customer_name || 
                      ticket.title || 
                      'Unknown Customer';
  
  const customerPhone = ticket.contactDetails?.phone || 
                       ticket.customer_phone || 
                       'No phone provided';
  
  const customerEmail = ticket.contactDetails?.email || 
                       ticket.customer_email || 
                       'No email provided';
  
  const location = ticket.contactDetails?.fullAddress || 
                  ticket.location || 
                  ticket.address || 
                  'Location to be confirmed';
  
  return {
    id: generateBookingId(ticket.id),
    ticketId: ticket.id, // Reference back to original ticket
    customerName,
    customerPhone,
    customerEmail,
    service: serviceType,
    date: scheduledDateTime.date,
    startTime: scheduledDateTime.startTime,
    endTime: endTime,
    duration: duration,
    location: location,
    status: mapTicketPriorityToStatus(ticket.priority),
    price: price,
    notes: ticket.description || 'Generated from ticket',
    invoiceStatus: 'not_created',
    createdFromTicket: true,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Convert multiple tickets to booking events
 * @param {Array} tickets - Array of ticket objects
 * @returns {Array} - Array of booking event objects
 */
export const convertTicketsToBookingEvents = (tickets) => {
  if (!Array.isArray(tickets)) {
    return [];
  }
  
  return tickets
    .map(convertTicketToBookingEvent)
    .filter(event => event !== null);
};

/**
 * Sync tickets with scheduled dates to booking calendar localStorage
 * This function should be called whenever tickets are updated
 */
export const syncTicketsToBookingCalendar = () => {
  try {
    // Load current tickets from localStorage
    const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
    
    // Convert tickets with scheduled dates to booking events
    const bookingEvents = convertTicketsToBookingEvents(tickets);
    
    // Load existing booking events from localStorage
    const existingBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
    
    // Remove old ticket-generated bookings and add new ones
    const nonTicketBookings = existingBookings.filter(booking => !booking.createdFromTicket);
    const updatedBookings = [...nonTicketBookings, ...bookingEvents];
    
    // Save back to localStorage
    localStorage.setItem('ticketBookings', JSON.stringify(updatedBookings));
    
    console.log(`Synced ${bookingEvents.length} ticket bookings to calendar`);
    return bookingEvents;
  } catch (error) {
    console.error('Error syncing tickets to booking calendar:', error);
    return [];
  }
};

/**
 * Remove booking event for a specific ticket
 * @param {string} ticketId - The ticket ID
 */
export const removeTicketBooking = (ticketId) => {
  try {
    const existingBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
    const filteredBookings = existingBookings.filter(booking => booking.ticketId !== ticketId);
    localStorage.setItem('ticketBookings', JSON.stringify(filteredBookings));
    console.log(`Removed booking for ticket ${ticketId}`);
  } catch (error) {
    console.error('Error removing ticket booking:', error);
  }
};

/**
 * Update booking event when ticket is modified
 * @param {Object} updatedTicket - The updated ticket object
 */
export const updateTicketBooking = (updatedTicket) => {
  try {
    // Remove old booking for this ticket
    removeTicketBooking(updatedTicket.id);
    
    // Create new booking if ticket has scheduled date
    if (updatedTicket.scheduled_date) {
      const newBooking = convertTicketToBookingEvent(updatedTicket);
      if (newBooking) {
        const existingBookings = JSON.parse(localStorage.getItem('ticketBookings') || '[]');
        existingBookings.push(newBooking);
        localStorage.setItem('ticketBookings', JSON.stringify(existingBookings));
        console.log(`Updated booking for ticket ${updatedTicket.id}`);
      }
    }
  } catch (error) {
    console.error('Error updating ticket booking:', error);
  }
};
