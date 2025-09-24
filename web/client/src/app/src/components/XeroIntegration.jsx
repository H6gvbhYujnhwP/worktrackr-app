import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Send, Download, Eye, CheckCircle, Clock, AlertCircle, Settings, Link, Zap, List, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import BillingQueueManager from './BillingQueueManager.jsx';
import ManualBillingProcessor from './ManualBillingProcessor.jsx';

const XeroIntegration = ({ businessType = 'service' }) => {
  const [xeroConnected, setXeroConnected] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showManualProcessor, setShowManualProcessor] = useState(false);
  const [selectedTicketData, setSelectedTicketData] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [autoInvoicing, setAutoInvoicing] = useState(true);

  const [xeroSettings, setXeroSettings] = useState({
    autoCreateInvoices: true,
    autoSendInvoices: false,
    defaultPaymentTerms: 30,
    taxRate: 20
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleManualProcess = (ticketData) => {
    setSelectedTicketData(ticketData);
    setShowManualProcessor(true);
    setActiveTab('manual');
  };

  return (
    <div className="space-y-6">


      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue" className="flex items-center">
            <List className="w-4 h-4 mr-2" />
            Billing Queue
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center">
            <Link className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center">
            <Edit className="w-4 h-4 mr-2" />
            Manual Processing
          </TabsTrigger>
        </TabsList>

        {/* Billing Queue Tab */}
        <TabsContent value="queue" className="space-y-6">
          <BillingQueueManager onManualProcess={handleManualProcess} />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Xero Integration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link className="w-5 h-5 mr-2 text-blue-600" />
                  Xero Integration
                </CardTitle>
                <CardDescription>
                  Connect to Xero for seamless accounting integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link className="w-4 h-4 mr-2" />
                    Connect to Xero
                  </Button>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Automatic invoice creation and sending</p>
                    <p>• Real-time financial data synchronization</p>
                    <p>• Customer and contact management</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link className="w-5 h-5 mr-2 text-blue-600" />
                  QuickBooks Integration
                </CardTitle>
                <CardDescription>
                  Connect to QuickBooks Online for comprehensive accounting integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link className="w-4 h-4 mr-2" />
                    Connect to QuickBooks
                  </Button>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Automatic invoice and payment tracking</p>
                    <p>• Customer and vendor synchronization</p>
                    <p>• Tax calculation and reporting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure how completed tickets automatically generate invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Auto-Create Invoices</Label>
                      <p className="text-xs text-gray-600">Create invoices when tickets are completed</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={xeroSettings.autoCreateInvoices}
                      onChange={(e) => setXeroSettings({...xeroSettings, autoCreateInvoices: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Auto-Send Invoices</Label>
                      <p className="text-xs text-gray-600">Email invoices to customers automatically</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={xeroSettings.autoSendInvoices}
                      onChange={(e) => setXeroSettings({...xeroSettings, autoSendInvoices: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
                    <Input 
                      id="paymentTerms" 
                      type="number" 
                      value={xeroSettings.defaultPaymentTerms}
                      onChange={(e) => setXeroSettings({...xeroSettings, defaultPaymentTerms: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input 
                      id="taxRate" 
                      type="number" 
                      value={xeroSettings.taxRate}
                      onChange={(e) => setXeroSettings({...xeroSettings, taxRate: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Management</CardTitle>
              <CardDescription>View and manage your invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-gray-600 mb-4">Process tickets from the billing queue to create invoices</p>
                <Button onClick={() => setActiveTab('queue')}>
                  Go to Billing Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Processing Tab */}
        <TabsContent value="manual" className="space-y-6">
          {showManualProcessor && selectedTicketData ? (
            <ManualBillingProcessor 
              ticketData={selectedTicketData}
              onClose={() => {
                setShowManualProcessor(false);
                setSelectedTicketData(null);
                setActiveTab('queue');
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Manual Processing</CardTitle>
                <CardDescription>Select a ticket from the billing queue to process manually</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Edit className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No ticket selected</h3>
                  <p className="text-gray-600 mb-4">Go to the billing queue and select a ticket to process manually</p>
                  <Button onClick={() => setActiveTab('queue')}>
                    Go to Billing Queue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Invoice</CardTitle>
              <CardDescription>Generate a new invoice manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input id="customerName" placeholder="Enter customer name" />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <Input id="customerEmail" type="email" placeholder="customer@email.com" />
                </div>
                <div>
                  <Label htmlFor="projectName">Project/Service</Label>
                  <Input id="projectName" placeholder="Description of work" />
                </div>
                <div>
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input id="invoiceDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Invoice Items</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1"></div>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <Input className="col-span-5" placeholder="Item description" />
                    <Input className="col-span-2" type="number" defaultValue="1" />
                    <Input className="col-span-2" type="number" placeholder="0.00" />
                    <Input className="col-span-2" type="number" placeholder="0.00" readOnly />
                    <Button variant="outline" size="sm" className="col-span-1">+</Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea 
                    id="notes" 
                    className="w-full p-2 border border-gray-300 rounded-md" 
                    rows="3"
                    placeholder="Additional notes for the invoice"
                  ></textarea>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>£0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (20%):</span>
                    <span>£0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>£0.00</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>
                  Cancel
                </Button>
                <Button variant="outline">
                  Save as Draft
                </Button>
                <Button onClick={() => setShowInvoiceModal(false)}>
                  Create & Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default XeroIntegration;
