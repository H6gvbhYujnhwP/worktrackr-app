// web/client/src/app/src/components/SalesTabs.jsx
// Phase 7 — the tab bar for the consolidated Sales workspace. The five sales
// screens (Companies, Leads, Quotes, Orders, Contracts) are reached as tabs
// under a single "Sales" sidebar item. Each tab just switches the view; the
// screens themselves are unchanged. Hidden while a company/lead profile is open
// (the profile has its own Back button).
import React from 'react';

const TABS = [
  { view: 'companies', label: 'Companies' },
  { view: 'quotes',    label: 'Quotes' },
  { view: 'orders',    label: 'Orders' },
  { view: 'sales-calendar', label: 'Calendar' },
];

export default function SalesTabs({ current, onChange }) {
  return (
    <div className="px-4 md:px-6 max-w-5xl mx-auto pt-4">
      <div className="text-lg font-medium text-gray-900 mb-2">Sales</div>
      <div className="flex gap-5 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => {
          const active = current === t.view;
          return (
            <button
              key={t.view}
              onClick={() => onChange && onChange(t.view)}
              className={`text-[13px] whitespace-nowrap pb-2.5 -mb-px border-b-2 ${active ? 'border-[#1D9E75] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
