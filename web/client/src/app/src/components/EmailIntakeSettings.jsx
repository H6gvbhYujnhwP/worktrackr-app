// web/client/src/app/src/components/EmailIntakeSettings.jsx
import React, { useState } from 'react';
import { useAuth } from '../App.jsx';
import { Mail, CheckCircle, Copy, ArrowRight, Info } from 'lucide-react';
import PageHero from './PageHero.jsx';

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

  const sectionClass = "bg-[#242438] rounded-xl border border-[#2e2e4a] overflow-hidden";
  const sectionHeaderClass = "px-6 py-4 border-b border-[#2e2e4a]";

  return (
    <div className="space-y-5 p-5 md:p-7 min-h-full bg-[#1a1a2e]">

      {/* Page header */}
      <PageHero
        title="Email Intake"
        icon={Mail}
        meta={[{ label: 'Automatically create tickets and quotes from forwarded emails' }]}
        compact
      />

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-3 bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.4)] rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-[#6ee7b7] flex-shrink-0" />
          <p className="text-[13px] text-[#6ee7b7]">{success}</p>
        </div>
      )}

      {/* How it works */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#94a3b8]" />
            <h3 className="text-[14px] font-semibold text-white">How It Works</h3>
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] text-[#fcd34d] flex items-center justify-center text-[13px] font-semibold">
                  {step}
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-white">{title}</h4>
                  <p className="text-[12px] text-[#94a3b8] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forwarding address */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h3 className="text-[14px] font-semibold text-white">Your Forwarding Email Address</h3>
          <p className="text-[12px] text-[#94a3b8] mt-0.5">Forward customer emails to this address to automatically create tickets and quotes</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              value={forwardingEmail}
              readOnly
              className="flex-1 px-3 py-2 text-[13px] font-mono border border-[#2e2e4a] rounded-lg bg-[#1a1a2e] text-[#cbd5e1]"
            />
            <button
              onClick={() => copyToClipboard(forwardingEmail)}
              className="px-3 py-2 border border-[#2e2e4a] rounded-lg hover:bg-[#2a2a48] text-[#94a3b8] transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#1f1f33] border border-[#2e2e4a] rounded-lg p-4 space-y-3">
            <h4 className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">Setup Instructions</h4>
            <div className="text-[12px] text-[#94a3b8] space-y-3">
              <div>
                <p className="font-semibold text-white mb-1">For Microsoft 365:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>Go to Exchange Admin Center → Mail flow → Rules</li>
                  <li>Edit your existing support email rule</li>
                  <li>Add <span className="font-mono bg-[#1a1a2e] border border-[#2e2e4a] px-1 rounded text-[11px] text-[#fcd34d]">{forwardingEmail}</span> as an additional BCC recipient</li>
                  <li>Save the rule</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">For Gmail:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>Go to Settings → Forwarding and POP/IMAP</li>
                  <li>Add <span className="font-mono bg-[#1a1a2e] border border-[#2e2e4a] px-1 rounded text-[11px] text-[#fcd34d]">{forwardingEmail}</span> as a forwarding address</li>
                  <li>Create a filter to forward specific emails</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">For other email systems:</p>
                <p className="ml-1">Set up a forwarding rule or BCC to send copies of customer emails to <span className="font-mono bg-[#1a1a2e] border border-[#2e2e4a] px-1 rounded text-[11px] text-[#fcd34d]">{forwardingEmail}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test setup */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h3 className="text-[14px] font-semibold text-white">Test Your Setup</h3>
          <p className="text-[12px] text-[#94a3b8] mt-0.5">Send a test email to verify everything is working</p>
        </div>
        <div className="p-6">
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Once you've configured your email forwarding, send a test email to your support address.
            It should automatically create a ticket in WorkTrackr within a few seconds.
          </p>
          <button
            onClick={() => window.location.href = '/app/dashboard?view=tickets'}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#cbd5e1] border border-[#2e2e4a] rounded-lg hover:bg-[#2a2a48] transition-colors"
          >
            View Tickets
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
