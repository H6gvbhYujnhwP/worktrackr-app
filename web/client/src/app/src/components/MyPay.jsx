// web/client/src/app/src/components/MyPay.jsx
// IA consolidation — "My Pay" in the Workspace group. One personal pay page that
// holds both the commission view (salespeople) and the wage view (engineers).
// A person is usually only one of the two, so the visible tabs follow their role:
//   salesman -> Commission only, engineer -> Wage only (engineers must NOT see
//   commission/profit, per the role rules), everyone else -> both tabs.
// Reuses the existing BonusScreen and EngineerWage screens unchanged.
import React, { useState } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import BonusScreen from './BonusScreen.jsx';
import EngineerWage from './EngineerWage.jsx';

const ALL_TABS = {
  commission: { key: 'commission', label: 'Commission', icon: Wallet },
  wage:       { key: 'wage',       label: 'Wage',       icon: TrendingUp },
};

// Which tabs a role may see. Salesman: commission only. Engineer: wage only
// (no commission/profit). Anyone else (admin/manager/staff): both.
function tabsForRole(role) {
  if (role === 'salesman') return ['commission'];
  if (role === 'engineer') return ['wage'];
  return ['commission', 'wage'];
}

export default function MyPay() {
  const { membership } = useAuth();
  const role = membership?.role;
  const visible = tabsForRole(role).map((k) => ALL_TABS[k]);
  const [tab, setTab] = useState(visible[0].key);

  // Guard: if the role resolves after mount and the current tab is no longer
  // allowed, snap to the first allowed tab.
  const allowedKeys = visible.map((t) => t.key);
  const activeKey = allowedKeys.includes(tab) ? tab : visible[0].key;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="text-lg font-medium text-gray-900 mb-1">My Pay</div>
      <div className="text-[13px] text-gray-500 mb-3">
        {visible.length > 1
          ? 'Your commission and wage in one place. Switch to whichever applies to you.'
          : 'Your personal pay summary.'}
      </div>

      {visible.length > 1 && (
        <div className="flex gap-2 mb-2">
          {visible.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ${activeKey === key ? 'outline outline-2 outline-[#d4a017] bg-[rgba(212,160,23,0.12)] text-[#8a6a0f]' : 'bg-gray-100 text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      )}

      {activeKey === 'commission' ? <BonusScreen /> : <EngineerWage />}
    </div>
  );
}
