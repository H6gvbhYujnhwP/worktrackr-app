import React from 'react';
import TicketDetailViewTabbed from './TicketDetailViewTabbed.jsx';

// Wrapper component that adds white contained card styling
export default function TicketDetailViewTabbedWrapped({ ticketId, onBack }) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <TicketDetailViewTabbed ticketId={ticketId} onBack={onBack} />
      </div>
    </div>
  );
}
