// web/client/src/app/src/components/TicketDetailViewTabbedWrapped.jsx
// REDESIGN: Removed extra white card wrapper — AppLayout no longer double-wraps content.
import React from 'react';
import TicketDetailViewTabbed from './TicketDetailViewTabbed.jsx';

export default function TicketDetailViewTabbedWrapped({ ticketId, onBack }) {
  return <TicketDetailViewTabbed ticketId={ticketId} onBack={onBack} />;
}
