import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  Mail, 
  Printer, 
  ExternalLink,
  CheckCircle,
  Settings,
  Eye,
  Zap,
  Clipboard,
  Share
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';

const ExportUtilities = ({ ticketData, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState('formatted_text');
  const [customTemplate, setCustomTemplate] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [emailSettings, setEmailSettings] = useState({
    to: ticketData?.customer?.email || '',
    subject: `Invoice for ${ticketData?.service?.description || 'Service'}`,
    body: ''
  });

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

  // Export format definitions
  const exportFormats = {
    formatted_text: {
      name: 'Formatted Text',
      icon: FileText,
      description: 'Clean, readable format for copy/paste',
      extension: 'txt',
      generator: (data) => `INVOICE DETAILS
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
Purchase Order: ${data.customFields.purchaseOrderNumber || 'N/A'}`
    },

    csv: {
      name: 'CSV Spreadsheet',
      icon: FileSpreadsheet,
      description: 'Comma-separated values for Excel/Sheets',
      extension: 'csv',
      generator: (data) => `Field,Value
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
Purchase Order,${data.customFields.purchaseOrderNumber}`
    },

    json: {
      name: 'JSON Data',
      icon: FileText,
      description: 'Structured data for API integration',
      extension: 'json',
      generator: (data) => JSON.stringify(data, null, 2)
    },

    invoice_template: {
      name: 'Invoice Template',
      icon: FileImage,
      description: 'Ready-to-use invoice format',
      extension: 'txt',
      generator: (data) => `INVOICE

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
${data.customFields.purchaseOrderNumber ? `Purchase Order: ${data.customFields.purchaseOrderNumber}` : ''}`
    },

    quickbooks: {
      name: 'QuickBooks Format',
      icon: ExternalLink,
      description: 'Optimized for QuickBooks import',
      extension: 'txt',
      generator: (data) => `Customer Name: ${data.customer.name}
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
Total: ${data.billing.totalAmount}`
    },

    xero: {
      name: 'Xero Format',
      icon: ExternalLink,
      description: 'Optimized for Xero import',
      extension: 'txt',
      generator: (data) => `Contact Name: ${data.customer.name}
Email Address: ${data.customer.email}
Invoice Date: ${formatDate(new Date())}
Due Date: ${formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}
Reference: ${data.customFields.projectReference}

Line Items:
Description,Quantity,Unit Amount,Account Code,Tax Type
${data.service.description},${parseFloat(data.service.timeSpent)},${data.service.hourlyRate},200,20% (VAT on Income)
${data.billing.materialCosts.map(item => `${item.item},1,${item.cost},200,20% (VAT on Income)`).join('\n')}
${data.billing.travelCost > 0 ? `Travel expenses,1,${data.billing.travelCost},200,20% (VAT on Income)` : ''}

Total: ${data.billing.totalAmount}`
    },

    sage: {
      name: 'Sage Format',
      icon: ExternalLink,
      description: 'Optimized for Sage accounting',
      extension: 'txt',
      generator: (data) => `Customer: ${data.customer.name}
Email: ${data.customer.email}
Date: ${formatDate(new Date())}
Reference: ${data.customFields.projectReference}

Invoice Lines:
Code,Description,Quantity,Unit Price,Net Amount,Tax Code,Tax Amount
SRV001,${data.service.description},${parseFloat(data.service.timeSpent)},${data.service.hourlyRate},${data.billing.laborCost},T1,${(data.billing.laborCost * data.billing.taxRate / 100).toFixed(2)}
${data.billing.materialCosts.map((item, index) => `MAT${String(index + 1).padStart(3, '0')},${item.item},1,${item.cost},${item.cost},T1,${(item.cost * data.billing.taxRate / 100).toFixed(2)}`).join('\n')}
${data.billing.travelCost > 0 ? `TRV001,Travel expenses,1,${data.billing.travelCost},${data.billing.travelCost},T1,${(data.billing.travelCost * data.billing.taxRate / 100).toFixed(2)}` : ''}

Net Total: ${data.billing.totalBeforeTax}
VAT Total: ${data.billing.taxAmount}
Gross Total: ${data.billing.totalAmount}`
    },

    email_template: {
      name: 'Email Template',
      icon: Mail,
      description: 'Professional email with invoice details',
      extension: 'txt',
      generator: (data) => `Subject: Invoice for ${data.service.description}

Dear ${data.customer.name},

Thank you for choosing our services. Please find the details of your recent service below:

Service: ${data.service.description}
Date: ${formatDate(data.service.dateCompleted)}
Total Amount: ${formatCurrency(data.billing.totalAmount)}

Service Details:
- Labor (${data.service.timeSpent}): ${formatCurrency(data.billing.laborCost)}
${data.billing.materialCosts.map(item => `- ${item.item}: ${formatCurrency(item.cost)}`).join('\n')}
${data.billing.travelCost > 0 ? `- Travel: ${formatCurrency(data.billing.travelCost)}` : ''}

Subtotal: ${formatCurrency(data.billing.totalBeforeTax)}
VAT (${data.billing.taxRate}%): ${formatCurrency(data.billing.taxAmount)}
Total: ${formatCurrency(data.billing.totalAmount)}

Payment is due within 30 days. If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
WorkTrackr Team`
    }
  };

  const handleCopyToClipboard = async (format) => {
    try {
      const exportData = exportFormats[format].generator(ticketData);
      await navigator.clipboard.writeText(exportData);
      setCopySuccess(`Copied ${exportFormats[format].name} to clipboard!`);
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      setCopySuccess('Failed to copy to clipboard');
      setTimeout(() => setCopySuccess(''), 3000);
    }
  };

  const handleDownload = (format) => {
    const exportData = exportFormats[format].generator(ticketData);
    const blob = new Blob([exportData], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${ticketData.ticketId || 'ticket'}-${format}.${exportFormats[format].extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const exportData = exportFormats[selectedFormat].generator(ticketData);
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${ticketData.ticketId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <pre>${exportData}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmailSetup = () => {
    const exportData = exportFormats.email_template.generator(ticketData);
    setEmailSettings(prev => ({
      ...prev,
      body: exportData
    }));
  };

  const quickCopyOptions = [
    {
      name: 'Customer Details',
      icon: Copy,
      data: () => `${ticketData.customer.name}\n${ticketData.customer.email}\n${ticketData.customer.phone}\n${ticketData.customer.address.line1}\n${ticketData.customer.address.city}, ${ticketData.customer.address.postcode}`
    },
    {
      name: 'Service Summary',
      icon: Copy,
      data: () => `${ticketData.service.description}\nCompleted: ${formatDate(ticketData.service.dateCompleted)}\nTime: ${ticketData.service.timeSpent}\nTotal: ${formatCurrency(ticketData.billing.totalAmount)}`
    },
    {
      name: 'Invoice Total',
      icon: Copy,
      data: () => `${formatCurrency(ticketData.billing.totalAmount)}`
    },
    {
      name: 'Line Items',
      icon: Copy,
      data: () => `Labor: ${formatCurrency(ticketData.billing.laborCost)}\n${ticketData.billing.materialCosts.map(item => `${item.item}: ${formatCurrency(item.cost)}`).join('\n')}\n${ticketData.billing.travelCost > 0 ? `Travel: ${formatCurrency(ticketData.billing.travelCost)}` : ''}`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900 flex items-center">
                <Share className="w-8 h-8 mr-3 text-purple-600" />
                Export Utilities
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Export billing data in multiple formats for any accounting system
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-3 py-1">
                {formatCurrency(ticketData.billing.totalAmount)}
              </Badge>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Quick Copy
              </CardTitle>
              <CardDescription>
                Copy specific data elements quickly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickCopyOptions.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleCopyToClipboard(option.data())}
                >
                  <option.icon className="w-4 h-4 mr-2" />
                  {option.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Actions
              </CardTitle>
              <CardDescription>
                Additional export actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleEmailSetup}
              >
                <Mail className="w-4 h-4 mr-2" />
                Setup Email
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleDownload(selectedFormat)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Format Selection */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Export Formats
              </CardTitle>
              <CardDescription>
                Choose the format that works with your accounting system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(exportFormats).map(([key, format]) => (
                <div
                  key={key}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedFormat === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedFormat(key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <format.icon className="w-5 h-5 mr-3 text-gray-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">{format.name}</h4>
                        <p className="text-sm text-gray-600">{format.description}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyToClipboard(key);
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(key);
                        }}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Preview
              </CardTitle>
              <CardDescription>
                Preview of {exportFormats[selectedFormat].name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                  {exportFormats[selectedFormat].generator(ticketData)}
                </pre>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => handleCopyToClipboard(selectedFormat)}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(selectedFormat)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Setup Modal */}
      {emailSettings.body && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Setup
            </CardTitle>
            <CardDescription>
              Prepare email with invoice details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <Input
                  value={emailSettings.to}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <Input
                  value={emailSettings.subject}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email Body</label>
              <Textarea
                value={emailSettings.body}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, body: e.target.value }))}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => handleCopyToClipboard(emailSettings.body)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Email
              </Button>
              <Button
                variant="outline"
                onClick={() => setEmailSettings(prev => ({ ...prev, body: '' }))}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExportUtilities;
