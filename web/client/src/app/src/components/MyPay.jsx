// web/client/src/app/src/components/MyPay.jsx
// IA consolidation — "My Pay" in the Workspace group. One personal pay page that
// holds both the commission view (salespeople) and the wage view (engineers).
// A person is usually only one of the two; the toggle lets them switch without
// two separate menu items. Reuses the existing BonusScreen and EngineerWage
// screens unchanged.
import React, { useState } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import BonusScreen from './BonusScreen.jsx';
import EngineerWage from './EngineerWage.jsx';

const TABS = [
  { key: 'commission', label: 'Commission', icon: Wallet },
  { key: 'wage',       label: 'Wage',       icon: TrendingUp },
];

export default function MyPay() {
  const [tab, setTab] = useState('commission');
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="text-lg font-medium text-gray-900 mb-1">My Pay</div>
      <div className="text-[13px] text-gray-500 mb-3">Your commission and wage in one place. Switch to whichever applies to you.</div>

      <div className="flex gap-2 mb-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ${tab === key ? 'outline outline-2 outline-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f]' : 'bg-gray-100 text-gray-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'commission' ? <BonusScreen /> : <EngineerWage />}
    </div>
  );
}
