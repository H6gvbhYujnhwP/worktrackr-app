// web/client/src/app/src/components/QuotesList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function QuotesList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch quotes from API
  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/quotes', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch quotes');
        }
        
        const data = await response.json();
        setQuotes(data.quotes || []);
      } catch (err) {
        console.error('Error fetching quotes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  // Get status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `£${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Filter and sort quotes
  const filteredQuotes = quotes
    .filter(quote => {
      // Status filter
      if (statusFilter !== 'all' && quote.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          quote.quote_number?.toLowerCase().includes(search) ||
          quote.title?.toLowerCase().includes(search) ||
          quote.customer_name?.toLowerCase().includes(search)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'valid_until') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }
      
      // Handle numeric sorting
      if (sortBy === 'total_amount') {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Toggle sort order
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading quotes...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error: {error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600 mt-1">Manage and track customer quotes</p>
        </div>
        <Button 
          onClick={() => navigate('/app/crm/quotes/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Quote
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {quotes.length}
            </div>
            <div className="text-sm text-gray-600">Total Quotes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {quotes.filter(q => q.status === 'sent').length}
            </div>
            <div className="text-sm text-gray-600">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {quotes.filter(q => q.status === 'accepted').length}
            </div>
            <div className="text-sm text-gray-600">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(quotes.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0))}
            </div>
            <div className="text-sm text-gray-600">Total Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by quote number, title, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {quotes.length === 0 ? 'No quotes yet' : 'No quotes found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {quotes.length === 0 
                  ? 'Create your first quote to get started' 
                  : 'Try adjusting your search or filters'}
              </p>
              {quotes.length === 0 && (
                <Button 
                  onClick={() => navigate('/app/crm/quotes/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Quote
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('quote_number')}
                    >
                      <div className="flex items-center gap-2">
                        Quote #
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('customer_name')}
                    >
                      <div className="flex items-center gap-2">
                        Customer
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Title
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Status
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('total_amount')}
                    >
                      <div className="flex items-center gap-2">
                        Total
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('valid_until')}
                    >
                      <div className="flex items-center gap-2">
                        Valid Until
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort('created_at')}
                    >
                      <div className="flex items-center gap-2">
                        Created
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote, index) => (
                    <tr 
                      key={quote.id}
                      onClick={() => navigate(`/app/crm/quotes/${quote.quote_number}`)}
                      className={`border-b border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="py-3 px-4 font-medium text-blue-600">
                        {quote.quote_number}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {quote.customer_name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {quote.title}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusBadgeClass(quote.status)}>
                          {quote.status ? quote.status.charAt(0).toUpperCase() + quote.status.slice(1) : 'Draft'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {formatCurrency(quote.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatDate(quote.valid_until)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {formatDate(quote.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      {filteredQuotes.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredQuotes.length} of {quotes.length} quotes
        </div>
      )}
    </div>
  );
}
