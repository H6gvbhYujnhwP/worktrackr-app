// web/client/src/app/src/components/Sidebar.jsx
// REDESIGN: Flat navigation, dark sidebar, gold accent, no nested accordions.
// Props unchanged: { currentPage, onNavigate, user, isAdmin, isCollapsed }
// isCollapsed is now controlled by AppLayout (passed as prop, not internal state).

import React from 'react';
import {
  Home, Ticket, Calendar, UserCircle, Package,
  FileText, UserCog, CreditCard, Shield, Mail,
  DollarSign, LogOut, StickyNote, BookOpen, Briefcase, Receipt, Building2, ListChecks, ClipboardList, ClipboardCheck, Wallet, SlidersHorizontal, TrendingUp, Gauge, Repeat, Target,
} from 'lucide-react';

// ─── Navigation structure — flat, sectioned, no sub-items ───────────────────
const WORKSPACE_ITEMS = [
  { id: 'my-tasks',  label: 'My Tasks', icon: ListChecks, view: 'my-tasks' },
  { id: 'my-pay',    label: 'My Pay',   icon: Wallet,     view: 'my-pay'   },
  { id: 'my-notes',  label: 'My Notes', icon: StickyNote, view: 'my-notes' },
];

const DELIVERY_ITEMS = [
  { id: 'all-tickets',     label: 'Tickets',  icon: Ticket,    view: 'tickets'  },
  { id: 'jobs',            label: 'Projects', icon: Briefcase, view: 'jobs'     },
  { id: 'ticket-calendar', label: 'Calendar', icon: Calendar,  view: 'calendar' },
];

const SALES_ITEMS = [
  { id: 'sales', label: 'Sales', icon: TrendingUp, view: 'companies' },
];

const FINANCE_ITEMS = [
  { id: 'invoices', label: 'Invoices', icon: Receipt, view: 'invoices' },
];

// Settings shows to managers and admins: manager-level tools first, then admin-only.
const SETTINGS_MANAGER_ITEMS = [
  { id: 'commission-rules', label: 'Commission rules', icon: SlidersHorizontal, view: 'commission-rules' },
  { id: 'engineer-wages',   label: 'Engineer wages',   icon: Gauge,             view: 'engineer-wages'   },
  { id: 'crm-settings',     label: 'CRM settings',     icon: Building2,          view: 'crm-settings'     },
];
const SETTINGS_ADMIN_ITEMS = [
  { id: 'product-catalog', label: 'Catalogue',    icon: Package,    view: 'product-catalog' },
  { id: 'pricing-config',  label: 'Pricing',      icon: DollarSign, view: 'pricing-config'  },
  { id: 'manage-users',    label: 'Users',        icon: UserCog,    view: 'users'           },
  { id: 'billing',         label: 'Billing',      icon: CreditCard, view: 'billing'         },
  { id: 'security',        label: 'Security',     icon: Shield,     view: 'security'        },
  { id: 'email-intake',    label: 'Email Intake', icon: Mail,       view: 'email-intake'    },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────
const NavItem = ({ item, isActive, isCollapsed, onClick, badge }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onClick(item.view)}
      title={isCollapsed ? item.label : ''}
      className={`
        w-full flex items-center gap-2.5 rounded-lg text-[13px] mb-0.5
        transition-colors duration-150 outline-none
        ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
        ${isActive
          ? 'bg-[rgba(212,160,23,0.12)] text-[#d4a017]'
          : 'text-[#e5e7eb] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'}
      `}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left">{item.label}</span>
          {badge > 0 && (
            <span className="text-[10px] font-semibold bg-[#d4a017] text-[#111] px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
};

// ─── SectionLabel ────────────────────────────────────────────────────────────
const SectionLabel = ({ label, isCollapsed }) => {
  if (isCollapsed) {
    return <div className="w-5 h-px bg-[#222228] mx-auto my-2" />;
  }
  return (
    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-[1px] px-3 pt-4 pb-1.5">
      {label}
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const Sidebar = ({ currentPage, onNavigate, user, isAdmin, isManager, isCollapsed = false }) => {

  const handleNav = (view) => {
    if (onNavigate) onNavigate(view);
  };

  // Open ticket count badge — read from DOM-accessible data if needed, 
  // kept simple here (badge is optional enhancement, not breaking).
  const openBadge = 0; // wired up in Push 2 when Dashboard passes count down

  return (
    <div className="h-full bg-[#111113] border-r border-[#222228] flex flex-col select-none">

      {/* ── Logo ── */}
      <div className={`flex items-center gap-2.5 border-b border-[#222228] flex-shrink-0
        ${isCollapsed ? 'justify-center px-0 py-[18px]' : 'px-5 py-[18px]'}`}>
        <div className="w-[30px] h-[30px] bg-[#d4a017] rounded-[7px] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <rect x="3" y="5"  width="14" height="1.8" rx="0.9" fill="#111"/>
            <rect x="3" y="9"  width="14" height="1.8" rx="0.9" fill="#111"/>
            <rect x="3" y="13" width="8"  height="1.8" rx="0.9" fill="#111"/>
          </svg>
        </div>
        {!isCollapsed && (
          <span className="text-[15px] font-bold text-white leading-none">
            Work<span className="text-[#d4a017]">Trackr</span>
          </span>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto py-3 ${isCollapsed ? 'px-2' : 'px-3'}`}>

        <SectionLabel label="Workspace" isCollapsed={isCollapsed} />
        {WORKSPACE_ITEMS.flatMap(item => {
          const els = [
            <NavItem key={item.id} item={item} isActive={currentPage === item.id} isCollapsed={isCollapsed} onClick={handleNav} />
          ];
          if (item.id === 'my-tasks' && isManager) {
            els.push(
              <NavItem
                key="order-queues"
                item={{ id: 'order-queues', label: 'Approvals', icon: ClipboardCheck, view: 'order-queues' }}
                isActive={currentPage === 'order-queues'} isCollapsed={isCollapsed} onClick={handleNav}
              />
            );
          }
          return els;
        })}

        <SectionLabel label="Delivery" isCollapsed={isCollapsed} />
        {DELIVERY_ITEMS.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
            isCollapsed={isCollapsed}
            onClick={handleNav}
            badge={item.id === 'all-tickets' ? openBadge : 0}
          />
        ))}

        <SectionLabel label="Sales" isCollapsed={isCollapsed} />
        {SALES_ITEMS.map(item => (
          <NavItem key={item.id} item={item} isActive={currentPage === item.id} isCollapsed={isCollapsed} onClick={handleNav} />
        ))}

        <SectionLabel label="Finance" isCollapsed={isCollapsed} />
        {FINANCE_ITEMS.map(item => (
          <NavItem key={item.id} item={item} isActive={currentPage === item.id} isCollapsed={isCollapsed} onClick={handleNav} />
        ))}

        {(isManager || isAdmin) && (
          <>
            <SectionLabel label="Settings" isCollapsed={isCollapsed} />
            {isManager && SETTINGS_MANAGER_ITEMS.map(item => (
              <NavItem key={item.id} item={item} isActive={currentPage === item.id} isCollapsed={isCollapsed} onClick={handleNav} />
            ))}
            {isAdmin && SETTINGS_ADMIN_ITEMS.map(item => (
              <NavItem key={item.id} item={item} isActive={currentPage === item.id} isCollapsed={isCollapsed} onClick={handleNav} />
            ))}
          </>
        )}
      </nav>

      {/* ── User footer ── */}
      <div className={`border-t border-[#222228] flex-shrink-0
        ${isCollapsed ? 'p-3 flex justify-center' : 'p-4 flex items-center gap-2.5'}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                        flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#eee] truncate">{user?.name || 'User'}</div>
              <div className="text-[11px] text-[#666] truncate">{user?.email || ''}</div>
            </div>
            <button
              onClick={() => handleNav('/logout')}
              title="Log out"
              className="w-7 h-7 rounded-md flex items-center justify-center
                         text-[#666] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#999]
                         transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
