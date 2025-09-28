import React, { useState, useEffect } from 'react';
import { useAuth } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { 
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Mail,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert.jsx';

export default function SecuritySettings() {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testingMfa, setTestingMfa] = useState(false);
  const [mfaTestStep, setMfaTestStep] = useState(null); // null, 'code_sent', 'verified'
  const [testCode, setTestCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load current MFA status
  useEffect(() => {
    loadMfaStatus();
  }, []);

  const loadMfaStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/user/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMfaEnabled(data.mfa_enabled || false);
      }
    } catch (err) {
      console.error('Failed to load MFA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaToggle = async (enabled) => {
    if (enabled) {
      // Enabling MFA - start test flow
      await startMfaTest();
    } else {
      // Disabling MFA - confirm and update
      if (confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
        await updateMfaStatus(false);
      }
    }
  };

  const startMfaTest = async () => {
    try {
      setTestingMfa(true);
      setError('');
      setMfaTestStep(null);
      
      const response = await fetch('/api/auth/mfa/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: user.id })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setChallengeId(data.challenge_id);
        setMfaTestStep('code_sent');
        setSuccess('Test code sent to your email address');
      } else {
        setError(data.error || 'Failed to send test code');
        setTestingMfa(false);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setTestingMfa(false);
    }
  };

  const verifyTestCode = async () => {
    try {
      setUpdating(true);
      setError('');
      
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challenge_id: challengeId,
          code: testCode
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Test successful, now enable MFA
        await updateMfaStatus(true);
        setMfaTestStep('verified');
        setSuccess('Two-factor authentication has been enabled successfully!');
        setTestingMfa(false);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const updateMfaStatus = async (enabled) => {
    try {
      setUpdating(true);
      setError('');
      
      const response = await fetch('/api/auth/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          mfa_enabled: enabled,
          mfa_method: 'email'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMfaEnabled(enabled);
        setSuccess(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
        setTestingMfa(false);
        setMfaTestStep(null);
        setTestCode('');
      } else {
        setError(data.error || 'Failed to update MFA settings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const cancelMfaTest = () => {
    setTestingMfa(false);
    setMfaTestStep(null);
    setTestCode('');
    setChallengeId('');
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading security settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Security Settings</h2>
        <p className="text-gray-600">Manage your account security and authentication preferences</p>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {mfaEnabled ? (
                <ShieldCheck className="w-6 h-6 text-green-600" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-yellow-600" />
              )}
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={mfaEnabled ? 'default' : 'secondary'}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {!testingMfa && (
                <Switch
                  checked={mfaEnabled}
                  onCheckedChange={handleMfaToggle}
                  disabled={updating}
                />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {!testingMfa ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Email-based verification</p>
                  <p className="text-sm text-gray-600">
                    When enabled, you'll receive a 6-digit code via email each time you log in.
                  </p>
                </div>
              </div>
              
              {mfaEnabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800">
                      Two-factor authentication is active
                    </p>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your account is protected with email-based 2FA using: {user?.email}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {mfaTestStep === 'code_sent' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Key className="w-5 h-5 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">
                        Test code sent to your email
                      </p>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Enter the 6-digit code we sent to {user?.email} to complete setup.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="testCode">Verification Code</Label>
                    <Input
                      id="testCode"
                      type="text"
                      maxLength="6"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={verifyTestCode}
                      disabled={testCode.length !== 6 || updating}
                      className="flex-1"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & Enable 2FA'
                      )}
                    </Button>
                    <Button variant="outline" onClick={cancelMfaTest}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Key className="w-6 h-6 text-gray-600" />
            <div>
              <CardTitle>Password</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage your account password
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Last updated: Never (or we don't track this yet)
            </p>
            
            <Button variant="outline" className="w-full sm:w-auto">
              Change Password
            </Button>
            
            <div className="text-sm text-gray-500">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>At least 8 characters long</li>
                <li>Mix of letters, numbers, and symbols recommended</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
