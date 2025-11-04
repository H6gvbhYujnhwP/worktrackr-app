import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Send, Download, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function QuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuote = async () => {
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
              <Button onClick={() => navigate('/app/dashboard')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to CRM
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
            onClick={() => navigate('/app/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
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
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
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
              <Button variant="outline" className="w-full justify-start" size="sm">
                Mark as Sent
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                Mark as Accepted
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                Mark as Declined
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                Duplicate Quote
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

