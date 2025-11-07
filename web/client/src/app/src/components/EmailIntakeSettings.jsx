import React, { useState, useEffect } from 'react';
import { useAuth } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { 
  Mail,
  CheckCircle,
  AlertTriangle,
  Copy,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert.jsx';

export default function EmailIntakeSettings() {
  const { user, organization } = useAuth();
  const [success, setSuccess] = useState('');
  const [activating, setActivating] = useState(false);
  
  // Generate unique forwarding email from organization ID and name
  const organizationName = organization?.name || 'your-company';
  const organizationId = organization?.id || '';
  
  // Create a unique slug using organization name + first 8 chars of ID
  const nameSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const idSlug = organizationId.slice(0, 8).replace(/-/g, '');
  const uniqueSlug = idSlug ? `${nameSlug}-${idSlug}` : nameSlug;
  
  const forwardingEmail = `${uniqueSlug}@intake.worktrackr.cloud`;

  const handleActivate = async () => {
    try {
      setActivating(true);
      
      // Just show success - the webhook is already configured
      setSuccess('Email intake activated! Add the forwarding email to your email system.');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('Error activating email intake:', err);
    } finally {
      setActivating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Email Intake</h2>
        <p className="text-gray-600 mt-1">
          Automatically create tickets and quotes from emails forwarded to WorkTrackr.
        </p>
      </div>

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Forward emails to WorkTrackr</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Set up your email system to forward or BCC customer emails to your WorkTrackr forwarding address
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI analyzes the email</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Our AI reads the email content to determine if it's a support request or quote inquiry
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Automatically creates tickets or quotes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  WorkTrackr automatically creates a ticket or quote based on the email content
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Forwarding Email Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Your Forwarding Email Address
          </CardTitle>
          <CardDescription>
            Forward customer emails to this address to automatically create tickets and quotes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={forwardingEmail}
                readOnly
                className="font-mono text-lg"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(forwardingEmail)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>For Microsoft 365:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to Exchange Admin Center → Mail flow → Rules</li>
                  <li>Edit your existing support email rule</li>
                  <li>Add <span className="font-mono bg-white px-1 rounded">{forwardingEmail}</span> as an additional BCC recipient</li>
                  <li>Save the rule</li>
                </ol>
                
                <p className="mt-3"><strong>For Gmail:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to Settings → Forwarding and POP/IMAP</li>
                  <li>Add <span className="font-mono bg-white px-1 rounded">{forwardingEmail}</span> as a forwarding address</li>
                  <li>Create a filter to forward specific emails</li>
                </ol>
                
                <p className="mt-3"><strong>For other email systems:</strong></p>
                <p className="ml-2">Set up a forwarding rule or BCC to send copies of customer emails to <span className="font-mono bg-white px-1 rounded">{forwardingEmail}</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle>Test Your Setup</CardTitle>
          <CardDescription>
            Send a test email to verify everything is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Once you've configured your email forwarding, send a test email to your support address. 
            It should automatically create a ticket in WorkTrackr within a few seconds.
          </p>
          <Button
            onClick={() => window.location.href = '/app/dashboard?view=tickets'}
            variant="outline"
          >
            View Tickets
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
