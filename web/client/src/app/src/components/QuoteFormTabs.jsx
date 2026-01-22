import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/crm/quotes')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quotes
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Create New Quote</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tab Navigation */}
            <div className="flex border-b mb-6">
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('manual')}
              >
                Manual Entry
              </button>
              <button
                className={`px-6 py-3 font-medium transition-colors ${
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
