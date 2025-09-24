import React, { useState } from 'react';
import { 
  Copy, 
  Download, 
  FileText, 
  Printer, 
  Mail, 
  CheckCircle, 
  Edit, 
  Save,
  Eye,
  ExternalLink,
  Clipboard,
  FileSpreadsheet,
  FileImage,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

const ManualBillingProcessor = ({ ticketData, onComplete, onCancel }) => {
  const [editableData, setEditableData] = useState(ticketData);
  const [exportFormat, setExportFormat] = useState('formatted_text');
  const [copySuccess, setCopySuccess] = useState('');
  const [previewMode, setPreviewMode] = useState('invoice');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Generate different export formats
  const generateExportData = (format) => {
    const data = editableData;
    
    switch (format) {
      case 'formatted_text':
        return `INVOICE DETAILS
================

Customer Information:
Name: ${data.customer.name}
Email: ${data.customer.email}
Phone: ${data.customer.phone}
Address: ${data.customer.address.line1}
         ${data.customer.address.city}, ${data.customer.address.postcode}
         ${data.customer.address.country}

Service Details:
Description: ${data.service.description}
Category: ${data.service.category}
Date Completed: ${formatDate(data.service.dateCompleted)}
Time Spent: ${data.service.timeSpent}
Hourly Rate: ${formatCurrency(data.service.hourlyRate)}

Billing Breakdown:
Labor Cost: ${formatCurrency(data.billing.laborCost)}
${data.billing.materialCosts.map(item => `${item.item}: ${formatCurrency(item.cost)}`).join('\n')}
Travel Cost: ${formatCurrency(data.billing.travelCost)}
Subtotal: ${formatCurrency(data.billing.totalBeforeTax)}
Tax (${data.billing.taxRate}%): ${formatCurrency(data.billing.taxAmount)}
TOTAL: ${formatCurrency(data.billing.totalAmount)}

Additional Information:
Project Reference: ${data.customFields.projectReference}
Purchase Order: ${data.customFields.purchaseOrderNumber || 'N/A'}`;

      case 'csv':
        return `Field,Value
Customer Name,${data.customer.name}
Customer Email,${data.customer.email}
Customer Phone,${data.customer.phone}
Address Line 1,${data.customer.address.line1}
City,${data.customer.address.city}
Postcode,${data.customer.address.postcode}
Country,${data.customer.address.country}
Service Description,${data.service.description}
Service Category,${data.service.category}
Date Completed,${data.service.dateCompleted}
Time Spent,${data.service.timeSpent}
Hourly Rate,${data.service.hourlyRate}
Labor Cost,${data.billing.laborCost}
${data.billing.materialCosts.map(item => `${item.item},${item.cost}`).join('\n')}
Travel Cost,${data.billing.travelCost}
Subtotal,${data.billing.totalBeforeTax}
Tax Rate,${data.billing.taxRate}
Tax Amount,${data.billing.taxAmount}
Total Amount,${data.billing.totalAmount}
Project Reference,${data.customFields.projectReference}
Purchase Order,${data.customFields.purchaseOrderNumber}`;

      case 'json':
        return JSON.stringify(data, null, 2);

      case 'invoice_template':
        return `INVOICE

Invoice Date: ${formatDate(new Date())}
Due Date: ${formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}

Bill To:
${data.customer.name}
${data.customer.address.line1}
${data.customer.address.city}, ${data.customer.address.postcode}
${data.customer.address.country}

Description: ${data.service.description}
Date of Service: ${formatDate(data.service.dateCompleted)}

Line Items:
- Labor (${data.service.timeSpent} @ ${formatCurrency(data.service.hourlyRate)}/hr): ${formatCurrency(data.billing.laborCost)}
${data.billing.materialCosts.map(item => `- ${item.item}: ${formatCurrency(item.cost)}`).join('\n')}
${data.billing.travelCost > 0 ? `- Travel: ${formatCurrency(data.billing.travelCost)}` : ''}

Subtotal: ${formatCurrency(data.billing.totalBeforeTax)}
Tax (${data.billing.taxRate}%): ${formatCurrency(data.billing.taxAmount)}
Total: ${formatCurrency(data.billing.totalAmount)}

Payment Terms: Net 30 days
${data.customFields.purchaseOrderNumber ? `Purchase Order: ${data.customFields.purchaseOrderNumber}` : ''}`;

      case 'quickbooks_format':
        return `Customer Name: ${data.customer.name}
Customer Email: ${data.customer.email}
Invoice Date: ${formatDate(new Date())}
Due Date: ${formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}
Service Date: ${formatDate(data.service.dateCompleted)}

Item,Description,Quantity,Rate,Amount
Labor,${data.service.description},${parseFloat(data.service.timeSpent)},${data.service.hourlyRate},${data.billing.laborCost}
${data.billing.materialCosts.map(item => `Material,${item.item},1,${item.cost},${item.cost}`).join('\n')}
${data.billing.travelCost > 0 ? `Travel,Travel expenses,1,${data.billing.travelCost},${data.billing.travelCost}` : ''}

Subtotal: ${data.billing.totalBeforeTax}
Tax Rate: ${data.billing.taxRate}%
Tax Amount: ${data.billing.taxAmount}
Total: ${data.billing.totalAmount}`;

      case 'xero_format':
        return `Contact Name: ${data.customer.name}
Email Address: ${data.customer.email}
Invoice Date: ${formatDate(new Date())}
Due Date: ${formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}
Reference: ${data.customFields.projectReference}

Line Items:
Description,Quantity,Unit Amount,Account Code,Tax Type
${data.service.description},${parseFloat(data.service.timeSpent)},${data.service.hourlyRate},200,20% (VAT on Income)
${data.billing.materialCosts.map(item => `${item.item},1,${item.cost},200,20% (VAT on Income)`).join('\n')}
${data.billing.travelCost > 0 ? `Travel expenses,1,${data.billing.travelCost},200,20% (VAT on Income)` : ''}

Total: ${data.billing.totalAmount}`;

      default:
        return generateExportData('formatted_text');
    }
  };

  const handleCopyToClipboard = async (format) => {
    try {
      const exportData = generateExportData(format);
      await navigator.clipboard.writeText(exportData);
      setCopySuccess(`Copied ${format.replace('_', ' ')} to clipboard!`);
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      setCopySuccess('Failed to copy to clipboard');
      setTimeout(() => setCopySuccess(''), 3000);
    }
  };

  const handleDownload = (format) => {
    const exportData = generateExportData(format);
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${editableData.ticketId || 'ticket'}-${format}.${format === 'csv' ? 'csv' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateBillingData = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      billing: {
        ...prev.billing,
        [field]: value
      }
    }));
  };

  const recalculateTotals = () => {
    const laborCost = editableData.billing.laborCost;
    const materialTotal = editableData.billing.materialCosts.reduce((sum, item) => sum + item.cost, 0);
    const travelCost = editableData.billing.travelCost;
    const subtotal = laborCost + materialTotal + travelCost;
    const taxAmount = subtotal * (editableData.billing.taxRate / 100);
    const total = subtotal + taxAmount;

    setEditableData(prev => ({
      ...prev,
      billing: {
        ...prev.billing,
        totalBeforeTax: subtotal,
        taxAmount: taxAmount,
        totalAmount: total
      }
    }));
  };

  const exportFormats = [
    { value: 'formatted_text', label: 'Formatted Text', icon: FileText },
    { value: 'csv', label: 'CSV Spreadsheet', icon: FileSpreadsheet },
    { value: 'json', label: 'JSON Data', icon: FileText },
    { value: 'invoice_template', label: 'Invoice Template', icon: FileImage },
    { value: 'quickbooks_format', label: 'QuickBooks Format', icon: ExternalLink },
    { value: 'xero_format', label: 'Xero Format', icon: ExternalLink }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900 flex items-center">
                <Edit className="w-8 h-8 mr-3 text-green-600" />
                Manual Billing Processor
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Review, edit, and export billing information for manual processing
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                {formatCurrency(editableData.billing.totalAmount)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Copy Success Message */}
      {copySuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">{copySuccess}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Data Review and Edit */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                Review & Edit Data
              </CardTitle>
              <CardDescription>
                Review and modify the billing information before export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="customer" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="customer">Customer</TabsTrigger>
                  <TabsTrigger value="service">Service</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>
                
                <TabsContent value="customer" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer Name</label>
                      <Input 
                        value={editableData.customer.name}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, name: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <Input 
                        value={editableData.customer.email}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, email: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone</label>
                      <Input 
                        value={editableData.customer.phone}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, phone: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <Input 
                        value={editableData.customer.address.line1}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          customer: { 
                            ...prev.customer, 
                            address: { ...prev.customer.address, line1: e.target.value }
                          }
                        }))}
                        className="mb-2"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          value={editableData.customer.address.city}
                          placeholder="City"
                          onChange={(e) => setEditableData(prev => ({
                            ...prev,
                            customer: { 
                              ...prev.customer, 
                              address: { ...prev.customer.address, city: e.target.value }
                            }
                          }))}
                        />
                        <Input 
                          value={editableData.customer.address.postcode}
                          placeholder="Postcode"
                          onChange={(e) => setEditableData(prev => ({
                            ...prev,
                            customer: { 
                              ...prev.customer, 
                              address: { ...prev.customer.address, postcode: e.target.value }
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="service" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Description</label>
                      <Textarea 
                        value={editableData.service.description}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          service: { ...prev.service, description: e.target.value }
                        }))}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <Input 
                        value={editableData.service.category}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          service: { ...prev.service, category: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Time Spent</label>
                        <Input 
                          value={editableData.service.timeSpent}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev,
                            service: { ...prev.service, timeSpent: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                        <Input 
                          type="number"
                          value={editableData.service.hourlyRate}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev,
                            service: { ...prev.service, hourlyRate: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="billing" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Labor Cost</label>
                      <Input 
                        type="number"
                        value={editableData.billing.laborCost}
                        onChange={(e) => updateBillingData('laborCost', parseFloat(e.target.value) || 0)}
                        onBlur={recalculateTotals}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Material Costs</label>
                      {editableData.billing.materialCosts.map((material, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                          <Input 
                            value={material.item}
                            placeholder="Item description"
                            onChange={(e) => {
                              const newMaterials = [...editableData.billing.materialCosts];
                              newMaterials[index].item = e.target.value;
                              setEditableData(prev => ({
                                ...prev,
                                billing: { ...prev.billing, materialCosts: newMaterials }
                              }));
                            }}
                          />
                          <Input 
                            type="number"
                            value={material.cost}
                            placeholder="Cost"
                            onChange={(e) => {
                              const newMaterials = [...editableData.billing.materialCosts];
                              newMaterials[index].cost = parseFloat(e.target.value) || 0;
                              setEditableData(prev => ({
                                ...prev,
                                billing: { ...prev.billing, materialCosts: newMaterials }
                              }));
                            }}
                            onBlur={recalculateTotals}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Travel Cost</label>
                      <Input 
                        type="number"
                        value={editableData.billing.travelCost}
                        onChange={(e) => updateBillingData('travelCost', parseFloat(e.target.value) || 0)}
                        onBlur={recalculateTotals}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                      <Input 
                        type="number"
                        value={editableData.billing.taxRate}
                        onChange={(e) => updateBillingData('taxRate', parseFloat(e.target.value) || 0)}
                        onBlur={recalculateTotals}
                      />
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(editableData.billing.totalBeforeTax)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>{formatCurrency(editableData.billing.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>{formatCurrency(editableData.billing.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Export Options */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Export Options
              </CardTitle>
              <CardDescription>
                Choose the format that works best with your accounting system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Export Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select export format" />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <div className="flex items-center">
                          <format.icon className="w-4 h-4 mr-2" />
                          {format.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={() => handleCopyToClipboard(exportFormat)}
                  className="w-full justify-start"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleDownload(exportFormat)}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.print()}
                  className="w-full justify-start"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Preview
              </CardTitle>
              <CardDescription>
                Preview of the exported data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                  {generateExportData(exportFormat)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={recalculateTotals} variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Recalculate
              </Button>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => handleCopyToClipboard('invoice_template')}
                variant="outline"
              >
                <Clipboard className="w-4 h-4 mr-2" />
                Quick Copy Invoice
              </Button>
              <Button onClick={() => onComplete(editableData)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Processed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualBillingProcessor;
