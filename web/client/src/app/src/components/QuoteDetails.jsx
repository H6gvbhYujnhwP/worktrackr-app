import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Send, Download, Trash2, MoreVertical, Calendar, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import SendQuoteModal from './SendQuoteModal';

export default function QuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    console.log('🔍 QuoteDetails mounted, ID from params:', id);
    const fetchQuote = async () => {
      console.log('🔍 Fetching quote with ID:', id);
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/quotes/${id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch quote');
        }
        
        const data = await response.json();
        setQuote(data);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchQuote();
    }
  }, [id]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `£${parseFloat(amount || 0).toFixed(2)}`;
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update quote status');
      }

      const updatedQuote = await response.json();
      setQuote(updatedQuote);
      
      // Show success message (you can add a toast notification here)
      console.log(`Quote status updated to: ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update quote status. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete quote');
      }

      // Navigate back to quotes list in dashboard
      navigate('/app/dashboard', { state: { view: 'quotes' } });
    } catch (err) {
      console.error('Error deleting quote:', err);
      alert('Failed to delete quote. Please try again.');
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadPDF = () => {
    // Open PDF in new tab for download
    window.open(`/api/quotes/${id}/pdf`, '_blank');
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      const originalQuote = await response.json();

      // Create new quote with same data but as draft
      const newQuoteData = {
        customer_id: originalQuote.customer_id,
        title: `${originalQuote.title} (Copy)`,
        description: originalQuote.description,
        valid_until: originalQuote.valid_until,
        terms_conditions: originalQuote.terms_conditions,
        internal_notes: originalQuote.internal_notes,
        status: 'draft',
        line_items: originalQuote.line_items.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_rate: item.tax_rate
        }))
      };

      const createResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newQuoteData)
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create duplicate quote');
      }

      const newQuote = await createResponse.json();
      
      // Navigate to the new quote's edit page
      navigate(`/app/crm/quotes/${newQuote.id}/edit`);
    } catch (err) {
      console.error('Error duplicating quote:', err);
      alert('Failed to duplicate quote. Please try again.');
    }
  };

  const handleSendEmail = (result) => {
    console.log('Quote sent successfully:', result);
    // Refresh quote data to get updated status
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading quote details...</div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              {error || 'Quote not found'}
            </div>
            <div className="mt-4 text-center">
            <Button onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
          onClick={() => navigate('/app/dashboard', { state: { view: 'quotes' } })}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotes
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
            <p className="text-sm text-gray-500">{quote.title}</p>
          </div>
          <Badge className={getStatusBadgeClass(quote.status)}>
            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/app/crm/quotes/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSendModal(true)}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className={showDeleteConfirm ? "bg-red-600 text-white hover:bg-red-700" : "text-red-600 hover:text-red-700"}
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {showDeleteConfirm ? 'Click Again to Confirm' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-semibold text-lg">{quote.customer_name}</span>
              </div>
              {quote.customer_email && (
                <div className="text-sm">
                  <span className="text-gray-500">Email:</span> {quote.customer_email}
                </div>
              )}
              {quote.customer_phone && (
                <div className="text-sm">
                  <span className="text-gray-500">Phone:</span> {quote.customer_phone}
                </div>
              )}
              {quote.customer_address && (
                <div className="text-sm">
                  <span className="text-gray-500">Address:</span> {quote.customer_address}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>{quote.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-sm">Item</th>
                      <th className="text-left py-3 px-2 font-medium text-sm hidden sm:table-cell">Description</th>
                      <th className="text-right py-3 px-2 font-medium text-sm">Qty</th>
                      <th className="text-right py-3 px-2 font-medium text-sm">Price</th>
                      <th className="text-right py-3 px-2 font-medium text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.line_items && quote.line_items.length > 0 ? (
                      quote.line_items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-2 text-sm">{item.product_name || item.name}</td>
                          <td className="py-3 px-2 text-sm text-gray-600 hidden sm:table-cell">
                            {item.description}
                          </td>
                          <td className="py-3 px-2 text-sm text-right">{item.quantity}</td>
                          <td className="py-3 px-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="py-3 px-2 text-sm text-right font-medium">
                            {formatCurrency(item.line_total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-gray-500 text-sm">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan="4" className="py-3 px-2 text-right font-medium">Subtotal:</td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(quote.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan="4" className="py-2 px-2 text-right text-sm text-gray-600">Tax:</td>
                      <td className="py-2 px-2 text-right text-sm">{formatCurrency(quote.tax_amount)}</td>
                    </tr>
                    <tr className="border-t-2">
                      <td colSpan="4" className="py-3 px-2 text-right font-bold text-lg">Total:</td>
                      <td className="py-3 px-2 text-right font-bold text-lg">{formatCurrency(quote.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          {quote.terms_conditions && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {quote.terms_conditions}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
                <CardDescription>Only visible to staff</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {quote.notes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Quote Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Quote Date</div>
                <div className="font-medium">{formatDate(quote.quote_date)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Valid Until</div>
                <div className="font-medium">{formatDate(quote.valid_until)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Created By</div>
                <div className="font-medium">{quote.created_by_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last Modified</div>
                <div className="font-medium">{formatDate(quote.updated_at)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                size="sm"
                onClick={() => handleStatusChange('sent')}
                disabled={quote.status === 'sent'}
              >
                Mark as Sent
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                size="sm"
                onClick={() => handleStatusChange('accepted')}
                disabled={quote.status === 'accepted'}
              >
                Mark as Accepted
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                size="sm"
                onClick={() => handleStatusChange('declined')}
                disabled={quote.status === 'declined'}
              >
                Mark as Declined
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                size="sm"
                onClick={handleDuplicate}
              >
                Duplicate Quote
              </Button>
              
              {/* Workflow Actions */}
              {quote.status === 'accepted' && (
                <>
                  <div className="border-t my-2 pt-2">
                    <p className="text-xs text-gray-500 mb-2 font-semibold">Workflow Actions</p>
                  </div>
                  <Button 
                    variant="default" 
                    className="w-full justify-start bg-green-600 hover:bg-green-700" 
                    size="sm"
                    onClick={() => {
                      const assignedUserId = prompt('Enter assigned user ID:');
                      const scheduledDate = prompt('Enter scheduled date (YYYY-MM-DD):');
                      if (assignedUserId && scheduledDate) {
                        fetch(`/api/quotes/${id}/schedule-work`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ assigned_user_id: assignedUserId, scheduled_date: scheduledDate })
                        }).then(() => {
                          alert('Work scheduled successfully!');
                          window.location.reload();
                        }).catch(err => alert('Failed to schedule work'));
                      }
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Work
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Create invoice from this quote?')) {
                        fetch(`/api/quotes/${id}/create-invoice`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({})
                        }).then(() => {
                          alert('Invoice created successfully!');
                          window.location.reload();
                        }).catch(err => alert('Failed to create invoice'));
                      }
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Quote Modal */}
      {showSendModal && (
        <SendQuoteModal
          quote={quote}
          onClose={() => setShowSendModal(false)}
          onSend={handleSendEmail}
        />
      )}
    </div>
  );
}

