/**
 * Initialize booking calendar sync for existing tickets
 * This should be run once when the application starts to sync any existing tickets
 * with scheduled dates to the booking calendar
 */

import { syncTicketsToBookingCalendar } from './ticketToBookingConverter.js';

/**
 * Initialize the booking calendar sync system
 * This function should be called when the application starts
 */
export const initializeBookingSync = () => {
  try {
    console.log('Initializing booking calendar sync...');
    
    // Sync existing tickets to booking calendar
    const syncedEvents = syncTicketsToBookingCalendar();
    
    console.log(`Booking calendar sync initialized. Synced ${syncedEvents.length} events.`);
    
    // Set up periodic sync to catch any missed updates
    const syncInterval = setInterval(() => {
      try {
        syncTicketsToBookingCalendar();
      } catch (error) {
        console.error('Error in periodic booking sync:', error);
      }
    }, 30000); // Sync every 30 seconds
    
    // Return cleanup function
    return () => {
      clearInterval(syncInterval);
      console.log('Booking calendar sync cleanup completed');
    };
  } catch (error) {
    console.error('Error initializing booking calendar sync:', error);
    return () => {}; // Return empty cleanup function
  }
};

/**
 * Manual sync function that can be called from the UI
 */
export const manualBookingSync = () => {
  try {
    const syncedEvents = syncTicketsToBookingCalendar();
    console.log(`Manual sync completed. Synced ${syncedEvents.length} events.`);
    return syncedEvents;
  } catch (error) {
    console.error('Error in manual booking sync:', error);
    return [];
  }
};
