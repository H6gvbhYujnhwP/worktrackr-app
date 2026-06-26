// web/client/src/app/src/components/PricingConfig.jsx
import React, { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, Info } from 'lucide-react';
import PageHero, { HeroButtonPrimary } from './PageHero.jsx';

const inputCls = 'w-full px-3 py-2 border border-[#2e2e4a] rounded-lg bg-[#1a1a2e] text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 focus:border-[#f59e0b]';
const labelCls = 'block text-[13px] font-medium text-[#94a3b8] mb-1.5';

export default function PricingConfig() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { fetchPricing(); }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/pricing', { credentials: 'include' });
      if (response.ok) { const data = await response.json(); setPricing(data); }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch('/api/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pricing)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Pricing configuration saved successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save pricing configuration' });
      }
    } catch (error) {
      console.error('Error saving pricing:', error);
      setMessage({ type: 'error', text: 'Failed to save pricing configuration' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setPricing(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const calculateHourlyRate = (dayRate) => (dayRate / 8).toFixed(2);

  const updateDayRate = (field, value) => {
    const dayRate = parseFloat(value) || 0;
    const hourlyField = field.replace('_day_rate', '_hourly_rate');
    setPricing(prev => ({
      ...prev,
      [field]: dayRate,
      [hourlyField]: parseFloat(calculateHourlyRate(dayRate))
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-[13px] text-[#94a3b8] bg-[#1a1a2e] min-h-full">
        <RefreshCw className="animate-spin w-5 h-5 mr-2" />
        Loading pricing configuration…
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 md:p-7 min-h-full bg-[#1a1a2e]">
      <PageHero
        title="Pricing Configuration"
        icon={DollarSign}
        meta={[{ label: 'Configure day rates and pricing for AI quote generation' }]}
        actions={
          <HeroButtonPrimary icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </HeroButtonPrimary>
        }
        compact
      />

      {message && (
        <div className={`text-[13px] px-4 py-2 rounded-lg border ${message.type === 'success' ? 'bg-[rgba(16,185,129,0.10)] border-[rgba(16,185,129,0.3)] text-[#6ee7b7]' : 'bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.3)] text-[#fca5a5]'}`}>
          {message.text}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-[rgba(59,130,246,0.10)] border border-[rgba(59,130,246,0.3)] rounded-xl p-4 flex gap-3">
        <Info className="text-[#93c5fd] flex-shrink-0 w-5 h-5 mt-0.5" />
        <div className="text-[13px] text-[#93c5fd]">
          <p className="font-semibold mb-0.5">How this works:</p>
          <p className="text-[#cbd5e1]">
            These rates will be used by the AI quote generator to automatically calculate pricing for labour items.
            Hourly rates are automatically calculated as day rate ÷ 8.
          </p>
        </div>
      </div>

      {/* Day Rates */}
      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-5">
        <h3 className="text-[15px] font-semibold text-white mb-4">Day Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { field: 'standard', label: 'Standard Day Rate (£)' },
            { field: 'senior',   label: 'Senior Day Rate (£)' },
            { field: 'junior',   label: 'Junior Day Rate (£)' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className={labelCls}>{label}</label>
              <input
                type="number"
                step="0.01"
                value={pricing?.[`${field}_day_rate`] || 0}
                onChange={(e) => updateDayRate(`${field}_day_rate`, e.target.value)}
                className={inputCls}
              />
              <p className="text-[12px] text-[#6b7280] mt-1">
                Hourly: £{pricing?.[`${field}_hourly_rate`]?.toFixed(2) || '0.00'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Markup and Margin */}
      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-5">
        <h3 className="text-[15px] font-semibold text-white mb-4">Markup &amp; Margin</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Default Markup (%)</label>
            <input
              type="number"
              step="0.01"
              value={pricing?.default_markup_percent || 0}
              onChange={(e) => updateField('default_markup_percent', e.target.value)}
              className={inputCls}
            />
            <p className="text-[12px] text-[#6b7280] mt-1">Applied to parts and equipment</p>
          </div>
          <div>
            <label className={labelCls}>Default Margin (%)</label>
            <input
              type="number"
              step="0.01"
              value={pricing?.default_margin_percent || 0}
              onChange={(e) => updateField('default_margin_percent', e.target.value)}
              className={inputCls}
            />
            <p className="text-[12px] text-[#6b7280] mt-1">Target profit margin</p>
          </div>
        </div>
      </div>

      {/* Example Calculation */}
      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-5">
        <h3 className="text-[15px] font-semibold text-white mb-3">Example Calculation</h3>
        <div className="space-y-2 text-[13px] text-[#94a3b8]">
          <p>
            <span className="font-medium text-white">Labour (8 hours):</span>{' '}
            8 × £{pricing?.standard_hourly_rate?.toFixed(2) || '0.00'} = £{((pricing?.standard_hourly_rate || 0) * 8).toFixed(2)}
          </p>
          <p>
            <span className="font-medium text-white">Parts (£1,000):</span>{' '}
            £1,000 × {((pricing?.default_markup_percent || 0) / 100 + 1).toFixed(2)} = £{(1000 * ((pricing?.default_markup_percent || 0) / 100 + 1)).toFixed(2)}
          </p>
          <p className="pt-2 border-t border-[#2e2e4a] font-semibold text-[#fcd34d]">
            Total Quote: £{((pricing?.standard_hourly_rate || 0) * 8 + 1000 * ((pricing?.default_markup_percent || 0) / 100 + 1)).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
