// web/client/src/app/src/components/SecuritySettings.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Shield, ShieldCheck, ShieldAlert, Key, Mail,
  AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import PageHero from './PageHero.jsx';

export default function SecuritySettings() {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testingMfa, setTestingMfa] = useState(false);
  const [mfaTestStep, setMfaTestStep] = useState(null);
  const [testCode, setTestCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadMfaStatus(); }, []);

  const loadMfaStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/user/profile', { credentials: 'include' });
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
      await startMfaTest();
    } else {
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
        body: JSON.stringify({ challenge_id: challengeId, code: testCode })
      });
      const data = await response.json();
      if (response.ok) {
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
        body: JSON.stringify({ mfa_enabled: enabled, mfa_method: 'email' })
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
      <div className="flex items-center justify-center p-8 text-[13px] text-[#94a3b8] bg-[#1a1a2e] min-h-full">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading security settings...
      </div>
    );
  }

  const sectionClass = "bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden";
  const sectionHeaderClass = "px-6 py-4 border-b border-[#2e2e4a]";
  const inputClass = "w-full px-3 py-2 text-[13px] border border-[#2e2e4a] rounded-lg bg-[#1a1a2e] text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b] text-center text-2xl tracking-widest";

  return (
    <div className="space-y-5 p-5 md:p-7 min-h-full bg-[#1a1a2e]">

      {/* Page header */}
      <PageHero
        title="Security Settings"
        icon={Shield}
        meta={[{ label: 'Manage your account security and authentication preferences' }]}
        compact
      />

      {/* Status messages */}
      {error && (
        <div className="flex items-start gap-3 bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.4)] rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#fca5a5] mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-[#fca5a5]">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.4)] rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-[#6ee7b7] mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-[#6ee7b7]">{success}</p>
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mfaEnabled
                ? <ShieldCheck className="w-5 h-5 text-[#6ee7b7]" />
                : <ShieldAlert className="w-5 h-5 text-[#f59e0b]" />
              }
              <div>
                <h3 className="text-[14px] font-semibold text-white">Two-Factor Authentication</h3>
                <p className="text-[12px] text-[#94a3b8] mt-0.5">Add an extra layer of security to your account</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                mfaEnabled ? 'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]' : 'bg-[rgba(107,114,128,0.20)] text-[#cbd5e1]'
              }`}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
              {!testingMfa && (
                <Switch checked={mfaEnabled} onCheckedChange={handleMfaToggle} disabled={updating} />
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {!testingMfa ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#94a3b8] mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-white">Email-based verification</p>
                  <p className="text-[12px] text-[#94a3b8] mt-0.5">
                    When enabled, you'll receive a 6-digit code via email each time you log in.
                  </p>
                </div>
              </div>
              {mfaEnabled && (
                <div className="flex items-start gap-3 bg-[#dcfce7] border border-green-200 rounded-lg px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-green-800">Two-factor authentication is active</p>
                    <p className="text-[12px] text-green-700 mt-0.5">
                      Your account is protected with email-based 2FA using: {user?.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {mfaTestStep === 'code_sent' && (
                <>
                  <div className="flex items-start gap-3 bg-[#dbeafe] border border-blue-200 rounded-lg px-4 py-3">
                    <Key className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-blue-800">Test code sent to your email</p>
                      <p className="text-[12px] text-blue-700 mt-0.5">
                        Enter the 6-digit code we sent to {user?.email} to complete setup.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                      Verification Code
                    </Label>
                    <input
                      type="text"
                      maxLength="6"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={verifyTestCode}
                      disabled={testCode.length !== 6 || updating}
                      className="flex-1 py-2 text-[13px] font-medium text-[#111113] bg-[#d4a017] hover:bg-[#b8891a] rounded-lg transition-colors disabled:opacity-40"
                    >
                      {updating ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                        </span>
                      ) : 'Verify & Enable 2FA'}
                    </button>
                    <button
                      onClick={cancelMfaTest}
                      className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[#9ca3af]" />
            <div>
              <h3 className="text-[14px] font-semibold text-[#111113]">Password</h3>
              <p className="text-[12px] text-[#9ca3af] mt-0.5">Manage your account password</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-[#9ca3af]">Last updated: Never (or we don't track this yet)</p>
          <button className="px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors">
            Change Password
          </button>
          <div className="text-[12px] text-[#9ca3af] space-y-1">
            <p className="font-medium text-[#6b7280]">Password requirements:</p>
            <p>• At least 8 characters long</p>
            <p>• Mix of letters, numbers, and symbols recommended</p>
          </div>
        </div>
      </div>
    </div>
  );
}
