// web/client/src/app/src/components/EmailIntakeSettings.jsx
import React, { useState } from 'react';
import { useAuth } from '../App.jsx';
import { Mail, CheckCircle, Copy, ArrowRight, Info } from 'lucide-react';

export default function EmailIntakeSettings() {
  const { user, organization } = useAuth();
  const [success, setSuccess] = useState('');
  const [activating, setActivating] = useState(false);

  const organizationName = organization?.name || 'your-company';
  const organizationId = organization?.id || '';
  const nameSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const idSlug = organizationId.slice(0, 8).replace(/-/g, '');
  const uniqueSlug = idSlug ? `${nameSlug}-${idSlug}` : nameSlug;
  const forwardingEmail = `${uniqueSlug}@intake.worktrackr.cloud`;

  const handleActivate = async () => {
    try {
      setActivating(true);
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

  const sectionClass = "bg-white rounded-xl border border-[#e5e7eb] overflow-hidden";
  const sectionHeaderClass = "px-6 py-4 border-b border-[#e5e7eb]";

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6 text-[#9ca3af]" />
        <div>
          <h2 className="text-[22px] font-bold text-[#111113]">Email Intake</h2>
          <p className="text-[13px] text-[#9ca3af]">Automatically create tickets and quotes from forwarded emails</p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-3 bg-[#dcfce7] border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-[13px] text-green-800">{success}</p>
        </div>
      )}

      {/* How it works */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#9ca3af]" />
            <h3 className="text-[14px] font-semibold text-[#111113]">How It Works</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-5">
            {[
              {
                step: '1',
                title: 'Forward emails to WorkTrackr',
                desc: 'Set up your email system to forward or BCC customer emails to your WorkTrackr forwarding address'
              },
              {
                step: '2',
                title: 'AI analyses the email',
                desc: "Our AI reads the email content to determine if it's a support request or quote inquiry"
              },
              {
                step: '3',
                title: 'Automatically creates tickets or quotes',
                desc: 'WorkTrackr automatically creates a ticket or quote based on the email content'
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#fef9ee] border border-[#d4a017]/30 text-[#d4a017] flex items-center justify-center text-[13px] font-semibold">
                  {step}
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-[#374151]">{title}</h4>
                  <p className="text-[12px] text-[#9ca3af] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forwarding address */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h3 className="text-[14px] font-semibold text-[#111113]">Your Forwarding Email Address</h3>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Forward customer emails to this address to automatically create tickets and quotes</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              value={forwardingEmail}
              readOnly
              className="flex-1 px-3 py-2 text-[13px] font-mono border border-[#e5e7eb] rounded-lg bg-[#fafafa] text-[#374151]"
            />
            <button
              onClick={() => copyToClipboard(forwardingEmail)}
              className="px-3 py-2 border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] text-[#6b7280] transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-lg p-4 space-y-3">
            <h4 className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Setup Instructions</h4>
            <div className="text-[12px] text-[#6b7280] space-y-3">
              <div>
                <p className="font-semibold text-[#374151] mb-1">For Microsoft 365:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>Go to Exchange Admin Center → Mail flow → Rules</li>
                  <li>Edit your existing support email rule</li>
                  <li>Add <span className="font-mono bg-white border border-[#e5e7eb] px-1 rounded text-[11px]">{forwardingEmail}</span> as an additional BCC recipient</li>
                  <li>Save the rule</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-[#374151] mb-1">For Gmail:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>Go to Settings → Forwarding and POP/IMAP</li>
                  <li>Add <span className="font-mono bg-white border border-[#e5e7eb] px-1 rounded text-[11px]">{forwardingEmail}</span> as a forwarding address</li>
                  <li>Create a filter to forward specific emails</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-[#374151] mb-1">For other email systems:</p>
                <p className="ml-1">Set up a forwarding rule or BCC to send copies of customer emails to <span className="font-mono bg-white border border-[#e5e7eb] px-1 rounded text-[11px]">{forwardingEmail}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test setup */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h3 className="text-[14px] font-semibold text-[#111113]">Test Your Setup</h3>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Send a test email to verify everything is working</p>
        </div>
        <div className="p-6">
          <p className="text-[13px] text-[#6b7280] mb-4">
            Once you've configured your email forwarding, send a test email to your support address.
            It should automatically create a ticket in WorkTrackr within a few seconds.
          </p>
          <button
            onClick={() => window.location.href = '/app/dashboard?view=tickets'}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#374151] border border-[#e5e7eb] rounded-lg hover:bg-[#fafafa] transition-colors"
          >
            View Tickets
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
