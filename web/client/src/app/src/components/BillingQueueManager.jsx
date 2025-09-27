import React, { useState, useEffect } from 'react';
import { useSimulation } from '../App.jsx';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Archive,
  MoreHorizontal,
  Calendar,
  User,
  DollarSign,
  FileText,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';

const BillingQueueManager = ({ onManualProcess }) => {
  const { billingQueue, setBillingQueue } = useSimulation();
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(null);

  // Filter items based on search only
  useEffect(() => {
    let filtered = billingQueue;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.ticketData.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ticketData.service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ticketId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  }, [billingQueue, searchTerm]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle marking ticket as billed and removing from queue
  const handleBilled = (ticketId) => {
    // Remove the ticket from the billing queue
    setBillingQueue(prev => prev.filter(item => item.ticketId !== ticketId));
    
    // Here you would also update the main ticket status to 'billed'
    // This would typically be done through a context or API call
    console.log(`Ticket ${ticketId} marked as billed and removed from billing queue`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-green-600" />
                Billing Queue Manager
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Manage completed tickets ready for billing and invoicing
              </CardDescription>
            </div>

          </div>
        </CardHeader>
      </Card>



      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by customer, service, or ticket ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:w-80"
                />
              </div>
              
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Queue Items ({filteredItems.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No items in billing queue</h3>
              <p className="text-gray-600 mb-6">
                {billingQueue.length === 0 
                  ? "Completed tickets will appear here automatically when they're ready for billing."
                  : "No items match your current search criteria."
                }
              </p>
              {searchTerm ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                  }}
                >
                  Clear Search
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <Card key={item.queueItemId} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center space-x-3 mb-3">
                            <h4 className="font-semibold text-gray-900">{item.ticketId}</h4>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="w-4 h-4" />
                              <span className="ml-1">Ready for Billing</span>
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Added {formatDate(item.addedToQueueAt)}
                            </span>
                          </div>
                          
                          {/* Content Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                            <div>
                              <p><strong>Customer:</strong> {item.ticketData.customer.name}</p>
                              <p><strong>Email:</strong> {item.ticketData.customer.email}</p>
                              <p><strong>Phone:</strong> {item.ticketData.customer.phone}</p>
                            </div>
                            <div>
                              <p><strong>Service:</strong> {item.ticketData.service.description}</p>
                              <p><strong>Category:</strong> {item.ticketData.service.category}</p>
                              <p><strong>Completed:</strong> {formatDate(item.ticketData.service.dateCompleted)}</p>
                            </div>
                            <div>
                              <p><strong>Time Spent:</strong> {item.ticketData.service.timeSpent}</p>
                              <p><strong>Rate:</strong> {formatCurrency(item.ticketData.service.hourlyRate)}/hr</p>
                              <p><strong>Total:</strong> <span className="font-semibold text-green-600">{formatCurrency(item.ticketData.billing.totalAmount)}</span></p>
                            </div>
                          </div>

                          {/* Processing Notes */}
                          {item.processingNotes && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-800">
                                <strong>Notes:</strong> {item.processingNotes}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowDetails(item)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onManualProcess && onManualProcess(item.ticketData)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Manual Process
                              </Button>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                                onClick={() => handleBilled(item.ticketId)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Billed
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ticket Details - {showDetails.ticketId}</CardTitle>
                <Button variant="outline" onClick={() => setShowDetails(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Name:</strong> {showDetails.ticketData.customer.name}</p>
                    <p><strong>Email:</strong> {showDetails.ticketData.customer.email}</p>
                    <p><strong>Phone:</strong> {showDetails.ticketData.customer.phone}</p>
                  </div>
                  <div>
                    <p><strong>Address:</strong></p>
                    <p>{showDetails.ticketData.customer.address.line1}</p>
                    <p>{showDetails.ticketData.customer.address.city}, {showDetails.ticketData.customer.address.postcode}</p>
                    <p>{showDetails.ticketData.customer.address.country}</p>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Service Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Description:</strong> {showDetails.ticketData.service.description}</p>
                    <p><strong>Category:</strong> {showDetails.ticketData.service.category}</p>
                  </div>
                  <div>
                    <p><strong>Date Completed:</strong> {formatDate(showDetails.ticketData.service.dateCompleted)}</p>
                    <p><strong>Time Spent:</strong> {showDetails.ticketData.service.timeSpent}</p>
                    <p><strong>Hourly Rate:</strong> {formatCurrency(showDetails.ticketData.service.hourlyRate)}</p>
                  </div>
                </div>
              </div>

              {/* Billing Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Billing Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Labor Cost:</strong> {formatCurrency(showDetails.ticketData.billing.laborCost)}</p>
                      <p><strong>Travel Cost:</strong> {formatCurrency(showDetails.ticketData.billing.travelCost)}</p>
                    </div>
                    <div>
                      <p><strong>Subtotal:</strong> {formatCurrency(showDetails.ticketData.billing.totalBeforeTax)}</p>
                      <p><strong>Tax ({showDetails.ticketData.billing.taxRate}%):</strong> {formatCurrency(showDetails.ticketData.billing.taxAmount)}</p>
                      <p><strong>Total:</strong> <span className="font-semibold text-green-600">{formatCurrency(showDetails.ticketData.billing.totalAmount)}</span></p>
                    </div>
                  </div>
                  
                  {showDetails.ticketData.billing.materialCosts && showDetails.ticketData.billing.materialCosts.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Materials:</p>
                      <ul className="text-sm space-y-1">
                        {showDetails.ticketData.billing.materialCosts.map((material, index) => (
                          <li key={index} className="flex justify-between">
                            <span>{material.item}</span>
                            <span>{formatCurrency(material.cost)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Fields */}
              {showDetails.ticketData.customFields && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <p><strong>Project Reference:</strong> {showDetails.ticketData.customFields.projectReference}</p>
                    <p><strong>Purchase Order:</strong> {showDetails.ticketData.customFields.purchaseOrderNumber || 'N/A'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BillingQueueManager;
