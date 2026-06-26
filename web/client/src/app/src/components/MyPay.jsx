// web/client/src/app/src/components/MyPay.jsx
// Workspace › My Pay — one personal pay page holding both the commission view
// (salespeople) and the wage view (engineers). Visible tabs follow the role:
//   salesman -> Commission only · engineer -> Wage only (engineers must NOT see
//   commission/profit) · everyone else -> both. Reuses BonusScreen + EngineerWage.
//
// v3.7 — DARK reskin. Role gating preserved exactly. NOTE: Manus's My Pay mockup
// also shows an earnings summary, YTD cards, payslip PDFs and a next-payment
// block — those need backend that doesn't exist yet (payslip storage, YTD
// aggregates, pay-run dates), so they're intentionally NOT faked here. The real,
// computed commission + wage content is what's shown, now in the dark theme.
import React, { useState } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import BonusScreen from './BonusScreen.jsx';
import EngineerWage from './EngineerWage.jsx';

const ALL_TABS = {
  commission: { key: 'commission', label: 'Commission', icon: Wallet },
  wage:       { key: 'wage',       label: 'Wage',       icon: TrendingUp },
};

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

  const allowedKeys = visible.map((t) => t.key);
  const activeKey = allowedKeys.includes(tab) ? tab : visible[0].key;

  return (
    <div className="min-h-full bg-[#1a1a2e]">
      <div className="max-w-3xl mx-auto px-5 md:px-7 pt-5 md:pt-7">
        <div className="text-2xl font-semibold text-white mb-1">My Pay</div>
        <div className="text-[13px] text-[#94a3b8] mb-3">
          {visible.length > 1
            ? 'Your commission and wage in one place. Switch to whichever applies to you.'
            : 'Your personal pay summary.'}
        </div>

        {visible.length > 1 && (
          <div className="flex gap-2 mb-1">
            {visible.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ${
                  activeKey === key
                    ? 'bg-[rgba(245,158,11,0.15)] text-[#fcd34d] outline outline-2 outline-[#f59e0b]'
                    : 'bg-[#242438] text-[#94a3b8] hover:text-white'
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeKey === 'commission' ? <BonusScreen /> : <EngineerWage />}
    </div>
  );
}
