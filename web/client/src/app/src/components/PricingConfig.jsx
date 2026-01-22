import React, { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, Info } from 'lucide-react';

export default function PricingConfig() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/pricing', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setPricing(data);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
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

  const calculateHourlyRate = (dayRate) => {
    return (dayRate / 8).toFixed(2);
  };

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
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-blue-500" size={24} />
        <span className="ml-2 text-gray-600">Loading pricing configuration...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <DollarSign className="text-blue-600" size={28} />
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Pricing Configuration</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure day rates and pricing for AI quote generation
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Info className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-sm text-blue-900">
              <p className="font-medium">How this works:</p>
              <p className="mt-1">
                These rates will be used by the AI quote generator to automatically calculate pricing for labour items.
                Hourly rates are automatically calculated as day rate ÷ 8.
              </p>
            </div>
          </div>

          {/* Day Rates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Day Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standard Day Rate (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing?.standard_day_rate || 0}
                  onChange={(e) => updateDayRate('standard_day_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hourly: £{pricing?.standard_hourly_rate?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senior Day Rate (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing?.senior_day_rate || 0}
                  onChange={(e) => updateDayRate('senior_day_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hourly: £{pricing?.senior_hourly_rate?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Junior Day Rate (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing?.junior_day_rate || 0}
                  onChange={(e) => updateDayRate('junior_day_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hourly: £{pricing?.junior_hourly_rate?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>

          {/* Markup and Margin */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Markup & Margin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Markup (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing?.default_markup_percent || 0}
                  onChange={(e) => updateField('default_markup_percent', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Applied to parts and equipment
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Margin (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing?.default_margin_percent || 0}
                  onChange={(e) => updateField('default_margin_percent', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Target profit margin
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {message && (
              <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.text}
              </div>
            )}
            <div className="ml-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Example Calculation */}
      <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Example Calculation</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium">Labour (8 hours):</span> 8 × £{pricing?.standard_hourly_rate?.toFixed(2) || '0.00'} = £{((pricing?.standard_hourly_rate || 0) * 8).toFixed(2)}
          </p>
          <p>
            <span className="font-medium">Parts (£1,000):</span> £1,000 × {((pricing?.default_markup_percent || 0) / 100 + 1).toFixed(2)} = £{(1000 * ((pricing?.default_markup_percent || 0) / 100 + 1)).toFixed(2)}
          </p>
          <p className="pt-2 border-t border-gray-300 font-medium">
            Total Quote: £{((pricing?.standard_hourly_rate || 0) * 8 + 1000 * ((pricing?.default_markup_percent || 0) / 100 + 1)).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
