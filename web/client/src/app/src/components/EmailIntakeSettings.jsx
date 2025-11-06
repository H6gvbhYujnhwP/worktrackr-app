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
  ArrowRight,
  Info
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
  const [organizationName, setOrganizationName] = useState('');
  const [forwardingEmail, setForwardingEmail] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [autoCreateTickets, setAutoCreateTickets] = useState(true);
  const [autoCreateQuotes, setAutoCreateQuotes] = useState(true);
  const [requireReviewThreshold, setRequireReviewThreshold] = useState(0.7);
  const [channelId, setChannelId] = useState(null);

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
          setIsActive(data.channel.is_active || false);
          setAutoCreateTickets(data.channel.auto_create_tickets !== false);
          setAutoCreateQuotes(data.channel.auto_create_quotes !== false);
          setRequireReviewThreshold(data.channel.require_review_threshold || 0.7);
        }
        if (data.organization) {
          setOrganizationName(data.organization.name);
          // Generate forwarding email from organization name
          const slug = data.organization.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          setForwardingEmail(`${slug}@worktrackr.cloud`);
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

  const handleActivate = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/email-intake/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email_address: forwardingEmail,
          domain: 'worktrackr.cloud',
          is_active: true,
          auto_create_tickets: autoCreateTickets,
          auto_create_quotes: autoCreateQuotes,
          require_review_threshold: requireReviewThreshold,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChannelId(data.channel.id);
        setIsActive(true);
        setSuccess('Email intake activated successfully!');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to activate email intake');
      }
    } catch (err) {
      console.error('Error activating email intake:', err);
      setError('Failed to activate email intake');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const newActiveState = !isActive;

      const response = await fetch('/api/email-intake/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email_address: forwardingEmail,
          domain: 'worktrackr.cloud',
          is_active: newActiveState,
          auto_create_tickets: autoCreateTickets,
          auto_create_quotes: autoCreateQuotes,
          require_review_threshold: requireReviewThreshold,
        }),
      });

      if (response.ok) {
        setIsActive(newActiveState);
        setSuccess(`Email intake ${newActiveState ? 'enabled' : 'disabled'} successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Error updating email intake:', err);
      setError('Failed to update settings');
    } finally {
      setSaving(false);
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
        <h2 className="text-2xl font-bold text-gray-900">Email Intake</h2>
        <p className="text-gray-600 mt-1">
          Automatically create tickets and quotes from emails forwarded to WorkTrackr.
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

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <p className="font-medium">Forward emails to WorkTrackr</p>
              <p className="text-sm text-gray-600">
                Set up your email system to forward or BCC customer emails to your WorkTrackr forwarding address
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <p className="font-medium">AI analyzes the email</p>
              <p className="text-sm text-gray-600">
                Our AI reads the email content to determine if it's a support request or quote inquiry
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <p className="font-medium">Automatically creates tickets or quotes</p>
              <p className="text-sm text-gray-600">
                WorkTrackr automatically creates a ticket or quote based on the email content
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forwarding Email Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Your Forwarding Email Address
            {isActive && (
              <Badge variant="success" className="ml-2">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Forward customer emails to this address to automatically create tickets and quotes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <Mail className="w-5 h-5 text-gray-400" />
            <code className="flex-1 text-lg font-mono font-semibold text-gray-900">
              {forwardingEmail}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(forwardingEmail)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {!channelId ? (
            <Button 
              onClick={handleActivate} 
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  Activate Email Intake
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Email Intake Status</Label>
                <p className="text-sm text-gray-500">
                  {isActive ? 'Emails are being processed' : 'Email intake is paused'}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleActive}
                disabled={saving}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {channelId && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Configure your email system to forward emails to WorkTrackr
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>For Microsoft 365 / Outlook users:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to Exchange Admin Center → Mail flow → Rules</li>
                  <li>Edit your existing email forwarding rule</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded">{forwardingEmail}</code> as a BCC recipient</li>
                  <li>Save the rule</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>For Gmail users:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to Settings → Forwarding and POP/IMAP</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded">{forwardingEmail}</code> as a forwarding address</li>
                  <li>Create a filter to forward specific emails</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>For other email systems:</strong> Set up a mail forwarding rule or BCC rule to send a copy of incoming emails to <code className="bg-gray-100 px-1 rounded">{forwardingEmail}</code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      {channelId && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Settings</CardTitle>
            <CardDescription>
              Configure how WorkTrackr handles incoming emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Auto-create Tickets</Label>
                <p className="text-sm text-gray-500">
                  Automatically create tickets from support emails
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
                  Automatically create quotes from quote request emails
                </p>
              </div>
              <Switch
                checked={autoCreateQuotes}
                onCheckedChange={setAutoCreateQuotes}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">AI Confidence Threshold</Label>
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
                Emails with AI confidence below this threshold will be flagged for manual review (0.7 recommended)
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
