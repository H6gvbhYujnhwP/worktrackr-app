// web/client/src/app/src/components/SalesTabs.jsx
// Phase 7 — the tab bar for the consolidated Sales workspace. The screens are
// reached as tabs under a single "Sales" sidebar item: Companies · Quotes ·
// Orders · Calendar. Each tab just switches the view. Hidden while a company
// profile is open (the profile has its own Back button).
//
// v3.6 — DARK opt-in. When `dark` is true (Companies/Quotes/Orders, now
// redesigned) the bar uses the dark chrome + amber active underline so it sits
// flush with the dark page below it. The Calendar tab is not yet redesigned, so
// the Dashboard passes dark=false there and the bar stays light over the light
// calendar — no half-dark state. Default (no prop) = the original light look.
import React from 'react';

const TABS = [
  { view: 'companies', label: 'Companies' },
  { view: 'quotes',    label: 'Quotes' },
  { view: 'orders',    label: 'Orders' },
  { view: 'sales-calendar', label: 'Calendar' },
];

export default function SalesTabs({ current, onChange, dark = false }) {
  return (
    <div className={`px-4 md:px-7 pt-4 ${dark ? 'max-w-none bg-[#1a1a2e]' : 'max-w-5xl mx-auto'}`}>
      <div className={`text-lg font-medium mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Sales</div>
      <div className={`flex gap-5 border-b overflow-x-auto ${dark ? 'border-[#2e2e4a]' : 'border-gray-200'}`}>
        {TABS.map((t) => {
          const active = current === t.view;
          const cls = dark
            ? (active ? 'border-[#f59e0b] text-white' : 'border-transparent text-[#94a3b8] hover:text-white')
            : (active ? 'border-[#1D9E75] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800');
          return (
            <button
              key={t.view}
              onClick={() => onChange && onChange(t.view)}
              className={`text-[13px] whitespace-nowrap pb-2.5 -mb-px border-b-2 ${cls}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
