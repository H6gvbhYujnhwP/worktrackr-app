import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import QuoteForm from './QuoteForm';
import AIQuoteGenerator from './AIQuoteGenerator';

export default function QuoteFormTabs() {
  const navigate = useNavigate();
  const { id: quoteId } = useParams();
  const isEditMode = !!quoteId;
  const [activeTab, setActiveTab] = useState('manual');
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
      {/* Tab Navigation */}
      <div className="flex border-b mb-4 sm:mb-6 overflow-x-auto">
        <button
          className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
            activeTab === 'manual'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Entry
        </button>
        <button
          className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
            activeTab === 'ai'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
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
        <AIQuoteGenerator onDraftComplete={handleAIDraftComplete} />
      )}
    </div>
  );
}
