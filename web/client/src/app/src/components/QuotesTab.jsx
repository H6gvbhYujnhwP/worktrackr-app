import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Send, Calendar, FileText, CheckCircle, XCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';

const QUOTE_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  sent: 'bg-blue-100 text-blue-800 border-blue-200',
  viewed: 'bg-purple-100 text-purple-800 border-purple-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  declined: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-orange-100 text-orange-800 border-orange-200',
  superseded: 'bg-gray-100 text-gray-600 border-gray-200',
};

const QUOTE_STATUS_ICONS = {
  draft: FileText,
  sent: Send,
  viewed: ExternalLink,
  accepted: CheckCircle,
  declined: XCircle,
  expired: Clock,
  superseded: FileText,
};

export default function QuotesTab({ ticketId }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, [ticketId]);

  const fetchQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/quotes?ticket_id=${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }

      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      console.error('[QuotesTab] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = () => {
    // Navigate to quote creation page with ticket context
    window.location.href = `/app/crm/quotes/new?ticket_id=${ticketId}`;
  };

  const handleViewQuote = (quoteId) => {
    // Navigate to quote detail page
    window.location.href = `/app/crm/quotes/${quoteId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading quotes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-600">
            <XCircle className="w-12 h-12 mx-auto mb-4" />
            <p>{error}</p>
            <Button onClick={fetchQuotes} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Quotes</h3>
          <p className="text-sm text-gray-500">
            {quotes.length === 0 ? 'No quotes yet' : `${quotes.length} quote${quotes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={handleCreateQuote} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Quote
        </Button>
      </div>

      {/* Quotes List */}
      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-4">No quotes created for this ticket yet</p>
              <Button onClick={handleCreateQuote} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Create First Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => {
            const StatusIcon = QUOTE_STATUS_ICONS[quote.status] || FileText;
            const isExpiringSoon = quote.valid_until && 
              new Date(quote.valid_until) > new Date() && 
              new Date(quote.valid_until) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            return (
              <Card 
                key={quote.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewQuote(quote.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {quote.quote_number}
                          </div>
                          <div className="text-sm text-gray-600">
                            {quote.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Created {new Date(quote.created_at).toLocaleDateString()}</span>
                        </div>
                        {quote.valid_until && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Valid until {new Date(quote.valid_until).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {quote.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {quote.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        £{parseFloat(quote.total_amount || 0).toFixed(2)}
                      </div>
                      <Badge className={QUOTE_STATUS_COLORS[quote.status]}>
                        {quote.status.toUpperCase()}
                      </Badge>
                      {isExpiringSoon && (
                        <div className="mt-2">
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            Expiring Soon
                          </Badge>
                        </div>
                      )}
                      {quote.version > 1 && (
                        <div className="mt-2 text-xs text-gray-500">
                          v{quote.version}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
