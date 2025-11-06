import React, { useState, useEffect } from 'react';
import { useAuth } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { 
  Mail,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert.jsx';

export default function EmailIntakeSettings() {
  const { user, membership } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Email intake configuration
  const [emailAddress, setEmailAddress] = useState('');
  const [domain, setDomain] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [autoCreateTickets, setAutoCreateTickets] = useState(true);
  const [autoCreateQuotes, setAutoCreateQuotes] = useState(true);
  const [requireReviewThreshold, setRequireReviewThreshold] = useState(0.7);
  const [channelId, setChannelId] = useState(null);
  
  // DNS records
  const [dnsRecords, setDnsRecords] = useState(null);
  const [dnsVerified, setDnsVerified] = useState(false);

  useEffect(() => {
    loadEmailIntakeConfig();
  }, []);

  const loadEmailIntakeConfig = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/email-intake/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.channel) {
          setChannelId(data.channel.id);
          setEmailAddress(data.channel.email_address || '');
          setDomain(data.channel.domain || '');
          setIsActive(data.channel.is_active || false);
          setAutoCreateTickets(data.channel.auto_create_tickets !== false);
          setAutoCreateQuotes(data.channel.auto_create_quotes !== false);
          setRequireReviewThreshold(data.channel.require_review_threshold || 0.7);
          setDnsVerified(data.channel.dns_verified || false);
        }
        if (data.dns_records) {
          setDnsRecords(data.dns_records);
        }
      } else if (response.status !== 404) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load email intake settings');
      }
    } catch (err) {
      console.error('Error loading email intake settings:', err);
      setError('Failed to load email intake settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate email address
      if (!emailAddress || !emailAddress.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      // Extract domain from email if not set
      const emailDomain = emailAddress.split('@')[1];
      const finalDomain = domain || emailDomain;

      const response = await fetch('/api/email-intake/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email_address: emailAddress,
          domain: finalDomain,
          is_active: isActive,
          auto_create_tickets: autoCreateTickets,
          auto_create_quotes: autoCreateQuotes,
          require_review_threshold: requireReviewThreshold,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChannelId(data.channel.id);
        setDomain(finalDomain);
        if (data.dns_records) {
          setDnsRecords(data.dns_records);
        }
        setSuccess('Email intake settings saved successfully!');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving email intake settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDNS = async () => {
    try {
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/email-intake/verify-dns', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDnsVerified(data.verified);
        if (data.verified) {
          setSuccess('DNS records verified successfully!');
        } else {
          setError('DNS records not found. Please ensure you have added the records to your domain.');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to verify DNS');
      }
    } catch (err) {
      console.error('Error verifying DNS:', err);
      setError('Failed to verify DNS');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Email Intake Settings</h2>
        <p className="text-gray-600 mt-1">
          Configure your custom email address to automatically create tickets and quotes from customer emails.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Set up your custom email address for receiving customer requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="support@yourcompany.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              The email address where customers will send requests
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              type="text"
              placeholder="yourcompany.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Your domain name (auto-filled from email address)
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-gray-500">
                Enable or disable email intake
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Auto-create Tickets</Label>
              <p className="text-sm text-gray-500">
                Automatically create tickets from emails
              </p>
            </div>
            <Switch
              checked={autoCreateTickets}
              onCheckedChange={setAutoCreateTickets}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Auto-create Quotes</Label>
              <p className="text-sm text-gray-500">
                Automatically create quotes from emails
              </p>
            </div>
            <Switch
              checked={autoCreateQuotes}
              onCheckedChange={setAutoCreateQuotes}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Review Threshold (0-1)</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={requireReviewThreshold}
              onChange={(e) => setRequireReviewThreshold(parseFloat(e.target.value))}
            />
            <p className="text-sm text-gray-500">
              AI confidence threshold below which emails require manual review (0.7 recommended)
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* DNS Configuration */}
      {channelId && dnsRecords && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              DNS Configuration
              {dnsVerified && (
                <Badge variant="success" className="ml-2">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Add these DNS records to your domain to enable email forwarding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Add the following DNS records to your domain's DNS settings. This typically takes 15-30 minutes to propagate.
              </AlertDescription>
            </Alert>

            {/* MX Record */}
            {dnsRecords.mx && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge>MX Record</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(dnsRecords.mx.value)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> MX
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span> {dnsRecords.mx.priority}
                  </div>
                  <div>
                    <span className="font-medium">TTL:</span> 3600
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Value:</span>
                  <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                    {dnsRecords.mx.value}
                  </code>
                </div>
              </div>
            )}

            {/* SPF Record */}
            {dnsRecords.spf && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge>SPF Record</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(dnsRecords.spf.value)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Type:</span> TXT
                </div>
                <div className="text-sm">
                  <span className="font-medium">Value:</span>
                  <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                    {dnsRecords.spf.value}
                  </code>
                </div>
              </div>
            )}

            {/* DKIM Record */}
            {dnsRecords.dkim && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge>DKIM Record</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(dnsRecords.dkim.value)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Type:</span> TXT
                </div>
                <div className="text-sm">
                  <span className="font-medium">Name:</span>
                  <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                    {dnsRecords.dkim.name}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Value:</span>
                  <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                    {dnsRecords.dkim.value}
                  </code>
                </div>
              </div>
            )}

            <Button 
              onClick={handleVerifyDNS}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Verify DNS Records
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Webhook Information */}
      {channelId && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook Endpoint</CardTitle>
            <CardDescription>
              This endpoint receives incoming emails (configured automatically)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-gray-100 rounded text-sm break-all">
                {window.location.origin}/api/email-intake/webhook
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(`${window.location.origin}/api/email-intake/webhook`)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
