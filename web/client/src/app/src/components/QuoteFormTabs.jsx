import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import QuoteForm from './QuoteForm';
import AIQuoteGenerator from './AIQuoteGenerator';

export default function QuoteFormTabs() {
  const navigate = useNavigate();
  const { id: quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = !!quoteId;

  // Read URL params — ?tab=ai&ticket_id=UUID navigates here from QuotesTab
  const urlTicketId = searchParams.get('ticket_id') || null;
  const urlTab      = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(urlTab === 'ai' ? 'ai' : 'manual');
  const [aiDraftData, setAiDraftData] = useState(null);

  // Handle AI draft generation complete
  const handleAIDraftComplete = (draftData) => {
    setAiDraftData(draftData);
    setActiveTab('manual'); // Switch to manual tab to review/edit
  };

  // If editing existing quote, only show manual form
  if (isEditMode) {
    return <QuoteForm mode="edit" />;
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 max-w-7xl">
      {/* Tab Navigation — Modern Enterprise gold underline */}
      <div className="flex border-b border-[#e5e7eb] mb-4 sm:mb-6 overflow-x-auto">
        <button
          className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'manual'
              ? 'border-b-2 border-[#d4a017] text-[#111113]'
              : 'text-[#6b7280] hover:text-[#374151]'
          }`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Entry
        </button>
        <button
          className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'ai'
              ? 'border-b-2 border-[#d4a017] text-[#111113]'
              : 'text-[#6b7280] hover:text-[#374151]'
          }`}
          onClick={() => setActiveTab('ai')}
        >
          AI Generator
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'manual' && (
        <QuoteForm
          mode="create"
          initialData={aiDraftData}
          onClearDraft={() => setAiDraftData(null)}
        />
      )}
      {activeTab === 'ai' && (
        <AIQuoteGenerator
          ticketId={urlTicketId}
          onDraftComplete={handleAIDraftComplete}
        />
      )}
    </div>
  );
}
